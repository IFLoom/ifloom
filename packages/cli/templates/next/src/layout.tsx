'use client'
/**
 * The page: what goes in the side column, what goes in the story, and what
 * floats over them. This is a copy of the React UI's own `DefaultLayout`, so
 * change anything. Delete a part, move it, wrap it, or show it only in some
 * rooms with `when`. Each section hides itself when the game has nothing for
 * it, so parts for plugins you don't use cost nothing.
 *
 * On a phone the side column becomes a drawer behind a menu button.
 *
 * Not to be confused with Next's `app/layout.tsx`, the HTML around the app:
 * this is the game's page inside it, which `app/Game.tsx` passes to `GameShell`.
 */
import {
  AchievementsButton,
  CheatsButton,
  Clock,
  DebugCard,
  DeviceButtons,
  Exits,
  Game,
  GameMenu,
  InputFields,
  Inventory,
  LocationCard,
  Notices,
  Overlay,
  PanelHost,
  PeopleHere,
  QuestLog,
  Relationships,
  RoomActions,
  SceneStage,
  Section,
  Sidebar,
  StatList,
  StatusList,
  Story,
  Title,
  WardrobeCard,
  useQuests,
  useWords,
} from '@ifloom/react'

export function Layout() {
  // The section titles are UI words, so `ui.quests` in the game's strings renames one.
  const words = useWords()
  const news = useQuests()?.updates
  return (
    <Game>
      <Sidebar>
        <Title />
        <Clock />
        <GameMenu />
        {/* `collapsible` folds in place, and the player's choice is remembered. */}
        <Section id="stats" title={words('stats')} collapsible open>
          <StatList />
          <StatusList />
        </Section>
        {/* `dialog` is a button that opens the section in a dialog. */}
        <Section id="quests" title={words('quests')} dialog badge={news || null}>
          <QuestLog title={false} />
        </Section>
        <Section id="people" title={words('people')} dialog>
          <Relationships />
        </Section>
        <Section id="inventory" title={words('inventory')} collapsible>
          <Inventory title={false} />
        </Section>
        <Section id="wardrobe" title={words('wardrobe')} collapsible>
          <WardrobeCard title={false} />
        </Section>
        <AchievementsButton />
        <CheatsButton />
        <DeviceButtons />
      </Sidebar>
      <Story>
        <SceneStage />
        <InputFields />
        {/* The bottom of the story: where you are, the way out, what to do and who's here. */}
        <LocationCard />
        <Exits />
        <RoomActions />
        <PeopleHere />
        <DebugCard />
      </Story>
      {/* A panel content opens, such as a shop's counter, in a dialog. */}
      <PanelHost />
      <Overlay>
        <Notices />
      </Overlay>
    </Game>
  )
}
