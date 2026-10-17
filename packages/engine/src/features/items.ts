/**
 * Items: what the player carries and how many of each, and using one.
 */
import { say } from '../strings.ts'
import type { Game, ItemDef } from '../game.ts'
import type { Range } from '../types.ts'
import { defineFeature, mergedById } from './feature.ts'
import { bounded, inRange, wanted } from '../range.ts'

/** What the items feature adds, as types. */
export type ItemsShape = {
  state: {
    items: Record<string, number>
  }
  conditions: {
    /** How many of an item the player carries. Bare, at least one: `{ item: 'umbrella' }`. */
    item: { item: string } & Range
  }
  effects: {
    /** Change how many of an item the player carries `by` an amount, or put it `to` a count. Never below 0. */
    item: { kind: 'item'; item: string; by: number } | { kind: 'item'; item: string; to: number }
  }
  commands: {
    use: { type: 'use'; id: string }
  }
  game: {
    /** The things the player can carry. None if left out. */
    items?: ItemDef[]
  }
  pack: {
    items?: ItemDef[]
  }
  view: {
    pack: {
      id: string
      name: string
      desc: string
      count: number
      useLabel?: string
    }[]
  }
  lists: 'item'
  fill: 'items'
}

/** How many of an item a new game starts with: its `start`, else 0. */
export function itemStart(item: ItemDef): number {
  return item.start ?? 0
}

function itemById(game: Game, id: string): ItemDef | undefined {
  return (game.items ?? []).find((item) => item.id === id)
}

export const items = defineFeature<ItemsShape>({
  name: 'items',
  state: {
    items: { start: (game) => Object.fromEntries((game.items ?? []).map((item) => [item.id, itemStart(item)])) },
  },
  conditions: {
    item: {
      holds: (state, condition) => {
        const count = state.items[condition.item] ?? 0
        return bounded(condition) ? inRange(count, condition) : count > 0
      },
      explain: (state, condition) =>
        `item ${condition.item}: ${state.items[condition.item] ?? 0} carried; wants ${bounded(condition) ? wanted(condition) : 'at least 1'}`,
      references: (condition) => [{ item: condition.item }],
    },
  },
  effects: {
    item: {
      apply: (state, effect) => {
        const count = 'to' in effect ? effect.to : (state.items[effect.item] ?? 0) + effect.by
        return { ...state, items: { ...state.items, [effect.item]: Math.max(0, count) } }
      },
      references: (effect) => [{ item: effect.item }],
    },
  },
  commands: {
    use: {
      whyNot: (state, command, game) => {
        const item = itemById(game, command.id)
        if (!item) return say(game, 'noSuchThing')
        if (!item.use) return say(game, 'doesNothing', { item: item.name })
        return (state.items[command.id] ?? 0) > 0 ? undefined : say(game, 'haveNone', { item: item.name })
      },
      run: (state, command, game, cx) => {
        const item = itemById(game, command.id)!
        // Its effects read the state as it was before the item was spent, as an activity's do before its cost.
        return cx.runEffects(state, game, [{ kind: 'item', item: command.id, by: -1 }, ...cx.buildEffects(state, game, item.use!.effects)], false)
      },
      effectsOf: (state, command, game, cx) => {
        const item = itemById(game, command.id)
        return item?.use ? [{ kind: 'item', item: command.id, by: -1 }, ...cx.buildEffects(state, game, item.use.effects)] : []
      },
      references: (command) => [{ item: command.id }],
    },
  },
  // What the base game declares isn't merged: its items come from packs.
  pack: mergedById<ItemsShape['game'], ItemsShape['pack'], ItemDef>({ pack: (pack) => pack.items }, (game, list) => {
    game.items = list
  }),
  lists: ['item'],
  // An item the save lacks (one the game added since) starts at its start count.
  fill: {
    kind: 'items',
    run: (state, game) => {
      const lacking = (game.items ?? []).filter((item) => state.items?.[item.id] === undefined)
      if (!lacking.length) return state
      return { ...state, items: { ...state.items, ...Object.fromEntries(lacking.map((item) => [item.id, itemStart(item)])) } }
    },
  },
  // A New Game+ carries the counts of the items `carryOver` lists, or of every one.
  carry: {
    key: 'items',
    run: (fresh, game, from) => {
      const listed = game.carryOver?.items
      const items = { ...fresh.items }
      const ids = listed === 'all' ? Object.keys(items) : (listed ?? [])
      for (const id of ids) {
        if (id in items && typeof from.items?.[id] === 'number') items[id] = from.items[id]
      }
      return { items }
    },
    check: (game, tools) => {
      if (!Array.isArray(game.carryOver?.items)) return
      const ids = new Set((game.items ?? []).map((item) => item.id))
      for (const id of game.carryOver.items) if (!ids.has(id)) tools.problem(undefined, 'carryOver', `unknown item "${id}"`)
    },
  },
  check: (game, tools) => {
    tools.twice('item', 'items', (game.items ?? []).map((entry) => entry.id))
    for (const item of game.items ?? []) tools.check({ list: 'item', id: item.id }, `item ${item.id}`, [{ effects: item.use?.effects }])
  },
  resolve: (game) => {
    const ids = new Set((game.items ?? []).map((item) => item.id))
    return { item: (ref) => (ids.has(ref.item) ? [] : [`unknown item "${ref.item}"`]) }
  },
  // The items the player has at least one of, in the order the game lists them.
  view: (state, game) => ({
    pack: (game.items ?? [])
      .map((item) => ({
        id: item.id,
        name: item.name,
        desc: item.desc,
        count: state.items[item.id] ?? 0,
        useLabel: item.use?.label,
      }))
      .filter((item) => item.count > 0),
  }),
})
