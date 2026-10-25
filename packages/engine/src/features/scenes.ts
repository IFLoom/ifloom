/**
 * Scenes: which one is open, what the player has seen and chosen, opening
 * and leaving them, and storylets, the scenes a `{ scene: { from } }`
 * effect draws at random from a named set (ADR 0005).
 */
import { say } from '../strings.ts'
import { sceneContext } from '../context.ts'
import type { Game, Scene } from '../game.ts'
import type { Reference } from '../references.ts'
import type { Block, Choice, DataScene, RenderedScene } from '../scene.ts'
import type { SceneView } from '../game.ts'
import type { Condition, GameState, Range } from '../types.ts'
import { emphasis, INLINE_MARKUP, inlineMarkup } from '../sceneBody.ts'
import { commandOf } from '../calls.ts'
import { defineFeature, lastWins, together, type FeatureContext, type PackMerge, type ResolveTools } from './feature.ts'
import { inRange, wanted } from '../range.ts'
import { costEffects, costRefusal, payCost } from './actions.ts'
import { everyBlock, flowBlockReferences, jumpOf, sceneChoices, stepped, withoutJump } from './flows.ts'

/** A surgical change to a data scene an earlier pack declared: a choice added, dropped or replaced. */
export type Patch =
  | { scene: string; addChoice: DataScene['choices'][number]; before?: string }
  | { scene: string; dropChoice: string }
  | { scene: string; replaceChoice: DataScene['choices'][number] }

/**
 * What makes a scene a storylet: the named draws it can be drawn from, how
 * often, and when. See the `{ scene: { from } }` effect.
 */
export type StoryletFields = {
  /**
   * The draws this scene can come up in, by name: `['cafe']`. A
   * `{ scene: { from: 'cafe' } }` effect draws one of the scenes that name
   * `'cafe'` here. Separate from `tags`, which only style the scene.
   */
  drawnFrom?: string[]
  /** How likely a draw is to pick it, against the others it could pick. 1 if left out. Needs `drawnFrom`. */
  weight?: number
  /** Only drawn while this holds. It gates draws only: a `scene` command or effect naming the scene opens it regardless. */
  when?: Condition
}

/**
 * How many times something happened, and the turn of the first time and the
 * last: what `GameState.seen` keeps for each scene and `GameState.chosen` for
 * each choice.
 */
export type Times = { n: number; first: number; last: number }

/** What the scenes feature adds, as types. */
export type ScenesShape = {
  state: {
    sceneId: string | null
    /**
     * Each scene the player has entered, by id: how many times, and the turn
     * of the first time and the last. The engine's own record of what the
     * player has actually watched, so a chain can say "not until you have seen
     * the rung before this one", and how long ago, without every link needing
     * a hand-written kv key.
     *
     * Re-entering the scene you are already in — a hub redrawing itself after a
     * choice — is not a viewing and does not count.
     */
    seen: Record<string, Times>
    /**
     * Each choice the player has picked, by `scene#choice`: how many times, and
     * the turn of the first time and the last. Kept for every choice, so content
     * can branch on an earlier decision without each one needing a kv key of its
     * own, and a choice's `once` reads it.
     */
    chosen: Record<string, Times>
  }
  conditions: {
    /**
     * How many times a choice has been picked, by `scene#choice`. Bare, at least
     * once: `{ chose: 'bakery.counter#buy-bread' }`.
     */
    chose: { chose: string } & Range
    /**
     * A scene the player has already been through. The order half of a gate: a
     * stat says whether you are good enough yet, this says whether you have been
     * here yet. Bare, it asks for one viewing; `{ seen: 'x', gte: 2 }` for two.
     */
    seen: { seen: string } & Range
    /**
     * Whole turns since a scene was first entered, or a choice (`scene#choice`)
     * first picked. The pace half of a gate:
     * `{ since: 'baker.first-coffee', gte: 5 }` holds from five turns after
     * the first coffee. With `last: true` it counts from the latest time
     * instead, for a cooldown: `{ since: 'park.bench', last: true, gte: 3 }`.
     * Something not yet seen or picked fails every range, `lt` included — "not long
     * since" is not true of something that has not happened.
     */
    since: { since: string; last?: boolean } & Range
    /** The scene on screen is one of these. */
    scene: { scene: string[] }
  }
  effects: {
    /**
     * Open a scene, `{ scene: 'cafe.counter' }`, or close the one on screen
     * with `{ scene: null }`. With `{ scene: { from: 'cafe', otherwise: 'cafe.quiet' } }`,
     * a storylet draw: open one scene drawn at random from the scenes whose
     * `drawnFrom` names `from` and whose `when` holds, by their `weight`; with
     * none to draw, `otherwise` if given, else nothing.
     */
    scene: { scene: string | null | { from: string; otherwise?: string } }
  }
  commands: {
    scene: { type: 'scene'; id: string }
    choose: { type: 'choose'; id: string }
    leave: { type: 'leave' }
  }
  game: {
    /** The scene on screen on the first frame. Left out, the game opens on its idle screen. */
    introScene?: string
    /** Hand-written scenes and data scenes, side by side. */
    scenes: (Scene | DataScene)[]
  }
  pack: {
    scenes?: (Scene | DataScene)[]
    /** Surgical changes to content an earlier pack declared. */
    patches?: Patch[]
    /** The scene on screen on the first frame: a later pack's replaces an earlier one's. */
    introScene?: string
  }
  view: {
    inScene: boolean
  }
  lists: 'scene' | 'introScene'
}

function isDataScene(scene: Scene | DataScene): scene is DataScene {
  return 'body' in scene && Array.isArray((scene as DataScene).body)
}

/**
 * What prose blocks name: prose keys, variants and their art, conditions,
 * media, hints, the markup in words written in place, a spoken line's
 * markup, and inside sections, decisions (each choice as a scene's is, and
 * what it brings) and the minigames and panels a flow plays.
 */
export function blockReferences(blocks: readonly Block[] | undefined): Reference[] {
  const out: Reference[] = []
  for (const block of blocks ?? []) {
    if ('text' in block) out.push({ prose: block.text })
    if ('variants' in block) {
      out.push({ variants: block.variants })
      for (const art of Object.values(block.art ?? {})) out.push({ variants: art })
    }
    if ('media' in block) out.push({ media: block.media })
    if ('words' in block) out.push({ markup: block.words })
    if ('say' in block) out.push({ markup: block.say })
    if ('blocks' in block) out.push({ blocks: block.blocks })
    if ('decide' in block)
      for (const choice of block.choices)
        out.push({ within: `decision ${block.decide} choice ${choice.id}`, refs: [...choiceReferences(choice), { blocks: choice.then }] })
    out.push(...flowBlockReferences(block))
    if (block.ui !== undefined) out.push({ ui: block.ui })
    out.push({ when: block.when })
    if ('variants' in block) for (const gate of Object.values(block.gate ?? {})) out.push({ when: gate })
  }
  return out
}

/** What one choice names: its command, its label's prose key when it reads as one, its conditions, effects (not its jump: the flow's checks read that) and hints. */
function choiceReferences(choice: Choice, defaultKey?: string): Reference[] {
  const out: Reference[] = []
  if (choice.command) out.push({ command: choice.command })
  // A label is words, or a prose key: one that reads as a key (no spaces, a `.` or `#`) must have its prose.
  if (choice.label === undefined) {
    if (defaultKey !== undefined) out.push({ prose: defaultKey })
  } else if (readsAsKey(choice.label)) out.push({ prose: choice.label })
  for (const entry of choice.labels ?? []) out.push(...(readsAsKey(entry.label) ? [{ prose: entry.label }] : []), { when: entry.when })
  out.push({ when: choice.when })
  for (const entry of choice.blocked ?? []) out.push({ when: entry.when })
  out.push({ effects: withoutJump(choice.effects) })
  if (choice.ui !== undefined) out.push({ ui: choice.ui })
  return out
}

/** Does a button's label read as a prose key rather than words: no spaces, and a `.` or `#` in it? */
const readsAsKey = (label: string) => !/\s/.test(label) && /[.#]/.test(label)

/** What a data scene names: its body, its choices' labels, conditions and effects, its audio, panel and stage. */
export function dataSceneReferences(scene: DataScene): Reference[] {
  const out: Reference[] = [{ blocks: scene.body }]
  out.push({ actionsIn: scene.body, offers: sceneChoices(scene).map((choice) => choice.id) })
  for (const choice of scene.choices) {
    // Its command and hints are reported as the choice's own; the rest as the scene's.
    const refs = choiceReferences(choice, `${scene.id}#${choice.id}`)
    const own = refs.filter((ref) => 'command' in ref || 'ui' in ref)
    if (own.length) out.push({ within: `choice ${choice.id}`, refs: own })
    out.push(...refs.filter((ref) => !('command' in ref || 'ui' in ref)))
  }
  for (const [channel, track] of Object.entries(scene.audio ?? {})) out.push({ channel, track })
  if (scene.panel !== undefined) out.push({ openPanel: scene.panel.panel, with: scene.panel.with ?? {} })
  out.push({ stage: scene.stage, choices: sceneChoices(scene).map((choice) => choice.id) })
  return out
}

/**
 * Scenes by id, a later pack's over an earlier one's, then each pack's
 * patches to the data scenes merged so far. The base game's own aren't merged.
 */
function merge(problem: (from: string, where: string, what: string) => void): PackMerge<ScenesShape['game'], ScenesShape['pack']> {
  const scenes = new Map<string, { value: Scene | DataScene; from: string }>()
  return {
    base: () => {},
    add: (pack, from) => {
      for (const scene of pack.scenes ?? []) scenes.set(scene.id, { value: scene, from })
      for (const patch of pack.patches ?? []) {
        const target = scenes.get(patch.scene)
        if (!target || !isDataScene(target.value)) {
          problem(from, `patch ${patch.scene}`, target ? 'that scene is not declarative, so it cannot be patched' : 'no such scene')
          continue
        }
        const scene = { ...target.value, choices: [...target.value.choices] }
        if ('dropChoice' in patch) {
          scene.choices = scene.choices.filter((choice) => choice.id !== patch.dropChoice)
        } else if ('replaceChoice' in patch) {
          const at = scene.choices.findIndex((choice) => choice.id === patch.replaceChoice.id)
          if (at < 0) problem(from, `patch ${patch.scene}`, `no choice ${patch.replaceChoice.id}`)
          else scene.choices[at] = patch.replaceChoice
        } else {
          const at = patch.before ? scene.choices.findIndex((choice) => choice.id === patch.before) : -1
          if (at >= 0) scene.choices.splice(at, 0, patch.addChoice)
          else scene.choices.push(patch.addChoice)
        }
        scenes.set(patch.scene, { value: scene, from })
      }
    },
    finish: (game) => {
      game.scenes = [...scenes.values()].map((entry) => entry.value)
    },
    from: (_list, id) => (id === undefined ? undefined : scenes.get(id)?.from),
  }
}

/**
 * What is wrong with the inline actions in a body: one that names nothing in
 * `offers`, one named twice in a line, and one named by two blocks that can
 * show together (two blocks that both have a `when` may never do, so they
 * pass). The members of one variants list are drawn one at a time, so they
 * may each name the same one.
 */
function inlineActionProblems(game: Game, body: readonly Block[] | string | undefined, offers: readonly string[]): string[] {
  if (body === undefined) return []
  const lines: { text: string; block: string; gated: boolean }[] = []
  if (typeof body === 'string') lines.push({ text: body, block: '0', gated: false })
  else {
    // A block in a section or a branch shows only with it, so it counts as gated.
    for (const { block, address, top } of everyBlock(body)) {
      const gated = block.when !== undefined || !top
      if ('words' in block) lines.push({ text: block.words, block: address, gated })
      if ('say' in block) lines.push({ text: block.say, block: address, gated })
      const keys = 'text' in block ? [block.text] : 'variants' in block ? (game.prose?.variants(block.variants) ?? []) : []
      for (const key of keys) {
        const text = game.prose?.line(key)
        if (text !== undefined) lines.push({ text, block: address, gated })
      }
    }
  }
  const out: string[] = []
  const known = new Set(offers)
  const blocks = new Map<string, { block: string; gated: boolean }[]>()
  for (const line of lines) {
    const named = (inlineMarkup(line.text) ?? []).flatMap((part) => (part.type === 'act' ? [part.id] : []))
    const once = new Set<string>()
    for (const id of named) {
      if (once.has(id)) out.push(`[[act:${id}]] is in one line twice; only the first is drawn as an action`)
      once.add(id)
      const where = blocks.get(id) ?? []
      if (!where.some((entry) => entry.block === line.block)) where.push({ block: line.block, gated: line.gated })
      blocks.set(id, where)
    }
  }
  for (const [id, where] of blocks) {
    if (!known.has(id)) out.push(`[[act:${id}]] names no choice or action offered here`)
    if (where.length > 1 && where.some((entry) => !entry.gated))
      out.push(`[[act:${id}]] is in two blocks that can show together; only the first is drawn as an action`)
  }
  return [...new Set(out)]
}

/**
 * Stars that don't make bold or italics in the paragraphs where they're read:
 * narration and spoken lines, between inline actions and tooltips.
 */
function emphasisProblems(text: string): string[] {
  if (!text.includes('*')) return []
  const out: string[] = []
  for (const block of text.split('\n\n')) {
    if (!block.includes('*')) continue
    if (/\*\[\[(act|tip|ui):|\]\]\*/.test(block))
      out.push("stars next to [[act]], [[tip]] or [[ui]] are shown as written; bold and italics don't reach into them")
    for (const piece of block.split(INLINE_MARKUP).filter((_, at) => at % 4 === 0)) out.push(...emphasis(piece).problems)
  }
  return [...new Set(out)]
}

/** Malformed inline markup in a line of prose, and tooltips whose prose key has no words. */
function inlineMarkupProblems(text: string, where: string, tools: ResolveTools): string[] {
  if (!text.includes('[[act') && !text.includes('[[tip')) return emphasisProblems(text)
  const out: string[] = emphasisProblems(text)
  let written = 0
  for (const match of text.matchAll(INLINE_MARKUP)) {
    // `[[ui:…]]` is the ui feature's to check.
    if (match[1] === 'ui') continue
    written += 1
    const id = match[2].trim()
    const words = match[3]?.trim()
    if (match[1] === 'act') {
      if (!id) out.push('[[act]] needs the id of a choice: [[act:id]] or [[act:id|words]]')
      else if (words === '') out.push(`[[act:${id}|]] has no words; leave out the "|" to use the choice's label`)
    } else {
      if (!id) out.push('[[tip]] needs a prose key: [[tip:key|words]]')
      else if (!words) out.push(`[[tip:${id}]] needs the words to show: [[tip:${id}|words]]`)
      else out.push(...tools.resolve([{ prose: id }], where).map((what) => `[[tip:${id}]]: ${what}`))
    }
  }
  const opened = (text.match(/\[\[(act|tip)\b/g) ?? []).length
  if (opened > written) out.push('[[act:…]] or [[tip:…]] is not closed with "]]", or is missing its ":"')
  return out
}

/**
 * Whole turns since a scene was entered, or a choice (`scene#choice`) picked,
 * first or `last`; null if it hasn't been.
 */
function turnsSince(state: GameState, id: string, last = false): number | null {
  const times = id.includes('#') ? state.chosen?.[id] : state.seen?.[id]
  return times ? state.turn - (last ? times.last : times.first) : null
}

/** Times counted once more, on `turn`: the first time, if there was none. */
function oneMore(times: Times | undefined, turn: number): Times {
  return times ? { n: times.n + 1, first: times.first, last: turn } : { n: 1, first: turn, last: turn }
}

/**
 * Open a scene drawn from a named set: one whose `drawnFrom` names it and
 * whose `when` holds, by weight. The draw is seeded by the save, the turn and
 * how many draws the set has had, which the kv key `storylet:<name>` counts.
 */
function drawStorylet(state: GameState, game: Game, from: string, otherwise: string | undefined, cx: FeatureContext): GameState {
  const key = `storylet:${from}`
  const used = typeof state.kv[key] === 'number' ? (state.kv[key] as number) : 0
  const eligible = game.scenes.filter((scene) => scene.drawnFrom?.includes(from) && cx.holds(state, scene.when, game))
  const drawn = cx.weighted(eligible, (scene) => scene.weight, 'storylet', from, state.seed, state.turn, used)
  const counted = { ...state, kv: { ...state.kv, [key]: used + 1 } }
  if (drawn) return { ...counted, sceneId: drawn.id }
  return otherwise ? { ...counted, sceneId: otherwise } : counted
}

/**
 * Record a scene the command landed the player in.
 *
 * One chokepoint rather than a bump at each of the places that assign
 * `sceneId` — a talk, a plugin command, the intro and an effect all open scenes, and
 * a counter that some of those routes forget is worse than none. A command's
 * effects can pass through several ids; only the one the player is left looking
 * at is a viewing, which is what comparing before to after gives us.
 */
function witnessed(before: GameState, after: GameState): GameState {
  const id = after.sceneId
  if (!id || id === before.sceneId) return after
  return { ...after, seen: { ...after.seen, [id]: oneMore(after.seen[id], after.turn) } }
}

export const scenes = defineFeature<ScenesShape>({
  name: 'scenes',
  state: {
    sceneId: { start: (game) => game.introScene ?? null },
    // The opening scene is on screen from the first frame, so it counts as seen
    // without a command ever having been run.
    seen: { start: (game) => (game.introScene ? { [game.introScene]: { n: 1, first: 0, last: 0 } } : {}), load: () => ({}) },
    chosen: { start: () => ({}), load: () => ({}) },
  },
  conditions: {
    chose: {
      holds: (state, condition) => inRange(state.chosen?.[condition.chose]?.n ?? 0, condition),
      explain: (state, condition) => `choice ${condition.chose} picked ${state.chosen?.[condition.chose]?.n ?? 0} times; wants ${wanted(condition)}`,
      references: (condition) => [{ choice: condition.chose }],
    },
    seen: {
      holds: (state, condition) => inRange(state.seen?.[condition.seen]?.n ?? 0, condition),
      explain: (state, condition) => `scene ${condition.seen} seen ${state.seen?.[condition.seen]?.n ?? 0} times; wants ${wanted(condition)}`,
      references: (condition) => [{ scene: condition.seen, as: 'gate' }],
    },
    since: {
      holds: (state, condition) => {
        const turns = turnsSince(state, condition.since, condition.last)
        return turns !== null && inRange(turns, condition)
      },
      explain: (state, condition) => {
        const turns = turnsSince(state, condition.since, condition.last)
        const choice = condition.since.includes('#')
        const what = choice ? `choice ${condition.since}` : `scene ${condition.since}`
        return turns === null
          ? `${what} not ${choice ? 'picked' : 'seen'} yet; wants ${wanted(condition)} turns since`
          : `${what} ${condition.last ? 'last' : 'first'} ${choice ? 'picked' : 'seen'} ${turns} turns ago; wants ${wanted(condition)}`
      },
      references: (condition) => (condition.since.includes('#') ? [{ choice: condition.since }] : [{ scene: condition.since, as: 'gate' }]),
    },
    scene: {
      holds: (state, condition) => state.sceneId !== null && condition.scene.includes(state.sceneId),
      explain: (state, condition) => `scene on screen is ${state.sceneId ?? 'none'}; wants one of ${condition.scene.join(', ')}`,
      references: (condition) => condition.scene.map((scene) => ({ scene, as: 'gate' as const })),
    },
  },
  effects: {
    scene: {
      // Entering a scene starts its visit afresh, the one on screen included.
      apply: (state, effect, game, cx) => {
        const to = effect.scene
        if (to !== null && typeof to === 'object') return drawStorylet({ ...state, flow: null }, game, to.from, to.otherwise, cx)
        return { ...state, sceneId: to, flow: null }
      },
      references: (effect) => {
        const to = effect.scene
        if (to !== null && typeof to === 'object')
          return [{ drawnFrom: to.from }, ...(to.otherwise !== undefined ? [{ scene: to.otherwise, as: 'go' as const }] : [])]
        return to === null ? [] : [{ scene: to, as: 'go' }]
      },
    },
  },
  commands: {
    scene: {
      whyNot: (state, command, game, cx) => {
        if (state.sceneId) return say(game, 'finishFirst')
        return cx.sceneById(game, command.id) ? undefined : say(game, 'noSuchScene')
      },
      run: (state, command) => ({ ...state, sceneId: command.id, flow: null }),
      references: (command) => [{ scene: command.id, as: 'open' }],
    },
    choose: {
      whyNot: (state, command, game, cx) => {
        if (!state.sceneId) return say(game, 'nothingToChoose')
        // A scene the game no longer has is let through: choosing closes it.
        if (!cx.sceneById(game, state.sceneId)) return undefined
        const choice = cx.rendered.scene()!.choices.find((entry) => entry.id === command.id)
        if (!choice || choice.visible === false) return say(game, 'notOnOffer')
        if (choice.disabled) return choice.disabled
        const short = costRefusal(state, game, choice.cost, cx)
        if (short) return short
        // The command it sends, asked as it would be on its own. A choice can't send a choice.
        const sends = choice.command && commandOf(choice.command)
        if (sends) return sends.type === 'choose' ? say(game, 'notOnOffer') : cx.whyNotCommand(state, game, sends)
        return undefined
      },
      run: (state, command, game, cx) => {
        const scene = cx.sceneById(game, state.sceneId!)
        if (!scene) return { ...state, sceneId: null }
        const rendered = cx.rendered.scene()! as Partial<RenderedScene> & SceneView
        const choice = rendered.choices.find((entry) => entry.id === command.id)!
        const key = `${scene.id}#${choice.id}`
        // Counted on the turn it was picked in, before its effects can end the turn.
        const counted = { ...state, chosen: { ...state.chosen, [key]: oneMore(state.chosen?.[key], state.turn) } }
        // A pick at a decision goes on the visit's path, with the jump its effects make; so does an ending choice's that jumps.
        const jump = jumpOf(choice.effects)
        const marked =
          rendered.stop === 'decide' || (rendered.stop === 'end' && jump !== undefined)
            ? stepped(counted, scene.id, { chose: choice.id }, ...(jump !== undefined ? [{ point: jump }] : []))
            : counted
        // The command it sends first, then its cost, then its effects.
        const sent = choice.command ? cx.runCommand(marked, game, commandOf(choice.command)) : marked
        const paid = choice.cost ? payCost(sent, game, choice.cost, cx) : sent
        return cx.runEffects(paid, game, choice.effects, false)
      },
      effectsOf: (state, command, game, cx) => {
        const choice = cx.rendered.scene()?.choices.find((entry) => entry.id === command.id)
        if (!choice) return []
        const sends = choice.command && commandOf(choice.command)
        const own = [...costEffects(choice.cost), ...choice.effects]
        return sends && sends.type !== 'choose' ? [...own, ...cx.effectsOfCommand(state, game, sends)] : own
      },
      references: () => [],
    },
    leave: {
      whyNot: () => undefined,
      run: (state) => ({ ...state, sceneId: null, flow: null }),
      references: () => [],
    },
  },
  pack: together(
    { merge },
    lastWins<ScenesShape['game'], ScenesShape['pack'], string>(
      'introScene',
      (pack) => pack.introScene,
      (game, scene) => {
        game.introScene = scene
      },
    ),
  ),
  lists: ['scene', 'introScene'],
  check: (game, tools) => {
    if (game.introScene !== undefined && !game.scenes.some((scene) => scene.id === game.introScene)) {
      tools.problem({ list: 'introScene' }, 'introScene', `unknown scene "${game.introScene}"`)
    }
    tools.twice(
      'scene',
      'scenes',
      game.scenes.map((entry) => entry.id),
    )
    // A data scene's content.
    for (const scene of game.scenes) {
      if (!isDataScene(scene)) continue
      const source = { list: 'scene', id: scene.id }
      const where = `scene ${scene.id}`
      tools.check(source, where, dataSceneReferences(scene))
      const ids = new Set<string>()
      for (const choice of sceneChoices(scene)) {
        if (ids.has(choice.id)) tools.problem(source, where, `two choices share the id "${choice.id}"`)
        ids.add(choice.id)
        if (choice.command && commandOf(choice.command).type === 'choose')
          tools.problem(source, where, `choice ${choice.id}: a choice's command can't be another choice; put the effects on this one`)
      }
    }
    // Every scene's storylet fields.
    for (const scene of game.scenes) {
      const source = { list: 'scene', id: scene.id }
      const where = `scene ${scene.id}`
      const drawn = Boolean(scene.drawnFrom?.length)
      if (scene.weight !== undefined && !(scene.weight > 0)) tools.problem(source, where, 'weight must be above 0')
      if (scene.weight !== undefined && !drawn) tools.problem(source, where, 'has a weight but no drawnFrom, so it is never drawn')
      if (scene.when !== undefined && !drawn) tools.problem(source, where, 'has a when but no drawnFrom; when only gates draws')
      tools.check(source, where, [{ when: scene.when }, { ui: scene.ui }])
    }
  },
  // Render every scene against a probe state and check what falls out. A data scene's content is checked already.
  probe: (game, { name, state }, tools, cx) => {
    const ctx = sceneContext(state, game)
    for (const listed of game.scenes) {
      const scene = cx.sceneById(game, listed.id)
      if (!scene) continue
      const source = { list: 'scene', id: listed.id }
      const where = `scene ${listed.id} (${name})`
      let shown
      try {
        shown = scene.render(state, ctx)
      } catch (error) {
        tools.problem(source, where, `render threw: ${(error as Error).message}`)
        continue
      }
      if (isDataScene(listed)) continue
      const ids = new Set<string>()
      for (const choice of shown.choices) {
        if (ids.has(choice.id)) tools.problem(source, where, `two choices share the id "${choice.id}"`)
        ids.add(choice.id)
      }
      tools.check(source, where, [
        { markup: shown.body ?? '' },
        { actionsIn: shown.body ?? '', offers: shown.choices.map((choice) => choice.id) },
        ...(shown.media ?? []).map((media) => ({ media })),
        ...Object.entries(shown.audio ?? {}).map(([channel, track]) => ({ channel, track })),
        { stage: shown.stage, choices: shown.choices.map((choice) => choice.id) },
        ...shown.choices.map((choice) => ({ within: `choice ${choice.id}`, refs: [{ effects: choice.effects }] })),
      ])
    }
  },
  // Scenes as gates, as places to go and to open, the choices in them, the draws, and prose blocks.
  resolve: (game, tools) => {
    const sceneOf = new Map(game.scenes.map((scene) => [scene.id, scene]))
    const drawnFrom = new Set(game.scenes.flatMap((scene) => scene.drawnFrom ?? []))
    return {
      scene: (ref) => {
        if (sceneOf.has(ref.scene)) return []
        if (ref.as === 'gate') return [`gated on unknown scene "${ref.scene}"`]
        if (ref.as === 'open') return [`opens unknown scene "${ref.scene}"`]
        return [`goes to unknown scene "${ref.scene}"`]
      },
      choice: (ref) => {
        const cut = ref.choice.lastIndexOf('#')
        const scene = cut > 0 ? sceneOf.get(ref.choice.slice(0, cut)) : undefined
        if (!scene) return [`gated on a choice in unknown scene "${ref.choice}"`]
        // Only a data scene's choices are known before it runs; a hand-built one is taken at its word.
        if (isDataScene(scene) && !sceneChoices(scene).some((choice) => choice.id === ref.choice.slice(cut + 1)))
          return [`gated on unknown choice "${ref.choice}"`]
        return []
      },
      drawnFrom: (ref) => (drawnFrom.has(ref.drawnFrom) ? [] : [`draws from "${ref.drawnFrom}", but no scene is drawn from it`]),
      blocks: (ref, where) => tools.resolve(blockReferences(ref.blocks), where),
      actionsIn: (ref) => inlineActionProblems(game, ref.actionsIn, ref.offers),
    }
  },
  markup: (_game, text, where, tools) => inlineMarkupProblems(text, where, tools),
  view: (state) => ({ inScene: Boolean(state.sceneId) }),
  // A new showing is seen, and dated the first time. Straight after the triggers, so plugins' `onCommand` hooks see it.
  afterCommand: { at: 'beforePlugins', run: witnessed },
})
