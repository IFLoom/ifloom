/**
 * Inline actions, tooltips, inline pieces, bold and italics in the prose: the
 * `spans` of a text or spoken beat. An inline action is a button in the line
 * that presses its choice; a tooltip is a button in the line that shows a
 * short note. Both show their note in a small bubble on hover, on keyboard
 * focus and on a tap, and close it on Escape or a tap elsewhere. The note is
 * also the button's description (`aria-describedby`), so a screen reader
 * reads it with the button. An inline piece (`[[ui:name|…]]`) is drawn by the
 * game's own `inline` component of that name, else a built-in one (`modal`,
 * `image`), else as its words.
 */
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { artSrc, proseBeats, type InlineSpan } from '@ifloom/engine'
import { useGame, useGameIfAny, type InlineComponent, type InlineComponents, type InlineProps } from './context.tsx'
import { PriceTag } from './choices.tsx'
import { PartDialog } from './dialog.tsx'
import { overridable, usePart } from './overrides.tsx'
import { Beat } from './scene.tsx'
import { MediaViewer } from './viewer.tsx'

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
function Bubble({
  attrs,
  props,
  children,
}: {
  attrs: { 'data-part': string; className: string }
  props: ReturnType<typeof useBubble>['bubbleProps']
  children: ReactNode
}) {
  const node = (
    <span {...attrs} {...props}>
      {children}
    </span>
  )
  return typeof document === 'undefined' ? node : createPortal(node, document.body)
}

const BUBBLE = 'z-50 max-w-xs font-(family-name:--font-body) rounded-md border bg-popover px-3 py-1.5 text-sm leading-snug text-popover-foreground shadow-md'

function TipImpl({ text, tip, className }: { text: string; tip: string; className?: string }) {
  const { setOpen, triggerProps, bubbleProps } = useBubble(true)
  const attrs = usePart(
    'tip',
    'cursor-help rounded-sm underline decoration-dotted decoration-from-font underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    className,
  )
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

function InlineActionImpl({ text, choice, className }: { text: string; choice: Extract<InlineSpan, { type: 'action' }>['choice']; className?: string }) {
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

/**
 * The words of an inline piece as a button that opens something over the
 * page: the part `inline-ui`, with `data-ui` set to the piece's name and
 * `aria-haspopup="dialog"`. When `open` goes back to false, focus returns to
 * it. The built-in `modal` and `image` use it, and so can a game's own.
 */
export function InlineTrigger({
  name,
  open,
  onOpen,
  className,
  children,
}: {
  name: string
  /** Whether what it opens is open, for `aria-expanded`. */
  open: boolean
  onOpen: () => void
  className?: string
  children: ReactNode
}) {
  const button = useRef<HTMLButtonElement>(null)
  const was = useRef(open)
  // Focus comes back to the words when what they opened closes: the dialog has no trigger of its own to return it to.
  useEffect(() => {
    if (was.current && !open) button.current?.focus()
    was.current = open
  }, [open])
  const attrs = usePart(
    'inline-ui',
    'cursor-pointer rounded-sm font-medium underline decoration-dashed decoration-1 underline-offset-4 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[ui=image]:cursor-zoom-in',
    className,
  )
  return (
    <button {...attrs} ref={button} type="button" data-ui={name} aria-haspopup="dialog" aria-expanded={open} onClick={onOpen}>
      {children}
    </button>
  )
}

/**
 * The built-in `modal`, from `[[ui:modal|words|key]]` or
 * `[[ui:modal|words|key|title]]`: the words as an `InlineTrigger` that opens
 * a dialog with the prose line `key`, as `proseBeats` gives it for this save, drawn as a
 * scene's paragraphs are, in an `inline-modal` part. The dialog is titled
 * `title`, else the words. Escape, the close button or a click outside close
 * it, and focus goes back to the words. A key with no prose shows the words.
 * Replace it with a `modal` of your own in `inline`.
 */
export function InlineModal({ text, args }: InlineProps<'modal'>) {
  const game = useGameIfAny()
  const [open, setOpen] = useState(false)
  const body = usePart('inline-modal', 'grid gap-3 leading-relaxed')
  const [key, title] = args
  // The line as it reads in this save, as beats like a scene's body.
  const beats = key && game ? proseBeats(game.snapshot.state, game.runner.game, key) : null
  if (!beats) return <>{text}</>
  return (
    <>
      <InlineTrigger name="modal" open={open} onOpen={() => setOpen(true)}>
        {text}
      </InlineTrigger>
      <PartDialog open={open} onClose={() => setOpen(false)} title={title ?? text}>
        <div {...body}>
          {beats.map((beat, index) => (
            <Beat key={index} beat={beat} />
          ))}
        </div>
      </PartDialog>
    </>
  )
}

/**
 * The built-in `image`, from `[[ui:image|words|path]]` or
 * `[[ui:image|words|path|alt]]`: the words as an `InlineTrigger` that opens
 * the picture at `path` in the `MediaViewer`, the lightbox a story's pictures
 * open in. The path is resolved as `[[img:…]]` resolves it (`art/`, `.jpg` for
 * a bare name), and `alt` describes it, else the words. Replace it with an
 * `image` of your own in `inline`.
 */
export function InlineImage({ text, args }: InlineProps<'image'>) {
  const [open, setOpen] = useState(false)
  const [path, alt] = args
  if (!path) return <>{text}</>
  return (
    <>
      <InlineTrigger name="image" open={open} onOpen={() => setOpen(true)}>
        {text}
      </InlineTrigger>
      {open ? <MediaViewer media={{ type: 'image', src: artSrc(path), alt: alt ?? text, size: 'inline' }} open={open} onOpenChange={setOpen} /> : null}
    </>
  )
}

/**
 * The built-in `mail`, from `[[ui:mail|body|From: Ava|Subject: Hello]]`: a
 * letter or an email as a card, an `inline-mail` part, with each header line
 * as written (a `mail-header` part), then the body (a `mail-body` part).
 * Written as a paragraph of its own, it draws as one. Replace it with a
 * `mail` of your own in `inline`.
 */
export function InlineMail({ text, args }: InlineProps<'mail'>) {
  const card = usePart('inline-mail', 'block rounded-lg border bg-card p-4 text-sm')
  const header = usePart('mail-header', 'block text-muted-foreground')
  const body = usePart('mail-body', 'mt-2 block whitespace-pre-wrap')
  return (
    <span {...card} data-ui="mail">
      {args.map((line, index) => (
        <span key={index} {...header}>
          {line}
        </span>
      ))}
      <span {...body}>{text}</span>
    </span>
  )
}

/**
 * The built-in `prop`, from `[[ui:prop|words|face]]`: a note in the story's
 * world, an `inline-prop` part with `data-face` (`sticky`, `clip`, `diary`, or
 * whatever face the prose gives). Written as a paragraph of its own, it draws
 * as one. Replace it with a `prop` of your own in `inline`.
 */
export function InlineProp({ text, args }: InlineProps<'prop'>) {
  const attrs = usePart('inline-prop', 'block whitespace-pre-wrap rounded-lg border-2 border-dashed p-4 text-center font-medium')
  return (
    <span {...attrs} data-ui="prop" data-face={args[0]}>
      {text}
    </span>
  )
}

/** The built-in `mono`, from `[[ui:mono|words]]`: the words in a typewriter face, an `inline-mono` part. Replace it with a `mono` of your own in `inline`. */
export function InlineMono({ text }: InlineProps<'mono'>) {
  return (
    <span {...usePart('inline-mono', 'font-mono text-sm')} data-ui="mono">
      {text}
    </span>
  )
}

/** The inline pieces the React UI draws by name. A game's own `inline` of the same name go over these. */
export const BUILT_IN_INLINE: Readonly<InlineComponents> = {
  modal: InlineModal,
  image: InlineImage,
  mail: InlineMail,
  prop: InlineProp,
  mono: InlineMono,
}

/** An inline piece: the game's component by its name, else a built-in one, else its words. */
function InlinePiece({ span }: { span: Extract<InlineSpan, { type: 'ui' }> }) {
  const own = useGameIfAny()?.inline
  const Piece = (own?.[span.name] ?? BUILT_IN_INLINE[span.name]) as InlineComponent | undefined
  if (!Piece) return <>{span.text}</>
  return <Piece name={span.name} text={span.text} args={span.args} />
}

/** Words in bold, from `**words**`: a `strong` with the part `bold`. */
function Bold({ text }: { text: string }) {
  return <strong {...usePart('bold', 'font-bold')}>{text}</strong>
}

/** Words in italics, from `*words*`: an `em` with the part `italic`. */
function Italic({ text }: { text: string }) {
  return <em {...usePart('italic', 'italic')}>{text}</em>
}

/** A line's spans: words as they are, bold and italics, inline actions and tooltips as buttons in the line, and inline pieces. */
export function InlineSpans({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, index) =>
        span.type === 'text' ? (
          <Fragment key={index}>{span.text}</Fragment>
        ) : span.type === 'bold' ? (
          <Bold key={index} text={span.text} />
        ) : span.type === 'italic' ? (
          <Italic key={index} text={span.text} />
        ) : span.type === 'tip' ? (
          <Tip key={index} text={span.text} tip={span.tip} />
        ) : span.type === 'ui' ? (
          <InlinePiece key={index} span={span} />
        ) : (
          <InlineAction key={index} text={span.text} choice={span.choice} />
        ),
      )}
    </>
  )
}
