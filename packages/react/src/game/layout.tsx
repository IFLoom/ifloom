import { ChoiceList } from './choices.tsx'
import { useGame } from './context.tsx'
import { InputFields } from './inputs.tsx'
import { Inventory } from './inventory.tsx'
import { GameMenu } from './menu.tsx'
import { Notices } from './notices.tsx'
import { PanelHost } from './panels.tsx'
import { overridable, usePart } from './overrides.tsx'
import { Plugins } from './plugins.tsx'
import { Game, Overlay, Section, Sidebar, Story } from './regions.tsx'
import { Scene } from './scene.tsx'
import { Clock, StatList } from './sidebar.tsx'
import { useWords } from './words.ts'

function TitleImpl({ className }: { className?: string }) {
  const { view } = useGame()
  return <h1 {...usePart('title', 'font-heading text-title font-semibold', className)}>{view.title}</h1>
}

/** Renders the game's title from `view.title`, the `title` part. */
export const Title = overridable('Title', TitleImpl)

function RoomActionsImpl({ className }: { className?: string }) {
  const { view } = useGame()
  return <ChoiceList choices={view.actions} part="actions" className={className} />
}

/**
 * Renders the room's actions from `view.actions`, the game's own and its plugins', such as a location's. Its list is
 * the `actions` part.
 */
export const RoomActions = overridable('RoomActions', RoomActionsImpl)

/**
 * Renders the React UI's own layout, which `GameShell` and `mountGame` render when you give them none. The `react` and
 * `next` templates start you with a copy of it in `src/layout.tsx`.
 *
 * Each section hides itself when the game has nothing for it, so the same layout suits a novel and a town. The plugin
 * UIs' components go at each `<Plugins at="…" />`, in the order of the game's `plugins` list.
 */
export function DefaultLayout() {
  const words = useWords()
  return (
    <Game>
      <Sidebar>
        <Title />
        <Clock />
        <GameMenu />
        <Section id="stats" title={words('stats')} collapsible open>
          <StatList />
          <Plugins at="stats" />
        </Section>
        <Section id="inventory" title={words('inventory')} collapsible>
          <Inventory title={false} />
        </Section>
        <Plugins at="sidebar" />
      </Sidebar>
      <Story>
        <Scene />
        <InputFields />
        <Plugins at="room" />
        <RoomActions />
        <Plugins at="story" />
      </Story>
      <PanelHost />
      <Overlay>
        <Notices />
      </Overlay>
    </Game>
  )
}
