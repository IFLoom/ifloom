import { statDef } from '@ifloom/engine'
import type { StatusesView } from '@ifloom/plugin-statuses'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/** The statuses plugin's view: the active statuses, each with its turns left and what it does to the stats, or null in a game without the plugin. `StatusList` is drawn from it. */
export function useStatuses(): StatusesView | null {
  const { view } = useGame()
  return (view.plugins.statuses as StatusesView | undefined) ?? null
}

function StatusListImpl({ className, title }: { className?: string; title?: string | false }) {
  const { runner } = useGame()
  const words = useWords()
  const section = usePart('statuses', 'flex flex-col gap-2 text-sm', className)
  const heading = usePart('statuses-title', 'font-heading font-semibold')
  const row = usePart('status', 'flex flex-col gap-0.5')
  const label = usePart('status-label', 'flex items-baseline gap-1.5 font-medium')
  const stacks = usePart('status-stacks', 'text-xs text-muted-foreground')
  const turns = usePart('status-turns', 'ml-auto text-xs font-normal text-muted-foreground tabular-nums')
  const summary = usePart('status-summary', 'text-xs text-muted-foreground')
  const modifiers = usePart('status-modifiers', 'text-xs')
  const data = useStatuses()
  if (!data?.active.length) return null
  const statLabel = (stat: string) => statDef(runner.game, stat)?.label ?? stat
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n))
  return (
    <section {...section} data-statuses>
      {title === false ? null : <h3 {...heading}>{title ?? words('statuses')}</h3>}
      <ul className="flex flex-col gap-2">
        {data.active.map((status) => {
          const changes = status.modifiers.flatMap((modifier) => [
            ...(modifier.add ? [words('modifierAdd', { n: signed(modifier.add), stat: statLabel(modifier.stat) })] : []),
            ...(modifier.multiply !== undefined && modifier.multiply !== 1 ? [words('modifierMultiply', { n: modifier.multiply, stat: statLabel(modifier.stat) })] : []),
          ])
          return (
            <li key={status.id} {...row} data-status={status.id}>
              <p {...label}>
                {status.label}
                {status.stacks > 1 ? <span {...stacks}>{words('statusStacks', { n: status.stacks })}</span> : null}
                <span {...turns}>{status.turnsLeft === 1 ? words('turnLeft') : words('turnsLeft', { n: status.turnsLeft })}</span>
              </p>
              {status.summary ? <p {...summary}>{status.summary}</p> : null}
              {changes.length ? <p {...modifiers}>{changes.join(words('priceSeparator'))}</p> : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * The statuses active now: each with its label, its stacks, the turns left on
 * its longest stack, its summary and what it does to the stats. Nothing while
 * none is active, or in a game without the plugin. A thin default on
 * `useStatuses`.
 */
export const StatusList = overridable('StatusList', StatusListImpl)
