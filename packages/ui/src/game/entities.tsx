import { cn } from '../lib/utils.ts'
import { useGame } from './context.tsx'

/**
 * The things the game keeps several of (`view.entities`): a table per kind,
 * one row each, with the stats the player can see on it. Only the kinds given,
 * or every kind; nothing at all when they are all empty.
 */
export function EntityTable({ kinds, className }: { kinds?: string[]; className?: string }) {
  const { view } = useGame()
  const shown = Object.entries(view.entities).filter(([id, kind]) => (!kinds || kinds.includes(id)) && kind.entries.length)
  if (!shown.length) return null
  return (
    <div className={cn('flex flex-col gap-4 text-sm', className)}>
      {shown.map(([id, kind]) => {
        // The columns are every stat any of them shows, in the order they first appear.
        const columns = [...new Map(kind.entries.flatMap((entry) => entry.stats.map((stat) => [stat.key, stat.label] as const)))]
        return (
          <section key={id} className="flex flex-col gap-2" data-kind={id}>
            <h3 className="font-semibold">{kind.plural}</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1 pr-3 font-normal" />
                  {columns.map(([key, label]) => (
                    <th key={key} className="py-1 pl-3 text-right font-normal">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kind.entries.map((entry) => (
                  <tr key={entry.id} className="border-t" data-entity={entry.ref}>
                    <td className="py-1 pr-3 font-medium">{entry.name}</td>
                    {columns.map(([key]) => (
                      <td key={key} className="py-1 pl-3 text-right tabular-nums">
                        {entry.stats.find((stat) => stat.key === key)?.text ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}
    </div>
  )
}
