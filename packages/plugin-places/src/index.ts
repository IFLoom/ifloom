/**
 * Places: locations with exits between them and things to do in them, travel,
 * and where the player is.
 *
 * The engine knows no places. This plugin keeps the player's location in its
 * own state, fills the screen with the room's description while no scene is
 * open (`stage`), offers the room's actions as buttons, and hands the UI the
 * exits. Locations are content — `data.places.locations` in a pack — so a mod
 * can add a room or change one.
 */
import {
  commandOf,
  definePlugin,
  holds,
  lockOn,
  lockedOut,
  say,
  renderAction,
  stageView,
  type ActionDef,
  type Blocked,
  type Block,
  type CommandRef,
  type Condition,
  type DefinedPlugin,
  type EffectRef,
  type Game,
  type GameState,
  type MediaStage,
  type PluginProblem,
  type RenderedChoice,
  type Reference,
  type StageView,
  type Transition,
  type TransitionName,
} from '@ifloom/engine'

/** A place, as content declares it in `data.places.locations`. */
export type LocationDef = {
  id: string
  name: string
  /** A word or two under the name: "Home", "Café". */
  tag: string
  /** Words the UI can style or filter places by: `['outdoors']`. The plugin gives them no meaning. */
  tags?: string[]
  /** The place it is inside: a room's building. `places/within` follows it. */
  parent?: string
  /** The places one step away. */
  exits: readonly string[]
  art: string
  /**
   * A layered picture with hotspots, drawn in place of `art` when the UI
   * supports it. A hotspot here sends a `command`; a place has no choices.
   */
  stage?: MediaStage
  /**
   * Travel here is refused while one of these holds, with its reason: a door
   * shut for the night, a gate shut until a quest is done. With `hide`, the
   * exit is left off the screen instead of greyed out.
   */
  blocked?: Blocked[]
  /** What the player reads here while no scene is open: prose blocks, as a data scene's body. */
  body: Block[]
  /** What there is to do here, offered as buttons. */
  actions?: ActionDef[]
  /**
   * What plays here while the player is here, by channel: `{ ambience: 'cafe.murmur' }`.
   * Null silences a channel. An open scene's audio and an `audio` effect's win over it.
   */
  audio?: Record<string, string | null>
  /**
   * How the room comes on screen and goes off while no scene is open:
   * `'fade'`, or `{ in: 'slide-left', ms: 400 }`. The game's
   * `transitions.default` if left out. See `view.transition`.
   */
  transition?: Transition | TransitionName
  /**
   * What happens on the doorstep, after the player walks in by an exit (not
   * after a `places/move`): someone catching you on the way in. Its effects
   * apply while `when` holds, or always with no `when`.
   */
  arrive?: Arrival
}

/** What happens as the player walks into a place: effects, while `when` holds. */
export type Arrival = { when?: Condition; effects: EffectRef[] }

export type PlacesOptions = {
  /** Where a new game starts. Nowhere — no place at all — if left out. */
  start?: string
}

/** The plugin's state: where the player is, or null. */
export type PlacesState = { at: string | null }

/**
 * One way out of the current place, as the UI draws it: a button like any
 * other (`RenderedChoice`), whose `label` is the place's name, `disabled` why
 * it can't be taken now, `warning` a plugin's soft refusal, and `price` what
 * going costs. Send `command` to take it. The rest describes where it leads.
 */
export type ExitView = RenderedChoice & {
  /** The place's line under its name. */
  tag: string
  /** The place's tags. */
  tags: string[]
  /** The place's picture. */
  art: string
}

/** What the UI reads at `view.plugins.places`. */
export type PlacesView = {
  /**
   * Where the player is; null when nowhere. `stage` is the place's stage as the
   * engine's `stageView` draws it, or null when it has none. Its hotspots are
   * left out while a scene is open or a lock holds everything, as the exits are.
   */
  location: { id: string; name: string; tag: string; tags: string[]; art: string; stage: StageView | null } | null
  /** The exits, in the order the place lists them; none while a scene is open or a lock holds everything. */
  exits: ExitView[]
}

const ID = 'places'

/** The game's locations: its packs' `data.places.locations`. */
export function locationsOf(game: Game): LocationDef[] {
  return (game.data?.[ID]?.locations ?? []) as unknown as LocationDef[]
}

/** The location with this id, if the game has it. */
export function locationById(game: Game, id: string | null | undefined): LocationDef | undefined {
  if (id === null || id === undefined) return undefined
  return locationsOf(game).find((location) => location.id === id)
}

/** Where the player is, read straight from the state: no game needed. */
export function where(state: GameState): string | null {
  return (state.plugins?.[ID]?.state as PlacesState | undefined)?.at ?? null
}

/** A reference to one of the game's locations. */
const location = (id: string): Reference => ({ entry: id, plugin: ID, list: 'locations', noun: 'location' })

/** One location or several, as a list: `location: 'cafe'` or `location: ['cafe', 'park']`. */
function ids(value: unknown): string[] {
  return (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(String)
}

/** Build the plugin. */
export function places(options: PlacesOptions = {}): DefinedPlugin<PlacesState, PlacesView> {
  const ancestors = (game: Game, id: string): string[] => {
    const out: string[] = []
    for (let at = locationById(game, id)?.parent; at && !out.includes(at); at = locationById(game, at)?.parent) out.push(at)
    return out
  }

  /** Why the player cannot go there now, or undefined. */
  function goBlocked(state: GameState, game: Game, at: string | null, to: string): string | undefined {
    if (state.sceneId) return say(game, 'finishFirst')
    const place = locationById(game, to)
    if (!place) return say(game, `${ID}/noSuchPlace`)
    if (to === at) return say(game, `${ID}/alreadyHere`)
    const blocked = place.blocked?.find((entry) => holds(state, entry.when, game))
    if (blocked) return blocked.reason
    if (at === null || !locationById(game, at)?.exits.includes(to)) return say(game, `${ID}/cannotGetThere`)
    return undefined
  }

  return definePlugin<PlacesState, PlacesView>({
    id: ID,
    version: 1,
    strings: {
      noSuchPlace: 'There is no such place.',
      alreadyHere: 'You are already here.',
      cannotGetThere: 'You cannot get there from here.',
    },
    start: () => ({ at: options.start ?? null }),
    conditions: {
      /** `{ 'places/at': { location: ['cafe', 'park'] } }`: the player is in one of these. */
      at: (_state, args, { slice }) => slice.at !== null && ids(args.location).includes(slice.at),
      /** `{ 'places/within': { location: 'office' } }`: the player is there, or somewhere inside it; with a list, any of them. */
      within: (_state, args, { slice, game }) => {
        if (slice.at === null) return false
        const around = [slice.at, ...ancestors(game, slice.at)]
        return ids(args.location).some((id) => around.includes(id))
      },
    },
    effects: {
      /** `{ 'places/move': { location: 'park' } }`: be somewhere else at once, closing any scene. No exit needed, and nothing on arrival. */
      move: (state, args, { set, game }) => {
        const to = ids(args.location)[0]
        if (!locationById(game, to)) return state
        return set({ at: to }, { ...state, sceneId: null })
      },
    },
    commands: {
      /** `{ 'places/go': { id } }`: walk through an exit to the place `id`, then its `arrive`. */
      go: {
        whyNot: (state, args, { slice, game }) => goBlocked(state, game, slice.at, ids(args.id)[0]),
        run: (_state, args, { set, apply, game }) => {
          const to = ids(args.id)[0]
          const arrived = set({ at: to })
          const arrive = locationById(game, to)?.arrive
          return arrive && holds(arrived, arrive.when, game) ? apply(arrive.effects, arrived) : arrived
        },
      },
    },
    queries: {
      here: (_state, _args, { slice }) => slice.at,
      all: (_state, _args, { game }) => locationsOf(game),
      known: (_state, args, { game }) => Boolean(locationById(game, ids(args.location)[0])),
      exits: (_state, _args, { slice, game }) => (locationById(game, slice.at)?.exits ?? []).filter((id) => locationById(game, id)),
    },
    values: {
      name: (_state, _args, { slice, game }) => locationById(game, slice.at)?.name ?? '',
      tag: (_state, _args, { slice, game }) => locationById(game, slice.at)?.tag ?? '',
    },
    label: (_state, { slice, game }) => locationById(game, slice.at)?.name,
    stage: (_state, { slice, game }) => {
      const place = locationById(game, slice.at)
      return place ? { id: place.id, title: place.name, body: place.body, ...(place.transition !== undefined ? { transition: place.transition } : {}) } : undefined
    },
    buttons: (_state, { slice, game }) => locationById(game, slice.at)?.actions,
    audio: (_state, { slice, game }) => locationById(game, slice.at)?.audio,
    view: (state, { slice, game, picks }): PlacesView => {
      const place = locationById(game, slice.at)
      const idle = !state.sceneId && !lockedOut(state, game)
      const exits: ExitView[] = []
      for (const id of idle && place ? place.exits : []) {
        const dest = locationById(game, id)
        if (!dest) continue
        const command = commandOf(go(id))
        if (lockOn(state, game, command)?.hide) continue
        if (dest.blocked?.some((entry) => entry.hide && holds(state, entry.when, game))) continue
        exits.push({ ...renderAction(state, game, { id, label: dest.name, command }), tag: dest.tag, tags: dest.tags ?? [], art: dest.art })
      }
      const stage = place ? stageView(state, game, place.stage, place.id, null, picks) : null
      return {
        location: place
          ? { id: place.id, name: place.name, tag: place.tag, tags: place.tags ?? [], art: place.art, stage: stage && !idle ? { ...stage, hotspots: [] } : stage }
          : null,
        exits,
      }
    },
    references: {
      // The places a call names: `places/at` and `places/within`, `places/move` and `places/go`.
      calls: (kind, name, args) => {
        const named = kind === 'conditions' ? (name === 'at' || name === 'within' ? ids(args.location) : []) : kind === 'effects' ? (name === 'move' ? ids(args.location) : []) : name === 'go' ? ids(args.id) : []
        return named.map(location)
      },
      content: (game) => [
        ...(options.start !== undefined ? [{ list: 'options', id: 'start', refs: [location(options.start)] }] : []),
        ...locationsOf(game).map((place) => ({
          list: 'locations',
          id: place.id,
          refs: [
            { blocks: place.body },
            // Its prose can hold its own actions and the game's inline: `[[act:id]]`.
            { actionsIn: place.body, offers: [...(place.actions ?? []), ...(game.actions ?? [])].map((action) => action.id) },
            { within: 'audio', refs: Object.entries(place.audio ?? {}).map(([channel, track]) => ({ channel, track })) },
            // A place's `art` isn't a file to look for: no UI draws it, so many games have none.
            { stage: place.stage, choices: null },
            { transition: place.transition },
            ...(place.blocked ?? []).map((entry) => ({ when: entry.when })),
            ...(place.arrive ? [{ within: 'arrive', refs: [{ when: place.arrive.when }, { effects: place.arrive.effects }] }] : []),
            ...(place.actions ?? []).map((action) => ({
              within: `action ${action.id}`,
              refs: [{ when: action.when }, ...(action.blocked ?? []).map((entry) => ({ when: entry.when })), { command: action.command }],
            })),
          ],
        })),
      ],
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      const say = (id: string, what: string) => problems.push({ list: 'locations', id, what })
      for (const place of locationsOf(game)) {
        for (const exit of place.exits) if (!locationById(game, exit)) say(place.id, `exit to unknown location "${exit}"`)
        if (place.parent !== undefined) {
          if (!locationById(game, place.parent)) say(place.id, `inside unknown location "${place.parent}"`)
          else if (ancestors(game, place.id).includes(place.id)) say(place.id, 'is inside itself')
        }
      }
      return problems
    },
  })
}

/** The command that walks to a place by an exit. */
export const go = (id: string): CommandRef => ({ [`${ID}/go`]: { id } })
/** True in any of these places. */
export const at = (...places: string[]): Condition => ({ [`${ID}/at`]: { location: places } })
/** True in any of these places, or anywhere inside one. */
export const within = (...places: string[]): Condition => ({ [`${ID}/within`]: { location: places } })
/** The effect that puts the player somewhere at once. */
export const moveTo = (place: string): EffectRef => ({ [`${ID}/move`]: { location: place } })
/** A `blocked` entry: refused anywhere but these places. Its reason is plain text, "Not here." if left out. */
export const onlyAt = (places: string[], reason?: string): Blocked => ({ when: { not: at(...places) }, reason: reason ?? 'Not here.' })
