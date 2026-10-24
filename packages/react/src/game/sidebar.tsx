import type { StatView } from '@ifloom/engine'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { MAX_PIPS } from '../hints.ts'
import { useWords } from './words.ts'

/** What `useClock` returns: where the game is in time. */
export type ClockState = {
  /** The line the plugins wrote (`view.when`), such as "Day 3 · Wednesday morning", or null when none says. */
  when: string | null
}

/** Where the game is in time, as the plugins' `label`s write it. `Clock` is drawn from it; the calendar plugin's UI has its parts (`useCalendar`). */
export function useClock(): ClockState {
  const { view } = useGame()
  return { when: view.when || null }
}

function ClockImpl() {
  const { when } = useClock()
  const attrs = usePart('clock', 'text-sm text-muted-foreground')
  if (!when) return null
  return <p {...attrs}>{when}</p>
}

/** Where the game is in time, as its plugins say (`view.when`): nothing in a game with no calendar. A thin default on `useClock`. */
export const Clock = overridable('Clock', ClockImpl)

/**
 * A stat's value as a bar from its `min` to its `max`, or as pips, one per
 * point, by its `ui.display` hint: the `<dd>` `StatList` draws under a stat.
 * A plugin's UI that lists stats of its own draws it too.
 */
export function StatGauge({ stat }: { stat: StatView }) {
  const bar = usePart('stat-bar', 'col-span-2 h-1.5 overflow-hidden rounded-full bg-muted [&>span]:block [&>span]:h-full [&>span]:bg-primary')
  const pips = usePart('stat-pips', 'col-span-2 flex flex-wrap gap-1')
  const full = usePart('stat-pip', 'size-2.5 rounded-full border border-primary bg-primary')
  const empty = usePart('stat-pip', 'size-2.5 rounded-full border border-primary')
  const range = stat.max - stat.min
  const meter = {
    role: 'meter',
    'aria-label': stat.label,
    'aria-valuemin': stat.min,
    'aria-valuemax': stat.max,
    'aria-valuenow': stat.value,
    'aria-valuetext': stat.text,
  } as const
  if (stat.ui?.display === 'pips' && range > 0 && range <= MAX_PIPS) {
    const filled = Math.max(0, Math.min(range, Math.round(stat.value - stat.min)))
    return (
      <dd {...pips} {...meter}>
        {Array.from({ length: range }, (_, index) => (
          <span key={index} {...(index < filled ? full : empty)} data-filled={index < filled ? '' : undefined} />
        ))}
      </dd>
    )
  }
  const share = range > 0 ? Math.max(0, Math.min(1, (stat.value - stat.min) / range)) : 0
  return (
    <dd {...bar} {...meter}>
      <span style={{ width: `${Math.round(share * 1000) / 10}%` }} />
    </dd>
  )
}

function StatListImpl() {
  const { view } = useGame()
  const words = useWords()
  const list = usePart('stats', 'grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm')
  const row = usePart('stat', 'contents')
  const label = usePart('stat-label', 'text-muted-foreground')
  const value = usePart('stat-value', 'text-right font-medium tabular-nums')
  const levelPart = usePart('stat-level', 'ml-1.5 text-xs text-muted-foreground')
  const progressPart = usePart('stat-progress', 'col-span-2 h-1 overflow-hidden rounded-full bg-muted [&>span]:block [&>span]:h-full [&>span]:bg-primary')
  if (!view.stats.length) return null
  return (
    <dl {...list}>
      {view.stats.map((stat) => {
        const level = stat.level
        const percent = level ? Math.round(level.progress * 100) : 0
        return (
          <div key={stat.key} {...row} data-stat={stat.key}>
            <dt {...label}>
              {stat.label}
              {level ? (
                <span {...levelPart} data-level={level.level}>
                  {words('statLevel', { level: level.level })}
                </span>
              ) : null}
            </dt>
            <dd {...value}>{stat.text}</dd>
            {stat.ui?.display === 'bar' || stat.ui?.display === 'pips' ? <StatGauge stat={stat} /> : null}
            {level && level.next !== null ? (
              <dd
                {...progressPart}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                aria-label={words('statProgress', { label: stat.label, percent, next: level.level + 1 })}
              >
                <span style={{ width: `${percent}%` }} />
              </dd>
            ) : null}
          </div>
        )
      })}
    </dl>
  )
}

/**
 * The stats the game lists, with their values written as the game formats them.
 * A stat with levels also shows its level and a bar towards the next one. A
 * stat whose `ui.display` hint is `'bar'` gets a bar from its `min` to its
 * `max` under it, and one with `'pips'` a row of pips, one per point (a bar
 * past 20).
 */
export const StatList = overridable('StatList', StatListImpl)
