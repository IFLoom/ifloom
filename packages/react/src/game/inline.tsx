/**
 * Inline actions and tooltips in the prose: the `spans` of a text or spoken
 * beat. An inline action is a button in the line that presses its choice; a
 * tooltip is a button in the line that shows a short note. Both show their
 * note in a small bubble on hover, on keyboard focus and on a tap, and close
 * it on Escape or a tap elsewhere. The note is also the button's description
 * (`aria-describedby`), so a screen reader reads it with the button.
 */
import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { InlineSpan } from '@ifloom/engine'
import { useGame } from './context.tsx'
import { PriceTag } from './choices.tsx'
import { overridable, usePart } from './overrides.tsx'

type Place = { left: number; top: number }

/** Keep a bubble this far from the window's edges, in pixels. */
const EDGE = 8

/** Where a bubble goes: under its button, or over it when there's no room below, and kept inside the window. */
function placeBubble(trigger: DOMRect, bubble: { width: number; height: number }): Place {
  const width = typeof window === 'undefined' ? 1024 : window.innerWidth
  const height = typeof window === 'undefined' ? 768 : window.innerHeight
  const left = Math.min(Math.max(trigger.left + trigger.width / 2 - bubble.width / 2, EDGE), Math.max(EDGE, width - bubble.width - EDGE))
  const below = trigger.bottom + 6
  const top = below + bubble.height > height - EDGE && trigger.top - 6 - bubble.height > EDGE ? trigger.top - 6 - bubble.height : below
  return { left, top }
}

/** Whether the element has keyboard focus, rather than focus from a tap or a click. */
function keyboardFocus(element: Element): boolean {
  try {
    return element.matches(':focus-visible')
  } catch {
    return false
  }
}

/**
 * A bubble's open state and the props for its button and itself. `tapOpens`
 * makes a tap or click toggle it (a tooltip, or a greyed-out action); without
 * it, a click is the button's own.
 */
function useBubble(tapOpens: boolean) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<Place | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const bubble = useRef<HTMLSpanElement>(null)
  const close = useCallback(() => setOpen(false), [])

  const measure = useCallback(() => {
    const button = trigger.current
    const note = bubble.current
    if (!button || !note) return
    setPlace(placeBubble(button.getBoundingClientRect(), { width: note.offsetWidth, height: note.offsetHeight }))
  }, [])

  useLayoutEffect(() => {
    if (open) measure()
    else setPlace(null)
  }, [open, measure])

  useEffect(() => {
    if (!open) return
    // A tap or a click anywhere else closes it; the page moving moves it.
    const away = (event: Event) => {
      const target = event.target as Node | null
      if (target && (trigger.current?.contains(target) || bubble.current?.contains(target))) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      document.removeEventListener('pointerdown', away)
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [open, measure])

  const triggerProps = {
    ref: trigger,
    'aria-describedby': id,
    'aria-expanded': tapOpens ? open : undefined,
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType === 'mouse') setOpen(true)
    },
    onPointerLeave: (event: PointerEvent) => {
      if (event.pointerType === 'mouse') setOpen(false)
    },
    onFocus: (event: FocusEvent<HTMLButtonElement>) => {
      if (keyboardFocus(event.currentTarget)) setOpen(true)
    },
    onBlur: close,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        // Before the game's own Escape, which opens the menu.
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
      }
    },
  }
  const bubbleProps = {
    ref: bubble,
    id,
    role: 'tooltip' as const,
    hidden: !open,
    'data-open': open ? '' : undefined,
    style: { position: 'fixed' as const, left: place?.left ?? 0, top: place?.top ?? 0, visibility: place ? undefined : ('hidden' as const) },
  }
  return { open, setOpen, triggerProps, bubbleProps }
}

/** The bubble itself, in the page's body, so nothing it sits in can clip it. */
function Bubble({ attrs, props, children }: { attrs: { 'data-part': string; className: string }; props: ReturnType<typeof useBubble>['bubbleProps']; children: ReactNode }) {
  const node = <span {...attrs} {...props}>{children}</span>
  return typeof document === 'undefined' ? node : createPortal(node, document.body)
}

const BUBBLE = 'z-50 max-w-xs font-(family-name:--font-body) rounded-md border bg-popover px-3 py-1.5 text-sm leading-snug text-popover-foreground shadow-md'

function TipImpl({ text, tip, className }: { text: string; tip: string; className?: string }) {
  const { setOpen, triggerProps, bubbleProps } = useBubble(true)
  const attrs = usePart('tip', 'cursor-help rounded-sm underline decoration-dotted decoration-from-font underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', className)
  const content = usePart('tip-content', BUBBLE)
  return (
    <>
      <button {...attrs} {...triggerProps} type="button" onClick={() => setOpen((was) => !was)}>
        {text}
      </button>
      <Bubble attrs={content} props={bubbleProps}>
        {tip}
      </Bubble>
    </>
  )
}

/**
 * A tooltip in the prose, from `[[tip:key|words]]`: the words as a `tip`
 * button, and the note in a `tip-content` bubble, shown on hover, keyboard
 * focus or a tap, and read as the button's description.
 */
export const Tip = overridable('Tip', TipImpl)

function InlineActionImpl({ text, choice, className }: { text: string; choice: Extract<InlineSpan, { kind: 'action' }>['choice']; className?: string }) {
  const { send } = useGame()
  const disabled = Boolean(choice.disabled)
  // What the bubble says: why it's greyed out, else a warning, else that it can't be undone.
  const note = choice.disabled ?? choice.warning ?? choice.irreversible
  const { setOpen, triggerProps, bubbleProps } = useBubble(disabled)
  const attrs = usePart(
    'inline-action',
    'cursor-pointer rounded-sm font-medium text-primary underline decoration-2 underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-disabled:cursor-not-allowed data-disabled:font-normal data-disabled:text-muted-foreground data-disabled:decoration-dotted data-disabled:decoration-1',
    className,
  )
  const content = usePart('tip-content', BUBBLE)
  const own = note ? triggerProps : { ref: triggerProps.ref }
  return (
    <>
      <button
        {...attrs}
        {...own}
        type="button"
        data-choice={choice.id}
        data-disabled={disabled ? '' : undefined}
        data-warning={choice.warning ? '' : undefined}
        data-irreversible={choice.irreversible ? '' : undefined}
        aria-disabled={disabled || undefined}
        onClick={() => (disabled ? setOpen((was) => !was) : send(choice.command))}
      >
        {text}
        {/* An inline block, so the link's underline doesn't run under it. */}
        {choice.price ? <PriceTag price={choice.price} className="ms-1 inline-block before:content-['('] after:content-[')']" /> : null}
      </button>
      {note ? (
        <Bubble attrs={content} props={bubbleProps}>
          {note}
        </Bubble>
      ) : null}
    </>
  )
}

/**
 * An inline action, from `[[act:id|words]]`: the words as an `inline-action`
 * button that sends the choice's command, with its price after them. Greyed
 * out, it has `data-disabled` and `aria-disabled` and stays focusable, and a
 * tap, hover or focus shows the reason in a `tip-content` bubble. A warning
 * or an irreversible note shows the same way. Inline actions have no number
 * key: the number keys pick the choices in the list.
 */
export const InlineAction = overridable('InlineAction', InlineActionImpl)

/** A line's spans: words as they are, inline actions and tooltips as buttons in the line. */
export function InlineSpans({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, index) =>
        span.kind === 'text' ? (
          <Fragment key={index}>{span.text}</Fragment>
        ) : span.kind === 'tip' ? (
          <Tip key={index} text={span.text} tip={span.tip} />
        ) : (
          <InlineAction key={index} text={span.text} choice={span.choice} />
        ),
      )}
    </>
  )
}
