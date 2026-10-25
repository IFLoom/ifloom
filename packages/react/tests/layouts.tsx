import type { ReactNode } from 'react'
import { Game, GameMenu, InputFields, Notices, Overlay, PanelHost, Plugins, RoomActions, Scene, StatList, Story, Title } from '../src/index.ts'

/** A page to read, as a novel is: the title, the scene, what to type and the buttons, with no side column. */
export function Reading() {
  return (
    <Game>
      <Story>
        <Title />
        <Scene />
        <InputFields />
        <RoomActions />
        <StatList />
        <Plugins at="stats" />
        <GameMenu />
        <Plugins at="sidebar" />
      </Story>
      <PanelHost />
      <Overlay>
        <Notices />
      </Overlay>
    </Game>
  )
}

/** A layout of just a story with these children, and nothing over it. */
export function storyOf(children: ReactNode) {
  return function StoryOnly() {
    return (
      <Game>
        <Story>{children}</Story>
      </Game>
    )
  }
}
