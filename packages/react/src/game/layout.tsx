import { AchievementsButton } from './achievements.tsx'
import { CheatsButton } from './cheats.tsx'
import { ChoiceList } from './choices.tsx'
import { useGame } from './context.tsx'
import { DebugCard } from './debug.tsx'
import { DeviceButtons } from './device.tsx'
import { InputFields } from './inputs.tsx'
import { Inventory } from './inventory.tsx'
import { GameMenu } from './menu.tsx'
import { Notices } from './notices.tsx'
import { PanelHost } from './panels.tsx'
import { overridable, usePart } from './overrides.tsx'
import { QuestLog, useQuests } from './quests.tsx'
import { Game, Overlay, Section, Sidebar, Story } from './regions.tsx'
import { SceneStage } from './scene.tsx'
import { StatusList } from './statuses.tsx'
import { Clock, Exits, LocationCard, PeopleHere, Relationships, StatList } from './sidebar.tsx'
import { WardrobeCard } from './wardrobe.tsx'
import { useWords } from './words.ts'

function TitleImpl({ className }: { className?: string }) {
  const { view } = useGame()
  return <h1 {...usePart('title', 'font-heading text-title font-semibold', className)}>{view.title}</h1>
}

/** The game's title. `Clock` is where it is in time. */
export const Title = overridable('Title', TitleImpl)

function RoomActionsImpl({ className }: { className?: string }) {
  const { view } = useGame()
  return <ChoiceList choices={view.actions} part="actions" className={className} />
}

/** The buttons offered while no scene is open: the game's own and its plugins', such as a place's things to do. */
export const RoomActions = overridable('RoomActions', RoomActionsImpl)

/**
 * The React UI's own layout, which `GameShell` and `mountGame` draw when you
 * give them none. The react and next templates start you with a copy of it in
 * `src/layout.tsx`. Each section hides itself when the game has nothing for
 * it, so the same layout suits a novel and a town.
 */
export function DefaultLayout() {
  const words = useWords()
  // New quest news shows as a count on the Quests button.
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
