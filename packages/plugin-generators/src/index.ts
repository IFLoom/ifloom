/**
 * @ifloom/plugin-generators: new entities made from templates, filled from
 * named pools of values and number ranges.
 *
 * The plugin knows nothing about people or anything else. A pool is any list
 * of values the game names, with optional weights, and a template says, for
 * an entity's name, stats and kv keys, whether to pick from a pool, draw a
 * number between two others, or use a fixed value. Every draw is seeded by the
 * save, the template and how many of the kind have been made, so a replay
 * makes the same entities.
 */
import {
  definePlugin,
  parseRef,
  roll,
  statDef,
  statValue,
  weighted,
  type DefinedPlugin,
  type Effect,
  type EffectRef,
  type EntityRef,
  type Game,
  type GameState,
  type KvValue,
  type Placement,
  type PluginProblem,
  type Reference,
} from '@ifloom/engine'

/** One value in a pool: the value, or the value with a weight (1 if left out). */
export type PoolEntry = KvValue | { value: KvValue; weight?: number }

/** A named list of values to pick from. */
export type PoolDef = { id: string; values: PoolEntry[] }

/**
 * Where one field of a new entity comes from:
 *
 * - a fixed value, as written: `'visitor'`, `3`, `true`;
 * - `{ pool: 'first-names' }`, one value picked from a pool by weight;
 * - `{ between: [1, 5] }`, a whole number from the first to the second, both included;
 * - `{ join: [...], with?: ' ' }`, several fields drawn and joined into one string.
 */
export type FieldDef = KvValue | { pool: string } | { between: [number, number] } | { join: FieldDef[]; with?: string }

/** How to make one entity of a kind, as the engine's `create` effect makes it. */
export type TemplateDef = {
  id: string
  /** The kind of entity it makes. The `like`'s kind if left out. */
  of?: string
  /** An entity it is made like: what it isn't given (name, picture, traits, stats) is read from that one. */
  like?: EntityRef
  /** Its name. The `like`'s if left out. */
  name?: FieldDef
  /** A line or two about it, drawn as the name is. */
  desc?: FieldDef
  /** Its picture, through `artSrc`, drawn as the name is: `{ pool: 'faces' }`. */
  image?: FieldDef
  /** Words it has, after its kind's and its `like`'s. */
  tags?: string[]
  /** Trait data, by trait id, over its `like`'s or its kind's: `{ 'cast/person': { home: 'park' } }`. */
  traits?: Record<string, unknown>
  /** Who holds it once made: a holder, or how many each holds. Nobody if left out. */
  at?: Placement
  /** Its stats, by id: stats the game declares for the kind. Left out, a stat reads its `like`'s, else its `start`. */
  stats?: Record<string, FieldDef>
  /** Its kv keys, by name. */
  kv?: Record<string, FieldDef>
}

/** What a template draws for one entity: the fields of the engine's `create` effect that come from pools and ranges. */
export type GeneratedEntity = { name?: string; desc?: string; image?: string; stats: Record<string, number>; kv: Record<string, KvValue> }

const ID = 'generators'

/** The game's pools: `data.generators.pools`, from its packs. */
export function poolDefs(game: Game): PoolDef[] {
  return (game.data?.[ID]?.pools ?? []) as PoolDef[]
}

/** The game's templates: `data.generators.templates`, from its packs. */
export function templateDefs(game: Game): TemplateDef[] {
  return (game.data?.[ID]?.templates ?? []) as TemplateDef[]
}

function entryValue(entry: PoolEntry): KvValue {
  return typeof entry === 'object' && entry !== null ? entry.value : entry
}

function entryWeight(entry: PoolEntry): number | undefined {
  return typeof entry === 'object' && entry !== null ? entry.weight : undefined
}

/** One field drawn: from the parts that seed it, plus where it is in the template. */
function draw(field: FieldDef, game: Game, parts: (string | number)[]): KvValue {
  if (typeof field !== 'object' || field === null) return field
  if ('pool' in field) {
    const pool = poolDefs(game).find((entry) => entry.id === field.pool)
    const picked = pool && weighted(pool.values, entryWeight, ...parts)
    return picked === undefined ? '' : entryValue(picked)
  }
  if ('between' in field) {
    const [low, high] = field.between
    const min = Math.ceil(Math.min(low, high))
    const max = Math.floor(Math.max(low, high))
    return min + roll(max - min + 1, ...parts)
  }
  return field.join.map((part, n) => String(draw(part, game, [...parts, n]))).join(field.with ?? ' ')
}

/**
 * What a template draws for the `n`th entity of its kind made in play, in
 * this save. The plugin's effect passes the number the next one will get, so
 * each is different and the same on every replay.
 */
export function drawEntity(template: TemplateDef, state: GameState, game: Game, n: number): GeneratedEntity {
  const parts = (field: string) => [ID, state.seed, template.id, n, field]
  const text = (field: FieldDef | undefined, name: string) => (field === undefined ? {} : { [name]: String(draw(field, game, parts(name))) })
  const stats: Record<string, number> = {}
  for (const [id, field] of Object.entries(template.stats ?? {})) {
    const value = Number(draw(field, game, parts(`stat:${id}`)))
    if (Number.isFinite(value)) stats[id] = value
  }
  const kv: Record<string, KvValue> = {}
  // Drawn under `flag:<id>`, the name from before the kv store, so a seed deals the same values it always has.
  for (const [id, field] of Object.entries(template.kv ?? {})) kv[id] = draw(field, game, parts(`flag:${id}`))
  return { ...text(template.name, 'name'), ...text(template.desc, 'desc'), ...text(template.image, 'image'), stats, kv }
}

/** The kind a template makes: its `of`, else its `like`'s. */
export function templateKind(template: TemplateDef): string | undefined {
  return template.of ?? (template.like !== undefined ? parseRef(template.like)?.kind : undefined)
}

/**
 * The `create` effect for the `n`th entity a template makes. A drawn stat that
 * is what the entity would read anyway (its `like`'s, else the stat's
 * `start`) is left out, so the save keeps only what differs.
 */
function created(template: TemplateDef, state: GameState, game: Game, kind: string, n: number): Effect {
  const drawn = drawEntity(template, state, game, n)
  const anyway = (id: string) => (template.like !== undefined ? statValue(state, game, id, template.like) : (statDef(game, id)?.start ?? 0))
  const stats = Object.fromEntries(Object.entries(drawn.stats).filter(([id, value]) => value !== anyway(id)))
  return {
    kind: 'create',
    of: kind,
    ...(template.like !== undefined ? { like: template.like } : {}),
    ...(template.at !== undefined ? { at: template.at } : {}),
    entity: {
      ...drawn,
      stats,
      ...(template.tags?.length ? { tags: template.tags } : {}),
      ...(template.traits && Object.keys(template.traits).length ? { traits: template.traits } : {}),
    },
  }
}

/** The pools a field names. */
function poolsIn(field: FieldDef | undefined): string[] {
  if (typeof field !== 'object' || field === null) return []
  if ('pool' in field) return [field.pool]
  if ('join' in field) return field.join.flatMap(poolsIn)
  return []
}

function fields(template: TemplateDef): { where: string; field: FieldDef }[] {
  return [
    ...(['name', 'desc', 'image'] as const).flatMap((where) => (template[where] === undefined ? [] : [{ where, field: template[where] }])),
    ...Object.entries(template.stats ?? {}).map(([id, field]) => ({ where: `stat ${id}`, field })),
    ...Object.entries(template.kv ?? {}).map(([id, field]) => ({ where: `kv ${id}`, field })),
  ]
}

function rangeProblems(field: FieldDef | undefined): string[] {
  if (typeof field !== 'object' || field === null) return []
  if ('between' in field) {
    const [low, high] = field.between ?? []
    if (!Number.isFinite(low) || !Number.isFinite(high)) return ['between needs two numbers']
    if (low > high) return [`between [${low}, ${high}] runs backwards`]
    return []
  }
  if ('join' in field) return field.join.flatMap(rangeProblems)
  return []
}

/**
 * The plugin. Add it to the game's `plugins`, and put pools and templates in
 * a pack's `data.generators.pools` and `data.generators.templates`.
 */
export function generators(): DefinedPlugin<null> {
  return definePlugin({
    id: ID,
    version: 1,
    effects: {
      /** `{ 'generators/generate': { template, count? } }`: make `count` (1 if left out) entities from the template. */
      generate: (state, args, { game, apply }) => {
        const template = templateDefs(game).find((entry) => entry.id === String(args.template ?? ''))
        const kind = template && templateKind(template)
        if (!template || kind === undefined) return state
        const count = Math.max(0, Math.floor(Number(args.count ?? 1)) || 0)
        let next = state
        for (let made = 0; made < count; made += 1) {
          // The number the engine's `create` gives the next one: every draw for it is seeded by it.
          const n = (next.created?.[kind] ?? 0) + 1
          next = apply([created(template, next, game, kind, n)], next)
        }
        return next
      },
    },
    argProblems: (kind, name, args) => {
      if (kind !== 'effects' || name !== 'generate' || args.count === undefined) return []
      const count = Number(args.count)
      return Number.isInteger(count) && count >= 1 ? [] : ['count must be a whole number, 1 or more']
    },
    references: {
      calls: (_kind, _name, args) => (args.template === undefined ? [] : [{ entry: String(args.template), plugin: ID, list: 'templates', noun: 'template' }]),
      content: (game) => [
        ...templateDefs(game).map((template) => ({
          list: 'templates',
          id: template.id,
          refs: [
            ...(templateKind(template) !== undefined ? [{ kind: templateKind(template)! }] : []),
            ...(template.like !== undefined ? [{ like: template.like, of: template.of }] : []),
            ...Object.keys(template.stats ?? {}).flatMap((stat): Reference[] =>
              templateKind(template) !== undefined ? [{ stat, starts: templateKind(template)! }] : [],
            ),
            ...Object.keys(typeof template.at === 'string' ? { [template.at]: 1 } : (template.at ?? {})).map((holder): Reference => ({ holder })),
            ...Object.keys(template.traits ?? {}).map((trait): Reference => ({ trait })),
            ...(typeof template.image === 'string' ? [{ picture: template.image }] : []),
            ...fields(template)
              .flatMap(({ field }) => poolsIn(field))
              .map((pool): Reference => ({ entry: pool, plugin: ID, list: 'pools', noun: 'pool' })),
          ],
        })),
      ],
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const pool of poolDefs(game)) {
        const live = (pool.values ?? []).filter((entry) => {
          const weight = entryWeight(entry) ?? 1
          return Number.isFinite(weight) && weight > 0
        })
        if (!live.length) problems.push({ list: 'pools', id: pool.id, what: 'has nothing to pick: no values, or every weight is 0' })
      }
      for (const template of templateDefs(game)) {
        if (templateKind(template) === undefined) problems.push({ list: 'templates', id: template.id, what: 'makes nothing: give it an of or a like' })
        else if (template.name === undefined && template.like === undefined)
          problems.push({ list: 'templates', id: template.id, what: 'needs a name, or a like to read it from' })
        for (const { where, field } of fields(template)) {
          for (const what of rangeProblems(field)) problems.push({ list: 'templates', id: template.id, what: `${where}: ${what}` })
        }
      }
      return problems
    },
  })
}

/** An effect: make `count` (1 if left out) new entities from the template. */
export const generate = (template: string, count?: number): EffectRef => ({ 'generators/generate': count === undefined ? { template } : { template, count } })
