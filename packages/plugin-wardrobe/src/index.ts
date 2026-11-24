/**
 * @ifloom/plugin-wardrobe — slots the game declares, the things that go in
 * them, and what you have on.
 *
 * Clothes are entities with the `wardrobe/wearable` trait, which names the
 * slot each goes in. You wear only what you hold, and wearing something
 * doesn't change how many you hold: the wardrobe only marks what is on.
 * Putting something on takes off whatever was in its slot. Something you no
 * longer hold comes off by itself. The slots are the game's: a coat and
 * boots, armour and a ring, a uniform with a cap.
 *
 * What is worn is kept per body: the player's, and each protagonist's the
 * game switches to with the `you` effect, so switching shows that one's
 * clothes and switching back the first's.
 */
import {
  declaredTrait,
  declaredWithTrait,
  entityName,
  entityOf,
  heldBy,
  heldCount,
  parseRef,
  PLAYER,
  pluginQuery,
  protagonist,
  resolveHolder,
  stringOf,
  traitOf,
  YOU,
  type CommandRef,
  type Condition,
  type EntityRef,
  type Game,
  type GameState,
  type RenderedChoice,
} from '@ifloom/engine'
import {
  arg,
  defineCalls,
  defineData,
  definePlugin,
  list,
  renderAction,
  type CommandsOf,
  type ConditionsOf,
  type DefinedPlugin,
  type PluginProblem,
  type TraitDef,
} from '@ifloom/engine/plugin'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

/** What the `wardrobe/wearable` trait holds: the slot a thing is worn in. */
export type Wearable = {
  /** The slot it goes in, by id: `'coat'`. */
  slot: string
}

/**
 * What the `wardrobe/closet` trait holds: a place where the player can
 * change. The place gets a button that opens the `wardrobe` panel.
 */
export type Closet = {
  /** The button's words. The `wardrobe/open` string (`Wardrobe`) if left out. */
  label?: string
}

declare module '@ifloom/engine' {
  interface TraitRegistry {
    'wardrobe/wearable': Wearable
    'wardrobe/closet': Closet
  }
}

/** A place on the body something can be worn. */
export type WardrobeSlot = {
  id: string
  label: string
  /** What you have on in it at the start: a wearable thing the player starts holding. Nothing if left out. */
  start?: EntityRef
}

/**
 * What the plugin keeps in a save: what each body has on, by who wears it
 * (`'player'`, or a protagonist such as `'character:sam'`), then by slot.
 */
export type WardrobeState = { worn: Record<string, Record<string, EntityRef | null>> }

export type WardrobeView = {
  /**
   * Every slot, in order, with what is in it on whoever the player is
   * playing now, and the button that takes it off (labelled with the
   * `wardrobe/takeOff` string, `Take off`), or null while it's empty.
   */
  slots: { id: string; label: string; entity: EntityRef | null; name: string | null; takeOff: RenderedChoice | null }[]
  /**
   * Wearable things you hold and aren't wearing, in the game's order of its
   * entities, each with the button that puts it on (labelled with the
   * `wardrobe/wear` string, `Wear {thing}`).
   */
  spare: { entity: EntityRef; name: string; slot: string; wear: RenderedChoice }[]
}

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    wardrobe: WardrobeView
  }
}

const ID = 'wardrobe'
const WEARABLE = 'wardrobe/wearable'
const CLOSET = 'wardrobe/closet'

/** The plugin's one list, `slots`, as content writes it in `data.wardrobe.slots` (a plugin's `data` holds its lists by name), with the words a player reads in each, for a translation's `words` table. */
const DATA = defineData(ID, { slots: list<WardrobeSlot>({ noun: 'slot', words: { label: true } }) })

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** Wearing the thing `entity`, or anything in `slot`, or that thing in that slot; on whoever is played, or `at`. */
    wearing: { entity: arg.entity().optional(), slot: arg.entry(DATA.slots).optional(), at: arg.holder().optional(YOU) },
  },
  commands: {
    /** Put on the thing `id`, which you hold. */
    wear: { id: arg.entity() },
    /** Take off what is in the slot `id`. */
    takeOff: { id: arg.entry(DATA.slots) },
  },
})

/** The game's slots, in the order the UI lists them: `data.wardrobe.slots`, from its content and packs. */
export function slotsOf(game: Game): WardrobeSlot[] {
  return DATA.slots.all(game)
}

/** The slot a thing is worn in, if it can be worn: its `wardrobe/wearable` trait, read through what it was made `like`. */
export function wearableOf(state: GameState, game: Game, ref: string): Wearable | undefined {
  return traitOf(state, game, ref, WEARABLE)
}

function nameOf(state: GameState, game: Game, ref: string): string {
  return entityOf(state, game, ref) ? entityName(state, game, ref) : (parseRef(ref)?.id ?? ref)
}

const wearableTrait: TraitDef<'wardrobe/wearable'> = {
  id: WEARABLE,
  check: (data) => (typeof data?.slot === 'string' && data.slot !== '' ? [] : ['a wearable thing needs a slot: { slot: "coat" }']),
  references: (data) => (typeof data?.slot === 'string' ? [DATA.slots.ref(data.slot)] : []),
}

const closetTrait: TraitDef<'wardrobe/closet'> = {
  id: CLOSET,
  words: { label: true },
  check: (data) =>
    data === undefined || data === null || typeof data !== 'object' || (data.label !== undefined && typeof data.label !== 'string')
      ? ['a closet’s label must be words: { label: "Wardrobe" }']
      : [],
}

/** Version 1 kept item ids in the slots; an item's id is the id of the wearable entity that took its place. */
function fromItems(old: unknown, game: Game): { worn: Record<string, EntityRef | null> } {
  const worn = ((old as { worn?: Record<string, string | null> } | undefined)?.worn ?? {}) as Record<string, string | null>
  const wearables = declaredWithTrait(game, WEARABLE)
  const refOf = (item: string | null): EntityRef | null => {
    if (item === null) return null
    if (wearables.includes(item as EntityRef)) return item as EntityRef
    return wearables.find((ref) => parseRef(ref)?.id === item) ?? null
  }
  return { worn: Object.fromEntries(Object.entries(worn).map(([slot, item]) => [slot, refOf(item)])) }
}

/** Version 2 kept one set of slots, worn by whoever was played: now it is theirs, among each body's own. */
function perBody(old: unknown, you: string): WardrobeState {
  const worn = (old as { worn?: Record<string, EntityRef | null> } | undefined)?.worn ?? {}
  return { worn: { [you]: worn } }
}

/** What one body has on, slot by slot: nothing in a slot it never filled. */
function wornBy(slice: WardrobeState, holder: string): Record<string, EntityRef | null> {
  return slice.worn[holder] ?? {}
}

/** The slice with one body's slots changed. */
function dressed(slice: WardrobeState, holder: string, slots: Record<string, EntityRef | null>): WardrobeState {
  return { worn: { ...slice.worn, [holder]: { ...wornBy(slice, holder), ...slots } } }
}

/**
 * The plugin. Add it to the game's `plugins`, put the slots in the content's
 * `data.wardrobe.slots`, and give each thing that can be worn the
 * `wardrobe/wearable` trait (`wardrobe.wearable('coat')`), so a mod can add either.
 */
function wardrobePlugin(): DefinedPlugin<WardrobeState, WardrobeView> {
  return definePlugin<WardrobeState, WardrobeView, typeof CALLS>({
    id: ID,
    version: 3,
    calls: CALLS,
    data: DATA,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    commandVersion: COMMAND_VERSION,
    commandMigrations,
    migrations: {
      1: (old, { game }) => fromItems(old, game),
      // Whoever was played when the save was made was the one wearing it.
      2: (old, { fill }) => perBody(old, protagonist(fill([]))),
    },
    traits: [wearableTrait, closetTrait],
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
    }),
    conditions: {
      /**
       * `{ 'wardrobe/wearing': { entity } }`: the thing is on whoever the player is playing.
       * With `slot` and no `entity`: something is in that slot. With both: that thing, in that slot.
       * With `at`: on that body instead, `'player'` or a protagonist.
       */
      wearing: (state, { entity, slot, at }, { slice, game }) => {
        const worn = wornBy(slice, resolveHolder(state, at))
        if (slot !== undefined) {
          const on = worn[slot] ?? null
          return entity === undefined ? on !== null : on === entity
        }
        // Only the slots the game has now: a save can still hold one that was taken out.
        return entity !== undefined && slotsOf(game).some((entry) => worn[entry.id] === entity)
      },
    },
    commands: {
      /** `{ 'wardrobe/wear': { id } }`: put on the thing `id`, which you hold. */
      wear: {
        whyNot: (state, { id: ref }, { slice, game }) => {
          if (!entityOf(state, game, ref)) return stringOf(game, 'noSuchThing')
          const wearable = wearableOf(state, game, ref)
          if (!wearable) return stringOf(game, 'wardrobe/notClothing', { thing: nameOf(state, game, ref) })
          if (wornBy(slice, protagonist(state))[wearable.slot] === ref) return stringOf(game, 'wardrobe/alreadyWearing', { thing: nameOf(state, game, ref) })
          if (heldCount(state, game, ref, YOU) <= 0) return stringOf(game, 'wardrobe/haveNone', { thing: nameOf(state, game, ref) })
          return undefined
        },
        run: (state, { id: ref }, { slice, set, game }) => {
          const { slot } = wearableOf(state, game, ref)!
          return set(dressed(slice, protagonist(state), { [slot]: ref }))
        },
      },
      /** `{ 'wardrobe/takeOff': { id } }`: take off what is in the slot `id`. */
      takeOff: {
        whyNot: (state, { id }, { slice, game }) => (wornBy(slice, protagonist(state))[id] ? undefined : stringOf(game, 'wardrobe/nothingToTakeOff')),
        run: (state, { id }, { slice, set }) => set(dressed(slice, protagonist(state), { [id]: null })),
      },
    },
    // A place with the closet trait offers a button that opens the wardrobe panel.
    actions: (state, { game }) => {
      const place = pluginQuery(game, 'places/holder')?.(state)
      const closet = place ? traitOf(state, game, place, CLOSET) : undefined
      if (!closet) return undefined
      return [{ id: 'open', label: closet.label ?? stringOf(game, `${ID}/open`), effects: [{ panel: ID }] }]
    },
    // Sold, given away, used up or no longer theirs to wear: whatever a body no longer holds comes off it.
    onCommand: (_before, after, { slice, set, game }) => {
      let next = slice
      for (const [holder, slots] of Object.entries(slice.worn)) {
        const gone = Object.entries(slots).filter(([, ref]) => ref && heldCount(after, game, ref, holder) <= 0)
        if (gone.length) next = dressed(next, holder, Object.fromEntries(gone.map(([slot]) => [slot, null])))
      }
      return next === slice ? after : set(next)
    },
    view: (state, { slice, game }): WardrobeView => {
      const on = wornBy(slice, protagonist(state))
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
        spare: heldBy(state, game, YOU).flatMap(({ ref }) => {
          const wearable = wearableOf(state, game, ref)
          if (!wearable || worn.has(ref)) return []
          const name = nameOf(state, game, ref)
          const button = renderAction(state, game, { id: `wear.${ref}`, label: stringOf(game, `${ID}/wear`, { thing: name }), command: wear(ref) })
          return [{ entity: ref, name, slot: wearable.slot, wear: button }]
        }),
      }
    },
    references: {
      content: (game) => DATA.slots.content(game, (slot) => (slot.start !== undefined ? [{ entity: slot.start }] : [])),
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
      for (const slot of slotsOf(game)) {
        const ref = slot.start
        if (ref === undefined) continue
        const def = game.entities?.find((entity) => `${entity.of}:${entity.id}` === ref)
        if (!def) continue
        if (declaredTrait(game, ref, WEARABLE)?.slot !== slot.id) {
          problems.push(DATA.slots.problem(slot.id, `starts with "${ref}", which is not worn in this slot`))
        } else if (!(def.at === 'player' || (typeof def.at === 'object' && (def.at.player ?? 0) > 0))) {
          problems.push(DATA.slots.problem(slot.id, `starts with "${ref}", which the player does not start holding`))
        }
      }
      return problems
    },
  })
}

/**
 * The `wardrobe/wearable` trait, to spread into an entity's or a kind's
 * `traits`: `traits: { ...wearable('coat') }`.
 */
const wearable = (slot: string): { 'wardrobe/wearable': Wearable } => ({ [WEARABLE]: { slot } })

/**
 * The `wardrobe/closet` trait, to spread into a place's `traits`: the place
 * gets a button that opens the `wardrobe` panel. `traits: { ...wardrobe.closet() }`.
 */
const closet = (options: Closet = {}): { 'wardrobe/closet': Closet } => ({ [CLOSET]: options })

/** A condition: the thing is on whoever the player is playing, or, with a slot, on in that slot. */
const wearing = (entity: EntityRef, slot?: string): Condition => CALLS.conditions.wearing(slot === undefined ? { entity } : { entity, slot })
/** A condition: something is in this slot. */
const slotFilled = (slot: string): Condition => CALLS.conditions.wearing({ slot })
/** A command: put this on. */
const wear = (entity: EntityRef): CommandRef => CALLS.commands.wear({ id: entity })
/** A command: take off whatever is in this slot. */
const takeOff = (slot: string): CommandRef => CALLS.commands.takeOff({ id: slot })

/**
 * The plugin, with its helpers on it: `wardrobe()` makes the plugin for the
 * game's `plugins`, and content is written with `wardrobe.wearable('coat')` and `wardrobe.wear('clothing:scarf')`.
 */
export const wardrobe = Object.assign(wardrobePlugin, { wearable, closet, wearing, slotFilled, wear, takeOff })
