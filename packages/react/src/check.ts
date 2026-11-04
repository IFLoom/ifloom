/**
 * `checkUiHints`: what's wrong with a game's `ui` hints for the React UI. The
 * engine only checks that hints are data; the names and values are this UI's,
 * so this is where a typo such as `ui: { transiton: 'fade' }` is caught. Call
 * it in a test, beside `checkGame`.
 */
import { inlineMarkup, type Block, type Game } from '@ifloom/engine'
import type { InlineComponents } from './game/context.tsx'
import { MAX_PIPS, TEXT_SIZES, TRANSITIONS } from './hints.ts'

/** The inline pieces the React UI draws itself, as `BUILT_IN_INLINE` has them. */
const INLINE = ['modal', 'image', 'mail', 'prop', 'mono']

const KNOWN = {
  scene: ['transition'],
  choice: ['transition'],
  block: ['reveal', 'dice', 'timer', 'tilt', 'fold'],
  stat: ['display'],
  entity: ['hue'],
  game: ['transition', 'transitionNames', 'settings'],
} as const

type Target = keyof typeof KNOWN

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Each problem with the React UI's hints in a game, as `where: what`: a hint
 * this UI doesn't know (a typo, or another UI's), a transition name that is
 * neither built in nor in `game.ui.transitionNames`, a negative `ms`, a reveal
 * `delay` that isn't whole milliseconds, a `display` that isn't `number`, `bar`
 * or `pips`, pips on a stat with a range over 20, a `hue` outside 0 to 360,
 * a block's `dice` that isn't a roll's key, a block's `timer` that isn't a
 * timer the game declares, a `tilt` that isn't true or false, and a game's
 * `settings` naming a setting that isn't a ui choice (`textSize`, with
 * options the styles size) or a ui toggle (`images`).
 *
 * It also reads the prose, and the words blocks write in place, for inline pieces, `[[ui:name|…]]`: a name that is
 * neither built in (`modal`, `image`, `mail`, `prop`, `mono`) nor one of the game's own `inline`
 * components (pass the same object you give `mountGame` or the
 * `GameProvider`), which would show only its words; a `modal` with no prose
 * key, or one with no prose; an `image` with no path; either with more
 * than two arguments; a `prop` whose face isn't `sticky`, `clip` or
 * `diary`; and a `mono` with arguments.
 *
 * Hints and inline names in `allow` (`['mood']`, say, for another UI's)
 * aren't reported. Empty when all is well.
 */
export function checkUiHints(game: Game, options: { allow?: readonly string[]; inline?: InlineComponents } = {}): string[] {
  const out: string[] = []
  const allowed = new Set(options.allow ?? [])
  const timers = new Set((game.timers ?? []).map((timer) => timer.id))
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

  /** The game's `ui.settings`: each names a ui setting of the right type. */
  const uiSettings = (where: string, settings: unknown) => {
    if (!isRecord(settings)) return out.push(`${where}: ui.settings is { textSize?, images? }, each a setting's id`)
    for (const key of Object.keys(settings))
      if (key !== 'textSize' && key !== 'images') out.push(`${where}: ui.settings.${key} is not a setting the React UI honours; it has textSize and images`)
    const declared = (key: string, type: 'choice' | 'toggle') => {
      const id = settings[key]
      if (id === undefined) return undefined
      const setting = (game.settings ?? []).find((entry) => entry.id === id)
      if (!setting || setting.type !== type || setting.affects !== 'ui') {
        out.push(`${where}: ui.settings.${key} "${String(id)}" is not a ui ${type} setting the game has`)
        return undefined
      }
      return setting
    }
    const size = declared('textSize', 'choice')
    if (size?.type === 'choice')
      for (const option of size.options)
        if (!(TEXT_SIZES as readonly unknown[]).includes(option.value))
          out.push(`${where}: ui.settings.textSize option "${String(option.value)}" is not a size the styles draw (${TEXT_SIZES.join(', ')}); size it with CSS of your own`)
    declared('images', 'toggle')
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
    if (ui.dice !== undefined && !(typeof ui.dice === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(ui.dice)))
      out.push(`${where}: ui.dice names a roll's key: letters, digits and _`)
    if (ui.timer !== undefined && !(typeof ui.timer === 'string' && timers.has(ui.timer)))
      out.push(`${where}: ui.timer "${String(ui.timer)}" is not a timer the game has`)
    if (ui.tilt !== undefined && typeof ui.tilt !== 'boolean') out.push(`${where}: ui.tilt is true or false`)
    if (ui.fold !== undefined && !(typeof ui.fold === 'string' && ui.fold.trim())) out.push(`${where}: ui.fold is the words the fold is opened by`)
    if (ui.hue !== undefined && !(typeof ui.hue === 'number' && ui.hue >= 0 && ui.hue <= 360)) out.push(`${where}: ui.hue is a number from 0 to 360`)
    if (ui.settings !== undefined) uiSettings(where, ui.settings)
    if (ui.transitionNames !== undefined) {
      const list = ui.transitionNames
      if (!Array.isArray(list) || list.some((name) => typeof name !== 'string' || !/^[a-z0-9-]+$/.test(name)))
        out.push(`${where}: ui.transitionNames lists names of lower-case letters, digits and "-"`)
    }
  }

  /** Words written in place in blocks, with where, for the inline pieces in them. */
  const written: { where: string; text: string }[] = []
  // Sections, decisions and what their choices bring, as deep as a flow goes.
  const blocks = (where: string, body: readonly Block[] | undefined, at = '') =>
    (body ?? []).forEach((block, index) => {
      const here = `${at}${index + 1}`
      hints('block', `${where} block ${here}`, block.ui)
      if ('text' in block) written.push({ where: `${where} block ${here}`, text: block.text })
      if ('say' in block) written.push({ where: `${where} block ${here}`, text: block.say })
      if ('blocks' in block) blocks(where, block.blocks, `${here}.`)
      if ('cases' in block) blocks(where, block.cases, `${here}.`)
      if ('decide' in block)
        for (const choice of block.choices) {
          hints('choice', `${where} choice ${choice.id}`, choice.ui)
          blocks(where, choice.then, `${here}.${choice.id}.`)
        }
    })

  const inline = new Set([...INLINE, ...Object.keys(options.inline ?? {})])
  /** The inline pieces in one line of prose, as written. */
  function pieces(at: string, text: string) {
    for (const part of inlineMarkup(text) ?? []) {
      if (part.type !== 'ui') continue
      const where = `${at}: [[ui:${part.name}|${part.text}]]`
      if (!inline.has(part.name) && !allowed.has(part.name)) {
        out.push(`${where} is not an inline piece the React UI draws, so it shows only its words; add it to inline`)
        continue
      }
      // A game's own component of a built-in name reads its arguments its own way.
      if (options.inline?.[part.name]) continue
      const [first] = part.args
      if (part.name === 'modal') {
        if (!first) out.push(`${where} needs a prose key: [[ui:modal|words|key]]`)
        else if (game.prose?.line(first) === undefined) out.push(`${where}: no prose for "${first}"`)
      }
      if (part.name === 'image' && !first) out.push(`${where} needs a picture's path: [[ui:image|words|path]]`)
      if ((part.name === 'modal' || part.name === 'image') && part.args.length > 2) out.push(`${where} takes two arguments at most`)
      if (part.name === 'prop' && (part.args.length > 1 || (first !== undefined && !['sticky', 'clip', 'diary'].includes(first))))
        out.push(`${where} takes one face: sticky, clip or diary`)
      if (part.name === 'mono' && part.args.length) out.push(`${where} takes no arguments`)
    }
  }

  hints('game', 'game', game.ui)
  for (const scene of game.scenes) {
    const where = `scene ${scene.id}`
    hints('scene', where, scene.ui)
    blocks(where, scene.body)
    for (const choice of scene.choices) hints('choice', `${where} choice ${choice.id}`, choice.ui)
  }
  for (const action of game.actions ?? []) hints('choice', `action ${action.id}`, action.ui)
  for (const stat of game.stats ?? []) {
    // A bound worked out in play isn't known until then.
    const max = stat.max ?? 100
    const min = stat.min ?? 0
    const range = typeof max === 'number' && typeof min === 'number' ? max - min : undefined
    hints('stat', `stat ${stat.id}`, stat.ui, { range })
  }
  for (const kind of game.kinds ?? []) hints('entity', `kind ${kind.id}`, kind.ui)
  for (const entity of game.entities ?? []) hints('entity', `entity ${entity.of}:${entity.id}`, entity.ui)
  // A place is a plugin's, read by name as the rest of the UI reads plugins: the `places/location` trait's room hints and its body's.
  const places = (game.traits?.['places/location'] ?? {}) as Record<string, { ui?: unknown; body?: readonly Block[] } | undefined>
  for (const [ref, place] of Object.entries(places)) {
    const where = `place ${ref}`
    hints('scene', where, place?.ui)
    blocks(where, place?.body)
  }
  // Inline pieces in the prose: every line the store lists, and every block of words written in place, as written.
  for (const key of game.prose?.keys?.() ?? []) pieces(`prose ${key}`, game.prose?.line(key) ?? '')
  for (const { where, text } of written) pieces(where, text)
  return out
}
