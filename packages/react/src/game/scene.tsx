import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { audioSrc, type SceneBeat } from '@ifloom/engine'
import { cn } from '../lib/utils.ts'
import { usePlayer } from './audio.ts'
import { ChoiceList } from './choices.tsx'
import { useGame } from './context.tsx'
import { Icon } from './icon.tsx'
import { overridable, usePart, useViewerOn } from './overrides.tsx'
import { Picture } from './picture.tsx'
import { Stage } from './stage.tsx'
import { Video } from './video.tsx'
import { MediaViewer, type ViewerMedia } from './viewer.tsx'
import { MinigameCard, useMinigame } from './minigame.tsx'
import { useWords } from './words.ts'
import { InlineSpans } from './inline.tsx'
import { lastReveal, revealGroups, revealStyle, SceneFrame, useMotion, useSkipKey } from './motion.tsx'

/** A small button that plays a spoken line's voice again, when the game's sound is playing. */
function VoiceReplay({ voice }: { voice: string }) {
  const { runner } = useGame()
  const player = usePlayer(runner)
  const words = useWords()
  const button = usePart('voice-replay', 'ml-2 inline-flex size-6 items-center justify-center rounded-full align-middle text-muted-foreground hover:text-foreground [&_svg]:size-4')
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
    cn('block w-full cursor-zoom-in rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', !wide && 'max-w-sm'),
  )
  if (!on || (media.kind === 'video' && media.controls)) return <>{children}</>
  return (
    <>
      <button type="button" {...opener} aria-label={media.alt ? `${words('zoom')}: ${media.alt}` : words('zoom')} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open ? <MediaViewer media={media} open={open} onOpenChange={setOpen} /> : null}
    </>
  )
}

function ImageBeat({ beat, attrs }: { beat: Extract<SceneBeat, { kind: 'image' }>; attrs: { 'data-part': string; className: string } }) {
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
  const words = useWords()
  const text = usePart('beat', 'leading-prose')
  const mono = usePart('beat', 'font-mono text-sm leading-prose')
  const say = usePart('beat', beat.kind === 'say' && beat.who === 'player' ? 'leading-prose pl-6 text-player-speech' : 'leading-prose text-speech')
  const image = usePart('beat', cn('w-full rounded-lg', beat.kind === 'image' && beat.size === 'inline' && 'max-w-sm', beat.kind === 'image' && beat.rotate && 'rotate-1'))
  const mail = usePart('beat', 'rounded-lg border bg-card p-4 text-sm')
  const header = usePart('mail-header', 'text-muted-foreground')
  const body = usePart('mail-body', 'mt-2 whitespace-pre-wrap')
  const prop = usePart('beat', 'rounded-lg border-2 border-dashed p-4 text-center font-medium')
  switch (beat.kind) {
    case 'text':
      return <p {...text} data-beat="text">{beat.spans ? <InlineSpans spans={beat.spans} /> : beat.text}</p>
    case 'mono':
      return <p {...mono} data-beat="mono">{beat.text}</p>
    case 'say':
      return (
        <p {...say} data-beat="say" data-who={beat.who}>
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
    case 'mail':
      return (
        <div {...mail} data-beat="mail">
          {beat.headers.map((line) => (
            <p key={line.key} {...header}>
              {words('mailHeader', { key: line.key, value: line.value })}
            </p>
          ))}
          <p {...body}>{beat.body}</p>
        </div>
      )
    case 'prop':
      return (
        <div {...prop} data-beat="prop" data-face={beat.face}>
          {beat.text}
        </div>
      )
    case 'sound':
      // Heard, not seen: the audio player plays it.
      return null
    case 'reveal':
      // A marker: the scene draws the beats after it as a group that waits for it.
      return null
  }
}

/**
 * One beat of a scene's body: narration, a spoken line, a picture, a video, a
 * letter, a sign. A sound beat draws nothing, and a spoken line with a voice
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

/**
 * A scene's beats: those shown with it, then each reveal's beats in a
 * `reveal` part that waits for it (`data-reveal` names how it comes in,
 * `--ifloom-reveal-at` when). With motion off, the groups are drawn but wait
 * for nothing.
 */
function Beats({ beats, motion }: { beats: SceneBeat[]; motion: boolean }) {
  const list = usePart('beats', 'flex max-w-(--width-prose) flex-col gap-(--gap-beats)')
  const group = usePart('reveal', 'flex flex-col gap-(--gap-beats)')
  return (
    <div {...list}>
      {revealGroups(beats).map((entry, at) =>
        entry.reveal ? (
          <div key={`reveal-${at}`} {...group} data-reveal={motion ? entry.reveal.as : undefined} style={motion ? revealStyle(entry.reveal.at) : undefined}>
            {entry.beats.map(({ beat, index }) => (
              <Beat key={index} beat={beat} />
            ))}
          </div>
        ) : (
          entry.beats.map(({ beat, index }) => <Beat key={index} beat={beat} />)
        ),
      )}
    </div>
  )
}

/** One scene, drawn once per `view.transition.key`: it comes in by `data-transition-in`, and its reveals run from then. */
function SceneArticle({ className, motion }: { className?: string; motion: boolean }) {
  const { view, panels } = useGame()
  const scene = view.scene
  const Panel = scene.panel ? panels[scene.panel] : undefined
  const article = usePart('scene', 'flex flex-col gap-4', className)
  const header = usePart('scene-header', 'flex items-center gap-3')
  const portrait = usePart('scene-portrait', 'size-12 rounded-full object-cover')
  const title = usePart('scene-title', 'font-heading text-scene-title font-semibold')
  const image = usePart('stage-image', 'mx-auto max-h-80 w-auto max-w-full rounded-xl object-contain')
  const choicesGroup = usePart('reveal', '')
  // Reveals wait until the player clicks the scene or presses a key, or they have all come in.
  const last = view.minigame ? 0 : lastReveal(scene.beats)
  const [revealed, setRevealed] = useState(false)
  const pending = motion && last > 0 && !revealed
  const skip = useCallback(() => setRevealed(true), [])
  useSkipKey(pending, skip)
  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(skip, last + view.transition.ms + REVEAL_MS)
    return () => clearTimeout(timer)
  }, [pending, last, view.transition.ms, skip])
  const entering = motion ? view.transition.in : undefined
  if (view.minigame) {
    return (
      <article {...article} data-scene={scene.id ?? 'stage'} data-minigame={view.minigame.id} data-transition-in={entering}>
        <MinigameSlot />
      </article>
    )
  }
  const choices = Panel ? <Panel data={scene.panelData} /> : <ChoiceList choices={scene.choices} />
  return (
    <article
      {...article}
      data-scene={scene.id ?? 'stage'}
      data-transition-in={entering}
      data-revealed={last > 0 && (revealed || !motion) ? '' : undefined}
      onClick={pending ? skip : undefined}
    >
      <header {...header}>
        {scene.speaker?.portrait ? <Picture {...portrait} src={scene.speaker.portrait} alt="" /> : null}
        <h2 {...title}>{scene.title}</h2>
      </header>
      {scene.stage?.layers.length ? <Stage stage={scene.stage} /> : scene.stageImage ? <Picture {...image} src={scene.stageImage} alt="" /> : null}
      <Beats beats={scene.beats} motion={motion} />
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

function SceneStageImpl({ className }: { className?: string }) {
  const { view } = useGame()
  const motion = useMotion()
  const frame = usePart('scene-transition', '')
  const transition = view.transition
  return (
    <SceneFrame transitionKey={transition.key} out={transition.out} ms={transition.ms} motion={motion} attrs={frame}>
      <SceneArticle key={transition.key} className={className} motion={motion} />
    </SceneFrame>
  )
}

/**
 * The main column: the scene on screen, or the room when none is. Its stage (the
 * layered `Stage` when the scene has one, else its `stageImage`), its body, then
 * either the game's own panel for it or its choices. While a minigame runs, it
 * draws that instead: the game's panel named by the minigame's id, else
 * `MinigameCard`.
 *
 * It plays `view.transition` when the screen changes, in a `scene-transition`
 * part that keeps a copy of the scene before for its `out`, and reveals the
 * prose after each reveal beat in a `reveal` part, with the choices after the
 * last. A click on the scene or a key press shows the rest at once. The
 * `motion` option, or the player's reduced-motion setting, turns all of it off.
 */
export const SceneStage = overridable('SceneStage', SceneStageImpl)
