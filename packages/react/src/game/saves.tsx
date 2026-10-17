import { nextSlot } from '@ifloom/browser'
import type { BrokenSave, LoadedSave, Result, SaveMeta } from '@ifloom/engine'
import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/** What `useSaves` gives a save menu. */
export type SavesState = {
  /** False when the runner was made without `saves`: there is nothing to list. */
  available: boolean
  /** Every save that can be read, newest first. */
  slots: SaveMeta[]
  /** Saves that are there but can't be read, with why. They can only be deleted. */
  broken: BrokenSave[]
  /** Read the slots again. */
  refresh: () => Promise<void>
  /** Save in a new slot (the next free number), with the player's `name` for it if given. True if it was written. */
  save: (name?: string) => Promise<boolean>
  /** Save over an existing slot. True if it was written. */
  overwrite: (slot: string) => Promise<boolean>
  /** Load a slot. True if it loaded. */
  load: (slot: string) => Promise<boolean>
  /** Delete a slot. */
  remove: (slot: string) => Promise<void>
  /** Download a slot as a `.json` file the player can keep. */
  exportFile: (slot: string) => Promise<void>
  /** Load a save from a file the player kept. True if it loaded. */
  importFile: (file: File) => Promise<boolean>
  /** Why the last save, load or import failed, or null. */
  message: string | null
  /** Packs the last loaded save was made with that this game doesn't have. */
  missingPacks: string[]
  /** Plugins the last loaded save was made with that this game doesn't have. */
  missingPlugins: string[]
}

/**
 * The save menu without the menu: the slots, and saving, loading, deleting,
 * exporting and importing them. Needs the runner made with `saves`.
 */
export function useSaves(): SavesState {
  const { runner, view } = useGame()
  const store = runner.saves
  const [listed, setListed] = useState<{ slots: SaveMeta[]; broken: BrokenSave[] }>({ slots: [], broken: [] })
  const { slots, broken } = listed
  const [message, setMessage] = useState<string | null>(null)
  const [missing, setMissing] = useState<{ packs: string[]; plugins: string[] }>({ packs: [], plugins: [] })
  const refresh = useCallback(async () => {
    const all = store ? await store.list() : []
    setListed({ slots: all.filter((entry): entry is SaveMeta => !('broken' in entry)), broken: all.filter((entry): entry is BrokenSave => 'broken' in entry) })
  }, [store])
  useEffect(() => {
    void refresh()
  }, [refresh, view])

  const loaded = (save: LoadedSave) => {
    setMessage(null)
    setMissing({ packs: save.missingPacks, plugins: save.missingPlugins })
  }
  const failed = (why: string) => {
    setMessage(why)
    setMissing({ packs: [], plugins: [] })
  }
  const written = async (result: Result<SaveMeta>) => {
    setMessage(result.ok ? null : result.reason)
    await refresh()
    return result.ok
  }
  const next = nextSlot([...slots, ...broken])

  return {
    available: Boolean(store),
    slots,
    broken,
    refresh,
    async save(name) {
      return written(await runner.save(next, name))
    },
    async overwrite(slot) {
      return written(await runner.save(slot))
    },
    async load(slot) {
      const result = await runner.load(slot)
      if (!result.ok) {
        failed(result.reason)
        return false
      }
      loaded(result.value)
      return true
    },
    async remove(slot) {
      if (!store) return
      await store.remove(slot)
      await refresh()
    },
    async exportFile(slot) {
      if (!store) return
      const text = await store.exportSlot(slot)
      if (text === null) return
      const game = slots.find((meta) => meta.slot === slot)?.game ?? runner.game.id
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
      link.download = `${game}-${slot}.json`
      link.click()
      // Let the download start before the link goes.
      setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    },
    async importFile(file) {
      if (!store) return false
      const result = store.importText(await file.text())
      if (!result.ok) {
        failed(result.reason)
        return false
      }
      runner.restore(result.value)
      loaded(result.value)
      return true
    },
    message,
    missingPacks: missing.packs,
    missingPlugins: missing.plugins,
  }
}

function SavesMenuImpl({ className, onLoaded }: { className?: string; onLoaded?: () => void }) {
  const words = useWords()
  const saves = useSaves()
  const section = usePart('saves', 'flex flex-col gap-3 text-sm', className)
  const actions = usePart('saves-actions', 'flex flex-wrap gap-2')
  const newButton = usePart('button', buttonVariants({ size: 'sm' }))
  const fileButton = usePart('file-button', 'inline-flex cursor-pointer items-center rounded-md border px-3 text-xs')
  const said = usePart('saves-message', 'text-destructive')
  const slot = usePart('save-slot', 'flex flex-wrap items-center gap-2 rounded-lg border p-2')
  const name = usePart('save-name', 'font-medium')
  const details = usePart('save-details', 'text-xs text-muted-foreground')
  const loadButton = usePart('button', buttonVariants({ size: 'sm' }))
  const outlineButton = usePart('button', buttonVariants({ size: 'sm', variant: 'outline' }))
  const ghostButton = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const empty = usePart('saves-empty', 'text-muted-foreground')
  if (!saves.available) return null

  const load = async (slotId: string) => {
    if (await saves.load(slotId)) onLoaded?.()
  }
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && (await saves.importFile(file))) onLoaded?.()
  }
  const notes = [
    ...(saves.message ? [saves.message] : []),
    ...(saves.missingPacks.length ? [words('missingPacks', { packs: saves.missingPacks.join(', ') })] : []),
    ...(saves.missingPlugins.length ? [words('missingPlugins', { plugins: saves.missingPlugins.join(', ') })] : []),
  ]

  return (
    <section {...section} data-saves>
      <div {...actions}>
        <button {...newButton} onClick={() => void saves.save()}>
          {words('saveNew')}
        </button>
        <label {...fileButton}>
          {words('importSave')}
          <input type="file" accept="application/json,.json" className="sr-only" onChange={importFile} />
        </label>
      </div>
      {notes.length ? <p {...said}>{notes.join(' ')}</p> : null}
      {saves.slots.length || saves.broken.length ? (
        <ul className="flex flex-col gap-2">
          {saves.slots.map((meta) => (
            <li key={meta.slot} {...slot} data-save-slot={meta.slot}>
              <div className="flex-1">
                <p {...name}>{meta.name}</p>
                <p {...details}>{new Date(meta.savedAt).toLocaleString()}</p>
              </div>
              <button {...loadButton} onClick={() => void load(meta.slot)}>
                {words('load')}
              </button>
              <button {...outlineButton} onClick={() => void saves.overwrite(meta.slot)}>
                {words('save')}
              </button>
              <button {...outlineButton} onClick={() => void saves.exportFile(meta.slot)}>
                {words('exportSave')}
              </button>
              <button {...ghostButton} onClick={() => void saves.remove(meta.slot)}>
                {words('remove')}
              </button>
            </li>
          ))}
          {saves.broken.map((save) => (
            <BrokenSlot key={save.slot} save={save} onRemove={(slot) => void saves.remove(slot)} />
          ))}
        </ul>
      ) : (
        <p {...empty}>{words('noSaves')}</p>
      )}
    </section>
  )
}

/** A save that can't be read: what's wrong with it, and a button to delete it. */
export function BrokenSlot({ save, onRemove }: { save: BrokenSave; onRemove: (slot: string) => void }) {
  const words = useWords()
  const slot = usePart('save-slot', 'flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2')
  const name = usePart('save-name', 'font-medium')
  const details = usePart('save-details', 'text-xs text-muted-foreground')
  const ghostButton = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  return (
    <li {...slot} data-save-slot={save.slot} data-broken>
      <div className="flex-1">
        <p {...name}>{words('brokenSave')}</p>
        <p {...details}>{save.broken}</p>
      </div>
      <button {...ghostButton} onClick={() => onRemove(save.slot)}>
        {words('remove')}
      </button>
    </li>
  )
}

/**
 * The save and load menu: every slot newest first, to load, overwrite, delete
 * or export as a file; a save that can't be read, to delete; a new slot; and importing a file a player kept. Needs
 * the runner made with `saves`. Says plainly when a save was made with packs or
 * plugins this game doesn't have. `useSaves` is the same without the look.
 */
export const SavesMenu = overridable('SavesMenu', SavesMenuImpl)
