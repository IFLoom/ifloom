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
  definePlugin,
  holds,
  lockOn,
  lockedOut,
  say,
  warningOf,
  whyNot,
  type ActionDef,
  type Block,
  type Command,
  type Condition,
  type DefinedPlugin,
  type EffectRef,
  type Game,
  type GameState,
  type PluginArgs,
  type PluginProblem,
  type Requirement,
} from '@ifloom/engine'

export type LocationKind = 'street' | 'venue' | 'room'

/** A place, as content declares it in `data.places.locations`. */
export type LocationDef = {
  id: string
  name: string
  /** A word or two under the name: "Home", "Café". */
  tag: string
  kind: LocationKind
  /** The place it is inside: a room's building. `places/within` follows it. */
  parent?: string
  /** The places one step away. */
  exits: readonly string[]
  art: string
  /**
   * Travel here is refused while one of these holds, with its reason: a door
   * shut for the night, a gate locked until a quest is done. With `hide`, the
   * exit is left off the screen instead of greyed out.
   */
  locked?: { when: Condition; reason: string; hide?: boolean }[]
  /** What the player reads here while no scene is open: prose blocks, as a data scene's body. */
  body: Block[]
  /** What there is to do here, offered as buttons. */
  actions?: ActionDef[]
  /**
   * What plays here while the player is here, by channel: `{ ambience: 'cafe.murmur' }`.
   * Null silences a channel. An open scene's audio and an `audio` effect's win over it.
   */
  audio?: Record<string, string | null>
}

export type PlacesOptions = {
  /** Where a new game starts. Nowhere — no place at all — if left out. */
  start?: string
  /** What happens on the doorstep, after travel by exit (not a `move`): someone catching you on the way in. */
  arrive?: (state: GameState, game: Game) => GameState
}

/** The plugin's state: where the player is, or null. */
export type PlacesState = { at: string | null }

/** One way out of the current place, as the UI draws it. Send `command` to take it. */
export type ExitView = {
  id: string
  name: string
  tag: string
  kind: LocationKind
  art: string
  /** Why it cannot be taken now, if it cannot. */
  disabled?: string
  /** Pressable, but a plugin warns against it; the reducer refuses it. */
  warning?: string
  command: Command
}

/** What the UI reads at `view.plugins.places`. */
export type PlacesView = {
  /** Where the player is; null when nowhere. */
  location: { id: string; name: string; tag: string; kind: LocationKind; art: string } | null
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

/** A list from arguments: `{ 'places/at': ['cafe'] }` arrives as `{ value: ['cafe'] }`. */
function ids(args: PluginArgs): string[] {
  const value = args.value ?? args.at ?? args.to ?? args.id
  return (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(String)
}

/** Build the plugin. */
export function places(options: PlacesOptions = {}): DefinedPlugin<PlacesState> {
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
    const locked = place.locked?.find((entry) => holds(state, entry.when, game))
    if (locked) return locked.reason
    if (at === null || !locationById(game, at)?.exits.includes(to)) return say(game, `${ID}/cannotGetThere`)
    return undefined
  }

  return definePlugin<PlacesState>({
    id: ID,
    version: 1,
    strings: {
      noSuchPlace: 'There is no such place.',
      alreadyHere: 'You are already here.',
      cannotGetThere: 'You cannot get there from here.',
    },
    start: () => ({ at: options.start ?? null }),
    conditions: {
      /** `{ 'places/at': ['cafe', 'park'] }`: the player is in one of these. */
      at: (_state, args, { slice }) => slice.at !== null && ids(args).includes(slice.at),
      /** `{ 'places/within': 'office' }`: the player is there, or somewhere inside it; with a list, any of them. */
      within: (_state, args, { slice, game }) => {
        if (slice.at === null) return false
        const around = [slice.at, ...ancestors(game, slice.at)]
        return ids(args).some((id) => around.includes(id))
      },
    },
    effects: {
      /** `{ 'places/move': 'park' }`: be somewhere else at once, closing any scene. No exit needed, and nothing on arrival. */
      move: (state, args, { set, game }) => {
        const to = ids(args)[0]
        if (!locationById(game, to)) return state
        return set({ at: to }, { ...state, sceneId: null })
      },
    },
    commands: {
      /** `{ type: 'custom', name: 'places/go', with: { to } }`: walk through an exit. */
      go: {
        whyNot: (state, args, { slice, game }) => goBlocked(state, game, slice.at, ids(args)[0]),
        run: (_state, args, { set, game }) => {
          const arrived = set({ at: ids(args)[0] })
          return options.arrive ? options.arrive(arrived, game) : arrived
        },
      },
    },
    queries: {
      here: (_state, _args, { slice }) => slice.at,
      all: (_state, _args, { game }) => locationsOf(game),
      known: (_state, args, { game }) => Boolean(locationById(game, ids(args)[0])),
      exits: (_state, _args, { slice, game }) => (locationById(game, slice.at)?.exits ?? []).filter((id) => locationById(game, id)),
    },
    values: {
      name: (_state, { slice, game }) => locationById(game, slice.at)?.name ?? '',
      tag: (_state, { slice, game }) => locationById(game, slice.at)?.tag ?? '',
    },
    label: (_state, { slice, game }) => locationById(game, slice.at)?.name,
    stage: (_state, { slice, game }) => {
      const place = locationById(game, slice.at)
      return place ? { id: place.id, title: place.name, body: place.body } : undefined
    },
    buttons: (_state, { slice, game }) => locationById(game, slice.at)?.actions,
    audio: (_state, { slice, game }) => locationById(game, slice.at)?.audio,
    view: (state, { slice, game }): PlacesView => {
      const place = locationById(game, slice.at)
      const idle = !state.sceneId && !lockedOut(state, game)
      const exits: ExitView[] = []
      for (const id of idle && place ? place.exits : []) {
        const dest = locationById(game, id)
        if (!dest) continue
        const command = go(id)
        if (lockOn(state, game, command)?.hide) continue
        if (dest.locked?.some((entry) => entry.hide && holds(state, entry.when, game))) continue
        const exit: ExitView = { id, name: dest.name, tag: dest.tag, kind: dest.kind, art: dest.art, command }
        const disabled = whyNot(state, game, command)
        if (disabled) exit.disabled = disabled
        const warning = warningOf(state, game, command)
        if (warning) exit.warning = warning
        exits.push(exit)
      }
      return {
        location: place ? { id: place.id, name: place.name, tag: place.tag, kind: place.kind, art: place.art } : null,
        exits,
      }
    },
    argProblems: (kind, name, args, game) => {
      const named = kind === 'conditions' ? (name === 'at' || name === 'within' ? ids(args) : []) : kind === 'effects' ? (name === 'move' ? ids(args) : []) : name === 'go' ? ids(args) : []
      return named.filter((id) => !locationById(game, id)).map((id) => `unknown location "${id}"`)
    },
    check: (game, { conditionProblems, blockProblems, commandProblems, audioProblems }) => {
      const problems: PluginProblem[] = []
      const say = (id: string, what: string) => problems.push({ list: 'locations', id, what })
      if (options.start !== undefined && !locationById(game, options.start)) problems.push({ list: 'options', id: 'start', what: `unknown location "${options.start}"` })
      for (const place of locationsOf(game)) {
        for (const exit of place.exits) if (!locationById(game, exit)) say(place.id, `exit to unknown location "${exit}"`)
        if (place.parent !== undefined) {
          if (!locationById(game, place.parent)) say(place.id, `inside unknown location "${place.parent}"`)
          else if (ancestors(game, place.id).includes(place.id)) say(place.id, 'is inside itself')
        }
        for (const what of blockProblems(place.body)) say(place.id, what)
        for (const what of audioProblems(place.audio)) say(place.id, `audio: ${what}`)
        for (const entry of place.locked ?? []) for (const what of conditionProblems(entry.when)) say(place.id, what)
        for (const action of place.actions ?? []) {
          for (const what of [
            ...conditionProblems(action.when),
            ...(action.blocked ?? []).flatMap((entry) => conditionProblems(entry.when)),
            ...commandProblems(action.command),
          ]) say(place.id, `action ${action.id}: ${what}`)
        }
      }
      return problems
    },
  })
}

/** The command that walks to a place by an exit. */
export const go = (to: string): Command => ({ type: 'custom', name: `${ID}/go`, with: { to } })
/** True in any of these places. */
export const at = (...places: string[]): Condition => ({ [`${ID}/at`]: places })
/** True in any of these places, or anywhere inside one. */
export const within = (...places: string[]): Condition => ({ [`${ID}/within`]: places })
/** The effect that puts the player somewhere at once. */
export const moveTo = (place: string): EffectRef => ({ [`${ID}/move`]: place })
/** A requirement: only in these places. Its reason is plain text, "Not here." if left out. */
export const onlyAt = (places: string[], reason?: string): Requirement => ({ when: at(...places), reason: reason ?? 'Not here.' })
