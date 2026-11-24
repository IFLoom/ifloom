import { Game, InputFields, Inventory, Notices, Overlay, PanelHost, RoomActions, Scene, Section, Sidebar, StatList, Story, Title } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`: the React UI's parts, placed as the default layout places them.
// Each Render it yourself page names the part for its feature.
export function Layout() {
  return (
    <Game>
      <Sidebar>
        <Title />
        <Section id="stats" title="Stats" collapsible open>
          <StatList />
        </Section>
        <Inventory />
      </Sidebar>
      <Story>
        <Scene />
        <InputFields />
        <RoomActions />
      </Story>
      <PanelHost />
      <Overlay>
        <Notices />
      </Overlay>
    </Game>
  )
}
