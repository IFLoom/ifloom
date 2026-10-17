/**
 * Content migrations: a pack written for an older `SCHEMA` is carried forward
 * one step at a time until it is a pack of this one, the way `STEPS` in
 * `intake.ts` carries a save. `loadGame` and `readMod` both go through
 * `upgradePack`, so an old pack and an old mod file still load.
 */
import type { Pack } from './loader.ts'

/** The content format this engine reads. A pack of an older one is upgraded by `PACK_STEPS`; a newer one is refused. */
export const SCHEMA = 4

/** A pack as it came in: some schema's shape, not necessarily this one. */
export type RawPack = Record<string, unknown> & { schema: number }

/**
 * The steps that reshape a pack, keyed by the schema each upgrades *from*.
 * Every schema from the oldest the engine reads up to `SCHEMA - 1` has one: a
 * pack whose chain has a gap is too old to read.
 *
 * When the content format changes, bump `SCHEMA` and add the step that
 * reshapes the previous schema in the same change. A step returns a new pack
 * and never changes the one it was given; the schema number is set for it.
 */
export const PACK_STEPS: Record<number, (pack: RawPack) => RawPack> = {}

/**
 * A pack brought up to `SCHEMA`, step by step, or why it can't be: it was
 * written for a newer engine, or for one so old there is no step from it. A
 * pack already at `SCHEMA` comes back as it is.
 */
export function upgradePack(pack: { schema: number }): Pack | string {
  const from = pack.schema
  if (!Number.isInteger(from)) return `has no schema number`
  if (from > SCHEMA) return `written for schema ${from}, this engine reads ${SCHEMA}`
  let raw = pack as RawPack
  for (let version = from; version < SCHEMA; version += 1) {
    const step = PACK_STEPS[version]
    if (!step) return `written for schema ${from}, too old for this engine to read (it reads ${SCHEMA})`
    raw = { ...step(raw), schema: version + 1 }
  }
  return raw as unknown as Pack
}
