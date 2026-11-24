import type { CSSProperties } from 'react'
import { useScene } from '@ifloom/react'

// Scene plays the screen's ui.transition and each block's ui.reveal itself. A scene component of your own keeps the
// same timing with useScene: the transition, the beats in runs with each run's reveal, and skip to show them all.
export function RevealedLines() {
  const { transition, groups, motion, pending, skip } = useScene()
  return (
    <article key={transition.key} data-transition-in={motion ? transition.in : undefined} style={{ '--ms': `${transition.ms}ms` } as CSSProperties}>
      {groups.map((group, at) => (
        <div
          key={at}
          data-reveal={motion && group.reveal ? group.reveal.as : undefined}
          style={group.reveal ? ({ '--at': `${group.reveal.at}ms` } as CSSProperties) : undefined}
        >
          {group.beats.map(({ beat, index }) => (beat.type === 'text' || beat.type === 'say' ? <p key={index}>{beat.text}</p> : null))}
        </div>
      ))}
      {pending ? <button onClick={skip}>Show all</button> : null}
    </article>
  )
}
