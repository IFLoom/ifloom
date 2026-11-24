/**
 * @ifloom/plugin-debug/react: the debug plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `debugUi` in the game's `plugins`
 * to have the debug card at the end of the story in a game built with the
 * debug plugin, or draw it yourself from `useDebug`.
 */
import type { Command, CommandRef, GameState, RenderedChoice } from '@ifloom/engine'
import { debug, type DebugView } from '../index.ts'
import { useState, type SyntheticEvent, type ComponentProps } from 'react'
import {
  buttonVariants,
  overridable,
  type Override,
  pluginKit,
  type PluginUi,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useGame,
  usePart,
  usePlugin,
} from '@ifloom/react'

/** The debug plugin's words, in English. A game rewords any with `ui.<key>` in its strings. */
export const DEBUG_WORDS = {
  closeScene: 'Close the scene',
  debug: 'Debug',
  debugGo: 'Go',
  debugHeld: 'Held',
  debugKv: 'kv key',
  debugLog: 'Log',
  debugScene: 'Scene',
  debugSet: 'Set',
  debugStat: 'Stat',
  debugStatOf: 'Stat of',
  debugState: 'State',
  debugTime: 'Time',
  debugTurn: 'Turn',
  debugWhy: 'Why not',
  greyedOut: 'Greyed out',
  locksOn: 'Locks on',
  noneOn: 'None.',
  nothingGreyed: 'Nothing.',
  seed: 'seed {seed}',
  set: 'Set',
} as const

/** The debug plugin's UI, declared once: its id and its words, for `usePlugin` and `debugUi`. */
const DEBUG = pluginKit('debug', DEBUG_WORDS)

declare module '@ifloom/react' {
  interface OverridableComponents {
    DebugCard: Override<ComponentProps<typeof DebugCard>>
  }
  interface PartNames {
    'debug': true
    'debug-error': true
    'debug-field': true
    'debug-form': true
    'debug-header': true
    'debug-heading': true
    'debug-label': true
    'debug-list': true
    'debug-log': true
    'debug-section': true
    'debug-seed': true
    'debug-state': true
    'debug-title': true
  }
}

/**
 * What `useDebug` returns: the debug plugin's view, what's greyed out, the
 * state and the log, and undo and redo. Its commands are the plugin's
 * helpers, sent with `useGame().send`: `send(debug.stat('coins', 50))`.
 */
export type DebugControls = DebugView & {
  /** Every greyed-out button on screen: the actions, the scene's choices and each person's buttons. */
  greyed: RenderedChoice[]
  /** The whole game state. */
  state: GameState
  /** The commands run since the start, in order. */
  log: Command[]
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
}

/** The debug plugin's view with its commands, or null in a game without the plugin. `DebugCard` is drawn from it. */
export function useDebug(): DebugControls | null {
  const { runner, view, snapshot } = useGame()
  const data = usePlugin(DEBUG).view
  if (!data) return null
  const greyed = [
    ...view.actions,
    ...view.scene.choices,
    // The people here and their buttons, read by the cast plugin's id, not its types: debug imports no other plugin.
    ...((view.plugins.cast as { present?: { actions: RenderedChoice[] }[] } | undefined)?.present ?? []).flatMap((person) => person.actions),
  ].filter((choice) => choice.disabled)
  return {
    ...data,
    greyed,
    state: runner.state,
    log: runner.log().commands,
    canUndo: snapshot.canUndo,
    canRedo: snapshot.canRedo,
    undo: () => runner.undo(),
    redo: () => runner.redo(),
  }
}

/** A one-line form that sends a debug command built from what was typed. */
function CommandForm({ label, fields, build }: { label: string; fields: string[]; build: (values: string[]) => CommandRef }) {
  const { words, send } = usePlugin(DEBUG)
  const [values, setValues] = useState(fields.map(() => ''))
  const form = usePart('debug-form', 'flex flex-wrap items-center gap-2 text-sm')
  const name = usePart('debug-label', 'min-w-8 font-medium')
  const input = usePart('debug-field', 'h-8 min-w-0 flex-1 rounded-md border bg-background px-2')
  const button = usePart('button', buttonVariants({ size: 'sm' }))
  const error = usePart('debug-error', 'text-destructive')
  const [said, setSaid] = useState<string | null>(null)
  const submit = (event: SyntheticEvent) => {
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
  const { view } = useGame()
  const { words, send } = usePlugin(DEBUG)
  const panel = usePart('debug', 'flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm', className)
  const header = usePart('debug-header', 'flex items-center gap-2')
  const title = usePart('debug-title', 'font-heading font-semibold')
  const seed = usePart('debug-seed', 'text-xs text-muted-foreground')
  const step = usePart('button', buttonVariants({ size: 'sm', variant: 'outline' }))
  const closeScene = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const setSection = usePart('debug-section', 'flex flex-col gap-2')
  const section = usePart('debug-section', '')
  const heading = usePart('debug-heading', 'font-medium')
  const locks = usePart('debug-list', 'flex flex-col gap-1 pl-3')
  const list = usePart('debug-list', 'flex flex-col gap-1 pl-3')
  const state = usePart('debug-state', 'text-xs')
  const log = usePart('debug-log', 'flex flex-col gap-1 pl-3 font-mono text-xs')
  const data = useDebug()
  if (!data) return null
  const greyed = data.greyed
  return (
    <section {...panel} data-debug>
      <div {...header}>
        <h3 {...title}>{words('debug')}</h3>
        <span {...seed}>{words('seed', { seed: data.seed })}</span>
        {/* Undo and redo, at the far end. */}
        <span className="flex-1" />
        <div className="flex gap-1">
          <button type="button" {...step} disabled={!data.canUndo} onClick={data.undo}>
            {words('undo')}
          </button>
          <button type="button" {...step} disabled={!data.canRedo} onClick={data.redo}>
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
          <CommandForm label={words('debugStat')} fields={['stat', 'value']} build={([stat, to]) => debug.stat(stat, num(to))} />
          <CommandForm label={words('debugKv')} fields={['key', 'to']} build={([key, to]) => debug.kv(key, parse(to))} />
          <CommandForm label={words('debugHeld')} fields={['entity', 'count']} build={([entity, count]) => debug.held(entity, num(count))} />
          <CommandForm label={words('debugStatOf')} fields={['stat', 'of', 'value']} build={([stat, of, to]) => debug.stat(stat, num(to), of)} />
          {view.plugins.places ? <CommandForm label={words('debugGo')} fields={['location']} build={([location]) => debug.go(location)} /> : null}
          <CommandForm label={words('debugScene')} fields={['scene']} build={([scene]) => debug.scene(scene || undefined)} />
          {view.plugins.calendar ? (
            <CommandForm
              label={words('debugTime')}
              fields={['day', 'period']}
              build={([day, period]) => debug.time({ day: day === '' ? undefined : num(day), period: period || undefined })}
            />
          ) : null}
          <CommandForm label={words('debugTurn')} fields={['turn']} build={([turn]) => debug.turn(num(turn))} />
          <button type="button" {...closeScene} onClick={() => send(debug.scene())}>
            {words('closeScene')}
          </button>
        </TabsContent>
        <TabsContent value="why" {...section}>
          <h4 {...heading}>{words('locksOn')}</h4>
          <ul {...locks}>
            {data.locks.length ? (
              data.locks.map((lock, index) => (
                <li key={index}>
                  {lock.reason} ({lock.deny.join(', ')})
                </li>
              ))
            ) : (
              <li>{words('noneOn')}</li>
            )}
          </ul>
          <h4 {...heading}>{words('greyedOut')}</h4>
          <ul {...list}>
            {greyed.length ? (
              greyed.map((choice) => (
                <li key={choice.id}>
                  {choice.label}: {choice.disabled}
                </li>
              ))
            ) : (
              <li>{words('nothingGreyed')}</li>
            )}
          </ul>
        </TabsContent>
        <TabsContent value="state" {...section}>
          <ScrollArea className="h-96">
            <pre {...state}>{JSON.stringify(data.state, null, 2)}</pre>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="log" {...section}>
          <ScrollArea className="h-96">
            <ol {...log}>
              {data.log.map((command, index) => (
                <li key={index}>
                  {index + 1}. {JSON.stringify(command)}
                </li>
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
 * game built without the plugin. A thin default on `useDebug`.
 */
export const DebugCard = overridable('DebugCard', DebugCardImpl)

/**
 * The debug plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: the `DebugCard` at the end of the story, and the debug
 * card's words. It does nothing in a build without the plugin, so it can be
 * listed in every build.
 */
export const debugUi: PluginUi = {
  ...DEBUG,
  layout: { story: [() => <DebugCard />] },
}
