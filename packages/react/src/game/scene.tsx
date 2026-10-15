import { useState, type ReactNode } from 'react'
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
import { useWords } from './words.ts'

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
      return <p {...text} data-beat="text">{beat.text}</p>
    case 'mono':
      return <p {...mono} data-beat="mono">{beat.text}</p>
    case 'say':
      return (
        <p {...say} data-beat="say" data-who={beat.who}>
          {beat.text}
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
  }
}

/**
 * One beat of a scene's body: narration, a spoken line, a picture, a video, a
 * letter, a sign. A sound beat draws nothing, and a spoken line with a voice
 * gets a button to hear it again while the game's sound is playing. A picture
 * or a clip opens in the `MediaViewer` when clicked, unless the viewer is off.
 * Each carries `data-beat` with its kind, and `data-part="beat"`, except a
 * video, which is a `"video"` part. Replace it in `components` to draw some
 * kinds your own way and hand the rest to `Default`.
 */
export const Beat = overridable('Beat', BeatImpl)

function SceneStageImpl({ className }: { className?: string }) {
  const { view, panels } = useGame()
  const scene = view.scene
  const Panel = scene.panel ? panels[scene.panel] : undefined
  const article = usePart('scene', 'flex flex-col gap-4', className)
  const header = usePart('scene-header', 'flex items-center gap-3')
  const portrait = usePart('scene-portrait', 'size-12 rounded-full object-cover')
  const title = usePart('scene-title', 'font-heading text-scene-title font-semibold')
  const image = usePart('stage-image', 'mx-auto max-h-80 w-auto max-w-full rounded-xl object-contain')
  const beats = usePart('beats', 'flex flex-col gap-(--gap-beats)')
  return (
    <article {...article} data-scene={scene.id ?? 'stage'}>
      <header {...header}>
        {scene.speaker?.portrait ? <Picture {...portrait} src={scene.speaker.portrait} alt="" /> : null}
        <h2 {...title}>{scene.title}</h2>
      </header>
      {scene.stage?.layers.length ? <Stage stage={scene.stage} /> : scene.stageImage ? <Picture {...image} src={scene.stageImage} alt="" /> : null}
      <div {...beats}>
        {scene.beats.map((beat, index) => (
          <Beat key={index} beat={beat} />
        ))}
      </div>
      {Panel ? <Panel data={scene.panelData} /> : <ChoiceList choices={scene.choices} />}
    </article>
  )
}

/**
 * The main panel: the scene on screen, or the room when none is. Its stage (the
 * layered `Stage` when the scene has one, else its `stageImage`), its body, then
 * either the game's own panel for it or its choices.
 */
export const SceneStage = overridable('SceneStage', SceneStageImpl)
