'use client'
/**
 * A prose key's text, with a markup toolbar and, beside it, the beats the
 * engine reads from it.
 */
import { useRef } from 'react'
import { inlineMarkup, type SceneBeat } from '@ifloom/engine'
import { INLINE_KINDS, MARKUP_KINDS, MARKUP_LABELS, insertInline, insertParagraph, proseBeats, sampleMarkup, type MarkupKind } from '../lib/markup'
import { Button, cx, inputClass } from './ui'

export function ProseField({ value, onChange, rows = 4, label }: { value: string; onChange: (value: string) => void; rows?: number; label: string }) {
  const area = useRef<HTMLTextAreaElement>(null)
  function insert(kind: MarkupKind) {
    const at = area.current?.selectionStart ?? value.length
    const snippet = sampleMarkup(kind)
    // An inline action, a tooltip or an inline piece goes in the line at the cursor; anything else is a paragraph of its own.
    const next = INLINE_KINDS.has(kind) ? insertInline(value, at, snippet) : insertParagraph(value, at, snippet)
    onChange(next.text)
    requestAnimationFrame(() => {
      area.current?.focus()
      area.current?.setSelectionRange(next.cursor, next.cursor)
    })
  }
  return (
    <div className="@container flex flex-col gap-1">
      <div className="flex flex-wrap gap-1" role="toolbar" aria-label={`Markup for ${label}`}>
        {MARKUP_KINDS.map((kind) => (
          <Button key={kind} size="xs" variant="ghost" className="border border-fd-border" onClick={() => insert(kind)} title={`Insert ${sampleMarkup(kind)}`}>
            {MARKUP_LABELS[kind]}
          </Button>
        ))}
      </div>
      <div className="grid gap-2 @md:grid-cols-2">
        <textarea
          ref={area}
          aria-label={label}
          className={cx(inputClass, 'font-mono text-[13px] leading-relaxed')}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <Beats text={value} />
      </div>
    </div>
  )
}

/** The beats a text draws, as the editor shows them: speech, thoughts, and media as labelled boxes. */
export function Beats({ text }: { text: string }) {
  const beats = proseBeats(text)
  if (!beats.length) return <div className="rounded-md border border-dashed border-fd-border p-2 text-xs text-fd-muted-foreground">Nothing written yet.</div>
  return (
    <div className="flex flex-col gap-2 rounded-md border border-fd-border bg-fd-muted/40 p-2 text-sm" aria-label="How it reads">
      {beats.map((beat, i) => (
        <Beat key={i} beat={beat} />
      ))}
    </div>
  )
}

function Media({ kind, src, alt }: { kind: string; src: string; alt?: string }) {
  return (
    <div className="flex flex-col items-center rounded border-2 border-dashed border-fd-border p-2 text-center text-xs text-fd-muted-foreground">
      <span className="font-semibold uppercase tracking-wide">{kind}</span>
      <code className="break-all">{src}</code>
      {alt ? <span>{alt}</span> : null}
    </div>
  )
}

function Beat({ beat }: { beat: SceneBeat }) {
  switch (beat.kind) {
    case 'text':
      return (
        <p>
          <Inline text={beat.text} />
        </p>
      )
    case 'mono':
      return <p className="font-mono text-xs italic text-fd-muted-foreground">{beat.text}</p>
    case 'say':
      return (
        <p className={cx('rounded-md px-2 py-1', beat.who === 'player' ? 'ms-6 bg-fd-primary/10' : 'me-6 bg-fd-secondary')}>
          <span className="me-1 text-xs font-semibold text-fd-muted-foreground">{beat.who === 'player' ? 'You' : 'Character'}</span>
          <Inline text={beat.text} />
          {beat.voice ? <span className="ms-1 text-xs text-fd-muted-foreground">(voice {beat.voice})</span> : null}
        </p>
      )
    case 'image':
      return <Media kind={beat.src.startsWith('pool:') ? 'Pool picture' : beat.size === 'wide' ? 'Wide picture' : 'Picture'} src={beat.src} alt={beat.alt} />
    case 'video':
      return <Media kind="Video" src={beat.src} alt={beat.alt} />
    case 'sound':
      return <p className="text-xs text-fd-muted-foreground">♪ Sound: {beat.track}</p>
    case 'mail':
      return <div className="rounded border border-fd-border p-2 text-xs whitespace-pre-wrap">{beat.body}</div>
    case 'prop':
      return <div className="rounded border border-fd-border p-2 text-xs whitespace-pre-wrap">{beat.text}</div>
    default:
      return null
  }
}

/** A line with its inline actions drawn as links, its tooltips and inline pieces underlined, each saying what it names, and its bold and italics. */
function Inline({ text }: { text: string }) {
  const parts = inlineMarkup(text)
  if (!parts) return <>{text}</>
  return (
    <>
      {parts.map((part, i) =>
        part.kind === 'text' ? (
          <span key={i}>{part.text}</span>
        ) : part.kind === 'bold' ? (
          <strong key={i}>{part.text}</strong>
        ) : part.kind === 'italic' ? (
          <em key={i}>{part.text}</em>
        ) : part.kind === 'act' ? (
          <span key={i} className="font-medium text-fd-primary underline underline-offset-2" title={`Inline action: choice ${part.id}`}>
            {part.text ?? part.id}
            <sup className="ms-0.5 text-[10px] text-fd-muted-foreground">{part.id}</sup>
          </span>
        ) : part.kind === 'ui' ? (
          <span key={i} className="underline decoration-dashed underline-offset-2" title={`Inline piece ${part.name}: ${part.args.join(', ')}`}>
            {part.text}
            <sup className="ms-0.5 text-[10px] text-fd-muted-foreground">{part.name}</sup>
          </span>
        ) : (
          <span key={i} className="underline decoration-dotted underline-offset-2" title={`Tooltip: ${part.key}`}>
            {part.text}
          </span>
        ),
      )}
    </>
  )
}
