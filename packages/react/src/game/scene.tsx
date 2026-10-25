import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { audioSrc, type Roll, type SceneBeat, type View } from '@ifloom/engine'
import { leavingOf, offeredIn, rollFor, screenTransition, type ScreenTransition, type Transition, type TransitionName } from '../hints.ts'
import { cn, PROSE } from '../lib/utils.ts'
import { usePlayer } from './audio.ts'
import { ChoiceList } from './choices.tsx'
import { useGame } from './context.tsx'
import { Icon } from './icon.tsx'
import { overridable, usePart, useViewerOn } from './overrides.tsx'
import { Picture } from './picture.tsx'
import { LayeredPicture } from './layered.tsx'
import { Video } from './video.tsx'
import { MediaViewer, type ViewerMedia } from './viewer.tsx'
import { MinigameCard, useMinigame } from './minigame.tsx'
import { useWords } from './words.ts'
import { InlineSpans } from './inline.tsx'
import { lastReveal, revealGroups, revealStyle, SceneFrame, useMotion, useSkipKey } from './motion.tsx'
import { DiceOverlay, DiceRoll, unnamedRolls, useFreshRolls } from './dice.tsx'
import { Countdown } from './timers.tsx'

/** A small button that plays a spoken line's voice again, when the game's sound is playing. */
function VoiceReplay({ voice }: { voice: string }) {
  const { runner } = useGame()
  const player = usePlayer(runner)
  const words = useWords()
  const button = usePart(
    'voice-replay',
    'ml-2 inline-flex size-6 items-center justify-center rounded-full align-middle text-muted-foreground hover:text-foreground [&_svg]:size-4',
  )
  const tracks = runner.game.audio?.tracks
  const track = tracks && Object.hasOwn(tracks, voice) ? tracks[voice] : undefined
  if (!player || !track || 'playlist' in track) return null
  const label = words('replayVoice')
  return (
    <button {...button} type="button" title={label} onClick={() => player.play(audioSrc(track.src), 'voice', track.volume ?? 1)}>
      <Icon name="voice" label={label} />
    </button>
  )
}

/**
 * A picture or a clip in the story, as a button that opens it in the viewer
 * when the viewer is on. A clip with its own controls is left as it is: they
 * have a full-screen button of their own.
 */
function Zoomable({ media, children }: { media: ViewerMedia; children: ReactNode }) {
  const on = useViewerOn()
  const words = useWords()
  const [open, setOpen] = useState(false)
  const wide = media.size === 'wide'
  const opener = usePart(
    'viewer-open',
    cn(
      'block w-full cursor-zoom-in rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      !wide && 'max-w-sm',
    ),
  )
  if (!on || (media.type === 'video' && media.controls)) return <>{children}</>
  return (
    <>
      <button type="button" {...opener} aria-label={media.alt ? `${words('zoom')}: ${media.alt}` : words('zoom')} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open ? <MediaViewer media={media} open={open} onOpenChange={setOpen} /> : null}
    </>
  )
}

function ImageBeat({ beat, attrs }: { beat: Extract<SceneBeat, { type: 'image' }>; attrs: { 'data-part': string; className: string } }) {
  // A missing file takes no space, and leaves no empty button behind.
  const [missing, setMissing] = useState<string | null>(null)
  if (missing === beat.src) return null
  return (
    <Zoomable media={beat}>
      <Picture {...attrs} data-beat="image" src={beat.src} alt={beat.alt ?? ''} onError={() => setMissing(beat.src)} />
    </Zoomable>
  )
}

function BeatImpl({ beat }: { beat: SceneBeat }) {
  const text = usePart('beat', 'leading-prose')
  const say = usePart('beat', beat.type === 'say' && beat.who === 'player' ? 'leading-prose pl-6 text-player-speech' : 'leading-prose text-speech')
  const speaker = usePart('speaker-name', 'block text-xs font-semibold tracking-wide uppercase opacity-75')
  const chose = usePart('beat', 'leading-prose pl-6 text-sm text-muted-foreground italic')
  const image = usePart(
    'beat',
    cn('w-full rounded-lg', beat.type === 'image' && beat.size === 'inline' && 'max-w-sm', beat.type === 'image' && beat.ui?.tilt === true && 'rotate-1'),
  )
  switch (beat.type) {
    case 'text':
      return (
        <p {...text} data-beat="text">
          {beat.spans ? <InlineSpans spans={beat.spans} /> : beat.text}
        </p>
      )
    case 'say':
      return (
        <p {...say} data-beat="say" data-who={beat.who}>
          {/* Who says it, over the words. A quote that answers the line before names no one, and shows no name. */}
          {beat.name ? <span {...speaker}>{beat.name}</span> : null}
          {beat.spans ? <InlineSpans spans={beat.spans} /> : beat.text}
          {beat.voice ? <VoiceReplay voice={beat.voice} /> : null}
        </p>
      )
    case 'image':
      return <ImageBeat beat={beat} attrs={image} />
    case 'video':
      return (
        <Zoomable media={beat}>
          <Video
            className={cn('w-full rounded-lg', beat.size === 'inline' && 'max-w-sm')}
            data-beat="video"
            src={beat.src}
            poster={beat.poster}
            alt={beat.alt}
            autoplay={beat.autoplay}
            loop={beat.loop}
            muted={beat.muted}
            controls={beat.controls}
          />
        </Zoomable>
      )
    case 'sound':
      // Heard, not seen: the audio player plays it.
      return null
    case 'chose':
      return (
        <p {...chose} data-beat="chose">
          <span aria-hidden="true">› </span>
          {beat.label}
        </p>
      )
  }
}

/**
 * Beats in runs, each beat of a section with a `ui.fold` hint gathered with
 * the ones after it from the same section, so a fold draws them as one.
 */
function folded(
  beats: readonly { beat: SceneBeat; index: number }[],
): ({ fold: string; beats: { beat: SceneBeat; index: number }[] } | { beat: SceneBeat; index: number })[] {
  const out: ({ fold: string; beats: { beat: SceneBeat; index: number }[] } | { beat: SceneBeat; index: number })[] = []
  for (const entry of beats) {
    const fold = entry.beat.section?.fold
    const last = out.at(-1)
    if (typeof fold !== 'string') out.push(entry)
    else if (last && 'fold' in last && last.beats.at(-1)?.beat.section === entry.beat.section) last.beats.push(entry)
    else out.push({ fold, beats: [entry] })
  }
  return out
}

/** A section with a `ui.fold` hint: its beats in a `fold` part the player opens and shuts, under the hint's words in a `fold-summary` part. Shut to begin with. */
function Fold({ label, children }: { label: string; children: ReactNode }) {
  const fold = usePart('fold', 'rounded-lg border px-4 py-2 [&[open]>summary]:mb-2')
  const summary = usePart('fold-summary', 'cursor-pointer font-medium')
  const inner = usePart('fold-beats', 'flex flex-col gap-(--gap-beats)')
  return (
    <details {...fold}>
      <summary {...summary}>{label}</summary>
      <div {...inner}>{children}</div>
    </details>
  )
}

/**
 * One beat of a scene's body: narration, a spoken line, a picture, a video,
 * or a pick the player made earlier in a flowing scene (`chose`, its label,
 * small and set in).
 * Letters, notes and signs are inline pieces in a line (`InlineMail`,
 * `InlineProp`, `InlineMono`). A picture whose block has `ui.tilt` sits at a
 * slight angle. A sound beat draws nothing, and a spoken line with a voice
 * gets a button to hear it again while the game's sound is playing. A picture
 * or a clip opens in the `MediaViewer` when clicked, unless the viewer is off.
 * Each carries `data-beat` with its kind, and `data-part="beat"`, except a
 * video, which is a `"video"` part. A line with inline actions or tooltips
 * draws them as `InlineAction` and `Tip` buttons in the line. Replace it in `components` to draw some
 * kinds your own way and hand the rest to `Default`.
 */
export const Beat = overridable('Beat', BeatImpl)

/** The minigame being played: the game's own panel for it if `panels` has one by its id, else `MinigameCard`. Its clock runs while it's here. */
function MinigameSlot() {
  const { panels } = useGame()
  const { minigame } = useMinigame()
  if (!minigame) return null
  const Panel = panels[minigame.id]
  return Panel ? <Panel data={minigame} /> : <MinigameCard />
}

/** How long a reveal takes to come in, as `--ifloom-reveal-ms` sets it in the base styles. Only for when to stop listening for a skip. */
const REVEAL_MS = 400

/** A scene's rolls: those the last command made, and those of them that are new (`fresh`, changing `at`), which tumble and hold their block back. */
type SceneRolls = { all: readonly Roll[]; fresh: readonly Roll[]; at: number }

/**
 * A scene's beats: those shown with it, then from each beat whose block has a
 * `ui.reveal` hint, the beats to the next in a `reveal` part that waits for it
 * (`data-reveal` names how it comes in, `--ifloom-reveal-at` when). A block
 * with a `ui.dice` hint naming a roll gets that roll's `DiceRoll` before it;
 * a new roll tumbles, and its block waits in a `reveal` part until the dice
 * settle. A block with a `ui.timer` hint gets that timer's `Countdown` after
 * it, while the timer runs. With motion off, the groups are drawn but wait for nothing.
 */
function Beats({ beats, motion, rolls, skipped }: { beats: SceneBeat[]; motion: boolean; rolls: SceneRolls; skipped: boolean }) {
  const list = usePart('beats', cn(PROSE, 'flex flex-col gap-(--gap-beats)'))
  const group = usePart('reveal', 'flex flex-col gap-(--gap-beats)')
  const animate = motion && !skipped
  // A roll that isn't new is drawn settled before its block, which doesn't wait. A timer the block names comes after it.
  const beat = (entry: SceneBeat, index: number, held: boolean) => {
    const settled = held ? undefined : rollFor(entry, rolls.all)
    const timer = entry.ui?.timer
    return settled || typeof timer === 'string' ? (
      <Fragment key={index}>
        {settled ? <DiceRoll roll={settled} animate={false} /> : null}
        <Beat beat={entry} />
        {typeof timer === 'string' ? <Countdown timer={timer} /> : null}
      </Fragment>
    ) : (
      <Beat key={index} beat={entry} />
    )
  }
  // A group's beats, a fold's gathered into one. The first may wait for dice of its own.
  const runs = (beats: { beat: SceneBeat; index: number }[], diced: boolean) =>
    folded(beats).map((run, n) =>
      'fold' in run ? (
        <Fold key={`fold-${run.beats[0].index}`} label={run.fold}>
          {run.beats.map(({ beat: inner, index }, m) => beat(inner, index, diced && n === 0 && m === 0))}
        </Fold>
      ) : (
        beat(run.beat, run.index, diced && n === 0)
      ),
    )
  return (
    <div {...list}>
      {revealGroups(beats, motion ? rolls.fresh : []).map((entry, at) =>
        entry.reveal ? (
          <Fragment key={`reveal-${at}-${entry.dice ? rolls.at : 0}`}>
            {entry.dice ? <DiceRoll roll={entry.dice} animate={animate} /> : null}
            <div {...group} data-reveal={motion ? entry.reveal.as : undefined} style={motion ? revealStyle(entry.reveal.at) : undefined}>
              {runs(entry.beats, entry.dice !== undefined)}
            </div>
          </Fragment>
        ) : (
          runs(entry.beats, false)
        ),
      )}
    </div>
  )
}

/** The colour a speaker's `ui.hue` gives their lines, as the CSS variable the styles read. */
function speakerHue(view: View): CSSProperties | undefined {
  const hue = view.scene.speaker?.ui?.hue
  return typeof hue === 'number' && Number.isFinite(hue) ? ({ '--ifloom-speaker-hue': String(hue) } as CSSProperties) : undefined
}

/** One scene, drawn once per `view.scene.key`: it comes in by `data-transition-in`, and its reveals run from then. */
function SceneArticle({ className, motion, transition, rolls }: { className?: string; motion: boolean; transition: ScreenTransition; rolls: SceneRolls }) {
  const { view, panels } = useGame()
  const scene = view.scene
  // A panel the open scene holds is drawn in place of its choices; one the `panel` effect opened, by the PanelHost.
  const held = view.panel?.scene !== undefined ? view.panel : null
  const Panel = held ? panels[held.panel] : undefined
  const article = usePart('scene', 'flex flex-col gap-4', className)
  const header = usePart('scene-header', cn(PROSE, 'flex items-center gap-3'))
  const portrait = usePart('scene-portrait', 'size-12 rounded-full object-cover')
  const title = usePart('scene-title', 'font-heading text-scene-title font-semibold')
  const image = usePart('scene-image', 'mx-auto max-h-80 w-auto max-w-full rounded-xl object-contain')
  const choicesGroup = usePart('reveal', '')
  // Reveals wait until the player clicks the scene or presses a key, or they have all come in.
  const last = view.minigame ? 0 : lastReveal(scene.beats, motion ? rolls.fresh : [])
  const [revealed, setRevealed] = useState(false)
  // New rolls on the same screen hold their blocks back again.
  const [rolledAt, setRolledAt] = useState(rolls.at)
  if (rolledAt !== rolls.at) {
    setRolledAt(rolls.at)
    setRevealed(false)
  }
  const pending = motion && last > 0 && !revealed
  const skip = useCallback(() => setRevealed(true), [])
  useSkipKey(pending, skip)
  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(skip, last + transition.ms + REVEAL_MS)
    return () => clearTimeout(timer)
  }, [pending, last, transition.ms, skip])
  const entering = motion ? transition.in : undefined
  const hue = speakerHue(view)
  if (view.minigame) {
    return (
      <article {...article} data-scene={scene.id ?? 'stage'} data-minigame={view.minigame.id} data-transition-in={entering}>
        <MinigameSlot />
      </article>
    )
  }
  const choices = Panel && held ? <Panel data={held.with} /> : <ChoiceList choices={scene.choices} />
  return (
    <article
      {...article}
      data-scene={scene.id ?? 'stage'}
      data-transition-in={entering}
      data-revealed={last > 0 && (revealed || !motion) ? '' : undefined}
      data-speaker-hue={hue ? '' : undefined}
      style={hue}
      onClick={pending ? skip : undefined}
    >
      <header {...header}>
        {scene.speaker?.image ? <Picture {...portrait} src={scene.speaker.image} alt="" /> : null}
        <h2 {...title}>{scene.title}</h2>
      </header>
      {scene.picture?.layers.length ? <LayeredPicture picture={scene.picture} /> : scene.image ? <Picture {...image} src={scene.image} alt="" /> : null}
      <Beats beats={scene.beats} motion={motion} rolls={rolls} skipped={revealed} />
      {/* With reveals to come, the choices come with the last of them: not pressable, or read out, until then. */}
      {last > 0 && motion ? (
        <div {...choicesGroup} data-reveal="fade" data-reveal-choices="" style={revealStyle(last)}>
          {choices}
        </div>
      ) : (
        choices
      )}
    </article>
  )
}

type Seen = { key: string; view: View; commands: number; pressed: Transition | TransitionName | undefined }

/**
 * The `ui.transition` of the choice or button that led to this screen, if one
 * did: when the screen changes after exactly one more command, the one of the
 * screen before's choices, inline actions or buttons that sends that command.
 * Worked out while rendering, once per screen, so the copy of the screen
 * before can go out the way the choice says.
 */
function usePressed(view: View): Transition | TransitionName | undefined {
  const { runner } = useGame()
  const seen = useRef<Seen | null>(null)
  const commands = runner.log().commands
  const before = seen.current
  if (before && before.key === view.scene.key) {
    if (before.view !== view) seen.current = { ...before, view, commands: commands.length }
    return before.pressed
  }
  let pressed: Transition | TransitionName | undefined
  if (before && commands.length === before.commands + 1) {
    const sent = JSON.stringify(commands.at(-1))
    pressed = offeredIn(before.view).find((choice) => JSON.stringify(choice.command) === sent)?.ui?.transition
  }
  seen.current = { key: view.scene.key, view, commands: commands.length, pressed }
  return pressed
}

function SceneStageImpl({ className }: { className?: string }) {
  const { view, runner } = useGame()
  const motion = useMotion()
  const frame = usePart('scene-transition', '')
  const pressed = usePressed(view)
  const transition = screenTransition(view, runner.game, pressed)
  const fresh = useFreshRolls()
  const rolls = { all: view.rolls, fresh: fresh.rolls, at: fresh.at }
  // New rolls no block on screen names show for a moment over the scene.
  const unnamed = view.minigame ? [] : unnamedRolls(fresh.rolls, view.scene.beats)
  return (
    <>
      <SceneFrame transitionKey={transition.key} out={transition.out} ms={transition.ms} leave={leavingOf(pressed)} motion={motion} attrs={frame}>
        <SceneArticle key={transition.key} className={className} motion={motion} transition={transition} rolls={rolls} />
      </SceneFrame>
      {unnamed.length ? <DiceOverlay key={fresh.at} rolls={unnamed} /> : null}
    </>
  )
}

/**
 * The main column: the scene on screen, or the room when none is. Its picture (the
 * `LayeredPicture` when the scene has one, else its `image`), its body, then
 * either the game's own panel for it or its choices. While a minigame runs, it
 * draws that instead: the game's panel named by the minigame's id, else
 * `MinigameCard`.
 *
 * It plays the content's `ui.transition` hints when the screen (`view.scene.key`)
 * changes, in a `scene-transition` part that keeps a copy of the scene before
 * for its `out`, and reveals each block with a `ui.reveal` hint in a `reveal`
 * part, with the choices after the last. A click on the scene or a key press
 * shows the rest at once. The `motion` option, or the player's reduced-motion
 * setting, turns all of it off. A speaker with a `ui.hue` gets their lines in
 * that colour.
 *
 * Dice: a block with a `ui.dice` hint gets the `DiceRoll` of the roll the last
 * command made under that key, drawn before it, and a new roll's block waits
 * for its dice to settle. New rolls no block names show for a moment in a
 * `DiceOverlay`.
 *
 * Timers: a block with a `ui.timer` hint gets a `Countdown` of that timer
 * after it, while it runs.
 *
 * Folds: the beats of a section with a `ui.fold` hint (what `fold()` writes)
 * are drawn as one `fold` part, a `<details>` the player opens and shuts.
 */
export const SceneStage = overridable('SceneStage', SceneStageImpl)
