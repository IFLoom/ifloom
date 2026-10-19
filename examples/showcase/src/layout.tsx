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
  NoticeStrip,
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
import { at } from '@ifloom/plugin-places'

/**
 * The showcase's layout: the React UI's own (`DefaultLayout`) with three
 * changes. The notice strip sits over the story, a row of unread counts that
 * open where they are. What you're wearing shows at home only: out and
 * about, the wardrobe is the flat's "Open the wardrobe", which opens it as a
 * panel. And the inventory has drop buttons.
 */
export function Layout() {
  const words = useWords()
  const news = useQuests()?.updates
  return (
    <Game>
      <Sidebar>
        <Title />
        <Clock />
        <GameMenu />
        <Section id="stats" title={words('stats')} collapsible open>
          <StatList />
          <StatusList />
        </Section>
        <Section id="quests" title={words('quests')} dialog badge={news || null}>
          <QuestLog title={false} />
        </Section>
        <Section id="people" title={words('people')} dialog>
          <Relationships />
        </Section>
        <Section id="inventory" title={words('inventory')} collapsible>
          {/* With a drop button: what you drop lies in the room, in the location card, until you pick it up. */}
          <Inventory title={false} drop />
        </Section>
        <Section id="wardrobe" title={words('wardrobe')} collapsible when={at('flat')}>
          <WardrobeCard title={false} />
        </Section>
        <AchievementsButton />
        <CheatsButton />
        <DeviceButtons />
      </Sidebar>
      <Story>
        <NoticeStrip />
        <SceneStage />
        <InputFields />
        <LocationCard />
        <Exits />
        <RoomActions />
        <PeopleHere />
        <DebugCard />
      </Story>
      <PanelHost />
      <Overlay>
        <Notices />
      </Overlay>
    </Game>
  )
}
