/**
 * @ifloom/plugin-statuses/react: the statuses plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `statusesUi` in the game's
 * `plugins` to have the statuses under the stats, and as the `statuses`
 * panel; or draw them yourself from `useStatuses`.
 */
import type { ComponentProps } from 'react'
import { statOf, stringOf } from '@ifloom/engine'
import type { StatusesView } from '../index.ts'
import { overridable, type Override, pluginKit, type PluginUi, useGame, useKitPart, usePart, usePlugin } from '@ifloom/react'

/** The statuses plugin's words, in English. A game rewords any with `ui.<key>` in its strings. */
export const STATUSES_WORDS = {
  modifierAdd: '{n} {stat}',
  modifierMultiply: '×{n} {stat}',
  statusStacks: '×{n}',
  statuses: 'Statuses',
  turnLeft: '1 turn left',
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

/** The statuses plugin's view: the active statuses, each with its turns left and what it does to the stats, or null in a game without the plugin. `StatusList` is drawn from it. */
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
 * The statuses active now: each with its name, its stacks, the turns left on
 * its longest stack, its description and what it does to the stats. Nothing while
 * none is active, or in a game without the plugin. A thin default on
 * `useStatuses`.
 */
export const StatusList = overridable('StatusList', StatusListImpl)

/**
 * The statuses plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: the `StatusList` under the stats in the side column, the
 * `statuses` panel, and the statuses' words.
 */
export const statusesUi: PluginUi = {
  ...STATUSES,
  layout: { stats: [() => <StatusList />] },
  panels: { statuses: { component: () => <StatusList title={false} />, title: 'statuses' } },
}
