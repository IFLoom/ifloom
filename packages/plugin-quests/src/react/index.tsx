/**
 * The quests plugin's React UI, for a game rendered with `@ifloom/react`.
 *
 * List `questsUi` in the game's `plugins` to render the quest log behind a sidebar button with the count of news,
 * and as the `quests` panel. To render it yourself, read `useQuests`.
 */
import type { ComponentProps } from 'react'
import type { GameState, Result } from '@ifloom/engine'
import { quests, type QuestsView } from '../index.ts'
import { Section, usePart } from '@ifloom/react'
import { buttonVariants, overridable, type Override, pluginKit, type PluginUi, useKitPart, usePlugin } from '@ifloom/react/kit'

/** The quests plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings. */
export const QUESTS_WORDS = {
  /** The badge on a quest that has changed since the player last looked. */
  questNew: 'New',
  /** The count of a quest's stages done, with `{stage}` and `{stages}`. */
  questStage: '{stage} of {stages}',
  /** The title of the quest log and its section. */
  quests: 'Quests',
} as const

/** The quests plugin's UI, declared once: its id and its words, for `usePlugin` and `questsUi`. */
const QUESTS = pluginKit('quests', QUESTS_WORDS)

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

/** The quests plugin's view with a function that tracks any quest, as `useQuests` returns it. */
export type QuestsControls = QuestsView & {
  /** Sends `quests/track` for the quest with this id, or stops tracking with `null`. Each quest's `track` button does the same for that quest. */
  track: (id: string | null) => Result<GameState>
}

/** Returns the quests plugin's view and track command from the running game, or null in a game without the plugin. It re-renders when the view changes. */
export function useQuests(): QuestsControls | null {
  const { view, send } = usePlugin(QUESTS)
  if (!view) return null
  return {
    ...view,
    track: (id) => send(quests.track(id ?? undefined)),
  }
}

function QuestLogImpl({ className, title }: { className?: string; title?: string | false }) {
  const { words, send } = usePlugin(QUESTS)
  const list = usePart('quests', 'flex flex-col gap-3', className)
  const heading = useKitPart('heading', 'quests-title')
  const updates = useKitPart('badge', 'badge')
  const card = useKitPart('card', 'quest', 'gap-1')
  const questTitle = useKitPart('title', 'quest-title')
  const fresh = useKitPart('badge', 'badge')
  const description = useKitPart('note', 'quest-summary')
  const hint = usePart('quest-hint', 'text-sm')
  const stage = useKitPart('note', 'quest-stage', 'text-xs')
  const tracked = usePart('button', buttonVariants({ size: 'sm', variant: 'secondary' }))
  const untracked = usePart('button', buttonVariants({ size: 'sm', variant: 'outline' }))
  const doneList = usePart('quests-done', 'text-sm text-muted-foreground')
  const done = usePart('quest-done', '')
  const seen = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const log = useQuests()
  if (!log) return null
  return (
    <section {...list} data-quests>
      {title === false ? null : (
        <h3 {...heading}>
          {title ?? words('quests')}
          {log.updates ? <span {...updates}>{log.updates}</span> : null}
        </h3>
      )}
      {log.active.map((quest) => (
        <div key={quest.id} {...card} data-quest={quest.id}>
          <p {...questTitle}>
            {quest.name}
            {quest.updated ? <span {...fresh}>{words('questNew')}</span> : null}
          </p>
          {quest.description ? <p {...description}>{quest.description}</p> : null}
          <p {...hint}>{quest.hint}</p>
          <p {...stage}>{words('questStage', { stage: quest.stage, stages: quest.stages })}</p>
          {quest.track ? (
            <button
              type="button"
              {...(quest.tracked ? tracked : untracked)}
              disabled={Boolean(quest.track.disabled)}
              title={quest.track.disabled}
              onClick={() => send(quest.track!.command)}
            >
              {quest.track.label}
            </button>
          ) : null}
        </div>
      ))}
      {log.done.length ? (
        <ul {...doneList}>
          {log.done.map((quest) => (
            <li key={quest.id} {...done}>
              <s>{quest.name}</s>
            </li>
          ))}
        </ul>
      ) : null}
      {log.seen ? (
        <button type="button" {...seen} onClick={() => send(log.seen!.command)}>
          {log.seen.label}
        </button>
      ) : null}
    </section>
  )
}

/**
 * Renders the quest log from `view.plugins.quests`, the active quests with their hints and track buttons, then the
 * finished ones. `title` sets the heading, such as "Journal", and `title={false}` leaves it off.
 *
 * A preset can style the parts `quests`, `quests-title`, `quest`, `quest-title`, `quest-summary`, `quest-hint`,
 * `quest-stage`, `quests-done` and `quest-done`.
 */
export const QuestLog = overridable('QuestLog', QuestLogImpl)

/** Renders the default layout's Quests section, a button with the count of news from `view.plugins.quests.updates` that opens the `QuestLog` in a dialog. */
export function QuestsSection() {
  const { words } = usePlugin(QUESTS)
  const news = useQuests()?.updates
  return (
    <Section id="quests" title={words('quests')} dialog badge={news || null}>
      <QuestLog title={false} />
    </Section>
  )
}

/**
 * The quests plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It adds the `QuestsSection` to the
 * sidebar, renders the `quests` panel as a `QuestLog`, and adds the plugin's words.
 */
export const questsUi: PluginUi = {
  ...QUESTS,
  layout: { sidebar: [QuestsSection] },
  panels: { quests: { component: () => <QuestLog title={false} />, title: 'quests' } },
}
