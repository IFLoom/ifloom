import { Game, InputFields, Scene, Story } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`. The default layout has InputFields under the Scene.
export function Layout() {
  return (
    <Game>
      <Story>
        <Scene />
        {/* A field for each input on offer, with the reason under it when a value is refused. */}
        <InputFields />
      </Story>
    </Game>
  )
}
