import { Changes, Scene } from '@ifloom/react'

// What the last command moved, as pills under the scene: `+30 coins`, `-5%`, `+2 Ava`.
// Each pill is a `change` part with data-stat, data-of and data-dir="up" or "down" for your CSS.
export function StoryWithChanges() {
  return (
    <>
      <Scene />
      <Changes />
    </>
  )
}
