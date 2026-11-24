/**
 * The places plugin's React UI, for a game rendered with `@ifloom/react`.
 *
 * List `placesUi` in the game's `plugins` to render the player's location and its exits in the room. To render them
 * yourself, read `usePlaces`.
 */
import type { ComponentProps } from 'react'
import type { EntityRef, GameState, Result } from '@ifloom/engine'
import { places, type PlacesView } from '../index.ts'
import { LayeredPicture, usePart } from '@ifloom/react'
import { buttonVariants, cn, overridable, type Override, pluginKit, type PluginUi, PROSE, usePlugin } from '@ifloom/react/kit'

/** The places plugin's UI, declared once: its id, for `usePlugin` and `placesUi`. */
const PLACES = pluginKit('places')

declare module '@ifloom/react' {
  interface OverridableComponents {
    LocationCard: Override<ComponentProps<typeof LocationCard>>
    Exits: Override<ComponentProps<typeof Exits>>
  }
  interface PartNames {
    'exit': true
    'exits': true
    'location': true
    'location-name': true
    'location-text': true
    'location-thing': true
    'location-thing-name': true
    'location-thing-pick': true
    'location-things': true
  }
}

/** The places plugin's view with functions that take an exit and pick up a thing, as `usePlaces` returns it. */
export type PlacesControls = PlacesView & {
  /** Sends the command of the exit to the location with this id. The engine refuses it, as any command, when the exit is disabled or missing. */
  go: (exit: string) => Result<GameState>
  /** Sends the `pickUp` command for one of the thing lying here with this reference, such as `'note:paper'`. */
  pickUp: (thing: EntityRef) => Result<GameState>
}

/** Returns the places plugin's view and commands from the running game, or null in a game without the plugin. It re-renders when the view changes. */
export function usePlaces(): PlacesControls | null {
  const { view, send } = usePlugin(PLACES)
  if (!view) return null
  return {
    ...view,
    go: (exit) => send(view.exits.find((entry) => entry.id === exit)?.command ?? places.go(exit)),
    pickUp: (thing) => send(view.things.find((entry) => entry.ref === thing)?.pickUp.command ?? places.pickUp(thing)),
  }
}

function LocationCardImpl() {
  const here = usePlaces()
  const section = usePart('location', 'flex flex-col gap-2')
  const name = usePart('location-name', 'font-heading font-semibold')
  const tag = usePart('location-text', 'text-xs text-muted-foreground')
  const list = usePart('location-things', 'mt-2 flex flex-col gap-1.5 text-sm')
  const row = usePart('location-thing', 'flex items-center justify-between gap-2')
  const thingName = usePart('location-thing-name', 'flex-1')
  const pick = usePart('location-thing-pick', buttonVariants({ size: 'sm', variant: 'outline' }))
  // A game without the places plugin has nothing to show here.
  const location = here?.location
  if (!location) return null
  const things = here.things ?? []
  return (
    <section {...section}>
      {location.picture?.layers.length ? <LayeredPicture picture={location.picture} /> : null}
      <div className={PROSE}>
        <h3 {...name}>{location.name}</h3>
        {location.description ? <p {...tag}>{location.description}</p> : null}
        {things.length ? (
          <ul {...list}>
            {things.map((thing) => (
              <li key={thing.ref} {...row} data-thing={thing.ref}>
                <span {...thingName}>
                  {thing.name}
                  {thing.count > 1 ? ` ×${thing.count}` : ''}
                </span>
                <button {...pick} disabled={Boolean(thing.pickUp.disabled)} title={thing.pickUp.disabled} onClick={() => here.pickUp(thing.ref)}>
                  {thing.pickUp.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}

/**
 * Renders the player's location from `view.plugins.places.location`, its name and `description` under its layered
 * picture, with the things lying there and a button to pick each up. `Exits` renders the exits.
 *
 * A preset can style the parts `location`, `location-name`, `location-text`, `location-things`, `location-thing`,
 * `location-thing-name` and `location-thing-pick`.
 */
export const LocationCard = overridable('LocationCard', LocationCardImpl)

function ExitsImpl({ className }: { className?: string }) {
  const here = usePlaces()
  const list = usePart('exits', cn(PROSE, 'flex flex-wrap gap-1.5'), className)
  const button = usePart('exit', buttonVariants({ size: 'sm', variant: 'outline' }))
  const exits = here?.exits ?? []
  if (!here?.location || !exits.length) return null
  return (
    <nav {...list}>
      {exits.map((exit) => (
        <button
          key={exit.id}
          type="button"
          {...button}
          disabled={Boolean(exit.disabled)}
          title={exit.disabled ?? exit.warning}
          onClick={() => here.go(exit.id)}
          data-exit={exit.id}
        >
          {exit.label}
        </button>
      ))}
    </nav>
  )
}

/**
 * Renders the exits from `view.plugins.places.exits`, each a button that is disabled with its reason when refused. It
 * renders nothing without the places plugin, and a preset can style the parts `exits` and `exit`.
 */
export const Exits = overridable('Exits', ExitsImpl)

/**
 * The places plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders the `LocationCard` and
 * the `Exits` in the room, before the room's actions.
 */
export const placesUi: PluginUi = {
  ...PLACES,
  layout: { room: [() => <LocationCard />, () => <Exits />] },
}
