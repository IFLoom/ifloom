import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import ts from 'typescript'
import { SCHEMA, checkGame } from '@ifloom/engine'
import { exportContent, fromJson, toJson, toTypeScript, exportPack } from '../lib/exporters.ts'
import { constName, formatTs, Raw } from '../lib/format.ts'
import { buildGame, importJson, problemsOf } from '../lib/game.ts'
import { newKind, newProject, newScene, newStat, newThing, sampleProject, type Project } from '../lib/model.ts'

const here = path.dirname(fileURLToPath(import.meta.url))

/** Type-check a module as if it were a file in this folder, so it imports the workspace's engine. */
function typeErrors(source: string): string[] {
  const file = path.join(here, '__exported__.ts')
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2023,
    lib: ['lib.es2023.d.ts'],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    customConditions: ['ifloom-source'],
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

  it('stays clean with a scene, a stat and a thing added from the forms’ defaults', () => {
    const project = newProject()
    project.pack.scenes.push(newScene('next'))
    project.pack.prose.next = 'And on.'
    project.pack.stats.push(newStat('charm'))
    project.pack.kinds = [newKind('item')]
    project.pack.entities.push(newThing('key'))
    project.pack.entities[0].desc = 'A key.'
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

  it('reads content, with no id or schema, taking its id from the file', () => {
    const { id: _id, schema: _schema, ...content } = JSON.parse(toJson(sampleProject()))
    const back = fromJson(JSON.stringify({ name: 'story.market', ...content }), undefined, 'Market Day')
    if ('error' in back) throw new Error(back.error)
    expect(back.project.pack.id).toBe('market-day')
    expect(back.project.pack).not.toHaveProperty('name')
    expect(exportContent(back.project)).toEqual(exportContent(sampleProject()))
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
    ['{"schema": 12}', /needs an "id"/],
    ['{"id": "x", "schema": 99}', /schema 99, this engine reads/],
    ['{"id": "x", "scenes": {}}', /should be a list/],
    ['{"id": "x", "scenes": [{"id": "a", "render": 1}]}', /isn't a data scene/],
  ])('refuses %s', (text, why) => {
    const result = fromJson(text)
    expect('error' in result && result.error).toMatch(why)
  })
})

describe('importing a file', () => {
  const file = (text: string | Error) => ({
    name: 'market.json',
    text: () => (text instanceof Error ? Promise.reject(text) : Promise.resolve(text)),
  })
  const kept: Project[] = []
  const keep = (project: Project) => {
    kept.push(project)
    return Promise.resolve()
  }

  it('keeps the project and says so', async () => {
    expect(await importJson(file(toJson(sampleProject())), keep)).toBe('Imported market.json.')
    expect(kept.at(-1)?.pack.id).toBe(sampleProject().pack.id)
  })

  it('names content after its file', async () => {
    const { id: _id, schema: _schema, ...content } = JSON.parse(toJson(sampleProject()))
    expect(await importJson(file(JSON.stringify(content)), keep)).toBe('Imported market.json.')
    expect(kept.at(-1)?.pack.id).toBe('market')
  })

  it('says what is wrong with a pack that will not open', async () => {
    expect(await importJson(file('not json'), keep)).toMatch(/^market\.json: That isn't JSON/)
  })

  it('turns a file that cannot be read, or a draft that cannot be kept, into a message instead of a rejection', async () => {
    expect(await importJson(file(new Error('The file was moved.')), keep)).toBe("market.json couldn't be imported: The file was moved.")
    const full = () => Promise.reject(new DOMException('The quota has been exceeded.', 'QuotaExceededError'))
    expect(await importJson(file(toJson(sampleProject())), full)).toBe("market.json couldn't be imported: The quota has been exceeded.")
  })
})

describe('TypeScript', () => {
  it('writes exported Content, with no id or schema, that type-checks', () => {
    const source = toTypeScript(sampleProject())
    expect(source).toMatch(/^import type \{ Content \} from '@ifloom\/engine'/)
    expect(source).toContain('export const marketDay: Content = {')
    expect(source).not.toContain('schema')
    expect(source).toContain(' * Save it as src/story/market-day.ts in your game')
    expect(typeErrors(source)).toEqual([])
  }, 30_000)

  it('is formatted like the examples', () => {
    const source = toTypeScript(sampleProject())
    expect(source).toContain("  stats: [{ id: 'coins', label: 'Coins', start: 5, max: 999, format: '{n}p', spendable: true }],")
    expect(source).toContain("        { id: 'listen', effects: [{ kind: 'kv', key: 'heardBusker', to: true }, { kind: 'scene', scene: 'market' }] },")
    expect(source).toContain("  entities: [{ id: 'bun', of: 'item', name: 'Iced bun', desc: 'Still warm from the bakery stall.' }],")
    expect(source).toContain("      body: [{ text: 'home' }, { text: 'home.bun', when: { entity: 'item:bun', at: 'you' } }],")
    expect(source).toContain("    'market#buy': 'Buy an iced bun',")
    expect(source).toContain(' * - `heardBusker`: Set once you have listened to the busker.')
    expect(source).toContain("loadGame([marketDay], { id: 'market-day', title: 'Market day', introScene: 'market' })")
  })

  it('evaluates to the JSON pack without its id and schema', () => {
    const project = sampleProject()
    const source = toTypeScript(project)
    const literal = source.slice(source.indexOf(': Content = ') + ': Content = '.length)
    const { id: _id, schema: _schema, ...content } = JSON.parse(toJson(project))
    // oxlint-disable-next-line typescript/no-implied-eval -- the test runs the exported literal on purpose
    expect(new Function(`return ${literal}`)()).toEqual(content)
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
