'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import s from './InstallCard.module.css'

const managers = [
  { id: 'npm', command: 'npm create ifloom@latest my-game' },
  { id: 'bun', command: 'bun create ifloom my-game' },
  { id: 'pnpm', command: 'pnpm create ifloom my-game' },
  { id: 'yarn', command: 'yarn create ifloom my-game' },
] as const
type Manager = (typeof managers)[number]['id']

const KEY = 'ifloom.packageManager'

export function InstallCard() {
  const [chosen, setChosen] = useState<Manager>('npm')
  const [copied, setCopied] = useState(false)
  const reset = useRef<ReturnType<typeof setTimeout>>(undefined)
  const command = managers.find((m) => m.id === chosen)!.command

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
              <button key={m.id} type="button" role="tab" aria-selected={chosen === m.id} className={chosen === m.id ? s.on : undefined} onClick={() => choose(m.id)}>
                {m.id}
              </button>
            ))}
          </div>
          <span className={s.soon}>With the first release</span>
        </div>
        <div className={s.line}>
          <code>
            <span className={s.prompt} aria-hidden="true">
              $
            </span>
            {command}
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
          This command arrives with the first release, when the packages go on npm. Until then you start from a checkout: <code>git clone</code> the repository, run{' '}
          <code>npm install</code>, then <code>npm run new -- my-game</code>. <Link href="/docs/guide/installation">Installation</Link> walks you through it.
        </p>
      </div>
    </div>
  )
}
