/**
 * The page: what goes in the side column, what goes in the story, and what
 * floats over them. This is a copy of the React UI's own `DefaultLayout`, so
 * change anything. Delete a part, move it, wrap it, or show it only in some
 * rooms with `when`. Each section hides itself when the game has nothing for
 * it.
 *
 * A plugin's own UI (`shopUi` from `@ifloom/plugin-shop/react`, say), listed
 * in `plugins` in `main.ts`, goes where each `<Plugins at="…" />` is. Or draw
 * a plugin's components yourself, wherever you like.
 *
 * On a phone the side column becomes a drawer behind a menu button.
 */
import {
  Clock,
  Game,
  GameMenu,
  InputFields,
  Inventory,
  Notices,
  Overlay,
  PanelHost,
  Plugins,
  RoomActions,
  SceneStage,
  Section,
  Sidebar,
  StatList,
  Story,
  Title,
  useWords,
} from '@ifloom/react'

export function Layout() {
  // The section titles are UI words, so `ui.stats` in the game's strings renames one.
  const words = useWords()
  return (
    <Game>
      <Sidebar>
        <Title />
        <Clock />
        <GameMenu />
        {/* `collapsible` folds in place, and the player's choice is remembered. */}
        <Section id="stats" title={words('stats')} collapsible open>
          <StatList />
          <Plugins at="stats" />
        </Section>
        <Section id="inventory" title={words('inventory')} collapsible>
          <Inventory title={false} />
        </Section>
        {/* What the plugins' UIs bring to the side column: a Quests button, the People, ... */}
        <Plugins at="sidebar" />
      </Sidebar>
      <Story>
        <SceneStage />
        <InputFields />
        {/* The bottom of the story: where you are and the way out, what to do, then who's here. */}
        <Plugins at="room" />
        <RoomActions />
        <Plugins at="story" />
      </Story>
      {/* A panel content opens, such as a shop's counter, in a dialog. */}
      <PanelHost />
      <Overlay>
        <Notices />
      </Overlay>
    </Game>
  )
}
