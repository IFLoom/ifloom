/**
 * Collections: named lists the game keeps entries in, such as photos taken,
 * notes written or a ledger. The helpers are in `collections.ts`.
 */
import { collect, discard, type CollectionDef, type CollectionEntry, type CollectionItem } from '../collections.ts'
import type { KvValue, Range } from '../types.ts'
import { defineFeature, mergedById } from './feature.ts'
import { bounded, inRange, wanted } from '../range.ts'

export type CollectionView = {
  name: string
  entries: {
    id: string
    title: string
    /** The entry's prose, filled in; empty if it has none. */
    text: string
    image: string | null
    data: Record<string, KvValue>
    /** The turn it was collected. */
    turn: number
  }[]
}

/** What the collections feature adds, as types. */
export type CollectionsShape = {
  state: {
    /** Each collection's entries, by collection id, oldest first. */
    collections: Record<string, CollectionEntry[]>
  }
  conditions: {
    /**
     * What is in a collection. With `entry`: that entry is there. Without: how
     * many entries there are, at least one if no range is given.
     */
    collection: { collection: string; entry?: string } & Range
  }
  effects: {
    /** Add an entry to a collection. An id already there is left as it is. */
    collect: { kind: 'collect'; collection: string; entry: CollectionItem }
    /** Take an entry out of a collection, by its id. */
    discard: { kind: 'discard'; collection: string; entry: string }
  }
  game: {
    /** Named lists the game keeps entries in: a gallery, notes, a ledger. */
    collections?: CollectionDef[]
  }
  pack: {
    collections?: CollectionDef[]
  }
  view: {
    /** Every declared collection, with its entries oldest first and their words filled in. */
    collections: Record<string, CollectionView>
  }
  lists: 'collection'
}

export const collections = defineFeature<CollectionsShape>({
  name: 'collections',
  state: {
    collections: { start: () => ({}), load: () => ({}) },
  },
  conditions: {
    collection: {
      holds: (state, condition) => {
        const entries = state.collections?.[condition.collection] ?? []
        if (condition.entry !== undefined) return entries.some((entry) => entry.id === condition.entry)
        if (!bounded(condition)) return entries.length > 0
        return inRange(entries.length, condition)
      },
      explain: (state, condition) => {
        const entries = state.collections?.[condition.collection] ?? []
        if (condition.entry !== undefined) {
          return `${condition.collection} ${entries.some((entry) => entry.id === condition.entry) ? 'has' : 'lacks'} ${condition.entry}; wants it there`
        }
        return `${condition.collection} has ${entries.length}; wants ${bounded(condition) ? wanted(condition) : 'at least 1'}`
      },
      references: (condition) => [{ collection: condition.collection }],
    },
  },
  effects: {
    collect: {
      apply: (state, effect, game) => collect(state, game, effect.collection, effect.entry),
      references: (effect) => [
        { collection: effect.collection },
        ...(effect.entry.text !== undefined ? [{ prose: effect.entry.text }] : []),
        ...(effect.entry.image !== undefined ? [{ picture: effect.entry.image, asWritten: true }] : []),
      ],
    },
    discard: {
      apply: (state, effect) => discard(state, effect.collection, effect.entry),
      references: (effect) => [{ collection: effect.collection }],
    },
  },
  pack: mergedById<CollectionsShape['game'], CollectionsShape['pack'], CollectionDef>(
    { base: (game) => game.collections, pack: (pack) => pack.collections },
    (game, list) => {
      game.collections = list
    },
  ),
  lists: ['collection'],
  check: (game, tools) =>
    tools.twice(
      'collection',
      'collections',
      (game.collections ?? []).map((entry) => entry.id),
    ),
  resolve: (game) => {
    const ids = new Set((game.collections ?? []).map((entry) => entry.id))
    return { collection: (ref) => (ids.has(ref.collection) ? [] : [`unknown collection "${ref.collection}"`]) }
  },
  view: (state, game) => ({
    collections: Object.fromEntries(
      (game.collections ?? []).map((collection) => [
        collection.id,
        {
          name: collection.name,
          entries: (state.collections?.[collection.id] ?? []).map((entry) => ({
            id: entry.id,
            title: entry.title ?? '',
            text: entry.text ? (game.prose?.line(entry.text, state) ?? '') : '',
            image: entry.image ?? null,
            data: entry.data ?? {},
            turn: entry.turn,
          })),
        },
      ]),
    ),
  }),
})
