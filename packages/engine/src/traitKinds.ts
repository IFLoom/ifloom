/**
 * A kind of entity a plugin's trait makes, declared once: the places'
 * locations, the shop's vendors, the cast's people. Each is an entity of the
 * plugin's own kind (or any other) that carries the plugin's trait, so the
 * plugin needs the same few things for it: a bare id read as an entity of its
 * kind and named back, the list of those in play, the trait of one in play or
 * as content declares it (for a check, which has no state), a definer that
 * writes the entity's fields and the trait's side by side, and the reference
 * the checker resolves to one that must carry the trait. `defineTraitKind`
 * gives them all from the kind's id, the trait's id and the trait's fields.
 */
import type { Game } from './game.ts'
import type { GameState } from './types.ts'
import type { Reference } from './references.ts'
import { declaredTrait, declaredWithTrait, entityOf, parseRef, traitOf, withTrait, type EntityDef, type EntityRef, type TraitData } from './entities.ts'
import { arg, type Arg } from './pluginCalls.ts'

/**
 * What a trait kind's definer takes: an entity's fields (its `of` is the
 * kind's if left out) and the trait's, side by side. A field both have, such
 * as a place's `ui`, is the trait's.
 */
export type TraitEntityDef<K extends string> = Omit<EntityDef, 'of' | keyof TraitData<K>> & TraitData<K> & { of?: string }

/** What `defineTraitKind` takes. */
export type TraitKindSpec<K extends string> = {
  /** The kind a bare id names: `'location'`, so `'park'` is `'location:park'`. */
  kind: string
  /** The trait that makes an entity one: `'places/location'`. */
  trait: K
  /**
   * Every field of the trait, as `{ exits: true, body: true, … }`: what the
   * definer puts in the trait rather than on the entity. Typed complete, so a
   * field added to the trait can't be left out.
   */
  fields: { readonly [F in keyof Required<TraitData<K>>]: true }
}

/** A kind of entity a plugin's trait makes, as `defineTraitKind` declares it. */
export type TraitKind<K extends string> = {
  /** The kind a bare id names. */
  readonly kind: string
  /** The trait that makes an entity one. */
  readonly trait: K
  /** The entity an id names: a bare id is one of the kind (`'park'` is `'location:park'`), a reference is as written. */
  ref(id: string): EntityRef
  /** How the plugin names one back: its bare id for one of the kind, else its whole reference. */
  id(ref: string): string
  /** Every entity in the game now with the trait, as references: those content declares, in its order, then those made in play. */
  all(state: GameState, game: Game): EntityRef[]
  /** The trait of the entity an id or reference names, read through what it was made `like`; undefined for one that isn't in the game or has no trait. */
  get(state: GameState, game: Game, id: string | null | undefined): TraitData<K> | undefined
  /** Every entity content declares with the trait, in its order: for a check, which has no state. */
  declaredAll(game: Game): EntityRef[]
  /** The trait of an entity content declares, by id or reference: for a check, which has no state. */
  declaredGet(game: Game, id: string | null | undefined): TraitData<K> | undefined
  /**
   * An entity for content's `entities`, of the kind (or its `of`), with the
   * trait's fields put in `traits[trait]` and the rest left on the entity.
   */
  define(def: TraitEntityDef<K>): EntityDef
  /** The reference to one, by id or reference, for the checker: an entity the game has, which must carry the trait. */
  entry(id: string): Reference
  /** A call's argument naming one by id or reference, `'park'` or `'location:park'`, checked as `entry`. */
  arg(): Arg<string, string, false>
  /** A call's argument naming one or several, `'park'` or `['cafe', 'park']`, handed as a list. */
  args(): Arg<string | readonly string[], string[], false>
}

/**
 * Declare a kind of entity a plugin's trait makes, once.
 *
 * ```ts
 * const PLACES = defineTraitKind({ kind: 'location', trait: 'places/location', fields: { exits: true, body: true, … } })
 * PLACES.ref('park')                 // 'location:park'
 * PLACES.get(state, game, 'park')    // its Place, or undefined
 * PLACES.define({ id: 'park', name: 'Riverside Park', exits: [], body: [] })
 * const CALLS = defineCalls('places', { effects: { move: { location: PLACES.arg() } } })
 * ```
 *
 * The kind itself is still the plugin's to declare in its `content.kinds`,
 * with its label and whether it's listed.
 */
export function defineTraitKind<K extends string>(spec: TraitKindSpec<K>): TraitKind<K> {
  const { kind, trait } = spec
  const fields = new Set(Object.keys(spec.fields))
  const ref = (id: string): EntityRef => (id.includes(':') ? id : `${kind}:${id}`) as EntityRef
  const entry = (id: string): Reference => ({ entity: ref(id), carrying: trait })
  const cache = new WeakMap<Game, Map<EntityRef, TraitData<K>>>()
  /** What content declares, by reference, with its trait: worked out once per game. */
  const declared = (game: Game): Map<EntityRef, TraitData<K>> => {
    let found = cache.get(game)
    if (!found) {
      found = new Map()
      for (const one of declaredWithTrait(game, trait)) {
        const data = declaredTrait(game, one, trait)
        if (data !== undefined) found.set(one, data)
      }
      cache.set(game, found)
    }
    return found
  }
  return {
    kind,
    trait,
    ref,
    id: (one) => {
      const parts = parseRef(one)
      return parts?.kind === kind ? parts.id : one
    },
    all: (state, game) => withTrait(state, game, trait),
    get: (state, game, id) => {
      if (id === null || id === undefined || id === '') return undefined
      const full = ref(id)
      return entityOf(state, game, full) ? traitOf(state, game, full, trait) : undefined
    },
    declaredAll: (game) => [...declared(game).keys()],
    declaredGet: (game, id) => (id === null || id === undefined || id === '' ? undefined : declared(game).get(ref(id))),
    define: (def) => {
      const { of, traits, ...rest } = def as TraitEntityDef<K> & Pick<EntityDef, 'traits'>
      const entity: Record<string, unknown> = {}
      const data: Record<string, unknown> = {}
      for (const [field, value] of Object.entries(rest)) {
        if (value === undefined) continue
        if (fields.has(field)) data[field] = value
        else entity[field] = value
      }
      return { ...(entity as Omit<EntityDef, 'of'>), of: of ?? kind, traits: { ...traits, [trait]: data } }
    },
    entry,
    arg: () => arg.string().naming((id): Reference[] => (id ? [entry(id)] : [])),
    args: () => arg.strings().naming((ids): Reference[] => ids.map(entry)),
  }
}
