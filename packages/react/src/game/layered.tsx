import { useId, useState } from 'react'
import type { HotspotView, PictureView } from '@ifloom/engine'
import { useGame } from './context.tsx'
import { KeepPicturesOn } from './display.tsx'
import { Icon } from './icon.tsx'
import { overridable, usePart } from './overrides.tsx'
import { Picture } from './picture.tsx'
import { Video } from './video.tsx'

function HotspotImpl({ hotspot }: { hotspot: HotspotView }) {
  const { send } = useGame()
  const reasonId = useId()
  const [x, y, width, height] = hotspot.rect
  const disabled = hotspot.disabled
  const warning = disabled ? undefined : hotspot.warning
  const button = usePart(
    'hotspot',
    'absolute rounded-md outline-offset-2 hover:outline-2 hover:outline-white/70 focus-visible:outline-3 focus-visible:outline-ring aria-disabled:cursor-not-allowed aria-disabled:bg-black/25 aria-disabled:backdrop-grayscale',
  )
  const mark = usePart(
    'hotspot-warning',
    'absolute top-1 right-1 inline-flex size-6 items-center justify-center rounded-full bg-background/85 text-foreground [&_svg]:size-4',
  )
  const note = disabled ?? warning
  return (
    <button
      type="button"
      {...button}
      style={{ left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%` }}
      aria-label={hotspot.label}
      aria-disabled={disabled ? true : undefined}
      aria-describedby={note ? reasonId : undefined}
      title={note ? `${hotspot.label}: ${note}` : hotspot.label}
      data-hotspot={hotspot.id}
      onClick={() => {
        if (!disabled) send(hotspot.command)
      }}
    >
      {warning ? (
        <span {...mark}>
          <Icon name="warning" />
        </span>
      ) : null}
      {note ? (
        <span id={reasonId} className="sr-only">
          {note}
        </span>
      ) : null}
    </button>
  )
}

/**
 * One hotspot on a layered picture: a button over it, placed by its `rect` in
 * percent. Its `aria-label` is the hotspot's label. A greyed-out one stays in
 * the tab order with `aria-disabled`, gives its reason in `title` and to a
 * screen reader, and sends nothing. One with a warning shows the warning icon.
 */
export const Hotspot = overridable('Hotspot', HotspotImpl)

function LayeredPictureImpl({ picture, className }: { picture: PictureView; className?: string }) {
  const box = usePart('picture', 'relative w-full overflow-hidden rounded-xl bg-muted', className)
  const layer = usePart('picture-layer', 'absolute inset-0 size-full object-cover')
  // The first layer's own shape, once it has loaded, when the picture gives none.
  const [natural, setNatural] = useState<string | null>(null)
  const aspect = picture.aspect ?? natural ?? '16/9'
  // Its hotspots are play, so it stays drawn whatever the pictures setting says.
  return (
    <KeepPicturesOn>
      <div {...box} style={{ aspectRatio: aspect }}>
        {picture.layers.map((entry, index) => {
          const key = `${index}:${entry.src}`
          const measure = index === 0 && !picture.aspect
          if (entry.video) {
            return (
              <Video
                key={key}
                {...layer}
                data-layer={entry.id ?? undefined}
                src={entry.src}
                {...entry.video}
                onLoadedMetadata={
                  measure
                    ? (event) => {
                        const { videoWidth, videoHeight } = event.currentTarget
                        if (videoWidth && videoHeight) setNatural(`${videoWidth}/${videoHeight}`)
                      }
                    : undefined
                }
              />
            )
          }
          return (
            <Picture
              key={key}
              {...layer}
              data-layer={entry.id ?? undefined}
              src={entry.src}
              alt=""
              onLoad={
                measure
                  ? (event) => {
                      const { naturalWidth, naturalHeight } = event.currentTarget
                      if (naturalWidth && naturalHeight) setNatural(`${naturalWidth}/${naturalHeight}`)
                    }
                  : undefined
              }
            />
          )
        })}
        {picture.hotspots.map((hotspot) => (
          <Hotspot key={hotspot.id} hotspot={hotspot} />
        ))}
      </div>
    </KeepPicturesOn>
  )
}

/**
 * A layered picture with hotspots: `view.scene.picture`, or a place's
 * `location.picture`. The layers are stacked bottom first, each filling a box
 * whose shape is the picture's `aspect`, else the first layer's own, else 16/9.
 * Pictures go through `Picture` and videos through `Video`. It's drawn even
 * while the game's pictures setting is off, since its hotspots are play.
 */
export const LayeredPicture = overridable('LayeredPicture', LayeredPictureImpl)
