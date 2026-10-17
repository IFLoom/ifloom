/**
 * A project out as a pack, in JSON or TypeScript, and a JSON pack back in.
 */
import { SCHEMA, upgradePack, type DataScene, type Pack } from '@ifloom/engine'
import { Raw, constName, formatTs, quote } from './format.ts'
import { defaultPreview, newId, PLUGIN_IDS, PLUGINS, slug, type EditorPack, type PluginId, type Project } from './model.ts'
import { kvUsed } from './references.ts'

/** The pack as it goes out: the lists it has nothing in left out. */
export function exportPack(project: Project): Pack {
  const { id, schema: _schema, scenes, stats, items, prose, ...rest } = project.pack
  // The usual order: id and schema, then stats, items, scenes, anything else, and the prose last.
  const pack: Pack = { id, schema: SCHEMA }
  if (stats.length) pack.stats = stats
  if (items.length) pack.items = items
  pack.scenes = scenes
  Object.assign(pack, rest)
  if (Object.keys(prose).length) pack.prose = prose
  return pack
}

/** The pack as JSON, the shape a mod file has. */
export function toJson(project: Project): string {
  return `${JSON.stringify(exportPack(project), null, 2)}\n`
}

/** Lists of entries, and the prose, break one entry a line; anything else breaks only when it doesn't fit. */
function packBreaks(name: string | null, depth: number): boolean {
  if (depth === 0) return true
  if (depth === 1 && (name === 'scenes' || name === 'prose')) return true
  return false
}

/**
 * The pack as a TypeScript module: `export const <name>: Pack = { … }`, with a
 * note of the kv keys it uses and how to load it.
 */
export function toTypeScript(project: Project): string {
  const pack = exportPack(project)
  const name = constName(pack.id)
  const body = formatTs({ ...pack, schema: new Raw('SCHEMA') }, { width: 120, alwaysBreak: packBreaks })
  const notes = project.kv.length ? project.kv : kvUsed(project.pack).map((n) => ({ name: n, note: '' }))
  const lines = ['/**', ` * ${project.title}, made in the IFLoom editor.`]
  if (notes.length) {
    lines.push(' *', ' * The kv keys it uses:')
    for (const v of notes) lines.push(` * - \`${v.name}\`${v.note ? `: ${v.note}` : ''}`)
  }
  lines.push(
    ' *',
    ' * Load it with:',
    ` *   loadGame([${name}], { id: ${quote(pack.id)}, title: ${quote(project.title)}${project.intro ? `, introScene: ${quote(project.intro)}` : ''} })`,
    ' */',
  )
  return `import { SCHEMA, type Pack } from '@ifloom/engine'\n\n${lines.join('\n')}\nexport const ${name}: Pack = ${body}\n`
}

/** What reading a JSON pack gave: a project, or why it isn't a pack. */
export type Imported = { project: Project } | { error: string }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * A project from a JSON pack. It is refused if it isn't JSON, isn't an object
 * with an `id`, or holds a scene that isn't data. Anything else comes in as it
 * is, and the editor's problems list says what `checkGame` makes of it.
 */
export function fromJson(text: string, title?: string): Imported {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return { error: `That isn't JSON: ${(error as Error).message}` }
  }
  if (!isRecord(parsed)) return { error: 'A pack is a JSON object.' }
  let raw = parsed
  if (raw.schema !== undefined) {
    // An older pack is brought up to the schema the editor writes.
    const upgraded = typeof raw.schema === 'number' ? upgradePack({ ...raw, schema: raw.schema }) : { ok: false as const, reason: 'has no schema number' }
    if (!upgraded.ok) return { error: `This pack can't be opened: ${upgraded.reason}.` }
    raw = upgraded.value as unknown as Record<string, unknown>
  }
  if (typeof raw.id !== 'string' || !raw.id) return { error: 'A pack needs an "id".' }
  for (const list of ['scenes', 'stats', 'items'] as const) {
    if (raw[list] !== undefined && !Array.isArray(raw[list])) return { error: `"${list}" should be a list.` }
  }
  if (raw.prose !== undefined && !isRecord(raw.prose)) return { error: '"prose" should be an object of keys and text.' }
  const scenes = (raw.scenes ?? []) as unknown[]
  const bad = scenes.find((scene) => !isRecord(scene) || !Array.isArray(scene.body) || !Array.isArray(scene.choices))
  if (bad) return { error: `Scene ${isRecord(bad) ? `"${String(bad.id)}"` : ''} isn't a data scene with a body and choices.`.replace('  ', ' ') }
  const pack = { ...raw, schema: SCHEMA, scenes: scenes as DataScene[], stats: raw.stats ?? [], items: raw.items ?? [], prose: raw.prose ?? {} } as EditorPack
  const preview = defaultPreview()
  // Plugin content switches its plugin on, so the preview can run it.
  for (const id of Object.keys(isRecord(raw.data) ? raw.data : {})) {
    if ((PLUGIN_IDS as string[]).includes(id)) preview.plugins[id as PluginId] = { on: true, options: PLUGINS[id as PluginId].options }
  }
  const first = pack.scenes[0]?.id ?? null
  return {
    project: {
      id: newId(),
      title: title ?? raw.id.replace(/[-_.]+/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      intro: first,
      pack,
      kv: kvUsed(pack).map((name) => ({ name, note: '' })),
      preview,
      updated: Date.now(),
    },
  }
}

/** A file name for a download: the pack id, or the title's slug. */
export function fileName(project: Project, extension: 'json' | 'ts'): string {
  return `${project.pack.id || slug(project.title)}.${extension}`
}
