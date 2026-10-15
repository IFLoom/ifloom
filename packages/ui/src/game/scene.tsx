import type { SceneBeat } from '@ifloom/engine'
import { cn } from '../lib/utils.ts'
import { ChoiceList } from './choices.tsx'
import { useGame } from './context.tsx'
import { Picture } from './picture.tsx'

/** One beat of a scene's body: narration, a spoken line, a picture, a letter, a sign. */
export function Beat({ beat }: { beat: SceneBeat }) {
  switch (beat.kind) {
    case 'text':
      return <p className="leading-relaxed">{beat.text}</p>
    case 'mono':
      return <p className="font-mono text-sm leading-relaxed">{beat.text}</p>
    case 'say':
      return (
        <p className={cn('leading-relaxed', beat.who === 'player' ? 'pl-6 text-player-speech' : 'text-speech')}>{beat.text}</p>
      )
    case 'image':
      return (
        <Picture
          src={beat.src}
          alt={beat.alt ?? ''}
          className={cn('rounded-lg', beat.size === 'inline' ? 'max-w-sm' : 'w-full', beat.rotate && 'rotate-1')}
        />
      )
    case 'mail':
      return (
        <div className="rounded-lg border bg-card p-4 text-sm">
          {beat.headers.map((header) => (
            <p key={header.key} className="text-muted-foreground">
              {header.key}: {header.value}
            </p>
          ))}
          <p className="mt-2 whitespace-pre-wrap">{beat.body}</p>
        </div>
      )
    case 'prop':
      return (
        <div data-face={beat.face} className="rounded-lg border-2 border-dashed p-4 text-center font-medium">
          {beat.text}
        </div>
      )
  }
}

/**
 * The main panel: the scene on screen, or the room when none is. Its body, then
 * either the game's own panel for it or its choices.
 */
export function SceneStage({ className }: { className?: string }) {
  const { view, panels } = useGame()
  const scene = view.scene
  const Panel = scene.panel ? panels[scene.panel] : undefined
  return (
    <article className={cn('flex flex-col gap-4', className)} data-scene={scene.id ?? 'stage'}>
      <header className="flex items-center gap-3">
        {scene.speaker?.portrait ? (
          <Picture src={scene.speaker.portrait} alt="" className="size-12 rounded-full object-cover" />
        ) : null}
        <h2 className="text-2xl font-semibold">{scene.title}</h2>
      </header>
      {scene.stageImage ? <Picture src={scene.stageImage} alt="" className="mx-auto max-h-80 w-auto max-w-full rounded-xl object-contain" /> : null}
      <div className="flex flex-col gap-3">
        {scene.beats.map((beat, index) => (
          <Beat key={index} beat={beat} />
        ))}
      </div>
      {Panel ? <Panel data={scene.panelData} /> : <ChoiceList choices={scene.choices} />}
    </article>
  )
}
