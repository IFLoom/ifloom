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
import { profileKeeper, reportingProfile } from './runner/profile.ts'
import { saveKeeper, type AutosaveOptions } from './runner/saves.ts'
import { settingsKeeper } from './runner/settings.ts'

export type { AutosaveOptions } from './runner/saves.ts'
export type { BacklogEntry, BacklogOptions } from './runner/backlog.ts'
export type { HistoryOptions } from './runner/history.ts'

/**
 * Settings for `createRunner`. Undo, the backlog, saving, autosave and the profile are each off when left out.
 */
export type RunnerOptions = {
  /** The save store that `save`, `load` and autosave write to. Without it, `save` and `load` refuse and autosave does nothing. */
  saves?: Saves
  /** The undo and redo settings, `true` for 50 steps back or a {@link HistoryOptions}. Undo is off if left out. */
  history?: HistoryOptions | boolean
  /** The backlog settings, `true` for 200 entries or a {@link BacklogOptions}. The backlog is off if left out. */
  backlog?: BacklogOptions | boolean
  /** The autosave policy, which writes a slot of its own (`'auto'`) as the game goes on. It needs `saves`, and autosave is off if left out. */
  autosave?: AutosaveOptions
  /** The clock that times play, in milliseconds. `Date.now` if left out, and tests pass their own. */
  now?: () => number
  /**
   * The function the runner tells each error a save driver or the profile throws. Without it, the runner drops the error.
   *
   * It hears about an autosave, `save`, `load`, any call through `runner.saves` or `runner.profile`, the first listing of
   * the saves and a profile write. The writes queued after a failed one still run.
   */
  onSaveError?: (error: unknown) => void
  /**
   * The profile that keeps what outlives a save, such as settings, `finished` and plugins' namespaces. Without one, the
   * runner writes nothing there and refuses to change a `ui` setting.
   */
  profile?: Profile
}

/**
 * A record of play, the state it started from and every command since. The engine is deterministic, so `replay` gives
 * the same state from it every time.
 *
 * A log makes a bug report a developer can step through, or plays two versions of a game the same way to compare them.
 */
export type CommandLog = {
  /** The id of the game the log was played in, so it isn't played against another game. */
  game: string
  /** The state the log's first command was applied to. */
  start: GameState
  /** The log's commands, oldest first, refused ones included. */
  commands: Command[]
  /**
   * The engine's `SCHEMA` the log's commands were written in. A log without one is read as the oldest schema.
   */
  schema?: number
  /** The `commandVersion` of each plugin the log's commands were written in, by plugin id. */
  plugins?: Record<string, number>
}

/**
 * Returns the state a {@link CommandLog} ends in, played back against a game. A log that can't be read, such as one from
 * a newer engine, gives the reason.
 *
 * The log's start comes in through `loadState`. The engine's command steps and each plugin's `commandMigrations` carry
 * its commands forward from the versions the log records, so a log from an older engine, plugin or game still plays.
 * A command that is refused is skipped, as it was when it was played.
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
 * The registry of helper reports, by helper id, that a helper augments to type its own. It is empty until a helper
 * augments it, as `startUnlocks` from `@ifloom/plugin-unlocks` does for `unlocks`.
 *
 * A helper types its report here as a plugin types its view in `ViewRegistry`.
 */
export interface HelperRegistry {}

/** The helpers' reports, by helper id. Each report a helper declares in {@link HelperRegistry} is typed, and the rest are `unknown`. */
export type HelpersIn = { readonly [K in keyof HelperRegistry]?: HelperRegistry[K] } & Readonly<Record<string, unknown>>

/**
 * One value with all a UI renders from the runner, including the view, the settings, the backlog and the saves. It's a
 * new object whenever a part changes, and the same object until then.
 *
 * `runner.snapshot()` returns it, and `runner.subscribe` passes each new one to its listeners. A UI that keeps it whole
 * (Vue's `shallowRef`, React's `useSyncExternalStore`, a Svelte store) renders again exactly when something changed.
 */
export type RunnerSnapshot = {
  /** The state in play, the same as `runner.state`. */
  readonly state: GameState
  /** The view of the state in play, the same as `runner.view()`. */
  readonly view: View
  /**
   * The value of each setting the game declares, by setting id. A stored value that no longer fits its setting reads as
   * the default.
   *
   * A `play` setting's value comes from the game in play. A `ui` setting's value comes from the profile, or is its
   * default without a profile or until the profile has been read (`settled`).
   */
  readonly settings: Readonly<Record<string, KvValue>>
  /** The backlog's entries, oldest first. It is empty unless the backlog is on. */
  readonly backlog: readonly BacklogEntry[]
  /** True when `undo` has a step to go back to. */
  readonly canUndo: boolean
  /** True when `redo` has a step to go forward to. */
  readonly canRedo: boolean
  /**
   * The saves in the runner's `saves`, newest first, then any that can't be read. It is empty without `saves`.
   *
   * The runner lists them once when it starts (`settled` waits for it). It keeps the list up to date as it saves and as
   * `runner.saves` writes and removes.
   */
  readonly saves: readonly SaveListing[]
  /** The reports of the helpers started beside the runner, by helper id, such as `unlocks`. A helper sets its report with `setHelper`. */
  readonly helpers: HelpersIn
  /**
   * The choice or action that led to the screen on show, as it was offered. A UI reads its `ui` hints to play the
   * transition it asks for.
   *
   * The runner sets it when a command it runs changes the screen (`view.scene.key`), from the choices, inline actions
   * and actions of the view the command was sent from, and keeps it while the screen stays. It is null after a tick, a
   * command no choice or action offered, an undo, a redo, a load or a new game.
   */
  readonly pressed: RenderedChoice | null
  /**
   * True when the state on show came from a command the runner just ran, and false after an undo, a redo, a load or a
   * new game.
   *
   * A UI animates what the player just did, such as the dice of `view.rolls`, only while it's true.
   */
  readonly fresh: boolean
}

/**
 * The object a UI drives a game through, returned by `createRunner` or by `browserRunner` from `@ifloom/browser`. A call
 * that can fail in a way a UI should expect answers with a `Result` and never throws.
 *
 * A refused command, an empty slot and a setting with no profile to keep it are such failures.
 */
export interface Runner {
  /** The game this runner plays. */
  readonly game: Game
  /** The state in play. */
  readonly state: GameState
  /**
   * Returns the view of the state in play. It returns the same object for the same state, so a UI, the audio player and
   * the backlog can all read it.
   *
   * Each plugin's view reads that plugin's profile namespace. When a namespace changes, the runner builds that plugin's
   * view again into a new view object and tells listeners, though the state is the same.
   */
  view(): View
  /**
   * Runs a command and returns the next state. A refused command leaves the state as it was and returns the reason.
   *
   * The runner logs a `tick` like any command, but undo steps over it, it adds nothing to the backlog, and it autosaves
   * only when it changes the scene or the turn. A `newGame`, sent on its own or by a choice, starts a new game as
   * `newGame()` does, with the profile's play settings as last read.
   */
  apply(ref: CommandRef): Result<GameState>
  /** Steps back one command. Returns false when there is nothing to undo. */
  undo(): boolean
  /** Steps forward one command after an undo. Returns false when there is nothing to redo. */
  redo(): boolean
  /** Returns the {@link CommandLog} of this game, its start state and every command since, for `replay`. */
  log(): CommandLog
  /** Returns the time played, in milliseconds. It counts on from the time a loaded save recorded. */
  played(): number
  /**
   * The save store this runner writes to, for a menu that reads, exports or imports saves. It is undefined without
   * `saves`.
   *
   * Its writes and removals show in the snapshot's `saves`. Like the store, it never rejects. When the driver fails, each
   * call answers why and tells `onSaveError`.
   */
  readonly saves: Saves | undefined
  /** The features a menu should offer, `undo` true when history is on and `backlog` true when the backlog is on. */
  readonly offers: { undo: boolean; backlog: boolean }
  /**
   * Saves the state in play to a slot and returns the save's {@link SaveMeta}. It fails with the reason when there are no
   * `saves`, the game's `saveable` refuses saving now, or the driver fails.
   *
   * `view().saving` says beforehand whether a save would be refused.
   */
  save(slot: string, name?: string): Promise<Result<SaveMeta>>
  /**
   * Puts a save in play that did not come from a slot, such as one the player imported from a file
   * (`saves.importText`). It starts a fresh history, backlog and log, as `load` does.
   */
  restore(loaded: LoadedSave): void
  /**
   * Loads a slot into play and returns the save. The runner starts a fresh history, backlog and log from it, and the
   * time played it recorded.
   *
   * It fails with the reason when there are no `saves`, the slot is empty, this game can't read the save, or the driver
   * fails. A driver's failure is told to `onSaveError` too.
   */
  load(slot: string): Promise<Result<LoadedSave>>
  /**
   * Returns a promise that settles once every autosave and profile write so far is written. It also waits for the first
   * listing of the saves and the first read of the profile.
   */
  settled(): Promise<void>
  /**
   * The profile this runner writes settings and `finished` to, which a UI can use for namespaces of its own. It is
   * undefined without `profile`.
   *
   * It never rejects. A read the driver fails answers undefined, and a write it fails is dropped, each told to
   * `onSaveError`.
   */
  readonly profile: Profile | undefined
  /**
   * Changes a setting of either kind and returns the value set. A value its declaration refuses, or a `ui` setting
   * without a profile, fails with the reason.
   *
   * The runner sends a `play` setting as the `setting` command, so it changes the game in play, and the profile keeps it
   * for the next new game. It writes a `ui` setting to the profile only. Listeners are told either way.
   */
  setSetting(id: string, to: KvValue): Result<KvValue>
  /**
   * Starts a new game in place and returns its first state. The history, backlog, log and time played start fresh.
   *
   * Play settings not given are the player's, from the profile, or from the game in play without one. The seed is random
   * unless given. For New Game+, pass `carry: runner.state`.
   */
  newGame(start?: StartOptions): Promise<GameState>
  /**
   * Returns the {@link RunnerSnapshot}, one value with all a UI renders. The same object comes back until any part of it
   * changes.
   */
  snapshot(): RunnerSnapshot
  /**
   * Calls a listener with each new snapshot and returns a function that stops it.
   *
   * A new snapshot comes with a change of state, of a setting, of the profile a view reads, of the saves, or of a
   * helper's report.
   */
  subscribe(listener: (snapshot: RunnerSnapshot) => void): () => void
  /**
   * Sets a helper's report under its id in the snapshot's `helpers`, and tells listeners when it changes. Undefined
   * removes the report.
   *
   * `startUnlocks` reports this way whether it is checking a code.
   */
  setHelper<K extends string>(id: K, value: (K extends keyof HelperRegistry ? HelperRegistry[K] : unknown) | undefined): void
}

/**
 * Returns a {@link Runner} that plays a game from a start state. Undo, the backlog, saving, autosave and the profile are
 * off unless {@link RunnerOptions} turns them on.
 *
 * The runner wraps `apply` with undo and redo, a backlog, a command log, saving, loading and autosave, and tells
 * listeners when the state changes.
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
      const read = await saving.load(slot)
      if (!read.ok) return read
      if (!read.value) return fail(stringOf(game, 'emptySlot'))
      restore(read.value)
      return ok(read.value)
    },
    async settled(): Promise<void> {
      await kept.settled()
      await saving.settled()
    },
    profile: options.profile && reportingProfile(options.profile, options.onSaveError),
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
