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
  definePlugin,
  entityName,
  entityOf,
  entityTrait,
  heldBy,
  heldCount,
  parseRef,
  PLAYER,
  protagonist,
  resolveHolder,
  stringOf,
  traitOf,
  withTrait,
  YOU,
  type CommandRef,
  type Condition,
  type DefinedPlugin,
  type EntityRef,
  type Game,
  type GameState,
  type PluginProblem,
  type TraitDef,
} from '@ifloom/engine'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

/** What the `wardrobe/wearable` trait holds: the slot a thing is worn in. */
export type Wearable = {
  /** The slot it goes in, by id: `'coat'`. */
  slot: string
}

declare module '@ifloom/engine' {
  interface TraitRegistry {
    'wardrobe/wearable': Wearable
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
  /** Every slot, in order, with what is in it on whoever the player is playing now. */
  slots: { id: string; label: string; entity: EntityRef | null; name: string | null }[]
  /** Wearable things you hold and aren't wearing, in the game's order of its entities. */
  spare: { entity: EntityRef; name: string; slot: string }[]
}

/**
 * What content writes for each of the plugin's calls, its queries' answers
 * and its view, so a call with a misspelled argument fails to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry {
    'wardrobe/wearing': { entity?: EntityRef; slot?: string; at?: string }
  }
  interface CommandRegistry {
    'wardrobe/wear': { id: EntityRef }
    'wardrobe/takeOff': { id: string }
  }
  interface ViewRegistry {
    wardrobe: WardrobeView
  }
}

const ID = 'wardrobe'
const WEARABLE = 'wardrobe/wearable'

/** The game's slots, in the order the UI lists them: `data.wardrobe.slots`, from its content and packs. */
export function slotsOf(game: Game): WardrobeSlot[] {
  return (game.data?.[ID]?.slots ?? []) as WardrobeSlot[]
}

/** The slot a thing is worn in, if it can be worn: its `wardrobe/wearable` trait, read through what it was made `like`. */
export function wearableOf(state: GameState, game: Game, ref: string): Wearable | undefined {
  return entityTrait(state, game, ref, WEARABLE)
}

function nameOf(state: GameState, game: Game, ref: string): string {
  return entityOf(state, game, ref) ? entityName(state, game, ref) : (parseRef(ref)?.id ?? ref)
}

const wearableTrait: TraitDef<'wardrobe/wearable'> = {
  id: WEARABLE,
  check: (data) => (typeof data?.slot === 'string' && data.slot !== '' ? [] : ['a wearable thing needs a slot: { slot: "coat" }']),
  references: (data) => (typeof data?.slot === 'string' ? [{ entry: data.slot, plugin: ID, list: 'slots', noun: 'slot' }] : []),
}

/** Version 1 kept item ids in the slots; an item's id is the id of the wearable entity that took its place. */
function fromItems(old: unknown, game: Game): { worn: Record<string, EntityRef | null> } {
  const worn = ((old as { worn?: Record<string, string | null> } | undefined)?.worn ?? {}) as Record<string, string | null>
  const wearables = withTrait(game, WEARABLE)
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
 * `wardrobe/wearable` trait (`wearable('coat')`), so a mod can add either.
 */
export function wardrobe(): DefinedPlugin<WardrobeState, WardrobeView> {
  return definePlugin<WardrobeState, WardrobeView>({
    id: ID,
    version: 3,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    commandVersion: COMMAND_VERSION,
    commandMigrations,
    migrations: {
      1: (old, { game }) => fromItems(old, game),
      // Whoever was played when the save was made was the one wearing it.
      2: (old, { fill }) => perBody(old, protagonist(fill([]))),
    },
    traits: [wearableTrait],
    strings: {
      notClothing: 'The {thing} is not something you wear.',
      alreadyWearing: 'You are already wearing the {thing}.',
      haveNone: 'You have no {thing}.',
      nothingToTakeOff: 'There is nothing to take off.',
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
      wearing: (state, args, { slice, game }) => {
        const entity = args.entity === undefined ? undefined : String(args.entity)
        const slot = args.slot === undefined ? undefined : String(args.slot)
        const worn = wornBy(slice, resolveHolder(state, args.at === undefined ? YOU : String(args.at)))
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
        whyNot: (state, args, { slice, game }) => {
          const ref = String(args.id ?? '')
          if (!entityOf(state, game, ref)) return stringOf(game, 'noSuchThing')
          const wearable = wearableOf(state, game, ref)
          if (!wearable) return stringOf(game, 'wardrobe/notClothing', { thing: nameOf(state, game, ref) })
          if (wornBy(slice, protagonist(state))[wearable.slot] === ref) return stringOf(game, 'wardrobe/alreadyWearing', { thing: nameOf(state, game, ref) })
          if (heldCount(state, game, ref, YOU) <= 0) return stringOf(game, 'wardrobe/haveNone', { thing: nameOf(state, game, ref) })
          return undefined
        },
        run: (state, args, { slice, set, game }) => {
          const ref = String(args.id) as EntityRef
          const { slot } = wearableOf(state, game, ref)!
          return set(dressed(slice, protagonist(state), { [slot]: ref }))
        },
      },
      /** `{ 'wardrobe/takeOff': { id } }`: take off what is in the slot `id`. */
      takeOff: {
        whyNot: (state, args, { slice, game }) =>
          wornBy(slice, protagonist(state))[String(args.id ?? '')] ? undefined : stringOf(game, 'wardrobe/nothingToTakeOff'),
        run: (state, args, { slice, set }) => set(dressed(slice, protagonist(state), { [String(args.id)]: null })),
      },
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
          return { id: slot.id, label: slot.label, entity, name: entity ? nameOf(state, game, entity) : null }
        }),
        spare: heldBy(state, game, YOU).flatMap(({ ref }) => {
          const wearable = wearableOf(state, game, ref)
          return wearable && !worn.has(ref) ? [{ entity: ref, name: nameOf(state, game, ref), slot: wearable.slot }] : []
        }),
      }
    },
    references: {
      // The thing a condition or `wear` names, and the slot a condition or `takeOff` names.
      calls: (table, name, args) => {
        const entity = table === 'commands' ? (name === 'wear' ? args.id : undefined) : args.entity
        const slot = table === 'commands' ? (name === 'takeOff' ? args.id : undefined) : args.slot
        return [
          ...(entity === undefined ? [] : [{ entity: String(entity) }]),
          ...(slot === undefined ? [] : [{ entry: String(slot), plugin: ID, list: 'slots', noun: 'slot' }]),
          ...(table === 'conditions' && args.at !== undefined ? [{ holder: String(args.at) }] : []),
        ]
      },
      content: (game) =>
        slotsOf(game)
          .filter((slot) => slot.start !== undefined)
          .map((slot) => ({ list: 'slots', id: slot.id, refs: [{ entity: slot.start! }] })),
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
        if (traitOf(game, ref, WEARABLE)?.slot !== slot.id) {
          problems.push({ list: 'slots', id: slot.id, what: `starts with "${ref}", which is not worn in this slot` })
        } else if (!(def.at === 'player' || (typeof def.at === 'object' && (def.at.player ?? 0) > 0))) {
          problems.push({ list: 'slots', id: slot.id, what: `starts with "${ref}", which the player does not start holding` })
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
export const wearable = (slot: string): { 'wardrobe/wearable': Wearable } => ({ [WEARABLE]: { slot } })

/** A condition: the thing is on whoever the player is playing, or, with a slot, on in that slot. */
export const wearing = (entity: EntityRef, slot?: string): Condition => ({ [`${ID}/wearing`]: slot === undefined ? { entity } : { entity, slot } })
/** A condition: something is in this slot. */
export const slotFilled = (slot: string): Condition => ({ [`${ID}/wearing`]: { slot } })
/** A command: put this on. */
export const wear = (entity: EntityRef): CommandRef => ({ [`${ID}/wear`]: { id: entity } })
/** A command: take off whatever is in this slot. */
export const takeOff = (slot: string): CommandRef => ({ [`${ID}/takeOff`]: { id: slot } })
