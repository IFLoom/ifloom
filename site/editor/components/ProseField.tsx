'use client'
/**
 * A prose key's text, with a markup toolbar and, beside it, the beats the
 * engine reads from it.
 */
import { useRef } from 'react'
import type { SceneBeat } from '@ifloom/engine'
import { MARKUP_KINDS, MARKUP_LABELS, insertParagraph, proseBeats, sampleMarkup } from '../lib/markup'
import { Button, cx, inputClass } from './ui'

export function ProseField({ value, onChange, rows = 4, label }: { value: string; onChange: (value: string) => void; rows?: number; label: string }) {
  const area = useRef<HTMLTextAreaElement>(null)
  function insert(paragraph: string) {
    const at = area.current?.selectionStart ?? value.length
    const next = insertParagraph(value, at, paragraph)
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
          <Button key={kind} size="xs" variant="ghost" className="border border-fd-border" onClick={() => insert(sampleMarkup(kind))} title={`Insert ${sampleMarkup(kind)}`}>
            {MARKUP_LABELS[kind]}
          </Button>
        ))}
      </div>
      <div className="grid gap-2 @md:grid-cols-2">
        <textarea ref={area} aria-label={label} className={cx(inputClass, 'font-mono text-[13px] leading-relaxed')} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
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
      return <p>{beat.text}</p>
    case 'mono':
      return <p className="font-mono text-xs italic text-fd-muted-foreground">{beat.text}</p>
    case 'say':
      return (
        <p className={cx('rounded-md px-2 py-1', beat.who === 'player' ? 'ms-6 bg-fd-primary/10' : 'me-6 bg-fd-secondary')}>
          <span className="me-1 text-xs font-semibold text-fd-muted-foreground">{beat.who === 'player' ? 'You' : 'Character'}</span>
          {beat.text}
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
