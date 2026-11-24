/**
 * What the last command changed, drawn from `view.changes`: `+£30`, `+1 Charm`,
 * `+4 Ava`. The default layout leaves it out; a layout places `<Changes />`
 * where it wants the feedback, after `<Scene />` say.
 */
import type { ChangeView } from '@ifloom/engine'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { cn, PROSE } from '../lib/utils.ts'
import { useWords } from './words.ts'

function ChangeImpl({ change }: { change: ChangeView }) {
  const item = usePart('change', cn('rounded-full border px-2.5 py-0.5 text-sm font-medium', change.by > 0 ? 'text-foreground' : 'text-destructive'))
  const text = usePart('change-text', '')
  const name = usePart('change-label', 'ml-1')
  return (
    <li {...item} data-stat={change.stat} data-of={change.of} data-dir={change.by > 0 ? 'up' : 'down'} title={`${change.label}: ${change.from} → ${change.to}`}>
      <span {...text}>{change.text}</span>
      {change.name ? <span {...name}>{change.name}</span> : null}
    </li>
  )
}

/**
 * One stat the last command moved, as a `change` part: its signed text in the
 * stat's format (`change-text`), then the change's `name` when the view
 * gives one (`change-label`): an entity's name, or the stat's label when its
 * format doesn't say what it is. It carries `data-stat`, `data-of` for an
 * entity's stat and `data-dir="up"` or `"down"`.
 */
export const ChangeItem = overridable('ChangeItem', ChangeImpl)

function ChangesImpl({ className }: { className?: string }) {
  const { view } = useGame()
  const words = useWords()
  const list = usePart('changes', cn(PROSE, 'flex flex-wrap gap-2'), className)
  if (!view.changes.length) return null
  return (
    <ul {...list} aria-label={words('changes')}>
      {view.changes.map((change) => (
        <ChangeItem key={`${change.stat}:${change.of ?? ''}`} change={change} />
      ))}
    </ul>
  )
}

/**
 * The stats the last command moved (`view.changes`), as a `changes` list of
 * `ChangeItem`s. Draws nothing when nothing moved. Not in the default layout:
 * place it in yours, after `<Scene />` for feedback under the story.
 */
export const Changes = overridable('Changes', ChangesImpl)
