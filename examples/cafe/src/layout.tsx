import {
  Clock,
  EntityTable,
  Game,
  GameMenu,
  InputFields,
  Notices,
  Overlay,
  PanelHost,
  RoomActions,
  Scene,
  Section,
  Sidebar,
  StatList,
  Story,
  Title,
  useWords,
} from '@ifloom/react'

/**
 * The café's layout: the books in the story, where the eye goes. The staff
 * and the menu (`EntityTable`) sit over the week's buttons; the side column
 * keeps the title, the week, the menu and the takings.
 */
export function Layout() {
  const words = useWords()
  return (
    <Game>
      <Sidebar>
        <Title />
        <Clock />
        <GameMenu />
        <Section id="stats" title={words('stats')} collapsible open>
          <StatList />
        </Section>
      </Sidebar>
      <Story>
        <Scene />
        <EntityTable />
        <RoomActions />
        <InputFields />
      </Story>
      <PanelHost />
      <Overlay>
        <Notices />
      </Overlay>
    </Game>
  )
}
