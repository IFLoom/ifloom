/**
 * Scenes: which one is open, what the player has seen and chosen, opening
 * and leaving them, and storylets, the scenes a `{ kind: 'scene', from }`
 * effect draws at random from a named set (ADR 0005).
 */
import { say } from '../strings.ts'
import { sceneContext } from '../context.ts'
import type { Game, Scene } from '../game.ts'
import type { Reference } from '../references.ts'
import type { Block, DataScene } from '../scene.ts'
import type { Condition, GameState, Range } from '../types.ts'
import { defineFeature, inRange, wanted, type FeatureContext, type PackMerge } from './feature.ts'

/** A surgical change to a data scene an earlier pack declared: a choice added, dropped or replaced. */
export type Patch =
  | { scene: string; addChoice: DataScene['choices'][number]; before?: string }
  | { scene: string; dropChoice: string }
  | { scene: string; replaceChoice: DataScene['choices'][number] }

/**
 * What makes a scene a storylet: the named draws it can be drawn from, how
 * often, and when. See the `{ kind: 'scene', from }` effect.
 */
export type StoryletFields = {
  /**
   * The draws this scene can come up in, by name: `['cafe']`. A
   * `{ kind: 'scene', from: 'cafe' }` effect draws one of the scenes that name
   * `'cafe'` here. Separate from `tags`, which only style the scene.
   */
  drawnFrom?: string[]
  /** How likely a draw is to pick it, against the others it could pick. 1 if left out. Needs `drawnFrom`. */
  weight?: number
  /** Only drawn while this holds. It gates draws only: a `scene` command or effect naming the scene opens it regardless. */
  when?: Condition
}

/** What the scenes feature adds, as types. */
export type ScenesShape = {
  state: {
    sceneId: string | null
    /**
     * How many times each scene has been entered. The engine's own record of what
     * the player has actually watched, so a chain can say "not until you have seen
     * the rung before this one" without every link needing a hand-written kv key.
     *
     * Re-entering the scene you are already in — a hub redrawing itself after a
     * choice — is not a viewing and does not count.
     */
    seen: Record<string, number>
    /**
     * The turn each scene was first entered. The pace half of a ladder: `seen`
     * says the rung below has happened, this says how long ago, so a rung can
     * ask for a few turns to have passed however fast the stat behind it came in.
     */
    seenOn: Record<string, number>
    /**
     * How many times each choice has been picked, by `scene/choice`. Kept for
     * every choice, so content can branch on an earlier decision without each one
     * needing a kv key of its own.
     */
    chosen: Record<string, number>
  }
  conditions: {
    /**
     * How many times a choice has been picked, by `scene/choice`. Bare, at least
     * once: `{ chose: 'bakery.counter/buy-bread' }`.
     */
    chose: { chose: string } & Range
    /**
     * A scene the player has already been through. The order half of a gate: a
     * stat says whether you are good enough yet, this says whether you have been
     * here yet. Bare, it asks for one viewing; `{ seen: 'x', gte: 2 }` for two.
     */
    seen: { seen: string } & Range
    /**
     * Whole turns since a scene was first entered. The pace half of a gate:
     * `{ since: 'baker.first-coffee', gte: 5 }` holds from five turns after
     * the first coffee. A scene not yet seen fails every range, `lt` included — "not long
     * since" is not true of something that has not happened.
     */
    since: { since: string } & Range
    /** The scene on screen is one of these. */
    scene: { scene: string[] }
  }
  effects: {
    scene:
      | { kind: 'scene'; id: string | null }
      /**
       * Open one scene drawn at random from the scenes whose `drawnFrom` names
       * `from` and whose `when` holds, by their `weight`. With none to draw, open
       * `otherwise` if given, else do nothing. A storylet draw: `{ kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }`.
       */
      | { kind: 'scene'; from: string; otherwise?: string }
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
  }
  view: {
    inScene: boolean
  }
  lists: 'scene'
}

function isDataScene(scene: Scene | DataScene): scene is DataScene {
  return 'body' in scene && Array.isArray((scene as DataScene).body)
}

/** What prose blocks name: prose keys, variants and their art, conditions, media. */
export function blockReferences(blocks: readonly Block[] | undefined): Reference[] {
  const out: Reference[] = []
  for (const block of blocks ?? []) {
    if ('text' in block) out.push({ prose: block.text })
    if ('variants' in block) {
      out.push({ variants: block.variants })
      for (const art of Object.values(block.art ?? {})) out.push({ variants: art })
    }
    if ('media' in block) out.push({ media: block.media })
    out.push({ when: block.when })
    if ('variants' in block) for (const gate of Object.values(block.gate ?? {})) out.push({ when: gate })
  }
  return out
}

/** What a data scene names: its body, its choices' labels, conditions and effects, its audio, panel and stage. */
export function dataSceneReferences(scene: DataScene): Reference[] {
  const out: Reference[] = [{ blocks: scene.body }]
  for (const choice of scene.choices) {
    out.push({ prose: choice.label ?? `${scene.id}#${choice.id}` })
    for (const entry of choice.labels ?? []) out.push({ prose: entry.key }, { when: entry.when })
    out.push({ when: choice.when })
    for (const entry of choice.blocked ?? []) out.push({ when: entry.when })
    out.push({ effects: choice.effects })
  }
  for (const [channel, track] of Object.entries(scene.audio ?? {})) out.push({ channel, track })
  if (scene.panelData !== undefined) out.push({ panel: scene.panelData })
  out.push({ stage: scene.stage, choices: scene.choices.map((choice) => choice.id) })
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

/** Whole turns since a scene was first entered, or null if it hasn't been. */
function turnsSince(state: GameState, sceneId: string): number | null {
  const turn = state.seenOn?.[sceneId]
  return typeof turn === 'number' ? state.turn - turn : null
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
  const seen = { ...after.seen, [id]: (after.seen[id] ?? 0) + 1 }
  if (after.seenOn?.[id] !== undefined) return { ...after, seen }
  return { ...after, seen, seenOn: { ...after.seenOn, [id]: after.turn } }
}

export const scenes = defineFeature<ScenesShape>({
  name: 'scenes',
  state: {
    sceneId: { start: (game) => game.introScene ?? null },
    // The opening scene is on screen from the first frame, so it counts as seen
    // without a command ever having been run.
    seen: { start: (game) => (game.introScene ? { [game.introScene]: 1 } : {}), load: () => ({}) },
    seenOn: { start: (game) => (game.introScene ? { [game.introScene]: 0 } : {}), load: () => ({}) },
    chosen: { start: () => ({}), load: () => ({}) },
  },
  conditions: {
    chose: {
      holds: (state, condition) => inRange(state.chosen?.[condition.chose] ?? 0, condition),
      explain: (state, condition) => `choice ${condition.chose} picked ${state.chosen?.[condition.chose] ?? 0} times; wants ${wanted(condition)}`,
      references: (condition) => [{ choice: condition.chose }],
    },
    seen: {
      holds: (state, condition) => inRange(state.seen?.[condition.seen] ?? 0, condition),
      explain: (state, condition) => `scene ${condition.seen} seen ${state.seen?.[condition.seen] ?? 0} times; wants ${wanted(condition)}`,
      references: (condition) => [{ scene: condition.seen, as: 'gate' }],
    },
    since: {
      holds: (state, condition) => {
        const turns = turnsSince(state, condition.since)
        return turns !== null && inRange(turns, condition)
      },
      explain: (state, condition) => {
        const turns = turnsSince(state, condition.since)
        return turns === null
          ? `scene ${condition.since} not seen yet; wants ${wanted(condition)} turns since`
          : `scene ${condition.since} first seen ${turns} turns ago; wants ${wanted(condition)}`
      },
      references: (condition) => [{ scene: condition.since, as: 'gate' }],
    },
    scene: {
      holds: (state, condition) => state.sceneId !== null && condition.scene.includes(state.sceneId),
      explain: (state, condition) => `scene on screen is ${state.sceneId ?? 'none'}; wants one of ${condition.scene.join(', ')}`,
      references: (condition) => condition.scene.map((scene) => ({ scene, as: 'gate' as const })),
    },
  },
  effects: {
    scene: {
      apply: (state, effect, game, cx) => {
        if ('from' in effect) return drawStorylet(state, game, effect.from, effect.otherwise, cx)
        return { ...state, sceneId: effect.id }
      },
      references: (effect) => {
        if ('from' in effect) return [{ drawnFrom: effect.from }, ...(effect.otherwise !== undefined ? [{ scene: effect.otherwise, as: 'go' as const }] : [])]
        return effect.id === null ? [] : [{ scene: effect.id, as: 'go' }]
      },
    },
  },
  commands: {
    scene: {
      whyNot: (state, command, game, cx) => {
        if (state.sceneId) return say(game, 'finishFirst')
        return cx.sceneById(game, command.id) ? undefined : say(game, 'noSuchScene')
      },
      run: (state, command) => ({ ...state, sceneId: command.id }),
      references: (command) => [{ scene: command.id, as: 'open' }],
    },
    choose: {
      whyNot: (state, command, game, cx) => {
        if (!state.sceneId) return say(game, 'nothingToChoose')
        // A scene the game no longer has is let through: choosing closes it.
        if (!cx.sceneById(game, state.sceneId)) return undefined
        const choice = cx.rendered.scene()!.choices.find((entry) => entry.id === command.id)
        if (!choice || choice.visible === false) return say(game, 'notOnOffer')
        return choice.disabled
      },
      run: (state, command, game, cx) => {
        const scene = cx.sceneById(game, state.sceneId!)
        if (!scene) return { ...state, sceneId: null }
        const choice = cx.rendered.scene()!.choices.find((entry) => entry.id === command.id)!
        const key = `${scene.id}/${choice.id}`
        const marked = { ...state, chosen: { ...state.chosen, [key]: (state.chosen?.[key] ?? 0) + 1 } }
        return cx.runEffects(marked, game, choice.effects, false)
      },
      effectsOf: (_state, command, _game, cx) => {
        const choice = cx.rendered.scene()?.choices.find((entry) => entry.id === command.id)
        return choice ? [...choice.effects] : []
      },
      references: () => [],
    },
    leave: {
      whyNot: () => undefined,
      run: (state) => ({ ...state, sceneId: null }),
      references: () => [],
    },
  },
  pack: { merge },
  lists: ['scene'],
  check: (game, tools) => {
    if (game.introScene !== undefined && !game.scenes.some((scene) => scene.id === game.introScene)) {
      tools.problem(undefined, 'introScene', `unknown scene "${game.introScene}"`)
    }
    tools.twice('scene', 'scenes', game.scenes.map((entry) => entry.id))
    // A data scene's content.
    for (const scene of game.scenes) {
      if (!isDataScene(scene)) continue
      const source = { list: 'scene', id: scene.id }
      const where = `scene ${scene.id}`
      tools.check(source, where, dataSceneReferences(scene))
      const ids = new Set<string>()
      for (const choice of scene.choices) {
        if (ids.has(choice.id)) tools.problem(source, where, `two choices share the id "${choice.id}"`)
        ids.add(choice.id)
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
      tools.check(source, where, [{ when: scene.when }])
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
        const cut = ref.choice.lastIndexOf('/')
        const scene = cut > 0 ? sceneOf.get(ref.choice.slice(0, cut)) : undefined
        if (!scene) return [`gated on a choice in unknown scene "${ref.choice}"`]
        // Only a data scene's choices are known before it runs; a hand-built one is taken at its word.
        if (isDataScene(scene) && !scene.choices.some((choice) => choice.id === ref.choice.slice(cut + 1))) return [`gated on unknown choice "${ref.choice}"`]
        return []
      },
      drawnFrom: (ref) => (drawnFrom.has(ref.drawnFrom) ? [] : [`draws from "${ref.drawnFrom}", but no scene is drawn from it`]),
      blocks: (ref, where) => tools.resolve(blockReferences(ref.blocks), where),
    }
  },
  view: (state) => ({ inScene: Boolean(state.sceneId) }),
  // A new showing is seen, and dated the first time. Straight after the triggers, so plugins' `after` hooks see it.
  afterCommand: { at: 'beforePlugins', run: witnessed },
})
