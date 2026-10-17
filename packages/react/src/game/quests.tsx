import { badgeVariants } from '../components/ui/badge.tsx'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/** The quests plugin's view, as the UI reads it. */
type Quest = { id: string; title: string; summary: string; hint: string; stage: number; stages: number; tracked: boolean; updated: boolean }
type QuestsData = { active: Quest[]; done: Quest[]; toFind: number; updates: number }

function QuestLogImpl({ className, title }: { className?: string; title?: string }) {
  const { view, send } = useGame()
  const words = useWords()
  const log = usePart('quests', 'flex flex-col gap-3', className)
  const heading = usePart('quests-title', 'flex items-center gap-2 font-heading font-semibold')
  const updates = usePart('badge', badgeVariants())
  const card = usePart('quest', 'flex flex-col gap-1 rounded-lg border p-3')
  const questTitle = usePart('quest-title', 'flex items-center gap-2 font-medium')
  const fresh = usePart('badge', badgeVariants({ variant: 'secondary' }))
  const summary = usePart('quest-summary', 'text-sm text-muted-foreground')
  const hint = usePart('quest-hint', 'text-sm')
  const stage = usePart('quest-stage', 'text-xs text-muted-foreground')
  const tracked = usePart('button', buttonVariants({ size: 'sm', variant: 'secondary' }))
  const untracked = usePart('button', buttonVariants({ size: 'sm', variant: 'outline' }))
  const doneList = usePart('quests-done', 'text-sm text-muted-foreground')
  const done = usePart('quest-done', 'line-through')
  const seen = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const quests = view.plugins.quests as QuestsData | undefined
  if (!quests) return null
  return (
    <section {...log} data-quests>
      <h3 {...heading}>
        {title ?? words('quests')}
        {quests.updates ? <span {...updates}>{quests.updates}</span> : null}
      </h3>
      {quests.active.map((quest) => (
        <div key={quest.id} {...card} data-quest={quest.id}>
          <p {...questTitle}>
            {quest.title}
            {quest.updated ? <span {...fresh}>{words('questNew')}</span> : null}
          </p>
          {quest.summary ? <p {...summary}>{quest.summary}</p> : null}
          <p {...hint}>{quest.hint}</p>
          <p {...stage}>{words('questStage', { stage: quest.stage, stages: quest.stages })}</p>
          <button
            type="button"
            {...(quest.tracked ? tracked : untracked)}
            onClick={() => send({ type: 'custom', name: 'quests/track', with: { id: quest.tracked ? undefined : quest.id } })}
          >
            {quest.tracked ? words('untrack') : words('track')}
          </button>
        </div>
      ))}
      {quests.done.length ? (
        <ul {...doneList}>
          {quests.done.map((quest) => (
            <li key={quest.id} {...done}>
              {quest.title}
            </li>
          ))}
        </ul>
      ) : null}
      {quests.updates ? (
        <button type="button" {...seen} onClick={() => send({ type: 'custom', name: 'quests/seen' })}>
          {words('allSeen')}
        </button>
      ) : null}
    </section>
  )
}

/**
 * The quest list: active quests with the hint for what to do next, then the
 * finished ones. `title` is what the game calls it — a journal, a to-do list.
 */
export const QuestLog = overridable('QuestLog', QuestLogImpl)
