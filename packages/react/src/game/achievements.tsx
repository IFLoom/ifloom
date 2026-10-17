import type { AchievementsView } from '@ifloom/plugin-achievements'
import { useState } from 'react'
import { badgeVariants } from '../components/ui/badge.tsx'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { PartDialog } from './dialog.tsx'
import { overridable, usePart } from './overrides.tsx'
import { BackButton, Heading, usePage, usePageParts } from './pages.tsx'
import { Picture } from './picture.tsx'
import { useWords } from './words.ts'

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
  const words = useWords()
  const list = usePart('achievements', 'flex flex-col gap-3', className)
  const heading = usePart('achievements-title', 'flex items-baseline gap-2 font-heading font-semibold')
  const count = usePart('achievements-count', 'text-sm font-normal text-muted-foreground tabular-nums')
  const card = usePart('achievement', 'flex items-start gap-3 rounded-lg border p-3 data-[earned]:border-primary/50 [&:not([data-earned])]:opacity-75')
  const image = usePart('achievement-image', 'size-12 shrink-0 rounded object-cover')
  const name = usePart('achievement-title', 'flex flex-wrap items-center gap-2 font-medium')
  const earnedBadge = usePart('badge', badgeVariants())
  const text = usePart('achievement-text', 'text-sm text-muted-foreground')
  const bar = usePart('achievement-progress', 'mt-1 h-1.5 overflow-hidden rounded-full bg-muted [&>span]:block [&>span]:h-full [&>span]:bg-primary')
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
                {...card}
                data-achievement={entry.id}
                data-earned={entry.earned ? '' : undefined}
                data-secret={entry.secret && !entry.earned ? '' : undefined}
              >
                {entry.image ? <Picture {...image} src={entry.image} alt="" /> : null}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p {...name}>
                    {entry.title}
                    {entry.earned ? <span {...earnedBadge}>{words('achievementEarned')}</span> : null}
                  </p>
                  {entry.description ? <p {...text}>{entry.description}</p> : null}
                  {progress && !entry.earned ? (
                    <>
                      <div
                        {...bar}
                        role="progressbar"
                        aria-label={entry.title}
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
  const words = useWords()
  const data = useAchievements()
  const section = usePageParts(className, 'achievements-page')
  return (
    <section {...section} data-page="achievements">
      <Heading>{words('achievements')}</Heading>
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
  const words = useWords()
  const pages = usePage()
  const data = useAchievements()
  const [open, setOpen] = useState(false)
  const button = usePart('achievements-button', `${buttonVariants({ size: 'sm', variant: 'outline' })} self-start`, className)
  const count = usePart('badge', badgeVariants({ variant: 'secondary' }))
  if (!data) return null
  // With pages on, the achievements are a page; otherwise they open over the game.
  const asPage = pages.enabled && pages.options.achievements !== false
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
 * `'achievements'` part. With pages on it goes to the achievements page;
 * otherwise it opens them in a dialog. Nothing in a game without the plugin.
 */
export const AchievementsButton = overridable('AchievementsButton', AchievementsButtonImpl)
