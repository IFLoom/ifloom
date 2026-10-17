import type { ReactNode } from 'react'
import {
  AchievementsButton,
  CheatsButton,
  Game,
  GameMenu,
  InputFields,
  Notices,
  Overlay,
  PanelHost,
  RoomActions,
  SceneStage,
  StatList,
  StatusList,
  Story,
  Title,
} from '../src/index.ts'

/** A page to read, as a novel is: the title, the scene, what to type and the buttons, with no side column. */
export function Reading() {
  return (
    <Game>
      <Story>
        <Title />
        <SceneStage />
        <InputFields />
        <RoomActions />
        <StatList />
        <StatusList />
        <GameMenu />
        <AchievementsButton />
        <CheatsButton />
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
