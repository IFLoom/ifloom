import { holds, type Condition } from './condition.ts'
import type { ButtonDef, Game, MinigameSceneFields, Scene, SceneChoice, SceneMedia, SceneView, StoryletFields } from './game.ts'
import { roll, weighted } from './random.ts'
import { mediaMarkup, resolveMedia, resolvePoolMarkup, type MediaStage } from './features/media.ts'
import { featureContext } from './core.ts'
import type { BlockUi, SceneUi, Ui } from './features/ui.ts'
import { buildEffects } from './custom.ts'
import type { ScenePanel } from './features/panels.ts'
import type { Effect, GameState } from './types.ts'
import { commandOf } from './calls.ts'
import { fillTokens } from './prose.ts'
import type { BodyPart, SceneBeat } from './sceneBody.ts'
import type { PluginArgs } from './plugin.ts'
import { everyBlock, walkFlow, type FlowContent, type FlowStop } from './features/flows.ts'
import { lineSpeakers } from './speakers.ts'

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
export type Block = (
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
  /**
   * A picture or a video. Left without `at`, it sits here in the body, in
   * order with the prose, exactly as its markup would.
   */
  | { media: SceneMedia; when?: Condition }
  /**
   * Words as written, one paragraph or several, read as prose is (spoken
   * lines, pictures, inline markup, tokens): what `text()` writes.
   */
  | { words: string; when?: Condition }
  /**
   * A spoken line as written, under who says it, by id as `@id: "…"` in
   * prose names them: an entity, by reference or bare id as a scene's
   * `speaker` is, `'you'` for whoever the player is playing, or `'player'`.
   * What `say()` writes. `voice` is the track of it read aloud.
   */
  | { say: string; speaker: string; voice?: string; when?: Condition }
  /**
   * A section: blocks shown together while `when` holds. Its `ui` hints are
   * carried on every beat it makes, as `section`, so a UI can draw it as one,
   * as the React UI draws `fold()` as a part that opens and shuts.
   */
  | { blocks: Block[]; when?: Condition }
  /**
   * A decision: the flow waits here until the player picks one of `choices`.
   * The pick's `then` comes next, then the blocks after the decision.
   */
  | { decide: string; choices: FlowChoice[]; when?: Condition }
  /** A place in the flow that a choice's `{ point }` effect jumps to: anywhere in the body, a section or a choice's `then` included. */
  | { point: string; when?: undefined }
  /** A minigame played where it stands: the flow waits until it ends. */
  | { minigame: string; when?: Condition }
  /** A panel opened where it stands, with what it needs: the flow waits until it is closed. */
  | { panel: string; with?: PluginArgs; when?: Condition }
) & {
  /**
   * Presentation hints for the UI, carried on the first beat the block makes
   * (on every beat, for a section) and given no meaning by the engine. See `BlockUi`.
   */
  ui?: Ui<BlockUi>
}

/**
 * A choice in a scene: a `ButtonDef`, sent as `{ type: 'choose', id }`. Its
 * id is unique within the scene, and `state.chosen` counts it as
 * `<scene>#<id>`.
 *
 * A once-a-turn choice stays on screen once it has landed this turn, with
 * its `once.reason`, and pays nothing more, which is how the caps read as
 * character rather than vanishing.
 */
export type Choice = ButtonDef & {
  once?: {
    per: 'turn'
    reason: string
    /**
     * The kv key a save from before version 18 kept this cap under, without
     * its `turn:` prefix, when it wasn't `scene#choice`. Loading such a save
     * carries a cap it set this turn over to the choice.
     */
    key?: string
  }
}

/** A choice at a decision: a `Choice`, and what the flow shows once it is picked, before carrying on. */
export type FlowChoice = Choice & {
  /** Shown once it is picked, then the flow carries on after the decision, or from the point its `{ point }` effect names. */
  then?: Block[]
}

export type DataScene = StoryletFields &
  MinigameSceneFields & {
    id: string
    title?: string
    speaker?: string
    /** Words the UI can style the scene by: `['letter']`, `['flashback']`. The engine gives them no meaning. */
    tags?: string[]
    /**
     * A panel open for as long as the scene is: `{ panel: 'counter', with: { vendor: 'cafe' } }`.
     * It is `view.panel`, as one the `panel` effect opens is, with the scene's
     * id in `scene`. A panel needing worked-out data reads it from the view or
     * a value. See `ScenePanel`.
     */
    panel?: ScenePanel
    /** What plays on background channels while the scene is open, by channel: `{ ambience: 'rain' }`. Null silences one. */
    audio?: Record<string, string | null>
    /** A layered picture with hotspots, drawn as the scene's stage. See `view.scene.stage`. */
    stage?: MediaStage
    /** Presentation hints for the UI, carried to `view.scene.ui` as written. See `SceneUi`. */
    ui?: Ui<SceneUi>
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
  draw: (state: GameState, name: string, members: string[]) => { id: string; remember: Effect }
}

export type SceneRuntime = {
  prose: Prose
  game: Game
  /** Whether a once-a-turn line has already landed this turn. */
  spent: (state: GameState, scene: string, choice: string) => boolean
  /**
   * What to record when one is taken, besides the choice being counted in
   * `state.chosen`. The default runtime records nothing more: `spent` reads
   * the choice's last turn there.
   */
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
export function variantMembers(scene: DataScene, variants: string, runtime: SceneRuntime): string[] {
  const declared = new Set(everyBlock(scene.body).flatMap(({ block }) => ('text' in block ? [block.text] : [])))
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
  if ('words' in block) return { text: fillTokens(block.words, state, runtime.game) }
  if (!('variants' in block)) return {}
  const members = variantMembers(scene, block.variants, runtime).filter((key) => holds(state, block.gate?.[key], runtime.game))
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

/** A data scene as its render gives it: its view, its body as parts, and where its flow stands, for the screen. Internal. */
export type RenderedScene = SceneView & {
  parts: BodyPart[]
  /** Where the flow stopped: at a decision (its choices are offered), waiting on a minigame or a panel, or at the end (the ending choices). */
  stop: FlowStop['at']
  /** The part the flow's last step brought first, from the pick's `chose` on; 0 when the visit has taken none. */
  fresh: number
  /** The words of every choice picked on the way, for inline markup that names one. */
  picked: Record<string, string>
}

/**
 * Turn a scene and a state into what the player sees: its body walked as a
 * flow along the visit's path (`state.flow`), each block whose `when` holds
 * kept in order as a part of the body, a `chose` beat at each past pick, up
 * to the first decision with no pick for it yet. The choices are that
 * decision's, or the ending choices once the flow is done. New pool picks
 * are written into `picks` when it is given. Internal: plugins draw blocks
 * with `context.beats`.
 */
export function renderScene(scene: DataScene, state: GameState, runtime: SceneRuntime, picks?: Record<string, string>): RenderedScene {
  const parts: BodyPart[] = []
  const media: SceneMedia[] = []
  const remember: Effect[] = []
  /** Every block this render used, in order. Later ones win a label. */
  const drawn: string[] = []
  const picked: Record<string, string> = {}
  let fresh = 0
  const game = runtime.game
  const path = state.flow?.scene === scene.id ? state.flow.path : []

  const content = ({ block, address, section }: FlowContent) => {
    const withSection = section ? { section } : {}
    if ('say' in block) {
      parts.push({ beat: { ...spokenBeat(block, state, game), ...(block.ui ? { ui: block.ui } : {}), ...withSection } })
      return
    }
    const resolved = blockText(scene, block, state, runtime)
    // A pool's pick is kept per scene and block, so the same block shows the same file every visit.
    const shown = resolved.media && resolveMedia(resolved.media, state, game, scene.id, address, featureContext(), picks)
    const pieces: string[] = []
    if (shown) {
      // In place unless it says otherwise: written as its markup, so it lands among the prose's beats.
      if (shown.at) media.push(shown)
      else pieces.push(mediaMarkup(shown))
    }
    if (resolved.text) pieces.push(resolvePoolMarkup(resolved.text, state, game, scene.id, address, featureContext(), picks))
    if (resolved.remember) remember.push(resolved.remember)
    if (resolved.also) remember.push(resolved.also)
    if (resolved.drawn) drawn.push(resolved.drawn)
    if (pieces.length) parts.push({ text: pieces.join('\n\n'), ...(block.ui ? { ui: block.ui } : {}), ...withSection })
  }
  const stop = walkFlow(scene, path, (condition) => holds(state, condition, game), {
    content,
    caughtUp: () => {
      fresh = parts.length
    },
    chose: (choice, at) => {
      const label = choiceLabel(scene, choice, drawn, state, runtime)
      picked[choice.id] = label
      parts.push({ beat: { type: 'chose', label, ...(at.section ? { section: at.section } : {}) } })
    },
  })

  const offered: readonly Choice[] = stop.at === 'decide' ? stop.choices : stop.at === 'end' ? scene.choices : []
  const choices: SceneChoice[] = []
  for (const choice of offered) {
    const visible = holds(state, choice.when, game) && !choice.blocked?.some((entry) => entry.hide && holds(state, entry.when, game))
    const already = choice.once !== undefined && runtime.spent(state, scene.id, choice.id)
    const blocked = choice.blocked?.find((entry) => holds(state, entry.when, game))
    choices.push({
      id: choice.id,
      label: choiceLabel(scene, choice, drawn, state, runtime),
      visible,
      disabled: blocked?.reason ?? (already ? choice.once?.reason : undefined),
      tags: choice.tags,
      irreversible: choice.irreversible,
      ...(choice.cost ? { cost: choice.cost } : {}),
      ...(choice.command ? { command: commandOf(choice.command) } : {}),
      ...(choice.ui ? { ui: choice.ui } : {}),
      // A once-a-turn line pays nothing the second time, but the prose and
      // the choice stay on screen: capping the payout stops a farm without
      // taking the line away, and it pays again next turn.
      effects: already
        ? buildEffects(state, game, choice.effects ?? []).filter((effect) => 'scene' in effect)
        : [...buildEffects(state, game, choice.effects ?? []), ...(choice.once ? runtime.spend(state, scene.id, choice.id) : []), ...remember],
    })
  }

  return {
    title: scene.title,
    speaker: scene.speaker,
    tags: scene.tags,
    body: parts.map(partText).filter(Boolean).join('\n\n'),
    parts,
    stop: stop.at,
    fresh,
    picked,
    media: media.length ? media : undefined,
    ...(scene.stage ? { stage: scene.stage } : {}),
    ...(scene.audio ? { audio: scene.audio } : {}),
    choices,
  }
}

/**
 * A choice's words. A reply written to answer the line she actually gave
 * beats a generic one: any block may carry its own `### Choices`; if one
 * that rendered has a label for this choice, the last of them wins. Then the
 * first `labels` entry whose `when` holds, then `label`, then the prose key
 * `<scene>#<id>`, then the id.
 */
function choiceLabel(scene: DataScene, choice: Choice, drawn: readonly string[], state: GameState, runtime: SceneRuntime): string {
  const matched = drawn
    .map((key) => runtime.prose.line(`${key}#${choice.id}`, state))
    .filter((line): line is string => line !== undefined)
    .at(-1)
  if (matched !== undefined) return matched
  const named = choice.labels?.find((entry) => holds(state, entry.when, runtime.game))?.label ?? choice.label
  return named !== undefined ? wordsOf(named, state, runtime) : (runtime.prose.line(`${scene.id}#${choice.id}`, state) ?? choice.id)
}

/** A `say` block as its beat: whose line it is, as a scene's speaker is read, and its words filled in. */
function spokenBeat(block: Extract<Block, { say: string }>, state: GameState, game: Game): Extract<SceneBeat, { type: 'say' }> {
  const found = lineSpeakers(state, game)(block.speaker)
  return {
    type: 'say',
    who: found.who,
    ...(found.speaker !== undefined ? { speaker: found.speaker } : {}),
    name: found.name,
    text: fillTokens(block.say, state, game),
    ...(block.voice !== undefined ? { voice: block.voice } : {}),
  }
}

/** A button's words: the prose line when `label` is a prose key the game has, else the words as written, tokens filled. */
function wordsOf(label: string, state: GameState, runtime: SceneRuntime): string {
  return runtime.prose.line(label, state) ?? fillTokens(label, state, runtime.game)
}

/** A part as the body's text has it: its markup, or a spoken line's words. A past pick isn't in the body. */
function partText(part: BodyPart): string {
  if ('text' in part) return part.text
  return part.beat.type === 'say' ? part.beat.text : ''
}

/**
 * Which member of a variants list this state gets. Give `weightOf` and any
 * member weighs other than 1, and each draw is a weighted pick, seeded by the
 * save, the turn and how many draws the list has had. Otherwise it rotates
 * on every use, so
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
  weightOf?: (key: string) => number | undefined,
): { id: string; remember: Effect } {
  if (members.length === 0) throw new Error(`variants "${name}" has no members`)
  const key = `variants:${name}`
  const used = Number(state.kv[key] ?? 0)
  // Weighted members are drawn at random by weight, each draw seeded by the save, the turn and the count.
  if (weightOf && members.some((member) => (weightOf(member) ?? 1) !== 1)) {
    const id = weighted(members, weightOf, 'variants', name, state.seed, state.turn, used) ?? members[0]
    return { id, remember: { kv: key, to: used + 1 } }
  }
  const offset = roll(members.length, name, state.seed, state.turn)
  const index = (((offset + used) % members.length) + members.length) % members.length
  return { id: members[index], remember: { kv: key, to: used + 1 } }
}

/**
 * How a data scene renders when the game supplies nothing else: the game's
 * prose store, the draw above, and a once-a-turn line spent while the choice
 * was last picked this turn, as `state.chosen` keeps it.
 */
export function defaultRuntime(game: Game): SceneRuntime {
  return {
    game,
    prose: {
      line: (key, state) => game.prose?.line(key, state),
      variants: (name) => game.prose?.variants(name) ?? [],
      draw: (state, name, members) => drawVariant(state, name, members, (key) => game.prose?.weight?.(name, key)),
    },
    spent: (state, scene, choice) => state.chosen?.[`${scene}#${choice}`]?.last === state.turn,
    spend: () => [],
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
    tags: scene.tags,
    panel: scene.panel,
    ...(scene.drawnFrom ? { drawnFrom: scene.drawnFrom } : {}),
    ...(scene.weight !== undefined ? { weight: scene.weight } : {}),
    ...(scene.when ? { when: scene.when } : {}),
    ...(scene.minigame !== undefined ? { minigame: scene.minigame } : {}),
    ...(scene.ui !== undefined ? { ui: scene.ui } : {}),
    // `screen` passes a context with `picks`, to collect the pool picks the render makes.
    render: (state, ctx) => renderScene(scene, state, runtime, ctx?.picks),
  }
  forGame.set(scene, done)
  return done
}

export function isDataScene(scene: Scene | DataScene): scene is DataScene {
  return 'body' in scene && Array.isArray((scene as DataScene).body)
}
