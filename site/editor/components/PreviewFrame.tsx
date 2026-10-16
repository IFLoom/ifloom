'use client'
/**
 * The page inside the editor's preview frame. The editor posts it the project,
 * and it runs the game with the real React UI, under the theme preset the
 * project picks. It has a document of its own, so the UI's styles and the
 * docs' never meet.
 */
import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { apply, createRunner, startingState, type Game, type GameState, type Runner } from '@ifloom/engine'
import { GameShell, type Components } from '@ifloom/react'
import { buildGame } from '../lib/game'
import type { Project } from '../lib/model'
import { PREVIEW_READY, type PreviewMessage } from '../lib/preview'

/** Media are paths only: each picture or video is a labelled box with its path. */
function Placeholder({ src, alt, kind }: { src?: unknown; alt?: string; kind: string }) {
  return (
    <span
      data-part="editor-placeholder"
      className="my-2 flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-current/30 p-3 text-center text-xs opacity-75"
    >
      <span className="font-semibold uppercase tracking-wide">{kind}</span>
      <code className="break-all">{String(src ?? '')}</code>
      {alt ? <span>{alt}</span> : null}
    </span>
  )
}

const components: Components = {
  Picture: ({ src, alt, className }: ComponentProps<'img'>) =>
    // A portrait or a placeholder too small to read is left out, as a missing file is.
    className?.includes('size-') ? null : <Placeholder src={src} alt={alt} kind="Picture" />,
  Video: ({ src }: { src: string }) => <Placeholder src={src} kind="Video" />,
}

/** A new game at the intro, or opened on one scene. */
function startAt(game: Game, scene: string | null): GameState {
  const fresh = startingState(game)
  if (!scene) return fresh
  const opened = apply(fresh, game, { type: 'scene', id: scene })
  return opened.ok ? opened.state : { ...fresh, sceneId: scene }
}

export function PreviewFrame() {
  const [runner, setRunner] = useState<Runner | null>(null)
  const [error, setError] = useState<string | null>(null)
  const current = useRef<Runner | null>(null)

  useEffect(() => {
    function onMessage(event: MessageEvent<PreviewMessage>) {
      if (event.origin !== location.origin || event.data?.type !== 'ifloom-preview') return
      const { project, restart, dark } = event.data
      document.documentElement.classList.toggle('dark', dark && project.preview.theme === 'default')
      setTheme(project)
      const built = buildGame(project as Project)
      if ('error' in built) {
        setError(built.error)
        return
      }
      setError(null)
      const game = built.game
      // Keep playing where the reader is, unless they asked to start again or that scene is gone.
      const before = current.current?.state
      const keep = !restart && before && (!before.sceneId || game.scenes.some((s) => s.id === before.sceneId))
      let state: GameState
      try {
        state = keep ? before : startAt(game, project.preview.start ?? project.intro)
        const next = createRunner(game, state, { history: true, backlog: true })
        current.current = next
        setRunner(next)
      } catch (caught) {
        setError((caught as Error).message)
      }
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: PREVIEW_READY }, location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (error) {
    return (
      <div className="p-6 font-body text-sm">
        <p className="font-semibold">The preview can’t start.</p>
        <p className="mt-2 text-muted-foreground">{error}</p>
      </div>
    )
  }
  if (!runner) return <div className="p-6 font-body text-sm text-muted-foreground">Starting the preview…</div>
  return <GameShell runner={runner} components={components} />
}

/** Link the preset's stylesheet, or none for the React UI's own look. */
function setTheme(project: Project) {
  const id = 'ifloom-preset'
  const theme = project.preview.theme
  let link = document.getElementById(id) as HTMLLinkElement | null
  if (theme === 'default') {
    link?.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    document.head.append(link)
  }
  const href = `/editor/preview/themes/${theme}.css`
  if (link.getAttribute('href') !== href) link.href = href
}
