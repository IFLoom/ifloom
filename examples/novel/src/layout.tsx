import { Game, GameMenu, InputFields, Notices, Overlay, PanelHost, RoomActions, Scene, StatList, Story, Title } from '@ifloom/react'

/**
 * A page to read: no side column, so the story is one centred column, like a
 * book. The title over the chapter, then what to type and the buttons, and
 * the reader's stats and menu at the foot.
 */
export function Layout() {
  return (
    <Game>
      <Story>
        <Title />
        <Scene />
        <InputFields />
        <RoomActions />
        <StatList />
        <GameMenu />
      </Story>
      <PanelHost />
      <Overlay>
        <Notices />
      </Overlay>
    </Game>
  )
}
