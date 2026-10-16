'use client'
// The homepage at /. It's always dark, whatever the docs' theme says:
// every colour is set here rather than taken from Fumadocs.
import Link from 'next/link'
import { useEffect, useRef, type ReactNode } from 'react'
import { HeroDemo } from './HeroDemo'
import { HomeNav } from './HomeNav'
import { InstallCard } from './InstallCard'
import { useTilt } from './tilt'
import s from './Home.module.css'

const shapes = [
  { name: 'The Letter', shape: 'A linear novel', detail: 'Three chapters, no plugins' },
  { name: 'The Corner Café', shape: 'A management game', detail: 'A turn is a week, staff are entities' },
  { name: 'Small Town', shape: 'A life sim', detail: 'Calendar, places, cast and a phone' },
]

const plugins = ['calendar', 'places', 'cast', 'quests', 'wardrobe', 'messages', 'feed', 'devices', 'phone', 'debug']
const inThisGame = new Set(['calendar', 'places', 'cast'])

const frameworks = ['React', 'Vue', 'Svelte', 'plain DOM']

const guarantees = ['Content is typed', 'Randomness is seeded from the save', 'Saves replay exactly', 'Old saves load into new versions']

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ')

function Arrow() {
  return (
    <span className={s.knob} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
    </span>
  )
}

/** One card of the bento: a tilting shell around a core. */
function Card({ kind, children }: { kind: string; children: ReactNode }) {
  const tilt = useTilt<HTMLDivElement>()
  return (
    <article className={cx(s.card, s[kind], 'reveal')}>
      <div className={s.shell} ref={tilt}>
        <div className={s.core}>{children}</div>
      </div>
    </article>
  )
}

export function Home() {
  const page = useRef<HTMLDivElement>(null)

  // Sections fade up as they come into view. A script in the page's head adds
  // .ifl-reveal before the first paint, unless the reader asks for less motion,
  // so without JavaScript the sections are simply there.
  useEffect(() => {
    const els = page.current?.querySelectorAll<HTMLElement>('.reveal') ?? []
    if (!document.documentElement.classList.contains('ifl-reveal')) return
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('in')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={page} className="ifl-home">
      <div className={s.glow} aria-hidden="true">
        <span className={cx(s.orb, s.a)} />
        <span className={cx(s.orb, s.b)} />
        <span className={cx(s.orb, s.c)} />
      </div>
      <div className={s.grain} aria-hidden="true" />

      <HomeNav />

      <main className={s.main}>
        <section className={cx(s.hero, s.wrap)}>
          <div className={cx(s.intro, 'reveal')}>
            <span className={s.eyebrow}>Open source · TypeScript</span>
            <h1 className={s.h1}>
              Interactive fiction for <em>any shape</em> of game
            </h1>
            <p className={cx(s.p, s.lede)}>
              Everything you&apos;d build in Twine, written in TypeScript instead: typed content, saves that survive updates, a checker that catches mistakes before players do, and a UI that looks like your game, not the engine&apos;s.
            </p>
            <div className={s.ctas}>
              <Link className={s.cta} href="/docs/guide/introduction">
                Read the docs
                <Arrow />
              </Link>
              <Link className={s.ghost} href="/docs/guide/first-story">
                Your first story
              </Link>
            </div>
          </div>

          <div className="reveal late">
            <HeroDemo />
            <p className={cx(s.p, s.caption)}>
              The cake&apos;s rule is written once, in the data. The engine greys the choice out and writes the reason on it, and it refuses the same choice if anything sends it anyway.
            </p>
          </div>
        </section>

        <section className={cx(s.install, s.wrap, 'reveal')} aria-labelledby="install-title">
          <h2 id="install-title" className={cx(s.h2, s['small-title'])}>
            Start a game
          </h2>
          <InstallCard />
        </section>

        <section className={cx(s.features, s.wrap)} aria-labelledby="features-title">
          <div className={cx(s['section-head'], 'reveal')}>
            <span className={s.eyebrow}>What you get</span>
            <h2 id="features-title" className={s.h2}>
              A small core, and the rest when you need it
            </h2>
          </div>

          <div className={s.bento}>
            <Card kind="shape">
              <span className={s.tag}>01</span>
              <h3 className={s.h3}>Any shape of game</h3>
              <p className={s.p}>
                A linear novel, a management game played a week at a time, or a life sim with a calendar, places and characters. All three run on one small core that keeps the turn, scenes, stats, entities and saves.
              </p>
              <ul className={s.shapes}>
                {shapes.map((shape) => (
                  <li key={shape.name}>
                    <span className={s['shape-name']}>{shape.name}</span>
                    <span className={s['shape-kind']}>{shape.shape}</span>
                    <span className={s['shape-detail']}>{shape.detail}</span>
                  </li>
                ))}
              </ul>
              <p className={cx(s.p, s.foot)}>
                Each one is an example game in the repository, and a template for <code className={s.code}>ifloom new</code>.
              </p>
            </Card>

            <Card kind="plugins">
              <span className={s.tag}>02</span>
              <h3 className={s.h3}>Plugins</h3>
              <p className={s.p}>Each plugin is a package of its own. Plugins work together when a game has both, but never require each other, so a game takes only what it needs.</p>
              <ul className={s.chips}>
                {plugins.map((plugin) => (
                  <li key={plugin} className={inThisGame.has(plugin) ? s.on : undefined}>
                    {plugin}
                  </li>
                ))}
              </ul>
              <p className={cx(s.p, s.foot)}>Lit up: what a life sim might take.</p>
            </Card>

            <Card kind="look">
              <span className={s.tag}>03</span>
              <h3 className={s.h3}>Your look, your framework</h3>
              <p className={s.p}>
                The engine gives your UI a view: what to show and what each button does. Draw it with React, Vue, Svelte or plain DOM. With the React UI, restyle any part with plain CSS, swap its classes, start unstyled, or replace any component, down to the page itself. Nothing gives away
                which engine the game runs on.
              </p>
              <div className={cx(s.term, s.snippet)} aria-label="Restyling a part with plain CSS">
                <span>
                  <b>[data-part=&quot;choice&quot;]</b> {'{'}
                </span>
                <span>{'  '}border-radius: 0;</span>
                <span>{'  '}font-family: &quot;Your Font&quot;;</span>
                <span>{'}'}</span>
              </div>
              <div className={s.files}>
                {frameworks.map((name) => (
                  <span key={name} className={s.mark}>
                    {name}
                  </span>
                ))}
              </div>
            </Card>

            <Card kind="checked">
              <span className={s.tag}>04</span>
              <h3 className={s.h3}>Checked before anyone plays</h3>
              <p className={s.p}>
                Conditions and effects are plain objects, so the engine can read every one of them. <code className={s.code}>ifloom check</code> reports what a scene names that isn&apos;t there, including missing pictures and sounds.
              </p>
              <div className={s.term}>
                <span>
                  <b>$</b> npm run check
                </span>
                <span className={s.ok}>No problems.</span>
              </div>
              <ul className={s.ticks}>
                {guarantees.map((guarantee) => (
                  <li key={guarantee}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m6 12.5 4 4 8-9" />
                    </svg>
                    {guarantee}
                  </li>
                ))}
              </ul>
            </Card>

            <Card kind="ship">
              <span className={s.tag}>05</span>
              <h3 className={s.h3}>Ship one file, with sound and video</h3>
              <p className={s.p}>
                <code className={s.code}>ifloom build</code> makes one <code className={s.code}>index.html</code> that opens from disk. Music, ambience and voice lines play on their own channels. Video sits inline in the prose, and pictures can carry hotspots. The docs come as{' '}
                <code className={s.code}>llms.txt</code> for your coding agent.
              </p>
              <div className={s.files}>
                <span className={s.file}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 3.5h7l4 4V20.5H7z" />
                    <path d="M14 3.5v4h4" />
                  </svg>
                  dist/index.html
                </span>
                <span className={s.mark}>[[video:]]</span>
                <span className={s.mark}>[[sound:]]</span>
                <span className={s.mark}>hotspots</span>
                <a className={cx(s.mark, s.link)} href="/llms.txt">
                  llms.txt
                </a>
              </div>
            </Card>
          </div>
        </section>

        <section className={cx(s.closing, s.wrap, 'reveal')} aria-labelledby="closing-title">
          <div className={s.shell}>
            <div className={s.core}>
              <h2 id="closing-title" className={s.h2}>
                Start with the guide
              </h2>
              <p className={s.p}>It takes you from a new project to a short novel of your own, then on to a game with a calendar, places and characters.</p>
              <div className={cx(s.ctas, s.center)}>
                <Link className={s.cta} href="/docs/guide/introduction">
                  Read the docs
                  <Arrow />
                </Link>
                <Link className={s.ghost} href="/docs/guide/installation">
                  Installation
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={cx(s.footer, s.wrap)}>
        <span>IFLoom is open source and MIT licensed.</span>
        <nav aria-label="Footer">
          <Link href="/docs/guide/introduction">Docs</Link>
          <Link href="/docs/changelog">Changelog</Link>
          <a href="https://github.com/IFLoom/ifloom" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </footer>
    </div>
  )
}
