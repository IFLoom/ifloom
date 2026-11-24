import { ChoiceList, Game, RoomActions, Scene, Story, useGame } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`. The default layout has RoomActions at the bottom of its Story.
export function Layout() {
  return (
    <Game>
      <Story>
        <Scene />
        {/* The room's buttons, with their prices and reasons, while no scene is open. */}
        <RoomActions />
      </Story>
    </Game>
  )
}

// Or only some of them: ChoiceList renders any list of buttons the same way.
export function FreeThings() {
  const { view } = useGame()
  return <ChoiceList choices={view.actions.filter((action) => !action.price?.stats?.length)} part="actions" />
}
