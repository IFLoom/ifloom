import type { InstalledMod } from '@ifloom/engine'
import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { Button } from '../components/ui/button.tsx'
import { cn } from '../lib/utils.ts'
import { useGame } from './context.tsx'
import { useWords } from './words.ts'

/**
 * The mod manager: the mods the player has added, each on or off or removed,
 * and adding one from a file. Mods change the game itself, so a change takes
 * effect when the game is built again — `onChange` is where the game does that,
 * usually by reloading the page. Problems the loader found in a mod are listed
 * under it. Needs `mods` on the provider.
 */
export function ModManager({ className }: { className?: string }) {
  const { mods } = useGame()
  const words = useWords()
  const [list, setList] = useState<InstalledMod[]>([])
  const [said, setSaid] = useState<string | null>(null)
  const [changed, setChanged] = useState(false)
  const refresh = useCallback(async () => setList(mods ? await mods.store.list() : []), [mods])
  useEffect(() => {
    void refresh()
  }, [refresh])
  if (!mods) return null
  const after = async () => {
    await refresh()
    setChanged(true)
  }
  const add = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const added = await mods.store.add(await file.text())
    setSaid(typeof added === 'string' ? added : null)
    if (typeof added !== 'string') await after()
  }
  return (
    <section className={cn('flex flex-col gap-3 text-sm', className)} data-mods>
      <label className="inline-flex w-fit cursor-pointer items-center rounded-md border px-3 py-1.5 text-xs">
        {words('addMod')}
        <input type="file" accept="application/json,.json" className="sr-only" onChange={add} />
      </label>
      {said ? <p className="text-destructive">{said}</p> : null}
      {list.length ? (
        <ul className="flex flex-col gap-2">
          {list.map((mod) => {
            const problems = (mods.problems ?? []).filter((problem) => problem.startsWith(`mod:${mod.id} `))
            return (
              <li key={mod.id} className="flex flex-col gap-1 rounded-lg border p-2" data-mod={mod.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="flex-1 font-medium">
                    {mod.name}
                    {mod.version ? <span className="text-muted-foreground"> {mod.version}</span> : null}
                  </p>
                  <Button size="sm" variant={mod.enabled ? 'default' : 'outline'} onClick={async () => { await mods.store.setEnabled(mod.id, !mod.enabled); await after() }}>
                    {mod.enabled ? words('modOn') : words('modOff')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await mods.store.remove(mod.id); await after() }}>
                    {words('remove')}
                  </Button>
                </div>
                {mod.description ? <p className="text-muted-foreground">{mod.description}</p> : null}
                {problems.map((problem) => (
                  <p key={problem} className="text-xs text-destructive">{problem}</p>
                ))}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground">{words('noMods')}</p>
      )}
      {changed && mods.onChange ? (
        <Button size="sm" onClick={mods.onChange}>
          {words('applyMods')}
        </Button>
      ) : null}
    </section>
  )
}
