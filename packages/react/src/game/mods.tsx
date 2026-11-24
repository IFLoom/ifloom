import type { InstalledMod } from '@ifloom/engine'
import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/** What `useMods` gives a mod manager. */
export type ModsState = {
  /** False when the provider was given no `mods`. */
  available: boolean
  /** The mods the player has added. */
  list: InstalledMod[]
  /** Add a mod from a file. True if it was added; otherwise `message` says why. */
  add: (file: File) => Promise<boolean>
  /** Turn a mod on or off. */
  toggle: (id: string) => Promise<void>
  /** Remove a mod. */
  remove: (id: string) => Promise<void>
  /** Whether anything changed since the game was built, so a restart would differ. */
  changed: boolean
  /** Build the game again with the mods as they are now: the provider's `onChange`. Undefined if it gave none. */
  restart: (() => void) | undefined
  /** The problems the loader found in one mod. */
  problemsFor: (id: string) => string[]
  /** Why the last file could not be added, or the mods could not be read or changed, or null. */
  message: string | null
}

/** The mod manager without the look: the list, adding, toggling and removing, and restarting. Needs `mods` on the provider. */
export function useMods(): ModsState {
  const { mods } = useGame()
  const [list, setList] = useState<InstalledMod[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [changed, setChanged] = useState(false)
  const refresh = useCallback(async () => {
    if (!mods) return setList([])
    const listed = await mods.store.list()
    if (listed.ok) setList(listed.value)
    else setMessage(listed.reason)
  }, [mods])
  useEffect(() => {
    void refresh()
  }, [refresh])
  const after = async () => {
    await refresh()
    setChanged(true)
  }
  return {
    available: Boolean(mods),
    list,
    async add(file) {
      if (!mods) return false
      const added = await mods.store.add(await file.text())
      setMessage(added.ok ? null : added.reason)
      if (!added.ok) return false
      await after()
      return true
    },
    async toggle(id) {
      const mod = list.find((each) => each.id === id)
      if (!mods || !mod) return
      const changed = await mods.store.setEnabled(id, !mod.enabled)
      setMessage(changed.ok ? null : changed.reason)
      if (changed.ok) await after()
    },
    async remove(id) {
      if (!mods) return
      const removed = await mods.store.remove(id)
      setMessage(removed.ok ? null : removed.reason)
      if (removed.ok) await after()
    },
    changed,
    restart: mods?.onChange,
    problemsFor: (id) => (mods?.problems ?? []).filter((problem) => problem.startsWith(`mod:${id} `)),
    message,
  }
}

function ModManagerImpl({ className }: { className?: string }) {
  const words = useWords()
  const mods = useMods()
  const section = usePart('mods', 'flex flex-col gap-3 text-sm', className)
  const fileButton = usePart('file-button', 'inline-flex w-fit cursor-pointer items-center rounded-md border px-3 py-1.5 text-xs')
  const said = usePart('mods-message', 'text-destructive')
  const row = usePart('mod', 'flex flex-col gap-1 rounded-lg border p-2')
  const name = usePart('mod-name', 'flex-1 font-medium')
  const version = usePart('mod-version', 'text-muted-foreground')
  const onButton = usePart('mod-state', buttonVariants({ size: 'sm', variant: 'default' }))
  const offButton = usePart('mod-state', buttonVariants({ size: 'sm', variant: 'outline' }))
  const removeButton = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const text = usePart('mod-text', 'text-muted-foreground')
  const problem = usePart('mod-problem', 'text-xs text-destructive')
  const empty = usePart('mods-empty', 'text-muted-foreground')
  const restartRow = usePart('mods-restart', 'flex flex-wrap items-center gap-2')
  const changed = usePart('mods-changed', 'text-muted-foreground')
  const restart = usePart('button', buttonVariants({ size: 'sm' }))
  if (!mods.available) return null
  const add = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) await mods.add(file)
  }
  return (
    <section {...section} data-mods>
      <label {...fileButton}>
        {words('addMod')}
        <input type="file" accept="application/json,.json" className="sr-only" onChange={add} />
      </label>
      {mods.message ? <p {...said}>{mods.message}</p> : null}
      {mods.list.length ? (
        <ul className="flex flex-col gap-2">
          {mods.list.map((mod) => (
            <li key={mod.id} {...row} data-mod={mod.id}>
              <div className="flex flex-wrap items-center gap-2">
                <p {...name}>
                  {mod.name}
                  {mod.version ? <span {...version}> {mod.version}</span> : null}
                </p>
                <button {...(mod.enabled ? onButton : offButton)} aria-pressed={mod.enabled} onClick={() => void mods.toggle(mod.id)}>
                  {mod.enabled ? words('modOn') : words('modOff')}
                </button>
                <button {...removeButton} onClick={() => void mods.remove(mod.id)}>
                  {words('remove')}
                </button>
              </div>
              {mod.description ? <p {...text}>{mod.description}</p> : null}
              {mods.problemsFor(mod.id).map((each) => (
                <p key={each} {...problem}>
                  {each}
                </p>
              ))}
            </li>
          ))}
        </ul>
      ) : (
        <p {...empty}>{words('noMods')}</p>
      )}
      {mods.changed && mods.restart ? (
        <div {...restartRow} role="status">
          <p {...changed}>{words('modsChanged')}</p>
          <button {...restart} onClick={mods.restart}>
            {words('applyMods')}
          </button>
        </div>
      ) : null}
    </section>
  )
}

/**
 * The mod manager: the mods the player has added, each on or off or removed,
 * and adding one from a file. Mods change the game itself, so a change takes
 * effect when the game is built again — `onChange` is where the game does that,
 * usually by reloading the page. Problems the loader found in a mod are listed
 * under it, and once anything has changed, a line saying a restart applies it
 * and the button that does. Needs `mods` on the provider. It's in the menu,
 * and on the settings page when the game has pages. `useMods` is the same
 * without the look.
 */
export const ModManager = overridable('ModManager', ModManagerImpl)
