import { useState, type ComponentProps } from 'react'
import { assetUrl } from './assets.ts'

/**
 * An image that takes no space if its file is missing — a portrait the game
 * hasn't drawn yet, art left out of a build — instead of showing a broken icon.
 */
export function Picture({ onError, ...props }: ComponentProps<'img'>) {
  // Which src failed, so a new picture in the same place gets its own chance.
  const [failed, setFailed] = useState<string | null>(null)
  if (!props.src || failed === props.src) return null
  return (
    <img
      {...props}
      src={assetUrl(String(props.src))}
      onError={(event) => {
        setFailed(String(props.src))
        onError?.(event)
      }}
    />
  )
}
