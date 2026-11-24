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
  arg,
  defineCalls,
  defineData,
  definePlugin,
  draw,
  list,
  parseRef,
  statOf,
  statValue,
  weighted,
  type DefinedPlugin,
  type Effect,
  type EffectRef,
  type EffectsOf,
  type EntityRef,
  type Game,
  type GameState,
  type KvValue,
  type Placement,
  type PluginProblem,
  type Reference,
} from '@ifloom/engine'
import { CONTENT_VERSION, contentMigrations } from './upgrade.ts'

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
  description?: FieldDef
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
export type GeneratedEntity = { name?: string; description?: string; image?: string; stats: Record<string, number>; kv: Record<string, KvValue> }

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
}

const ID = 'generators'

/** The plugin's content: `data.generators.pools` and `data.generators.templates`. */
const DATA = defineData(ID, {
  pools: list<PoolDef>({ noun: 'pool' }),
  templates: list<TemplateDef>({ noun: 'template' }),
})

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  effects: {
    /** Make `count` (1 if left out) entities from the template. */
    generate: {
      template: arg.entry(DATA.templates),
      count: arg
        .number()
        .optional(1)
        .rule((count) => (Number.isInteger(count) && count >= 1 ? undefined : 'count must be a whole number, 1 or more')),
    },
  },
})

/** The game's pools: `data.generators.pools`, from its packs. */
export function poolsOf(game: Game): PoolDef[] {
  return DATA.pools.all(game)
}

/** The game's templates: `data.generators.templates`, from its packs. */
export function templatesOf(game: Game): TemplateDef[] {
  return DATA.templates.all(game)
}

function entryValue(entry: PoolEntry): KvValue {
  return typeof entry === 'object' && entry !== null ? entry.value : entry
}

function entryWeight(entry: PoolEntry): number | undefined {
  return typeof entry === 'object' && entry !== null ? entry.weight : undefined
}

/** One field drawn: from the parts that seed it, plus where it is in the template. */
function drawField(field: FieldDef, game: Game, parts: (string | number)[]): KvValue {
  if (typeof field !== 'object' || field === null) return field
  if ('pool' in field) {
    const pool = DATA.pools.get(game, field.pool)
    const picked = pool && weighted(pool.values, entryWeight, ...parts)
    return picked === undefined ? '' : entryValue(picked)
  }
  if ('between' in field) {
    const [low, high] = field.between
    const min = Math.ceil(Math.min(low, high))
    const max = Math.floor(Math.max(low, high))
    return min + draw(max - min + 1, ...parts)
  }
  return field.join.map((part, n) => String(drawField(part, game, [...parts, n]))).join(field.with ?? ' ')
}

/**
 * What a template draws for the `n`th entity of its kind made in play, in
 * this save. The plugin's effect passes the number the next one will get, so
 * each is different and the same on every replay.
 */
export function drawEntity(state: GameState, game: Game, template: TemplateDef, n: number): GeneratedEntity {
  const parts = (field: string) => [ID, state.seed, template.id, n, field]
  // Each field is drawn under a name of its own; the description under `desc`, its name before schema 26, so a seed deals what it always has.
  const text = (field: FieldDef | undefined, name: string, drawnAs = name) =>
    field === undefined ? {} : { [name]: String(drawField(field, game, parts(drawnAs))) }
  const stats: Record<string, number> = {}
  for (const [id, field] of Object.entries(template.stats ?? {})) {
    const value = Number(drawField(field, game, parts(`stat:${id}`)))
    if (Number.isFinite(value)) stats[id] = value
  }
  const kv: Record<string, KvValue> = {}
  // Drawn under `flag:<id>`, the name from before the kv store, so a seed deals the same values it always has.
  for (const [id, field] of Object.entries(template.kv ?? {})) kv[id] = drawField(field, game, parts(`flag:${id}`))
  return { ...text(template.name, 'name'), ...text(template.description, 'description', 'desc'), ...text(template.image, 'image'), stats, kv }
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
  const drawn = drawEntity(state, game, template, n)
  const anyway = (id: string) => (template.like !== undefined ? statValue(state, game, id, template.like) : (statOf(game, id)?.start ?? 0))
  const stats = Object.fromEntries(Object.entries(drawn.stats).filter(([id, value]) => value !== anyway(id)))
  return {
    create: kind,
    ...(template.like !== undefined ? { like: template.like } : {}),
    ...(template.at !== undefined ? { at: template.at } : {}),
    with: {
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
    ...(['name', 'description', 'image'] as const).flatMap((where) => (template[where] === undefined ? [] : [{ where, field: template[where] }])),
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
function generatorsPlugin(): DefinedPlugin<null> {
  return definePlugin<null, unknown, typeof CALLS>({
    id: ID,
    version: 1,
    calls: CALLS,
    data: DATA,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    effects: {
      /** `{ 'generators/generate': { template, count? } }`: make `count` (1 if left out) entities from the template. */
      generate: (state, args, { game, apply }) => {
        const template = DATA.templates.get(game, args.template)
        const kind = template && templateKind(template)
        if (!template || kind === undefined) return state
        const count = Math.max(0, Math.floor(args.count))
        let next = state
        for (let made = 0; made < count; made += 1) {
          // The number the engine's `create` gives the next one: every draw for it is seeded by it.
          const n = (next.created?.[kind] ?? 0) + 1
          next = apply([created(template, next, game, kind, n)], next)
        }
        return next
      },
    },
    references: {
      content: (game) =>
        DATA.templates.content(game, (template) => [
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
            .map((pool) => DATA.pools.ref(pool)),
        ]),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const pool of poolsOf(game)) {
        const live = (pool.values ?? []).filter((entry) => {
          const weight = entryWeight(entry) ?? 1
          return Number.isFinite(weight) && weight > 0
        })
        if (!live.length) problems.push(DATA.pools.problem(pool.id, 'has nothing to pick: no values, or every weight is 0'))
      }
      for (const template of templatesOf(game)) {
        const problem = (what: string) => problems.push(DATA.templates.problem(template.id, what))
        if (templateKind(template) === undefined) problem('makes nothing: give it an of or a like')
        else if (template.name === undefined && template.like === undefined) problem('needs a name, or a like to read it from')
        for (const { where, field } of fields(template)) {
          for (const what of rangeProblems(field)) problem(`${where}: ${what}`)
        }
      }
      return problems
    },
  })
}

/** An effect: make `count` (1 if left out) new entities from the template. */
const generate = (template: string, count?: number): EffectRef => CALLS.effects.generate(count === undefined ? { template } : { template, count })

/**
 * The plugin, with its helpers on it: `generators()` makes the plugin for the
 * game's `plugins`, and content is written with `generators.generate('regular')`.
 */
export const generators = Object.assign(generatorsPlugin, { generate })
