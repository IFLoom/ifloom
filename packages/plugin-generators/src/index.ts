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
  roll,
  weighted,
  type EffectRef,
  type KvValue,
  type Game,
  type GameState,
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

/** How to make one entity of a kind. */
export type TemplateDef = {
  id: string
  /** The kind of entity it makes. */
  of: string
  /** Its name. */
  name: FieldDef
  /** Its stats, by id: stats the game declares for the kind. Left out, a stat starts at its `start`. */
  stats?: Record<string, FieldDef>
  /** Its kv keys, by name. */
  kv?: Record<string, FieldDef>
}

/** What a template draws for one entity, as the engine's `create` effect takes it. */
export type GeneratedEntity = { name: string; stats: Record<string, number>; kv: Record<string, KvValue> }

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
  const stats: Record<string, number> = {}
  for (const [id, field] of Object.entries(template.stats ?? {})) {
    const value = Number(draw(field, game, parts(`stat:${id}`)))
    if (Number.isFinite(value)) stats[id] = value
  }
  const kv: Record<string, KvValue> = {}
  // Drawn under `flag:<id>`, the name from before the kv store, so a seed deals the same values it always has.
  for (const [id, field] of Object.entries(template.kv ?? {})) kv[id] = draw(field, game, parts(`flag:${id}`))
  return { name: String(draw(template.name, game, parts('name'))), stats, kv }
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
    { where: 'name', field: template.name },
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
export function generators() {
  return definePlugin({
    id: ID,
    version: 1,
    effects: {
      /** `{ custom: 'generators/generate', with: { template, count? } }`: make `count` (1 if left out) entities from the template. */
      generate: (state, args, { game, apply }) => {
        const template = templateDefs(game).find((entry) => entry.id === String(args.template ?? ''))
        if (!template) return state
        const count = Math.max(0, Math.floor(Number(args.count ?? 1)) || 0)
        let next = state
        for (let made = 0; made < count; made += 1) {
          // The number the engine's `create` gives the next one: every draw for it is seeded by it.
          const n = (next.created?.[template.of] ?? 0) + 1
          next = apply([{ kind: 'create', of: template.of, entity: drawEntity(template, next, game, n) }], next)
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
            { kind: template.of },
            ...Object.keys(template.stats ?? {}).map((stat): Reference => ({ stat, starts: template.of })),
            ...fields(template).flatMap(({ field }) => poolsIn(field)).map((pool): Reference => ({ entry: pool, plugin: ID, list: 'pools', noun: 'pool' })),
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
        for (const { where, field } of fields(template)) {
          for (const what of rangeProblems(field)) problems.push({ list: 'templates', id: template.id, what: `${where}: ${what}` })
        }
      }
      return problems
    },
  })
}

/** An effect: make `count` (1 if left out) new entities from the template. */
export const generate = (template: string, count?: number): EffectRef => ({ custom: 'generators/generate', with: count === undefined ? { template } : { template, count } })
