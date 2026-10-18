'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import s from './InstallCard.module.css'

// npm keeps the flags after `--` for the create script; the others pass them on as they are.
// `dev` is how each one runs the new game's dev script: `bun dev` and `yarn dev` would do too, but `bun build` and `yarn check` are their own commands, so the docs always write `run`.
const managers = [
  { id: 'npm', command: 'npm create ifloom@latest my-game', pass: '--', install: 'npm install', dev: 'npm run dev' },
  { id: 'bun', command: 'bun create ifloom my-game', pass: '', install: 'bun install', dev: 'bun run dev' },
  { id: 'pnpm', command: 'pnpm create ifloom my-game', pass: '', install: 'pnpm install', dev: 'pnpm dev' },
  { id: 'yarn', command: 'yarn create ifloom my-game', pass: '', install: 'yarn install', dev: 'yarn run dev' },
] as const
type Manager = (typeof managers)[number]['id']

// The UIs create-ifloom (`ifloom new`) has a template for. The React UI is the default template, `react`, so it needs no flag.
const uis = [
  { id: 'react', label: 'React UI', template: null },
  { id: 'vue', label: 'Vue', template: 'vue' },
  { id: 'svelte', label: 'Svelte', template: 'svelte' },
  { id: 'vanilla', label: 'Plain JS', template: 'vanilla' },
] as const
type Ui = (typeof uis)[number]['id']

// The examples are drawn with the React UI, so they come only with it.
const starts = [
  { id: 'blank', label: 'Blank' },
  { id: 'novel', label: 'Novel' },
  { id: 'cafe', label: 'Café' },
  { id: 'town', label: 'Town' },
] as const
type Start = (typeof starts)[number]['id']

// The React UI's presets. `default` passes no flag: a blank game gets one at random, an example keeps its own.
const themes = ['default', 'paper', 'terminal', 'studio', 'storybook', 'none'] as const
type Theme = (typeof themes)[number]

/** The command as words, each flag with its value as one, so a narrow screen wraps between them. */
function commandFor(manager: Manager, ui: Ui, start: Start, theme: Theme): string[] {
  const m = managers.find((x) => x.id === manager)!
  const flags: string[] = []
  const template = ui === 'react' ? (start === 'blank' ? null : start) : uis.find((x) => x.id === ui)!.template
  if (template) flags.push(`--template ${template}`)
  if (ui === 'react' && theme !== 'default') flags.push(`--theme ${theme}`)
  if (!flags.length) return [m.command]
  return m.pass ? [m.command, m.pass, ...flags] : [m.command, ...flags]
}

type Option<T> = { id: T; label: string; disabled?: boolean }

function Toggle<T extends string>({
  label,
  options,
  value,
  onChange,
  note,
}: {
  label: string
  options: readonly Option<T>[]
  value: T
  onChange: (id: T) => void
  note?: string
}) {
  return (
    <div className={s.option}>
      <span className={s.optionLabel} id={`install-${label}`}>
        {label}
      </span>
      <div className={s.toggles} role="radiogroup" aria-labelledby={`install-${label}`} title={note}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            disabled={o.disabled}
            className={value === o.id ? s.on : undefined}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const KEY = 'ifloom.packageManager'

export function InstallCard() {
  const [chosen, setChosen] = useState<Manager>('npm')
  const [ui, setUi] = useState<Ui>('react')
  const [start, setStart] = useState<Start>('blank')
  const [theme, setTheme] = useState<Theme>('default')
  const [copied, setCopied] = useState(false)
  const reset = useRef<ReturnType<typeof setTimeout>>(undefined)
  const react = ui === 'react'
  const manager = managers.find((m) => m.id === chosen)!
  const words = commandFor(chosen, ui, react ? start : 'blank', theme)
  const command = words.join(' ')

  function pickUi(id: Ui) {
    setUi(id)
    setCopied(false)
    // Only the React UI has examples and presets to keep.
    if (id !== 'react') {
      setStart('blank')
      setTheme('default')
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (managers.some((m) => m.id === saved)) setChosen(saved as Manager)
    } catch {
      // Storage can be blocked. The default is fine.
    }
    return () => clearTimeout(reset.current)
  }, [])

  function choose(id: Manager) {
    setChosen(id)
    setCopied(false)
    try {
      localStorage.setItem(KEY, id)
    } catch {
      // Not remembered this time.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      clearTimeout(reset.current)
      reset.current = setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={s.shell}>
      <div className={s.core}>
        <div className={s.top}>
          <div className={s.tabs} role="tablist" aria-label="Package manager">
            {managers.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={chosen === m.id}
                className={chosen === m.id ? s.on : undefined}
                onClick={() => choose(m.id)}
              >
                {m.id}
              </button>
            ))}
          </div>
        </div>
        <div className={s.options}>
          <Toggle label="UI" options={uis} value={ui} onChange={pickUi} />
          <Toggle
            label="Start"
            options={starts.map((o) => ({ ...o, disabled: !react && o.id !== 'blank' }))}
            value={react ? start : 'blank'}
            onChange={(id) => {
              setStart(id)
              setCopied(false)
            }}
            note={react ? undefined : 'The examples are drawn with the React UI.'}
          />
          <Toggle
            label="Theme"
            options={themes.map((id) => ({ id, label: id === 'default' ? (start === 'blank' ? 'random' : 'its own') : id, disabled: !react }))}
            value={react ? theme : 'default'}
            onChange={(id) => {
              setTheme(id)
              setCopied(false)
            }}
            note={react ? undefined : 'Theme presets are for the React UI.'}
          />
        </div>
        <div className={s.line}>
          <code>
            <span className={s.prompt} aria-hidden="true">
              $
            </span>
            {words.map((word, at) =>
              at ? (
                <span key={at}>
                  {' '}
                  <span className={s.nowrap}>{word}</span>
                </span>
              ) : (
                word
              ),
            )}
          </code>
          <button type="button" className={s.copy} aria-label={copied ? 'Copied' : 'Copy the command'} onClick={copy}>
            <span>{copied ? 'Copied' : 'Copy'}</span>
            <span className={s.knob} aria-hidden="true">
              {copied ? (
                <svg viewBox="0 0 24 24">
                  <path d="m6 12.5 4 4 8-9" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24">
                  <rect x="8" y="8" width="11" height="11" rx="2.5" />
                  <path d="M5 15V7a2 2 0 0 1 2-2h8" />
                </svg>
              )}
            </span>
          </button>
        </div>
        <p className={s.note}>
          It makes a new game in <code>my-game</code>. Then <code>cd my-game</code>, <code>{manager.install}</code> and <code>{manager.dev}</code>.{' '}
          <Link href="/docs/guide/installation">Installation</Link> covers the templates and options.
        </p>
        <p className={s.note}>
          <Link href="/editor">Try the editor</Link> to write a story in your browser with nothing to install, and export it when you're ready.
        </p>
      </div>
    </div>
  )
}
