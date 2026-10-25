import { describe, expect, expectTypeOf, it } from 'vitest'
import { TABLES } from '../../src/core.ts'
import {
  afterOrder,
  checkRequires,
  FEATURES,
  featureKinds,
  type FeatureCommands,
  type FeatureConditions,
  type FeatureEffects,
} from '../../src/features/registry.ts'

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
      'features/actions.ts',
      'features/audio.ts',
      'features/entities.ts',
      'features/feature.ts',
      'features/flows.ts',
      'features/holdings.ts',
      'features/inputs.ts',
      'features/kv.ts',
      'features/locks.ts',
      'features/media.ts',
      'features/minigames.ts',
      'features/notices.ts',
      'features/panels.ts',
      'features/rolls.ts',
      'features/saving.ts',
      'features/scenes.ts',
      'features/settings.ts',
      'features/stats.ts',
      'features/storylines.ts',
      'features/timers.ts',
      'features/triggers.ts',
      'features/turns.ts',
      'features/ui.ts',
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
      expect(
        [...loaded].filter((target) => target === REGISTRY || CORE.includes(target)),
        file,
      ).toEqual([])
    }
  })
})

describe('the registry', () => {
  it('holds every kind each feature declares, in the tables the core reads', () => {
    for (const feature of FEATURES) {
      const kinds = featureKinds[feature.name]
      for (const kind of kinds.conditions)
        expect(TABLES.conditions[kind as keyof typeof TABLES.conditions], `${feature.name}: condition ${kind}`).toBe(feature.conditions[kind as never])
      for (const kind of kinds.effects)
        expect(TABLES.effects[kind as keyof typeof TABLES.effects], `${feature.name}: effect ${kind}`).toBe(feature.effects[kind as never])
      for (const kind of kinds.commands)
        expect(TABLES.commands[kind as keyof typeof TABLES.commands], `${feature.name}: command ${kind}`).toBe(feature.commands[kind as never])
    }
    expect(featureKinds).toEqual({
      turns: { conditions: ['turn'], effects: ['turn'], commands: [] },
      kv: { conditions: ['kv'], effects: ['kv'], commands: [] },
      storylines: { conditions: ['storyline'], effects: ['closeStoryline'], commands: [] },
      notices: { conditions: [], effects: ['notify'], commands: ['dismiss'] },
      triggers: { conditions: [], effects: [], commands: [] },
      scenes: { conditions: ['chose', 'seen', 'since', 'scene'], effects: ['scene'], commands: ['scene', 'choose', 'leave'] },
      minigames: { conditions: [], effects: ['minigame'], commands: ['minigame'] },
      timers: { conditions: ['timer'], effects: ['timer'], commands: ['tick'] },
      flows: { conditions: [], effects: ['point'], commands: [] },
      actions: { conditions: [], effects: [], commands: ['action'] },
      inputs: { conditions: [], effects: [], commands: ['input'] },
      settings: { conditions: ['setting'], effects: [], commands: ['setting'] },
      stats: { conditions: ['stat', 'level'], effects: ['stat'], commands: [] },
      audio: { conditions: [], effects: ['audio', 'sound'], commands: [] },
      media: { conditions: [], effects: [], commands: [] },
      ui: { conditions: [], effects: [], commands: [] },
      panels: { conditions: [], effects: ['panel'], commands: ['closePanel'] },
      entities: { conditions: ['count', 'entity'], effects: ['create', 'remove', 'each'], commands: [] },
      holdings: { conditions: [], effects: ['entity', 'move', 'you'], commands: [] },
      locks: { conditions: [], effects: [], commands: [] },
      saving: { conditions: [], effects: [], commands: [] },
      rolls: { conditions: ['roll'], effects: ['roll'], commands: [] },
    })
    // The core keeps only what is no feature's: the conditions that hold by their parts, and the plugins' seam.
    const owned = new Set(Object.values(featureKinds).flatMap((kinds) => [...kinds.conditions, ...kinds.effects, ...kinds.commands]))
    expect(Object.keys(TABLES.conditions).filter((kind) => !owned.has(kind))).toEqual(['all', 'any', 'not'])
    expect(Object.keys(TABLES.effects).filter((kind) => !owned.has(kind))).toEqual([])
    expect(Object.keys(TABLES.commands).filter((kind) => !owned.has(kind))).toEqual(['start', 'newGame', 'custom'])
    // And the compiler holds the tables to the features' kinds: each is a key of the table the core reads.
    expectTypeOf<keyof FeatureConditions>().toExtend<keyof typeof TABLES.conditions>()
    expectTypeOf<keyof FeatureEffects>().toExtend<keyof typeof TABLES.effects>()
    expectTypeOf<keyof FeatureCommands>().toExtend<keyof typeof TABLES.commands>()
  })

  it('runs the steps after a command in the order they always ran', () => {
    // The game's triggers fire first, so the showing a trigger opens is counted, and its sounds keyed, in the same command;
    // a level gained is noticed after the plugins' hooks, so a hook's reward counts.
    // A scene's minigame starts once the scene is counted as seen, and before the plugins' hooks, so they see it running.
    // A panel closes after the hooks, so a turn or a scene a hook moves on closes it too.
    // The command's rolls are kept last, so they include any a trigger or a hook made.
    // A flow starts the minigame or opens the panel it stands at once the scene's own minigame has started, and sees one it waits on end.
    expect(afterOrder).toEqual({ beforePlugins: ['triggers', 'scenes', 'minigames', 'flows', 'audio'], afterPlugins: ['stats', 'panels', 'rolls'] })
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
