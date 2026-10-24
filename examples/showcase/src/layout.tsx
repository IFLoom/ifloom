import {
  Clock,
  Game,
  GameMenu,
  InputFields,
  NoticeStrip,
  Notices,
  Overlay,
  PanelHost,
  RoomActions,
  SceneStage,
  Section,
  Sidebar,
  StatList,
  Story,
  Title,
  useWords,
} from '@ifloom/react'
import { AchievementsButton } from '@ifloom/plugin-achievements/react'
import { PeopleHere, PeopleSection } from '@ifloom/plugin-cast/react'
import { CheatsButton } from '@ifloom/plugin-cheats/react'
import { DebugCard } from '@ifloom/plugin-debug/react'
import { DeviceButtons } from '@ifloom/plugin-devices/react'
import { InventoryCard } from '@ifloom/plugin-inventory/react'
import { at } from '@ifloom/plugin-places'
import { Exits, LocationCard } from '@ifloom/plugin-places/react'
import { QuestsSection } from '@ifloom/plugin-quests/react'
import { StatusList } from '@ifloom/plugin-statuses/react'
import { WARDROBE_WORDS, WardrobeCard } from '@ifloom/plugin-wardrobe/react'

/**
 * The showcase's layout: the React UI's own (`DefaultLayout`) with the
 * plugins' parts placed by hand, and three changes. The notice strip sits
 * over the story, a row of unread counts that open where they are. What
 * you're wearing shows at home only: out and about, the wardrobe is the
 * flat's "Open the wardrobe", which opens it as a panel. And the inventory
 * has drop buttons.
 */
export function Layout() {
  const words = useWords(WARDROBE_WORDS)
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
        <QuestsSection />
        <PeopleSection />
        <Section id="inventory" title={words('inventory')} collapsible>
          {/* With a drop button: what you drop lies in the room, in the location card, until you pick it up. */}
          <InventoryCard title={false} drop />
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
