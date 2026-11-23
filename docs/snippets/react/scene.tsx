import { Game, Scene, Story } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`. The default layout has Scene in its Story already.
export function Reading() {
  return (
    <Game>
      <Story>
        {/* The open scene, or the room: its title, picture, beats and choices. */}
        <Scene />
      </Story>
    </Game>
  )
}
