import type { Command, RenderedChoice } from '@ifloom/engine'
import { Button } from '../components/ui/button.tsx'
import { ChoiceButton } from './choices.tsx'
import { useGame } from './context.tsx'
import { Picture } from './picture.tsx'

/** Where the game is in time, as its plugins say (`view.when`): nothing in a game with no calendar. */
export function Clock() {
  const { view } = useGame()
  if (!view.when) return null
  return <p className="text-sm text-muted-foreground">{view.when}</p>
}

/** The stats the game lists, with their values written as the game formats them. */
export function StatList() {
  const { view } = useGame()
  if (!view.stats.length) return null
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
      {view.stats.map((stat) => (
        <div key={stat.key} className="contents" data-stat={stat.key}>
          <dt className="text-muted-foreground">{stat.label}</dt>
          <dd className="text-right font-medium tabular-nums">{stat.text}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The places plugin's view, read by its shape: the UI depends on no plugin. */
type PlacesShape = {
  location: { id: string; name: string; tag: string } | null
  exits: { id: string; name: string; disabled?: string; warning?: string; command: Command }[]
}

/** Where the player is, and the exits from it: each a button, greyed out with its reason. */
export function LocationPanel() {
  const { view, send } = useGame()
  const places = view.plugins.places as PlacesShape | undefined
  // A game without the places plugin has nothing to show here.
  const location = places?.location
  const exits = places?.exits ?? []
  if (!location) return null
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="font-semibold">{location.name}</h3>
        <p className="text-xs text-muted-foreground">{location.tag}</p>
      </div>
      {exits.length ? (
        <div className="flex flex-wrap gap-1.5">
          {exits.map((exit) => (
            <Button
              key={exit.id}
              size="sm"
              variant="outline"
              disabled={Boolean(exit.disabled)}
              title={exit.disabled ?? exit.warning}
              onClick={() => send(exit.command)}
              data-exit={exit.id}
            >
              {exit.name}
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

/** The cast plugin's view of who is here, read by its shape: the UI depends on no plugin. */
type PeopleShape = { present: { id: string; name: string; role: string | null; portrait: string | null; actions: RenderedChoice[] }[] }

/** Who is here, with what the player can do with each of them: the cast plugin's. Nothing without it. */
export function PeoplePanel() {
  const { view } = useGame()
  const people = (view.plugins.cast as PeopleShape | undefined)?.present ?? []
  if (!people.length) return null
  return (
    <section className="flex flex-col gap-2">
      {people.map((person) => (
        <div key={person.id} className="flex flex-col gap-1.5" data-person={person.id}>
          <div className="flex items-center gap-2">
            {person.portrait ? <Picture src={person.portrait} alt="" className="size-8 rounded-full object-cover" /> : null}
            <div className="flex-1">
              <p className="text-sm font-medium">{person.name}</p>
              {person.role ? <p className="text-xs text-muted-foreground">{person.role}</p> : null}
            </div>
          </div>
          {person.actions.map((action) => (
            <ChoiceButton key={action.id} choice={action} />
          ))}
        </div>
      ))}
    </section>
  )
}
