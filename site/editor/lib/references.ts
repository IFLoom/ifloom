/**
 * What a pack names, and renaming it. The editor walks every condition and
 * effect in a pack, so renaming a scene, a stat, an item or a kv key moves
 * every reference to it, and the prose keys that follow the scene's id.
 */
import type { Condition, DataScene, EffectRef, Problem } from '@ifloom/engine'
import type { EditorPack, Project } from './model.ts'

export type Thing = 'scene' | 'stat' | 'item' | 'kv'

type Visit = {
  condition?: (condition: Record<string, unknown>) => void
  effect?: (effect: Record<string, unknown>) => void
}

function walkCondition(condition: Condition | undefined, visit: Visit) {
  if (!condition || typeof condition !== 'object') return
  const c = condition as Record<string, unknown>
  visit.condition?.(c)
  if (Array.isArray(c.all)) for (const part of c.all) walkCondition(part as Condition, visit)
  if (Array.isArray(c.any)) for (const part of c.any) walkCondition(part as Condition, visit)
  if (c.not) walkCondition(c.not as Condition, visit)
  if (c.where) walkCondition(c.where as Condition, visit)
}

function walkEffects(effects: readonly EffectRef[] | undefined, visit: Visit) {
  for (const effect of effects ?? []) {
    const e = effect as Record<string, unknown>
    visit.effect?.(e)
    if (e.kind === 'each') {
      walkCondition(e.where as Condition | undefined, visit)
      walkEffects(e.effects as EffectRef[], visit)
    }
  }
}

function walkScene(scene: DataScene, visit: Visit) {
  walkCondition(scene.when, visit)
  for (const block of scene.body) walkCondition(block.when, visit)
  for (const choice of scene.choices) {
    walkCondition(choice.when, visit)
    for (const label of choice.labels ?? []) walkCondition(label.when, visit)
    for (const blocked of choice.blocked ?? []) walkCondition(blocked.when, visit)
    walkEffects(choice.effects, visit)
  }
  for (const layer of scene.stage?.layers ?? []) walkCondition(layer.when, visit)
  for (const spot of scene.stage?.hotspots ?? []) walkCondition(spot.when, visit)
}

/** Every condition and effect in the pack, in order. */
export function walkPack(pack: EditorPack, visit: Visit) {
  for (const scene of pack.scenes) walkScene(scene, visit)
  for (const stat of pack.stats) walkCondition(stat.visible, visit)
  for (const item of pack.items) walkEffects(item.use?.effects, visit)
}

/** The kv keys a pack sets or reads, in the order it first names them. */
export function kvUsed(pack: EditorPack): string[] {
  const names = new Set<string>()
  walkPack(pack, {
    condition: (c) => {
      if (typeof c.kv === 'string' && c.of === undefined) names.add(c.kv)
    },
    effect: (e) => {
      if (e.kind === 'kv' && typeof e.key === 'string' && e.of === undefined) names.add(e.key)
    },
  })
  return [...names]
}

/** A key renamed when it is the old scene id, or starts with it and then `/` or `#`. */
function moveKey(key: string, from: string, to: string, scenes: readonly string[]): string {
  if (key === from) return to
  if (key.startsWith(`${from}/`) || key.startsWith(`${from}#`)) return to + key.slice(from.length)
  // A sub-key, `cafe.hint`, unless it belongs to another scene whose id goes on from this one's, `cafe.counter`.
  const owner = scenes.filter((id) => key === id || key.startsWith(`${id}.`) || key.startsWith(`${id}#`)).sort((a, b) => b.length - a.length)[0]
  if (key.startsWith(`${from}.`) && owner === from) return to + key.slice(from.length)
  return key
}

function renameFormula(formula: unknown, from: string, to: string): unknown {
  if (typeof formula === 'string') return formula === from ? to : formula
  if (Array.isArray(formula)) return formula.map((part) => renameFormula(part, from, to))
  if (formula && typeof formula === 'object') {
    return Object.fromEntries(Object.entries(formula).map(([k, v]) => [k, k === 'by' || k === 'min' || k === 'max' ? (Array.isArray(v) ? renameFormula(v, from, to) : v) : renameFormula(v, from, to)]))
  }
  return formula
}

/**
 * The project with one scene, stat, item or kv key renamed everywhere it is
 * named. A scene's prose keys (`id`, `id.…`, `id#…`, and an older `id/…`) move with it.
 */
export function rename(project: Project, thing: Thing, from: string, to: string): Project {
  if (from === to || !to) return project
  const next = structuredClone(project)
  const pack = next.pack
  const visit: Visit = {}
  if (thing === 'scene') {
    const scenes = pack.scenes.map((scene) => scene.id)
    for (const scene of pack.scenes) {
      if (scene.id === from) scene.id = to
      for (const block of scene.body) {
        if ('text' in block) block.text = moveKey(block.text, from, to, scenes)
      }
      for (const choice of scene.choices) {
        if (choice.label) choice.label = moveKey(choice.label, from, to, scenes)
        for (const label of choice.labels ?? []) label.key = moveKey(label.key, from, to, scenes)
      }
    }
    pack.prose = Object.fromEntries(Object.entries(pack.prose).map(([key, text]) => [moveKey(key, from, to, scenes), text]))
    if (next.intro === from) next.intro = to
    if (next.preview.start === from) next.preview.start = to
    visit.condition = (c) => {
      if (c.seen === from) c.seen = to
      if (c.since === from) c.since = to
      if (typeof c.chose === 'string' && c.chose.startsWith(`${from}#`)) c.chose = to + c.chose.slice(from.length)
      if (Array.isArray(c.scene)) c.scene = c.scene.map((id) => (id === from ? to : id))
    }
    visit.effect = (e) => {
      if (e.kind === 'scene' && e.scene === from) e.scene = to
      if (e.kind === 'scene' && e.otherwise === from) e.otherwise = to
    }
  } else if (thing === 'stat') {
    for (const stat of pack.stats) {
      if (stat.id === from) stat.id = to
      if (stat.derive !== undefined) stat.derive = renameFormula(stat.derive, from, to) as typeof stat.derive
    }
    visit.condition = (c) => {
      for (const k of ['stat', 'tier', 'level'] as const) if (c[k] === from) c[k] = to
    }
    visit.effect = (e) => {
      if (e.kind === 'stat' && e.stat === from) e.stat = to
    }
  } else if (thing === 'item') {
    for (const item of pack.items) if (item.id === from) item.id = to
    visit.condition = (c) => {
      if (c.item === from) c.item = to
    }
    visit.effect = (e) => {
      if (e.kind === 'item' && e.item === from) e.item = to
    }
  } else {
    for (const entry of next.kv) if (entry.name === from) entry.name = to
    visit.condition = (c) => {
      if (c.kv === from && c.of === undefined) c.kv = to
    }
    visit.effect = (e) => {
      if (e.kind === 'kv' && e.key === from && e.of === undefined) e.key = to
    }
  }
  walkPack(pack, visit)
  next.updated = Date.now()
  return next
}

/**
 * The project with a choice renamed: its id, its default label key
 * (`scene#choice`) and every `{ chose: 'scene#choice' }` that asks about it.
 */
export function renameChoice(project: Project, sceneId: string, from: string, to: string): Project {
  if (from === to || !to) return project
  const next = structuredClone(project)
  const scene = next.pack.scenes.find((s) => s.id === sceneId)
  const choice = scene?.choices.find((c) => c.id === from)
  if (!scene || !choice) return project
  choice.id = to
  const oldKey = `${sceneId}#${from}`
  const newKey = `${sceneId}#${to}`
  if (choice.label === oldKey) choice.label = newKey
  if (oldKey in next.pack.prose && !(newKey in next.pack.prose)) {
    next.pack.prose = Object.fromEntries(Object.entries(next.pack.prose).map(([key, text]) => [key === oldKey ? newKey : key, text]))
  }
  walkPack(next.pack, {
    condition: (c) => {
      if (c.chose === `${sceneId}#${from}`) c.chose = `${sceneId}#${to}`
    },
  })
  // The scene's prose that draws it inline: `[[act:from]]` and `[[act:from|words]]`.
  const inline = new RegExp(`\\[\\[act:\\s*${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?=[|\\]])`, 'g')
  for (const block of scene.body) {
    if (!('text' in block)) continue
    const text = next.pack.prose[block.text]
    if (text !== undefined) next.pack.prose[block.text] = text.replace(inline, `[[act:${to}`)
  }
  next.updated = Date.now()
  return next
}

/** Where a problem points in the editor: the thing, and the choice or block in it when one can be found. */
export type ProblemTarget = { thing: Thing | 'project'; id: string; choice?: string; field?: string }

/**
 * The thing a `checkGame` problem concerns, from its `where` (`scene market`,
 * `stat coins`), narrowed to a choice when the problem quotes something only
 * one of the scene's choices names.
 */
export function problemTarget(pack: EditorPack, problem: Problem): ProblemTarget {
  const [kind, ...rest] = problem.where.split(' ')
  const id = rest.join(' ')
  if (kind === 'stat' || kind === 'item') return { thing: kind, id }
  if (kind === 'introScene') return { thing: 'project', id: '', field: 'intro' }
  if (kind !== 'scene') return { thing: 'project', id: '' }
  const scene = pack.scenes.find((s) => s.id === id)
  if (!scene) return { thing: 'scene', id }
  const quoted = problem.what.match(/"([^"]+)"/)?.[1]
  if (quoted) {
    // A missing label names the key `scene#choice`.
    const label = quoted.startsWith(`${id}#`) ? quoted.slice(id.length + 1) : undefined
    if (label && scene.choices.some((c) => c.id === label)) return { thing: 'scene', id, choice: label }
    const inChoice = scene.choices.filter((c) => JSON.stringify(c).includes(JSON.stringify(quoted)))
    if (inChoice.length === 1) return { thing: 'scene', id, choice: inChoice[0].id }
    if (JSON.stringify(scene.body).includes(JSON.stringify(quoted))) return { thing: 'scene', id, field: 'body' }
  }
  if (/weight|drawnFrom|drawn/.test(problem.what)) return { thing: 'scene', id, field: 'storylet' }
  return { thing: 'scene', id }
}
