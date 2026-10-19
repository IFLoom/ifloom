/**
 * Entities and kinds: the things a game keeps several of, each with its own
 * stats and kv keys, such as a café's staff or the dishes on its menu. The
 * helpers are in `entities.ts`.
 */
import {
  anyOf,
  bindCurrent,
  createdRecord,
  dropRecord,
  entitiesOf,
  entityDef,
  entityKv,
  entityTags,
  entityText,
  hasEntity,
  ofKind,
  parseRef,
  resolveTraits,
  traitDef,
  writeEntity,
  type EntityDef,
  type EntityState,
  type KindDef,
  type TraitTable,
} from '../entities.ts'
import type { EffectRef } from '../custom.ts'
import type { Game } from '../game.ts'
import type { Condition, KvValue, GameState, Range } from '../types.ts'
import { defineFeature, type FeatureCheckTools, type FeatureContext, type PackMerge } from './feature.ts'
import { inRange, wanted } from '../range.ts'
import { statDef, statView, type StatView } from './stats.ts'
import { artSrc } from '../sceneBody.ts'

/** One entity as the UI draws it. */
export type EntityView = {
  id: string
  /** How content names it: `'staff:ana'`. */
  ref: string
  /** Its name, with prose tokens filled in. */
  name: string
  /** Its description, filled in the same way; null with none. */
  desc: string | null
  /** Its picture's path, through `artSrc`; null with none. */
  image: string | null
  /** Its kind's tags, then its own. */
  tags: string[]
  /** Each of its kind's `marks`, by name: whether it holds for this one. Empty when the kind declares none. */
  marks: Record<string, boolean>
  /** Its kind's listed stats that the player can see on it, in declared order. */
  stats: StatView[]
  /** Its kv store as it reads: what it was declared with, and what play set. */
  kv: Record<string, KvValue>
}

export type EntitiesView = {
  label: string
  plural: string
  /** The kind's `unique`: each one is one particular thing. */
  unique: boolean
  /** Its entities that are listed and visible, declared ones first, then the ones created in play. */
  entries: EntityView[]
}

/** What the entities feature adds, as types. */
export type EntitiesShape = {
  state: {
    /**
     * What play changed about the game's entities, by kind and id:
     * `entities.staff.ana`. A declared entity has no record until something
     * changes it; one created in play has one from the start.
     */
    entities: Record<string, Record<string, EntityState>>
    /** How many of each kind have been created in play, for the next one's id. */
    created: Record<string, number>
    /** Entities the game declares that were removed in play, by reference: gone for good. */
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
    /** Take an entity out of the game: `{ kind: 'remove', entity: 'staff:ana' }`. */
    remove: { kind: 'remove'; entity: string }
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
    /**
     * Traits by id and then entity. Given to `loadGame`, rows over what
     * entities declare; on the game it returns, every entity's traits,
     * worked out. Read them with `traitOf`.
     */
    traits?: TraitTable
  }
  pack: {
    /** Kinds of thing the game keeps several of. A later pack can redeclare one by id. */
    kinds?: KindDef[]
    /** Things of those kinds there at the start. A later pack can redeclare one by kind and id. */
    entities?: EntityDef[]
    /**
     * Traits given to entities, by trait id and then entity, over what each
     * entity declares itself: `{ 'laundry/washable': { 'clothing:scarf': {
     * temp: 30 } } }`. A later pack's row replaces an earlier one's.
     */
    traits?: TraitTable
  }
  view: {
    /**
     * Each listed kind's listed, visible entities, by kind id: declared ones
     * first, then those created in play. A listed kind is here, empty or not;
     * a kind whose `listed` is false is not.
     */
    entities: Record<string, EntitiesView>
  }
  lists: 'kind' | 'entity' | 'trait'
}

/** How many entities of a kind a `count` condition counts. */
function counting(state: GameState, condition: EntitiesShape['conditions']['count'], game: Game | undefined, cx: FeatureContext): number {
  const refs = entitiesOf(state, game, condition.count)
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
  // A plugin's kinds, unlisted unless the plugin says: a game that redeclares one keeps what it leaves out.
  const plugged = new Map<string, KindDef>()
  // Keyed `kind:id`: two kinds may each have an entity called the same.
  const entities = new Map<string, { value: EntityDef; from: string }>()
  const addKinds = (list: readonly KindDef[] | undefined, from: string) => {
    for (const kind of list ?? []) kinds.set(kind.id, { value: kind, from })
  }
  const addEntities = (list: readonly EntityDef[] | undefined, from: string) => {
    for (const entity of list ?? []) entities.set(`${entity.of}:${entity.id}`, { value: entity, from })
  }
  // Table rows by trait, then entity: a later pack's row replaces an earlier one's.
  const rows = new Map<string, Map<string, { value: unknown; from: string }>>()
  const addTraits = (table: TraitTable | undefined, from: string) => {
    for (const [id, byRef] of Object.entries(table ?? {})) {
      const into = rows.get(id) ?? new Map<string, { value: unknown; from: string }>()
      rows.set(id, into)
      for (const [ref, value] of Object.entries(byRef ?? {})) into.set(ref, { value, from })
    }
  }
  // Where each worked-out trait came from, by `id` and by `id ref`, for problems.
  const traitFrom = new Map<string, string>()
  return {
    base: (game) => {
      // The base is the whole game as declared, plugins and all.
      for (const plugin of (game as Pick<Game, 'plugins'>).plugins ?? []) {
        for (const kind of plugin.kinds ?? []) {
          const unlisted = { ...kind, listed: kind.listed ?? false }
          plugged.set(kind.id, unlisted)
          kinds.set(kind.id, { value: unlisted, from: plugin.id })
        }
      }
      addKinds(game.kinds, 'base')
      addEntities(game.entities, 'base')
      addTraits(game.traits, 'base')
    },
    add: (pack, from) => {
      addKinds(pack.kinds, from)
      addEntities(pack.entities, from)
      addTraits(pack.traits, from)
    },
    finish: (game) => {
      game.kinds = [...kinds.values()].map(({ value }) => {
        const theirs = plugged.get(value.id)
        return theirs && theirs !== value ? { ...theirs, ...value } : value
      })
      // A plugin's entities, from its content; one the game declares itself wins.
      for (const plugin of game.plugins ?? []) {
        for (const entity of plugin.entities?.(game) ?? []) {
          const ref = `${entity.of}:${entity.id}`
          if (!entities.has(ref)) entities.set(ref, { value: entity, from: plugin.id })
        }
      }
      game.entities = [...entities.values()].map((entry) => entry.value)
      // Every entity's traits worked out once, from the rows over what the entities and kinds declare.
      const table = Object.fromEntries([...rows].map(([id, byRef]) => [id, Object.fromEntries([...byRef].map(([ref, row]) => [ref, row.value]))]))
      game.traits = resolveTraits({ kinds: game.kinds, entities: game.entities, traits: table }) as TraitTable
      for (const [id, byRef] of Object.entries(game.traits)) {
        for (const ref of Object.keys(byRef)) {
          const kind = parseRef(ref)?.kind ?? ''
          const entity = entities.get(ref)
          // The row's pack, else the entity's if it gives the trait itself, else its kind's.
          const ownsIt = Object.hasOwn(entity?.value.traits ?? {}, id)
          const from = rows.get(id)?.get(ref)?.from ?? (ownsIt ? entity?.from : kinds.get(kind)?.from) ?? entity?.from ?? 'base'
          traitFrom.set(`${id} ${ref}`, from)
          if (!traitFrom.has(id)) traitFrom.set(id, from)
        }
      }
    },
    from: (list, id) => {
      if (id === undefined) return undefined
      if (list === 'trait') return traitFrom.get(id)
      return (list === 'kind' ? kinds : entities).get(id)?.from
    },
  }
}

export const entities = defineFeature<EntitiesShape>({
  name: 'entities',
  state: {
    entities: { start: () => ({}), load: () => ({}) },
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
      holds: (state, condition, game) => hasEntity(state, game, condition.entity),
      explain: (state, condition, game) => `${condition.entity} is ${hasEntity(state, game, condition.entity) ? '' : 'not '}in the game`,
      references: (condition) => ofKind(condition.entity),
    },
  },
  effects: {
    create: {
      apply: (state, effect, game) => {
        const made = (id: string) => writeEntity(state, `${effect.of}:${id}`, createdRecord(effect.entity))
        // A given id is used as it is, unless it is taken, or a whole number that would sort first.
        if (effect.entity.id !== undefined) {
          const ref = `${effect.of}:${effect.entity.id}`
          if (hasEntity(state, game, ref) || /^\d+$/.test(effect.entity.id)) return state
          // Back after being removed: no longer gone for good.
          const back = made(effect.entity.id)
          return back.removed?.includes(ref) ? { ...back, removed: back.removed.filter((entry) => entry !== ref) } : back
        }
        // The next free number, `#1`, `#2`, never reused. Not a bare number: object keys
        // that look like numbers sort before the rest, and entities keep the order they came.
        let n = state.created?.[effect.of] ?? 0
        do n += 1
        while (hasEntity(state, game, `${effect.of}:#${n}`))
        return { ...made(`#${n}`), created: { ...state.created, [effect.of]: n } }
      },
      references: (effect) => [{ kind: effect.of }, ...Object.keys(effect.entity.stats ?? {}).map((stat) => ({ stat, starts: effect.of }))],
    },
    remove: {
      apply: (state, effect, game) => {
        if (!hasEntity(state, game, effect.entity)) return state
        const gone = dropRecord(state, effect.entity)
        // A declared one stays gone: nothing in the save says it was ever there otherwise.
        return entityDef(game, effect.entity) && !(gone.removed ?? []).includes(effect.entity)
          ? { ...gone, removed: [...(gone.removed ?? []), effect.entity] }
          : gone
      },
      references: (effect) => ofKind(effect.entity),
    },
    each: {
      apply: (state, effect, game, cx) => {
        // Who it runs for is decided before it starts: one created on the way is not visited, one removed is skipped.
        let next = state
        for (const ref of entitiesOf(state, game, effect.of)) {
          if (!hasEntity(next, game, ref)) continue
          if (effect.where && !cx.holds(next, bindCurrent(effect.where, ref), game)) continue
          next = cx.runEffects(next, game, cx.buildEffects(next, game, bindCurrent(effect.effects, ref)), cx.ending)
        }
        return next
      },
      references: (effect) => {
        // Inside, `'$'` is one of the kind it runs over.
        const one = anyOf(effect.of)
        return [
          { kind: effect.of },
          { within: `in each ${effect.of}`, refs: [{ when: bindCurrent(effect.where, one) }, { effects: bindCurrent(effect.effects, one) }] },
        ]
      },
    },
  },
  pack: { merge },
  lists: ['kind', 'entity', 'trait'],
  // What older saves copied from content (names, and values equal to where they start) is dropped, so it reads from content again.
  loaded: (state, game) => tidied(state, game),
  check: (game, tools) => {
    tools.twice(
      'kind',
      'kinds',
      (game.kinds ?? []).map((entry) => entry.id),
    )
    tools.twice(
      'entity',
      'entities',
      (game.entities ?? []).map((entry) => `${entry.of}:${entry.id}`),
    )
    const kinds = kindIds(game)
    for (const entity of game.entities ?? []) {
      const source = { list: 'entity', id: `${entity.of}:${entity.id}` }
      const where = `entity ${entity.of}:${entity.id}`
      if (!kinds.has(entity.of)) tools.problem(source, where, `unknown kind "${entity.of}"`)
      // Object keys that look like numbers sort first, which would scramble the order entities came in.
      if (/^\d+$/.test(entity.id)) tools.problem(source, where, 'an entity id must not be a whole number')
      tools.check(source, where, [
        ...Object.keys(entity.stats ?? {}).map((stat) => ({ stat, starts: entity.of })),
        { when: bindCurrent(entity.visible, `${entity.of}:${entity.id}`) },
        ...(entity.image !== undefined ? [{ picture: entity.image }] : []),
      ])
    }
    // A kind's `listed` and `marks` are asked of each of its entities, so `'$'` is any one of them.
    for (const kind of game.kinds ?? []) {
      const one = anyOf(kind.id)
      const asked = [...(typeof kind.listed === 'object' ? [kind.listed] : []), ...Object.values(kind.marks ?? {})]
      if (asked.length)
        tools.check(
          { list: 'kind', id: kind.id },
          `kind ${kind.id}`,
          asked.map((when) => ({ when: bindCurrent(when, one) })),
        )
    }
    checkTraits(game, tools)
  },
  resolve: (game) => {
    const kinds = kindIds(game)
    return { kind: (ref) => (kinds.has(ref.kind) ? [] : [`unknown kind "${ref.kind}"`]) }
  },
  // Each listed kind's listed, visible entities, with the stats the player can see on each.
  view: (state, game, _shown, cx) => ({
    entities: Object.fromEntries(
      (game.kinds ?? [])
        .filter((kind) => kind.listed !== false)
        .map((kind) => {
          const stats = (game.stats ?? []).filter((stat) => stat.of === kind.id && stat.listed !== false)
          const holdsFor = (when: Condition | undefined, ref: string) => cx.holds(state, bindCurrent(when, ref), game)
          const listed = (ref: string) => (typeof kind.listed === 'object' ? holdsFor(kind.listed, ref) : true)
          const entries = entitiesOf(state, game, kind.id)
            .filter((ref) => listed(ref) && holdsFor(entityDef(game, ref)?.visible, ref))
            .map((ref): EntityView => {
              const id = parseRef(ref)!.id
              const desc = entityText(state, game, ref, 'desc')
              const image = entityDef(game, ref)?.image
              return {
                id,
                ref,
                name: cx.fillTokens(entityText(state, game, ref, 'name') ?? id, state, game),
                desc: desc === undefined ? null : cx.fillTokens(desc, state, game),
                image: image === undefined ? null : artSrc(image),
                tags: entityTags(state, game, ref),
                marks: Object.fromEntries(Object.entries(kind.marks ?? {}).map(([name, when]) => [name, holdsFor(when, ref)])),
                stats: stats.filter((stat) => holdsFor(stat.visible, ref)).map((stat) => statView(state, game, stat, ref, cx)),
                kv: entityKv(state, game, ref),
              }
            })
          return [kind.id, { label: kind.label, plural: kind.plural ?? kind.label, unique: kind.unique ?? false, entries }]
        }),
    ),
  }),
})

/**
 * What is wrong with the game's traits: a plugin's trait id not its own, a
 * trait of a plugin the game has that the plugin doesn't declare, a row for
 * an entity nobody declares, and what each trait's own `check` and
 * `references` say of the data on each entity. Ids without a `/` are the
 * game's, and a plugin the game lacks has its traits let through unchecked.
 */
function checkTraits(game: Game, tools: FeatureCheckTools): void {
  for (const plugin of game.plugins ?? []) {
    const seen = new Set<string>()
    for (const trait of plugin.traits ?? []) {
      const where = `plugin ${plugin.id}`
      if (!trait.id.startsWith(`${plugin.id}/`) || trait.id.length === plugin.id.length + 1)
        tools.problem(undefined, where, `trait "${trait.id}" must be named "${plugin.id}/" and a name`)
      if (seen.has(trait.id)) tools.problem(undefined, where, `two traits share the id "${trait.id}"`)
      seen.add(trait.id)
    }
  }
  const table = resolveTraits(game)
  // A plugin the game has that doesn't declare the trait: most likely a typo.
  const unknownTrait = (id: string): string | undefined => {
    const at = id.indexOf('/')
    if (at <= 0) return undefined
    const plugin = game.plugins?.find((entry) => entry.id === id.slice(0, at))
    return plugin && !traitDef(game, id) ? `plugin "${plugin.id}" has no trait "${id}"` : undefined
  }
  const ids = new Set([...(game.kinds ?? []).flatMap((kind) => Object.keys(kind.traits ?? {})), ...Object.keys(table)])
  for (const id of ids) {
    const what = unknownTrait(id)
    if (what) tools.problem({ list: 'trait', id }, `trait ${id}`, what)
  }
  for (const [id, byRef] of Object.entries(table)) {
    const trait = traitDef(game, id)
    for (const [ref, data] of Object.entries(byRef)) {
      const source = { list: 'trait', id: `${id} ${ref}` }
      const where = `trait ${id} on ${ref}`
      if (!entityDef(game, ref)) {
        tools.problem(source, where, `unknown entity "${ref}"`)
        continue
      }
      if (!trait) continue
      for (const what of trait.check?.(data, { game, ref }) ?? []) tools.problem(source, where, what)
      const refs = trait.references?.(data) ?? []
      if (refs.length) tools.check(source, where, refs)
    }
  }
}

/** One record with what content already says taken out; undefined when nothing is left of a declared one's. */
function tidiedRecord(record: EntityState, def: EntityDef | undefined, kind: string, game: Game): EntityState | undefined {
  const next: EntityState = {}
  if (record.name !== undefined && record.name !== def?.name) next.name = record.name
  const stats = Object.entries(record.stats ?? {}).filter(([id, value]) => {
    const stat = statDef(game, id)
    if (!stat || stat.of !== kind || stat.derive !== undefined) return true
    return value !== (def?.stats?.[id] ?? stat.start ?? 0)
  })
  if (stats.length) next.stats = Object.fromEntries(stats)
  const kv = Object.entries(record.kv ?? {}).filter(([key, value]) => def?.kv?.[key] !== value)
  if (kv.length) next.kv = Object.fromEntries(kv)
  // A trait's state is only ever written by play.
  if (record.traits && Object.keys(record.traits).length) next.traits = record.traits
  // A created one's record is what says it is there, so it stays, however little is left.
  if (def && !Object.keys(next).length) return undefined
  return next
}

/**
 * The save's entity records with what content says dropped: a declared
 * entity's name, and stats and kv keys equal to where they start. Saves
 * before version 15 copied all of it, which would hide a fix to the content.
 * Nothing left means no record, and a kind with no records goes too.
 */
function tidied(state: GameState, game: Game): GameState {
  if (!state.entities) return state
  const out: Record<string, Record<string, EntityState>> = {}
  for (const [kind, byId] of Object.entries(state.entities)) {
    for (const [id, record] of Object.entries(byId ?? {})) {
      const next = tidiedRecord(record, entityDef(game, `${kind}:${id}`), kind, game)
      if (next) out[kind] = { ...out[kind], [id]: next }
    }
  }
  return JSON.stringify(out) === JSON.stringify(state.entities) ? state : { ...state, entities: out }
}
