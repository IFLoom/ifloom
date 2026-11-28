/**
 * The wardrobe plugin, which adds the slots the game declares, the things that go in them, what each body owns and
 * what each body has on.
 *
 * Clothes are entities with the `wardrobe/wearable` trait, which names the slot each goes in. The wardrobe keeps each
 * body's own clothes, and it's a receiver (ADR 0016): a `receive` of a wearable thing puts it in the wardrobe of
 * whoever is played, so a bought shirt can be worn at once. A game that wants clothes carried first gives
 * `wardrobe({ claims: false })`, and wearables then go to the next receiver, such as an inventory.
 *
 * A body wears what it owns anywhere, counted by `owned` across every receiver. Putting a thing on takes off whatever
 * was in its slot, and a thing a body no longer owns comes off by itself after the command. `onWear` and `onTakeOff`
 * effects run as a body puts a thing on or takes it off, the thing's own and then the game-wide ones.
 */
import {
  declaredTrait,
  declaredWithTrait,
  entityName,
  entityOf,
  isUnique,
  ownedCount,
  parseRef,
  PLAYER,
  pluginQuery,
  protagonist,
  receiversOf,
  receiveThing,
  releaseThing,
  resolveYou,
  stringOf,
  traitOf,
  withTrait,
  YOU,
  type CommandRef,
  type Condition,
  type EffectRef,
  type EntityRef,
  type Game,
  type GameState,
  type RenderedChoice,
  type Someone,
} from '@ifloom/engine'
import {
  arg,
  defineCalls,
  defineData,
  definePlugin,
  everyEntity,
  hasEntity,
  list,
  renderAction,
  type CommandsOf,
  type ConditionsOf,
  type DefinedPlugin,
  type EffectsOf,
  type PluginContext,
  type PluginProblem,
  type TraitDef,
} from '@ifloom/engine/plugin'

/** The data of the `wardrobe/wearable` trait, which makes a thing wearable in one slot. */
export type Wearable = {
  /** The id of the slot the thing goes in, such as `'coat'`. */
  slot: string
  /** Effects that run when a body puts the thing on, such as `[{ kv: 'onDuty', to: true }]`, before the game-wide ones. */
  onWear?: EffectRef[]
  /** Effects that run when a body takes the thing off, or it comes off by itself, before the game-wide ones. */
  onTakeOff?: EffectRef[]
}

/**
 * The data of the `wardrobe/closet` trait, which makes a location somewhere the player can change clothes. While the
 * player is there, the room offers a button that opens the `wardrobe` panel.
 *
 * The button needs the places plugin, which says where the player is.
 */
export type Closet = {
  /** The label of the button that opens the `wardrobe` panel. The `wardrobe/open` string (`Wardrobe`) if left out. */
  label?: string
}

/** The bodies that own a thing at the start, one body for one of it or a count for each body (`{ player: 1, 'character:sam': 1 }`). */
export type Owners = EntityRef | typeof PLAYER | Partial<Record<EntityRef | typeof PLAYER, number>>

declare module '@ifloom/engine' {
  interface TraitRegistry {
    'wardrobe/wearable': Wearable
    'wardrobe/closet': Closet
    'wardrobe/owned': Owners
  }
}

/** A slot the game declares in `data.wardrobe.slots`, a part of the body where a thing can be worn. */
export type WardrobeSlot = {
  /** The slot's id, which a wearable thing's `slot` names. */
  id: string
  /** The slot's label. */
  label: string
  /** The wearable thing in the slot at the start, one the player owns at the start. The slot starts empty if left out. */
  start?: EntityRef
}

/** The wardrobe plugin's settings, which the game passes to `wardrobe()`. */
export type WardrobeOptions = {
  /**
   * False for a game where clothes are carried before they're put away. True if left out.
   *
   * With it false, the wardrobe claims nothing a `receive` gives, so wearables go to the next receiver, and
   * `wardrobe/store` puts them away by name.
   */
  claims?: boolean
  /** Effects that run when a body puts on anything, after the thing's own `onWear`. */
  onWear?: EffectRef[]
  /** Effects that run when a body takes off anything, after the thing's own `onTakeOff`. */
  onTakeOff?: EffectRef[]
}

/** The clothes a save keeps for each body. The plugin reads slots and wearable things from content. */
export type WardrobeState = {
  /** The thing worn in each slot, by body (`'player'` or a protagonist such as `'character:sam'`) and then by slot id. */
  worn: Record<string, Record<string, EntityRef | null>>
  /**
   * The counts of clothes in each body's wardrobe that play changed, by body and then thing. A count written once is
   * kept, 0 included. For the rest, the plugin reads each thing's `wardrobe/owned` trait.
   */
  owned: Record<string, Record<string, number>>
}

/** The wardrobe of whoever the player is playing as the player sees it, in `view.plugins.wardrobe`. */
export type WardrobeView = {
  /** The game's slots in order, each with the thing in it. */
  slots: {
    /** The slot's id. */
    id: string
    /** The slot's label. */
    label: string
    /** The thing in the slot, or null while the slot is empty. */
    entity: EntityRef | null
    /** The name of the thing in the slot, or null while the slot is empty. */
    name: string | null
    /** The button that takes the thing off, labelled with the `wardrobe/takeOff` string, or null while the slot is empty. */
    takeOff: RenderedChoice | null
  }[]
  /**
   * The wearable things whoever is played owns and isn't wearing, in the order of the game's entities. Each has its slot
   * and the button that puts it on, labelled with the `wardrobe/wear` string (`Wear {thing}`).
   */
  spare: { entity: EntityRef; name: string; slot: string; wear: RenderedChoice }[]
}

/**
 * What content writes for each of the plugin's calls (from `CALLS`) and its view, so a call with a misspelled argument
 * fails to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    wardrobe: WardrobeView
  }
}

const ID = 'wardrobe'
const WEARABLE = 'wardrobe/wearable'
const CLOSET = 'wardrobe/closet'
const OWNED = 'wardrobe/owned'

/** The plugin's one list, `slots`, as content writes it in `data.wardrobe.slots` (a plugin's `data` holds its lists by name), with the words a player reads in each, for a translation's `words` table. */
const DATA = defineData(ID, { slots: list<WardrobeSlot>({ noun: 'slot', words: { label: true } }) })

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** Wearing the thing `entity`, or anything in `slot`, or that thing in that slot; on whoever is played, or `at`. */
    wearing: { entity: arg.entity().optional(), slot: arg.entry(DATA.slots).optional(), at: arg.someone().optional(YOU) },
  },
  effects: {
    /** Put `by` of the thing `entity` (1 if left out) in the wardrobe of `at`, whoever is played if left out. */
    add: { entity: arg.entity(), at: arg.someone().optional(), by: arg.number().optional() },
    /** Take `by` of the thing `entity` (1 if left out) out of the wardrobe of `at`, whoever is played if left out. */
    remove: { entity: arg.entity(), at: arg.someone().optional(), by: arg.number().optional() },
    /** Put `by` of the thing (1 if left out) away: out of the other receivers (or the one `via` names) and into the wardrobe of `at`. */
    store: { entity: arg.entity(), at: arg.someone().optional(), by: arg.number().optional(), via: arg.string().optional() },
    /** Take `by` of the thing (1 if left out) out of the wardrobe of `at`, into the first other receiver, or the one `via` names. */
    takeOut: { entity: arg.entity(), at: arg.someone().optional(), by: arg.number().optional(), via: arg.string().optional() },
  },
  commands: {
    /** Put on the thing `id`, which you own. */
    wear: { id: arg.entity() },
    /** Take off what is in the slot `id`. */
    takeOff: { id: arg.entry(DATA.slots) },
  },
})

/** Returns the game's slots in order, from `data.wardrobe.slots` in its content and packs. */
export function slotsOf(game: Game): WardrobeSlot[] {
  return DATA.slots.all(game)
}

/** Returns a thing's `wardrobe/wearable` trait, read through the entity it was made `like`. Returns undefined for a thing that can't be worn. */
export function wearableOf(state: GameState, game: Game, ref: string): Wearable | undefined {
  return traitOf(state, game, ref, WEARABLE)
}

function nameOf(state: GameState, game: Game, ref: string): string {
  return entityOf(state, game, ref) ? entityName(state, game, ref) : (parseRef(ref)?.id ?? ref)
}

/** Returns owners as counts by body. A single body counts as one owned. */
function ownerCounts(owners: Owners | undefined): Record<string, number> {
  if (owners === undefined || owners === null) return {}
  return typeof owners === 'string' ? { [owners]: 1 } : (owners as Record<string, number>)
}

const wearableTrait: TraitDef<'wardrobe/wearable'> = {
  id: WEARABLE,
  words: { onWear: 'effects', onTakeOff: 'effects' },
  check: (data) => (typeof data?.slot === 'string' && data.slot !== '' ? [] : ['a wearable thing needs a slot: { slot: "coat" }']),
  references: (data) => [
    ...(typeof data?.slot === 'string' ? [DATA.slots.ref(data.slot)] : []),
    ...(data?.onWear !== undefined ? [{ effects: data.onWear }] : []),
    ...(data?.onTakeOff !== undefined ? [{ effects: data.onTakeOff }] : []),
  ],
}

const closetTrait: TraitDef<'wardrobe/closet'> = {
  id: CLOSET,
  words: { label: true },
  check: (data) =>
    data === undefined || data === null || typeof data !== 'object' || (data.label !== undefined && typeof data.label !== 'string')
      ? ['a closet’s label must be words: { label: "Wardrobe" }']
      : [],
}

/** Who owns a thing at the start: the player or a protagonist, never `'you'`, with whole counts above 0. */
const ownedTrait: TraitDef<'wardrobe/owned'> = {
  id: OWNED,
  check: (data) => {
    const wrong: string[] = []
    for (const [body, count] of Object.entries(ownerCounts(data as Owners))) {
      if (body === YOU) wrong.push('wardrobe/owned can\'t be "you" where a thing starts: name "player" or the protagonist')
      if (!Number.isInteger(count) || count < 1) wrong.push(`wardrobe/owned gives "${body}" ${count}: a count is a whole number above 0`)
    }
    return wrong
  },
  references: (data) =>
    Object.keys(ownerCounts(data as Owners))
      .filter((body) => body !== YOU)
      .map((body) => ({ someone: body })),
}

/** What one body has on, slot by slot: nothing in a slot it never filled. */
function wornBy(slice: WardrobeState, body: string): Record<string, EntityRef | null> {
  return slice.worn[body] ?? {}
}

/** The slice with one body's slots changed. */
function dressed(slice: WardrobeState, body: string, slots: Record<string, EntityRef | null>): WardrobeState {
  return { ...slice, worn: { ...slice.worn, [body]: { ...wornBy(slice, body), ...slots } } }
}

/** The wardrobe's state in this save. */
function sliceOf(state: GameState): WardrobeState {
  const slice = state.plugins?.[ID]?.state as Partial<WardrobeState> | undefined
  return { worn: slice?.worn ?? {}, owned: slice?.owned ?? {} }
}

/** Returns true when `body` can own clothes now: the player, or a unique entity in the game. */
function isBody(state: GameState, game: Game, body: string): boolean {
  return body === PLAYER || (isUnique(game, body) && hasEntity(state, game, body))
}

/** Returns how many of a thing a body (`'you'` if left out) has in its wardrobe, its starts read from `wardrobe/owned`. */
export function ownedHere(state: GameState, game: Game, ref: string, at: string = YOU): number {
  const body = resolveYou(state, at)
  if (!isBody(state, game, body) || !hasEntity(state, game, ref)) return 0
  const written = sliceOf(state).owned[body]?.[ref]
  if (written !== undefined) return written
  return ownerCounts(declaredTrait(game, ref, OWNED) as Owners | undefined)[body] ?? 0
}

/** Returns the state with a body's count of a thing in its wardrobe set, at 0 or more, at most 1 for a unique thing. */
function setOwned(state: GameState, game: Game, ref: string, at: string, count: number): GameState {
  const body = resolveYou(state, at)
  if (!isBody(state, game, body) || !hasEntity(state, game, ref)) return state
  const next = Math.max(0, Math.floor(isUnique(game, ref) ? Math.min(1, count) : count))
  if (next === ownedHere(state, game, ref, body) && sliceOf(state).owned[body]?.[ref] !== undefined) return state
  const slice = sliceOf(state)
  return {
    ...state,
    plugins: {
      ...state.plugins,
      [ID]: { version: state.plugins?.[ID]?.version ?? 1, state: { ...slice, owned: { ...slice.owned, [body]: { ...slice.owned[body], [ref]: next } } } },
    },
  }
}

/** How many of a thing a body owns anywhere, across every receiver: what it can wear. */
function ownedAnywhere(state: GameState, game: Game, ref: string, body: string): number {
  return ownedCount(state, game, ref as EntityRef, body)
}

/** The other receivers a `store` or `takeOut` uses: the one `via` names, else every receiver but the wardrobe, in order. */
function othersOf(game: Game, via: string | undefined): string[] {
  return receiversOf(game)
    .map((plugin) => plugin.id)
    .filter((id) => id !== ID && (via === undefined || id === via))
}

/** The game-wide hooks and the thing's own, the thing's first. */
function hooks(state: GameState, game: Game, ref: EntityRef, key: 'onWear' | 'onTakeOff', options: WardrobeOptions): EffectRef[] {
  return [...(wearableOf(state, game, ref)?.[key] ?? []), ...(options[key] ?? [])]
}

/** The room the player is in, when the game has places and it's an entity in the game. */
function room(state: GameState, game: Game): EntityRef | undefined {
  const here = pluginQuery<string | null>(game, 'places/here')?.(state)
  if (typeof here !== 'string') return undefined
  if (here.includes(':')) return here as EntityRef
  return withTrait(state, game, CLOSET).find((ref) => parseRef(ref)?.id === here)
}

/**
 * Returns the wardrobe plugin for the game's `plugins`. The game declares its slots in `data.wardrobe.slots` and gives
 * each wearable thing the `wardrobe/wearable` trait (`wardrobe.wearable('coat')`).
 */
function wardrobePlugin(options: WardrobeOptions = {}): DefinedPlugin<WardrobeState, WardrobeView> {
  /** Puts a thing on a body, taking off what was in its slot, with the hooks of both. */
  const putOn = (state: GameState, ref: EntityRef, body: string, { game, apply }: Pick<PluginContext<WardrobeState>, 'game' | 'apply'>): GameState => {
    const { slot } = wearableOf(state, game, ref)!
    const before = wornBy(sliceOf(state), body)[slot] ?? null
    const slice = dressed(sliceOf(state), body, { [slot]: ref })
    let next: GameState = { ...state, plugins: { ...state.plugins, [ID]: { version: state.plugins?.[ID]?.version ?? 1, state: slice } } }
    if (before) next = apply(hooks(next, game, before, 'onTakeOff', options), next)
    return apply(hooks(next, game, ref, 'onWear', options), next)
  }
  /** Takes off whatever is in slots of a body, with each thing's hooks. */
  const takeOffSlots = (state: GameState, body: string, slots: string[], { game, apply }: Pick<PluginContext<WardrobeState>, 'game' | 'apply'>): GameState => {
    const worn = wornBy(sliceOf(state), body)
    const gone = slots.map((slot) => worn[slot]).filter((ref): ref is EntityRef => !!ref)
    const slice = dressed(sliceOf(state), body, Object.fromEntries(slots.map((slot) => [slot, null])))
    let next: GameState = { ...state, plugins: { ...state.plugins, [ID]: { version: state.plugins?.[ID]?.version ?? 1, state: slice } } }
    for (const ref of gone) next = apply(hooks(next, game, ref, 'onTakeOff', options), next)
    return next
  }

  return definePlugin<WardrobeState, WardrobeView, typeof CALLS>({
    id: ID,
    version: 1,
    calls: CALLS,
    data: DATA,
    traits: [wearableTrait, closetTrait, ownedTrait],
    // A closet is a place: where the player is comes from the places plugin, when the game has it.
    cooperates: ['places'],
    strings: {
      notClothing: 'The {thing} is not something you wear.',
      alreadyWearing: 'You are already wearing the {thing}.',
      haveNone: 'You have no {thing}.',
      nothingToTakeOff: 'There is nothing to take off.',
      // The view's buttons.
      takeOff: 'Take off',
      wear: 'Wear {thing}',
      // The button a place with the closet trait offers.
      open: 'Wardrobe',
    },
    // What the player starts in. A protagonist starts in nothing until they put something on.
    start: (game) => ({
      worn: { [PLAYER]: Object.fromEntries(slotsOf(game).map((slot) => [slot.id, slot.start ?? null])) },
      owned: {},
    }),
    receiver: {
      // Wearable things, unless the game carries clothes first.
      claims: (state, ref, { game }) => options.claims !== false && wearableOf(state, game, ref) !== undefined,
      receive: (state, ref, count, to, { game }) => setOwned(state, game, ref, to ?? YOU, ownedHere(state, game, ref, to ?? YOU) + count),
      owned: (state, ref, of, { game }) => ownedHere(state, game, ref, of ?? YOU),
      release: (state, ref, count, from, { game }) => setOwned(state, game, ref, from ?? YOU, ownedHere(state, game, ref, from ?? YOU) - count),
    },
    conditions: {
      /**
       * `{ 'wardrobe/wearing': { entity } }`: the thing is on whoever the player is playing.
       * With `slot` and no `entity`: something is in that slot. With both: that thing, in that slot.
       * With `at`: on that body instead, `'player'` or a protagonist.
       */
      wearing: (state, { entity, slot, at }, { slice, game }) => {
        const worn = wornBy(slice, resolveYou(state, at))
        if (slot !== undefined) {
          const on = worn[slot] ?? null
          return entity === undefined ? on !== null : on === entity
        }
        // Only the slots the game has now: a save can still hold one that was taken out.
        return entity !== undefined && slotsOf(game).some((entry) => worn[entry.id] === entity)
      },
    },
    effects: {
      add: (state, { entity, at, by }, { game }) => setOwned(state, game, entity, at ?? YOU, ownedHere(state, game, entity, at ?? YOU) + (by ?? 1)),
      remove: (state, { entity, at, by }, { game }) => setOwned(state, game, entity, at ?? YOU, ownedHere(state, game, entity, at ?? YOU) - (by ?? 1)),
      store: (state, { entity, at, by, via }, { game }) => {
        const body = resolveYou(state, at ?? YOU)
        let left = by ?? 1
        let next = state
        for (const id of othersOf(game, via)) {
          const there = Math.min(left, ownedCount(next, game, entity, body, id))
          if (!(there > 0)) continue
          next = releaseThing(next, game, entity, there, body, id)
          next = setOwned(next, game, entity, body, ownedHere(next, game, entity, body) + there)
          left -= there
        }
        return next
      },
      takeOut: (state, { entity, at, by, via }, { game }) => {
        const body = resolveYou(state, at ?? YOU)
        const to = othersOf(game, via)[0]
        const moving = Math.min(by ?? 1, ownedHere(state, game, entity, body))
        if (to === undefined || !(moving > 0)) return state
        return receiveThing(setOwned(state, game, entity, body, ownedHere(state, game, entity, body) - moving), game, entity, moving, body, to)
      },
    },
    values: {
      /** `{{wardrobe/owns entity=clothing:shirt}}`: how many of a thing the wardrobe of `at` (whoever is played if left out) has. */
      owns: (state, args, { game }) => ownedHere(state, game, String(args.entity ?? ''), typeof args.at === 'string' ? args.at : YOU),
    },
    commands: {
      /** `{ 'wardrobe/wear': { id } }`: put on the thing `id`, which you own. */
      wear: {
        whyNot: (state, { id: ref }, { slice, game }) => {
          if (!entityOf(state, game, ref)) return stringOf(game, 'noSuchThing')
          const wearable = wearableOf(state, game, ref)
          if (!wearable) return stringOf(game, 'wardrobe/notClothing', { thing: nameOf(state, game, ref) })
          if (wornBy(slice, protagonist(state))[wearable.slot] === ref) return stringOf(game, 'wardrobe/alreadyWearing', { thing: nameOf(state, game, ref) })
          if (ownedAnywhere(state, game, ref, protagonist(state)) <= 0) return stringOf(game, 'wardrobe/haveNone', { thing: nameOf(state, game, ref) })
          return undefined
        },
        run: (state, { id: ref }, context) => putOn(state, ref, protagonist(state), context),
      },
      /** `{ 'wardrobe/takeOff': { id } }`: take off what is in the slot `id`. */
      takeOff: {
        whyNot: (state, { id }, { slice, game }) => (wornBy(slice, protagonist(state))[id] ? undefined : stringOf(game, 'wardrobe/nothingToTakeOff')),
        run: (state, { id }, context) => takeOffSlots(state, protagonist(state), [id], context),
      },
    },
    // A place with the closet trait offers a button that opens the wardrobe panel.
    actions: (state, { game }) => {
      const place = room(state, game)
      const closet = place ? traitOf(state, game, place, CLOSET) : undefined
      if (!closet) return undefined
      return [{ id: 'open', label: closet.label ?? stringOf(game, `${ID}/open`), effects: [{ panel: ID }] }]
    },
    // Sold, given away, used up or no longer theirs to wear: whatever a body no longer owns anywhere comes off it.
    onCommand: (_before, after, context) => {
      let next = after
      for (const [body, slots] of Object.entries(sliceOf(after).worn)) {
        const gone = Object.entries(slots)
          .filter(([, ref]) => ref && ownedAnywhere(next, context.game, ref, body) <= 0)
          .map(([slot]) => slot)
        if (gone.length) next = takeOffSlots(next, body, gone, context)
      }
      return next
    },
    view: (state, { slice, game }): WardrobeView => {
      const body = protagonist(state)
      const on = wornBy(slice, body)
      const worn = new Set(Object.values(on))
      return {
        slots: slotsOf(game).map((slot) => {
          const entity = on[slot.id] ?? null
          return {
            id: slot.id,
            label: slot.label,
            entity,
            name: entity ? nameOf(state, game, entity) : null,
            takeOff: entity ? renderAction(state, game, { id: `takeOff.${slot.id}`, label: stringOf(game, `${ID}/takeOff`), command: takeOff(slot.id) }) : null,
          }
        }),
        spare: everyEntity(state, game).flatMap((ref) => {
          const wearable = wearableOf(state, game, ref)
          if (!wearable || worn.has(ref) || ownedAnywhere(state, game, ref, body) <= 0) return []
          const name = nameOf(state, game, ref)
          const button = renderAction(state, game, { id: `wear.${ref}`, label: stringOf(game, `${ID}/wear`, { thing: name }), command: wear(ref) })
          return [{ entity: ref, name, slot: wearable.slot, wear: button }]
        }),
      }
    },
    references: {
      content: (game) => DATA.slots.content(game, (slot) => (slot.start !== undefined ? [{ entity: slot.start }] : [])),
      calls: (_table, name, args) => ((name === 'store' || name === 'takeOut') && typeof args.via === 'string' ? [{ receiver: args.via }] : []),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      // Clothes were a list of items; now each is a thing with the wearable trait.
      for (const entry of (game.data?.[ID] as { clothes?: { id?: string }[] } | undefined)?.clothes ?? []) {
        problems.push({
          list: 'clothes',
          id: String(entry?.id ?? ''),
          what: `clothes are things with the ${WEARABLE} trait now: give the thing wearable("<slot>")`,
        })
      }
      for (const ref of declaredWithTrait(game, OWNED)) {
        if (isUnique(game, ref)) {
          const counts = ownerCounts(declaredTrait(game, ref, OWNED) as Owners | undefined)
          if (Object.keys(counts).length > 1 || Object.values(counts).some((count) => count > 1))
            problems.push({ list: 'entity', id: ref, what: 'a unique thing starts in one place, one of it' })
        }
      }
      for (const slot of slotsOf(game)) {
        const ref = slot.start
        if (ref === undefined) continue
        const def = game.entities?.find((entity) => `${entity.of}:${entity.id}` === ref)
        if (!def) continue
        if (declaredTrait(game, ref, WEARABLE)?.slot !== slot.id) {
          problems.push(DATA.slots.problem(slot.id, `starts with "${ref}", which is not worn in this slot`))
        } else if (options.claims !== false && !((ownerCounts(declaredTrait(game, ref, OWNED) as Owners | undefined)[PLAYER] ?? 0) > 0)) {
          // A game that carries clothes starts them wherever its other receiver says; this one says nothing of it.
          problems.push(DATA.slots.problem(slot.id, `starts with "${ref}", which the player does not own at the start: give it wardrobe.owned('player')`))
        }
      }
      return problems
    },
  })
}

/**
 * Returns the `wardrobe/wearable` trait for a slot, to spread into an entity's or a kind's `traits`, with the effects
 * that run when a body puts it on or takes it off.
 *
 * @example
 * traits: { ...wardrobe.wearable('body', { onWear: [{ kv: 'onDuty', to: true }], onTakeOff: [{ kv: 'onDuty', to: false }] }) }
 */
const wearable = (slot: string, hooks: { onWear?: EffectRef[]; onTakeOff?: EffectRef[] } = {}): { 'wardrobe/wearable': Wearable } => ({
  [WEARABLE]: { slot, ...(hooks.onWear ? { onWear: hooks.onWear } : {}), ...(hooks.onTakeOff ? { onTakeOff: hooks.onTakeOff } : {}) },
})

/**
 * Returns the `wardrobe/owned` trait, to spread into an entity's `traits`: whose wardrobe it starts in, or how many
 * each body starts with.
 *
 * @example
 * traits: { ...wardrobe.wearable('feet'), ...wardrobe.owned('player') }
 */
const owned = (owners: Owners): { 'wardrobe/owned': Owners } => ({ [OWNED]: owners })

/**
 * Returns the `wardrobe/closet` trait, to spread into a location's `traits`. The location then offers a button that
 * opens the `wardrobe` panel.
 *
 * @example
 * traits: { ...wardrobe.closet() }
 */
const closet = (options: Closet = {}): { 'wardrobe/closet': Closet } => ({ [CLOSET]: options })

/** Returns the `wardrobe/wearing` condition, which holds while whoever the player is playing wears the thing, in `slot` if given. */
const wearing = (entity: EntityRef, slot?: string): Condition => CALLS.conditions.wearing(slot === undefined ? { entity } : { entity, slot })
/** Returns the `wardrobe/wearing` condition for a slot, which holds while whoever the player is playing has something in it. */
const slotFilled = (slot: string): Condition => CALLS.conditions.wearing({ slot })
/** Returns the `wardrobe/wear` command, which puts on a thing the player owns. */
const wear = (entity: EntityRef): CommandRef => CALLS.commands.wear({ id: entity })
/** Returns the `wardrobe/takeOff` command, which takes off whatever is in the slot. */
const takeOff = (slot: string): CommandRef => CALLS.commands.takeOff({ id: slot })
/** Returns the `wardrobe/store` effect, which puts a thing someone carries away in their wardrobe. */
const store = (entity: EntityRef, options: { at?: Someone; by?: number; via?: string } = {}): EffectRef => CALLS.effects.store({ entity, ...options })
/** Returns the `wardrobe/takeOut` effect, which takes a thing out of someone's wardrobe into the next receiver. */
const takeOut = (entity: EntityRef, options: { at?: Someone; by?: number; via?: string } = {}): EffectRef => CALLS.effects.takeOut({ entity, ...options })

/**
 * The wardrobe plugin's factory, with its helpers as properties. `wardrobe()` returns the plugin for the game's
 * `plugins`, and content calls helpers such as `wardrobe.wearable('coat')` and `wardrobe.wear('clothing:scarf')`.
 */
export const wardrobe = Object.assign(wardrobePlugin, {
  /** Returns the `wardrobe/wearable` trait for a slot, with its `onWear` and `onTakeOff` effects, to spread into `traits`. */
  wearable,
  /** Returns the `wardrobe/owned` trait, to spread into an entity's `traits`, naming whose wardrobe it starts in. */
  owned,
  /** Returns the `wardrobe/closet` trait, to spread into a location's `traits`, which offers a button that opens the `wardrobe` panel. */
  closet,
  /** Returns the `wardrobe/wearing` condition, which holds while whoever the player is playing wears the thing, in `slot` if given. */
  wearing,
  /** Returns the `wardrobe/wearing` condition for a slot, which holds while whoever the player is playing has something in it. */
  slotFilled,
  /** Returns the `wardrobe/wear` command, which puts on a thing the player owns. */
  wear,
  /** Returns the `wardrobe/takeOff` command, which takes off whatever is in the slot. */
  takeOff,
  /** Returns the `wardrobe/store` effect, which puts a thing someone carries away in their wardrobe. */
  store,
  /** Returns the `wardrobe/takeOut` effect, which takes a thing out of someone's wardrobe into the next receiver. */
  takeOut,
})
