import { Fragment, type ReactNode } from 'react'
import { Separator } from '../components/ui/separator.tsx'
import { ChoiceList } from './choices.tsx'
import { useGame } from './context.tsx'
import { DebugPanel } from './debug.tsx'
import { DeviceButtons } from './device.tsx'
import { EntityTable } from './entities.tsx'
import { InputFields } from './inputs.tsx'
import { Inventory } from './inventory.tsx'
import { GameMenu } from './menu.tsx'
import { Notices } from './notices.tsx'
import { overridable, usePart } from './overrides.tsx'
import { QuestLog } from './quests.tsx'
import { SceneStage } from './scene.tsx'
import { Clock, LocationPanel, PeoplePanel, StatList } from './sidebar.tsx'
import { WardrobePanel } from './wardrobe.tsx'

/**
 * A built-in part of the screen, by name. Each draws nothing when the game
 * has nothing for it — no calendar, no clock; no cast, no people — so a layout
 * can list parts a game does not use.
 */
export type PartName =
  | 'title'
  | 'stats'
  | 'entities'
  | 'menu'
  | 'devices'
  | 'separator'
  | 'location'
  | 'people'
  | 'actions'
  | 'inventory'
  | 'wardrobe'
  | 'scene'
  | 'inputs'
  | 'quests'
  | 'debug'
  | 'notices'

/** A part of a layout: a built-in one by name, or anything of the game's own. */
export type Part = PartName | ReactNode

/**
 * Where the parts go: a column at the side, the stage, and the overlay that
 * floats over the page (notices, by default). No side column, and the stage is
 * all there is; an empty overlay draws nothing over the page.
 */
export type Layout = { sidebar?: readonly Part[]; stage?: readonly Part[]; overlay?: readonly Part[] }

/** The React UI's own layout: everything at the side, the scene on the stage. */
export const DEFAULT_LAYOUT = {
  sidebar: ['title', 'stats', 'entities', 'menu', 'devices', 'separator', 'location', 'people', 'actions', 'inventory', 'wardrobe'],
  stage: ['scene', 'inputs', 'quests', 'debug'],
  overlay: ['notices'],
} as const satisfies Required<Layout>

/** A page to read, as a novel is: the scene, then what to type and the buttons, under the title. */
export const READING_LAYOUT = {
  sidebar: [],
  stage: ['title', 'scene', 'inputs', 'actions', 'stats', 'menu'],
  overlay: ['notices'],
} as const satisfies Required<Layout>

function TitleImpl() {
  const { view } = useGame()
  return (
    <div>
      <h1 {...usePart('title', 'font-heading text-title font-semibold')}>{view.title}</h1>
      <Clock />
    </div>
  )
}

/** The game's title, and where it is in time if a plugin says. */
export const Title = overridable('Title', TitleImpl)

function ActionsImpl() {
  const { view } = useGame()
  return <ChoiceList choices={view.actions} part="actions" />
}

/** The buttons offered while no scene is open: the game's own and its plugins'. */
export const Actions = overridable('Actions', ActionsImpl)

const PARTS: Record<PartName, () => ReactNode> = {
  title: () => <Title />,
  stats: () => <StatList />,
  entities: () => <EntityTable />,
  menu: () => <GameMenu />,
  devices: () => <DeviceButtons />,
  separator: () => <Separator />,
  location: () => <LocationPanel />,
  people: () => <PeoplePanel />,
  actions: () => <Actions />,
  inventory: () => <Inventory />,
  wardrobe: () => <WardrobePanel />,
  scene: () => <SceneStage />,
  inputs: () => <InputFields />,
  quests: () => <QuestLog />,
  debug: () => <DebugPanel />,
  notices: () => <Notices />,
}

function isPartName(part: Part): part is PartName {
  return typeof part === 'string' && part in PARTS
}

/** Parts in order: each built-in one by name, anything else as it is. */
export function Parts({ parts }: { parts: readonly Part[] }) {
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={isPartName(part) ? `${part}-${index}` : index}>{isPartName(part) ? PARTS[part]() : part}</Fragment>
      ))}
    </>
  )
}

export type SidebarProps = {
  className?: string
  /** What goes in it, in order: the React UI's own side column if left out. */
  parts?: readonly Part[]
}

function SidebarImpl({ className, parts = DEFAULT_LAYOUT.sidebar }: SidebarProps) {
  return (
    <aside {...usePart('sidebar', 'flex flex-col gap-4', className)} data-sidebar>
      <Parts parts={parts} />
    </aside>
  )
}

/** The side column on its own: its parts, the React UI's if none are given. */
export const Sidebar = overridable('Sidebar', SidebarImpl)
