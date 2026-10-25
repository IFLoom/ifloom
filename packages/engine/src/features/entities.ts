/**
 * Entities and kinds: the things a game keeps several of, each with its own
 * stats and kv keys, such as a café's staff or the dishes on its menu. The
 * helpers are in `entities.ts`.
 */
import {
  anyOf,
  CURRENT,
  bindCurrent,
  createdRecord,
  dropRecord,
  entitiesOf,
  entityDef,
  entityImage,
  entityUi,
  entityKv,
  entityTags,
  entityText,
  entityTrait,
  everyEntity,
  hasEntity,
  ofKind,
  parseRef,
  resolveTraits,
  traitDef,
  writeEntity,
  type CreatedFields,
  type EntityDef,
  type EntityRef,
  type EntityState,
  type KindDef,
  type Placement,
  type TraitTable,
} from '../entities.ts'
import { heldBy, heldCount, heldTotal, placementCounts, releaseHeld, setHeld } from '../holdings.ts'
import type { EffectRef } from '../custom.ts'
import type { Reference } from '../references.ts'
import type { Game } from '../game.ts'
import type { Condition, KvValue, GameState, Range } from '../types.ts'
import { withUi, type EntityUi, type Ui } from './ui.ts'
import { defineFeature, type FeatureCheckTools, type FeatureContext, type PackMerge } from './feature.ts'
import { bounded, inRange, wanted } from '../range.ts'
import { statDef, statView, type StatView } from './stats.ts'
import { artSrc, spokenIds } from '../sceneBody.ts'

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
  /** Each of its kind's `flags`, by name: whether it holds for this one. Empty when the kind declares none. */
  flags: Record<string, boolean>
  /** Its kind's listed stats that the player can see on it, in declared order. */
  stats: StatView[]
  /** Its kv store as it reads: what it was declared with, and what play set. */
  kv: Record<string, KvValue>
  /** Its presentation hints, its own over its kind's, as written; left out with none. See `EntityUi`. */
  ui?: Ui<EntityUi>
}

export type EntitiesView = {
  label: string
  plural: string
  /** The kind's `unique`: each one is one particular thing. */
  unique: boolean
  /** Its entities that are listed and visible, declared ones first, then the ones created in play. */
  entries: EntityView[]
}

/**
 * Which entities a `count` or an `each` looks at: those `of` a kind, those a
 * holder holds (`at`), those with a tag or a trait, and those `where` holds
 * for, with `'$'` as each one. Every entity in the game if it says none.
 */
export type Select = {
  /** A kind. */
  of?: string
  /** A holder: only what it holds (`'you'`, `'player'` or a unique entity). */
  at?: string
  /** A tag it has, its kind's or its own. */
  tag?: string
  /** A trait it has, by id. */
  trait?: string
  /** A condition asked for each, with `'$'` as that one. */
  where?: Condition
}

/** What a created entity is given in `create`: a name (or a `like` to read it from), a description, a picture, tags, traits, stats and kv. */
export type CreatedEntity = {
  /** Its id within its kind: the next free number (`#1`, `#2`) if left out. */
  id?: string
  /** What the player reads. The `like`'s, if it is made like one and left out. */
  name?: string
  /** A line or two about it, tokens filled in when it is read. The `like`'s, if left out. */
  desc?: string
  /** Its picture, through `artSrc`. The `like`'s, if left out. */
  image?: string
  /** Its tags, after its kind's and its `like`'s. */
  tags?: string[]
  /** Its trait data, by trait id, over its `like`'s or its kind's. */
  traits?: Record<string, unknown>
  /** Where its stats start, over its `like`'s. */
  stats?: Record<string, number>
  /** Its kv keys at the start, over its `like`'s. */
  kv?: Record<string, KvValue>
}

/** The fields `create` takes besides its kind. */
type CreateFields = {
  /** Another entity of the same kind it reads what it isn't given from. */
  like?: string
  /** What it is made with: its id, name, description, picture, tags, traits, stats and kv. */
  with?: CreatedEntity
  /** Who holds it once made: a holder for one, or how many each holds. Nobody if left out. */
  at?: Placement
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
     * With a `Select`, the things it picks: `{ count: { at: 'you', tag: 'fruit' }, gte: 3 }`.
     * Distinct things, unless `units` adds up how many of each are held.
     */
    count: { count: string | Select; where?: Condition; units?: true } & Range
    /**
     * An entity is in the game: `{ entity: 'staff:ana' }`. With `at`, how
     * many of it a holder holds, bare at least one:
     * `{ entity: 'food:apple', at: 'you', gte: 2 }`. With a range and no
     * `at`, how many are held by everyone together.
     */
    entity: { entity: string; at?: string } & Range
  }
  effects: {
    /**
     * A new entity of a kind, made `with` what it is given, and `like`
     * another of the kind, which it reads what it isn't given from. Its `id`
     * is the next free number (`#1`, `#2`) if left out, never reused; an id
     * already there is left as it is. `at` gives it to a holder:
     * `{ create: 'photo', with: { name: 'Ava at work' }, at: 'player' }`.
     */
    create: { create: string } & CreateFields
    /** Take an entity out of the game: `{ remove: 'staff:ana' }`. */
    remove: { remove: string }
    /**
     * The same effects for every entity of a kind (where `where` holds), one
     * after another, with `'$'` as the one each time: wages, upkeep, a bad
     * week. `{ each: 'staff', effects }`, or a `Select` for only what a holder
     * holds, a tag or a trait: `{ each: { at: 'you', tag: 'fruit' }, effects }`.
     */
    each: { each: string | Select; where?: Condition; effects: EffectRef[] }
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

/** The entities a selection picks, in the game's order of its entities, or a holder's order of what it holds. */
function selected(state: GameState, game: Game | undefined, select: Select, cx: FeatureContext): EntityRef[] {
  const refs =
    select.at !== undefined
      ? heldBy(state, game, select.at).map((entry) => entry.ref)
      : select.of !== undefined
        ? entitiesOf(state, game, select.of)
        : everyEntity(state, game)
  return refs.filter(
    (ref) =>
      (select.of === undefined || parseRef(ref)?.kind === select.of) &&
      (select.tag === undefined || (game !== undefined && entityTags(state, game, ref).includes(select.tag))) &&
      (select.trait === undefined || entityTrait(state, game, ref, select.trait) !== undefined) &&
      (select.where === undefined || cx.holds(state, bindCurrent(select.where, ref), game)),
  )
}

/** A `count` condition's selection: a kind's, or the one it gives, with its own `where` and the condition's both asked. */
function countSelect(condition: EntitiesShape['conditions']['count']): Select {
  if (typeof condition.count === 'string') return { of: condition.count, where: condition.where }
  const both = [condition.count.where, condition.where].filter((when): when is Condition => when !== undefined)
  return { ...condition.count, where: both.length > 1 ? { all: both } : both[0] }
}

/** How many a `count` condition counts: distinct things, or with `units`, how many of each are held. */
function counting(state: GameState, condition: EntitiesShape['conditions']['count'], game: Game | undefined, cx: FeatureContext): number {
  const select = countSelect(condition)
  const refs = selected(state, game, select, cx)
  if (!condition.units) return refs.length
  return refs.reduce((sum, ref) => sum + (select.at !== undefined ? heldCount(state, game, ref, select.at) : heldTotal(state, game, ref)), 0)
}

/** A selection in words, for `explain`: `staff where it holds`, `entities held by you tagged fruit`. */
function described(select: Select): string {
  return [
    select.of ?? 'entities',
    select.at !== undefined ? `held by ${select.at}` : '',
    select.tag !== undefined ? `tagged ${select.tag}` : '',
    select.trait !== undefined ? `with ${select.trait}` : '',
    select.where !== undefined ? 'where it holds' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/** What a selection names: its kind, holder and trait, and its `where` with `'$'` as one of its kind (left as `'$'` with no kind). */
function selectReferences(select: Select): Reference[] {
  return [
    ...(select.of !== undefined ? [{ kind: select.of }] : []),
    ...(select.at !== undefined ? [{ holder: select.at }] : []),
    ...(select.trait !== undefined ? [{ trait: select.trait }] : []),
    { when: select.of !== undefined ? bindCurrent(select.where, anyOf(select.of)) : select.where },
  ]
}

/** What an `each` runs over, in words: its kind, as it always was, or its selection. */
function eachLabel(effect: Select): string {
  const only = effect.at === undefined && effect.tag === undefined && effect.trait === undefined
  return only && effect.of !== undefined ? effect.of : described({ ...effect, where: undefined })
}

/** How many an `entity` condition reads: held by a holder, or by everyone; undefined when it only asks whether the entity is there. */
function entityCount(state: GameState, condition: EntitiesShape['conditions']['entity'], game: Game | undefined): number | undefined {
  if (condition.at !== undefined) return heldCount(state, game, condition.entity, condition.at)
  return bounded(condition) ? heldTotal(state, game, condition.entity) : undefined
}

/** The kind a `create` makes. */
function createdKind(effect: EntitiesShape['effects']['create']): string | undefined {
  return typeof effect.create === 'string' ? effect.create : undefined
}

/** What an `each` runs over, as a `Select`, with its `where`. */
function eachSelect(effect: EntitiesShape['effects']['each']): Select {
  const select = typeof effect.each === 'string' ? { of: effect.each } : { ...effect.each }
  return effect.where !== undefined ? { ...select, where: effect.where } : select
}

/** The kinds the game declares, with the ones its plugins bring. */
function kindIds(game: Game): Set<string> {
  return new Set([...(game.kinds ?? []), ...(game.plugins ?? []).flatMap((plugin) => plugin.content?.kinds ?? [])].map((kind) => kind.id))
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
    base: () => {},
    // A plugin's own content: its kinds unlisted unless it says, which a game that redeclares one keeps.
    plugin: (content, plugin) => {
      for (const kind of content.kinds ?? []) {
        const unlisted = { ...kind, listed: kind.listed ?? false }
        plugged.set(kind.id, unlisted)
        kinds.set(kind.id, { value: unlisted, from: plugin })
      }
      addEntities(content.entities, plugin)
      addTraits(content.traits, plugin)
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
        `${counting(state, condition, game, cx)}${condition.units ? ' held' : ''} ${described(countSelect(condition))}; wants ${wanted(condition)}`,
      references: (condition) => selectReferences(countSelect(condition)),
    },
    entity: {
      holds: (state, condition, game) => {
        const count = entityCount(state, condition, game)
        return count === undefined ? hasEntity(state, game, condition.entity) : inRange(count, condition)
      },
      explain: (state, condition, game) => {
        const count = entityCount(state, condition, game)
        if (count === undefined) return `${condition.entity} is ${hasEntity(state, game, condition.entity) ? '' : 'not '}in the game`
        return `${condition.entity}: ${count} held${condition.at !== undefined ? ` by ${condition.at}` : ''}; wants ${wanted(condition)}`
      },
      references: (condition) => [...ofKind(condition.entity), ...(condition.at !== undefined ? [{ holder: condition.at }] : [])],
    },
  },
  effects: {
    create: {
      apply: (state, effect, game) => {
        const kind = createdKind(effect)
        if (kind === undefined) return state
        const given: CreatedFields = { ...effect.with, like: effect.like }
        // Made, then given to whoever `at` names.
        const made = (from: GameState, id: string) => {
          const ref = `${kind}:${id}`
          let next = writeEntity(from, ref, createdRecord(given))
          for (const [holder, count] of Object.entries(placementCounts(effect.at)))
            next = setHeld(next, game, ref, holder, heldCount(next, game, ref, holder) + count)
          return next
        }
        // A given id is used as it is, unless it is taken, or a whole number that would sort first.
        const id = effect.with?.id
        if (id !== undefined) {
          const ref = `${kind}:${id}`
          if (hasEntity(state, game, ref) || /^\d+$/.test(id)) return state
          // Back after being removed: no longer gone for good.
          const back = state.removed?.includes(ref) ? { ...state, removed: state.removed.filter((entry) => entry !== ref) } : state
          return made(back, id)
        }
        // The next free number, `#1`, `#2`, never reused. Not a bare number: object keys
        // that look like numbers sort before the rest, and entities keep the order they came.
        let n = state.created?.[kind] ?? 0
        do n += 1
        while (hasEntity(state, game, `${kind}:#${n}`))
        return made({ ...state, created: { ...state.created, [kind]: n } }, `#${n}`)
      },
      references: (effect) => {
        const kind = createdKind(effect)
        return [
          ...(kind !== undefined ? [{ kind }] : []),
          ...(effect.like !== undefined ? [{ like: effect.like, of: kind }] : []),
          ...(kind !== undefined ? Object.keys(effect.with?.stats ?? {}).map((stat) => ({ stat, starts: kind })) : []),
          ...Object.keys(placementCounts(effect.at)).map((holder) => ({ holder })),
          ...Object.keys(effect.with?.traits ?? {}).map((trait) => ({ trait })),
          ...(effect.with?.image !== undefined ? [{ picture: effect.with.image }] : []),
        ]
      },
    },
    remove: {
      apply: (state, effect, game) => {
        const ref = effect.remove
        if (!hasEntity(state, game, ref)) return state
        // What it held goes to whoever held it; nobody holds it any more. A protagonist removed is played no more.
        const released = releaseHeld(state, game, ref)
        const gone = dropRecord(released.you === ref ? { ...released, you: null } : released, ref)
        // A declared one stays gone: nothing in the save says it was ever there otherwise.
        return entityDef(game, ref) && !(gone.removed ?? []).includes(ref) ? { ...gone, removed: [...(gone.removed ?? []), ref] } : gone
      },
      references: (effect) => ofKind(effect.remove),
    },
    each: {
      apply: (state, effect, game, cx) => {
        // Who it runs for is decided before it starts: one created on the way is not visited, one removed is skipped.
        let next = state
        const select = eachSelect(effect)
        for (const ref of selected(state, game, { ...select, where: undefined }, cx)) {
          if (!hasEntity(next, game, ref)) continue
          if (select.where && !cx.holds(next, bindCurrent(select.where, ref), game)) continue
          next = cx.runEffects(next, game, cx.buildEffects(next, game, bindCurrent(effect.effects, ref)), cx.ending)
        }
        return next
      },
      references: (effect) => {
        // Inside, `'$'` is one of the kind it runs over; left as `'$'` when it runs over more than one kind.
        const select = eachSelect(effect)
        const bind = <T extends Condition | readonly EffectRef[] | undefined>(value: T): T =>
          select.of !== undefined ? bindCurrent(value, anyOf(select.of)) : value
        return [
          ...selectReferences({ ...select, where: undefined }),
          { within: `in each ${eachLabel(select)}`, refs: [{ when: bind(select.where) }, { effects: bind(effect.effects) }] },
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
        { ui: entity.ui },
      ])
    }
    // A kind's `listed` and `flags` are asked of each of its entities, so `'$'` is any one of them.
    for (const kind of game.kinds ?? []) {
      const one = anyOf(kind.id)
      const asked = [...(typeof kind.listed === 'object' ? [kind.listed] : []), ...Object.values(kind.flags ?? {})]
      tools.check({ list: 'kind', id: kind.id }, `kind ${kind.id}`, [...asked.map((when) => ({ when: bindCurrent(when, one) })), { ui: kind.ui }])
    }
    checkTraits(game, tools)
  },
  resolve: (game) => {
    const kinds = kindIds(game)
    return {
      kind: (ref) => (kinds.has(ref.kind) ? [] : [`unknown kind "${ref.kind}"`]),
      entity: (ref) => {
        if (ref.entity === CURRENT) return []
        const parts = parseRef(ref.entity)
        if (!parts) return [`unknown entity "${ref.entity}": name one as "kind:id"`]
        if (!kinds.has(parts.kind)) return [`unknown kind "${parts.kind}"`]
        return parts.id === '*' || entityDef(game, ref.entity) ? [] : [`unknown entity "${ref.entity}"`]
      },
      // Who a spoken line is under: a reference, or a bare id read as `character:<id>`, else the one entity with that id.
      speaker: (ref) => {
        const id = ref.speaker
        if (id === 'you' || id === 'player') return []
        if (id.includes(':')) return entityDef(game, id) ? [] : [`a spoken line is under "${id}", which names no entity`]
        if (entityDef(game, `character:${id}`)) return []
        const named = (game.entities ?? []).filter((entity) => entity.id === id)
        if (named.length === 1) return []
        if (named.length > 1) return [`a spoken line is under "${id}", which more than one kind has: name it as "kind:${id}"`]
        return [`a spoken line is under "${id}", which names no entity`]
      },
    }
  },
  // Spoken lines in prose under an id, `@ava: "…"`: each names an entity.
  markup: (_game, text, where, tools) =>
    tools.resolve(
      spokenIds(text).map((speaker) => ({ speaker })),
      where,
    ),
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
              const image = entityImage(state, game, ref)
              return {
                id,
                ref,
                name: cx.fillTokens(entityText(state, game, ref, 'name') ?? id, state, game),
                desc: desc === undefined ? null : cx.fillTokens(desc, state, game),
                image: image === undefined ? null : artSrc(image),
                tags: entityTags(state, game, ref),
                flags: Object.fromEntries(Object.entries(kind.flags ?? {}).map(([name, when]) => [name, holdsFor(when, ref)])),
                stats: stats.filter((stat) => holdsFor(stat.visible, ref)).map((stat) => statView(state, game, stat, ref, cx)),
                kv: entityKv(state, game, ref),
                ...withUi(entityUi(state, game, ref)),
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
      const refs = trait.references?.(data, { game, ref }) ?? []
      if (refs.length) tools.check(source, where, refs)
    }
  }
}

/** One record with what content already says taken out; undefined when nothing is left of a declared one's. */
function tidiedRecord(record: EntityState, def: EntityDef | undefined, kind: string, game: Game): EntityState | undefined {
  const next: EntityState = {}
  if (record.name !== undefined && record.name !== def?.name) next.name = record.name
  // What it was created with, desc and picture included, is only ever written by play.
  if (record.desc !== undefined) next.desc = record.desc
  if (record.image !== undefined) next.image = record.image
  // What it was created like and with is only ever written by play.
  if (record.like !== undefined) next.like = record.like
  if (record.tags?.length) next.tags = record.tags
  if (record.traitData && Object.keys(record.traitData).length) next.traitData = record.traitData
  const stats = Object.entries(record.stats ?? {}).filter(([id, value]) => {
    // One made like another reads what it lacks from that one, not from the stat's start: keep it all.
    if (record.like !== undefined) return true
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
