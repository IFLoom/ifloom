import { describe, expect, expectTypeOf, it } from 'vitest'
import { KINDS } from '../../src/core.ts'
import { checkRequires, FEATURES, featureKinds, type FeatureCommands, type FeatureConditions, type FeatureEffects } from '../../src/features/registry.ts'

/**
 * Core features are modules that register (ADR 0007). These hold them to
 * the two rules that make that work: a feature is a leaf, so the registry
 * can be built whatever loads first, and every kind a feature declares is in
 * the tables the core reads.
 */
const SOURCES = import.meta.glob(['../../src/**/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const SRC = '../../src/'

/** Every import and re-export in a module: where from, and whether it is erased (`import type`, `export type`). */
function importsOf(source: string): { spec: string; typeOnly: boolean }[] {
  return [...source.matchAll(/^(import|export)\s+(type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gm)].map((match) => ({
    spec: match[3],
    typeOnly: Boolean(match[2]),
  }))
}

/** Where a relative import from `file` lands, as a key of `SOURCES`. */
function landsAt(file: string, spec: string): string {
  const parts = file.split('/').slice(0, -1)
  for (const part of spec.split('/')) {
    if (part === '..' && parts.length && parts.at(-1) !== '..') parts.pop()
    else if (part === '..') parts.push('..')
    else if (part !== '.') parts.push(part)
  }
  return parts.join('/')
}

/** Every module `file` loads when it runs, however far down: its imports that aren't erased. */
function loads(file: string, seen = new Set<string>()): Set<string> {
  for (const { spec, typeOnly } of importsOf(SOURCES[file] ?? '')) {
    if (typeOnly) continue
    const target = landsAt(file, spec)
    if (seen.has(target)) continue
    seen.add(target)
    loads(target, seen)
  }
  return seen
}

/** The core modules a feature must never import, even for a type: they import the registry, or read the features through it. */
const CORE = ['reduce', 'condition', 'availability', 'explain', 'check', 'loader', 'intake', 'screen', 'view', 'core'].map((name) => `${SRC}${name}.ts`)
const REGISTRY = `${SRC}features/registry.ts`
const FEATURE_FILES = Object.keys(SOURCES).filter((file) => file.startsWith(`${SRC}features/`) && file !== REGISTRY)

describe('core features are leaves', () => {
  it('finds the features', () => {
    expect(FEATURE_FILES.map((file) => file.slice(SRC.length)).sort()).toEqual([
      'features/audio.ts',
      'features/feature.ts',
      'features/media.ts',
      'features/scenes.ts',
      'features/settings.ts',
      'features/stats.ts',
    ])
    // The registry loads every feature, and a feature what it needs: audio needs settings.
    expect([...loads(REGISTRY)].filter((file) => file.startsWith(`${SRC}features/`)).sort()).toEqual(FEATURE_FILES.sort())
    expect(loads(`${SRC}features/audio.ts`).has(`${SRC}features/settings.ts`)).toBe(true)
    // Types are erased, so a type from the game is no load.
    expect(importsOf(SOURCES[`${SRC}features/audio.ts`])).toContainEqual({ spec: '../game.ts', typeOnly: true })
  })

  it('import no core module and not the registry, even for a type', () => {
    const offenders = FEATURE_FILES.flatMap((file) =>
      importsOf(SOURCES[file])
        .map(({ spec }) => landsAt(file, spec))
        .filter((target) => CORE.includes(target) || target === REGISTRY)
        .map((target) => `${file} → ${target}`),
    )
    expect(offenders).toEqual([])
  })

  it('load nothing that loads the registry back, so building it can never meet a half-loaded module', () => {
    for (const file of [REGISTRY, ...FEATURE_FILES]) {
      const loaded = loads(file)
      expect([...loaded].filter((target) => target === REGISTRY || CORE.includes(target)), file).toEqual([])
    }
  })
})

describe('the registry', () => {
  it('holds every kind each feature declares, in the tables the core reads', () => {
    for (const feature of FEATURES) {
      const kinds = featureKinds[feature.name]
      for (const kind of kinds.conditions) expect(KINDS.conditions[kind as keyof typeof KINDS.conditions], `${feature.name}: condition ${kind}`).toBe(feature.conditions[kind as never])
      for (const kind of kinds.effects) expect(KINDS.effects[kind as keyof typeof KINDS.effects], `${feature.name}: effect ${kind}`).toBe(feature.effects[kind as never])
      for (const kind of kinds.commands) expect(KINDS.commands[kind as keyof typeof KINDS.commands], `${feature.name}: command ${kind}`).toBe(feature.commands[kind as never])
    }
    expect(featureKinds).toEqual({
      settings: { conditions: ['setting'], effects: [], commands: ['setting'] },
      stats: { conditions: ['stat', 'tier', 'level'], effects: ['stat', 'setStat'], commands: [] },
      scenes: { conditions: ['chose', 'seen', 'since', 'scene'], effects: ['scene'], commands: ['scene', 'choose', 'leave'] },
      audio: { conditions: [], effects: ['audio', 'sound'], commands: [] },
      media: { conditions: [], effects: [], commands: [] },
    })
    // And the compiler holds the tables to the features' kinds: each is a key of the table the core reads.
    expectTypeOf<keyof FeatureConditions>().toExtend<keyof typeof KINDS.conditions>()
    expectTypeOf<keyof FeatureEffects>().toExtend<keyof typeof KINDS.effects>()
    expectTypeOf<keyof FeatureCommands>().toExtend<keyof typeof KINDS.commands>()
  })

  it('refuses to build when a feature requires one that is missing or comes later', () => {
    expect(() => checkRequires(FEATURES)).not.toThrow()
    expect(() => checkRequires([{ name: 'audio', requires: ['settings'] }])).toThrow('requires "settings", which is not registered')
    expect(() =>
      checkRequires([
        { name: 'audio', requires: ['settings'] },
        { name: 'settings', requires: [] },
      ]),
    ).toThrow('must be registered before it')
    expect(() =>
      checkRequires([
        { name: 'stats', requires: [] },
        { name: 'stats', requires: [] },
      ]),
    ).toThrow('Two features are named "stats"')
  })
})
