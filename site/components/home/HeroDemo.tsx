'use client'
// The pack on the left types itself in once, and the panel on the right shows
// what the engine's view says to draw at each point. A choice shows its bare
// id until its prose key lands, as the engine does.
import { useEffect, useRef, useState } from 'react'
import { LINES, STARTS, TOKENS, TOTAL, cut, lineOf } from './code'
import { useTilt } from './tilt'
import s from './HeroDemo.module.css'

const at = {
  coins: lineOf('spendable'),
  title: lineOf('title:'),
  tea: lineOf("id: 'tea'"),
  teaPrice: lineOf('by: -2'),
  cake: lineOf("id: 'cake'"),
  cakePrice: lineOf('by: -5'),
  blocked: lineOf('reason:'),
  body: lineOf("counter: '"),
  teaLabel: lineOf("'counter#tea'"),
  cakeLabel: lineOf("'counter#cake'"),
}

const caretLineAt = (typed: number) => STARTS.findLastIndex((start) => start <= typed)

export function HeroDemo() {
  const [typed, setTyped] = useState(TOTAL)
  const [typing, setTyping] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const codeTilt = useTilt<HTMLElement>()
  const outTilt = useTilt<HTMLElement>()

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !root.current) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let count = 0
    setTyped(0)
    setTyping(true)

    function step() {
      if (count >= TOTAL) {
        setTyping(false)
        return
      }
      // Indentation arrives at once, as an editor would put it there.
      let next = count + 1
      const line = caretLineAt(count)
      if (count === STARTS[line]) {
        while (LINES[line][next - STARTS[line] - 1] === ' ') next++
      }
      count = next
      setTyped(next)
      const atEnd = next >= STARTS[line] + LINES[line].length
      timer = setTimeout(step, atEnd ? 90 : 11)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        observer.disconnect()
        timer = setTimeout(step, 700)
      },
      { threshold: 0.2 },
    )
    observer.observe(root.current)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  const shown = (i: number) => Math.max(0, Math.min(LINES[i].length, typed - STARTS[i]))
  const through = (i: number) => typed >= STARTS[i] + LINES[i].length
  const lines = TOKENS.map((tokens, i) => cut(tokens, shown(i)))
  const caretLine = caretLineAt(typed)

  const view = {
    coins: through(at.coins),
    title: through(at.title),
    body: through(at.body),
    tea: through(at.tea) && {
      label: through(at.teaLabel) ? 'A pot of tea' : 'tea',
      price: through(at.teaPrice),
    },
    cake: through(at.cake) && {
      label: through(at.cakeLabel) ? 'A slice of lemon cake' : 'cake',
      price: through(at.cakePrice),
      disabled: through(at.blocked),
    },
  }

  return (
    <div ref={root} className={s.demo}>
      <figure ref={codeTilt} className={`${s.shell} ${s['code-shell']}`}>
        <div className={`${s.core} ${s.code}`}>
          <figcaption className={s.bar}>
            <span className={s.dots} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className={s.file}>cafe.ts</span>
          </figcaption>
          <pre className={s.pre} aria-label="A pack written in TypeScript">
            <code>
              {lines.map((tokens, i) => (
                <span key={i} className={s.line}>
                  <span className={s.no} aria-hidden="true">
                    {i + 1}
                  </span>
                  {tokens.map((token, j) => (
                    <span key={j} className={token.c ? s[token.c] : undefined}>
                      {token.t}
                    </span>
                  ))}
                  {typing && i === caretLine && <span className={s.caret} aria-hidden="true" />}
                  {'\n'}
                </span>
              ))}
            </code>
          </pre>
        </div>
      </figure>

      <figure ref={outTilt} className={`${s.shell} ${s['out-shell']}`}>
        <div className={`${s.core} ${s.out}`} aria-live="off">
          <figcaption className={s.bar}>
            <span className={s.file}>What the engine&apos;s view says to draw</span>
          </figcaption>
          <div className={s.screen}>
            <div className={s.head}>
              {view.title ? <h3 key="t" className={`${s.title} ${s.pop}`}>The Corner Café</h3> : <span key="s" className={`${s.skeleton} ${s.wide}`} />}
              {view.coins && (
                <span className={`${s.stat} ${s.pop}`}>
                  Coins <b>£3</b>
                </span>
              )}
            </div>
            {view.body ? (
              <p key="b" className={`${s.prose} ${s.pop}`}>
                A lemon cake sits under a glass dome.
              </p>
            ) : (
              <span key="s" className={s.skeleton} />
            )}
            <div className={s.choices}>
              {view.tea && (
                <div className={`${s.choice} ${s.pop}`}>
                  <span className={s.label}>{view.tea.label}</span>
                  {view.tea.price && <span className={s.price}>£2</span>}
                </div>
              )}
              {view.cake && (
                <div className={`${s.choice} ${s.pop} ${view.cake.disabled ? s.disabled : ''}`} aria-disabled={view.cake.disabled}>
                  <span className={s.label}>{view.cake.label}</span>
                  {view.cake.price && <span className={s.price}>£5</span>}
                  {view.cake.disabled && <span className={`${s.reason} ${s.pop}`}>You only have £3 on you.</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </figure>
    </div>
  )
}
