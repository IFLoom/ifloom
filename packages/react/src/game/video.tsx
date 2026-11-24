import { useEffect, useRef, useState, type ComponentProps } from 'react'
import type { SettingView } from '@ifloom/engine'
import { assetUrl } from './assets.ts'
import { useGame } from './context.tsx'
import { usePicturesShown } from './display.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useSetting } from './pages.tsx'

export type VideoProps = Omit<ComponentProps<'video'>, 'src' | 'poster' | 'autoPlay' | 'loop' | 'muted' | 'controls'> & {
  /** The file, through `artSrc`. */
  src: string
  /** A picture to show before it plays. */
  poster?: string
  /** What the clip shows, for a screen reader. */
  alt?: string
  /** Start playing as soon as it's shown. */
  autoplay: boolean
  /** Play it again when it ends. */
  loop: boolean
  /** False asks for sound, which then follows the game's audio settings. */
  muted: boolean
  /** Show the browser's play, pause and volume controls. */
  controls: boolean
}

/** A range setting's value as 0 to 1 from its min to its max, as the audio player reads it. */
function rangeGain(setting: SettingView | undefined, value: unknown): number {
  if (setting?.type !== 'range') return 1
  const min = setting.min ?? 0
  const max = setting.max ?? 1
  const at = typeof value === 'number' ? value : Number(setting.default)
  return max > min ? Math.min(1, Math.max(0, (at - min) / (max - min))) : 1
}

/**
 * How loud a video with sound plays: silent while the game's mute setting is
 * on or its sound setting off, else at the volume setting of the `video` channel, or of `sfx` when the
 * game has no `video` channel. Full volume when the game has neither.
 */
function useVideoSound(): { muted: boolean; volume: number } {
  const { view } = useGame()
  const audio = view.audio
  const volumeId = (audio.channels.video ?? audio.channels.sfx)?.volumeSetting ?? ''
  const mute = useSetting(audio.muteSetting ?? '')
  const sound = useSetting(audio.soundSetting ?? '')
  const volume = useSetting(volumeId)
  return {
    muted: mute === true || (audio.soundSetting !== null && sound === false),
    volume: rangeGain(
      view.settings.find((entry) => entry.id === volumeId),
      volume,
    ),
  }
}

/** Start a video, quietly: a browser may refuse, and jsdom has no player at all. */
function play(element: HTMLVideoElement): void {
  try {
    const started = element.play() as Promise<void> | undefined
    started?.catch(() => {})
  } catch {
    // Nothing to play it with.
  }
}

function VideoImpl({ src, poster, alt, autoplay, loop, muted, controls, className, ...rest }: VideoProps) {
  const part = usePart('video', 'block max-w-full', className)
  const ref = useRef<HTMLVideoElement>(null)
  const sound = useVideoSound()
  const shown = usePicturesShown()
  const silent = muted || sound.muted
  // Without an IntersectionObserver (jsdom, an old browser), it is treated as on screen from the start.
  const watching = typeof IntersectionObserver !== 'undefined'
  const [seen, setSeen] = useState(!watching)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (!watching) {
      if (autoplay) play(element)
      return
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setSeen(true)
          if (autoplay) play(element)
        } else if (!element.paused) element.pause()
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [autoplay, watching, src])

  // React sets `muted` as a property only after the first render, so it is kept in step here.
  useEffect(() => {
    const element = ref.current
    if (!element) return
    element.muted = silent
    if (!muted) element.volume = sound.volume
  }, [silent, muted, sound.volume])

  // The pictures setting off leaves videos out, as it does pictures.
  if (!shown) return null
  return (
    <video
      ref={ref}
      {...part}
      {...rest}
      src={assetUrl(src)}
      poster={poster ? assetUrl(poster) : undefined}
      aria-label={alt || undefined}
      playsInline
      loop={loop}
      muted={silent}
      controls={controls}
      autoPlay={!watching && autoplay}
      preload={seen ? (autoplay ? 'auto' : 'metadata') : 'none'}
    />
  )
}

/**
 * A video clip, from a `video` beat, a layered picture's layer or a post. It plays inline
 * and, by default, like a GIF: by itself, looping and muted. It loads nothing
 * until it scrolls into view (`preload="none"`), starts when it does, and
 * pauses when it scrolls out again. A clip with sound follows the game's audio
 * settings: muted while the mute setting is on, at the `video` channel's
 * volume setting, else the `sfx` channel's.
 */
export const Video = overridable('Video', VideoImpl)
