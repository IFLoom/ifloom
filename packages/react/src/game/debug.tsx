import type { Command } from '@ifloom/engine'
import { useState, type FormEvent } from 'react'
import { buttonVariants } from '../components/ui/button.tsx'
import { ScrollArea } from '../components/ui/scroll-area.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/** The debug plugin's view, as the UI reads it. */
type DebugData = { locks: { reason: string; deny: string[] }[]; fired: Record<string, number>; seed: number }

/** A one-line form that sends a debug command built from what was typed. */
function CommandForm({ label, fields, build }: { label: string; fields: string[]; build: (values: string[]) => Command }) {
  const { send } = useGame()
  const words = useWords()
  const [values, setValues] = useState(fields.map(() => ''))
  const form = usePart('debug-form', 'flex flex-wrap items-center gap-2 text-sm')
  const name = usePart('debug-label', 'w-20 font-medium')
  const input = usePart('debug-field', 'h-8 w-28 rounded-md border bg-background px-2')
  const button = usePart('button', buttonVariants({ size: 'sm' }))
  const error = usePart('debug-error', 'text-destructive')
  const [said, setSaid] = useState<string | null>(null)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const out = send(build(values))
    setSaid(out.ok ? null : (out.reason ?? null))
  }
  return (
    <form {...form} onSubmit={submit}>
      <span {...name}>{label}</span>
      {fields.map((field, index) => (
        <input
          {...input}
          key={field}
          aria-label={`${label} ${field}`}
          placeholder={field}
          value={values[index]}
          onChange={(event) => setValues(values.map((value, at) => (at === index ? event.target.value : value)))}
        />
      ))}
      <button {...button} type="submit">
        {words('set')}
      </button>
      {said ? <span {...error}>{said}</span> : null}
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

function DebugCardImpl({ className }: { className?: string }) {
  const { runner, view, send } = useGame()
  const words = useWords()
  const panel = usePart('debug', 'flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm', className)
  const header = usePart('debug-header', 'flex items-center gap-2')
  const title = usePart('debug-title', 'font-heading font-semibold')
  const seed = usePart('debug-seed', 'text-xs text-muted-foreground')
  const step = usePart('button', buttonVariants({ size: 'sm', variant: 'outline' }))
  const closeScene = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const setSection = usePart('debug-section', 'flex flex-col gap-2')
  const section = usePart('debug-section', '')
  const heading = usePart('debug-heading', 'font-medium')
  const locks = usePart('debug-list', 'mb-2 list-disc pl-5')
  const list = usePart('debug-list', 'list-disc pl-5')
  const state = usePart('debug-state', 'text-xs')
  const log = usePart('debug-log', 'list-decimal pl-5 font-mono text-xs')
  const data = view.plugins.debug as DebugData | undefined
  if (!data) return null
  const debug = (name: string, args: Record<string, unknown>): Command => ({ type: 'custom', name: `debug/${name}`, with: args })
  const greyed = [
    ...view.actions,
    ...view.scene.choices,
    ...((view.plugins.cast as { present?: { actions: typeof view.actions }[] } | undefined)?.present ?? []).flatMap((person) => person.actions),
  ].filter((choice) => choice.disabled)
  return (
    <section {...panel} data-debug>
      <div {...header}>
        <h3 {...title}>{words('debug')}</h3>
        <span {...seed}>{words('seed', { seed: data.seed })}</span>
        <div className="ml-auto flex gap-1">
          <button type="button" {...step} disabled={!runner.canUndo} onClick={() => runner.undo()}>
            {words('undo')}
          </button>
          <button type="button" {...step} disabled={!runner.canRedo} onClick={() => runner.redo()}>
            {words('redo')}
          </button>
        </div>
      </div>
      <Tabs defaultValue="set">
        <TabsList>
          <TabsTrigger value="set">{words('debugSet')}</TabsTrigger>
          <TabsTrigger value="why">{words('debugWhy')}</TabsTrigger>
          <TabsTrigger value="state">{words('debugState')}</TabsTrigger>
          <TabsTrigger value="log">{words('debugLog')}</TabsTrigger>
        </TabsList>
        <TabsContent value="set" {...setSection}>
          <CommandForm label={words('debugStat')} fields={['stat', 'value']} build={([stat, to]) => debug('stat', { stat, to: num(to) })} />
          <CommandForm label={words('debugKv')} fields={['key', 'to']} build={([key, to]) => debug('kv', { key, to: parse(to) })} />
          <CommandForm label={words('debugItem')} fields={['item', 'count']} build={([item, count]) => debug('item', { item, count: num(count) })} />
          <CommandForm
            label={words('debugStatOf')}
            fields={['stat', 'of', 'value']}
            build={([stat, of, to]) => debug('stat', { stat, of, to: num(to) })}
          />
          {view.plugins.places ? <CommandForm label={words('debugGo')} fields={['location']} build={([location]) => debug('go', { location })} /> : null}
          <CommandForm label={words('debugScene')} fields={['scene']} build={([scene]) => debug('scene', { scene: scene || undefined })} />
          {view.plugins.calendar ? (
            <CommandForm
              label={words('debugTime')}
              fields={['day', 'period']}
              build={([day, period]) => debug('time', { day: day === '' ? undefined : num(day), period: period || undefined })}
            />
          ) : null}
          <CommandForm label={words('debugTurn')} fields={['turn']} build={([turn]) => debug('turn', { turn: num(turn) })} />
          <button type="button" {...closeScene} onClick={() => send(debug('scene', {}))}>
            {words('closeScene')}
          </button>
        </TabsContent>
        <TabsContent value="why" {...section}>
          <h4 {...heading}>{words('locksOn')}</h4>
          <ul {...locks}>
            {data.locks.length ? data.locks.map((lock, index) => <li key={index}>{lock.reason} ({lock.deny.join(', ')})</li>) : <li>{words('noneOn')}</li>}
          </ul>
          <h4 {...heading}>{words('greyedOut')}</h4>
          <ul {...list}>
            {greyed.length ? greyed.map((choice) => <li key={choice.id}>{choice.label}: {choice.disabled}</li>) : <li>{words('nothingGreyed')}</li>}
          </ul>
        </TabsContent>
        <TabsContent value="state" {...section}>
          <ScrollArea className="h-64">
            <pre {...state}>{JSON.stringify(runner.state, null, 2)}</pre>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="log" {...section}>
          <ScrollArea className="h-64">
            <ol {...log}>
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

/**
 * The debug card, for a game built with `@ifloom/plugin-debug`: set things by
 * hand, see the locks that are on and every greyed-out button's reason, read
 * the state and the command log, step back and forward. Draws nothing in a
 * game built without the plugin.
 */
export const DebugCard = overridable('DebugCard', DebugCardImpl)
