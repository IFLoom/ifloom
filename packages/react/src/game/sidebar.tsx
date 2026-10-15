import type { Command, RenderedChoice, StageView } from '@ifloom/engine'
import { buttonVariants } from '../components/ui/button.tsx'
import { ChoiceButton } from './choices.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { Picture } from './picture.tsx'
import { Stage } from './stage.tsx'

function ClockImpl() {
  const { view } = useGame()
  const attrs = usePart('clock', 'text-sm text-muted-foreground')
  if (!view.when) return null
  return <p {...attrs}>{view.when}</p>
}

/** Where the game is in time, as its plugins say (`view.when`): nothing in a game with no calendar. */
export const Clock = overridable('Clock', ClockImpl)

function StatListImpl() {
  const { view } = useGame()
  const list = usePart('stats', 'grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm')
  const row = usePart('stat', 'contents')
  const label = usePart('stat-label', 'text-muted-foreground')
  const value = usePart('stat-value', 'text-right font-medium tabular-nums')
  if (!view.stats.length) return null
  return (
    <dl {...list}>
      {view.stats.map((stat) => (
        <div key={stat.key} {...row} data-stat={stat.key}>
          <dt {...label}>{stat.label}</dt>
          <dd {...value}>{stat.text}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The stats the game lists, with their values written as the game formats them. */
export const StatList = overridable('StatList', StatListImpl)

/** The places plugin's view, read by its shape: the UI depends on no plugin. */
type PlacesShape = {
  location: { id: string; name: string; tag: string; stage?: StageView | null } | null
  exits: { id: string; name: string; disabled?: string; warning?: string; command: Command }[]
}

function LocationPanelImpl() {
  const { view, send } = useGame()
  const section = usePart('location', 'flex flex-col gap-2')
  const name = usePart('location-name', 'font-heading font-semibold')
  const tag = usePart('location-text', 'text-xs text-muted-foreground')
  const list = usePart('exits', 'flex flex-wrap gap-1.5')
  const button = usePart('exit', buttonVariants({ size: 'sm', variant: 'outline' }))
  const places = view.plugins.places as PlacesShape | undefined
  // A game without the places plugin has nothing to show here.
  const location = places?.location
  const exits = places?.exits ?? []
  if (!location) return null
  return (
    <section {...section}>
      {location.stage?.layers.length ? <Stage stage={location.stage} /> : null}
      <div>
        <h3 {...name}>{location.name}</h3>
        <p {...tag}>{location.tag}</p>
      </div>
      {exits.length ? (
        <div {...list}>
          {exits.map((exit) => (
            <button
              key={exit.id}
              {...button}
              disabled={Boolean(exit.disabled)}
              title={exit.disabled ?? exit.warning}
              onClick={() => send(exit.command)}
              data-exit={exit.id}
            >
              {exit.name}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

/**
 * Where the player is, and the exits from it: each a button, greyed out with its
 * reason. A place with a stage shows it above its name, hotspots and all.
 */
export const LocationPanel = overridable('LocationPanel', LocationPanelImpl)

/** The cast plugin's view of who is here, read by its shape: the UI depends on no plugin. */
type PeopleShape = { present: { id: string; name: string; role: string | null; portrait: string | null; actions: RenderedChoice[] }[] }

function PeoplePanelImpl() {
  const { view } = useGame()
  const section = usePart('people', 'flex flex-col gap-2')
  const card = usePart('person', 'flex flex-col gap-1.5')
  const portrait = usePart('person-portrait', 'size-8 rounded-full object-cover')
  const name = usePart('person-name', 'text-sm font-medium')
  const role = usePart('person-role', 'text-xs text-muted-foreground')
  const actions = usePart('person-actions', 'flex flex-col gap-1.5')
  const people = (view.plugins.cast as PeopleShape | undefined)?.present ?? []
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

/** Who is here, with what the player can do with each of them: the cast plugin's. Nothing without it. */
export const PeoplePanel = overridable('PeoplePanel', PeoplePanelImpl)
