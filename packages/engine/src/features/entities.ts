/**
 * Entities and kinds: the things a game keeps several of, each with its own
 * stats and kv keys, such as a café's staff or the dishes on its menu. The
 * helpers are in `entities.ts`.
 */
import {
  anyOf,
  bindCurrent,
  entitiesOf,
  entityOf,
  newEntity,
  ofKind,
  parseRef,
  removeEntity,
  startingEntities,
  writeEntity,
  type EntityDef,
  type EntityState,
  type KindDef,
} from '../entities.ts'
import type { EffectRef } from '../custom.ts'
import type { Game } from '../game.ts'
import type { Condition, KvValue, GameState, Range } from '../types.ts'
import { defineFeature, inRange, wanted, type FeatureContext, type PackMerge } from './feature.ts'
import { statView, type StatView } from './stats.ts'

/** One entity as the UI draws it. */
export type EntityView = {
  id: string
  /** How content names it: `'staff:ana'`. */
  ref: string
  name: string
  /** Its kind's listed stats that the player can see on it, in declared order. */
  stats: StatView[]
  kv: Record<string, KvValue>
}

export type EntitiesView = {
  label: string
  plural: string
  entries: EntityView[]
}

/** What the entities feature adds, as types. */
export type EntitiesShape = {
  state: {
    /** The things the game keeps several of, by kind and id: `entities.staff.ana`. */
    entities: Record<string, Record<string, EntityState>>
    /** How many of each kind have been created in play, for the next one's id. */
    created: Record<string, number>
    /**
     * Entities the game declared that were removed in play, by reference. A
     * declared entity a save does not have is added when it loads (a mod's new
     * character, say) unless it is here: gone for good.
     */
    removed: string[]
  }
  conditions: {
    /**
     * How many entities of a kind there are, or with `where`, how many it holds
     * for (`'$'` in it is each one in turn). Bare, at least one:
     * `{ count: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, gte: 2 }`.
     */
    count: { count: string; where?: Condition } & Range
    /** An entity is in the game: `{ entity: 'staff:ana' }`. */
    entity: { entity: string }
  }
  effects: {
    /**
     * A new entity of a kind. Its `id` is the next free number (`#1`, `#2`) if
     * left out, never reused; an id already there is left as it is.
     */
    create: { kind: 'create'; of: string; entity: { id?: string; name: string; stats?: Record<string, number>; kv?: Record<string, KvValue> } }
    /** Take an entity out of the game: `{ kind: 'remove', of: 'staff:ana' }`. */
    remove: { kind: 'remove'; of: string }
    /**
     * The same effects for every entity of a kind (where `where` holds), one
     * after another, with `'$'` as the one each time: wages, upkeep, a bad week.
     */
    each: { kind: 'each'; of: string; where?: Condition; effects: EffectRef[] }
  }
  game: {
    /** The kinds of thing the game keeps several of, each with its own stats. */
    kinds?: KindDef[]
    /** The things of those kinds there are at the start. More can be created in play. */
    entities?: EntityDef[]
  }
  pack: {
    /** Kinds of thing the game keeps several of. A later pack can redeclare one by id. */
    kinds?: KindDef[]
    /** Things of those kinds there at the start. A later pack can redeclare one by kind and id. */
    entities?: EntityDef[]
  }
  view: {
    /** Each kind's entities, by kind id, in the order they came. Every declared kind is here, empty or not. */
    entities: Record<string, EntitiesView>
  }
  lists: 'kind' | 'entity'
  fill: 'entities'
}

/** How many entities of a kind a `count` condition counts. */
function counting(state: GameState, condition: EntitiesShape['conditions']['count'], game: Game | undefined, cx: FeatureContext): number {
  const refs = entitiesOf(state, condition.count)
  return condition.where ? refs.filter((ref) => cx.holds(state, bindCurrent(condition.where, ref), game)).length : refs.length
}

/** The kinds the game declares, with the ones its plugins bring. */
function kindIds(game: Game): Set<string> {
  return new Set([...(game.kinds ?? []), ...(game.plugins ?? []).flatMap((plugin) => plugin.kinds ?? [])].map((kind) => kind.id))
}

/**
 * Kinds by id and entities by kind and id: a later pack's replaces an earlier
 * one's. The plugins' kinds come first, so the game's own redeclare them, and
 * the plugins' entities last, made from their content once it is merged.
 */
function merge(): PackMerge<EntitiesShape['game'], EntitiesShape['pack']> {
  const kinds = new Map<string, { value: KindDef; from: string }>()
  // Keyed `kind:id`: two kinds may each have an entity called the same.
  const entities = new Map<string, { value: EntityDef; from: string }>()
  const addKinds = (list: readonly KindDef[] | undefined, from: string) => {
    for (const kind of list ?? []) kinds.set(kind.id, { value: kind, from })
  }
  const addEntities = (list: readonly EntityDef[] | undefined, from: string) => {
    for (const entity of list ?? []) entities.set(`${entity.of}:${entity.id}`, { value: entity, from })
  }
  return {
    base: (game) => {
      // The base is the whole game as declared, plugins and all.
      for (const plugin of (game as Pick<Game, 'plugins'>).plugins ?? []) addKinds(plugin.kinds, plugin.id)
      addKinds(game.kinds, 'base')
      addEntities(game.entities, 'base')
    },
    add: (pack, from) => {
      addKinds(pack.kinds, from)
      addEntities(pack.entities, from)
    },
    finish: (game) => {
      game.kinds = [...kinds.values()].map((entry) => entry.value)
      // A plugin's entities, from its content; one the game declares itself wins.
      for (const plugin of game.plugins ?? []) {
        for (const entity of plugin.entities?.(game) ?? []) {
          const ref = `${entity.of}:${entity.id}`
          if (!entities.has(ref)) entities.set(ref, { value: entity, from: plugin.id })
        }
      }
      game.entities = [...entities.values()].map((entry) => entry.value)
    },
    from: (list, id) => (id === undefined ? undefined : (list === 'kind' ? kinds : entities).get(id)?.from),
  }
}

export const entities = defineFeature<EntitiesShape>({
  name: 'entities',
  state: {
    entities: { start: (game) => startingEntities(game), load: () => ({}) },
    created: { start: () => ({}), load: () => ({}) },
    removed: { start: () => [], load: () => [] },
  },
  conditions: {
    count: {
      holds: (state, condition, game, cx) => inRange(counting(state, condition, game, cx), condition),
      explain: (state, condition, game, cx) =>
        `${counting(state, condition, game, cx)} ${condition.count}${condition.where ? ' where it holds' : ''}; wants ${wanted(condition)}`,
      references: (condition) => [{ kind: condition.count }, { when: bindCurrent(condition.where, anyOf(condition.count)) }],
    },
    entity: {
      holds: (state, condition) => entityOf(state, condition.entity) !== undefined,
      explain: (state, condition) => `${condition.entity} is ${entityOf(state, condition.entity) ? '' : 'not '}in the game`,
      references: (condition) => ofKind(condition.entity),
    },
  },
  effects: {
    create: {
      apply: (state, effect, game) => {
        const kind = state.entities?.[effect.of] ?? {}
        const made = (id: string) => writeEntity(state, `${effect.of}:${id}`, newEntity(game, effect.of, effect.entity))
        // A given id is used as it is, unless it is taken, or a whole number that would sort first.
        if (effect.entity.id !== undefined) {
          if (kind[effect.entity.id] || /^\d+$/.test(effect.entity.id)) return state
          // Back after being removed: no longer gone for good.
          const back = made(effect.entity.id)
          const ref = `${effect.of}:${effect.entity.id}`
          return back.removed?.includes(ref) ? { ...back, removed: back.removed.filter((entry) => entry !== ref) } : back
        }
        // The next free number, `#1`, `#2`, never reused. Not a bare number: object keys
        // that look like numbers sort before the rest, and entities keep the order they came.
        let n = state.created?.[effect.of] ?? 0
        do n += 1
        while (kind[`#${n}`])
        return { ...made(`#${n}`), created: { ...state.created, [effect.of]: n } }
      },
      references: (effect) => [{ kind: effect.of }, ...Object.keys(effect.entity.stats ?? {}).map((stat) => ({ stat, starts: effect.of }))],
    },
    remove: {
      apply: (state, effect, game) => {
        if (!entityOf(state, effect.of)) return state
        const gone = removeEntity(state, effect.of)
        // A declared one stays gone when the save is next loaded.
        const declared = (game.entities ?? []).some((entity) => `${entity.of}:${entity.id}` === effect.of)
        return declared && !(gone.removed ?? []).includes(effect.of) ? { ...gone, removed: [...(gone.removed ?? []), effect.of] } : gone
      },
      references: (effect) => ofKind(effect.of),
    },
    each: {
      apply: (state, effect, game, cx) => {
        // Who it runs for is decided before it starts: one created on the way is not visited, one removed is skipped.
        let next = state
        for (const ref of entitiesOf(state, effect.of)) {
          if (!entityOf(next, ref)) continue
          if (effect.where && !cx.holds(next, bindCurrent(effect.where, ref), game)) continue
          next = cx.runEffects(next, game, cx.buildEffects(next, game, bindCurrent(effect.effects, ref)), cx.ending)
        }
        return next
      },
      references: (effect) => {
        // Inside, `'$'` is one of the kind it runs over.
        const one = anyOf(effect.of)
        return [{ kind: effect.of }, { within: `in each ${effect.of}`, refs: [{ when: bindCurrent(effect.where, one) }, { effects: bindCurrent(effect.effects, one) }] }]
      },
    },
  },
  pack: { merge },
  lists: ['kind', 'entity'],
  // A declared entity the save does not have (a mod's, a new version's) joins it, unless it was removed in play.
  fill: {
    kind: 'entities',
    unversioned: true,
    run: (state, game) => {
      let next = state
      const missing = (game.entities ?? []).filter(
        (entity) => !next.entities?.[entity.of]?.[entity.id] && !(next.removed ?? []).includes(`${entity.of}:${entity.id}`),
      )
      for (const entity of missing) next = writeEntity(next, `${entity.of}:${entity.id}`, newEntity(game, entity.of, entity))
      return next
    },
  },
  check: (game, tools) => {
    tools.twice('kind', 'kinds', (game.kinds ?? []).map((entry) => entry.id))
    tools.twice('entity', 'entities', (game.entities ?? []).map((entry) => `${entry.of}:${entry.id}`))
    const kinds = kindIds(game)
    for (const entity of game.entities ?? []) {
      const source = { list: 'entity', id: `${entity.of}:${entity.id}` }
      const where = `entity ${entity.of}:${entity.id}`
      if (!kinds.has(entity.of)) tools.problem(source, where, `unknown kind "${entity.of}"`)
      // Object keys that look like numbers sort first, which would scramble the order entities came in.
      if (/^\d+$/.test(entity.id)) tools.problem(source, where, 'an entity id must not be a whole number')
      tools.check(source, where, Object.keys(entity.stats ?? {}).map((stat) => ({ stat, starts: entity.of })))
    }
  },
  resolve: (game) => {
    const kinds = kindIds(game)
    return { kind: (ref) => (kinds.has(ref.kind) ? [] : [`unknown kind "${ref.kind}"`]) }
  },
  // Every kind's entities, with the stats the player can see on each.
  view: (state, game, _shown, cx) => ({
    entities: Object.fromEntries(
      (game.kinds ?? []).map((kind) => {
        const stats = (game.stats ?? []).filter((stat) => stat.of === kind.id && stat.listed !== false)
        const entries = entitiesOf(state, kind.id).map((ref) => {
          const entity = entityOf(state, ref)!
          return {
            id: parseRef(ref)!.id,
            ref,
            name: entity.name,
            stats: stats.filter((stat) => cx.holds(state, bindCurrent(stat.visible, ref), game)).map((stat) => statView(state, game, stat, ref, cx)),
            kv: entity.kv,
          }
        })
        return [kind.id, { label: kind.label, plural: kind.plural ?? kind.label, entries }]
      }),
    ),
  }),
})
