import type { Command } from '@ifloom/engine'
import { useState, type FormEvent } from 'react'
import { Button } from '../components/ui/button.tsx'
import { ScrollArea } from '../components/ui/scroll-area.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.tsx'
import { cn } from '../lib/utils.ts'
import { useGame } from './context.tsx'
import { useWords } from './words.ts'

/** The debug plugin's view, as the UI reads it. */
type DebugData = { locks: { reason: string; deny: string[] }[]; fired: Record<string, number>; seed: number }

/** A one-line form that sends a debug command built from what was typed. */
function CommandForm({ label, fields, build }: { label: string; fields: string[]; build: (values: string[]) => Command }) {
  const { send } = useGame()
  const words = useWords()
  const [values, setValues] = useState(fields.map(() => ''))
  const [said, setSaid] = useState<string | null>(null)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const out = send(build(values))
    setSaid(out.ok ? null : (out.refused ?? null))
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 text-sm">
      <span className="w-20 font-medium">{label}</span>
      {fields.map((field, index) => (
        <input
          key={field}
          aria-label={`${label} ${field}`}
          placeholder={field}
          value={values[index]}
          onChange={(event) => setValues(values.map((value, at) => (at === index ? event.target.value : value)))}
          className="h-8 w-28 rounded-md border bg-background px-2"
        />
      ))}
      <Button size="sm" type="submit">
        {words('set')}
      </Button>
      {said ? <span className="text-destructive">{said}</span> : null}
    </form>
  )
}

/** A number box's value: empty is no number at all, so the command is refused rather than set to 0. */
function num(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value)
}

/** A typed value: numbers and true/false as themselves, anything else as a word. */
function parse(value: string): string | number | boolean {
  if (value === 'true' || value === 'false') return value === 'true'
  return value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : value
}

/**
 * The debug panel, for a game built with `@ifloom/plugin-debug`: set things by
 * hand, see the locks that are on and every greyed-out button's reason, read
 * the state and the command log, step back and forward. Draws nothing in a
 * game built without the plugin.
 */
export function DebugPanel({ className }: { className?: string }) {
  const { runner, view, send } = useGame()
  const words = useWords()
  const data = view.plugins.debug as DebugData | undefined
  if (!data) return null
  const debug = (name: string, args: Record<string, unknown>): Command => ({ type: 'custom', name: `debug/${name}`, with: args })
  const greyed = [
    ...view.actions,
    ...view.scene.choices,
    ...((view.plugins.cast as { present?: { actions: typeof view.actions }[] } | undefined)?.present ?? []).flatMap((person) => person.actions),
  ].filter((choice) => choice.disabled)
  return (
    <section className={cn('flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm', className)} data-debug>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{words('debug')}</h3>
        <span className="text-xs text-muted-foreground">{words('seed', { seed: data.seed })}</span>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="outline" disabled={!runner.canUndo} onClick={() => runner.undo()}>
            {words('undo')}
          </Button>
          <Button size="sm" variant="outline" disabled={!runner.canRedo} onClick={() => runner.redo()}>
            {words('redo')}
          </Button>
        </div>
      </div>
      <Tabs defaultValue="set">
        <TabsList>
          <TabsTrigger value="set">{words('debugSet')}</TabsTrigger>
          <TabsTrigger value="why">{words('debugWhy')}</TabsTrigger>
          <TabsTrigger value="state">{words('debugState')}</TabsTrigger>
          <TabsTrigger value="log">{words('debugLog')}</TabsTrigger>
        </TabsList>
        <TabsContent value="set" className="flex flex-col gap-2">
          <CommandForm label="Stat" fields={['stat', 'value']} build={([stat, to]) => debug('stat', { stat, to: num(to) })} />
          <CommandForm label="Variable" fields={['key', 'value']} build={([key, value]) => debug('variable', { key, value: parse(value) })} />
          <CommandForm label="Item" fields={['item', 'count']} build={([item, count]) => debug('item', { item, count: num(count) })} />
          <CommandForm
            label="Stat of"
            fields={['stat', 'of', 'value']}
            build={([stat, of, to]) => debug('stat', { stat, of, to: num(to) })}
          />
          {view.plugins.places ? <CommandForm label="Go" fields={['location']} build={([location]) => debug('go', { location })} /> : null}
          <CommandForm label="Scene" fields={['scene']} build={([scene]) => debug('scene', { scene: scene || undefined })} />
          {view.plugins.calendar ? (
            <CommandForm
              label="Time"
              fields={['day', 'period']}
              build={([day, period]) => debug('time', { day: day === '' ? undefined : num(day), period: period || undefined })}
            />
          ) : null}
          <CommandForm label="Turn" fields={['turn']} build={([turn]) => debug('turn', { turn: num(turn) })} />
          <Button size="sm" variant="ghost" onClick={() => send(debug('scene', {}))}>
            {words('closeScene')}
          </Button>
        </TabsContent>
        <TabsContent value="why">
          <h4 className="font-medium">{words('locksOn')}</h4>
          <ul className="mb-2 list-disc pl-5">
            {data.locks.length ? data.locks.map((lock, index) => <li key={index}>{lock.reason} ({lock.deny.join(', ')})</li>) : <li>{words('noneOn')}</li>}
          </ul>
          <h4 className="font-medium">{words('greyedOut')}</h4>
          <ul className="list-disc pl-5">
            {greyed.length ? greyed.map((choice) => <li key={choice.id}>{choice.label}: {choice.disabled}</li>) : <li>{words('nothingGreyed')}</li>}
          </ul>
        </TabsContent>
        <TabsContent value="state">
          <ScrollArea className="h-64">
            <pre className="text-xs">{JSON.stringify(runner.state, null, 2)}</pre>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="log">
          <ScrollArea className="h-64">
            <ol className="list-decimal pl-5 font-mono text-xs">
              {runner.log().commands.map((command, index) => (
                <li key={index}>{JSON.stringify(command)}</li>
              ))}
            </ol>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </section>
  )
}
