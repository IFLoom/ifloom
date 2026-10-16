'use client'
/**
 * The editor's small parts: fields, buttons, sections and pickers, in the
 * docs' colours (Fumadocs' `fd-` tokens), so the editor follows the site's
 * dark ember theme (app/global.css).
 */
import { useEffect, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'

export function cx(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(' ')
}

/** A field's look without a width. */
export const inputBase =
  'min-w-0 rounded-md border border-fd-border bg-fd-background px-2 py-1 text-sm text-fd-foreground placeholder:text-fd-muted-foreground focus:outline-none focus:ring-2 focus:ring-fd-ring/60'

/** A field's look, full width. */
export const inputClass = `${inputBase} w-full`

/** The look with the width the class asks for, or full width when it asks for none. */
const sized = (className?: string) => (className && /(^|\s)(w-|max-w-|flex-1)/.test(className) ? inputBase : inputClass)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'xs' }

export function Button({ variant = 'secondary', size = 'sm', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-1 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-6 px-2 text-xs',
        variant === 'primary' && 'bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/85',
        variant === 'secondary' && 'border border-fd-border bg-fd-secondary text-fd-secondary-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
        variant === 'ghost' && 'text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground',
        variant === 'danger' && 'text-red-600 hover:bg-red-500/10 dark:text-red-400',
        className,
      )}
      {...props}
    />
  )
}

/** A labelled field. */
export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex min-w-0 flex-col gap-1 text-xs font-medium text-fd-muted-foreground', className)}>
      <span>{label}</span>
      {children}
      {hint ? <span className="font-normal">{hint}</span> : null}
    </label>
  )
}

/** A text input that commits as you type. An empty field gives `undefined` when `optional` is set. */
export function TextInput({
  value,
  onChange,
  optional,
  className,
  mono,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: string | undefined; onChange: (value: string | undefined) => void; optional?: boolean; mono?: boolean }) {
  return (
    <input
      className={cx(sized(className), mono && 'font-mono', className)}
      value={value ?? ''}
      onChange={(event) => onChange(optional && event.target.value === '' ? undefined : event.target.value)}
      {...rest}
    />
  )
}

/** A number input. Empty gives `undefined`, and what isn't a number is kept as typed until it is one. */
export function NumberInput({ value, onChange, placeholder, className, ...rest }: { value: number | undefined; onChange: (value: number | undefined) => void; placeholder?: string; className?: string; 'aria-label'?: string }) {
  const [text, setText] = useState(value === undefined ? '' : String(value))
  useEffect(() => {
    if (Number(text) !== value || text === '') setText(value === undefined ? '' : String(value))
    // Only follow the value in when it changes from outside.
  }, [value])
  return (
    <input
      className={cx(inputBase, className ?? 'w-24')}
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onChange={(event) => {
        setText(event.target.value)
        const raw = event.target.value.trim()
        if (raw === '') onChange(undefined)
        else if (!Number.isNaN(Number(raw))) onChange(Number(raw))
      }}
      {...rest}
    />
  )
}

export function Select<T extends string>({ value, options, onChange, className, ...rest }: { value: T; options: readonly (T | { value: T; label: string })[]; onChange: (value: T) => void; className?: string; 'aria-label'?: string }) {
  return (
    <select className={cx(inputBase, 'max-w-full', className)} value={value} onChange={(event) => onChange(event.target.value as T)} {...rest}>
      {options.map((option) => {
        const { value: v, label } = typeof option === 'string' ? { value: option, label: option } : option
        return (
          <option key={v} value={v}>
            {label}
          </option>
        )
      })}
    </select>
  )
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: ReactNode }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-fd-foreground">
      <input type="checkbox" className="size-4 accent-fd-primary" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  )
}

/** A comma-separated list of words, as an array. Empty gives `undefined`. */
export function ListInput({ value, onChange, placeholder, numbers }: { value: readonly (string | number)[] | undefined; onChange: (value: any[] | undefined) => void; placeholder?: string; numbers?: boolean }) {
  const [text, setText] = useState((value ?? []).join(', '))
  useEffect(() => {
    const joined = (value ?? []).join(', ')
    if (split(text, numbers).join(', ') !== joined) setText(joined)
  }, [value])
  return (
    <input
      className={inputClass}
      value={text}
      placeholder={placeholder}
      onChange={(event) => {
        setText(event.target.value)
        const list = split(event.target.value, numbers)
        onChange(list.length ? list : undefined)
      }}
    />
  )
}

function split(text: string, numbers?: boolean): (string | number)[] {
  const parts = text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  return numbers ? parts.map(Number).filter((n) => !Number.isNaN(n)) : parts
}

/** A box with a heading and optional buttons beside it. */
export function Section({ title, actions, children, className, id }: { title: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cx('rounded-lg border border-fd-border bg-fd-card p-3 text-fd-card-foreground', className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

const ADD = '\u0000add'

/**
 * A dropdown of the ids that exist, with "Add new…" to name another. An id that
 * isn't there any more stays shown, marked missing, so nothing is lost. With no
 * ids to offer, it's a plain text field.
 */
export function IdPicker({
  value,
  options,
  onChange,
  onCreate,
  noun = 'id',
  empty,
  className,
  ...rest
}: {
  value: string | null | undefined
  options: readonly string[]
  onChange: (value: string) => void
  /** Called with a new id from "Add new…", to make the thing it names. */
  onCreate?: (id: string) => void
  noun?: string
  /** A choice for no id at all, such as "close the scene". Its value is ''. */
  empty?: string
  className?: string
  'aria-label'?: string
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  if (adding || (!options.length && !empty)) {
    const commit = () => {
      const id = draft.trim()
      if (id) {
        onCreate?.(id)
        onChange(id)
      }
      setAdding(false)
      setDraft('')
    }
    if (!options.length && !adding && !empty) {
      return <TextInput className={className} value={value ?? ''} onChange={(v) => onChange(v ?? '')} placeholder={noun} mono aria-label={rest['aria-label']} />
    }
    return (
      <span className={cx('flex gap-1', className)}>
        <input
          autoFocus
          className={cx(inputClass, 'font-mono')}
          placeholder={`New ${noun}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit()
            if (event.key === 'Escape') setAdding(false)
          }}
          aria-label={`New ${noun}`}
        />
        <Button size="xs" variant="primary" onClick={commit}>
          Add
        </Button>
        <Button size="xs" variant="ghost" onClick={() => setAdding(false)}>
          Cancel
        </Button>
      </span>
    )
  }
  const current = value ?? ''
  const missing = current !== '' && !options.includes(current)
  return (
    <select
      className={cx(inputBase, 'max-w-full font-mono', className)}
      value={current}
      onChange={(event) => {
        if (event.target.value === ADD) setAdding(true)
        else onChange(event.target.value)
      }}
      {...rest}
    >
      {empty !== undefined ? <option value="">{empty}</option> : current === '' ? <option value="">Pick a {noun}…</option> : null}
      {missing ? <option value={current}>{current} (missing)</option> : null}
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
      <option value={ADD}>Add new {noun}…</option>
    </select>
  )
}

/**
 * JSON in a text area: it commits when it parses, and says what's wrong when
 * it doesn't, keeping what was typed.
 */
export function JsonField({ value, onChange, rows = 4, label }: { value: unknown; onChange: (value: any) => void; rows?: number; label?: string }) {
  const id = useId()
  const [text, setText] = useState(() => JSON.stringify(value, null, 2) ?? '')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let same = false
    try {
      same = JSON.stringify(JSON.parse(text)) === JSON.stringify(value)
    } catch {
      same = false
    }
    if (!same && !error) setText(JSON.stringify(value, null, 2) ?? '')
  }, [value])
  return (
    <div className="flex flex-col gap-1">
      <textarea
        id={id}
        aria-label={label ?? 'JSON'}
        className={cx(inputClass, 'font-mono text-xs')}
        rows={rows}
        spellCheck={false}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          if (!event.target.value.trim()) {
            setError(null)
            onChange(undefined)
            return
          }
          try {
            onChange(JSON.parse(event.target.value))
            setError(null)
          } catch (caught) {
            setError((caught as Error).message)
          }
        }}
      />
      {error ? <span className="text-xs text-red-600 dark:text-red-400">Not JSON yet: {error}</span> : null}
    </div>
  )
}

/** Code to copy, with a Copy button. */
export function CodeOut({ code, label = 'TypeScript' }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  return (
    <div className="overflow-hidden rounded-md border border-fd-border bg-fd-muted/50">
      <div className="flex items-center justify-between border-b border-fd-border px-2 py-1 text-xs text-fd-muted-foreground">
        <span>{label}</span>
        <Button
          size="xs"
          variant="ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code)
              setCopied(true)
            } catch {
              setCopied(false)
            }
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="overflow-x-auto p-2 font-mono text-xs leading-relaxed text-fd-foreground">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/** Small up, down and remove buttons for a list entry. */
export function RowTools({ onUp, onDown, onRemove, label }: { onUp?: () => void; onDown?: () => void; onRemove: () => void; label: string }) {
  return (
    <span className="flex shrink-0 items-center">
      <Button size="xs" variant="ghost" onClick={onUp} disabled={!onUp} aria-label={`Move ${label} up`} title="Move up">
        ↑
      </Button>
      <Button size="xs" variant="ghost" onClick={onDown} disabled={!onDown} aria-label={`Move ${label} down`} title="Move down">
        ↓
      </Button>
      <Button size="xs" variant="danger" onClick={onRemove} aria-label={`Remove ${label}`} title="Remove">
        ✕
      </Button>
    </span>
  )
}

/** The list with one entry moved by `by` places. */
export function move<T>(list: readonly T[], index: number, by: number): T[] {
  const next = [...list]
  const [entry] = next.splice(index, 1)
  next.splice(index + by, 0, entry)
  return next
}
