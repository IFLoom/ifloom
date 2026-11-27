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
  draw,
  parseRef,
  statOf,
  statValue,
  weighted,
  type Effect,
  type EffectRef,
  type EntityRef,
  type Game,
  type GameState,
  type KvValue,
  type Placement,
} from '@ifloom/engine'
import { arg, defineCalls, defineData, definePlugin, list, type DefinedPlugin, type EffectsOf, type PluginProblem, type Reference } from '@ifloom/engine/plugin'

/** An entry of a pool, a value or a value with a weight. A bare value, or a weight left out, weighs 1. */
export type PoolEntry = KvValue | { value: KvValue; weight?: number }

/** A pool the game declares in `data.generators.pools`, a named list of values a template picks from. At least one entry must weigh more than 0. */
export type PoolDef = {
  /** The pool's id, which a field's `{ pool }` names. */
  id: string
  /** The pool's entries, each picked by its weight. */
  values: PoolEntry[]
}

/**
 * A field of a template, which gives one value of a new entity. Each form is told apart by its shape.
 *
 * The forms are:
 *
 * - a fixed value, as written, such as `'visitor'`, `3` or `true`
 * - `{ pool: 'first-names' }`, one value drawn from a pool by weight
 * - `{ between: [1, 5] }`, a whole number from the first to the second, both included
 * - `{ join: [...], with?: ' ' }`, several fields drawn and joined into one string, with a space if `with` is left out
 */
export type FieldDef = KvValue | { pool: string } | { between: [number, number] } | { join: FieldDef[]; with?: string }

/**
 * A template the game declares in `data.generators.templates`, which makes entities of one kind through the engine's
 * `create` effect. It needs an `of` or a `like`, and a `name` or a `like`.
 */
export type TemplateDef = {
  /** The template's id, which `generators/generate` names. */
  id: string
  /** The kind of entity the template makes. The `like`'s kind if left out. */
  of?: string
  /** The entity the new ones are made like. The engine reads from it the fields the template doesn't give, such as the name, picture, traits and stats. */
  like?: EntityRef
  /** The new entity's name. The `like`'s name if left out. */
  name?: FieldDef
  /** The new entity's description, drawn as the name is. */
  description?: FieldDef
  /** The new entity's picture, a path in the game's `art/` folder, drawn as the name is, such as `{ pool: 'faces' }`. */
  image?: FieldDef
  /** The new entity's tags, added after its kind's and its `like`'s. */
  tags?: string[]
  /** The new entity's trait data by trait id, over its `like`'s or its kind's, such as `{ 'cast/person': { home: 'park' } }`. */
  traits?: Record<string, unknown>
  /** The holder of the new entity once made, or how many each holder holds. Nobody holds it if left out. */
  at?: Placement
  /**
   * The new entity's stats by id, each a stat the game declares for the kind. A stat left out reads the `like`'s
   * value, else its `start`.
   */
  stats?: Record<string, FieldDef>
  /** The new entity's kv keys by name. */
  kv?: Record<string, FieldDef>
}

/**
 * The values a template draws for one entity, as `drawEntity` returns them. They're the fields of the engine's
 * `create` effect that come from pools and ranges.
 */
export type GeneratedEntity = {
  /** The drawn name, left out when the template gives none. */
  name?: string
  /** The drawn description, left out when the template gives none. */
  description?: string
  /** The drawn picture's path, left out when the template gives none. */
  image?: string
  /** The drawn stats by id. A field that draws no finite number is left out. */
  stats: Record<string, number>
  /** The drawn kv values by key. */
  kv: Record<string, KvValue>
}

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
}

const ID = 'generators'

/** The plugin's two lists, as content writes them in `data.generators.pools` and `data.generators.templates` (a plugin's `data` holds its lists by name). */
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

/** Returns the game's pools, `data.generators.pools` from its content and packs, in declared order. */
export function poolsOf(game: Game): PoolDef[] {
  return DATA.pools.all(game)
}

/** Returns the game's templates, `data.generators.templates` from its content and packs, in declared order. */
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
 * Returns the values a template draws for the `n`th entity of its kind made in play in this save. The same save,
 * template and `n` always draw the same values.
 *
 * The `generators/generate` effect passes the number the engine's `create` gives the next entity, so each new entity
 * differs and a replay makes the same ones.
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

/** Returns the kind a template makes, its `of`, else its `like`'s kind. It's undefined when the template has neither. */
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
 * the content's `data.generators.pools` and `data.generators.templates`.
 */
function generatorsPlugin(): DefinedPlugin<null> {
  return definePlugin<null, unknown, typeof CALLS>({
    id: ID,
    version: 1,
    calls: CALLS,
    data: DATA,
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
 * Returns the generators plugin, for the game's `plugins`. Content declares pools and templates in
 * `data.generators.pools` and `data.generators.templates`.
 *
 * Its helper writes its effect, such as `generators.generate('regular')`.
 */
export const generators = Object.assign(generatorsPlugin, {
  /** Returns the `generators/generate` effect, which makes `count` new entities from the template, 1 if left out. */
  generate,
})
