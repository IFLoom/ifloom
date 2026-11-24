/**
 * The statuses plugin's React UI, for a game rendered with `@ifloom/react`.
 *
 * List `statusesUi` in the game's `plugins` to render the active statuses under the stats and as the `statuses`
 * panel. To render them yourself, read `useStatuses`.
 */
import type { ComponentProps } from 'react'
import { statOf, stringOf } from '@ifloom/engine'
import type { StatusesView } from '../index.ts'
import { useGame, usePart } from '@ifloom/react'
import { overridable, type Override, pluginKit, type PluginUi, useKitPart, usePlugin } from '@ifloom/react/kit'

/** The statuses plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings. */
export const STATUSES_WORDS = {
  /** The line for a modifier that adds to a stat, with the signed `{n}` and the `{stat}`. */
  modifierAdd: '{n} {stat}',
  /** The line for a modifier that multiplies a stat, with `{n}` and the `{stat}`. */
  modifierMultiply: '×{n} {stat}',
  /** The badge on a status with more than one stack, with `{n}`. */
  statusStacks: '×{n}',
  /** The title of the status list. */
  statuses: 'Statuses',
  /** The line on a status with one turn left. */
  turnLeft: '1 turn left',
  /** The line on a status with `{n}` turns left. */
  turnsLeft: '{n} turns left',
} as const

/** The statuses plugin's UI, declared once: its id and its words, for `usePlugin` and `statusesUi`. */
const STATUSES = pluginKit('statuses', STATUSES_WORDS)

declare module '@ifloom/react' {
  interface OverridableComponents {
    StatusList: Override<ComponentProps<typeof StatusList>>
  }
  interface PartNames {
    'status': true
    'status-label': true
    'status-modifiers': true
    'status-stacks': true
    'status-summary': true
    'status-turns': true
    'statuses': true
    'statuses-title': true
  }
}

/** Returns the statuses plugin's view from the running game, or null in a game without the plugin. It re-renders when the view changes. */
export function useStatuses(): StatusesView | null {
  return usePlugin(STATUSES).view ?? null
}

function StatusListImpl({ className, title }: { className?: string; title?: string | false }) {
  const { runner } = useGame()
  const { words } = usePlugin(STATUSES)
  const section = usePart('statuses', 'flex flex-col gap-2 text-sm', className)
  const heading = useKitPart('heading', 'statuses-title')
  const row = useKitPart('item', 'status')
  const label = useKitPart('title', 'status-label')
  const stacks = usePart('status-stacks', 'text-xs text-muted-foreground')
  const turns = useKitPart('note', 'status-turns', 'flex-1 text-right text-xs font-normal tabular-nums')
  const description = useKitPart('note', 'status-summary', 'text-xs')
  const modifiers = usePart('status-modifiers', 'text-xs')
  const data = useStatuses()
  if (!data?.active.length) return null
  const statLabel = (stat: string) => statOf(runner.game, stat)?.label ?? stat
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n))
  return (
    <section {...section} data-statuses>
      {title === false ? null : <h3 {...heading}>{title ?? words('statuses')}</h3>}
      <ul className="flex flex-col gap-2">
        {data.active.map((status) => {
          const changes = status.modifiers.flatMap((modifier) => [
            ...(modifier.add ? [words('modifierAdd', { n: signed(modifier.add), stat: statLabel(modifier.stat) })] : []),
            ...(modifier.multiply !== undefined && modifier.multiply !== 1
              ? [words('modifierMultiply', { n: modifier.multiply, stat: statLabel(modifier.stat) })]
              : []),
          ])
          return (
            <li key={status.id} {...row} data-status={status.id}>
              <p {...label}>
                {status.name}
                {status.stacks > 1 ? <span {...stacks}>{words('statusStacks', { n: status.stacks })}</span> : null}
                <span {...turns}>{status.turnsLeft === 1 ? words('turnLeft') : words('turnsLeft', { n: status.turnsLeft })}</span>
              </p>
              {status.description ? <p {...description}>{status.description}</p> : null}
              {changes.length ? <p {...modifiers}>{changes.join(stringOf(runner.game, 'priceSeparator'))}</p> : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * Renders the active statuses from `view.plugins.statuses.active`, each with its name, stacks, turns left,
 * description and changes to the stats. It renders nothing while no status is active or without the plugin.
 *
 * A preset can style the parts `statuses`, `statuses-title`, `status`, `status-label`, `status-stacks`,
 * `status-turns`, `status-summary` and `status-modifiers`.
 */
export const StatusList = overridable('StatusList', StatusListImpl)

/**
 * The statuses plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders the `StatusList` under
 * the stats in the sidebar and as the `statuses` panel, and adds the plugin's words.
 */
export const statusesUi: PluginUi = {
  ...STATUSES,
  layout: { stats: [() => <StatusList />] },
  panels: { statuses: { component: () => <StatusList title={false} />, title: 'statuses' } },
}
