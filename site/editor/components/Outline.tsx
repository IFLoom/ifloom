'use client'
/**
 * The left pane: the project's scenes (storylets marked), stats, kv keys
 * and items, with a filter and a way to add each.
 */
import { useState } from 'react'
import type { Thing } from '../lib/references'
import { useEditor, type Selection } from './context'
import { Button, cx, inputClass } from './ui'

type Entry = { id: string; title?: string; badge?: string }

const SECTIONS: { thing: Thing; title: string; noun: string }[] = [
  { thing: 'scene', title: 'Scenes', noun: 'scene' },
  { thing: 'stat', title: 'Stats', noun: 'stat' },
  { thing: 'kv', title: 'Key–values (kv)', noun: 'kv key' },
  { thing: 'item', title: 'Items', noun: 'item' },
]

const VALID_ID = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/

export function Outline() {
  const { project, selection, select, create, targets } = useEditor()
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState<Thing | null>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const entries: Record<Thing, Entry[]> = {
    scene: project.pack.scenes.map((s) => ({
      id: s.id,
      title: s.title,
      badge: s.drawnFrom?.length ? 'storylet' : s.id === project.intro ? 'intro' : undefined,
    })),
    stat: project.pack.stats.map((s) => ({ id: s.id, title: s.label })),
    kv: project.kv.map((v) => ({ id: v.name })),
    item: project.pack.items.map((i) => ({ id: i.id, title: i.name })),
  }
  const existing = (thing: Thing) => entries[thing].map((e) => e.id)
  const words = filter.trim().toLowerCase()
  const shown = (entry: Entry) => !words || entry.id.toLowerCase().includes(words) || entry.title?.toLowerCase().includes(words)
  const flagged = (thing: Thing, id: string) => targets.some((t) => t.thing === thing && t.id === id)

  function add(thing: Thing) {
    const id = draft.trim()
    if (!VALID_ID.test(id)) return setError('Use letters, numbers, dots, dashes and underscores.')
    if (existing(thing).includes(id)) return setError(`There's already a ${thing} called ${id}.`)
    create(thing, id)
    select({ thing, id })
    setAdding(null)
    setDraft('')
    setError(null)
  }

  return (
    <nav aria-label="Project outline" className="flex min-h-0 flex-col gap-2 text-sm">
      <OutlineLink selection={{ thing: 'project' }} current={selection.thing === 'project'} flagged={targets.some((t) => t.thing === 'project')}>
        Project settings
      </OutlineLink>
      <input className={inputClass} placeholder="Filter" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter the outline" />
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pb-4">
        {SECTIONS.map(({ thing, title, noun }) => (
          <div key={thing}>
            <div className="flex items-center justify-between px-1 pb-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-fd-muted-foreground">
                {title} <span className="font-normal">{entries[thing].length}</span>
              </h2>
              <Button
                size="xs"
                variant="ghost"
                aria-label={`Add a ${noun}`}
                title={`Add a ${noun}`}
                onClick={() => (setAdding(thing), setDraft(''), setError(null))}
              >
                + Add
              </Button>
            </div>
            {adding === thing ? (
              <div className="mb-1 flex flex-col gap-1 px-1">
                <input
                  autoFocus
                  className={cx(inputClass, 'font-mono')}
                  placeholder={`New ${noun} id`}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') add(thing)
                    if (event.key === 'Escape') setAdding(null)
                  }}
                  aria-label={`New ${noun} id`}
                />
                {error ? <span className="text-xs text-red-600 dark:text-red-400">{error}</span> : null}
                <span className="flex gap-1">
                  <Button size="xs" variant="primary" onClick={() => add(thing)}>
                    Add {noun}
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setAdding(null)}>
                    Cancel
                  </Button>
                </span>
              </div>
            ) : null}
            <ul className="flex flex-col">
              {entries[thing].filter(shown).map((entry) => (
                <li key={entry.id}>
                  <OutlineLink
                    selection={{ thing, id: entry.id }}
                    current={selection.thing === thing && 'id' in selection && selection.id === entry.id}
                    flagged={flagged(thing, entry.id)}
                    badge={entry.badge}
                  >
                    <span className="truncate font-mono text-[13px]">{entry.id}</span>
                    {entry.title && entry.title !== entry.id ? <span className="truncate text-xs text-fd-muted-foreground">{entry.title}</span> : null}
                  </OutlineLink>
                </li>
              ))}
              {!entries[thing].length ? <li className="px-2 text-xs text-fd-muted-foreground">None yet.</li> : null}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}

function OutlineLink({
  selection,
  current,
  flagged,
  badge,
  children,
}: {
  selection: Selection
  current: boolean
  flagged?: boolean
  badge?: string
  children: React.ReactNode
}) {
  const { select } = useEditor()
  return (
    <button
      type="button"
      aria-current={current ? 'true' : undefined}
      onClick={() => select(selection)}
      className={cx(
        'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left',
        current ? 'bg-fd-primary/10 text-fd-primary' : 'text-fd-foreground hover:bg-fd-accent',
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">{children}</span>
      {badge ? (
        <span className="shrink-0 rounded border border-fd-border px-1 text-[10px] uppercase tracking-wide text-fd-muted-foreground">{badge}</span>
      ) : null}
      {flagged ? <span className="size-2 shrink-0 rounded-full bg-red-500" title="Has problems" aria-label="Has problems" /> : null}
    </button>
  )
}
