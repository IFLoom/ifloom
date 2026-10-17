import type { OpenPanel } from '@ifloom/engine'
import { AchievementList } from './achievements.tsx'
import { useGame, type PanelComponent } from './context.tsx'
import { PartDialog } from './dialog.tsx'
import { Inventory } from './inventory.tsx'
import { JobBoard } from './jobs.tsx'
import { overridable } from './overrides.tsx'
import { QuestLog } from './quests.tsx'
import { ShopCounter, useShop } from './shop.tsx'
import { Relationships, StatList } from './sidebar.tsx'
import { StatusList } from './statuses.tsx'
import { WardrobeCard } from './wardrobe.tsx'
import { useWords, type UiStringKey } from './words.ts'

/** What a panel was opened with, as an object: a built-in panel's `data`. */
function args(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
}

function ShopPanel({ data }: { data: unknown }) {
  const vendor = useShop()?.vendors.find((entry) => entry.id === args(data).vendor)
  return vendor ? <ShopCounter vendor={vendor} /> : null
}

function JobsPanel({ data }: { data: unknown }) {
  const only = args(data).job
  return <JobBoard title={false} jobs={Array.isArray(only) ? only.filter((id): id is string => typeof id === 'string') : undefined} />
}

/**
 * The panels the React UI draws by name, for `{ kind: 'panel', panel }`: each
 * gets what the panel was opened with as `data`. A game's own `panels` of the
 * same name go over these.
 *
 * - `shop`: the `ShopCounter` of `data.vendor`.
 * - `jobs`: the `JobBoard`, only the jobs `data.job` lists if it lists any.
 * - `wardrobe`, `inventory`, `quests`, `people`, `achievements`, `statuses`
 *   and `stats`: `WardrobeCard`, `Inventory`, `QuestLog`, `Relationships`,
 *   `AchievementList`, `StatusList` and `StatList`.
 */
export const BUILT_IN_PANELS: Readonly<Record<string, PanelComponent>> = {
  shop: ShopPanel,
  jobs: JobsPanel,
  wardrobe: () => <WardrobeCard title={false} />,
  inventory: () => <Inventory title={false} />,
  quests: () => <QuestLog title={false} />,
  people: () => <Relationships />,
  achievements: () => <AchievementList title={false} />,
  statuses: () => <StatusList title={false} />,
  stats: () => <StatList />,
}

/** The UI word each built-in panel is titled with. The shop is titled with its vendor's name. */
const TITLES: Record<string, UiStringKey> = {
  jobs: 'jobs',
  wardrobe: 'wardrobe',
  inventory: 'inventory',
  quests: 'quests',
  people: 'people',
  achievements: 'achievements',
  statuses: 'statuses',
  stats: 'stats',
}

/** The dialog's title: `with.title` if content gave one, the vendor's name for the shop, a built-in panel's word, else its name. */
function usePanelTitle(open: OpenPanel | null): string {
  const words = useWords()
  const vendors = useShop()?.vendors
  if (!open) return ''
  if (typeof open.with.title === 'string') return open.with.title
  if (open.panel === 'shop') return vendors?.find((vendor) => vendor.id === open.with.vendor)?.name ?? ''
  const key = TITLES[open.panel]
  return key ? words(key) : open.panel
}

function PanelHostImpl() {
  const { view, panels, send } = useGame()
  const open = view.panel
  const title = usePanelTitle(open)
  const Panel = open ? (panels[open.panel] ?? BUILT_IN_PANELS[open.panel]) : undefined
  // A name nothing draws shows nothing: the panel closes as the story moves on, or with `closePanel`.
  return (
    <PartDialog open={Boolean(open && Panel)} onClose={() => send({ type: 'closePanel' })} title={title}>
      {open && Panel ? (
        <div data-panel={open.panel}>
          <Panel data={open.with} />
        </div>
      ) : null}
    </PartDialog>
  )
}

/**
 * Draws the panel content opened (`view.panel`) in a dialog: the game's own
 * `panels` by its name, else one of `BUILT_IN_PANELS`, with what it was opened
 * with as `data`. Closing the dialog sends `closePanel`. The default layout
 * has one; a layout of your own puts it anywhere inside the `GameProvider`.
 */
export const PanelHost = overridable('PanelHost', PanelHostImpl)
