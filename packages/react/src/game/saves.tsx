import type { SaveMeta } from '@ifloom/engine'
import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { Button } from '../components/ui/button.tsx'
import { cn } from '../lib/utils.ts'
import { useGame } from './context.tsx'
import { useWords } from './words.ts'

/**
 * The save and load menu: every slot newest first, to load, overwrite, delete
 * or export as a file; a new slot; and importing a file a player kept. Needs
 * the runner made with `saves`. Says plainly when a save was made with packs or
 * plugins this game doesn't have.
 */
export function SavesMenu({ className, onLoaded }: { className?: string; onLoaded?: () => void }) {
  const { runner, view } = useGame()
  const words = useWords()
  const store = runner.saves
  const [slots, setSlots] = useState<SaveMeta[]>([])
  const [said, setSaid] = useState<string | null>(null)
  const refresh = useCallback(async () => setSlots(store ? await store.list() : []), [store])
  useEffect(() => {
    void refresh()
  }, [refresh, view])
  if (!store) return null

  const warn = (loaded: { missingPacks: string[]; missingPlugins: string[] }) => {
    const notes = [
      ...(loaded.missingPacks.length ? [words('missingPacks', { packs: loaded.missingPacks.join(', ') })] : []),
      ...(loaded.missingPlugins.length ? [words('missingPlugins', { plugins: loaded.missingPlugins.join(', ') })] : []),
    ]
    setSaid(notes.join(' ') || null)
  }
  const load = async (slot: string) => {
    const loaded = await runner.load(slot)
    if (typeof loaded === 'string') return setSaid(loaded)
    if (loaded) {
      warn(loaded)
      onLoaded?.()
    }
  }
  const exportSlot = async (meta: SaveMeta) => {
    const text = await store.exportSlot(meta.slot)
    if (text === null) return
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    link.download = `${meta.game}-${meta.slot}.json`
    link.click()
    // Let the download start before the link goes.
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const loaded = store.importText(await file.text())
    if (typeof loaded === 'string') return setSaid(loaded)
    runner.restore(loaded)
    warn(loaded)
    onLoaded?.()
  }
  const next = String(slots.filter((meta) => /^\d+$/.test(meta.slot)).reduce((most, meta) => Math.max(most, Number(meta.slot)), 0) + 1)

  return (
    <section className={cn('flex flex-col gap-3 text-sm', className)} data-saves>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={async () => { await runner.save(next); await refresh() }}>
          {words('saveNew')}
        </Button>
        <label className="inline-flex cursor-pointer items-center rounded-md border px-3 text-xs">
          {words('importSave')}
          <input type="file" accept="application/json,.json" className="sr-only" onChange={importFile} />
        </label>
      </div>
      {said ? <p className="text-destructive">{said}</p> : null}
      {slots.length ? (
        <ul className="flex flex-col gap-2">
          {slots.map((meta) => (
            <li key={meta.slot} className="flex flex-wrap items-center gap-2 rounded-lg border p-2" data-save-slot={meta.slot}>
              <div className="flex-1">
                <p className="font-medium">{meta.name}</p>
                <p className="text-xs text-muted-foreground">{new Date(meta.savedAt).toLocaleString()}</p>
              </div>
              <Button size="sm" onClick={() => void load(meta.slot)}>{words('load')}</Button>
              <Button size="sm" variant="outline" onClick={async () => { await runner.save(meta.slot); await refresh() }}>
                {words('save')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void exportSlot(meta)}>{words('exportSave')}</Button>
              <Button size="sm" variant="ghost" onClick={async () => { await store.remove(meta.slot); await refresh() }}>
                {words('remove')}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">{words('noSaves')}</p>
      )}
    </section>
  )
}
