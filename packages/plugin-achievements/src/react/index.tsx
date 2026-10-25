/**
 * @ifloom/plugin-achievements/react: the achievements plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `achievementsUi` in the
 * game's `plugins` to have an Achievements button in the side column, an
 * achievements page with pages on, and the `achievements` panel; or draw
 * them yourself from `useAchievements`.
 */
import type { AchievementsView } from '../index.ts'
import { useState, type ComponentProps } from 'react'
import {
  BackButton,
  badgeVariants,
  buttonVariants,
  overridable,
  type Override,
  PageHeading,
  PartDialog,
  Picture,
  type PluginUi,
  useGame,
  useKitPart,
  usePage,
  usePageParts,
  usePart,
  useWords,
} from '@ifloom/react'

/** The achievements plugin's words, in English. A game rewords any with `ui.<key>` in its strings. */
export const ACHIEVEMENTS_WORDS = {
  achievementEarned: 'Earned',
  achievementProgress: '{value} of {target}',
  achievements: 'Achievements',
  achievementsCount: '{earned} of {total}',
  noAchievements: 'No achievements yet.',
} as const

declare module '@ifloom/react' {
  interface OverridableComponents {
    AchievementList: Override<ComponentProps<typeof AchievementList>>
    AchievementsPage: Override<ComponentProps<typeof AchievementsPage>>
    AchievementsButton: Override<ComponentProps<typeof AchievementsButton>>
  }
  interface PartNames {
    'achievement': true
    'achievement-image': true
    'achievement-progress': true
    'achievement-progress-text': true
    'achievement-text': true
    'achievement-title': true
    'achievements': true
    'achievements-button': true
    'achievements-count': true
    'achievements-empty': true
    'achievements-title': true
    'achievements-page': true
  }
}

/**
 * The achievements plugin's view: every achievement in the order the game
 * declares them, with how many are earned, or null in a game without the
 * plugin. A secret one not yet earned comes titled `???` with no description.
 * `AchievementList` is drawn from it.
 */
export function useAchievements(): AchievementsView | null {
  const { view } = useGame()
  return (view.plugins.achievements as AchievementsView | undefined) ?? null
}

function AchievementListImpl({ className, title }: { className?: string; title?: string | false }) {
  const words = useWords(ACHIEVEMENTS_WORDS)
  const list = usePart('achievements', 'flex flex-col gap-3', className)
  const heading = useKitPart('heading', 'achievements-title', 'flex items-center gap-2 font-heading font-semibold')
  const count = usePart('achievements-count', 'text-sm font-normal text-muted-foreground tabular-nums')
  // Earned ones edged in the primary colour, the rest faded a little.
  const earnedCard = useKitPart('card', 'achievement', 'flex items-start gap-3 rounded-lg border border-primary p-3')
  const openCard = useKitPart('card', 'achievement', 'flex items-start gap-3 rounded-lg border p-3 opacity-70')
  const image = useKitPart('thumb', 'achievement-image', 'size-12 shrink-0 rounded object-cover')
  const name = useKitPart('title', 'achievement-title', 'flex flex-wrap items-center gap-2 font-medium')
  const earnedBadge = usePart('badge', badgeVariants())
  const text = usePart('achievement-text', 'text-sm text-muted-foreground')
  const bar = useKitPart('meter', 'achievement-progress', 'h-1.5 overflow-hidden rounded-full bg-muted [&>span]:block [&>span]:h-full [&>span]:bg-primary')
  const barText = usePart('achievement-progress-text', 'text-xs text-muted-foreground tabular-nums')
  const empty = usePart('achievements-empty', 'text-sm text-muted-foreground')
  const data = useAchievements()
  if (!data) return null
  return (
    <section {...list} data-achievements>
      {title === false ? null : (
        <h3 {...heading}>
          {title ?? words('achievements')}
          <span {...count}>{words('achievementsCount', { earned: data.earned, total: data.total })}</span>
        </h3>
      )}
      {data.achievements.length ? (
        <ul className="flex flex-col gap-2">
          {data.achievements.map((entry) => {
            const progress = entry.progress
            const share = progress ? Math.max(0, Math.min(1, progress.value / progress.target)) : 0
            return (
              <li
                key={entry.id}
                {...(entry.earned ? earnedCard : openCard)}
                data-achievement={entry.id}
                data-earned={entry.earned ? '' : undefined}
                data-state={entry.earned ? 'done' : 'open'}
                data-secret={entry.secret && !entry.earned ? '' : undefined}
              >
                {entry.image ? <Picture {...image} src={entry.image} alt="" /> : null}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p {...name}>
                    {entry.name}
                    {entry.earned ? <span {...earnedBadge}>{words('achievementEarned')}</span> : null}
                  </p>
                  {entry.description ? <p {...text}>{entry.description}</p> : null}
                  {progress && !entry.earned ? (
                    <>
                      <div
                        {...bar}
                        role="progressbar"
                        aria-label={entry.name}
                        aria-valuemin={0}
                        aria-valuemax={progress.target}
                        aria-valuenow={Math.min(progress.value, progress.target)}
                      >
                        <span style={{ width: `${Math.round(share * 1000) / 10}%` }} />
                      </div>
                      <p {...barText}>{words('achievementProgress', { value: Math.min(progress.value, progress.target), target: progress.target })}</p>
                    </>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p {...empty}>{words('noAchievements')}</p>
      )}
    </section>
  )
}

/**
 * Every achievement the game has: earned ones marked, secret ones not yet
 * earned as `???`, and a progress bar on any with a count to reach. Earned in
 * any save counts, as the profile remembers it. `title` replaces the heading;
 * `false` leaves it out. A thin default on `useAchievements`.
 */
export const AchievementList = overridable('AchievementList', AchievementListImpl)

function AchievementsPageImpl({ className }: { className?: string }) {
  const words = useWords(ACHIEVEMENTS_WORDS)
  const data = useAchievements()
  const section = usePageParts(className, 'achievements-page')
  return (
    <section {...section} data-page="achievements">
      <PageHeading>{words('achievements')}</PageHeading>
      {data ? <AchievementList title={false} /> : null}
      <div>
        <BackButton />
      </div>
    </section>
  )
}

/** The achievements page, among the pages around the game: an `AchievementList` and a way back. */
export const AchievementsPage = overridable('AchievementsPage', AchievementsPageImpl)

function AchievementsButtonImpl({ className }: { className?: string }) {
  const words = useWords(ACHIEVEMENTS_WORDS)
  const pages = usePage()
  const data = useAchievements()
  const [open, setOpen] = useState(false)
  const button = useKitPart('opener', 'achievements-button', `${buttonVariants({ size: 'sm', variant: 'outline' })} self-start`, className)
  const count = usePart('badge', badgeVariants({ variant: 'secondary' }))
  if (!data) return null
  // With pages on and the achievements page there, they're a page; otherwise they open over the game.
  const asPage = pages.enabled && Boolean(pages.added.achievements)
  return (
    <>
      <button type="button" {...button} data-achievements-button onClick={() => (asPage ? pages.go('achievements') : setOpen(true))}>
        {words('achievements')}
        <span {...count}>{words('achievementsCount', { earned: data.earned, total: data.total })}</span>
      </button>
      {asPage ? null : (
        <PartDialog open={open} onClose={() => setOpen(false)} title={words('achievements')}>
          <AchievementList title={false} />
        </PartDialog>
      )}
    </>
  )
}

/**
 * The button that shows the achievements, with how many are earned: the
 * `'achievements-button'` part. With pages on it goes to the achievements
 * page (unless the game left that page out); otherwise it opens them in a
 * dialog. Nothing in a game without the plugin.
 */
export const AchievementsButton = overridable('AchievementsButton', AchievementsButtonImpl)

/**
 * The achievements plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: the `AchievementsButton` in the side column, the
 * `achievements` page (with its title-screen button) when pages are on, the
 * `achievements` panel, and the achievements' words. To keep them in a
 * dialog with pages on, leave the page out: `{ ...achievementsUi, pages: undefined }`.
 */
export const achievementsUi: PluginUi = {
  id: 'achievements',
  words: ACHIEVEMENTS_WORDS,
  layout: { sidebar: [() => <AchievementsButton />] },
  pages: { achievements: { label: 'achievements', component: () => <AchievementsPage /> } },
  panels: { achievements: { component: () => <AchievementList title={false} />, title: 'achievements' } },
}
