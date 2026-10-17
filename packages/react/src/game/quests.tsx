import type { GameState, Result } from '@ifloom/engine'
import type { QuestsView } from '@ifloom/plugin-quests'
import { badgeVariants } from '../components/ui/badge.tsx'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/** What `useQuests` returns: the quests plugin's view, and what the player can do with it. */
export type QuestsControls = QuestsView & {
  /** Track a quest by id, or track none with `null`: sends `quests/track`. */
  track: (id: string | null) => Result<GameState>
  /** Mark every quest's news seen: sends `quests/seen`. */
  seen: () => Result<GameState>
}

/** The quests plugin's view with its commands, or null in a game without the plugin. `QuestLog` is drawn from it. */
export function useQuests(): QuestsControls | null {
  const { view, send } = useGame()
  const quests = view.plugins.quests as QuestsView | undefined
  if (!quests) return null
  return {
    ...quests,
    track: (id) => send({ type: 'custom', name: 'quests/track', with: { id: id ?? undefined } }),
    seen: () => send({ type: 'custom', name: 'quests/seen' }),
  }
}

function QuestLogImpl({ className, title }: { className?: string; title?: string | false }) {
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
  const quests = useQuests()
  if (!quests) return null
  return (
    <section {...log} data-quests>
      {title === false ? null : (
        <h3 {...heading}>
          {title ?? words('quests')}
          {quests.updates ? <span {...updates}>{quests.updates}</span> : null}
        </h3>
      )}
      {quests.active.map((quest) => (
        <div key={quest.id} {...card} data-quest={quest.id}>
          <p {...questTitle}>
            {quest.title}
            {quest.updated ? <span {...fresh}>{words('questNew')}</span> : null}
          </p>
          {quest.summary ? <p {...summary}>{quest.summary}</p> : null}
          <p {...hint}>{quest.hint}</p>
          <p {...stage}>{words('questStage', { stage: quest.stage, stages: quest.stages })}</p>
          <button type="button" {...(quest.tracked ? tracked : untracked)} onClick={() => quests.track(quest.tracked ? null : quest.id)}>
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
        <button type="button" {...seen} onClick={() => quests.seen()}>
          {words('allSeen')}
        </button>
      ) : null}
    </section>
  )
}

/**
 * The quest list: active quests with the hint for what to do next, then the
 * finished ones. `title` is what the game calls it — a journal, a to-do list.
 * A thin default on `useQuests`.
 */
export const QuestLog = overridable('QuestLog', QuestLogImpl)
