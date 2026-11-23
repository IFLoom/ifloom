'use client'
// The homepage at /. It's always dark, whatever the docs' theme says:
// every colour is set here rather than taken from Fumadocs.
// One file per icon, so the page carries only these.
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/csr/CalendarBlank'
import { MapPinIcon } from '@phosphor-icons/react/dist/csr/MapPin'
import { UsersIcon } from '@phosphor-icons/react/dist/csr/Users'
import { StorefrontIcon } from '@phosphor-icons/react/dist/csr/Storefront'
import { TShirtIcon } from '@phosphor-icons/react/dist/csr/TShirt'
import { BackpackIcon } from '@phosphor-icons/react/dist/csr/Backpack'
import { FlagIcon } from '@phosphor-icons/react/dist/csr/Flag'
import { TrophyIcon } from '@phosphor-icons/react/dist/csr/Trophy'
import { BriefcaseIcon } from '@phosphor-icons/react/dist/csr/Briefcase'
import { HourglassMediumIcon } from '@phosphor-icons/react/dist/csr/HourglassMedium'
import { ChatCircleIcon } from '@phosphor-icons/react/dist/csr/ChatCircle'
import { RssIcon } from '@phosphor-icons/react/dist/csr/Rss'
import { DeviceMobileIcon } from '@phosphor-icons/react/dist/csr/DeviceMobile'
import { BugIcon } from '@phosphor-icons/react/dist/csr/Bug'
import { MagicWandIcon } from '@phosphor-icons/react/dist/csr/MagicWand'
import { LockKeyOpenIcon } from '@phosphor-icons/react/dist/csr/LockKeyOpen'
import { ShuffleIcon } from '@phosphor-icons/react/dist/csr/Shuffle'
import type { Icon } from '@phosphor-icons/react/dist/lib/types'
import Link from 'next/link'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { HeroDemo } from './HeroDemo'
import { HomeNav } from './HomeNav'
import { InstallCard } from './InstallCard'
import { examples, sourceOf } from './examples'
import { useTilt } from './tilt'
import s from './Home.module.css'

const pluginIcons: Record<string, Icon> = {
  calendar: CalendarBlankIcon,
  places: MapPinIcon,
  cast: UsersIcon,
  shop: StorefrontIcon,
  wardrobe: TShirtIcon,
  inventory: BackpackIcon,
  quests: FlagIcon,
  achievements: TrophyIcon,
  jobs: BriefcaseIcon,
  statuses: HourglassMediumIcon,
  messages: ChatCircleIcon,
  feed: RssIcon,
  devices: DeviceMobileIcon,
  cheats: MagicWandIcon,
  unlocks: LockKeyOpenIcon,
  debug: BugIcon,
  generators: ShuffleIcon,
}

type Plugin = {
  id: string
  /** What it brings, for a player and an author. */
  adds: string
  /** How it plugs into the core. */
  extends: string
}

const pluginGroups: { name: string; plugins: Plugin[] }[] = [
  {
    name: 'World',
    plugins: [
      {
        id: 'calendar',
        adds: 'The periods of a day, the days of a week, sleep and a curfew.',
        extends: 'Decides what a turn is, prices actions in time, and adds calendar/period and calendar/weekday conditions.',
      },
      {
        id: 'places',
        adds: 'Locations with exits and things to do, travel between them, and where the player is.',
        extends: 'A places/location trait on entities, a places/at condition, and the room the screen shows when no scene is open.',
      },
      {
        id: 'cast',
        adds: 'Characters with schedules, who is in the room, talking and calling.',
        extends: 'A cast/person trait on entities. Relationships are stats the game declares on the kind character.',
      },
      {
        id: 'inventory',
        adds: 'Using, dropping and giving away the things the player holds.',
        extends: 'An inventory/usable trait, and use, drop and give commands over the engine’s holdings. It keeps no state of its own.',
      },
      {
        id: 'shop',
        adds: 'Vendors that sell for any spendable stat, with stock, restocking, selling back and daily discounts.',
        extends: 'A shop/vendor trait that holds the stock as entities, and a shop panel. Opening hours with the calendar, a place with places.',
      },
      {
        id: 'wardrobe',
        adds: 'Slots the game declares, and what the player and each protagonist has on.',
        extends: 'A wardrobe/wearable trait, worn by entity reference. Only what you hold is worn.',
      },
    ],
  },
  {
    name: 'Progress',
    plugins: [
      {
        id: 'quests',
        adds: 'What the player is doing, how far they have got, and the hint for what comes next.',
        extends: 'Stages done by conditions after each command, never taken back, with quests/done and quests/active to ask.',
      },
      {
        id: 'achievements',
        adds: 'Achievements earned by conditions or effects, secret ones and progress counts.',
        extends: 'Checks after each command, and keeps its record in the profile, so it lasts across saves.',
      },
      {
        id: 'jobs',
        adds: 'Hiring, shifts that cost time or energy and pay a wage, promotions and getting fired.',
        extends: 'Jobs as content, a jobs panel, and a jobs/rank value. Shift hours with the calendar, a workplace with places.',
      },
      {
        id: 'statuses',
        adds: 'A boost or a cold that lasts some turns.',
        extends: 'Changes what stats read through the engine’s stat modifiers, never writing them, and runs effects each turn.',
      },
    ],
  },
  {
    name: 'Phone',
    plugins: [
      {
        id: 'messages',
        adds: 'Threads of messages that arrive when the story allows, and replies that are choices.',
        extends: 'Channels and messages as content, arriving by condition, with messages/arrived and messages/replied to ask.',
      },
      {
        id: 'feed',
        adds: 'Timelines of posts, the player’s own posts, and the likes and comments they get.',
        extends: 'Feeds and posts as content, appearing by condition, with a feed/post effect for the player’s own.',
      },
      {
        id: 'devices',
        adds: 'A phone, a laptop or a desk drawer, with apps and badges.',
        extends: 'Apps built from sections. Opening one is free and doesn’t leave the room. A phone is this, messages and feed.',
      },
    ],
  },
  {
    name: 'Tools',
    plugins: [
      {
        id: 'cheats',
        adds: 'Effects the player can use at any time, free or kept for supporters.',
        extends: 'Runs in any scene and through any lock, refused by a blocked condition until it holds, with a log of each use.',
      },
      {
        id: 'unlocks',
        adds: 'Codes a player enters that open cheats, scenes and whole packs of content.',
        extends: 'Checked against a slow hash, so no code ships. The build encrypts unlocked content under the code.',
      },
      {
        id: 'debug',
        adds: 'Set a stat or a kv key, jump to a scene, set the time, go anywhere.',
        extends: 'Commands that ignore every lock, while you test. Left out of release builds.',
      },
      {
        id: 'generators',
        adds: 'Named pools of values and templates that make new entities.',
        extends: 'Each drawn field from a pool or a range, seeded from the save, so a replay draws the same.',
      },
    ],
  },
]

const frameworks = ['React', 'Vue', 'Svelte', 'plain DOM']

const tools = [
  { name: 'ifloom dev', what: 'Reloads the game as you write.' },
  { name: 'ifloom check', what: 'Finds broken links, missing pictures and sounds, and misspelt ids.' },
  { name: 'ifloom playtest', what: 'Plays a week on its own and writes down every screen.' },
  { name: 'ifloom snapshot', what: 'Renders every scene and shows what changed since the last run.' },
  { name: 'debug plugin', what: 'Jumps to any state while you test, without playing up to it.' },
]

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
function Card({ kind, raised, children }: { kind: string; raised?: boolean; children: ReactNode }) {
  const tilt = useTilt<HTMLDivElement>()
  return (
    <article className={cx(s.card, s[kind], raised && s.raised, 'reveal')}>
      <div className={s.shell} ref={tilt}>
        <div className={s.core}>{children}</div>
      </div>
    </article>
  )
}

/** The example games as tabs, each with a few lines of its source. */
function ExampleTabs() {
  const [chosen, setChosen] = useState('showcase')
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const id = useId()
  const example = examples.find((e) => e.id === chosen) ?? examples[0]

  // Left and right move between the tabs, Home and End to either end.
  const onKey = (event: KeyboardEvent, index: number) => {
    const last = examples.length - 1
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key]
    if (next === undefined) return
    event.preventDefault()
    setChosen(examples[next].id)
    tabs.current[next]?.focus()
  }

  return (
    <div className={s.examples}>
      <div className={s.tabs} role="tablist" aria-label="Example games">
        {examples.map((e, i) => (
          <button
            key={e.id}
            ref={(el) => {
              tabs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${e.id}`}
            aria-selected={e.id === chosen}
            aria-controls={`${id}-panel`}
            tabIndex={e.id === chosen ? 0 : -1}
            className={e.id === chosen ? s.on : undefined}
            onClick={() => setChosen(e.id)}
            onKeyDown={(event) => onKey(event, i)}
          >
            {e.name}
          </button>
        ))}
      </div>
      <div className={s.panel} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${example.id}`}>
        <div className={s['example-head']}>
          <span className={s['shape-kind']}>{example.shape}</span>
          <span className={s['example-detail']}>{example.detail}</span>
        </div>
        <div className={s.source}>
          <div className={s['source-bar']}>
            <span>{example.path}</span>
            <a href={sourceOf(example)} rel="noreferrer">
              Source
            </a>
          </div>
          <pre className={s.listing}>
            {example.tokens.map((tokens, i) => (
              <span key={i} className={s.line}>
                {tokens.map((token, j) =>
                  token.c ? (
                    <span key={j} className={s[token.c]}>
                      {token.t}
                    </span>
                  ) : (
                    token.t
                  ),
                )}
                {'\n'}
              </span>
            ))}
          </pre>
        </div>
      </div>
    </div>
  )
}

/** The plugin chips: each opens a note on what the plugin adds, on hover, focus or a tap. */
function PluginChips({ onOpen }: { onOpen: (open: boolean) => void }) {
  const [open, setOpen] = useState<{ id: string; flip: boolean } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const id = useId()

  const show = (plugin: string, chip: HTMLElement) => {
    const box = root.current?.getBoundingClientRect()
    const at = chip.getBoundingClientRect()
    // A chip in the right half opens its note leftward, so it stays in the card.
    setOpen({ id: plugin, flip: box ? at.left - box.left > box.width / 2 : false })
  }
  const hide = () => setOpen(null)
  const canHover = () => matchMedia('(hover: hover) and (pointer: fine)').matches

  useEffect(() => onOpen(open !== null), [open, onOpen])

  // While a note is open, Escape or a press outside the chips closes it.
  useEffect(() => {
    if (!open) return
    const key = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && hide()
    const press = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) hide()
    }
    document.addEventListener('keydown', key)
    document.addEventListener('pointerdown', press)
    return () => {
      document.removeEventListener('keydown', key)
      document.removeEventListener('pointerdown', press)
    }
  }, [open])

  return (
    <div className={s.groups} ref={root}>
      {pluginGroups.map((group) => (
        <div key={group.name} className={s.group}>
          <span className={s['group-name']}>{group.name}</span>
          <ul className={s.chips}>
            {group.plugins.map((plugin) => {
              const PluginIcon = pluginIcons[plugin.id]
              const on = open?.id === plugin.id
              const note = `${id}-${plugin.id}`
              return (
                <li
                  key={plugin.id}
                  className={cx(s.chip, on && s.on)}
                  onPointerEnter={(event) => canHover() && show(plugin.id, event.currentTarget)}
                  onPointerLeave={() => canHover() && hide()}
                  // Focus moving out of the chip and its note closes it.
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) hide()
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={on}
                    aria-controls={note}
                    aria-describedby={on ? note : undefined}
                    onFocus={(event) => show(plugin.id, event.currentTarget)}
                    onClick={(event) => (on && !canHover() ? hide() : show(plugin.id, event.currentTarget))}
                  >
                    <PluginIcon size={14} weight="light" aria-hidden="true" />
                    {plugin.id}
                  </button>
                  <div id={note} role="tooltip" className={cx(s.note, open?.flip && s.flip)} hidden={!on}>
                    <span className={s['note-name']}>
                      <PluginIcon size={16} weight="light" aria-hidden="true" />
                      {plugin.id}
                    </span>
                    <p>{plugin.adds}</p>
                    <p className={s['note-extends']}>{plugin.extends}</p>
                    <Link className={s['note-link']} href={`/docs/plugins/${plugin.id}`}>
                      Read about {plugin.id} →
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function Home() {
  const page = useRef<HTMLDivElement>(null)
  const [pluginOpen, setPluginOpen] = useState(false)

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
              Everything you&apos;d build in Twine, written in TypeScript instead: typed content, saves that survive updates, a checker that catches mistakes
              before players do, and a UI that looks like your game, not the engine&apos;s.
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
              <h3 className={s.h3}>Write the game you want</h3>
              <p className={s.p}>
                A short novel, a business you run week by week, a town full of people with their own days. Scenes, stats and characters are yours to shape, and
                the engine doesn&apos;t assume a genre.
              </p>
              <ExampleTabs />
              <p className={cx(s.p, s.foot)}>
                Each one is an example game in the repository, and a template for <code className={s.code}>ifloom new</code>.
              </p>
            </Card>

            <Card kind="plugins" raised={pluginOpen}>
              <span className={s.tag}>02</span>
              <h3 className={s.h3}>Plugins</h3>
              <p className={s.p}>
                Add what your game needs and leave out the rest. Plugins work together when a game has both, but never depend on each other.
              </p>
              <PluginChips onOpen={setPluginOpen} />
            </Card>

            <Card kind="look">
              <span className={s.tag}>03</span>
              <h3 className={s.h3}>Your look, your framework</h3>
              <p className={s.p}>
                The engine is a library with no UI. It gives your UI a view: what to show and what each button does. Draw it with React, Vue, Svelte or plain
                DOM. Or take the ready-made React UI and restyle any part with plain CSS, swap its classes, start unstyled, or replace any component, down to
                the page itself. Nothing gives away which engine the game runs on.
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
                <Link className={cx(s.mark, s.link)} href="/docs/guide/how-it-fits">
                  How the pieces fit
                </Link>
              </div>
            </Card>

            <Card kind="checked">
              <span className={s.tag}>04</span>
              <h3 className={s.h3}>Tools that catch it before players do</h3>
              <p className={s.p}>Your content is typed, so your editor autocompletes ids and kv a typo as you make it. The rest is a command away.</p>
              <ul className={s['tool-list']}>
                {tools.map((tool) => (
                  <li key={tool.name}>
                    <code className={s.code}>{tool.name}</code>
                    <span>{tool.what}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card kind="ship">
              <span className={s.tag}>05</span>
              <h3 className={s.h3}>Ship one file</h3>
              <p className={s.p}>
                <code className={s.code}>ifloom build</code> makes one <code className={s.code}>index.html</code> that opens straight from disk, with your
                pictures, sounds and videos beside it. Put it on itch.io, your own site, or a USB stick.
              </p>
              <p className={s.p}>
                Add <code className={s.code}>--inline-assets</code> and the pictures go inside the page too, so a game without video or sound is that one file
                and nothing else.
              </p>
              <div className={s.files}>
                <span className={s.file}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 3.5h7l4 4V20.5H7z" />
                    <path d="M14 3.5v4h4" />
                  </svg>
                  dist/index.html
                </span>
              </div>
            </Card>

            <Card kind="media">
              <span className={s.tag}>06</span>
              <h3 className={s.h3}>Sound, video and pictures you can click</h3>
              <p className={s.p}>
                Music, ambience and voice lines play on their own channels and crossfade between scenes. Videos sit inline in the prose, and pictures can have
                hotspots the player clicks.
              </p>
              <div className={s.files}>
                <span className={s.mark}>[[video:]]</span>
                <span className={s.mark}>[[sound:]]</span>
                <span className={s.mark}>hotspots</span>
              </div>
            </Card>

            <Card kind="agents">
              <span className={s.tag}>07</span>
              <h3 className={s.h3}>Works with your coding agent</h3>
              <p className={s.p}>
                Every new game comes with an <code className={s.code}>AGENTS.md</code> that tells an agent where the docs are and how to check its work. The
                docs are published as <code className={s.code}>llms.txt</code>, and an MCP server lets an agent search them.
              </p>
              <div className={s.files}>
                <a className={cx(s.mark, s.link)} href="/llms.txt">
                  llms.txt
                </a>
                <span className={s.mark}>ifloom.dev/api/mcp</span>
                <Link className={cx(s.mark, s.link)} href="/docs/guide/agents">
                  Using an agent
                </Link>
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
              <p className={s.p}>Go from an empty project to a finished short story in an afternoon, then build from there.</p>
              <div className={cx(s.ctas, s.center)}>
                <Link className={s.cta} href="/docs/guide/introduction">
                  Read the docs
                  <Arrow />
                </Link>
                <Link className={s.ghost} href="/docs/guide/installation">
                  Installation
                </Link>
              </div>
              <Link className={s.from} href="/docs/guide/coming-from-twine">
                Coming from SugarCube or Harlowe?
              </Link>
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
