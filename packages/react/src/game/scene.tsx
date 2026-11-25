import { Fragment, useState, type CSSProperties, type ReactNode } from 'react'
import { audioSrc, type SceneBeat, type View } from '@ifloom/engine'
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
import { revealStyle, SceneFrame } from './motion.tsx'
import { useScene, type RevealBeat, type SceneTiming } from './timing.ts'
import { DiceOverlay, DiceRoll } from './dice.tsx'
import { Countdown } from './timers.tsx'
import { InputList } from './inputs.tsx'
import { usePanel } from './panels.tsx'

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

/** The picture beside a spoken line, left out when its file is missing, as a story picture is. */
function LinePortrait({ src }: { src: string }) {
  const portrait = usePart('line-portrait', 'mt-1 size-10 shrink-0 rounded-full object-cover')
  const [missing, setMissing] = useState<string | null>(null)
  if (missing === src) return null
  return <Picture {...portrait} src={src} alt="" onError={() => setMissing(src)} />
}

/** Whether spoken lines show their speakers' pictures: the scene's `ui.portraits`, else the game's, else yes. */
function usePortraits(): boolean {
  const { runner, snapshot } = useGame()
  return snapshot.view.scene.ui?.portraits ?? runner.game.ui?.portraits ?? true
}

function BeatImpl({ beat }: { beat: SceneBeat }) {
  const text = usePart('beat', 'leading-prose')
  const say = usePart('beat', beat.type === 'say' && beat.who === 'player' ? 'leading-prose pl-6 text-player-speech' : 'leading-prose text-speech')
  const speaker = usePart('speaker-name', 'block text-xs font-semibold tracking-wide uppercase opacity-75')
  const line = usePart('line', 'flex items-start gap-3')
  const portraits = usePortraits()
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
    case 'say': {
      const words = (
        <p {...say} data-beat="say" data-who={beat.who}>
          {/* Who says it, over the words. A quote that answers the line before names no one, and shows no name. */}
          {beat.name ? <span {...speaker}>{beat.name}</span> : null}
          {beat.spans ? <InlineSpans spans={beat.spans} /> : beat.text}
          {beat.voice ? <VoiceReplay voice={beat.voice} /> : null}
        </p>
      )
      // The speaker's picture beside the words, when they have one and the scene or game doesn't turn it off.
      if (!beat.image || !portraits) return words
      return (
        <div {...line} data-who={beat.who}>
          <LinePortrait src={beat.image} />
          {words}
        </div>
      )
    }
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

type Indexed = RevealBeat
/** A run of beats from one section with ui hints: the section's hints, and its beats in order. */
type Grouped = { section: NonNullable<SceneBeat['section']>; beats: Indexed[] }

/** Whether a section carries any ui hint, so its beats are drawn as a group. */
function hinted(section: SceneBeat['section']): section is NonNullable<SceneBeat['section']> {
  return section !== undefined && section !== null && Object.keys(section).length > 0
}

/**
 * Beats in runs: each beat of a section with ui hints gathered with the ones
 * after it from the same section, so the section is drawn as one `group`.
 */
function grouped(beats: readonly Indexed[]): (Grouped | Indexed)[] {
  const out: (Grouped | Indexed)[] = []
  for (const entry of beats) {
    const section = entry.beat.section
    const last = out.at(-1)
    if (!hinted(section)) out.push(entry)
    else if (last && 'section' in last && last.section === section) last.beats.push(entry)
    else out.push({ section, beats: [entry] })
  }
  return out
}

/**
 * A section's hints that are a string, a number or true/false, as `data-<hint>` attributes: `{ card: 'result' }` is
 * `data-card="result"`.
 */
function hintAttributes(section: NonNullable<SceneBeat['section']>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(section)) {
    if (!/^[a-z][\w-]*$/i.test(name)) continue
    const attribute = `data-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
    if (typeof value === 'string' || typeof value === 'number') out[attribute] = String(value)
    else if (value === true) out[attribute] = ''
    else if (value === false) out[attribute] = 'false'
  }
  return out
}

function BeatGroupImpl({ section, children }: { section: NonNullable<SceneBeat['section']>; children: ReactNode }) {
  const group = usePart('group', 'flex flex-col gap-(--gap-beats)')
  return (
    <div {...group} {...hintAttributes(section)}>
      {children}
    </div>
  )
}

function FoldImpl({ label, children }: { label: string; children: ReactNode }) {
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
 * Renders the beats of a body section with ui hints in one `group` part, so a game styles the section as one box.
 * `section` is the section's hints, and `children` its beats.
 *
 * Each hint that's a string, a number or true/false becomes a `data-*` attribute, so `{ card: 'result' }` is
 * `data-card="result"`. Replace it in `components` to render a section your own way, and the beats in it still come in
 * on time.
 */
export const BeatGroup = overridable('BeatGroup', BeatGroupImpl)

/**
 * Renders a fold, a body section with a `ui.fold` hint that `fold()` writes, as a `<details>` the player opens and
 * shuts. It starts shut, inside its `BeatGroup`.
 *
 * The `fold` part holds `label`, the hint's words, in a `fold-summary` part and the beats (`children`) in `fold-beats`.
 * Replace it in `components` to render a fold your own way.
 */
export const Fold = overridable('Fold', FoldImpl)

/**
 * Renders one beat of a scene's body, such as a paragraph, a spoken line or a picture. It's a `beat` part with
 * `data-beat` naming its type, or a `video` part for a video.
 *
 * A past choice (`chose`) shows its label, small and set in. A picture whose block has `ui.tilt` sits at a slight
 * angle, and a picture or a clip opens in the `MediaViewer` when clicked, unless the viewer is off. A sound beat
 * renders nothing, and a spoken line with a voice gets a button to hear it again while the game's sound plays. Inline
 * actions and tooltips render as `InlineAction` and `Tip` buttons in the line, and letters, notes and signs are UI
 * pieces (`InlineMail`, `InlineProp`, `InlineMono`). Replace it in `components` to render some beats your own way and
 * pass the rest to `Default`.
 */
export const Beat = overridable('Beat', BeatImpl)

/**
 * The minigame being played: the panel of its id if anything renders one (the game's, a plugin UI's), else
 * `MinigameCard`. Its clock runs while it's here.
 */
function MinigameSlot() {
  const { minigame } = useMinigame()
  const Panel = usePanel(minigame?.id)?.component
  if (!minigame) return null
  return Panel ? <Panel data={minigame} /> : <MinigameCard />
}

/**
 * A scene's beats, run by run as `useScene` times them: those shown with the
 * screen, then each run that waits for a reveal in a `reveal` part
 * (`data-reveal` names how it comes in, `--ifloom-reveal-at` when). A run
 * that waits for dice gets their `DiceRoll` before it; a beat naming a roll
 * that isn't new gets it drawn settled. A block with a `ui.timer` hint gets
 * that timer's `Countdown` after it, while the timer runs. With motion off,
 * the runs are drawn but wait for nothing.
 */
function Beats({ timing }: { timing: SceneTiming }) {
  const list = usePart('beats', cn(PROSE, 'flex flex-col gap-(--gap-beats)'))
  const group = usePart('reveal', 'flex flex-col gap-(--gap-beats)')
  const { motion, groups, revealed, rolls } = timing
  const beat = ({ beat: entry, index, roll }: Indexed) => {
    const timer = entry.ui?.timer
    return roll || typeof timer === 'string' ? (
      <Fragment key={index}>
        {roll ? <DiceRoll roll={roll} animate={false} /> : null}
        <Beat beat={entry} />
        {typeof timer === 'string' ? <Countdown timer={timer} /> : null}
      </Fragment>
    ) : (
      <Beat key={index} beat={entry} />
    )
  }
  // A run's beats, each hinted section's gathered into a group, and a fold's inside its group.
  const runs = (beats: Indexed[]) =>
    grouped(beats).map((run) => {
      if (!('section' in run)) return beat(run)
      const inner = run.beats.map(beat)
      const fold = run.section.fold
      return (
        <BeatGroup key={`group-${run.beats[0].index}`} section={run.section}>
          {typeof fold === 'string' ? <Fold label={fold}>{inner}</Fold> : inner}
        </BeatGroup>
      )
    })
  return (
    <div {...list}>
      {groups.map((entry, at) =>
        entry.reveal ? (
          <Fragment key={`reveal-${at}-${entry.dice ? rolls.at : 0}`}>
            {entry.dice ? <DiceRoll roll={entry.dice} animate={motion && !revealed} /> : null}
            <div {...group} data-reveal={motion ? entry.reveal.as : undefined} style={motion ? revealStyle(entry.reveal.at) : undefined}>
              {runs(entry.beats)}
            </div>
          </Fragment>
        ) : (
          runs(entry.beats)
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

function SceneHeaderImpl({ scene }: { scene: View['scene'] }) {
  const header = usePart('scene-header', cn(PROSE, 'flex items-center gap-3'))
  const portrait = usePart('scene-portrait', 'size-12 rounded-full object-cover')
  const title = usePart('scene-title', 'font-heading text-scene-title font-semibold')
  return (
    <header {...header}>
      {scene.speaker?.image ? <Picture {...portrait} src={scene.speaker.image} alt="" /> : null}
      <h2 {...title}>{scene.title}</h2>
    </header>
  )
}

/**
 * Renders the scene's heading from `view.scene`, passed as `scene`, in a `scene-header` part. It holds the speaker's
 * portrait (`scene-portrait`) when the speaker has a picture, and the title (`scene-title`).
 *
 * Replace it in `components` to render the heading your own way, and it still comes in with the scene.
 */
export const SceneHeader = overridable('SceneHeader', SceneHeaderImpl)

/** One scene, drawn once per `view.scene.key`: it comes in by `data-transition-in`, and its reveals run from then. */
function SceneArticle({ className, timing }: { className?: string; timing: SceneTiming }) {
  const { view, motion, transition, last, pending, revealed, skip } = timing
  const scene = view.scene
  // A panel the open scene holds is drawn in place of its choices, found as the PanelHost finds one the `panel` effect opened.
  const held = view.panel?.scene !== undefined ? view.panel : null
  const Panel = usePanel(held?.panel)?.component
  const article = usePart('scene', 'flex flex-col gap-4', className)
  const image = usePart('scene-image', 'mx-auto max-h-80 w-auto max-w-full rounded-xl object-contain')
  const choicesGroup = usePart('reveal', 'flex flex-col gap-4')
  const entering = motion ? transition.in : undefined
  const hue = speakerHue(view)
  if (view.minigame) {
    return (
      <article {...article} data-scene={scene.id ?? 'room'} data-minigame={view.minigame.id} data-transition-in={entering}>
        <MinigameSlot />
      </article>
    )
  }
  // The inputs the scene waits on come after its words, before its choices.
  const asked = scene.id ? <InputList inputs={view.inputs} /> : null
  const choices = (
    <>
      {asked}
      {Panel && held ? <Panel data={held.with} /> : <ChoiceList choices={scene.choices} />}
    </>
  )
  return (
    <article
      {...article}
      data-scene={scene.id ?? 'room'}
      data-transition-in={entering}
      data-revealed={last > 0 && (revealed || !motion) ? '' : undefined}
      data-speaker-hue={hue ? '' : undefined}
      style={hue}
      onClick={pending ? skip : undefined}
    >
      <SceneHeader scene={scene} />
      {scene.picture?.layers.length ? <LayeredPicture picture={scene.picture} /> : scene.image ? <Picture {...image} src={scene.image} alt="" /> : null}
      <Beats timing={timing} />
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

function SceneImpl({ className }: { className?: string }) {
  const timing = useScene()
  const frame = usePart('scene-transition', '')
  const { transition, motion, leave, unnamed, rolls } = timing
  return (
    <>
      <SceneFrame transitionKey={transition.key} out={transition.out} ms={transition.ms} leave={leave} motion={motion} attrs={frame}>
        <SceneArticle key={transition.key} className={className} timing={timing} />
      </SceneFrame>
      {/* New rolls no block on screen names show for a moment over the scene. */}
      {unnamed.length ? <DiceOverlay key={rolls.at} rolls={unnamed} /> : null}
    </>
  )
}

/**
 * Renders `view.scene`, the open scene or the room, with its picture, body and choices. While a minigame runs it
 * renders the panel named by the minigame's id, else `MinigameCard`.
 *
 * A panel the open scene holds renders in place of its choices.
 * The picture is the scene's `LayeredPicture` when it has one, else its `image`. When `view.scene.key` changes it plays
 * the `ui.transition` hints in a `scene-transition` part, which keeps a copy of the scene before for its `out`. It
 * reveals each block with a `ui.reveal` hint in a `reveal` part, with the choices after the last, and a click or key
 * press shows the rest at once. The `motion` option or the player's reduced-motion setting turns this off. A speaker
 * with a `ui.hue` gets their lines in that colour. `useScene` sets the timing, and `SceneHeader` renders the heading.
 *
 * A block with a `ui.dice` hint gets the `DiceRoll` of the last command's roll under that key, rendered before it, and
 * a new roll's block waits for its dice to settle. New rolls that no block names show for a moment in a `DiceOverlay`.
 * A block with a `ui.timer` hint gets a `Countdown` of that timer after it, while the timer runs.
 *
 * The beats of a body section with any ui hint render together in a `BeatGroup`, and a section with a `ui.fold` hint
 * has its beats in a `Fold` inside its group. Replace either, or `SceneHeader`, in `components` to restyle that part
 * and keep the motion.
 *
 * The inputs on offer while the scene is open (`view.inputs`) render after its body and before its choices, as
 * `InputField`s in an `inputs` part. The layout's `InputFields` renders only those on offer while no scene is open.
 */
export const Scene = overridable('Scene', SceneImpl)
