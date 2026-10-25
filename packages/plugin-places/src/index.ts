/**
 * Places: locations with exits between them and things to do in them, travel,
 * and where the player is.
 *
 * The engine knows no places. This plugin keeps the player's location in its
 * own state, fills the screen with the room's description while no scene is
 * open (`stage`), offers the room's actions as buttons, and hands the UI the
 * exits. Locations are content — `data.places.locations` in a pack — so a mod
 * can add a room or change one.
 *
 * Each location is also a unique entity of the kind `location`, so it holds
 * things: what lies there, shown in the view with a button to pick it up. The
 * `places/holder` query names where the player is as that entity, so another
 * plugin (the inventory's drop) can put something down there by name.
 */
import {
  actionReferences,
  artSrc,
  bindCurrent,
  commandOf,
  definePlugin,
  entityImage,
  entityName,
  entityOf,
  heldBy,
  heldCount,
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
  type Effect,
  type EffectRef,
  type EntityRef,
  type Game,
  type GameState,
  type MediaStage,
  type PluginProblem,
  type RenderedChoice,
  type Reference,
  type StageView,
  type SceneUi,
  type Ui,
  YOU,
} from '@ifloom/engine'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

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
   * Presentation hints for the room while no scene is open, carried to
   * `view.scene.ui` as a scene's are: the React UI's `{ transition: 'slide-left' }`.
   * The engine gives them no meaning.
   */
  ui?: Ui<SceneUi>
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

/** A thing lying where the player is, as the UI draws it. */
export type LyingView = {
  /** How content names it: `'item:paper'`. */
  ref: EntityRef
  name: string
  /** Its picture's path, through `artSrc`; null with none. */
  image: string | null
  /** How many lie here. */
  count: number
  /** The button that picks one up. Send its `command`. */
  pickUp: RenderedChoice
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
  /** What lies here, held by the place's entity: a thing the player dropped, say. None while a scene is open or a lock holds everything. */
  things: LyingView[]
}

const ID = 'places'

/** The kind each location is as an entity, so it can hold things: `'location:park'`. */
export const LOCATION = 'location'

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

/** A location's entity, which holds what lies there: `location('park')` is `'location:park'`. */
export const location = (id: string): EntityRef => `${LOCATION}:${id}`

/** A reference to one of the game's locations. */
const locationEntry = (id: string): Reference => ({ entry: id, plugin: ID, list: 'locations', noun: 'location' })

/** One location or several, as a list: `location: 'cafe'` or `location: ['cafe', 'park']`. */
function ids(value: unknown): string[] {
  return (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(String)
}

/** What lies in a place that the player can see: what its entity holds, but things whose `visible` doesn't hold. */
function lyingIn(state: GameState, game: Game, at: string): { ref: EntityRef; count: number }[] {
  return heldBy(state, game, location(at)).filter(({ ref }) =>
    holds(state, bindCurrent(game.entities?.find((entity) => `${entity.of}:${entity.id}` === ref)?.visible, ref), game),
  )
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

  /** Why the player can't pick this up now, or undefined. */
  function pickUpBlocked(state: GameState, game: Game, at: string | null, ref: EntityRef): string | undefined {
    if (state.sceneId) return say(game, 'finishFirst')
    if (!entityOf(state, game, ref)) return say(game, 'noSuchThing')
    if (at === null || heldCount(state, game, ref, location(at)) <= 0) return say(game, `${ID}/notLyingHere`, { thing: entityName(state, game, ref) })
    return undefined
  }
  /** Picking one up: from the place to whoever the player is playing. */
  const pickUpEffects = (at: string | null, ref: EntityRef): Effect[] => (at === null ? [] : [{ move: ref, from: location(at), to: YOU, by: 1 }])

  return definePlugin<PlacesState, PlacesView>({
    id: ID,
    version: 1,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    commandVersion: COMMAND_VERSION,
    commandMigrations,
    strings: {
      noSuchPlace: 'There is no such place.',
      alreadyHere: 'You are already here.',
      cannotGetThere: 'You cannot get there from here.',
      pickUp: 'Pick up',
      notLyingHere: 'There is no {thing} here.',
    },
    // Each location is a unique entity, so it can hold things: what lies there. Not listed: the places are the plugin's to show.
    content: { kinds: [{ id: LOCATION, label: 'Place', plural: 'Places', unique: true, listed: false }] },
    entities: (game) =>
      locationsOf(game).map((def) => ({
        id: def.id,
        of: LOCATION,
        name: def.name,
        ...(def.tag ? { desc: def.tag } : {}),
        ...(def.tags?.length ? { tags: def.tags } : {}),
      })),
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
      /** `{ 'places/pickUp': { id } }`: pick up one of the thing `id` lying where the player is, for whoever they are playing. */
      pickUp: {
        whyNot: (state, args, { slice, game }) => pickUpBlocked(state, game, slice.at, String(args.id ?? '')),
        effectsOf: (_state, args, { slice }) => pickUpEffects(slice.at, String(args.id ?? '')),
        run: (state, args, { slice, apply }) => apply(pickUpEffects(slice.at, String(args.id ?? '')), state),
      },
    },
    queries: {
      here: (_state, _args, { slice }) => slice.at,
      /** The entity of where the player is, which holds what is put down there (`'location:park'`); null when nowhere. */
      holder: (_state, _args, { slice, game }) => (slice.at !== null && locationById(game, slice.at) ? location(slice.at) : null),
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
      return place ? { id: place.id, title: place.name, body: place.body, ...(place.ui !== undefined ? { ui: place.ui } : {}) } : undefined
    },
    buttons: (_state, { slice, game }) => locationById(game, slice.at)?.actions,
    audio: (_state, { slice, game }) => locationById(game, slice.at)?.audio,
    view: (state, { slice, game, picks }): PlacesView => {
      const here = locationById(game, slice.at)
      const idle = !state.sceneId && !lockedOut(state, game)
      const exits: ExitView[] = []
      for (const id of idle && here ? here.exits : []) {
        const dest = locationById(game, id)
        if (!dest) continue
        const command = commandOf(go(id))
        if (lockOn(state, game, command)?.hide) continue
        if (dest.blocked?.some((entry) => entry.hide && holds(state, entry.when, game))) continue
        exits.push({ ...renderAction(state, game, { id, label: dest.name, command }), tag: dest.tag, tags: dest.tags ?? [], art: dest.art })
      }
      const stage = here ? stageView(state, game, here.stage, here.id, null, picks) : null
      const things: LyingView[] = (idle && here ? lyingIn(state, game, here.id) : []).map(({ ref, count }) => {
        const image = entityImage(state, game, ref)
        return {
          ref,
          name: entityName(state, game, ref),
          image: image === undefined ? null : artSrc(image),
          count,
          pickUp: renderAction(state, game, { id: `pickUp.${ref}`, label: say(game, `${ID}/pickUp`), command: pickUp(ref) }),
        }
      })
      return {
        location: here
          ? {
              id: here.id,
              name: here.name,
              tag: here.tag,
              tags: here.tags ?? [],
              art: here.art,
              stage: stage && !idle ? { ...stage, hotspots: [] } : stage,
            }
          : null,
        exits,
        things,
      }
    },
    references: {
      // The places a call names: `places/at` and `places/within`, `places/move` and `places/go`; the thing `places/pickUp` names.
      calls: (table, name, args) => {
        if (table === 'commands' && name === 'pickUp') return args.id === undefined ? [] : [{ entity: String(args.id) }]
        const named =
          table === 'conditions'
            ? name === 'at' || name === 'within'
              ? ids(args.location)
              : []
            : table === 'effects'
              ? name === 'move'
                ? ids(args.location)
                : []
              : name === 'go'
                ? ids(args.id)
                : []
        return named.map(locationEntry)
      },
      content: (game) => [
        ...(options.start !== undefined ? [{ list: 'options', id: 'start', refs: [locationEntry(options.start)] }] : []),
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
            { ui: place.ui },
            ...(place.blocked ?? []).map((entry) => ({ when: entry.when })),
            ...(place.arrive ? [{ within: 'arrive', refs: [{ when: place.arrive.when }, { effects: place.arrive.effects }] }] : []),
            ...(place.actions ?? []).map((action) => ({ within: `action ${action.id}`, refs: actionReferences(action) })),
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

/** The command that picks up one of a thing lying where the player is. */
export const pickUp = (ref: EntityRef): CommandRef => ({ [`${ID}/pickUp`]: { id: ref } })
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
