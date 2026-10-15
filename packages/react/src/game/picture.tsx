import { useState, type ComponentProps } from 'react'
import { assetUrl } from './assets.ts'
import { overridable } from './overrides.tsx'

function PictureImpl({ onError, ...props }: ComponentProps<'img'> & { 'data-part'?: string }) {
  // Which src failed, so a new picture in the same place gets its own chance.
  const [failed, setFailed] = useState<string | null>(null)
  if (!props.src || failed === props.src) return null
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
 * An image that takes no space if its file is missing (a portrait the game
 * hasn't drawn yet, art left out of a build) instead of showing a broken icon.
 * It loads lazily (`loading="lazy"`, `decoding="async"`), so a picture far down
 * the page waits until the player scrolls near it. Every picture the UI draws
 * goes through it, so replacing it in `components` changes them all.
 */
export const Picture = overridable('Picture', PictureImpl)
