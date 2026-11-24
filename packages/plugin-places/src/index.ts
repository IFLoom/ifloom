/**
 * The places plugin, which adds locations with exits and actions, travel between them, and where the player is.
 *
 * The plugin keeps the player's location in its own state. While no scene is open, its room shows the location's
 * body and actions, and its view lists the exits. A location is an entity with the `places/location` trait, written
 * with `places.location({ ... })` in content's `entities`. Its name, `description` and `image` are the entity's, and
 * its exits, body and actions are the trait's, so a mod adds or changes a location as it does any entity.
 *
 * The plugin brings the unique kind `location`, so a location holds the things lying there, which the view lists with
 * a button to pick each up. The `places/holder` query names the location the player is at, so another plugin, such
 * as the inventory, can put a thing down there.
 */
import {
  artSrc,
  commandOf,
  entityDescription,
  entityImage,
  entityName,
  entityOf,
  entityTags,
  heldBy,
  heldCount,
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
  YOU,
} from '@ifloom/engine'
import {
  actionReferences,
  arg,
  bindCurrent,
  defineCalls,
  defineTraitKind,
  definePlugin,
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
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

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

declare module '@ifloom/engine' {
  interface TraitRegistry {
    'places/location': Place
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
}

/** The location a save keeps for the player. Locations themselves are read from content. */
export type PlacesState = {
  /** The id of the location the player is at, its full reference for a location of another kind, or null when at none. */
  at: string | null
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
  /** The things the location holds, such as a thing the player dropped. It is empty while a scene is open or a lock holds everything. */
  things: LyingView[]
}

const ID = 'places'

/** The id of the kind the plugin brings for its locations, `location`, as in `'location:park'`. The kind is unique, so each location can hold things. */
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
  // `places/here`, `places/holder` and `places/known`, which other plugins ask, are the engine's `PartnerQueries`.
  interface QueryRegistry {
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

/** What lies in a place that the player can see: what its entity holds, but things whose `visible` doesn't hold. */
function lyingIn(state: GameState, game: Game, at: string): { ref: EntityRef; count: number }[] {
  return heldBy(state, game, locationRef(at)).filter(({ ref }) =>
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
    if (at === null || heldCount(state, game, ref, locationRef(at)) <= 0) return stringOf(game, `${ID}/notLyingHere`, { thing: entityName(state, game, ref) })
    return undefined
  }
  /** Picking one up: from the place to whoever the player is playing. */
  const pickUpEffects = (at: string | null, ref: string): Effect[] => (at === null ? [] : [{ move: ref, from: locationRef(at), to: YOU, by: 1 }])

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
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    commandVersion: COMMAND_VERSION,
    commandMigrations,
    traits: [locationTrait],
    strings: {
      noSuchPlace: 'There is no such place.',
      alreadyHere: 'You are already here.',
      cannotGetThere: 'You cannot get there from here.',
      pickUp: 'Pick up',
      notLyingHere: 'There is no {thing} here.',
      notHere: 'Not here.',
    },
    // Each location is a unique entity, so it can hold things: what lies there. Not listed: the places are the plugin's to show.
    content: { kinds: [{ id: LOCATION, label: 'Place', plural: 'Places', unique: true, listed: false }] },
    start: () => ({ at: options.start ?? null }),
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
      move: (state, { location }, { set, game }) => {
        const to = placeId(location)
        if (!locationOf(state, game, to)) return state
        return set({ at: to }, { ...state, sceneId: null })
      },
    },
    commands: {
      /** `{ 'places/go': { id } }`: walk through an exit to the place `id`, then its `arrive`. */
      go: {
        whyNot: (state, { id }, { slice, game }) => goBlocked(state, game, slice.at, placeId(id)),
        run: (state, { id }, { set, apply, game }) => {
          const to = placeId(id)
          const arrived = set({ at: to })
          const arrive = locationOf(state, game, to)?.arrive
          return arrive && holds(arrived, game, arrive.when) ? apply(arrive.effects, arrived) : arrived
        },
      },
      /** `{ 'places/pickUp': { id } }`: pick up one of the thing `id` lying where the player is, for whoever they are playing. */
      pickUp: {
        whyNot: (state, { id }, { slice, game }) => pickUpBlocked(state, game, slice.at, id),
        effectsOf: (_state, { id }, { slice }) => pickUpEffects(slice.at, id),
        run: (state, { id }, { slice, apply }) => apply(pickUpEffects(slice.at, id), state),
      },
    },
    queries: {
      here: (_state, _args, { slice }) => slice.at,
      /** The entity of where the player is, which holds what is put down there (`'location:park'`); null when nowhere. */
      holder: (state, _args, { slice, game }) => (slice.at !== null && locationOf(state, game, slice.at) ? locationRef(slice.at) : null),
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
      return { id: slice.at, title: entityName(state, game, locationRef(slice.at)), body: place.body, ...(place.ui !== undefined ? { ui: place.ui } : {}) }
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
      content: () => (options.start !== undefined ? [{ list: 'options', id: 'start', refs: [PLACES.entry(options.start)] }] : []),
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
