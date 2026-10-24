/**
 * @ifloom/plugin-quests/react: the quests plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `questsUi` in the game's
 * `plugins` to have the quest log in the side column, behind a button with
 * the count of news, and as the `quests` panel; or draw it yourself from
 * `useQuests`.
 */
import type { ComponentProps } from 'react'
import type { GameState, Result } from '@ifloom/engine'
import type { QuestsView } from '../index.ts'
import { badgeVariants, buttonVariants, overridable, type Override, type PluginUi, Section, useGame, usePart, useWords } from '@ifloom/react'

/** The quests plugin's words, in English. A game rewords any with `ui.<key>` in its strings. */
export const QUESTS_WORDS = {
  questNew: 'New',
  questStage: '{stage} of {stages}',
  quests: 'Quests',
  track: 'Track',
  untrack: 'Untrack',
} as const

declare module '@ifloom/react' {
  interface OverridableComponents {
    QuestLog: Override<ComponentProps<typeof QuestLog>>
  }
  interface PartNames {
    'quest': true
    'quest-done': true
    'quest-hint': true
    'quest-stage': true
    'quest-summary': true
    'quest-title': true
    'quests': true
    'quests-done': true
    'quests-title': true
  }
}

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
  const words = useWords(QUESTS_WORDS)
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
  const done = usePart('quest-done', '')
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
              <s>{quest.title}</s>
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

/** The default layout's Quests section: a button with the count of news that opens the `QuestLog` in a dialog. */
export function QuestsSection() {
  const words = useWords(QUESTS_WORDS)
  const news = useQuests()?.updates
  return (
    <Section id="quests" title={words('quests')} dialog badge={news || null}>
      <QuestLog title={false} />
    </Section>
  )
}

/**
 * The quests plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: a Quests section in the side column that opens the
 * `QuestLog` in a dialog, with the count of news on its button; the `quests`
 * panel; and the quests' words.
 */
export const questsUi: PluginUi = {
  id: 'quests',
  words: QUESTS_WORDS,
  layout: { sidebar: [QuestsSection] },
  panels: { quests: { component: () => <QuestLog title={false} />, title: 'quests' } },
}
