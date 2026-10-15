import type { Condition } from './condition.ts'
import { holds } from './condition.ts'
import type { Game, Scene, SceneChoice, SceneMedia, SceneView } from './game.ts'
import { markUsed, usedThisTurn } from './once.ts'
import { roll } from './random.ts'
import {
  buildEffects,
  customEffectsUsed,
  customPanel,
  type EffectRef,
} from './custom.ts'
import type { Effect, GameState } from './types.ts'

/**
 * A scene, as data.
 *
 * The body is *composed* from blocks rather than looked up whole. That is
 * the point: under the old model one key had to cover an entire body, so any
 * branch the key did not carry got frozen onto whichever version was exported.
 * Here each block is its own key, so a key can only ever mean one thing, and
 * adding a conditional line is adding a block rather than multiplying the
 * key space.
 */
export type Block =
  | { text: string; when?: Condition }
  | {
      variants: string
      when?: Condition
      /**
       * Conditions on individual members, by key. A line whose gate fails is
       * left out of the draw — so a variants can hold something she only says once
       * she has posted a photo, without splitting the variants in two.
       */
      gate?: Record<string, Condition>
      /**
       * A picture that belongs with a particular line, given as the variants to
       * draw it from — so a rotating line keeps its paired, rotating still.
       */
      art?: Record<string, string>
    }
  | { media: SceneMedia; when?: Condition }


export type Choice = {
  id: string
  /** Prose key for the label. Defaults to `${scene}#${id}`. */
  label?: string
  /**
   * Labels that depend on state — "Not today" before you have bought it,
   * "Right." after. First match wins; `label` is the fallback.
   */
  labels?: { when?: Condition; key: string }[]
  when?: Condition
  /** Reasons it is on screen but cannot be taken. First match wins. */
  blocked?: { when: Condition; reason: string }[]
  /**
   * A line that only lands once a turn.
   * The reason is what the player reads on it afterwards — the line stays on
   * screen rather than vanishing, which is how the caps read as character.
   */
  once?: {
    per: 'turn'
    reason: string
    /** Override the flag it records under, to keep an existing save's caps. */
    key?: string
  }
  /** Words the UI can style or filter the choice by. The engine gives them no meaning. */
  tags?: string[]
  irreversible?: string
  /** Literal effects, or `{ custom: name }` for the few that are computed. */
  effects: EffectRef[]
}

export type DataScene = {
  id: string
  title?: string
  speaker?: string
  /** Drawn as a conversation. A scene with a speaker is one already. */
  frame?: 'talk'
  /** Words the UI can style the scene by: `['letter']`, `['flashback']`. The engine gives them no meaning. */
  tags?: string[]
  /** A bespoke UI panel to render in place of the choice list, by name. */
  panel?: string
  /**
   * Whatever that panel needs, as the name of a registered builder.
   *
   * A panel usually wants something computed, which used to mean the scene had
   * to be an assembled `render` and give up blocks, variants and conditions to
   * get it. Naming the builder keeps the content declarative and serialisable —
   * the same trade `{ custom: 'name' }` already makes for effects.
   */
  panelData?: string
  body: Block[]
  choices: Choice[]
}

/** How a scene reaches its words. Supplied by the loader. */
export type Prose = {
  /** The words for a key, filled in for this save, or undefined if unwritten. */
  line: (key: string, state?: GameState) => string | undefined
  /** The members of a variants, in declaration order. */
  variants: (name: string) => string[]
  /** Which member of a variants this state gets, and what to remember about it. */
  draw: (
    state: GameState,
    name: string,
    members: string[],
  ) => { id: string; remember: Effect }
}

export type SceneRuntime = {
  prose: Prose
  game: Game
  /** Whether a once-a-turn line has already landed this turn. */
  spent: (state: GameState, scene: string, choice: string) => boolean
  /** What to record when one is taken. */
  spend: (state: GameState, scene: string, choice: string) => Effect[]
}

/**
 * The keys of a variants list that are actually draws.
 *
 * Variants can be discovered from the prose by key prefix, which means a scene
 * that names a block `cafe.order/late` puts it in the `cafe.order` variants
 * whether it meant to or not — and a narrator's aside ends up dealt as a line
 * of dialogue. Anything the same scene declares as its own block is not a draw.
 */
export function variantMembers(
  scene: DataScene,
  variants: string,
  runtime: SceneRuntime,
): string[] {
  const declared = new Set(
    scene.body.flatMap((entry) => ('text' in entry ? [entry.text] : [])),
  )
  return runtime.prose
    .variants(variants)
    .filter((key) => !declared.has(key))
    .filter((key) => runtime.prose.line(key) !== undefined)
}

function blockText(
  scene: DataScene,
  block: Block,
  state: GameState,
  runtime: SceneRuntime,
): {
  text?: string
  media?: SceneMedia
  remember?: Effect
  also?: Effect
  /** Which block this was, so a reply can be written to answer it. */
  drawn?: string
} {
  if ('media' in block) return { media: block.media }
  if ('text' in block) {
    return { text: runtime.prose.line(block.text, state), drawn: block.text }
  }
  const members = variantMembers(scene, block.variants, runtime).filter((key) =>
    holds(state, block.gate?.[key], runtime.game),
  )
  if (members.length === 0) return {}
  const drawn = runtime.prose.draw(state, block.variants, members)
  const line = runtime.prose.line(drawn.id, state)
  const artVariants = block.art?.[drawn.id]
  if (!artVariants) return { text: line, remember: drawn.remember, drawn: drawn.id }
  const stills = variantMembers(scene, artVariants, runtime)
  if (stills.length === 0) {
    return { text: line, remember: drawn.remember, drawn: drawn.id }
  }
  const still = runtime.prose.draw(state, artVariants, stills)
  return {
    text: [runtime.prose.line(still.id, state), line].filter(Boolean).join('\n\n'),
    remember: drawn.remember,
    also: still.remember,
    drawn: drawn.id,
  }
}

/**
 * Turn a scene and a state into what the player sees. Blocks that do not
 * apply are dropped; the rest are joined in declaration order.
 */
export function renderScene(
  scene: DataScene,
  state: GameState,
  runtime: SceneRuntime,
): SceneView {
  const parts: string[] = []
  const media: SceneMedia[] = []
  const remember: Effect[] = []
  /** Every block this render used, in order. Later ones win a label. */
  const drawn: string[] = []

  for (const block of scene.body) {
    if (!holds(state, block.when, runtime.game)) continue
    const resolved = blockText(scene, block, state, runtime)
    if (resolved.media) media.push(resolved.media)
    if (resolved.text) parts.push(resolved.text)
    if (resolved.remember) remember.push(resolved.remember)
    if (resolved.also) remember.push(resolved.also)
    if (resolved.drawn) drawn.push(resolved.drawn)
  }

  const choices: SceneChoice[] = []
  for (const choice of scene.choices) {
    const visible = holds(state, choice.when, runtime.game)
    const already =
      choice.once !== undefined &&
      runtime.spent(state, choice.once.key ?? scene.id, choice.once.key ? '' : choice.id)
    const blocked = choice.blocked?.find((entry) =>
      holds(state, entry.when, runtime.game),
    )
    const chosen = choice.labels?.find((entry) =>
      holds(state, entry.when, runtime.game),
    )
    // A reply written to answer the line she actually gave beats a generic
    // one. Any block may carry its own `### Choices`; if one that rendered has
    // a label for this choice, the last of them wins.
    const matched = drawn
      .map((key) => runtime.prose.line(`${key}#${choice.id}`, state))
      .filter((line): line is string => line !== undefined)
      .at(-1)
    const label =
      matched ??
      runtime.prose.line(
        chosen?.key ?? choice.label ?? `${scene.id}#${choice.id}`,
        state,
      ) ??
      choice.id
    choices.push({
      id: choice.id,
      label,
      visible,
      disabled: blocked?.reason ?? (already ? choice.once?.reason : undefined),
      tags: choice.tags,
      irreversible: choice.irreversible,
      // A once-a-day line pays nothing the second time, but the prose and
      // the choice stay on screen — see `oncePerTurn()` for why that reads better.
      effects: already
        ? buildEffects(state, runtime.game, choice.effects).filter(
            (effect) => effect.kind === 'scene',
          )
        : [
            ...buildEffects(state, runtime.game, choice.effects),
            ...(choice.once
              ? runtime.spend(state, choice.once.key ?? scene.id, choice.once.key ? '' : choice.id)
              : []),
            ...remember,
          ],
    })
  }

  return {
    title: scene.title,
    speaker: scene.speaker,
    frame: scene.frame,
    tags: scene.tags,
    panel: scene.panel,
    panelData: scene.panelData
      ? customPanel(runtime.game, scene.panelData)?.(state)
      : undefined,
    body: parts.join('\n\n'),
    media: media.length ? media : undefined,
    choices,
  }
}

/** Every id a scene refers to, for the loader to check. */
export function sceneReferences(scene: DataScene): {
  prose: string[]
  variants: string[]
  scenes: string[]
  custom: string[]
} {
  const prose: string[] = []
  const variants: string[] = []
  const scenes: string[] = []
  const custom: string[] = []
  for (const block of scene.body) {
    if ('text' in block) prose.push(block.text)
    if ('variants' in block) {
      variants.push(block.variants)
      variants.push(...Object.values(block.art ?? {}))
    }
  }
  for (const choice of scene.choices) {
    prose.push(choice.label ?? `${scene.id}#${choice.id}`)
    for (const entry of choice.labels ?? []) prose.push(entry.key)
    custom.push(...customEffectsUsed(choice.effects))
    for (const effect of choice.effects) {
      if ('kind' in effect && effect.kind === 'scene' && effect.id) {
        scenes.push(effect.id)
      }
    }
  }
  return { prose, variants, scenes, custom }
}

/**
 * Which member of a variants list this state gets: rotating on every use, so
 * a scene does not repeat itself, and starting somewhere different each turn,
 * so two playthroughs do not deal the same lines.
 *
 * The two halves stay separate on purpose. The turn picks an **offset** through
 * its own hash, and the count of uses walks from there one step at a time. One
 * sum taken modulo the list's length — seed, turn, uses — beats against a fixed
 * calendar: a list of three drawn every second and fifth turn comes back to the
 * same member week after week.
 */
export function drawVariant(
  state: GameState,
  name: string,
  members: string[],
): { id: string; remember: Effect } {
  if (members.length === 0) throw new Error(`variants "${name}" has no members`)
  const key = `variants:${name}`
  const used = Number(state.flags[key] ?? 0)
  const offset = roll(members.length, name, state.seed, state.turn)
  const index = (((offset + used) % members.length) + members.length) % members.length
  return { id: members[index], remember: { kind: 'flag', key, value: used + 1 } }
}

/**
 * How a data scene renders when the game supplies nothing else: the game's
 * prose store, the draw above, and once-a-turn lines recorded per turn (`once.ts`).
 */
export function defaultRuntime(game: Game): SceneRuntime {
  const id = (scene: string, choice: string) => (choice ? `${scene}.${choice}` : scene)
  return {
    game,
    prose: {
      line: (key, state) => game.prose?.line(key, state),
      variants: (name) => game.prose?.variants(name) ?? [],
      draw: drawVariant,
    },
    spent: (state, scene, choice) => usedThisTurn(state, id(scene, choice)),
    spend: (state, scene, choice) => [markUsed(state, id(scene, choice))],
  }
}

/** Baked scenes, per game: one data scene listed in two games runs with each game's own functions. */
const baked = new WeakMap<Game, WeakMap<DataScene, Scene>>()

/** A data scene as the engine runs it. Built once per scene and game, and kept. */
export function bakeScene(game: Game, scene: DataScene): Scene {
  let forGame = baked.get(game)
  if (!forGame) {
    forGame = new WeakMap()
    baked.set(game, forGame)
  }
  const known = forGame.get(scene)
  if (known) return known
  const runtime = defaultRuntime(game)
  const done: Scene = {
    id: scene.id,
    title: scene.title,
    speaker: scene.speaker,
    frame: scene.frame,
    tags: scene.tags,
    panel: scene.panel,
    render: (state) => renderScene(scene, state, runtime),
  }
  forGame.set(scene, done)
  return done
}

export function isDataScene(scene: Scene | DataScene): scene is DataScene {
  return 'body' in scene && Array.isArray((scene as DataScene).body)
}
