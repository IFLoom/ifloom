'use client'
/**
 * The editor at /editor: the project switcher across the top, then the
 * outline, the form for what's selected, and the preview and problems.
 * Projects live in IndexedDB, opened only once the page is in a browser.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fileName, fromJson, toJson, toTypeScript } from '../lib/exporters'
import { problemsOf } from '../lib/game'
import { duplicateProject, newItem, newProject, newScene, newStat, sampleProject, type Project } from '../lib/model'
import { problemTarget, type Thing } from '../lib/references'
import { projectStore, type ProjectStore } from '../lib/store'
import { EditorContext, namesOf, type EditorContextValue, type Selection } from './context'
import { Outline } from './Outline'
import { SelectedForm } from './forms/SelectedForm'
import { RightPane } from './RightPane'
import { Button, cx, inputClass } from './ui'

const CURRENT = 'ifloom.editor.current'

function remembered(): string | null {
  try {
    return localStorage.getItem(CURRENT)
  } catch {
    return null
  }
}

function remember(id: string) {
  try {
    localStorage.setItem(CURRENT, id)
  } catch {
    // Not remembered this time; the newest project opens instead.
  }
}

/** A download made from text, through a Blob URL. */
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function EditorApp() {
  const [store, setStore] = useState<ProjectStore | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [selection, setSelection] = useState<Selection>({ thing: 'project' })
  const [message, setMessage] = useState<string | null>(null)
  const [playing, setPlaying] = useState<{ scene: string; nonce: number } | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  // Open the store and the last project, or make the sample the first time.
  useEffect(() => {
    if (typeof indexedDB === 'undefined') {
      setUnavailable(true)
      setProject(sampleProject())
      return
    }
    const opened = projectStore(indexedDB)
    opened
      .list()
      .then(async (list) => {
        let all = list
        if (!all.length) {
          const first = sampleProject()
          await opened.put(first)
          all = [first]
        }
        const wanted = remembered()
        setStore(opened)
        setProjects(all)
        open(all.find((p) => p.id === wanted) ?? all[0])
      })
      .catch(() => {
        // Private windows can refuse IndexedDB: the editor still works, without keeping drafts.
        setUnavailable(true)
        setProject(sampleProject())
      })
  }, [])

  function open(next: Project) {
    setProject(next)
    setSelection(next.intro ? { thing: 'scene', id: next.intro } : { thing: 'project' })
    remember(next.id)
  }

  // Keep the draft: a moment after the last change, it goes into IndexedDB.
  const saving = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    if (!store || !project) return
    clearTimeout(saving.current)
    saving.current = setTimeout(() => {
      store.put(project).catch(() => setMessage('This draft could not be saved in the browser.'))
      setProjects((list) => [project, ...list.filter((p) => p.id !== project.id)])
    }, 400)
    return () => clearTimeout(saving.current)
  }, [store, project])

  const update = useCallback((change: (draft: Project) => void) => {
    setProject((current) => {
      if (!current) return current
      const draft = structuredClone(current)
      change(draft)
      draft.updated = Date.now()
      return draft
    })
  }, [])

  const create = useCallback(
    (thing: Thing, id: string) =>
      update((draft) => {
        if (thing === 'scene' && !draft.pack.scenes.some((s) => s.id === id)) {
          draft.pack.scenes.push(newScene(id))
          draft.pack.prose[id] ??= ''
        }
        if (thing === 'stat' && !draft.pack.stats.some((s) => s.id === id)) draft.pack.stats.push(newStat(id))
        if (thing === 'item' && !draft.pack.items.some((i) => i.id === id)) draft.pack.items.push(newItem(id))
        if (thing === 'variable' && !draft.variables.some((v) => v.name === id)) draft.variables.push({ name: id, note: '' })
      }),
    [update],
  )

  const problems = useMemo(() => (project ? problemsOf(project) : []), [project])

  const context = useMemo<EditorContextValue | null>(
    () =>
      project && {
        project,
        update,
        replace: (next) => setProject({ ...next, updated: Date.now() }),
        selection,
        select: setSelection,
        create,
        names: namesOf(project),
        problems,
        targets: problems.map((p) => problemTarget(project.pack, p)),
        playFrom: (scene) => setPlaying({ scene, nonce: Date.now() }),
      },
    [project, update, selection, create, problems],
  )

  async function switchTo(next: Project) {
    if (store) await store.put(next)
    setProjects((list) => [next, ...list.filter((p) => p.id !== next.id)])
    open(next)
  }

  async function remove() {
    if (!project || !confirm(`Delete “${project.title}”? This can't be undone.`)) return
    await store?.remove(project.id)
    const rest = projects.filter((p) => p.id !== project.id)
    if (rest.length) {
      setProjects(rest)
      open(rest[0])
    } else {
      await switchTo(newProject())
      setProjects((list) => list.filter((p) => p.id !== project.id))
    }
  }

  const importer = useRef<HTMLInputElement>(null)
  async function importFile(file: File) {
    const result = fromJson(await file.text())
    if ('error' in result) {
      setMessage(`${file.name}: ${result.error}`)
      return
    }
    await switchTo(result.project)
    const count = problemsOf(result.project).length
    setMessage(count ? `Imported ${file.name}. checkGame found ${count} problem${count === 1 ? '' : 's'}: see Problems.` : `Imported ${file.name}.`)
  }

  if (!context || !project) return <div className="p-8 text-sm text-fd-muted-foreground">Opening the editor…</div>

  return (
    <EditorContext.Provider value={context}>
      <div className="flex h-[calc(100dvh-3.5rem)] min-h-[32rem] flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-fd-border px-4 py-2">
          <select
            className={cx(inputClass, 'w-auto max-w-56 font-medium')}
            aria-label="Project"
            value={project.id}
            onChange={(event) => {
              const next = projects.find((p) => p.id === event.target.value)
              if (next) open(next)
            }}
          >
            {(projects.some((p) => p.id === project.id) ? projects : [project, ...projects]).map((p) => (
              <option key={p.id} value={p.id}>
                {p.id === project.id ? project.title : p.title}
              </option>
            ))}
          </select>
          <span className="hidden md:contents">
            <Button onClick={() => switchTo(newProject())}>New</Button>
            <Button onClick={() => switchTo(duplicateProject(project))}>Duplicate</Button>
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
            <span className="mx-1 h-5 w-px bg-fd-border" aria-hidden="true" />
            <Button onClick={() => importer.current?.click()}>Import JSON</Button>
            <input
              ref={importer}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) importFile(file)
                event.target.value = ''
              }}
            />
            <Button onClick={() => download(fileName(project, 'ts'), toTypeScript(project), 'text/typescript')}>Export TS</Button>
            <Button onClick={() => download(fileName(project, 'json'), toJson(project), 'application/json')}>Export JSON</Button>
          </span>
          <span className="ms-auto text-xs text-fd-muted-foreground">{unavailable ? 'Drafts aren’t kept in this browser.' : 'Drafts are kept in this browser.'}</span>
        </header>
        {message ? (
          <div role="status" className="flex items-center justify-between gap-2 border-b border-fd-border bg-fd-muted px-4 py-1.5 text-sm">
            <span>{message}</span>
            <Button size="xs" variant="ghost" onClick={() => setMessage(null)}>
              Dismiss
            </Button>
          </div>
        ) : null}
        <p className="border-b border-fd-border px-4 py-2 text-sm text-fd-muted-foreground md:hidden">
          The editor needs a wider screen. On a phone you can play the preview.
        </p>
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[13rem_minmax(0,1fr)_minmax(18rem,40%)] lg:grid-cols-[14rem_minmax(0,1fr)_minmax(22rem,38%)]">
          <Pane className="hidden border-e p-3 md:flex">
            <Outline />
          </Pane>
          <Pane className="hidden border-e p-3 md:flex" label="Form">
            <SelectedForm />
          </Pane>
          <Pane className="flex">
            <RightPane playing={playing} />
          </Pane>
        </div>
      </div>
    </EditorContext.Provider>
  )
}

function Pane({ className, children, label }: { className?: string; children: ReactNode; label?: string }) {
  return (
    <div aria-label={label} className={cx('min-h-0 flex-col overflow-y-auto border-fd-border', className)}>
      {children}
    </div>
  )
}
