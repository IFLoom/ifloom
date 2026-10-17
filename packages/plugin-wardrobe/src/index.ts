/**
 * @ifloom/plugin-wardrobe — slots the game declares, clothes that go in them,
 * and what the player has on.
 *
 * Clothes are ordinary items, and wearing one doesn't change how many the
 * player has: the wardrobe only marks what is on. Putting something on takes
 * off whatever was in its slot. Something the player no longer has comes off
 * by itself. The slots are the game's: a coat and boots, armour and a ring,
 * a uniform with a cap.
 */
import { definePlugin, itemById, itemStart, say, type Command, type Condition, type Game, type PluginProblem } from '@ifloom/engine'

/** A place on the body something can be worn. */
export type WardrobeSlot = { id: string; label: string }

/** An item that can be worn, and where. */
export type ClothingDef = { id: string; slot: string }

export type WardrobeOptions = {
  /** In the order the UI lists them. */
  slots: WardrobeSlot[]
  /** What the player has on at the start, by slot. The player has to start with each one. */
  start?: Record<string, string>
}

/** What the plugin keeps in a save: what is in each slot. */
export type WardrobeState = { worn: Record<string, string | null> }

export type WardrobeView = {
  /** Every slot, in order, with what is in it. */
  slots: { id: string; label: string; item: string | null; name: string | null }[]
  /** Clothes the player has and isn't wearing. */
  spare: { id: string; name: string; slot: string }[]
}

const ID = 'wardrobe'

/** The game's clothes: `data.wardrobe.clothes`, from its packs. */
export function clothes(game: Game): ClothingDef[] {
  return (game.data?.[ID]?.clothes ?? []) as ClothingDef[]
}

function clothing(game: Game, id: string): ClothingDef | undefined {
  return clothes(game).find((entry) => entry.id === id)
}

/** How many of an item a new game starts with, as the engine counts it. */
function startCount(game: Game, id: string): number {
  const item = itemById(game, id)
  return item ? itemStart(item) : 0
}

function name(game: Game, id: string): string {
  return itemById(game, id)?.name ?? id
}

/**
 * The plugin. Add it to the game's `plugins` with the slots the game has, and
 * put clothes — which item goes in which slot — in a pack's `data.wardrobe.clothes`.
 */
export function wardrobe(options: WardrobeOptions) {
  const slotIds = new Set(options.slots.map((slot) => slot.id))
  return definePlugin<WardrobeState>({
    id: ID,
    version: 1,
    strings: {
      notClothing: 'The {item} is not something you wear.',
      alreadyWearing: 'You are already wearing the {item}.',
      nothingToTakeOff: 'There is nothing to take off.',
    },
    start: () => ({
      worn: Object.fromEntries(options.slots.map((slot) => [slot.id, options.start?.[slot.id] ?? null])),
    }),
    conditions: {
      /**
       * `{ custom: 'wardrobe/wearing', with: { item } }`: the item is on.
       * With `slot` and no `item`: something is in that slot. With both: that item, in that slot.
       */
      wearing: (_state, args, { slice }) => {
        const item = args.item === undefined ? undefined : String(args.item)
        const slot = args.slot === undefined ? undefined : String(args.slot)
        if (slot !== undefined) {
          const worn = slice.worn[slot] ?? null
          return item === undefined ? worn !== null : worn === item
        }
        // Only the slots the game has now: a save can still hold one that was taken out.
        return item !== undefined && options.slots.some((entry) => slice.worn[entry.id] === item)
      },
    },
    commands: {
      /** `{ type: 'custom', name: 'wardrobe/wear', with: { id } }`: put on the item `id`. */
      wear: {
        whyNot: (state, args, { slice, game }) => {
          const id = String(args.id ?? '')
          const def = clothing(game, id)
          if (!def) return itemById(game, id) ? say(game, 'wardrobe/notClothing', { item: name(game, id) }) : say(game, 'noSuchThing')
          if (slice.worn[def.slot] === id) return say(game, 'wardrobe/alreadyWearing', { item: name(game, id) })
          if ((state.items[id] ?? 0) <= 0) return say(game, 'haveNone', { item: name(game, id) })
          return undefined
        },
        run: (_state, args, { slice, set, game }) => {
          const id = String(args.id)
          const { slot } = clothing(game, id)!
          return set({ worn: { ...slice.worn, [slot]: id } })
        },
      },
      /** `{ type: 'custom', name: 'wardrobe/takeOff', with: { id } }`: take off what is in the slot `id`. */
      takeOff: {
        whyNot: (_state, args, { slice, game }) =>
          slice.worn[String(args.id ?? '')] ? undefined : say(game, 'wardrobe/nothingToTakeOff'),
        run: (_state, args, { slice, set }) => set({ worn: { ...slice.worn, [String(args.id)]: null } }),
      },
    },
    hooks: {
      // Sold, lost or used up: whatever the player no longer has comes off.
      after: (_before, after, { slice, set }) => {
        const gone = Object.entries(slice.worn).filter(([, item]) => item && (after.items[item] ?? 0) <= 0)
        if (!gone.length) return after
        return set({ worn: { ...slice.worn, ...Object.fromEntries(gone.map(([slot]) => [slot, null])) } })
      },
    },
    view: (state, { slice, game }): WardrobeView => ({
      slots: options.slots.map((slot) => {
        const item = slice.worn[slot.id] ?? null
        return { id: slot.id, label: slot.label, item, name: item ? name(game, item) : null }
      }),
      spare: clothes(game)
        .filter((entry) => (state.items[entry.id] ?? 0) > 0 && slice.worn[entry.slot] !== entry.id)
        .map((entry) => ({ id: entry.id, name: name(game, entry.id), slot: entry.slot })),
    }),
    references: {
      // The item a condition or `wear` names.
      calls: (kind, name, args) => {
        const item = kind === 'commands' ? (name === 'wear' ? args.id : undefined) : args.item
        return item === undefined ? [] : [{ item: String(item) }]
      },
      // A piece of clothing is an item, by its id.
      content: (game) => clothes(game).map((entry) => ({ list: 'clothes', id: entry.id, refs: [{ item: entry.id }] })),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const entry of clothes(game)) {
        if (!slotIds.has(entry.slot)) problems.push({ list: 'clothes', id: entry.id, what: `no slot called "${entry.slot}"` })
      }
      for (const [slot, item] of Object.entries(options.start ?? {})) {
        if (!slotIds.has(slot)) problems.push({ list: 'start', id: slot, what: 'no slot by this name' })
        else if (clothing(game, item)?.slot !== slot) {
          problems.push({ list: 'start', id: slot, what: `"${item}" is not clothing for this slot` })
        } else if (startCount(game, item) <= 0) {
          problems.push({ list: 'start', id: slot, what: `the player does not start with "${item}"` })
        }
      }
      return problems
    },
  })

}

/** A condition: the item is on, or, with a slot, on in that slot. */
export const wearing = (item: string, slot?: string): Condition => ({
  custom: 'wardrobe/wearing',
  with: slot === undefined ? { item } : { item, slot },
})
/** A condition: something is in this slot. */
export const slotFilled = (slot: string): Condition => ({ custom: 'wardrobe/wearing', with: { slot } })
/** A command: put this on. */
export const wear = (item: string): Command => ({ type: 'custom', name: 'wardrobe/wear', with: { id: item } })
/** A command: take off whatever is in this slot. */
export const takeOff = (slot: string): Command => ({ type: 'custom', name: 'wardrobe/takeOff', with: { id: slot } })
