'use client'
import Link from 'next/link'
import { useEffect, useState, type CSSProperties } from 'react'
import s from './HomeNav.module.css'

const links = [
  { text: 'Guide', href: '/docs/guide/introduction' },
  { text: 'Reference', href: '/docs/reference/game' },
  { text: 'Editor', href: '/editor' },
  { text: 'Changelog', href: '/docs/changelog' },
  { text: 'GitHub', href: 'https://github.com/IFLoom/ifloom', external: true },
]

const step = (i: number) => ({ '--i': i }) as CSSProperties

export function HomeNav() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('ifl-menu-open', open)
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => () => document.documentElement.classList.remove('ifl-menu-open'), [])

  return (
    <>
      <nav className={s.pill} aria-label="Main">
        <Link className={s.mark} href="/">
          IFLoom
        </Link>
        <ul className={s.links}>
          {links.map((link) =>
            link.external ? (
              <li key={link.text}>
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.text}
                </a>
              </li>
            ) : (
              <li key={link.text}>
                <Link href={link.href}>{link.text}</Link>
              </li>
            ),
          )}
        </ul>
        <span className={s.version} title="The docs on this site are for the latest version">
          Latest
        </span>
        <Link className={s.docs} href="/docs/guide/introduction">
          Docs
          <span className={s.knob} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </span>
        </Link>
        <button
          className={`${s.burger} ${open ? s.open : ''}`}
          type="button"
          aria-expanded={open}
          aria-controls="ifl-menu"
          aria-label={open ? 'Close the menu' : 'Open the menu'}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
        </button>
      </nav>

      <div id="ifl-menu" className={`${s.menu} ${open ? s.open : ''}`} aria-hidden={!open} inert={!open}>
        <ul>
          {[{ text: 'Docs', href: '/docs/guide/introduction', external: false }, ...links].map((link, i) => (
            <li key={link.text} style={step(i)}>
              {link.external ? (
                <a href={link.href} target="_blank" onClick={() => setOpen(false)}>
                  {link.text}
                </a>
              ) : (
                <Link href={link.href} onClick={() => setOpen(false)}>
                  {link.text}
                </Link>
              )}
            </li>
          ))}
        </ul>
        <p style={step(links.length + 1)}>Latest</p>
      </div>
    </>
  )
}
