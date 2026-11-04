/**
 * What the last command changed, drawn from `view.changes`: `+£30`, `+1 Charm`,
 * `+4 Ava`. The default layout leaves it out; a layout places `<Changes />`
 * where it wants the feedback, after `<Scene />` say.
 */
import { entityName, statOf, type Change, type StatDef } from '@ifloom/engine'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { cn, PROSE } from '../lib/utils.ts'
import { useWords } from './words.ts'

/** Whether a stat's format has words in it, so a change written with it says what it is: `{n} coins` does, `{n}%` and `£{n}` don't. */
function wordy(format: StatDef['format']): boolean {
  const words = typeof format === 'string' ? format : format ? format.other : ''
  return /\p{L}/u.test(words.replaceAll('{n}', ''))
}

function ChangeImpl({ change }: { change: Change }) {
  const { runner } = useGame()
  const item = usePart('change', cn('rounded-full border px-2.5 py-0.5 text-sm font-medium', change.by > 0 ? 'text-foreground' : 'text-destructive'))
  const text = usePart('change-text', '')
  const name = usePart('change-label', 'ml-1')
  // Who it's about: an entity's name, or the stat's label unless its format already says in words (`+30 coins` does; `+1` and `+20%` don't).
  const label = change.of ? entityName(runner.state, runner.game, change.of) : wordy(statOf(runner.game, change.stat)?.format) ? null : change.label
  return (
    <li {...item} data-stat={change.stat} data-of={change.of} data-dir={change.by > 0 ? 'up' : 'down'} title={`${change.label}: ${change.from} → ${change.to}`}>
      <span {...text}>{change.text}</span>
      {label ? <span {...name}>{label}</span> : null}
    </li>
  )
}

/**
 * One stat the last command moved, as a `change` part: its signed text in the
 * stat's format (`change-text`), then an entity's name, or the stat's label
 * when its format doesn't say what it is (`change-label`). It carries
 * `data-stat`, `data-of` for an entity's stat and `data-dir="up"` or `"down"`.
 * A stat's format "says what it is" when it has words in it besides the
 * number, such as `{n} coins`; `{n}%` and `£{n}` don't, so they get the label.
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
