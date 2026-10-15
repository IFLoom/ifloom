import { Badge } from '../components/ui/badge.tsx'
import { Button } from '../components/ui/button.tsx'
import { cn } from '../lib/utils.ts'
import { useGame } from './context.tsx'
import { useWords } from './words.ts'

/** The quests plugin's view, as the UI reads it. */
type Quest = { id: string; title: string; summary: string; hint: string; stage: number; stages: number; tracked: boolean; updated: boolean }
type QuestsData = { active: Quest[]; done: Quest[]; toFind: number; updates: number }

/**
 * The quest list: active quests with the hint for what to do next, then the
 * finished ones. `title` is what the game calls it — a journal, a to-do list.
 */
export function QuestLog({ className, title }: { className?: string; title?: string }) {
  const { view, send } = useGame()
  const words = useWords()
  const quests = view.plugins.quests as QuestsData | undefined
  if (!quests) return null
  return (
    <section className={cn('flex flex-col gap-3', className)} data-quests>
      <h3 className="flex items-center gap-2 font-semibold">
        {title ?? words('quests')}
        {quests.updates ? <Badge>{quests.updates}</Badge> : null}
      </h3>
      {quests.active.map((quest) => (
        <div key={quest.id} className="flex flex-col gap-1 rounded-lg border p-3" data-quest={quest.id}>
          <p className="flex items-center gap-2 font-medium">
            {quest.title}
            {quest.updated ? <Badge variant="secondary">{words('questNew')}</Badge> : null}
          </p>
          {quest.summary ? <p className="text-sm text-muted-foreground">{quest.summary}</p> : null}
          <p className="text-sm">{quest.hint}</p>
          <p className="text-xs text-muted-foreground">{words('questStage', { stage: quest.stage, stages: quest.stages })}</p>
          <Button
            size="sm"
            variant={quest.tracked ? 'secondary' : 'outline'}
            onClick={() => send({ type: 'custom', name: 'quests/track', with: { quest: quest.tracked ? undefined : quest.id } })}
          >
            {quest.tracked ? words('untrack') : words('track')}
          </Button>
        </div>
      ))}
      {quests.done.length ? (
        <ul className="text-sm text-muted-foreground">
          {quests.done.map((quest) => (
            <li key={quest.id} className="line-through">
              {quest.title}
            </li>
          ))}
        </ul>
      ) : null}
      {quests.updates ? (
        <Button size="sm" variant="ghost" onClick={() => send({ type: 'custom', name: 'quests/seen' })}>
          {words('allSeen')}
        </Button>
      ) : null}
    </section>
  )
}
