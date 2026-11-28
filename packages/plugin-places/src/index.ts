/**
 * The places plugin, which adds locations with exits and actions, travel between them, and where the player is.
 *
 * The plugin keeps the player's location in its own state. While no scene is open, its room shows the location's
 * body and actions, and its view lists the exits. A location is an entity with the `places/location` trait, written
 * with `places.location({ ... })` in content's `entities`. Its name, `description` and `image` are the entity's, and
 * its exits, body and actions are the trait's, so a mod adds or changes a location as it does any entity.
 *
 * The plugin brings the unique kind `location`. It keeps the things lying in each location in its own state, starting
 * them with the `places/lies` trait, and the view lists those where the player is with a button to pick each up.
 * Picking one up runs `receive` (ADR 0016), so whichever plugin keeps things takes it, then its `onPickUp`. A thing
 * whose `when` doesn't hold yet lies hidden until it does, and its `onFind` runs the first time it's found. The
 * `places/put` effect puts a thing down where the player is, as the inventory's drop does.
 */
import {
  artSrc,
  buildEffects,
  commandOf,
  declaredTrait,
  declaredWithTrait,
  entityDescription,
  entityImage,
  entityName,
  entityOf,
  entityTags,
  holds,
  pluginQuery,
  reasonOf,
  stringOf,
  type ActionDef,
  type Blocked,
  type Reason,
  type Block,
  type CommandRef,
  type Condition,
  type Effect,
  type EffectRef,
  type EntityDef,
  type EntityRef,
  type Game,
  type GameState,
  type PictureDef,
  type RenderedChoice,
  type PictureView,
  type SceneUi,
  type Ui,
} from '@ifloom/engine'
import {
  actionReferences,
  arg,
  bindCurrent,
  defineCalls,
  defineTraitKind,
  definePlugin,
  everyEntity,
  hasEntity,
  lockOn,
  lockedOut,
  renderAction,
  pictureView,
  type CommandsOf,
  type ConditionsOf,
  type EffectsOf,
  type DefinedPlugin,
  type Reference,
  type TraitDef,
} from '@ifloom/engine/plugin'

/**
 * The data of the `places/location` trait, which makes an entity a location the player can be at. The location's
 * name, `description`, `image` and `tags` are the entity's.
 */
export type Place = {
  /** The id of the location this one is inside, such as the building a shop is in. `places/within` follows it. */
  parent?: string
  /** The ids of the locations one step away. */
  exits: readonly string[]
  /**
   * The location's layered picture with hotspots, rendered with the room. A hotspot here sends a `command`, since a
   * location has no choices.
   */
  picture?: PictureDef
  /**
   * The reasons travel here is refused, such as a door shut for the night. With `hide`, the exit is left out of the
   * view instead of disabled.
   */
  blocked?: Blocked[]
  /** The location's body, the blocks the player reads here while no scene is open. */
  body: Block[]
  /** The location's actions, offered as buttons in the room. */
  actions?: ActionDef[]
  /**
   * The audio that plays while the player is here, by channel, such as `{ ambience: 'cafe.murmur' }`. Null silences a
   * channel, and an open scene's audio and an `audio` effect's override it.
   */
  audio?: Record<string, string | null>
  /**
   * The room's presentation hints while no scene is open, carried to `view.scene.ui` as a scene's are, such as the
   * React UI's `{ transition: 'slide-left' }`. The engine gives them no meaning.
   */
  ui?: Ui<SceneUi>
  /**
   * The effects that run after the player walks in by an exit, such as someone catching them on the way in. A
   * `places/move` doesn't run them.
   */
  arrive?: Arrival
}

/**
 * The data of the `places/lies` trait, which starts a thing lying in a location.
 *
 * It's the location's id, or the full form with a condition to find it and effects.
 */
export type Lies =
  | string
  | {
      /** The location the thing lies in, by id (`'kitchen'`) or reference. */
      at: string
      /** How many lie there. 1 if left out. */
      count?: number
      /**
       * The condition, with `'$'` as the thing, that must hold before the player can see it or pick it up, such as
       * `{ stat: 'perception', gte: 5 }`. Once found, it stays found. Always in sight if left out.
       */
      when?: Condition
      /** The effects that run once, the first time the player is there while `when` holds. Only with `when`. */
      onFind?: EffectRef[]
      /** The effects that run each time the player picks one up, after it's received, before the game-wide `onPickUp`. */
      onPickUp?: EffectRef[]
    }

declare module '@ifloom/engine' {
  interface TraitRegistry {
    'places/location': Place
    'places/lies': Lies
  }
}

/**
 * A location the game declares in `entities` with `places.location()`. It has an entity's fields and the
 * `places/location` trait's side by side, and its `ui` is the trait's room hints.
 */
export type PlaceDef = Omit<EntityDef, 'of' | 'ui'> &
  Place & {
    /** The location's kind. The plugin's own kind, `location`, if left out. */
    of?: string
  }

/** The effects that run as the player walks into a location by an exit, in a {@link Place}'s `arrive`. */
export type Arrival = {
  /** The condition that must hold for the effects to run. They always run if left out. */
  when?: Condition
  /** The effects that run on arrival. */
  effects: EffectRef[]
}

/** Settings for `places()`. */
export type PlacesOptions = {
  /** The id of the location a new game starts at. The player is at no location if left out. */
  start?: string
  /** The effects that run each time the player picks anything up, after the thing's own `onPickUp`, with `'$'` as the thing. */
  onPickUp?: EffectRef[]
}

/** The location a save keeps for the player. The plugin reads the locations from content. */
export type PlacesState = {
  /** The id of the location the player is at, its full reference for a location of another kind, or null when at none. */
  at: string | null
  /**
   * The counts of things lying in each location that play changed, by location id and then thing.
   *
   * A count stays once written, 0 included. For a count play hasn't changed, the plugin reads the thing's `places/lies`.
   */
  floor: Record<string, Record<string, number>>
  /** The things with a `when` the player has found, by reference. */
  found: string[]
}

/**
 * An exit from the location the player is at as the player sees it, in `view.plugins.places.exits`. It is a
 * `RenderedChoice` labelled with the destination's name, so its `command` takes the exit.
 *
 * Its `disabled` gives the reason the exit is refused, `warning` a plugin's soft refusal and `price` the cost of
 * going. The other fields describe the destination.
 */
export type ExitView = RenderedChoice & {
  /** The destination's entity reference, such as `'location:park'`. */
  ref: EntityRef
  /** The destination's `description`, the line under its name, or null when it has none. */
  description: string | null
  /** The destination's tags. */
  tags: string[]
  /** The path of the destination's picture, its `image` through `artSrc`, or null when it has none. */
  image: string | null
}

/** A thing lying at the location the player is at as the player sees it, in `view.plugins.places.things`. */
export type LyingView = {
  /** The thing's entity reference, such as `'note:paper'`. */
  ref: EntityRef
  /** The thing's name. */
  name: string
  /** The path of the thing's picture through `artSrc`, or null when it has none. */
  image: string | null
  /** The number of this thing lying here. */
  count: number
  /** The button that picks one up. Its `command` is the one to send. */
  pickUp: RenderedChoice
}

/** The location the player is at as the player sees it, in `view.plugins.places.location`. */
export type PlaceView = {
  /** The location's id, as `places.go` names it. */
  id: string
  /** The location's entity reference, such as `'location:park'`. */
  ref: EntityRef
  /** The location's name. */
  name: string
  /** The location's `description`, the line under its name, or null when it has none. */
  description: string | null
  /** The location's tags, which a UI can style it by. */
  tags: string[]
  /** The path of the location's picture, its `image` through `artSrc`, or null when it has none. */
  image: string | null
  /**
   * The location's layered picture, rendered by the engine's `pictureView`, or null when it has none. Its hotspots are
   * left out while a scene is open or a lock holds everything, as the exits are.
   */
  picture: PictureView | null
}

/** The player's location, its exits and the things lying there as the player sees them, in `view.plugins.places`. */
export type PlacesView = {
  /** The location the player is at, or null when at none. */
  location: PlaceView | null
  /** The location's exits in the order it lists them. It is empty while a scene is open or a lock holds everything. */
  exits: ExitView[]
  /** The things lying in the location that the player can see, such as a thing they dropped. It is empty while a scene is open or a lock holds everything. */
  things: LyingView[]
}

const ID = 'places'

/** The id of the kind the plugin brings for its locations, `location`, as in `'location:park'`. The kind is unique: each location is one place. */
export const LOCATION = 'location'

/** The places: entities carrying the `places/location` trait, a bare id naming one of the `location` kind. */
const PLACES = defineTraitKind({
  kind: LOCATION,
  trait: 'places/location',
  fields: { parent: true, exits: true, picture: true, blocked: true, body: true, actions: true, audio: true, ui: true, arrive: true },
})
const TRAIT = PLACES.trait

/**
 * Returns the entity reference of a location, for `at` and `entity`. A bare id is one of the plugin's kind
 * (`places.locationRef('park')` is `'location:park'`), and a full reference comes back unchanged.
 */
const locationRef = (id: string): EntityRef => PLACES.ref(id)

/** A place by id or reference, `'park'` or `'location:park'`, named to the checker. */
const place = () => PLACES.arg()
/** One place or several, `'park'` or `['cafe', 'park']`. */
const placeList = () => PLACES.args()

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** The player is in one of these. */
    at: { location: placeList() },
    /** The player is in one of these, or somewhere inside one. */
    within: { location: placeList() },
    /** The player is in none of these, or nowhere. False in a game without places, so what it refuses isn't refused there. */
    away: { location: placeList() },
  },
  effects: {
    /** Be somewhere else at once. */
    move: { location: place() },
    /** Put `by` of the thing `entity` (1 if left out; below 0 takes them away) down `at` a location, where the player is if left out. */
    put: { entity: arg.entity(), at: place().optional(), by: arg.number().optional() },
  },
  commands: {
    /** Walk through an exit to the place `id`. */
    go: { id: place() },
    /** Pick up one of the thing `id` lying where the player is. */
    pickUp: { id: arg.entity() },
  },
})

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface QueryRegistry {
    /** Returns the id of the location the player is at, or null when they are at none. */
    'places/here': () => string | null
    /** Returns true when the game has the location. */
    'places/known': (args: { location: string }) => boolean
    'places/all': () => (Place & { id: string; ref: EntityRef })[]
    'places/exits': () => string[]
  }
  interface ViewRegistry {
    places: PlacesView
  }
}

/** How the plugin names a place back: its id for one of its kind, else the whole reference. */
const short = (ref: EntityRef): string => PLACES.id(ref)

/**
 * Returns the references of every location in the game now, each entity with the `places/location` trait. Those
 * content declares come first in its order, then those made in play.
 */
export function locationsOf(state: GameState, game: Game): EntityRef[] {
  return PLACES.all(state, game)
}

/**
 * Returns the `places/location` trait of a location, named by its id (`'park'`) or reference, read through the
 * entity it was made `like`. Returns undefined for anything that isn't a location.
 */
export function locationOf(state: GameState, game: Game, ref: string | null | undefined): Place | undefined {
  return PLACES.get(state, game, ref)
}

/** A place content declares, by id or reference, for a check, which has no state. */
const declaredLocation = (game: Game, id: string): Place | undefined => PLACES.declaredGet(game, id)

/** A place as the plugin keeps it: `'park'` and `'location:park'` are both `'park'`. */
const placeId = (id: string): string => short(locationRef(id))

const LIES = 'places/lies'

/** A `places/lies` in its full form. */
function liesOf(data: Lies | undefined): Exclude<Lies, string> | undefined {
  if (data === undefined || data === null) return undefined
  return typeof data === 'string' ? { at: data } : data
}

/** The plugin's state in this save, or nobody anywhere when the game has just started without one. */
function sliceOf(state: GameState): PlacesState {
  const slice = state.plugins?.[ID]?.state as Partial<PlacesState> | undefined
  return { at: slice?.at ?? null, floor: slice?.floor ?? {}, found: slice?.found ?? [] }
}

const startsCache = new WeakMap<Game, Map<string, Map<string, number>>>()

/** What content starts lying where, by location id and then thing, from each declared entity's `places/lies`. */
function floorStarts(game: Game): Map<string, Map<string, number>> {
  let found = startsCache.get(game)
  if (!found) {
    found = new Map()
    for (const ref of declaredWithTrait(game, LIES)) {
      const lies = liesOf(declaredTrait(game, ref, LIES) as Lies | undefined)
      if (!lies || typeof lies.at !== 'string') continue
      const at = placeId(lies.at)
      const into = found.get(at) ?? new Map<string, number>()
      into.set(ref, lies.count ?? 1)
      found.set(at, into)
    }
    startsCache.set(game, found)
  }
  return found
}

/** Returns how many of a thing lie in a location now, whether or not the player can see them. */
export function lyingCount(state: GameState, game: Game, ref: string, at: string): number {
  const id = placeId(at)
  if (!hasEntity(state, game, ref)) return 0
  const written = sliceOf(state).floor[id]?.[ref]
  return Math.max(0, written ?? floorStarts(game).get(id)?.get(ref) ?? 0)
}

/** The state with a location's count of a thing written, 0 included. */
function withLying(state: GameState, ref: string, at: string, count: number): GameState {
  const slice = sliceOf(state)
  const id = placeId(at)
  const next: PlacesState = { ...slice, floor: { ...slice.floor, [id]: { ...slice.floor[id], [ref]: Math.max(0, Math.floor(count)) } } }
  return { ...state, plugins: { ...state.plugins, [ID]: { version: state.plugins?.[ID]?.version ?? 1, state: next } } }
}

/** Whether the player can see a thing lying in a location: it has no `when`, it was found, or its `when` holds there now. */
function inSight(state: GameState, game: Game, ref: EntityRef): boolean {
  const lies = liesOf(declaredTrait(game, ref, LIES) as Lies | undefined)
  if (!lies?.when || sliceOf(state).found.includes(ref)) return true
  return holds(state, game, bindCurrent(lies.when, ref))
}

/** What lies in a place that the player can see: neither hidden by its `when` nor by its `visible`. */
function lyingIn(state: GameState, game: Game, at: string): { ref: EntityRef; count: number }[] {
  return everyEntity(state, game)
    .map((ref) => ({ ref, count: lyingCount(state, game, ref, at) }))
    .filter(
      ({ ref, count }) =>
        count > 0 &&
        inSight(state, game, ref) &&
        holds(state, game, bindCurrent(game.entities?.find((entity) => `${entity.of}:${entity.id}` === ref)?.visible, ref)),
    )
}

/** An entity's picture's path, through `artSrc`, or null with none. */
function pictureOf(state: GameState, game: Game, ref: EntityRef): string | null {
  const image = entityImage(state, game, ref)
  return image === undefined ? null : artSrc(image)
}

/** The places this one is inside, nearest first, as far as they go without looping, each read with `place`. */
function ancestors(place: (id: string) => Place | undefined, id: string): string[] {
  const out: string[] = []
  for (let at = place(id)?.parent; at && !out.includes(at); at = place(at)?.parent) out.push(at)
  return out
}

/** Returns the places plugin for the game's `plugins`. `options.start` names the location a new game starts at. */
function placesPlugin(options: PlacesOptions = {}): DefinedPlugin<PlacesState, PlacesView> {
  /** Why the player cannot go there now, or undefined. */
  function goBlocked(state: GameState, game: Game, at: string | null, to: string): string | undefined {
    if (state.sceneId) return stringOf(game, 'finishFirst')
    const place = locationOf(state, game, to)
    if (!place) return stringOf(game, `${ID}/noSuchPlace`)
    if (to === at) return stringOf(game, `${ID}/alreadyHere`)
    const blocked = place.blocked?.find((entry) => holds(state, game, entry.when))
    if (blocked) return reasonOf(game, blocked.reason)
    if (at === null || !(locationOf(state, game, at)?.exits ?? []).map(placeId).includes(to)) return stringOf(game, `${ID}/cannotGetThere`)
    return undefined
  }

  /** Why the player can't pick this up now, or undefined. */
  function pickUpBlocked(state: GameState, game: Game, at: string | null, ref: string): string | undefined {
    if (state.sceneId) return stringOf(game, 'finishFirst')
    if (!entityOf(state, game, ref)) return stringOf(game, 'noSuchThing')
    if (at === null || lyingCount(state, game, ref, at) <= 0 || !inSight(state, game, ref as EntityRef))
      return stringOf(game, `${ID}/notLyingHere`, { thing: entityName(state, game, ref) })
    return undefined
  }
  /** Picking one up: it leaves the floor, whichever plugin keeps things receives it, then the thing's and the game's `onPickUp`. */
  const pickUpEffects = (game: Game, at: string | null, ref: EntityRef): Effect[] => {
    if (at === null) return []
    const own = liesOf(declaredTrait(game, ref, LIES) as Lies | undefined)?.onPickUp ?? []
    return buildEffects(game, [
      CALLS.effects.put({ entity: ref, at, by: -1 }),
      { receive: ref },
      ...bindCurrent(own, ref),
      ...bindCurrent(options.onPickUp ?? [], ref),
    ])
  }

  /** Where a thing starts lying: a known location, a count above 0, and a `when` and effects checked with `'$'` as the thing. */
  const liesTrait: TraitDef<'places/lies'> = {
    id: LIES,
    words: { onFind: 'effects', onPickUp: 'effects' },
    check: (data, { game }) => {
      const lies = liesOf(data as Lies)
      if (!lies || typeof lies.at !== 'string') return ['a lying thing needs the location it lies in: places.lies("kitchen")']
      const problems: string[] = []
      if (!declaredLocation(game, lies.at)) problems.push(`lies in unknown location "${lies.at}"`)
      if (lies.count !== undefined && !(Number.isInteger(lies.count) && lies.count > 0))
        problems.push(`lies ${lies.count} of it: a count is a whole number above 0`)
      if (lies.onFind !== undefined && lies.when === undefined) problems.push('onFind runs when a hidden thing is found: give it a when')
      return problems
    },
    references: (data, { ref }) => {
      const lies = liesOf(data as Lies)
      if (!lies) return []
      return [{ when: bindCurrent(lies.when, ref) }, { effects: bindCurrent(lies.onFind, ref) }, { effects: bindCurrent(lies.onPickUp, ref) }]
    },
  }

  const locationTrait: TraitDef<'places/location'> = {
    id: TRAIT,
    // The words a player reads: why an exit is refused, the room's text, its buttons, its hotspots and what happens on arriving.
    words: { blocked: [{ reason: true }], body: 'blocks', actions: ['button'], picture: { hotspots: [{ label: true }] }, arrive: { effects: 'effects' } },
    check: (data, { game, ref }) => {
      const problems: string[] = []
      if (!Array.isArray(data?.exits)) problems.push('a place needs its exits: exits: [] for none')
      if (!Array.isArray(data?.body)) problems.push('a place needs a body: body: [{ text: "..." }]')
      for (const exit of Array.isArray(data?.exits) ? data.exits : []) if (!declaredLocation(game, exit)) problems.push(`exit to unknown location "${exit}"`)
      if (data?.parent !== undefined) {
        if (!declaredLocation(game, data.parent)) problems.push(`inside unknown location "${data.parent}"`)
        else if (ancestors((id) => declaredLocation(game, id), short(ref)).includes(short(ref))) problems.push('is inside itself')
      }
      return problems
    },
    references: (place, { game }) => [
      { blocks: place?.body },
      // Its prose can hold its own actions and the game's inline: `[[act:id]]`.
      { actionsIn: place?.body, offers: [...(place?.actions ?? []), ...(game.actions ?? [])].map((action) => action.id) },
      { within: 'audio', refs: Object.entries(place?.audio ?? {}).map(([channel, track]) => ({ channel, track })) },
      { layered: place?.picture, choices: null },
      { ui: place?.ui, on: 'scene' },
      ...(place?.blocked ?? []).flatMap((entry): Reference[] => [{ when: entry.when }, { reason: entry.reason }]),
      ...(place?.arrive ? [{ within: 'arrive', refs: [{ when: place.arrive.when }, { effects: place.arrive.effects }] }] : []),
      ...(place?.actions ?? []).map((action) => ({ within: `action ${action.id}`, refs: actionReferences(action) })),
    ],
  }

  return definePlugin<PlacesState, PlacesView, typeof CALLS>({
    id: ID,
    calls: CALLS,
    version: 1,
    traits: [locationTrait, liesTrait],
    strings: {
      noSuchPlace: 'There is no such place.',
      alreadyHere: 'You are already here.',
      cannotGetThere: 'You cannot get there from here.',
      pickUp: 'Pick up',
      notLyingHere: 'There is no {thing} here.',
      notHere: 'Not here.',
    },
    // Each location is one particular place. Not listed: the places are the plugin's to show.
    content: { kinds: [{ id: LOCATION, label: 'Place', plural: 'Places', unique: true, listed: false }] },
    start: () => ({ at: options.start ?? null, floor: {}, found: [] }),
    conditions: {
      /** `{ 'places/at': { location: ['cafe', 'park'] } }`: the player is in one of these. */
      at: (_state, { location }, { slice }) => slice.at !== null && location.map(placeId).includes(slice.at),
      /** `{ 'places/within': { location: 'office' } }`: the player is there, or somewhere inside it; with a list, any of them. */
      within: (state, { location }, { slice, game }) => {
        if (slice.at === null) return false
        const around = [slice.at, ...ancestors((id) => locationOf(state, game, id), slice.at)]
        return location.map(placeId).some((id) => around.includes(id))
      },
      /** `{ 'places/away': { location: ['cafe'] } }`: the player is in none of these, or nowhere. What `places.onlyAt()` refuses by. */
      away: (_state, { location }, { slice }) => slice.at === null || !location.map(placeId).includes(slice.at),
    },
    effects: {
      /** `{ 'places/move': { location: 'park' } }`: be somewhere else at once, closing any scene. No exit needed, and nothing on arrival. */
      move: (state, { location }, { set, slice, game }) => {
        const to = placeId(location)
        if (!locationOf(state, game, to)) return state
        return set({ ...slice, at: to }, { ...state, sceneId: null })
      },
      /** `{ 'places/put': { entity, at?, by? } }`: put a thing down where the player is, or `at` a location; nothing when nowhere. */
      put: (state, { entity, at, by }, { slice, game }) => {
        const where = at !== undefined ? placeId(at) : slice.at
        if (where === null || !locationOf(state, game, where) || !hasEntity(state, game, entity)) return state
        return withLying(state, entity, where, lyingCount(state, game, entity, where) + (by ?? 1))
      },
    },
    commands: {
      /** `{ 'places/go': { id } }`: walk through an exit to the place `id`, then its `arrive`. */
      go: {
        whyNot: (state, { id }, { slice, game }) => goBlocked(state, game, slice.at, placeId(id)),
        run: (state, { id }, { set, slice, apply, game }) => {
          const to = placeId(id)
          const arrived = set({ ...slice, at: to })
          const arrive = locationOf(state, game, to)?.arrive
          return arrive && holds(arrived, game, arrive.when) ? apply(arrive.effects, arrived) : arrived
        },
      },
      /** `{ 'places/pickUp': { id } }`: pick up one of the thing `id` lying where the player is, for whoever they are playing. */
      pickUp: {
        whyNot: (state, { id }, { slice, game }) => pickUpBlocked(state, game, slice.at, id),
        effectsOf: (_state, { id }, { slice, game }) => pickUpEffects(game, slice.at, id),
        run: (state, { id }, { slice, apply, game }) => apply(pickUpEffects(game, slice.at, id), state),
      },
    },
    // A hidden thing is found the first time the player is where it lies while its `when` holds: remembered, then its `onFind`.
    onCommand: (_before, after, { game, apply }) => {
      const slice = sliceOf(after)
      if (slice.at === null) return after
      let next = after
      for (const ref of declaredWithTrait(game, LIES)) {
        const lies = liesOf(declaredTrait(game, ref, LIES) as Lies | undefined)
        if (!lies?.when || slice.found.includes(ref) || placeId(lies.at) !== slice.at || lyingCount(next, game, ref, slice.at) <= 0) continue
        if (!holds(next, game, bindCurrent(lies.when, ref))) continue
        const now = sliceOf(next)
        next = { ...next, plugins: { ...next.plugins, [ID]: { version: next.plugins?.[ID]?.version ?? 1, state: { ...now, found: [...now.found, ref] } } } }
        if (lies.onFind) next = apply(bindCurrent(lies.onFind, ref), next)
      }
      return next
    },
    queries: {
      here: (_state, _args, { slice }) => slice.at,
      /** Every place, each its trait with its `id` and `ref`. */
      all: (state, _args, { game }) =>
        locationsOf(state, game).flatMap((ref) => {
          const place = locationOf(state, game, ref)
          return place ? [{ ...place, id: short(ref), ref }] : []
        }),
      known: (state, args, { game }) => typeof args.location === 'string' && Boolean(locationOf(state, game, args.location)),
      exits: (state, _args, { slice, game }) => (locationOf(state, game, slice.at)?.exits ?? []).filter((id) => locationOf(state, game, id)),
    },
    values: {
      name: (state, _args, { slice, game }) => (slice.at !== null && locationOf(state, game, slice.at) ? entityName(state, game, locationRef(slice.at)) : ''),
      description: (state, _args, { slice, game }) =>
        slice.at !== null && locationOf(state, game, slice.at) ? (entityDescription(state, game, locationRef(slice.at)) ?? '') : '',
    },
    label: (state, { slice, game }) => (slice.at !== null && locationOf(state, game, slice.at) ? entityName(state, game, locationRef(slice.at)) : undefined),
    scene: (state, { slice, game }) => {
      const place = locationOf(state, game, slice.at)
      if (!place || slice.at === null) return undefined
      // The location's picture is the room's, which a UI shows with it, as the React UI does above the words.
      const image = entityImage(state, game, locationRef(slice.at))
      return {
        id: slice.at,
        title: entityName(state, game, locationRef(slice.at)),
        ...(image !== undefined ? { image } : {}),
        body: place.body,
        ...(place.ui !== undefined ? { ui: place.ui } : {}),
      }
    },
    actions: (state, { slice, game }) => locationOf(state, game, slice.at)?.actions,
    audio: (state, { slice, game }) => locationOf(state, game, slice.at)?.audio,
    view: (state, { slice, game, picks }): PlacesView => {
      const here = locationOf(state, game, slice.at)
      const at = here ? slice.at : null
      // While a scene or a minigame is on screen, the room isn't: no exits to take and nothing lying there to pick up.
      const idle = !state.sceneId && !state.minigame && !lockedOut(state, game)
      const exits: ExitView[] = []
      for (const id of idle && here ? here.exits : []) {
        const dest = locationOf(state, game, id)
        if (!dest) continue
        const command = commandOf(go(id))
        if (lockOn(state, game, command)?.hide) continue
        if (dest.blocked?.some((entry) => entry.hide && holds(state, game, entry.when))) continue
        const ref = locationRef(id)
        exits.push({
          ...renderAction(state, game, { id, label: entityName(state, game, ref), command }),
          ref,
          description: entityDescription(state, game, ref) ?? null,
          tags: entityTags(state, game, ref),
          image: pictureOf(state, game, ref),
        })
      }
      const things: LyingView[] = (idle && at !== null ? lyingIn(state, game, at) : []).map(({ ref, count }) => ({
        ref,
        name: entityName(state, game, ref),
        image: pictureOf(state, game, ref),
        count,
        pickUp: renderAction(state, game, { id: `pickUp.${ref}`, label: stringOf(game, `${ID}/pickUp`), command: pickUp(ref) }),
      }))
      if (!here || at === null) return { location: null, exits, things }
      const ref = locationRef(at)
      const picture = pictureView(state, game, here.picture, at, null, picks)
      return {
        location: {
          id: at,
          ref,
          name: entityName(state, game, ref),
          description: entityDescription(state, game, ref) ?? null,
          tags: entityTags(state, game, ref),
          image: pictureOf(state, game, ref),
          picture: picture && !idle ? { ...picture, hotspots: [] } : picture,
        },
        exits,
        things,
      }
    },
    references: {
      content: () => [
        ...(options.start !== undefined ? [{ list: 'options', id: 'start', refs: [PLACES.entry(options.start)] }] : []),
        ...(options.onPickUp !== undefined ? [{ list: 'options', id: 'onPickUp', refs: [{ effects: options.onPickUp }] }] : []),
      ],
    },
  })
}

/**
 * Returns a location for content's `entities`, an entity of the kind `location` (or `of`) with the
 * `places/location` trait. It takes the entity's fields and the trait's side by side.
 *
 * ```ts
 * entities: [places.location({ id: 'cafe', name: 'The Corner Café', description: 'Café', exits: ['street'], body: [{ prose: 'place.cafe' }] })]
 * ```
 */
function location(def: PlaceDef): EntityDef {
  return PLACES.define(def)
}

/**
 * Returns the `places/lies` trait, to spread into an entity's `traits`: the location it starts lying in, with a
 * condition to find it and effects when it's found or picked up.
 *
 * ```ts
 * traits: { ...places.lies('kitchen', { when: { stat: 'perception', gte: 5 }, onFind: [{ kv: 'foundKey', to: true }] }) }
 * ```
 */
const lies = (at: string, more: Omit<Exclude<Lies, string>, 'at'> = {}): { 'places/lies': Lies } => ({
  [LIES]: Object.keys(more).length ? { at, ...more } : at,
})
/** Returns the `places/put` effect, which puts a thing down where the player is, or `at` a location. */
const put = (entity: EntityRef, options: { at?: string; by?: number } = {}): EffectRef => CALLS.effects.put({ entity, ...options })

/** Returns the `places/pickUp` command, which picks up one of a thing lying where the player is. */
const pickUp = (ref: EntityRef): CommandRef => CALLS.commands.pickUp({ id: ref })
/** Returns the `places/go` command, which walks to a location by an exit. */
const go = (id: string): CommandRef => CALLS.commands.go({ id })
/** Returns the `places/at` condition, which holds while the player is at any of these locations. */
const at = (...places: string[]): Condition => CALLS.conditions.at({ location: places })
/** Returns the `places/within` condition, which holds while the player is at any of these locations or anywhere inside one. */
const within = (...places: string[]): Condition => CALLS.conditions.within({ location: places })
/** Returns the `places/move` effect, which puts the player at the location at once, closing any scene and running no `arrive`. */
const moveTo = (place: string): EffectRef => CALLS.effects.move({ location: place })
/** Returns the `places/away` condition, which holds while the player is at none of these locations or at no location. */
const away = (...places: string[]): Condition => CALLS.conditions.away({ location: places })
/**
 * Returns the id of the location the player is at, from the `places/here` query. Returns null when the player is at no
 * location or the game has no places plugin.
 */
const where = (state: GameState, game: Game): string | null => pluginQuery(game, 'places/here')?.(state) ?? null
/**
 * Returns a `blocked` entry that refuses anywhere but these locations, with `reason` or the `places/notHere` string
 * ("Not here."). Its `when` is `places.away(...)`, which never holds in a game without places.
 *
 * With `hide`, a button it refuses is left out of the view, and a vendor it refuses isn't `here`.
 */
const onlyAt = (places: string[], reason?: Reason, options: { hide?: boolean } = {}): Blocked => ({
  when: away(...places),
  reason: reason ?? { string: `${ID}/notHere` },
  ...(options.hide ? { hide: true } : {}),
})

/**
 * The places plugin's factory, with its helpers as properties. `places(options)` returns the plugin for the game's
 * `plugins`, and content calls helpers such as `places.location({ ... })`, `places.go('park')` and `places.at('cafe')`.
 */
export const places = Object.assign(placesPlugin, {
  /** Returns a location for content's `entities`, an entity with the `places/location` trait, from the entity's fields and the trait's. */
  location,
  /** Returns the entity reference of a location; a bare id is one of the `location` kind. */
  locationRef,
  /** Returns the `places/lies` trait, to spread into an entity's `traits`, naming where it starts lying and any `when` to find it. */
  lies,
  /** Returns the `places/put` effect, which puts a thing down where the player is, or `at` a location. */
  put,
  /** Returns the `places/pickUp` command, which picks up one of a thing lying where the player is. */
  pickUp,
  /** Returns the `places/go` command, which walks to a location by an exit. */
  go,
  /** Returns the `places/at` condition, which holds while the player is at any of these locations. */
  at,
  /** Returns the `places/within` condition, which holds while the player is at any of these locations or anywhere inside one. */
  within,
  /** Returns the `places/away` condition, which holds while the player is at none of these locations or at no location. */
  away,
  /** Returns the `places/move` effect, which puts the player at the location at once, closing any scene. */
  move: moveTo,
  /** Returns a `blocked` entry that refuses anywhere but these locations, with `reason` or the `places/notHere` string. */
  onlyAt,
  /** Returns the id of the location the player is at, from the `places/here` query, or null. */
  where,
})
