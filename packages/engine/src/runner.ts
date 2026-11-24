import type { Game } from './game.ts'
import { apply } from './reduce.ts'
import { loadState, startingState, type StartOptions } from './intake.ts'
import { pluginView } from './plugin.ts'
import type { Profile } from './profile.ts'
import { featureContext } from './core.ts'
import { runnerHooks } from './features/registry.ts'
import { fail, ok, type Result } from './result.ts'
import type { LoadedSave, SaveListing, SaveMeta, Saves } from './save.ts'
import { stringOf } from './strings.ts'
import type { Command, KvValue, GameState } from './types.ts'
import { view, type View } from './view.ts'
import { inlineChoices, type RenderedChoice } from './screen.ts'
import { commandUpgrade, commandVersions } from './upgrade.ts'
import { commandOf, type CommandRef } from './custom.ts'
import { backlogAfter, backlogLimit, type BacklogEntry, type BacklogOptions } from './runner/backlog.ts'
import { history as historyOf, type HistoryOptions, type Step } from './runner/history.ts'
import { profileKeeper } from './runner/profile.ts'
import { saveKeeper, type AutosaveOptions } from './runner/saves.ts'
import { settingsKeeper } from './runner/settings.ts'

export type { AutosaveOptions } from './runner/saves.ts'
export type { BacklogEntry, BacklogOptions } from './runner/backlog.ts'
export type { HistoryOptions } from './runner/history.ts'

export type RunnerOptions = {
  /** Where `save`, `load` and autosave write. Needed for any of them. */
  saves?: Saves
  history?: HistoryOptions | boolean
  backlog?: BacklogOptions | boolean
  autosave?: AutosaveOptions
  /** The clock for time played. `Date.now` if left out; tests pass their own. */
  now?: () => number
  /**
   * Told when an autosave, `save` or profile write fails. Later writes still
   * run; without this, a failure is dropped.
   */
  onSaveError?: (error: unknown) => void
  /**
   * What outlives a save: settings, `finished`, plugins' namespaces. Without
   * one, nothing is written there, and a `ui` setting can't be changed.
   */
  profile?: Profile
}

/**
 * Everything needed to play a game back exactly: the state it started from and
 * every command since. The engine is deterministic, so `replay` gives the same
 * state every time — a bug report a developer can step through, or two
 * versions of a game played the same way and compared.
 */
export type CommandLog = {
  game: string
  start: GameState
  commands: Command[]
  /**
   * The engine's `SCHEMA` the commands were written in. A log from before
   * logs kept it has none, and is read as the oldest.
   */
  schema?: number
  /** Each plugin's `commandVersion` the commands were written in, by plugin id. */
  plugins?: Record<string, number>
}

/**
 * Play a command log back against a game. Its start comes in through
 * `loadState`, and its commands are carried forward from the versions the
 * log records, by the engine's command steps and each plugin's
 * `commandMigrations`, so a log from an older engine, plugin or game still
 * plays; the reason comes back when it can't. Commands that are refused are
 * skipped, as they were then.
 */
export function replay(game: Game, log: CommandLog): Result<GameState> {
  const upgrade = commandUpgrade(game.plugins ?? [], { schema: log.schema, plugins: log.plugins })
  if (!upgrade.ok) return upgrade
  const start = loadState(log.start, game)
  if (!start.ok) return start
  let state = start.value
  for (const command of log.commands) state = apply(state, game, upgrade.value(command)).state
  return ok(state)
}

/**
 * What a helper started beside the runner reports, by its id, for a UI to
 * draw: `startUnlocks` from `@ifloom/plugin-unlocks` reports `unlocks`. A
 * helper types its own by augmenting this, as a plugin types its view in
 * `ViewRegistry`.
 */
export interface HelperRegistry {}

/** What the helpers report, by id: typed for each helper that declares itself in `HelperRegistry`. */
export type HelpersIn = { readonly [K in keyof HelperRegistry]?: HelperRegistry[K] } & Readonly<Record<string, unknown>>

/**
 * Everything a UI draws from the runner, in one value: the view, the
 * settings, the backlog, whether undo and redo would do anything, the saves
 * and what the helpers report. `runner.snapshot()` gives it, and
 * `runner.subscribe` hands each new one to its listeners. It is a new object
 * whenever any part of it changes, and the same object until then, so a UI
 * that keeps it whole (Vue's `shallowRef`, React's `useSyncExternalStore`, a
 * Svelte store) draws again exactly when something changed.
 */
export type RunnerSnapshot = {
  /** The state in play, as `runner.state`. */
  readonly state: GameState
  /** What a UI draws for that state, as `runner.view()`. */
  readonly view: View
  /**
   * Every setting the game declares, by id, with its value now. A `play`
   * setting's comes from the game in play; a `ui` setting's from the
   * profile, or its default until the profile has been read (`settled`) or
   * without one. Stored values that no longer fit are read as the default.
   */
  readonly settings: Readonly<Record<string, KvValue>>
  /** What was shown, oldest first. Empty unless the backlog is on. */
  readonly backlog: readonly BacklogEntry[]
  /** Whether `undo` would do anything. */
  readonly canUndo: boolean
  /** Whether `redo` would do anything. */
  readonly canRedo: boolean
  /**
   * Every save in the runner's `saves`, as `saves.list()` gives them: newest
   * first, then any that can't be read. Read once when the runner starts
   * (`settled` waits for it), then kept up to date as the runner saves and
   * as `runner.saves` writes and removes. Empty without `saves`.
   */
  readonly saves: readonly SaveListing[]
  /** What the helpers started beside the runner report, by id, such as `unlocks`. See `setHelper`. */
  readonly helpers: HelpersIn
  /**
   * The choice or button that led to the screen on show, as it was offered:
   * its `id`, its `command` and its `ui` hints as written, so a UI can play
   * the transition a choice asks for. Set when a command the runner runs
   * changes the screen (`view.scene.key`), from the choices, inline actions
   * and buttons of the view it was sent from, and kept while the screen
   * stays. Null when nothing pressed led here: a tick, a command sent by
   * hand, an undo, a redo, a load or a new game.
   */
  readonly pressed: RenderedChoice | null
  /**
   * Whether the state on show came from a command the runner just ran, rather
   * than an undo, a redo, a load or a new game. A UI animates what the
   * player just did only while it's true, such as the dice of `view.rolls`.
   */
  readonly fresh: boolean
}

/**
 * The one object a UI drives, as `createRunner` (or `browserRunner` from `@ifloom/browser`) gives it.
 * Anything that can fail in a way a UI should expect (a refused command, an
 * empty slot, a setting with no profile to keep it) answers with a `Result`
 * and never throws.
 */
export interface Runner {
  /** The game this runner plays. */
  readonly game: Game
  /** The current state. */
  readonly state: GameState
  /**
   * What a UI draws for the current state. Built once per state: asked again
   * for the same state, it hands back the same object, so a UI, the audio
   * player and the backlog can all read it without building it again.
   * Each plugin's view is shown its own profile namespace. When one of
   * those changes, the view becomes a new object with that plugin's view
   * built again, and listeners are told, though the state is the same.
   */
  view(): View
  /**
   * Run a command: the new state, or why it was refused (the state is then
   * left as it was). A `tick` is logged like any command, but undo steps
   * over it, it adds nothing to the backlog, and it autosaves only when it
   * changes the scene or the turn (for those policies). A `newGame`, sent
   * on its own or by a choice, starts a new game as `newGame()` does,
   * with the profile's play settings as last read.
   */
  apply(ref: CommandRef): Result<GameState>
  /** Step back one command. False when there is nothing to undo. */
  undo(): boolean
  /** Step forward again after an undo. False when there is nothing to redo. */
  redo(): boolean
  /** The start state and every command since, for `replay`. */
  log(): CommandLog
  /** Time played, in milliseconds, counting from any save loaded. */
  played(): number
  /**
   * The saves this runner writes to, for a menu that reads, exports or
   * imports them. Undefined without `saves`. What it writes and removes
   * shows in the snapshot's `saves`.
   */
  readonly saves: Saves | undefined
  /** Whether the game turned on undo, and the backlog: what a menu should offer. */
  readonly offers: { undo: boolean; backlog: boolean }
  /**
   * Save to a slot now: what the save says about itself, or why it wasn't
   * written (no `saves`, the game's `saveable` refuses it now, or the driver
   * failed). `view().saving` says beforehand whether it would be refused.
   */
  save(slot: string, name?: string): Promise<Result<SaveMeta>>
  /**
   * Put a save in play that did not come from a slot, one the player
   * imported from a file (`saves.importText`), as `load` would.
   */
  restore(loaded: LoadedSave): void
  /**
   * Load a slot: the state, a fresh history, backlog and log from it, and
   * the time played it recorded. A failure says why: no `saves`, an empty
   * slot, or a save this game can't read.
   */
  load(slot: string): Promise<Result<LoadedSave>>
  /**
   * Settles when every autosave and profile write so far has been written,
   * and the profile first read for the settings and the plugins' views.
   */
  settled(): Promise<void>
  /** The profile this runner writes settings and `finished` to. Undefined without `profile`. */
  readonly profile: Profile | undefined
  /**
   * Change a setting of either kind, checked against its declaration. A
   * `play` setting is sent as the `setting` command, so it changes the game
   * in play, and the profile keeps it for the next new game. A `ui` setting
   * is written to the profile only, and needs one. Listeners are told.
   * The value set, or why it was refused.
   */
  setSetting(id: string, to: KvValue): Result<KvValue>
  /**
   * Start a new game in place: fresh history, backlog and log, no time
   * played. Play settings not given are the player's: the profile's, or
   * without one the game in play's. The seed is random unless given. For
   * New Game+, pass `carry: runner.state`.
   */
  newGame(start?: StartOptions): Promise<GameState>
  /**
   * Everything a UI draws, in one value: see `RunnerSnapshot`. The same
   * object comes back until any part of it changes.
   */
  snapshot(): RunnerSnapshot
  /**
   * Hear about every new snapshot: a change of state, of a setting, of what
   * the view shows of the profile, of the saves, or of what a helper reports.
   * Each listener is handed the new snapshot. Returns the way to stop.
   */
  subscribe(listener: (snapshot: RunnerSnapshot) => void): () => void
  /**
   * Report what a helper started beside the runner is doing, under its id,
   * in the snapshot's `helpers`: `startUnlocks` reports whether a code is
   * being checked. Undefined takes it out. Listeners are told when it changes.
   */
  setHelper<K extends string>(id: K, value: (K extends keyof HelperRegistry ? HelperRegistry[K] : unknown) | undefined): void
}

/**
 * The one object a UI drives. It wraps `apply` with what every game's UI
 * would otherwise build for itself — undo and redo, a backlog, a command log,
 * saving, loading and autosave — and tells listeners when the state changes.
 * Everything but the command log is off unless the game turns it on.
 */
export function createRunner(game: Game, start: GameState, options: RunnerOptions = {}): Runner {
  const now = options.now ?? Date.now
  const cx = featureContext()
  const versions = commandVersions(game.plugins ?? [])
  const limit = backlogLimit(options.backlog)
  const steps = historyOf(game, options.history)

  let state = start
  let log: CommandLog = { game: game.id, start, commands: [], ...versions }
  let backlog: BacklogEntry[] = []
  let playedBefore = 0
  let since = now()
  // The choice or button that led to the screen on show, and whether the state came from a command just run.
  let pressed: RenderedChoice | null = null
  let fresh = false
  // What the helpers report, by id.
  let helpers: HelpersIn = {}
  const listeners = new Set<(snapshot: RunnerSnapshot) => void>()
  // The last snapshot built: the same object until a part of it changes.
  let built: RunnerSnapshot | null = null
  // The last view built, and the state it was built for: the same state object gives the same view.
  let cached: { state: GameState; view: View } | null = null

  const notify = () => {
    if (!listeners.size) return
    const shown = snapshotNow()
    for (const listener of listeners) listener(shown)
  }

  // The profile: a plugin's namespace read or written gives the cached view that plugin's view built again
  // (the scene is not drawn again), as a new object, and listeners are told.
  const kept = profileKeeper(game, {
    profile: options.profile,
    now,
    onError: options.onSaveError,
    onShown: (plugin) => {
      if (cached) {
        const shown = cached.view
        const plugins = { ...shown.plugins, [plugin.id]: pluginView(plugin, cached.state, game, {}, kept.shown()[plugin.id]) }
        cached = { state: cached.state, view: { ...shown, plugins } }
      }
      notify()
    },
  })
  const settings = settingsKeeper(game, kept, notify)
  const saving = saveKeeper(game, {
    saves: options.saves,
    autosave: options.autosave,
    onError: options.onSaveError,
    refuses: (of) => runnerHooks.map((hooks) => hooks.refusesSave?.(of, game, cx)).find((reason) => reason !== undefined),
    changedList: notify,
  })

  /** The view of a state, built once per state object and kept for the latest one. */
  function viewOf(of: GameState): View {
    if (cached?.state !== of) cached = { state: of, view: view(of, game, { profile: kept.shown() }) }
    return cached.view
  }

  /** The snapshot now: the last one built, while every part of it is the same. */
  function snapshotNow(): RunnerSnapshot {
    const next: RunnerSnapshot = {
      state,
      view: viewOf(state),
      settings: settings.values(state),
      backlog,
      canUndo: steps.canUndo,
      canRedo: steps.canRedo,
      saves: saving.listed(),
      helpers,
      pressed,
      fresh,
    }
    const last = built
    if (last && (Object.keys(next) as (keyof RunnerSnapshot)[]).every((key) => last[key] === next[key])) return last
    built = Object.freeze(next)
    return built
  }

  const played = () => playedBefore + (now() - since)
  const here = (): Step => ({ state, backlog, commands: log.commands })

  /** After any change of state (a command, an undo, a load): autosave if the policy says so, and tell listeners. `ticking` for a `tick`. */
  function changed(before: GameState, ticking = false): void {
    saving.changed(before, state, ticking, played)
    notify()
  }

  /** Go to a step of history: its state, backlog and log, with nothing pressed. */
  function goTo(step: Step): void {
    const before = state
    ;({ state, backlog } = step)
    log = { ...log, commands: step.commands }
    pressed = null
    fresh = false
    changed(before)
  }

  /** Put a state in play from scratch: fresh history, backlog and log, and this much time already played. */
  function begin(next: GameState, playedAlready: number): void {
    const before = state
    state = next
    log = { game: game.id, start: state, commands: [], ...versions }
    backlog = []
    steps.clear()
    playedBefore = playedAlready
    since = now()
    pressed = null
    fresh = false
    changed(before)
  }

  /**
   * A new game in place: the player's play settings (the profile's as last
   * read, or the game in play's without one), a random seed unless given,
   * and fresh history, backlog and log.
   */
  function startOver(given: StartOptions): GameState {
    const playSettings = given.settings ?? (kept.profile ? settings.stored() : state.settings)
    const started = startingState(game, { seed: randomSeed(), ...given, settings: playSettings })
    begin(started, 0)
    return started
  }

  /** Put a loaded save in play: fresh history, backlog and log, and its time played. */
  function restore(loaded: LoadedSave): void {
    begin(loaded.state, loaded.meta.played)
  }

  /** Run a command: the runner's `apply`. */
  function run(ref: CommandRef): Result<GameState> {
    const command = commandOf(ref)
    const before = state
    const ticking = command.type === 'tick'
    // The view the command was sent from: usually built already, for the UI that sent it.
    const drawn = cached?.state === before ? cached.view : undefined
    let from: View | undefined = drawn
    const fromView = () => (from ??= viewOf(before))
    const result = apply(before, game, command)
    if (!result.ok) return fail(result.reason)
    // A `newGame`, sent or chosen: this runner starts it as `newGame()` does, with a fresh log.
    if (result.newGame) return ok(startOver({}))
    const prior = here()
    state = result.state
    log = { ...log, commands: [...log.commands, command] }
    fresh = true
    // What led to the new screen, when a UI drew the one before: kept while the screen stays the same.
    if (!drawn) pressed = null
    else if (viewOf(state).scene.key !== drawn.scene.key) pressed = pressedIn(drawn, command)
    if (limit && !ticking) backlog = backlogAfter(backlog, { before, after: state, command, from: fromView(), to: () => viewOf(state) }, limit)
    steps.ran(prior, before, state, command, fromView)
    // A tick is written to the profile only when it ends the minigame or runs a timer out, not ten times a second.
    if (!ticking || (before.minigame && !state.minigame) || ranOut(before, state)) kept.record(before, state, command)
    changed(before, ticking)
    return ok(state)
  }

  return {
    game,
    get state(): GameState {
      return state
    },
    view(): View {
      return viewOf(state)
    },
    apply: run,
    undo(): boolean {
      const step = steps.undo(here())
      if (step) goTo(step)
      return step !== undefined
    },
    redo(): boolean {
      const step = steps.redo(here())
      if (step) goTo(step)
      return step !== undefined
    },
    log(): CommandLog {
      return log
    },
    played,
    saves: saving.store,
    offers: { undo: steps.on, backlog: limit > 0 },
    save: (slot: string, name?: string) => saving.save(slot, state, name, played()),
    restore,
    async load(slot: string): Promise<Result<LoadedSave>> {
      if (!saving.store) return fail(stringOf(game, 'noSaves'))
      const read = await saving.store.read(slot)
      if (!read.ok) return read
      if (!read.value) return fail(stringOf(game, 'emptySlot'))
      restore(read.value)
      return ok(read.value)
    },
    async settled(): Promise<void> {
      await kept.settled()
      await saving.settled()
    },
    profile: options.profile,
    setSetting(id: string, to: KvValue): Result<KvValue> {
      const change = settings.change(id, to)
      if (!('command' in change)) return change
      const applied = run(change.command)
      return applied.ok ? ok(to) : fail(applied.reason)
    },
    async newGame(given: StartOptions = {}): Promise<GameState> {
      await kept.settled()
      return startOver(given)
    },
    snapshot: snapshotNow,
    subscribe(listener: (snapshot: RunnerSnapshot) => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setHelper(id: string, value: unknown): void {
      if (value === undefined ? !(id in helpers) : helpers[id] === value) return
      const { [id]: _gone, ...rest } = helpers
      helpers = value === undefined ? rest : { ...rest, [id]: value }
      notify()
    },
  }
}

/** Whether a timer ran out (or started again) between two states. */
function ranOut(before: GameState, after: GameState): boolean {
  return Object.entries(before.timers).some(([id, timer]) => {
    const now = after.timers[id]
    return !now || now.left > timer.left
  })
}

/** The choice, inline action or button of a view that sends this command, if any does. */
function pressedIn(shown: View, command: Command): RenderedChoice | null {
  const offered = [...shown.scene.choices, ...inlineChoices(shown.scene.beats), ...shown.actions]
  if (command.type === 'choose') return offered.find((choice) => choice.command.type === 'choose' && choice.id === command.id) ?? null
  const sent = JSON.stringify(command)
  return offered.find((choice) => JSON.stringify(choice.command) === sent) ?? null
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}
