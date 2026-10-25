import { holds, type Condition } from './condition.ts'
import type { Game } from './game.ts'
import { apply } from './reduce.ts'
import { loadState, startingState, type StartOptions } from './intake.ts'
import { pluginContext, pluginView } from './plugin.ts'
import type { Profile } from './profile.ts'
import { settingAffects, settingById, settingRefusal, settingValue } from './features/settings.ts'
import { runnerHooks } from './features/registry.ts'
import { savingIn } from './features/saving.ts'
import { fail, ok, type Result } from './result.ts'
import type { LoadedSave, SaveMeta, Saves } from './save.ts'
import { stringOf } from './strings.ts'
import type { SceneBeat } from './sceneBody.ts'
import type { Command, KvValue, GameState } from './types.ts'
import { view, type View } from './view.ts'
import { inlineChoices, pastBeats } from './screen.ts'
import { commandUpgrade, commandVersions } from './upgrade.ts'
import { commandOf, type CommandRef } from './custom.ts'

/**
 * Undo and redo. Off unless the game asks for it; when on, `depth` steps deep,
 * and never back past a barrier.
 */
export type HistoryOptions = {
  /** How many steps back undo reaches. 50 if left out. */
  depth?: number
  /** No undo past a choice the game marks `irreversible`. On unless set false. */
  stopAtIrreversible?: boolean
  /** No undo past the start of a new turn. */
  stopAtNewTurn?: boolean
  /** No undo past any state where this holds, tested after each command. */
  stopWhen?: Condition
}

/** What was shown, turn by turn, for a "what did she just say" screen. Off unless asked for. */
export type BacklogOptions = {
  /** How many entries to keep. 200 if left out. */
  limit?: number
}

/** When the runner saves on its own. Off unless the game sets it. */
export type AutosaveOptions = {
  /** The slot it writes to. `'auto'` if left out. */
  slot?: string
  /** After every command, or only when the scene or the turn changes. Skipped while the game's `saveable` refuses saving. */
  every: 'command' | 'scene' | 'turn'
}

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

/** One scene as the player saw it. */
export type BacklogEntry = {
  /** The turn it was shown in. */
  turn: number
  /** Where the game was in time, in plugins' words (`view.when`), or null if none says. */
  when: string | null
  sceneId: string
  title: string
  beats: SceneBeat[]
  /** The label of the choice the player made in this scene, once they made one. */
  chose?: string
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

type Step = { state: GameState; backlog: BacklogEntry[]; commands: Command[] }

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
  /** Whether `undo` would do anything. */
  readonly canUndo: boolean
  /** Whether `redo` would do anything. */
  readonly canRedo: boolean
  /** Step back one command. False when there is nothing to undo. */
  undo(): boolean
  /** Step forward again after an undo. False when there is nothing to redo. */
  redo(): boolean
  /** What was shown, oldest first. Empty unless the backlog is on. */
  backlog(): BacklogEntry[]
  /** The start state and every command since, for `replay`. */
  log(): CommandLog
  /** Time played, in milliseconds, counting from any save loaded. */
  played(): number
  /** The saves this runner writes to, for a menu that lists, exports or imports them. Undefined without `saves`. */
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
   * Every setting the game declares, by id, with its value now. A `play`
   * setting's comes from the game in play; a `ui` setting's from the
   * profile, or its default until the profile has been read (`settled`) or
   * without one. Stored values that no longer fit are read as the default.
   * The same object comes back until a value changes.
   */
  settings(): Readonly<Record<string, KvValue>>
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
   * Hear about every change of state, of a setting, and of what the view
   * shows of the profile (the last two leave the state as it was). Returns
   * the way to stop.
   */
  subscribe(listener: (state: GameState) => void): () => void
}

/**
 * The one object a UI drives. It wraps `apply` with what every game's UI
 * would otherwise build for itself — undo and redo, a backlog, a command log,
 * saving, loading and autosave — and tells listeners when the state changes.
 * Everything but the command log is off unless the game turns it on.
 */
export function createRunner(game: Game, start: GameState, options: RunnerOptions = {}): Runner {
  const now = options.now ?? Date.now
  const history: HistoryOptions | null = options.history === true ? {} : options.history ? options.history : null
  const depth = history?.depth ?? 50
  const backlogLimit = options.backlog === true ? 200 : options.backlog ? (options.backlog.limit ?? 200) : 0

  let state = start
  const versions = commandVersions(game.plugins ?? [])
  let log: CommandLog = { game: game.id, start, commands: [], ...versions }
  let backlog: BacklogEntry[] = []
  let undoStack: Step[] = []
  let redoStack: Step[] = []
  let playedBefore = 0
  let since = now()
  let saving: Promise<SaveMeta | null> = Promise.resolve(null)
  let remembering: Promise<unknown> = Promise.resolve()
  // Once `finished` is known to be recorded, it isn't looked at again.
  let finishedRecorded = false
  const listeners = new Set<(state: GameState) => void>()
  // The last view built, and the state it was built for: the same state object gives the same view.
  let cached: { state: GameState; view: View } | null = null
  // What the plugins' views are shown of the profile, by plugin id: each namespace as last read or
  // written, frozen. Only plugins with a view, and only with a profile.
  const viewers = new Map((options.profile ? (game.plugins ?? []) : []).filter((plugin) => plugin.view).map((plugin) => [plugin.id, plugin]))
  let shownProfile: Readonly<Record<string, unknown>> = {}
  // The profile's `core:settings` as last read or written, and `settings()` as last built.
  let storedSettings: Record<string, unknown> | undefined
  let settingsHeard = false
  let builtSettings: { state: GameState['settings']; stored: typeof storedSettings; value: Readonly<Record<string, KvValue>> } | null = null

  /** The view of a state, built once per state object and kept for the latest one. */
  function viewOf(of: GameState): View {
    if (cached?.state !== of) cached = { state: of, view: view(of, game, { profile: shownProfile }) }
    return cached.view
  }

  /**
   * A plugin's profile namespace was read or written. If its views would see
   * something new, the cached view gets that plugin's view built again (the
   * scene is not drawn again) as a new object, and listeners are told.
   */
  function profileSeen(namespace: string, value: unknown): void {
    const plugin = viewers.get(namespace)
    if (!plugin) return
    const before = shownProfile[namespace]
    if (JSON.stringify(before) === JSON.stringify(value)) return
    shownProfile = { ...shownProfile, [namespace]: frozenCopy(value) }
    if (cached) {
      const shown = cached.view
      const plugins = { ...shown.plugins, [namespace]: pluginView(plugin, cached.state, game, {}, shownProfile[namespace]) }
      cached = { state: cached.state, view: { ...shown, plugins } }
    }
    notify()
  }

  const notify = () => {
    for (const listener of listeners) listener(state)
  }
  const played = () => playedBefore + (now() - since)
  const snapshot = (): Step => ({ state, backlog, commands: log.commands })

  function barrier(before: GameState, after: GameState, command: Command, shown: () => View): boolean {
    if (!history) return false
    if (history.stopAtIrreversible !== false && command.type === 'choose') {
      const scene = shown().scene
      const choice = [...scene.choices, ...inlineChoices(scene.beats)].find((entry) => entry.id === command.id)
      if (choice?.irreversible) return true
    }
    if (history.stopAtNewTurn && after.turn !== before.turn) return true
    if (history.stopWhen && holds(after, history.stopWhen, game)) return true
    return false
  }

  /** Queue a write. A failure is reported and does not stop the ones after it. */
  function queueWrite(write: () => Promise<SaveMeta>): Promise<SaveMeta | null> {
    const next = saving.then(write).catch((error: unknown) => {
      options.onSaveError?.(error)
      return null
    })
    saving = next
    return next
  }

  /** After any change of state — a command, an undo, a load — save if the policy says so. `ticking` for a `tick`. */
  function changed(before: GameState, ticking = false): void {
    // While the game's `saveable` refuses, autosave waits for the next change that's due.
    if (autosaveDue(before, state, ticking) && options.saves && savingIn(state, game, holds).allowed) {
      const slot = options.autosave?.slot ?? 'auto'
      const toSave = state
      const saves = options.saves
      void queueWrite(() => saves.write(slot, toSave, { played: played() }))
    }
    notify()
  }

  /** Queue a profile write. A failure is reported and does not stop the ones after it. */
  function remember(write: (profile: Profile) => Promise<unknown>): void {
    const profile = options.profile
    if (!profile) return
    remembering = remembering.then(() => write(profile)).catch((error: unknown) => options.onSaveError?.(error))
  }

  /** The ui settings' values as stored settings give them. */
  const uiValues = (stored: Record<string, unknown> | undefined) =>
    JSON.stringify((game.settings ?? []).filter((setting) => settingAffects(setting) === 'ui').map((setting) => settingValue(game, stored, setting.id)))

  /** The profile's settings were read or written. Listeners are told if a ui setting now reads differently. */
  function settingsSeen(value: unknown): void {
    const next = value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
    const before = uiValues(storedSettings)
    storedSettings = next
    if (uiValues(next) !== before) notify()
  }

  // The settings and the plugins' views see the profile: read it now, and follow every write after.
  if (options.profile) {
    options.profile.subscribe((namespace, value) => {
      if (namespace === 'core:settings') {
        settingsHeard = true
        settingsSeen(value)
      } else profileSeen(namespace, value)
    })
    remember(async (profile) => {
      const value = await profile.get('core:settings')
      // A write heard while this was being read is newer.
      if (!settingsHeard) settingsSeen(value)
    })
    for (const id of viewers.keys()) remember(async (profile) => profileSeen(id, await profile.get(id)))
  }

  function settingsNow(): Readonly<Record<string, KvValue>> {
    if (builtSettings && builtSettings.state === state.settings && builtSettings.stored === storedSettings) return builtSettings.value
    const value: Record<string, KvValue> = {}
    for (const setting of game.settings ?? []) {
      value[setting.id] =
        settingAffects(setting) === 'play'
          ? (state.settings?.[setting.id] ?? setting.default)
          : (settingValue(game, storedSettings, setting.id) ?? setting.default)
    }
    builtSettings = { state: state.settings, stored: storedSettings, value: Object.freeze(value) }
    return builtSettings.value
  }

  /** After a command took: what it changes in the profile. */
  function recordInProfile(before: GameState, after: GameState, command: Command): void {
    if (!options.profile) return
    // The features' first: a play setting changed is written for the next game.
    for (const hooks of runnerHooks) hooks.afterCommand?.(command, remember)
    if (game.finished && !finishedRecorded && holds(after, game.finished, game)) {
      finishedRecorded = true
      const at = now()
      remember((profile) => profile.update('core:finished', (stored) => stored ?? { at }))
    }
    for (const plugin of game.plugins ?? []) {
      const keep = plugin.profile
      if (!keep) continue
      remember((profile) => profile.update(plugin.id, (stored) => keep(after, before, stored, pluginContext(plugin, after, game))))
    }
  }

  /** Put a state in play from scratch: fresh history, backlog and log, and this much time already played. */
  function begin(next: GameState, playedAlready: number): void {
    const before = state
    state = next
    log = { game: game.id, start: state, commands: [], ...versions }
    backlog = []
    undoStack = []
    redoStack = []
    playedBefore = playedAlready
    since = now()
    changed(before)
  }

  /**
   * A new game in place: the player's play settings (the profile's as last
   * read, or the game in play's without one), a random seed unless given,
   * and fresh history, backlog and log.
   */
  function startOver(start: StartOptions): GameState {
    const settings = start.settings ?? (options.profile ? storedSettings : state.settings)
    const fresh = startingState(game, { seed: randomSeed(), ...start, settings })
    begin(fresh, 0)
    return fresh
  }

  /** Put a loaded save in play: fresh history, backlog and log, and its time played. */
  function restore(loaded: LoadedSave): void {
    begin(loaded.state, loaded.meta.played)
  }

  /** Whether a timer ran out (or started again) between two states. */
  function ranOut(before: GameState, after: GameState): boolean {
    return Object.entries(before.timers).some(([id, timer]) => {
      const now = after.timers[id]
      return !now || now.left > timer.left
    })
  }

  /** Whether the autosave policy wants a save now. A tick is not a command for `'command'`: a minigame sends ten a second. */
  function autosaveDue(before: GameState, after: GameState, ticking: boolean): boolean {
    const every = options.autosave?.every
    if (!every || !options.saves) return false
    if (every === 'command') return !ticking
    if (every === 'scene') return before.sceneId !== after.sceneId
    return before.turn !== after.turn
  }

  /** Run a command: the runner's `apply`. */
  function run(ref: CommandRef): Result<GameState> {
    const command = commandOf(ref)
    const before = state
    const ticking = command.type === 'tick'
    // The view the command was sent from: usually built already, for the UI that sent it.
    let from: View | undefined
    const fromView = () => (from ??= viewOf(before))
    const result = apply(before, game, command)
    if (!result.ok) return fail(result.reason)
    // A `newGame`, sent or chosen: this runner starts it as `newGame()` does, with a fresh log.
    if (result.newGame) return ok(startOver({}))
    const prior = snapshot()
    state = result.state
    log = { ...log, commands: [...log.commands, command] }
    if (backlogLimit && !ticking) {
      // Each scene as it was shown, with the choice made in it: the scene on
      // screen before the command goes in first if it isn't there yet (the
      // opening scene, say), the choice is written on it, then whatever new
      // scene the command opened goes in after.
      // Each entry is dated by the screen it was on.
      const entry = (screen: View): BacklogEntry => ({
        turn: screen.turn,
        when: screen.when,
        sceneId: screen.scene.id!,
        title: screen.scene.title,
        beats: pastBeats(screen.scene.beats),
      })
      const shown = fromView()
      let next = backlog
      // A pick at a decision of a flowing scene is in the scene's own words from then on, as a `chose` beat:
      // the visit's entry grows rather than closing with the choice.
      const flowed = Boolean(
        state.flow && state.flow.scene === shown.scene.id && state.flow.path.length > (before.flow?.scene === state.flow.scene ? before.flow.path.length : 0),
      )
      // A minigame drawn over a scene is not the scene: it goes in neither before nor after.
      if (shown.scene.id && !shown.minigame) {
        const last = next.at(-1)
        const showing = last && last.sceneId === shown.scene.id && last.chose === undefined
        // A flowing visit's entry is kept as the screen last read it, so what the flow added since (past a minigame, say) is there too.
        if (!showing) next = [...next, entry(shown)]
        else if (before.flow?.scene === shown.scene.id) next = [...next.slice(0, -1), entry(shown)]
        if (command.type === 'choose' && !flowed) {
          const label = [...shown.scene.choices, ...inlineChoices(shown.scene.beats)].find((choice) => choice.id === command.id)?.label
          if (label) next = [...next.slice(0, -1), { ...next.at(-1)!, chose: label }]
        }
      }
      const after = viewOf(state)
      if (after.scene.id && !after.minigame && flowed) next = [...next.slice(0, -1), entry(after)]
      else if (after.scene.id && !after.minigame && (after.scene.id !== shown.scene.id || command.type === 'choose')) next = [...next, entry(after)]
      backlog = next.slice(-backlogLimit)
    }
    if (history) {
      if (barrier(before, state, command, fromView)) {
        undoStack = []
        redoStack = []
      }
      // A tick is no step of its own: one undo goes back to before the last command that wasn't one.
      else if (!ticking) {
        undoStack = [...undoStack, prior].slice(-depth)
        redoStack = []
      }
    }
    // A tick is written to the profile only when it ends the minigame or runs a timer out, not ten times a second.
    if (!ticking || (before.minigame && !state.minigame) || ranOut(before, state)) recordInProfile(before, state, command)
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
    get canUndo(): boolean {
      return undoStack.length > 0
    },
    get canRedo(): boolean {
      return redoStack.length > 0
    },
    undo(): boolean {
      const step = undoStack.at(-1)
      if (!step) return false
      const before = state
      undoStack = undoStack.slice(0, -1)
      redoStack = [...redoStack, snapshot()]
      ;({ state, backlog } = step)
      log = { ...log, commands: step.commands }
      changed(before)
      return true
    },
    redo(): boolean {
      const step = redoStack.at(-1)
      if (!step) return false
      const before = state
      redoStack = redoStack.slice(0, -1)
      undoStack = [...undoStack, snapshot()].slice(-depth)
      ;({ state, backlog } = step)
      log = { ...log, commands: step.commands }
      changed(before)
      return true
    },
    backlog(): BacklogEntry[] {
      return backlog
    },
    log(): CommandLog {
      return log
    },
    played,
    saves: options.saves,
    offers: { undo: Boolean(history), backlog: backlogLimit > 0 },
    async save(slot: string, name?: string): Promise<Result<SaveMeta>> {
      if (!options.saves) return fail(stringOf(game, 'noSaves'))
      const policy = savingIn(state, game, holds)
      if (!policy.allowed) return fail(policy.reason!)
      const saves = options.saves
      const toSave = state
      await saving
      try {
        return ok(await saves.write(slot, toSave, { name, played: played() }))
      } catch (error) {
        options.onSaveError?.(error)
        return fail(stringOf(game, 'notSaved'))
      }
    },
    restore,
    async load(slot: string): Promise<Result<LoadedSave>> {
      if (!options.saves) return fail(stringOf(game, 'noSaves'))
      const read = await options.saves.read(slot)
      if (!read.ok) return read
      if (!read.value) return fail(stringOf(game, 'emptySlot'))
      restore(read.value)
      return ok(read.value)
    },
    async settled(): Promise<void> {
      await remembering
      await saving
    },
    profile: options.profile,
    settings: settingsNow,
    setSetting(id: string, to: KvValue): Result<KvValue> {
      const setting = settingById(game, id)
      if (!setting) return fail(stringOf(game, 'noSuchSetting'))
      if (settingAffects(setting) === 'play') {
        const applied = run({ type: 'setting', id, to })
        return applied.ok ? ok(to) : fail(applied.reason)
      }
      if (!options.profile) return fail(stringOf(game, 'noProfile'))
      const refused = settingRefusal(game, id, to, 'runner')
      if (refused) return fail(refused)
      // Shown at once; the profile catches up in order.
      settingsSeen({ ...storedSettings, [id]: to })
      remember((profile) => profile.update<Record<string, KvValue>>('core:settings', (stored) => ({ ...stored, [id]: to })))
      return ok(to)
    },
    async newGame(start: StartOptions = {}): Promise<GameState> {
      await remembering
      return startOver(start)
    },
    subscribe(listener: (state: GameState) => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** A deep, frozen copy of a JSON value from the profile, so a view can read it and never change what is stored. */
function frozenCopy(value: unknown): unknown {
  if (value === undefined) return undefined
  const freeze = (entry: unknown): unknown => {
    if (entry && typeof entry === 'object') {
      for (const inner of Object.values(entry)) freeze(inner)
      Object.freeze(entry)
    }
    return entry
  }
  return freeze(JSON.parse(JSON.stringify(value)))
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}
