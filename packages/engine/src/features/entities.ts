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
  traitOf,
  everyEntity,
  hasEntity,
  ofKind,
  parseRef,
  resolveTraits,
  traitDef,
  declaredTrait,
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
import { byId, defineFeature, type FeatureCheckTools, type FeatureContext, type PackMerge } from './feature.ts'
import type { WordShape, WordWalk } from '../words.ts'
import { bounded, inRange, wanted } from '../range.ts'
import { statOf, statView, type StatView } from './stats.ts'
import { artSrc, spokenIds } from '../sceneBody.ts'

/** An entity as the player sees it, in an {@link EntitiesView}'s `entries`. */
export type EntityView = {
  /** The entity's id within its kind. */
  id: string
  /** The entity's reference, such as `'staff:ana'`. */
  ref: string
  /** The entity's name, with its prose tokens filled in. */
  name: string
  /** The entity's description, with its tokens filled in. Null if it has none. */
  description: string | null
  /** The entity's picture, as a path through `artSrc`. Null if it has none. */
  image: string | null
  /** The entity's tags, its kind's first and then its own. */
  tags: string[]
  /** The answer to each of the kind's `flags` for this entity, by name. Empty when the kind declares none. */
  flags: Record<string, boolean>
  /** The kind's listed stats the player can see on this entity, in the order the game declares them. */
  stats: StatView[]
  /** The entity's kv store as it reads now, its declared keys with play's changes over them. */
  kv: Record<string, KvValue>
  /** The entity's ui hints (a {@link EntityUi}), its own over its kind's, kept as written. Left out if it has none. */
  ui?: Ui<EntityUi>
}

/** A listed kind as the player sees it, in `view.entities`, with its listed entities. */
export type EntitiesView = {
  /** The kind's id, such as `'character'`. */
  id: string
  /** The kind's label for one entity, such as `'Character'`. */
  label: string
  /** The kind's label for several, for a heading, such as `'Characters'`. Its `label` when the kind gives none. */
  plural: string
  /** The kind's `unique` mark, true when each entity is one particular thing that can hold others. */
  unique: boolean
  /** The kind's listed, visible entities, declared ones first, then those created in play. */
  entries: EntityView[]
}

/**
 * A selection of entities that a `count` or an `each` reads. Every entity in the game when it sets nothing.
 *
 * It narrows to those `of` a kind, those a holder holds (`at`), those with a tag or a trait, and those `where` holds
 * for, with `'$'` as each one.
 */
export type Select = {
  /** The kind the entities are of. */
  of?: string
  /** The holder whose things are selected, `'you'`, `'player'` or a unique entity. */
  at?: string
  /** The tag the entities have, their kind's or their own. */
  tag?: string
  /** The id of a trait the entities carry. */
  trait?: string
  /** The condition each entity must meet, with `'$'` as that entity. */
  where?: Condition
}

/**
 * The fields a `create` effect gives a new entity in its `with`. The engine reads each one left out from the entity it's
 * made `like`, else from its kind.
 */
export type CreatedEntity = {
  /** The entity's id within its kind. The next free number (`#1`, `#2`) if left out. */
  id?: string
  /** The entity's name. The `like` entity's if left out. */
  name?: string
  /** The entity's description, with tokens filled when it's read. The `like` entity's if left out. */
  description?: string
  /** The entity's picture, through `artSrc`. The `like` entity's if left out. */
  image?: string
  /** The entity's own tags, after its kind's and its `like` entity's. */
  tags?: string[]
  /** The entity's trait data, by trait id, over its `like` entity's or its kind's. */
  traits?: Record<string, unknown>
  /** The entity's starting stats, over its `like` entity's. */
  stats?: Record<string, number>
  /** The entity's starting kv keys, over its `like` entity's. */
  kv?: Record<string, KvValue>
}

/** The fields a `create` effect takes besides its kind. */
export type CreateFields = {
  /** The entity of the same kind the new one reads what it isn't given from. */
  like?: string
  /** The new entity's fields, its id, name, description, picture, tags, traits, stats and kv. */
  with?: CreatedEntity
  /** The new entity's holder, or how many each holder holds. Nobody holds it if left out. */
  at?: Placement
}

/** The entities feature's state, calls, content keys, view and references, as types. */
export type EntitiesShape = {
  state: {
    /**
     * The changes play has made to the game's entities, by kind and id, such as `entities.staff.ana`. A declared
     * entity has no record until something changes it.
     *
     * An entity created in play has a record from the start.
     */
    entities: Record<string, Record<string, EntityState>>
    /** The number of entities of each kind created in play, for the next one's id. */
    created: Record<string, number>
    /** The references of declared entities removed in play. A `create` with the same id brings one back. */
    removed: string[]
  }
  conditions: {
    /**
     * A condition on the number of entities of a kind, or with `where` the number it holds for, with `'$'` as each in
     * turn. With no range it holds for at least one.
     *
     * `{ count: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, gte: 2 }` counts a kind, and
     * `{ count: { at: 'you', tag: 'fruit' }, gte: 3 }` counts a `Select`. It counts distinct entities unless `units`
     * adds up how many of each are held.
     */
    count: { count: string | Select; where?: Condition; units?: true } & Range
    /**
     * A condition that holds while an entity is in the game, such as `{ entity: 'staff:ana' }`. With `at` and a range
     * it asks how many of it a holder holds.
     *
     * With `at` and no range it holds for at least one (`{ entity: 'food:apple', at: 'you', gte: 2 }` asks for two). With
     * a range and no `at`, it counts the entity held by every holder together.
     */
    entity: { entity: string; at?: string } & Range
  }
  effects: {
    /**
     * An effect that creates an entity of a kind, made `with` the fields it's given and `like` another of the kind for
     * the rest. `at` gives it to a holder, as in `{ create: 'photo', with: { name: 'Ava at work' }, at: 'player' }`.
     *
     * Its `id` is the next free number (`#1`, `#2`) if left out, never reused. The effect does nothing for an id already
     * in the game or a whole number.
     */
    create: { create: string } & CreateFields
    /** An effect that takes an entity out of the game for good, such as `{ remove: 'staff:ana' }`. */
    remove: { remove: string }
    /**
     * An effect that runs the same effects for every entity a kind or a `Select` picks, one after another, with `'$'`
     * as each in turn. Use it for wages, upkeep or a bad week.
     *
     * `{ each: 'staff', effects }` covers a kind, and `{ each: { at: 'you', tag: 'fruit' }, effects }` covers what a
     * holder holds with a tag. `where` narrows either.
     */
    each: { each: string | Select; where?: Condition; effects: EffectRef[] }
  }
  game: {
    /** The game's kinds, the sorts of entity it keeps, each with its own stats. */
    kinds?: KindDef[]
    /** The game's entities at the start. Play can create more. */
    entities?: EntityDef[]
    /**
     * The game's traits, by trait id and then entity. In content given to `loadGame` they're rows over what entities
     * declare.
     *
     * On the game `loadGame` returns, they're every entity's traits, worked out. Read them with `declaredTrait`.
     */
    traits?: TraitTable
  }
  pack: {
    /** The pack's kinds. A later pack's kind replaces an earlier one with the same id. */
    kinds?: KindDef[]
    /** The pack's entities at the start. A later pack's entity replaces an earlier one with the same kind and id. */
    entities?: EntityDef[]
    /**
     * The pack's traits, by trait id and then entity, over what each entity declares itself, such as
     * `{ 'laundry/washable': { 'clothing:scarf': { temp: 30 } } }`. A later pack's row replaces an earlier one's.
     */
    traits?: TraitTable
  }
  view: {
    /**
     * Each listed kind with its listed, visible entities, in the order the kinds are declared. A kind whose `listed`
     * is false is left out, and a listed kind with no entities shows empty.
     */
    entities: EntitiesView[]
  }
  lists: 'kind' | 'entity' | 'trait'
  references: {
    /** A reference to a kind of entity. */
    kind: { kind: string }
    /**
     * A reference to an entity content declares, such as `'food:apple'`. `'$'` and `'food:*'` pass.
     *
     * With `carrying`, the entity must also carry that trait, as a location the places plugin takes the player to
     * does (`{ entity: 'location:cafe', carrying: 'places/location' }`).
     */
    entity: { entity: string; carrying?: string }
    /** A reference to the speaker of a spoken line by id, from `@ava: "…"` in prose or a `say` block's `speaker`. `'you'` and `'player'` pass. */
    speaker: { speaker: string }
    /** A reference to the entity a `create` makes a thing like, with the kind it makes when it names one. */
    like: { like: string; of?: string }
    /** A reference to a trait by id. */
    trait: { trait: string }
  }
}

/** The entities a selection picks, in the game's order of its entities, or a holder's order of what it holds. */
function selected(state: GameState, game: Game, select: Select, cx: FeatureContext): EntityRef[] {
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
      (select.trait === undefined || traitOf(state, game, ref, select.trait) !== undefined) &&
      (select.where === undefined || cx.holds(state, game, bindCurrent(select.where, ref))),
  )
}

/** Returns a `count` condition's selection, its kind or its `Select`. Its own `where` and the condition's must both hold. */
export function countSelect(condition: EntitiesShape['conditions']['count']): Select {
  if (typeof condition.count === 'string') return { of: condition.count, where: condition.where }
  const both = [condition.count.where, condition.where].filter((when): when is Condition => when !== undefined)
  return { ...condition.count, where: both.length > 1 ? { all: both } : both[0] }
}

/** Returns the number a `count` condition counts, distinct entities or, with `units`, how many of each are held. */
export function counting(state: GameState, condition: EntitiesShape['conditions']['count'], game: Game, cx: FeatureContext): number {
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

/**
 * Returns the references a selection makes, its kind, holder and trait and its `where`. In the `where`, `'$'` stands
 * for any entity of its kind, or stays `'$'` with no kind.
 */
export function selectReferences(select: Select): Reference[] {
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
function entityCount(state: GameState, condition: EntitiesShape['conditions']['entity'], game: Game): number | undefined {
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

/** The shapes of the traits the game's rules and plugins declare words for, by trait id. */
function traitShapes(game: Game): Map<string, WordShape> {
  const out = new Map<string, WordShape>()
  for (const trait of game.rules?.traits ?? []) if (trait.words) out.set(trait.id, trait.words)
  for (const plugin of game.plugins ?? []) for (const trait of plugin.traits ?? []) if (trait.words) out.set(trait.id, trait.words)
  return out
}

/**
 * Kinds' words, then entities': their own, then their traits'. A trait's
 * words an entity has from its kind's default are named by the kind's key,
 * so a translation gives them once.
 */
function kindWords(game: Game, walk: WordWalk) {
  const shapes = traitShapes(game)
  const fromKind = new Map<string, Map<string, string>>()
  ;(game.kinds ?? []).forEach((kind, index) => {
    const entry = `kind.${kind.id}`
    const where = `kind ${kind.id}`
    walk.source = { list: 'kind', id: kind.id }
    walk.part({ label: true, plural: true }, kind, entry, entry, ['kinds', index], where)
    for (const [id, data] of Object.entries(kind.traits ?? {})) {
      const shape = shapes.get(id)
      if (!shape) continue
      const before = walk.spots.length
      walk.part(shape, data, entry, `${entry}.traits.${id}`, ['kinds', index, 'traits', id], where)
      const own = new Map<string, string>()
      for (const spot of walk.spots.slice(before)) own.set(`${id} ${spot.key.slice(entry.length)} ${spot.text}`, spot.key)
      fromKind.set(kind.id, new Map([...(fromKind.get(kind.id) ?? []), ...own]))
    }
  })
  ;(game.entities ?? []).forEach((entity, index) => {
    const ref = `${entity.of}:${entity.id}`
    walk.source = { list: 'entity', id: ref }
    walk.part({ name: true, description: true }, entity, `entity.${ref}`, `entity.${ref}`, ['entities', index], `entity ${ref}`)
  })
  for (const [id, byRef] of Object.entries(game.traits ?? {})) {
    const shape = shapes.get(id)
    if (!shape) continue
    for (const [ref, data] of Object.entries(byRef ?? {})) {
      const entry = `entity.${ref}`
      const kind = ref.slice(0, ref.indexOf(':'))
      walk.source = { list: 'trait', id: `${id} ${ref}` }
      const before = walk.spots.length
      walk.part(shape, data, entry, `${entry}.traits.${id}`, ['traits', id, ref], `entity ${ref}`)
      for (const spot of walk.spots.slice(before)) {
        const kinds = fromKind.get(kind)?.get(`${id} ${spot.key.slice(entry.length)} ${spot.text}`)
        if (kinds !== undefined) spot.key = kinds
      }
    }
  }
}

/** The entities feature, which keeps the changes play makes to entities and creates, removes and counts them. */
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
        const given: CreatedFields = { ...effect.with, like: effect.like as EntityRef | undefined }
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
          if (select.where && !cx.holds(next, game, bindCurrent(select.where, ref))) continue
          next = cx.runEffects(next, game, cx.buildEffects(game, bindCurrent(effect.effects, ref)), cx.ending)
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
  content: {
    kinds: { declares: byId('kind'), words: kindWords },
    // An entity's words and its traits' are walked with its kind's, which name a trait's words an entity has from its kind.
    entities: { declares: (entities) => entities.map((entity) => `entity "${entity.of}:${entity.id}"`), words: null },
    traits: {
      declares: (traits) => Object.entries(traits).flatMap(([id, rows]) => Object.keys(rows ?? {}).map((ref) => `trait "${id}" on "${ref}"`)),
      words: null,
    },
  },
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
        { ui: entity.ui, on: 'entity', id: `${entity.of}:${entity.id}` },
      ])
    }
    // A kind's `listed` and `flags` are asked of each of its entities, so `'$'` is any one of them.
    for (const kind of game.kinds ?? []) {
      const one = anyOf(kind.id)
      const asked = [...(typeof kind.listed === 'object' ? [kind.listed] : []), ...Object.values(kind.flags ?? {})]
      tools.check({ list: 'kind', id: kind.id }, `kind ${kind.id}`, [
        ...asked.map((when) => ({ when: bindCurrent(when, one) })),
        { ui: kind.ui, on: 'entity', id: kind.id },
      ])
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
        if (parts.id === '*') return []
        if (!entityDef(game, ref.entity)) return [`unknown entity "${ref.entity}"`]
        return ref.carrying === undefined || declaredTrait(game, ref.entity, ref.carrying) !== undefined ? [] : [`"${ref.entity}" has no ${ref.carrying} trait`]
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
      like: (ref) => {
        const parts = parseRef(ref.like)
        if (!parts) return ref.like === CURRENT ? [] : [`unknown entity "${ref.like}" to be like`]
        if (!kinds.has(parts.kind)) return [`unknown kind "${parts.kind}"`]
        if (ref.of !== undefined && parts.kind !== ref.of) return [`like names a ${parts.kind}, not a ${ref.of}`]
        if (parts.id !== '*' && !entityDef(game, ref.like)) return [`unknown entity "${ref.like}" to be like: name one the game declares`]
        return []
      },
      trait: (ref) => {
        const at = ref.trait.indexOf('/')
        if (at <= 0) return []
        const plugin = game.plugins?.find((entry) => entry.id === ref.trait.slice(0, at))
        return plugin && !traitDef(game, ref.trait) ? [`plugin "${plugin.id}" has no trait "${ref.trait}"`] : []
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
    entities: (game.kinds ?? [])
      .filter((kind) => kind.listed !== false)
      .map((kind) => {
        const stats = (game.stats ?? []).filter((stat) => stat.of === kind.id && stat.listed !== false)
        const holdsFor = (when: Condition | undefined, ref: EntityRef) => cx.holds(state, game, bindCurrent(when, ref))
        const listed = (ref: EntityRef) => (typeof kind.listed === 'object' ? holdsFor(kind.listed, ref) : true)
        const entries = entitiesOf(state, game, kind.id)
          .filter((ref) => listed(ref) && holdsFor(entityDef(game, ref)?.visible, ref))
          .map((ref): EntityView => {
            const id = parseRef(ref)!.id
            const description = entityText(state, game, ref, 'description')
            const image = entityImage(state, game, ref)
            return {
              id,
              ref,
              name: cx.fillTokens(state, game, entityText(state, game, ref, 'name') ?? id),
              description: description === undefined ? null : cx.fillTokens(state, game, description),
              image: image === undefined ? null : artSrc(image),
              tags: entityTags(state, game, ref),
              flags: Object.fromEntries(Object.entries(kind.flags ?? {}).map(([name, when]) => [name, holdsFor(when, ref)])),
              stats: stats.filter((stat) => holdsFor(stat.visible, ref)).map((stat) => statView(state, game, stat, ref, cx)),
              kv: entityKv(state, game, ref),
              ...withUi(entityUi(state, game, ref)),
            }
          })
        return { id: kind.id, label: kind.label, plural: kind.plural ?? kind.label, unique: kind.unique ?? false, entries }
      }),
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
  // The game's own traits are named without a `/`, which marks a plugin's.
  const own = new Set<string>()
  for (const trait of game.rules?.traits ?? []) {
    if (trait.id.includes('/') || !trait.id) tools.problem(undefined, 'rules', `trait "${trait.id}" is the game's own, so its id has no "/"`)
    if (own.has(trait.id)) tools.problem(undefined, 'rules', `two traits share the id "${trait.id}"`)
    own.add(trait.id)
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
    for (const [key, data] of Object.entries(byRef)) {
      const ref = key as EntityRef
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
  // What it was created with, description and picture included, is only ever written by play.
  if (record.description !== undefined) next.description = record.description
  if (record.image !== undefined) next.image = record.image
  // What it was created like and with is only ever written by play.
  if (record.like !== undefined) next.like = record.like
  if (record.tags?.length) next.tags = record.tags
  if (record.traitData && Object.keys(record.traitData).length) next.traitData = record.traitData
  const stats = Object.entries(record.stats ?? {}).filter(([id, value]) => {
    // One made like another reads what it lacks from that one, not from the stat's start: keep it all.
    if (record.like !== undefined) return true
    const stat = statOf(game, id)
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
