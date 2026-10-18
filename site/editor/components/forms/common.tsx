'use client'
/** Parts every form shares: the id with rename and delete, and the problems for what's open. */
import { useEffect, useState, type ReactNode } from 'react'
import type { Thing } from '../../lib/references'
import { useEditor } from '../context'
import { Button, TextInput } from '../ui'

const VALID_ID = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/

/** The thing's id, renamed everywhere it's named when you press Rename, and a Delete button. */
export function IdHeader({
  noun,
  id,
  taken,
  onRename,
  onDelete,
  extra,
}: {
  noun: string
  id: string
  taken: string[]
  onRename: (to: string) => void
  onDelete: () => void
  extra?: ReactNode
}) {
  const [draft, setDraft] = useState(id)
  useEffect(() => setDraft(id), [id])
  const to = draft.trim()
  const problem =
    to === id
      ? null
      : !VALID_ID.test(to)
        ? 'Use letters, numbers, dots, dashes and underscores.'
        : taken.includes(to)
          ? `There's already a ${noun} called ${to}.`
          : null
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-fd-muted-foreground">{noun}</span>
        <TextInput
          mono
          aria-label={`The ${noun}'s id`}
          className="max-w-64 text-base font-semibold"
          value={draft}
          onChange={(v) => setDraft(v ?? '')}
          onKeyDown={(event) => event.key === 'Enter' && !problem && to !== id && onRename(to)}
        />
        {to !== id ? (
          <>
            <Button size="xs" variant="primary" disabled={Boolean(problem)} onClick={() => onRename(to)} title={`Rename it everywhere it's named`}>
              Rename
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setDraft(id)}>
              Cancel
            </Button>
          </>
        ) : null}
        <span className="ms-auto flex items-center gap-1">
          {extra}
          <Button size="xs" variant="danger" onClick={() => confirm(`Delete the ${noun} ${id}?`) && onDelete()}>
            Delete
          </Button>
        </span>
      </div>
      {problem ? <span className="text-xs text-red-600 dark:text-red-400">{problem}</span> : null}
    </div>
  )
}

/** The checker's problems with this thing (or this choice of it), in a list above its form. */
export function InlineProblems({ thing, id, choice }: { thing: Thing | 'project'; id: string; choice?: string }) {
  const { problems, targets } = useEditor()
  const mine = problems.flatMap((problem, i) => {
    const t = targets[i]
    if (t.thing !== thing || t.id !== id) return []
    if (choice !== undefined && t.choice !== choice) return []
    // Above the whole form, a choice's problems say which choice.
    return [choice === undefined && t.choice ? `Choice ${t.choice}: ${problem.what}` : problem.what]
  })
  if (!mine.length) return null
  return (
    <ul className="flex flex-col gap-1 rounded-md border border-red-500/40 bg-red-500/5 p-2 text-xs text-red-700 dark:text-red-300" aria-label="Problems">
      {mine.map((text, i) => (
        <li key={i}>{text}</li>
      ))}
    </ul>
  )
}
