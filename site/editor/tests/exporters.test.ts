import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import ts from 'typescript'
import { SCHEMA, checkGame } from '@ifloom/engine'
import { fromJson, toJson, toTypeScript, exportPack } from '../lib/exporters.ts'
import { constName, formatTs, Raw } from '../lib/format.ts'
import { buildGame, problemsOf } from '../lib/game.ts'
import { newItem, newProject, newScene, newStat, sampleProject, type Project } from '../lib/model.ts'

const here = path.dirname(fileURLToPath(import.meta.url))

/** Type-check a module as if it were a file in this folder, so it imports the workspace's engine. */
function typeErrors(source: string): string[] {
  const file = path.join(here, '__exported__.ts')
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2023,
    lib: ['lib.es2023.d.ts'],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowImportingTsExtensions: true,
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    types: [],
  }
  const host = ts.createCompilerHost(options)
  const read = host.getSourceFile
  host.getSourceFile = (name, version, ...rest) => (path.resolve(name) === file ? ts.createSourceFile(name, source, version) : read(name, version, ...rest))
  const fileExists = host.fileExists
  host.fileExists = (name) => path.resolve(name) === file || fileExists(name)
  const program = ts.createProgram([file], options, host)
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file?.fileName && path.resolve(d.file.fileName) === file)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
}

function clean(project: Project) {
  const built = buildGame(project)
  if ('error' in built) throw new Error(built.error)
  return built.problems
}

describe('a new project', () => {
  it('passes checkGame as it comes', () => {
    expect(clean(newProject())).toEqual([])
  })

  it('stays clean with a scene, a stat and an item added from the forms’ defaults', () => {
    const project = newProject()
    project.pack.scenes.push(newScene('next'))
    project.pack.prose.next = 'And on.'
    project.pack.stats.push(newStat('charm'))
    project.pack.items.push(newItem('key'))
    project.pack.items[0].desc = 'A key.'
    expect(clean(project)).toEqual([])
  })

  it('reports a scene with no prose', () => {
    const project = newProject()
    project.pack.scenes.push(newScene('next'))
    expect(problemsOf(project).map((p) => p.where)).toContain('scene next')
  })
})

describe('the sample project', () => {
  it('passes checkGame', () => {
    expect(clean(sampleProject())).toEqual([])
  })

  it('has a stat, a cost with a blocked reason and a storylet', () => {
    const { pack } = sampleProject()
    expect(pack.stats).toHaveLength(1)
    const buy = pack.scenes[0].choices.find((c) => c.id === 'buy')!
    expect(buy.blocked?.[0].reason).toMatch(/3p/)
    expect(pack.scenes.some((s) => s.drawnFrom?.length)).toBe(true)
  })
})

describe('JSON', () => {
  it('round-trips a project’s pack', () => {
    const project = sampleProject()
    const json = toJson(project)
    const back = fromJson(json)
    if ('error' in back) throw new Error(back.error)
    expect(exportPack(back.project)).toEqual(exportPack(project))
    expect(back.project.intro).toBe('market')
    expect(back.project.kv.map((v) => v.name)).toEqual(['heardBusker'])
  })

  it('leaves empty lists out', () => {
    const pack = JSON.parse(toJson(newProject('Quiet')))
    expect(Object.keys(pack)).toEqual(['id', 'schema', 'scenes', 'prose'])
    expect(pack.schema).toBe(SCHEMA)
  })

  it('switches on a plugin the pack has content for', () => {
    const back = fromJson(JSON.stringify({ id: 'q', schema: SCHEMA, scenes: [], data: { quests: { quests: [] } } }))
    if ('error' in back) throw new Error(back.error)
    expect(back.project.preview.plugins.quests?.on).toBe(true)
  })

  it.each([
    ['not json', /isn't JSON/],
    ['[1]', /JSON object/],
    ['{"schema": 4}', /needs an "id"/],
    ['{"id": "x", "schema": 1}', /schema 1/],
    ['{"id": "x", "schema": 99}', /schema 99, this engine reads/],
    ['{"id": "x", "scenes": {}}', /should be a list/],
    ['{"id": "x", "scenes": [{"id": "a", "render": 1}]}', /isn't a data scene/],
  ])('refuses %s', (text, why) => {
    const result = fromJson(text)
    expect('error' in result && result.error).toMatch(why)
  })
})

describe('TypeScript', () => {
  it('writes an exported Pack that type-checks', () => {
    const source = toTypeScript(sampleProject())
    expect(source).toMatch(/^import \{ SCHEMA, type Pack \} from '@ifloom\/engine'/)
    expect(source).toContain('export const marketDay: Pack = {')
    expect(source).toContain('  schema: SCHEMA,')
    expect(typeErrors(source)).toEqual([])
  }, 30_000)

  it('is formatted like the examples', () => {
    const source = toTypeScript(sampleProject())
    expect(source).toContain("  stats: [{ id: 'coins', label: 'Coins', start: 5, max: 999, format: '{n}p', spendable: true }],")
    expect(source).toContain("        { id: 'listen', effects: [{ kind: 'kv', key: 'heardBusker', to: true }, { kind: 'scene', id: 'market' }] },")
    expect(source).toContain("    { id: 'home', title: 'Home', body: [{ text: 'home' }, { text: 'home/bun', when: { has: 'bun' } }], choices: [] },")
    expect(source).toContain("    'market#buy': 'Buy an iced bun',")
    expect(source).toContain(" * - `heardBusker`: Set once you have listened to the busker.")
    expect(source).toContain("loadGame([marketDay], { id: 'market-day', title: 'Market day', introScene: 'market' })")
  })

  it('evaluates to the same pack as the JSON', () => {
    const project = sampleProject()
    const source = toTypeScript(project)
    const literal = source.slice(source.indexOf(': Pack = ') + ': Pack = '.length).replace(/SCHEMA/g, String(SCHEMA))
    expect(new Function(`return ${literal}`)()).toEqual(JSON.parse(toJson(project)))
  })
})

describe('the formatter', () => {
  it('quotes keys and strings only where it must', () => {
    expect(formatTs({ a: 'it’s', 'b#c': "don't", n: 1, t: true, z: null, gone: undefined })).toBe(`{ a: 'it’s', 'b#c': 'don\\'t', n: 1, t: true, z: null }`)
  })

  it('breaks what doesn’t fit, with trailing commas', () => {
    expect(formatTs({ list: ['aaaa', 'bbbb', 'cccc'] }, { width: 20 })).toBe(`{\n  list: [\n    'aaaa',\n    'bbbb',\n    'cccc',\n  ],\n}`)
  })

  it('writes raw code as it is and new lines as escapes', () => {
    expect(formatTs({ schema: new Raw('SCHEMA'), text: 'a\n\nb' })).toBe(`{ schema: SCHEMA, text: 'a\\n\\nb' }`)
  })

  it('makes a constant name from a pack id', () => {
    expect(constName('market-day')).toBe('marketDay')
    expect(constName('3 bears')).toBe('pack3Bears')
    expect(constName('---')).toBe('pack')
    expect(constName('default')).toBe('defaultPack')
  })
})

describe('checkGame on a built game', () => {
  it('sees what the editor sees', () => {
    const built = buildGame(sampleProject())
    if ('error' in built) throw new Error(built.error)
    expect(checkGame(built.game).problems).toEqual([])
  })

  it('turns bad plugin options into one problem', () => {
    const project = newProject()
    project.preview.plugins.calendar = { on: true, options: '{ nope' }
    expect(problemsOf(project)).toEqual([{ pack: 'preview', where: 'plugins', what: expect.stringMatching(/calendar plugin's options aren't JSON/) }])
  })
})
