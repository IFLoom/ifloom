/**
 * Scenes: which one is open, what the player has seen and chosen, opening
 * and leaving them, and storylets, the scenes a `{ kind: 'scene', from }`
 * effect draws at random from a named set (ADR 0005).
 */
import { say } from '../strings.ts'
import type { Game } from '../game.ts'
import type { Condition, GameState, Range } from '../types.ts'
import { defineFeature, inRange, wanted, type FeatureContext } from './feature.ts'

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
     * the rung before this one" without every link needing a hand-written flag.
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
     * needing a flag of its own.
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
}

/** Whole turns since a scene was first entered, or null if it hasn't been. */
function turnsSince(state: GameState, sceneId: string): number | null {
  const turn = state.seenOn?.[sceneId]
  return typeof turn === 'number' ? state.turn - turn : null
}

/**
 * Open a scene drawn from a named set: one whose `drawnFrom` names it and
 * whose `when` holds, by weight. The draw is seeded by the save, the turn and
 * how many draws the set has had, which a variable `storylet:<name>` counts.
 */
function drawStorylet(state: GameState, game: Game, from: string, otherwise: string | undefined, cx: FeatureContext): GameState {
  const key = `storylet:${from}`
  const used = typeof state.flags[key] === 'number' ? (state.flags[key] as number) : 0
  const eligible = game.scenes.filter((scene) => scene.drawnFrom?.includes(from) && cx.holds(state, scene.when, game))
  const drawn = cx.weighted(eligible, (scene) => scene.weight, 'storylet', from, state.seed, state.turn, used)
  const counted = { ...state, flags: { ...state.flags, [key]: used + 1 } }
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
  // Every scene's storylet fields.
  check: (game, tools) => {
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
  // A new showing is seen, and dated the first time. Straight after the triggers, so plugins' `after` hooks see it.
  afterCommand: { at: 'triggers', run: witnessed },
})
