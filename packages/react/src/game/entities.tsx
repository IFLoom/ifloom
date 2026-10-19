import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { Picture } from './picture.tsx'

function EntityTableImpl({ kinds, className }: { kinds?: string[]; className?: string }) {
  const { view } = useGame()
  const list = usePart('entities', 'flex flex-col gap-4 text-sm', className)
  const heading = usePart('entity-heading', 'font-heading font-semibold')
  const table = usePart('entity-table', 'w-full border-collapse')
  const columnsRow = usePart('entity-columns', 'text-left text-xs text-muted-foreground')
  const nameColumn = usePart('entity-column', 'py-1 pr-3 font-normal')
  const column = usePart('entity-column', 'py-1 pl-3 text-right font-normal')
  const row = usePart('entity-row', 'border-t')
  const name = usePart('entity-name', 'py-1 pr-3 font-medium')
  const image = usePart('entity-image', 'mr-2 inline-block size-8 rounded object-cover align-middle')
  const desc = usePart('entity-desc', 'block text-xs font-normal text-muted-foreground')
  const value = usePart('entity-value', 'py-1 pl-3 text-right tabular-nums')
  const shown = Object.entries(view.entities).filter(([id, kind]) => (!kinds || kinds.includes(id)) && kind.entries.length)
  if (!shown.length) return null
  return (
    <div {...list}>
      {shown.map(([id, kind]) => {
        // The columns are every stat any of them shows, in the order they first appear.
        const columns = [...new Map(kind.entries.flatMap((entry) => entry.stats.map((stat) => [stat.key, stat.label] as const)))]
        return (
          <section key={id} className="flex flex-col gap-2" data-kind={id}>
            <h3 {...heading}>{kind.plural}</h3>
            <table {...table}>
              <thead>
                <tr {...columnsRow}>
                  <th {...nameColumn} />
                  {columns.map(([key, label]) => (
                    <th key={key} {...column}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kind.entries.map((entry) => (
                  <tr key={entry.id} {...row} data-entity={entry.ref}>
                    <td {...name}>
                      {entry.image ? <Picture {...image} src={entry.image} alt="" /> : null}
                      {entry.name}
                      {entry.desc ? <span {...desc}>{entry.desc}</span> : null}
                    </td>
                    {columns.map(([key]) => (
                      <td key={key} {...value}>
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

/**
 * The things the game keeps several of (`view.entities`): a table per kind,
 * one row each, with its picture and description when it has them and the
 * stats the player can see on it. Only the kinds given, or every listed kind;
 * nothing at all when they are all empty.
 */
export const EntityTable = overridable('EntityTable', EntityTableImpl)
