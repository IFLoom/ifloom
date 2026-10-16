'use client'
/**
 * The right pane: the preview, which plays the project with the real React
 * UI in a frame, and the problems `checkGame` finds, each a link to the form
 * it concerns.
 */
import { useEffect, useRef, useState } from 'react'
import { THEMES } from '../lib/model'
import { PREVIEW_READY, type PreviewMessage } from '../lib/preview'
import { useEditor } from './context'
import { Button, Select, cx } from './ui'
import { basePath } from '@/lib/shared'

type Tab = 'preview' | 'problems'

export function RightPane({ playing }: { playing: { scene: string; nonce: number } | null }) {
  const { problems } = useEditor()
  const [tab, setTab] = useState<Tab>('preview')
  useEffect(() => {
    if (playing) setTab('preview')
  }, [playing])
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div role="tablist" aria-label="Preview and problems" className="flex gap-1 border-b border-fd-border px-3 pt-2">
        {(['preview', 'problems'] as const).map((name) => (
          <button
            key={name}
            role="tab"
            type="button"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={cx('-mb-px border-b-2 px-3 py-1.5 text-sm font-medium', tab === name ? 'border-fd-primary text-fd-primary' : 'border-transparent text-fd-muted-foreground hover:text-fd-foreground')}
          >
            {name === 'preview' ? 'Preview' : 'Problems'}
            {name === 'problems' ? (
              <span className={cx('ms-1.5 rounded-full px-1.5 text-xs', problems.length ? 'bg-red-500/15 text-red-700 dark:text-red-300' : 'bg-fd-secondary text-fd-muted-foreground')}>{problems.length}</span>
            ) : null}
          </button>
        ))}
      </div>
      {/* The preview stays mounted under the problems, so the game keeps its place. */}
      <div className={cx('min-h-0 flex-1 flex-col', tab === 'preview' ? 'flex' : 'hidden')}>
        <Preview playing={playing} />
      </div>
      {tab === 'problems' ? <Problems /> : null}
    </div>
  )
}

/** Whether the docs are in dark mode, following the theme switch. */
function useDark(): boolean {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const read = () => setDark(root.classList.contains('dark'))
    read()
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return dark
}

function Preview({ playing }: { playing: { scene: string; nonce: number } | null }) {
  const { project, update, names } = useEditor()
  const frame = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const dark = useDark()
  const restart = useRef(true)

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin === location.origin && event.source === frame.current?.contentWindow && event.data?.type === PREVIEW_READY) {
        restart.current = true
        setReady(true)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Send the project a moment after it changes, so typing doesn't rebuild the game on every key.
  useEffect(() => {
    if (!ready) return
    const timer = setTimeout(() => {
      const message: PreviewMessage = { type: 'ifloom-preview', project, restart: restart.current, dark }
      restart.current = false
      frame.current?.contentWindow?.postMessage(message, location.origin)
    }, 250)
    return () => clearTimeout(timer)
  }, [ready, project, dark])

  function startAgain(at?: string | null) {
    restart.current = true
    if (at !== undefined) update((draft) => void (draft.preview.start = at))
    else update(() => {})
  }

  useEffect(() => {
    if (playing) startAgain(playing.scene)
    // Only when "Play from here" is pressed.
  }, [playing])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-fd-border px-3 py-2">
        <label className="flex items-center gap-1 whitespace-nowrap text-xs text-fd-muted-foreground">
          Start at
          <Select
            aria-label="Start the preview at"
            value={project.preview.start ?? ''}
            options={[{ value: '', label: project.intro ? `The intro (${project.intro})` : 'The intro' }, ...names.scenes.map((id) => ({ value: id, label: id }))]}
            onChange={(id) => startAgain(id || null)}
          />
        </label>
        <label className="flex items-center gap-1 whitespace-nowrap text-xs text-fd-muted-foreground">
          Theme
          <Select aria-label="Theme preset" value={project.preview.theme} options={THEMES} onChange={(theme) => update((draft) => void (draft.preview.theme = theme))} />
        </label>
        <Button size="xs" variant="primary" className="ms-auto" onClick={() => startAgain()}>
          Restart
        </Button>
      </div>
      <iframe ref={frame} title="Preview" src={`${basePath}/editor/preview/`} className="min-h-0 w-full flex-1" />
    </div>
  )
}

function Problems() {
  const { problems, targets, select } = useEditor()
  if (!problems.length) {
    return <p className="p-4 text-sm text-fd-muted-foreground">checkGame finds nothing wrong with this pack.</p>
  }
  return (
    <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto p-3" aria-label="Problems">
      {problems.map((problem, i) => {
        const target = targets[i]
        const where = target.thing === 'project' ? problem.where : `${target.thing} ${target.id}${target.choice ? ` · choice ${target.choice}` : ''}`
        return (
          <li key={i}>
            <button
              type="button"
              className="flex w-full flex-col items-start rounded-md border border-fd-border px-3 py-2 text-left hover:bg-fd-accent"
              onClick={() =>
                select(
                  target.thing === 'project'
                    ? { thing: 'project', field: target.field }
                    : { thing: target.thing, id: target.id, choice: target.choice, field: target.field },
                )
              }
            >
              <span className="font-mono text-xs text-fd-muted-foreground">{where}</span>
              <span className="text-sm">{problem.what}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
