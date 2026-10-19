/**
 * `checkUiHints`: what's wrong with a game's `ui` hints for the React UI. The
 * engine only checks that hints are data; the names and values are this UI's,
 * so this is where a typo such as `ui: { transiton: 'fade' }` is caught. Call
 * it in a test, beside `checkGame`.
 */
import { isDataScene, type Block, type Game } from '@ifloom/engine'
import { MAX_PIPS, TRANSITIONS } from './hints.ts'

const KNOWN = {
  scene: ['transition'],
  choice: ['transition'],
  block: ['reveal'],
  stat: ['display'],
  entity: ['hue'],
  game: ['transition', 'transitionNames'],
} as const

type Target = keyof typeof KNOWN

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Each problem with the React UI's hints in a game, as `where: what`: a hint
 * this UI doesn't know (a typo, or another UI's), a transition name that is
 * neither built in nor in `game.ui.transitionNames`, a negative `ms`, a reveal
 * `delay` that isn't whole milliseconds, a `display` that isn't `number`, `bar`
 * or `pips`, pips on a stat with a range over 20, and a `hue` outside 0 to 360.
 * Hints in `allow` (`['mood']`, say, for another UI's) aren't reported. Empty
 * when all is well.
 */
export function checkUiHints(game: Game, options: { allow?: readonly string[] } = {}): string[] {
  const out: string[] = []
  const allowed = new Set(options.allow ?? [])
  const names = new Set<string>([...TRANSITIONS, ...(Array.isArray(game.ui?.transitionNames) ? game.ui.transitionNames : [])])

  const transition = (where: string, spec: unknown) => {
    const pair = typeof spec === 'string' ? { in: spec } : spec
    if (!isRecord(pair)) return out.push(`${where}: ui.transition is a name or { in, out, ms }`)
    for (const side of ['in', 'out'] as const) {
      const name = pair[side]
      if (name !== undefined && (typeof name !== 'string' || !names.has(name)))
        out.push(`${where}: ui.transition ${side} "${String(name)}" is not a transition the game has`)
    }
    if (pair.ms !== undefined && !(typeof pair.ms === 'number' && pair.ms >= 0)) out.push(`${where}: ui.transition ms must be 0 or more`)
  }

  const hints = (target: Target, where: string, ui: unknown, extra?: { range?: number }) => {
    if (!isRecord(ui)) return
    for (const key of Object.keys(ui)) {
      if (!(KNOWN[target] as readonly string[]).includes(key) && !allowed.has(key)) out.push(`${where}: ui.${key} is not a hint the React UI reads`)
    }
    if (ui.transition !== undefined) transition(where, ui.transition)
    if (ui.reveal !== undefined) {
      const reveal = ui.reveal
      if (!isRecord(reveal)) out.push(`${where}: ui.reveal is { delay, as }`)
      else {
        if (reveal.delay !== undefined && !(Number.isInteger(reveal.delay) && (reveal.delay as number) >= 0))
          out.push(`${where}: ui.reveal delay must be whole milliseconds, 0 or more`)
        if (reveal.as !== undefined && (typeof reveal.as !== 'string' || !names.has(reveal.as)))
          out.push(`${where}: ui.reveal as "${String(reveal.as)}" is not a transition the game has`)
      }
    }
    if (ui.display !== undefined) {
      if (ui.display !== 'number' && ui.display !== 'bar' && ui.display !== 'pips') out.push(`${where}: ui.display is 'number', 'bar' or 'pips'`)
      else if (ui.display === 'pips' && extra?.range !== undefined && extra.range > MAX_PIPS)
        out.push(`${where}: ui.display pips needs a range of ${MAX_PIPS} or less; this one is ${extra.range}`)
    }
    if (ui.hue !== undefined && !(typeof ui.hue === 'number' && ui.hue >= 0 && ui.hue <= 360)) out.push(`${where}: ui.hue is a number from 0 to 360`)
    if (ui.transitionNames !== undefined) {
      const list = ui.transitionNames
      if (!Array.isArray(list) || list.some((name) => typeof name !== 'string' || !/^[a-z0-9-]+$/.test(name)))
        out.push(`${where}: ui.transitionNames lists names of lower-case letters, digits and "-"`)
    }
  }

  const blocks = (where: string, body: readonly Block[] | undefined) =>
    (body ?? []).forEach((block, index) => hints('block', `${where} block ${index + 1}`, block.ui))

  hints('game', 'game', game.ui)
  for (const scene of game.scenes) {
    const where = `scene ${scene.id}`
    hints('scene', where, scene.ui)
    if (!isDataScene(scene)) continue
    blocks(where, scene.body)
    for (const choice of scene.choices) hints('choice', `${where} choice ${choice.id}`, choice.ui)
  }
  for (const action of game.actions ?? []) hints('choice', `action ${action.id}`, action.ui)
  for (const stat of game.stats ?? []) {
    // A ceiling from a custom value isn't known until play.
    const range = typeof stat.max === 'object' ? undefined : (stat.max ?? 100) - (stat.min ?? 0)
    hints('stat', `stat ${stat.id}`, stat.ui, { range })
  }
  for (const kind of game.kinds ?? []) hints('entity', `kind ${kind.id}`, kind.ui)
  for (const entity of game.entities ?? []) hints('entity', `entity ${entity.of}:${entity.id}`, entity.ui)
  // A place is a plugin's, read by name as the rest of the UI reads plugins: its room's hints and its body's.
  for (const place of (game.data?.places?.locations ?? []) as readonly { id?: unknown; ui?: unknown; body?: readonly Block[] }[]) {
    const where = `place ${String(place.id)}`
    hints('scene', where, place.ui)
    blocks(where, place.body)
  }
  return out
}
