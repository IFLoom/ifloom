import { holds, type Condition } from './condition.ts'
import type { ButtonDef, Game, MinigameSceneFields, Once, SceneChoice, SceneMedia, StoryletFields } from './game.ts'
import { onceSpent } from './features/actions.ts'
import { reasonOf } from './strings.ts'
import { draw, weighted } from './random.ts'
import { mediaMarkup, resolveMedia, resolvePoolMarkup, type PictureDef } from './features/media.ts'
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
 * One entry of a scene's body, told apart by its key, such as `{ text }`, `{ say }` or `{ decide }`. A block with a
 * `when` is left out while it fails.
 *
 * The body is composed from blocks rather than read whole from one prose key. So a conditional line is one more
 * block, and each block's words mean one thing.
 */
export type Block =
  /**
   * Words in place, one paragraph or several, written by `text()` and read as prose is. `id` keys it in a translation's
   * words table as `scene.<scene>.text.<id>`.
   *
   * Without an `id`, a short hash of its words keys it.
   */
  (
    | { text: string; id?: string; when?: Condition }
    /** A prose key's line from the game's `prose`, for a line several scenes share or one kept apart from the scene. */
    | { prose: string; when?: Condition }
    | {
        /** The block's variants list, which draws one member's line. */
        variants: string
        /** The block's condition, which leaves it out while it fails. */
        when?: Condition
        /**
         * The block's conditions on single members, by prose key. A member whose condition fails is left out of the
         * draw, so a list can hold a line that needs a condition without splitting it in two.
         */
        gate?: Record<string, Condition>
        /**
         * The block's picture lists, by member. When that member is drawn, a line from the named variants list is drawn
         * too and shown before it, so a rotating line keeps its paired picture.
         */
        image?: Record<string, string>
      }
    /** A picture or a video. Without `at`, it sits here in the body, in order with the prose, as its markup would. */
    | { media: SceneMedia; when?: Condition }
    /**
     * A spoken line, written by `say()`, under the id of its `speaker` as `@id: "…"` names one in prose. The speaker is
     * an entity by reference or bare id, `'you'` for whoever the player is playing, or `'player'`.
     *
     * `voice` is the track of the line read aloud, and `id` keys it in a translation's words table as a `{ text }`
     * block's does.
     */
    | { say: string; speaker: string; voice?: string; id?: string; when?: Condition }
    /**
     * A section, blocks shown together while `when` holds. Its `ui` hints go on every beat it makes, as `section`, so a
     * UI can render it as one, as the React UI renders `fold()` as a part that opens and shuts.
     */
    | { blocks: Block[]; when?: Condition }
    /**
     * A block, written by `cases()`, that shows only the first entry of `cases` whose own `when` holds or that has none.
     * A last entry with no `when` is the fallback.
     */
    | { cases: Block[]; when?: Condition }
    /**
     * A decision, where the flow waits until the player chooses one of `choices`. The choice's `then` comes next, then
     * the blocks after the decision.
     */
    | { decide: string; choices: FlowChoice[]; when?: Condition }
    /** A point, a place in the flow a choice's `{ point }` effect jumps to, anywhere in the body, a section or a choice's `then`. */
    | { point: string; when?: undefined }
    /** A minigame played at this place in the flow, which waits until it ends. */
    | { minigame: string; when?: Condition }
    /** A panel opened at this place in the flow with its `with` arguments. The flow waits until it is closed. */
    | { panel: string; with?: PluginArgs; when?: Condition }
  ) & {
    /**
     * The block's ui hints, carried on the first beat it makes, or on every beat for a section. The engine gives them
     * no meaning. See `BlockUi`.
     */
    ui?: Ui<BlockUi>
  }

/**
 * A choice a scene declares in its `choices` or a decision, with the fields of a `ButtonDef`. The player sends it as
 * `{ type: 'choose', id }`, and `state.chosen` counts it as `<scene>#<id>`.
 *
 * A spent `once` choice stays on screen with its `once.reason` and pays nothing more.
 */
export type Choice = ButtonDef & {
  /** The choice's limit of once a game or once a turn. See `Once`. */
  once?: Once
}

/** A choice at a decision, a `Choice` with the blocks the flow shows once the player chooses it. */
export type FlowChoice = Choice & {
  /** The blocks shown once the choice is chosen. The flow then carries on after the decision, or from its `{ point }` effect's point. */
  then?: Block[]
}

/** A scene the game declares in `scenes`, with its body and its choices. Its id is unique across the game. */
export type DataScene = StoryletFields &
  MinigameSceneFields & {
    /** The scene's id, unique across the game, such as `'cafe.counter'`. */
    id: string
    /** The scene's title, in `view.scene.title`. The room's title, else the game's, if left out. */
    title?: string
    /** The scene's speaker, by entity id or reference (`'ava'`, `'character:ava'`), in `view.scene.speaker` and `view.scene.image`. */
    speaker?: string
    /** The tags a UI can style the scene by, such as `['letter']` or `['flashback']`. The engine gives them no meaning. */
    tags?: string[]
    /**
     * The panel held open for as long as the scene is, such as `{ panel: 'counter', with: { vendor: 'cafe' } }`. It is
     * `view.panel`, as one the `panel` effect opens is, with the scene's id in `scene`. See `ScenePanel`.
     */
    panel?: ScenePanel
    /** The tracks that play on background channels while the scene is open, by channel, such as `{ ambience: 'rain' }`. Null silences one. */
    audio?: Record<string, string | null>
    /** The scene's layered picture with hotspots, in `view.scene.picture`. See `PictureDef`. */
    picture?: PictureDef
    /** The scene's ui hints, carried to `view.scene.ui`. See `SceneUi`. */
    ui?: Ui<SceneUi>
    /** The scene's body, its blocks from top to bottom. See `Block`. */
    body: Block[]
    /** The scene's ending choices, offered under the body once the flow ends. A flowing scene's other choices are in its decisions. */
    choices: Choice[]
  }

/** The functions a scene reads its prose keys and variants through. `defaultRuntime` makes it from the game's prose store. */
export type Prose = {
  /** Returns a prose key's line filled for `state`, or undefined when there is none. */
  line: (key: string, state?: GameState) => string | undefined
  /** Returns a variants list's members, in declaration order. */
  variants: (name: string) => string[]
  /** Returns the member of a variants list this state draws, with the effect that records the draw. */
  draw: (state: GameState, name: string, members: string[]) => { id: string; remember: Effect }
}

/** The prose and game a scene is rendered with. */
export type SceneRuntime = {
  /** The runtime's prose functions. */
  prose: Prose
  /** The loaded game. */
  game: Game
}

/**
 * Returns the members of a variants list a scene can draw, leaving out keys with no line and keys the scene uses as
 * its own `{ prose }` blocks.
 *
 * So a narrator's aside the scene shows itself is never drawn as one of the list's lines.
 */
export function variantMembers(scene: DataScene, variants: string, runtime: SceneRuntime): string[] {
  const declared = new Set(everyBlock(scene.body).flatMap(({ block }) => ('prose' in block ? [block.prose] : [])))
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
  if ('prose' in block) {
    return { text: runtime.prose.line(block.prose, state), drawn: block.prose }
  }
  if ('text' in block) return { text: fillTokens(state, runtime.game, block.text) }
  if (!('variants' in block)) return {}
  const members = variantMembers(scene, block.variants, runtime).filter((key) => holds(state, runtime.game, block.gate?.[key]))
  if (members.length === 0) return {}
  const drawn = runtime.prose.draw(state, block.variants, members)
  const line = runtime.prose.line(drawn.id, state)
  const artVariants = block.image?.[drawn.id]
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

/** A scene after rendering, with its words, its body as parts, its choices and where its flow stands, for the screen. Internal. */
export type RenderedScene = {
  /** The scene's title. */
  title?: string
  /** The scene's speaker id. */
  speaker?: string
  /** The tags a UI can style the scene by. The engine gives them no meaning. */
  tags?: string[]
  /** The body's text with its markup, the parts joined. */
  body: string
  /** The media blocks that open (`lead`) or close (`end`) the scene, rather than sitting in the body. */
  media?: SceneMedia[]
  /** The scene's layered picture. */
  picture?: PictureDef
  /** The tracks that play on background channels while the scene is open, by channel. Null silences one. */
  audio?: Record<string, string | null>
  /** The choices offered now, a decision's or, once the flow ends, the ending choices. */
  choices: SceneChoice[]
  /** The body's parts in order, its text and its beats. */
  parts: BodyPart[]
  /** The flow's stop, at a decision, waiting on a minigame or a panel, or at the end. */
  stop: FlowStop['at']
  /** The index of the first part the flow's last step added, from its `chose` beat on. 0 when the visit has taken none. */
  fresh: number
  /** The labels of the choices chosen on the way, by id, for inline markup that names one. */
  picked: Record<string, string>
}

/**
 * Returns a scene rendered for this state, its body walked as a flow along the visit's path (`state.flow`). Internal,
 * since plugins render blocks with `context.beats`.
 *
 * Each block whose `when` holds becomes a part, with a `chose` beat at each past choice, up to the first decision the
 * player hasn't chosen at yet. The choices are that decision's, or the ending choices once the flow ends. New pool
 * picks go in `picks` when it is given.
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
  const stop = walkFlow(scene, path, (condition) => holds(state, game, condition), {
    content,
    caughtUp: () => {
      fresh = parts.length
    },
    chose: (choice, at) => {
      const label = choiceLabel(choice, drawn, state, runtime)
      picked[choice.id] = label
      parts.push({ beat: { type: 'chose', label, ...(at.section ? { section: at.section } : {}) } })
    },
  })

  const offered: readonly Choice[] = stop.at === 'decide' ? stop.choices : stop.at === 'end' ? scene.choices : []
  const choices: SceneChoice[] = []
  for (const choice of offered) {
    const visible = holds(state, game, choice.when) && !choice.blocked?.some((entry) => entry.hide && holds(state, game, entry.when))
    const already = onceSpent(state, `${scene.id}#${choice.id}`, choice.once)
    const blocked = choice.blocked?.find((entry) => holds(state, game, entry.when))
    choices.push({
      id: choice.id,
      label: choiceLabel(choice, drawn, state, runtime),
      visible,
      disabled: blocked ? reasonOf(game, blocked.reason) : already ? reasonOf(game, choice.once?.reason ?? { string: 'done' }) : undefined,
      tags: choice.tags,
      irreversible: choice.irreversible,
      ...(choice.cost ? { cost: choice.cost } : {}),
      ...(choice.command ? { command: commandOf(choice.command) } : {}),
      ...(choice.ui ? { ui: choice.ui } : {}),
      // A spent line pays nothing the second time, but the prose and the
      // choice stay on screen: capping the payout stops a farm without taking
      // the line away, and a once-a-turn one pays again next turn.
      effects: already
        ? buildEffects(game, choice.effects ?? []).filter((effect) => 'scene' in effect)
        : [...buildEffects(game, choice.effects ?? []), ...remember],
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
    ...(scene.picture ? { picture: scene.picture } : {}),
    ...(scene.audio ? { audio: scene.audio } : {}),
    choices,
  }
}

/**
 * A choice's words. A reply written to answer the line she actually gave
 * beats a generic one: a prose block or a variants line drawn here may have
 * a line of its own for the choice, under `<key>#<choice>`; if one that
 * rendered has, the last of them wins. Then the first `labels` entry whose
 * `when` holds, then `label`, as written with tokens filled, then the id.
 */
function choiceLabel(choice: Choice, drawn: readonly string[], state: GameState, runtime: SceneRuntime): string {
  const matched = drawn
    .map((key) => runtime.prose.line(`${key}#${choice.id}`, state))
    .filter((line): line is string => line !== undefined)
    .at(-1)
  if (matched !== undefined) return matched
  const named = choice.labels?.find((entry) => holds(state, runtime.game, entry.when))?.label ?? choice.label
  return named !== undefined ? fillTokens(state, runtime.game, named) : choice.id
}

/** A `say` block as its beat: whose line it is, as a scene's speaker is read, and its words filled in. */
function spokenBeat(block: Extract<Block, { say: string }>, state: GameState, game: Game): Extract<SceneBeat, { type: 'say' }> {
  const found = lineSpeakers(state, game)(block.speaker)
  return {
    type: 'say',
    who: found.who,
    ...(found.speaker !== undefined ? { speaker: found.speaker } : {}),
    name: found.name,
    ...(found.image !== undefined ? { image: found.image } : {}),
    text: fillTokens(state, game, block.say),
    ...(block.voice !== undefined ? { voice: block.voice } : {}),
  }
}

/** A part as the body's text has it: its markup, or a spoken line's words. A past pick isn't in the body. */
function partText(part: BodyPart): string {
  if ('text' in part) return part.text
  return part.beat.type === 'say' ? part.beat.text : ''
}

/**
 * Returns the member of a variants list this state draws, with the kv effect that counts the draw. It throws for a
 * list with no members.
 *
 * When `weightOf` gives any member a weight other than 1, each draw is a weighted pick seeded by the save, the turn and
 * the list's count of draws. Otherwise the list rotates on every use from an offset drawn each turn, so draws in one turn
 * don't repeat until every member has shown, and two playthroughs draw different lines.
 *
 * @remarks The offset and the count of uses stay separate on purpose. One sum of seed, turn and uses taken modulo the
 * list's length beats against a fixed calendar, so a list of three drawn every second and fifth turn would come back
 * to the same member week after week.
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
  const offset = draw(members.length, name, state.seed, state.turn)
  const index = (((offset + used) % members.length) + members.length) % members.length
  return { id: members[index], remember: { kv: key, to: used + 1 } }
}

/** Returns the runtime a scene renders with by default, the game's prose store and `drawVariant`. */
export function defaultRuntime(game: Game): SceneRuntime {
  return {
    game,
    prose: {
      line: (key, state) => game.prose?.line(key, state),
      variants: (name) => game.prose?.variants(name) ?? [],
      draw: (state, name, members) => drawVariant(state, name, members, (key) => game.prose?.weight?.(name, key)),
    },
  }
}
