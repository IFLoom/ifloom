import { useState, type ComponentProps } from 'react'
import { assetUrl } from './assets.ts'
import { usePicturesShown } from './display.tsx'
import { overridable } from './overrides.tsx'

function PictureImpl({ onError, ...props }: ComponentProps<'img'> & { 'data-part'?: string }) {
  // Which src failed, so a new picture in the same place gets its own chance.
  const [failed, setFailed] = useState<string | null>(null)
  const shown = usePicturesShown()
  if (!shown || !props.src || failed === props.src) return null
  return (
    <img
      loading="lazy"
      decoding="async"
      {...props}
      src={assetUrl(String(props.src))}
      onError={(event) => {
        setFailed(String(props.src))
        onError?.(event)
      }}
    />
  )
}

/**
 * Renders a picture as an `<img>` that takes no space when its file is missing. Every picture the UI renders goes
 * through it, so replacing it in `components` changes them all.
 *
 * It loads lazily, so a picture far down the page waits until the player scrolls near it. It renders nothing while the
 * game's pictures setting (`ui.settings.images`) is off, except inside a layered picture.
 */
export const Picture = overridable('Picture', PictureImpl)
