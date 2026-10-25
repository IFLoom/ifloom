/**
 * @ifloom/plugin-places/react: the places plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `placesUi` in the game's
 * `plugins` to have where the player is and the way out in the story, or
 * draw them yourself from `usePlaces`.
 */
import type { ComponentProps } from 'react'
import type { GameState, Result } from '@ifloom/engine'
import type { ExitView, PlacesView } from '../index.ts'
import { buttonVariants, cn, overridable, type Override, type PluginUi, PROSE, LayeredPicture, useGame, usePart } from '@ifloom/react'

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

/** What `usePlaces` returns: the places plugin's view, how to take an exit, and how to pick up what lies here. */
export type PlacesControls = PlacesView & {
  /** Take an exit by the id of the place it leads to: sends that exit's command. Refused, as any command is, when it's greyed out or not there. */
  go: (exit: string) => Result<GameState>
  /** Pick up one of a thing lying here, by its reference (`'item:paper'`): sends its `pickUp` command. */
  pickUp: (thing: string) => Result<GameState>
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
    pickUp: (thing) => {
      const found = places.things.find((entry) => entry.ref === thing)
      return found ? send(found.pickUp.command) : send({ type: 'custom', name: 'places/pickUp', with: { id: thing } })
    },
  }
}

function LocationCardImpl() {
  const places = usePlaces()
  const section = usePart('location', 'flex flex-col gap-2')
  const name = usePart('location-name', 'font-heading font-semibold')
  const tag = usePart('location-text', 'text-xs text-muted-foreground')
  const list = usePart('location-things', 'mt-2 flex flex-col gap-1.5 text-sm')
  const row = usePart('location-thing', 'flex items-center justify-between gap-2')
  const thingName = usePart('location-thing-name', 'flex-1')
  const pick = usePart('location-thing-pick', buttonVariants({ size: 'sm', variant: 'outline' }))
  // A game without the places plugin has nothing to show here.
  const location = places?.location
  if (!location) return null
  const things = places.things ?? []
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
                <button {...pick} disabled={Boolean(thing.pickUp.disabled)} title={thing.pickUp.disabled} onClick={() => places.pickUp(thing.ref)}>
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
 * Where the player is: the place's name and the line under it (its `description`), with its layered picture above them,
 * hotspots and all, and what lies there with a button to pick each up. The
 * exits are `Exits`. A thin default on `usePlaces`.
 */
export const LocationCard = overridable('LocationCard', LocationCardImpl)

function ExitsImpl({ className }: { className?: string }) {
  const places = usePlaces()
  const list = usePart('exits', cn(PROSE, 'flex flex-wrap gap-1.5'), className)
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

/**
 * The places plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: the `LocationCard` and the `Exits` in the story, before
 * the room's actions.
 */
export const placesUi: PluginUi = {
  id: 'places',
  layout: { room: [() => <LocationCard />, () => <Exits />] },
}
