/**
 * Places: locations with exits between them and things to do in them, travel,
 * and where the player is.
 *
 * The engine knows no places. This plugin keeps the player's location in its
 * own state, fills the screen with the room's description while no scene is
 * open (`scene`), offers the room's actions as buttons, and hands the UI the
 * exits. A location is an entity that carries the `places/location` trait,
 * written with `places.location({ ... })` in content's `entities`: its name, `description`
 * and `image` are the entity's, and its exits, body and actions are the
 * trait's. So a mod adds a room as it adds any entity, and changes one with
 * a `traits` row or by replacing the entity.
 *
 * The plugin brings the kind `location`, which `places.location()` uses. Each place
 * is unique, so it holds things: what lies there, shown in the view with a
 * button to pick it up. The `places/holder` query names where the player is
 * as that entity, so another plugin (the inventory's drop) can put something
 * down there by name.
 */
import {
  actionReferences,
  artSrc,
  bindCurrent,
  commandOf,
  definePlugin,
  entityDescription,
  entityImage,
  entityName,
  entityOf,
  entityTags,
  traitOf,
  heldBy,
  heldCount,
  holds,
  lockOn,
  lockedOut,
  parseRef,
  pluginQuery,
  reasonOf,
  stringOf,
  renderAction,
  pictureView,
  declaredTrait,
  declaredWithTrait,
  withTrait,
  type ActionDef,
  type Blocked,
  type Reason,
  type Block,
  type CommandRef,
  type Condition,
  type DefinedPlugin,
  type Effect,
  type EffectRef,
  type EntityDef,
  type EntityRef,
  type Game,
  type GameState,
  type PictureDef,
  type PluginProblem,
  type RenderedChoice,
  type Reference,
  type PictureView,
  type SceneUi,
  type TraitDef,
  type Ui,
  YOU,
} from '@ifloom/engine'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

/**
 * What the `places/location` trait holds: what makes an entity a place the
 * player can be in. The place's name, its `description` (a word or two under the
 * name: "Home", "Café"), its `image` and its `tags` are the entity's.
 */
export type Place = {
  /** The place it is inside: a room's building. `places/within` follows it. */
  parent?: string
  /** The places one step away. */
  exits: readonly string[]
  /**
   * A layered picture with hotspots, drawn where the UI draws the room. A
   * hotspot here sends a `command`; a place has no choices.
   */
  picture?: PictureDef
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

declare module '@ifloom/engine' {
  interface TraitRegistry {
    'places/location': Place
  }
}

/**
 * What `places.location()` takes: an entity's fields (its `of` is `'location'` if
 * left out; its `description` is the line under the place's name, its `image` its
 * picture) and the `places/location` trait's, side by side. `ui` is the
 * trait's: the room's hints, as a scene's.
 */
export type PlaceDef = Omit<EntityDef, 'of' | 'ui'> & Place & { of?: string }

/** What happens as the player walks into a place: effects, while `when` holds. */
export type Arrival = { when?: Condition; effects: EffectRef[] }

export type PlacesOptions = {
  /** Where a new game starts. Nowhere — no place at all — if left out. */
  start?: string
}

/** The plugin's state: where the player is, by the place's id (its whole reference for a place of another kind), or null. */
export type PlacesState = { at: string | null }

/**
 * One way out of the current place, as the UI draws it: a button like any
 * other (`RenderedChoice`), whose `label` is the place's name, `disabled` why
 * it can't be taken now, `warning` a plugin's soft refusal, and `price` what
 * going costs. Send `command` to take it. The rest describes where it leads.
 */
export type ExitView = RenderedChoice & {
  /** The place's entity: `'location:park'`. */
  ref: EntityRef
  /** The place's line under its name, its entity's `description`; null with none. */
  description: string | null
  /** The place's tags, its entity's. */
  tags: string[]
  /** The place's picture's path, its entity's `image` through `artSrc`; null with none. */
  image: string | null
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

/** Where the player is, as the UI draws it. */
export type PlaceView = {
  /** The place's id, as `go` names it. */
  id: string
  /** Its entity: `'location:park'`. */
  ref: EntityRef
  name: string
  /** The line under its name, its entity's `description`; null with none. */
  description: string | null
  tags: string[]
  /** Its picture's path, its entity's `image` through `artSrc`; null with none. */
  image: string | null
  /**
   * The place's picture as the engine's `pictureView` draws it, or null when it
   * has none. Its hotspots are left out while a scene is open or a lock holds
   * everything, as the exits are.
   */
  picture: PictureView | null
}

/** What the UI reads at `view.plugins.places`. */
export type PlacesView = {
  /** Where the player is; null when nowhere. */
  location: PlaceView | null
  /** The exits, in the order the place lists them; none while a scene is open or a lock holds everything. */
  exits: ExitView[]
  /** What lies here, held by the place's entity: a thing the player dropped, say. None while a scene is open or a lock holds everything. */
  things: LyingView[]
}

/**
 * What content writes for each of the plugin's calls, its queries' answers
 * and its view, so a call with a misspelled argument fails to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry {
    'places/at': { location: string | readonly string[] }
    'places/within': { location: string | readonly string[] }
  }
  interface EffectRegistry {
    'places/move': { location: string }
  }
  interface CommandRegistry {
    'places/go': { id: string }
    'places/pickUp': { id: EntityRef }
  }
  interface QueryRegistry {
    'places/here': () => string | null
    'places/holder': () => EntityRef | null
    'places/all': () => (Place & { id: string; ref: EntityRef })[]
    'places/known': (args: { location: string }) => boolean
    'places/exits': () => string[]
  }
  interface ViewRegistry {
    places: PlacesView
  }
}

const ID = 'places'
const TRAIT = 'places/location'

/** The kind the plugin brings for its places, so each can hold things: `'location:park'`. */
export const LOCATION = 'location'

/**
 * How content names a place's entity, for `at` and `entity`: a bare id is
 * one of the plugin's kind (`places.locationRef('park')` is `'location:park'`), and
 * a reference is as written.
 */
const locationRef = (id: string): EntityRef => (id.includes(':') ? id : `${LOCATION}:${id}`) as EntityRef

/** How the plugin names a place back: its id for one of its kind, else the whole reference. */
const short = (ref: EntityRef): string => (parseRef(ref)?.kind === LOCATION ? parseRef(ref)!.id : ref)

const declaredCache = new WeakMap<object, Map<EntityRef, Place>>()

/** The places content declares, by reference, with their traits. */
function declared(game: Game): Map<EntityRef, Place> {
  let found = declaredCache.get(game)
  if (!found) {
    found = new Map()
    for (const ref of declaredWithTrait(game, TRAIT)) {
      const data = declaredTrait(game, ref, TRAIT)
      if (data) found.set(ref, data)
    }
    declaredCache.set(game, found)
  }
  return found
}

/**
 * Every place in the game now, as references: every entity with the
 * `places/location` trait, the ones content declares in its order, then
 * those made in play.
 */
export function locationsOf(state: GameState, game: Game): EntityRef[] {
  return withTrait(state, game, TRAIT)
}

/**
 * The `places/location` trait of a place, named by its id (`'park'`) or its
 * reference: one content declares, or one made in play, read through what
 * it was made `like`. Undefined for anything else.
 */
export function locationOf(state: GameState, game: Game, ref: string | null | undefined): Place | undefined {
  if (ref === null || ref === undefined) return undefined
  const full = locationRef(ref)
  const own = declared(game).get(full)
  if (own) return own
  return entityOf(state, game, full) ? traitOf(state, game, full, TRAIT) : undefined
}

/** A place content declares, by id or reference, for a check, which has no state. */
const declaredLocation = (game: Game, id: string): Place | undefined => declared(game).get(locationRef(id))

/** A reference to one of the game's places, which must carry the trait. */
const placeEntry = (id: string): Reference => ({ entity: locationRef(id), carrying: TRAIT })

/** One location or several, as a list: `location: 'cafe'` or `location: ['cafe', 'park']`. */
function ids(value: unknown): string[] {
  return (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(String)
}

/** Places as the plugin keeps them: `'park'` and `'location:park'` are both `'park'`. */
const placeIds = (value: unknown): string[] => ids(value).map((id) => short(locationRef(id)))

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

/** Build the plugin. */
function placesPlugin(options: PlacesOptions = {}): DefinedPlugin<PlacesState, PlacesView> {
  /** Why the player cannot go there now, or undefined. */
  function goBlocked(state: GameState, game: Game, at: string | null, to: string): string | undefined {
    if (state.sceneId) return stringOf(game, 'finishFirst')
    const place = locationOf(state, game, to)
    if (!place) return stringOf(game, `${ID}/noSuchPlace`)
    if (to === at) return stringOf(game, `${ID}/alreadyHere`)
    const blocked = place.blocked?.find((entry) => holds(state, game, entry.when))
    if (blocked) return reasonOf(game, blocked.reason)
    if (at === null || !placeIds(locationOf(state, game, at)?.exits).includes(to)) return stringOf(game, `${ID}/cannotGetThere`)
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
      { ui: place?.ui },
      ...(place?.blocked ?? []).flatMap((entry): Reference[] => [{ when: entry.when }, { reason: entry.reason }]),
      ...(place?.arrive ? [{ within: 'arrive', refs: [{ when: place.arrive.when }, { effects: place.arrive.effects }] }] : []),
      ...(place?.actions ?? []).map((action) => ({ within: `action ${action.id}`, refs: actionReferences(action) })),
    ],
  }

  return definePlugin<PlacesState, PlacesView>({
    id: ID,
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
      at: (_state, args, { slice }) => slice.at !== null && placeIds(args.location).includes(slice.at),
      /** `{ 'places/within': { location: 'office' } }`: the player is there, or somewhere inside it; with a list, any of them. */
      within: (state, args, { slice, game }) => {
        if (slice.at === null) return false
        const around = [slice.at, ...ancestors((id) => locationOf(state, game, id), slice.at)]
        return placeIds(args.location).some((id) => around.includes(id))
      },
    },
    effects: {
      /** `{ 'places/move': { location: 'park' } }`: be somewhere else at once, closing any scene. No exit needed, and nothing on arrival. */
      move: (state, args, { set, game }) => {
        const to = placeIds(args.location)[0]
        if (!locationOf(state, game, to)) return state
        return set({ at: to }, { ...state, sceneId: null })
      },
    },
    commands: {
      /** `{ 'places/go': { id } }`: walk through an exit to the place `id`, then its `arrive`. */
      go: {
        whyNot: (state, args, { slice, game }) => goBlocked(state, game, slice.at, placeIds(args.id)[0]),
        run: (state, args, { set, apply, game }) => {
          const to = placeIds(args.id)[0]
          const arrived = set({ at: to })
          const arrive = locationOf(state, game, to)?.arrive
          return arrive && holds(arrived, game, arrive.when) ? apply(arrive.effects, arrived) : arrived
        },
      },
      /** `{ 'places/pickUp': { id } }`: pick up one of the thing `id` lying where the player is, for whoever they are playing. */
      pickUp: {
        whyNot: (state, args, { slice, game }) => pickUpBlocked(state, game, slice.at, String(args.id ?? '')),
        effectsOf: (_state, args, { slice }) => pickUpEffects(slice.at, String(args.id ?? '') as EntityRef),
        run: (state, args, { slice, apply }) => apply(pickUpEffects(slice.at, String(args.id ?? '') as EntityRef), state),
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
      known: (state, args, { game }) => Boolean(locationOf(state, game, ids(args.location)[0])),
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
        return named.map(placeEntry)
      },
      content: () => (options.start !== undefined ? [{ list: 'options', id: 'start', refs: [placeEntry(options.start)] }] : []),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      // Locations were a list in the plugin's content; now each is an entity with the location trait.
      for (const entry of (game.data?.[ID] as { locations?: { id?: string }[] } | undefined)?.locations ?? []) {
        problems.push({
          list: 'locations',
          id: String(entry?.id ?? ''),
          what: 'locations are entities now: write them in entities with places.location({ id, name, exits, body, ... })',
        })
      }
      return problems
    },
  })
}

const LOCATION_FIELDS = ['parent', 'exits', 'picture', 'blocked', 'body', 'actions', 'audio', 'ui', 'arrive'] as const

/**
 * A place, for content's `entities`: an entity of the kind `location` (or
 * `of`) carrying the `places/location` trait, with the entity's fields and
 * the trait's written side by side.
 *
 * ```ts
 * entities: [places.location({ id: 'cafe', name: 'The Corner Café', description: 'Café', exits: ['street'], body: [{ prose: 'place.cafe' }] })]
 * ```
 */
function location(def: PlaceDef): EntityDef {
  const { of, traits, ...rest } = def
  const entity: Record<string, unknown> = {}
  const trait: Record<string, unknown> = {}
  for (const [field, value] of Object.entries(rest)) {
    if (value === undefined) continue
    if ((LOCATION_FIELDS as readonly string[]).includes(field)) trait[field] = value
    else entity[field] = value
  }
  return { ...(entity as Omit<EntityDef, 'of'>), of: of ?? LOCATION, traits: { ...traits, [TRAIT]: trait as Place } }
}

/** The command that picks up one of a thing lying where the player is. */
const pickUp = (ref: EntityRef): CommandRef => ({ [`${ID}/pickUp`]: { id: ref } })
/** The command that walks to a place by an exit. */
const go = (id: string): CommandRef => ({ [`${ID}/go`]: { id } })
/** True in any of these places. */
const at = (...places: string[]): Condition => ({ [`${ID}/at`]: { location: places } })
/** True in any of these places, or anywhere inside one. */
const within = (...places: string[]): Condition => ({ [`${ID}/within`]: { location: places } })
/** The effect that puts the player somewhere at once. */
const moveTo = (place: string): EffectRef => ({ [`${ID}/move`]: { location: place } })
/** A `blocked` entry: refused anywhere but these places, with `reason` (the plugin's `places/notHere` string, "Not here.", if left out). */
/** Where the player is, by the place's id: the `places/here` query, asked of the game's places plugin. Null when nowhere. */
const where = (state: GameState, game: Game): string | null => (pluginQuery(game, `${ID}/here`)?.(state) as string | null | undefined) ?? null
const onlyAt = (places: string[], reason?: Reason): Blocked => ({ when: { not: at(...places) }, reason: reason ?? { string: `${ID}/notHere` } })

/**
 * The plugin, with its helpers on it: `places()` makes the plugin for the
 * game's `plugins`, and content is written with `places.location({ ... })`, `places.go('park')` and `places.at('cafe')`.
 */
export const places = Object.assign(placesPlugin, { location, locationRef, pickUp, go, at, within, move: moveTo, onlyAt, where })
