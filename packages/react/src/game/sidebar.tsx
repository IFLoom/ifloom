import type { GameState, Result, StatView } from '@ifloom/engine'
import type { CalendarView } from '@ifloom/plugin-calendar'
import type { CastView } from '@ifloom/plugin-cast'
import type { ExitView, PlacesView } from '@ifloom/plugin-places'
import { buttonVariants } from '../components/ui/button.tsx'
import { ChoiceButton } from './choices.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { Picture } from './picture.tsx'
import { Stage } from './stage.tsx'
import { useWords } from './words.ts'

/** What `useClock` returns: where the game is in time. */
export type ClockState = {
  /** The line the plugins wrote (`view.when`), such as "Day 3 · Wednesday morning", or null when none says. */
  when: string | null
  /** The calendar plugin's view, piece by piece, or null in a game without it. */
  calendar: CalendarView | null
}

/** Where the game is in time: the whole line and, with the calendar plugin, its parts. `Clock` is drawn from it. */
export function useClock(): ClockState {
  const { view } = useGame()
  return { when: view.when || null, calendar: (view.plugins.calendar as CalendarView | undefined) ?? null }
}

function ClockImpl() {
  const { when } = useClock()
  const attrs = usePart('clock', 'text-sm text-muted-foreground')
  if (!when) return null
  return <p {...attrs}>{when}</p>
}

/** Where the game is in time, as its plugins say (`view.when`): nothing in a game with no calendar. A thin default on `useClock`. */
export const Clock = overridable('Clock', ClockImpl)

/** The most pips drawn; a wider range is drawn as a bar. */
const MAX_PIPS = 20

/** A stat's value as a bar from its `min` to its `max`, or as pips, one per point. */
function StatGauge({ stat }: { stat: StatView }) {
  const bar = usePart('stat-bar', 'col-span-2 h-1.5 overflow-hidden rounded-full bg-muted [&>span]:block [&>span]:h-full [&>span]:bg-primary')
  const pips = usePart('stat-pips', 'col-span-2 flex flex-wrap gap-1')
  const full = usePart('stat-pip', 'size-2.5 rounded-full border border-primary bg-primary')
  const empty = usePart('stat-pip', 'size-2.5 rounded-full border border-primary')
  const range = stat.max - stat.min
  const meter = {
    role: 'meter',
    'aria-label': stat.label,
    'aria-valuemin': stat.min,
    'aria-valuemax': stat.max,
    'aria-valuenow': stat.value,
    'aria-valuetext': stat.text,
  } as const
  if (stat.display === 'pips' && range > 0 && range <= MAX_PIPS) {
    const filled = Math.max(0, Math.min(range, Math.round(stat.value - stat.min)))
    return (
      <dd {...pips} {...meter}>
        {Array.from({ length: range }, (_, index) => (
          <span key={index} {...(index < filled ? full : empty)} data-filled={index < filled ? '' : undefined} />
        ))}
      </dd>
    )
  }
  const share = range > 0 ? Math.max(0, Math.min(1, (stat.value - stat.min) / range)) : 0
  return (
    <dd {...bar} {...meter}>
      <span style={{ width: `${Math.round(share * 1000) / 10}%` }} />
    </dd>
  )
}

function StatListImpl() {
  const { view } = useGame()
  const words = useWords()
  const list = usePart('stats', 'grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm')
  const row = usePart('stat', 'contents')
  const label = usePart('stat-label', 'text-muted-foreground')
  const value = usePart('stat-value', 'text-right font-medium tabular-nums')
  const levelPart = usePart('stat-level', 'ml-1.5 text-xs text-muted-foreground')
  const progressPart = usePart('stat-progress', 'col-span-2 h-1 overflow-hidden rounded-full bg-muted [&>span]:block [&>span]:h-full [&>span]:bg-primary')
  if (!view.stats.length) return null
  return (
    <dl {...list}>
      {view.stats.map((stat) => {
        const level = stat.level
        const percent = level ? Math.round(level.progress * 100) : 0
        return (
          <div key={stat.key} {...row} data-stat={stat.key}>
            <dt {...label}>
              {stat.label}
              {level ? (
                <span {...levelPart} data-level={level.level}>
                  {words('statLevel', { level: level.level })}
                </span>
              ) : null}
            </dt>
            <dd {...value}>{stat.text}</dd>
            {stat.display === 'bar' || stat.display === 'pips' ? <StatGauge stat={stat} /> : null}
            {level && level.next !== null ? (
              <dd
                {...progressPart}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label={words('statProgress', { label: stat.label, percent, next: level.level + 1 })}
              >
                <span style={{ width: `${percent}%` }} />
              </dd>
            ) : null}
          </div>
        )
      })}
    </dl>
  )
}

/**
 * The stats the game lists, with their values written as the game formats them.
 * A stat with levels also shows its level and a bar towards the next one. A
 * stat whose `display` is `'bar'` gets a bar from its `min` to its `max` under
 * it, and one with `'pips'` a row of pips, one per point (a bar past 20).
 */
export const StatList = overridable('StatList', StatListImpl)

/** What `usePlaces` returns: the places plugin's view, and how to take an exit. */
export type PlacesControls = PlacesView & {
  /** Take an exit by the id of the place it leads to: sends that exit's command. Refused, as any command is, when it's greyed out or not there. */
  go: (exit: string) => Result<GameState>
}

/** The places plugin's view with a way to travel, or null in a game without the plugin. `LocationCard` is drawn from it. */
export function usePlaces(): PlacesControls | null {
  const { view, send } = useGame()
  const places = view.plugins.places as PlacesView | undefined
  if (!places) return null
  return {
    ...places,
    go: (exit) => {
      const found: ExitView | undefined = places.exits.find((entry) => entry.id === exit)
      return found ? send(found.command) : send({ type: 'custom', name: 'places/go', with: { id: exit } })
    },
  }
}

function LocationCardImpl() {
  const places = usePlaces()
  const section = usePart('location', 'flex flex-col gap-2')
  const name = usePart('location-name', 'font-heading font-semibold')
  const tag = usePart('location-text', 'text-xs text-muted-foreground')
  // A game without the places plugin has nothing to show here.
  const location = places?.location
  if (!location) return null
  return (
    <section {...section}>
      {location.stage?.layers.length ? <Stage stage={location.stage} /> : null}
      <div>
        <h3 {...name}>{location.name}</h3>
        <p {...tag}>{location.tag}</p>
      </div>
    </section>
  )
}

/**
 * Where the player is: the place's name and tag, with its stage above them,
 * hotspots and all. The exits are `Exits`. A thin default on `usePlaces`.
 */
export const LocationCard = overridable('LocationCard', LocationCardImpl)

function ExitsImpl({ className }: { className?: string }) {
  const places = usePlaces()
  const list = usePart('exits', 'flex flex-wrap gap-1.5', className)
  const button = usePart('exit', buttonVariants({ size: 'sm', variant: 'outline' }))
  const exits = places?.exits ?? []
  if (!places?.location || !exits.length) return null
  return (
    <nav {...list}>
      {exits.map((exit) => (
        <button
          key={exit.id}
          type="button"
          {...button}
          disabled={Boolean(exit.disabled)}
          title={exit.disabled ?? exit.warning}
          onClick={() => places.go(exit.id)}
          data-exit={exit.id}
        >
          {exit.label}
        </button>
      ))}
    </nav>
  )
}

/** The exits from where the player is, each a button, greyed out with its reason. Nothing without the places plugin. A thin default on `usePlaces`. */
export const Exits = overridable('Exits', ExitsImpl)

/** The cast plugin's view: who is here (`present`, each with their buttons) and everyone met (`people`), or null in a game without the plugin. `PeopleHere` and `Relationships` are drawn from it. */
export function usePeople(): CastView | null {
  const { view } = useGame()
  return (view.plugins.cast as CastView | undefined) ?? null
}

function PeopleHereImpl({ className }: { className?: string }) {
  const section = usePart('people', 'flex flex-col gap-2', className)
  const card = usePart('person', 'flex flex-col gap-1.5')
  const portrait = usePart('person-portrait', 'size-8 rounded-full object-cover')
  const name = usePart('person-name', 'text-sm font-medium')
  const role = usePart('person-role', 'text-xs text-muted-foreground')
  const actions = usePart('person-actions', 'flex flex-wrap gap-1.5')
  const people = usePeople()?.present ?? []
  if (!people.length) return null
  return (
    <section {...section}>
      {people.map((person) => (
        <div key={person.id} {...card} data-person={person.id}>
          <div className="flex items-center gap-2">
            {person.portrait ? <Picture {...portrait} src={person.portrait} alt="" /> : null}
            <div className="flex-1">
              <p {...name}>{person.name}</p>
              {person.role ? <p {...role}>{person.role}</p> : null}
            </div>
          </div>
          {person.actions.length ? (
            <div {...actions}>
              {person.actions.map((action) => (
                <ChoiceButton key={action.id} choice={action} />
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  )
}

/** Who is here, with what the player can do with each of them: the cast plugin's. Nothing without it. A thin default on `usePeople`. */
export const PeopleHere = overridable('PeopleHere', PeopleHereImpl)

function RelationshipsImpl({ className }: { className?: string }) {
  const { view } = useGame()
  const list = usePart('relationships', 'flex flex-col gap-3 text-sm', className)
  const card = usePart('relationship', 'flex flex-col gap-1')
  const head = usePart('relationship-header', 'flex items-center gap-2')
  const portrait = usePart('person-portrait', 'size-8 rounded-full object-cover')
  const name = usePart('person-name', 'text-sm font-medium')
  const role = usePart('person-role', 'text-xs text-muted-foreground')
  const stats = usePart('relationship-stats', 'grid grid-cols-[1fr_auto] gap-x-3 gap-y-1')
  const label = usePart('stat-label', 'text-muted-foreground')
  const value = usePart('stat-value', 'text-right font-medium tabular-nums')
  const people = (usePeople()?.people ?? []).filter((person) => person.met)
  if (!people.length) return null
  // Each character is an entity: the stats the player can see on it are its relationship.
  const entries = Object.values(view.entities).flatMap((kind) => kind.entries)
  return (
    <div {...list}>
      {people.map((person) => {
        const shown = entries.find((entry) => entry.ref === person.ref)?.stats ?? []
        return (
          <section key={person.id} {...card} data-person={person.id}>
            <div {...head}>
              {person.portrait ? <Picture {...portrait} src={person.portrait} alt="" /> : null}
              <div className="flex-1">
                <p {...name}>{person.name}</p>
                {person.role ? <p {...role}>{person.role}</p> : null}
              </div>
            </div>
            {shown.length ? (
              <dl {...stats}>
                {shown.map((stat) => (
                  <div key={stat.key} className="contents" data-stat={stat.key}>
                    <dt {...label}>{stat.label}</dt>
                    <dd {...value}>{stat.text}</dd>
                    {stat.display === 'bar' || stat.display === 'pips' ? <StatGauge stat={stat} /> : null}
                  </div>
                ))}
              </dl>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

/**
 * Everyone the player has met, from the cast plugin, with the stats the
 * player can see on each of them (friendship, say), as the game declares them
 * on the cast's kind of entity. Nothing without the plugin, or before anyone
 * is met. A thin default on `usePeople`.
 */
export const Relationships = overridable('Relationships', RelationshipsImpl)
