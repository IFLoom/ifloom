import { holds, type Condition } from './condition.ts'
import type { Game } from './game.ts'
import { localStorageDriver } from './drivers.ts'
import { apply, type Applied } from './reduce.ts'
import { loadState, startingState, type StartOptions } from './intake.ts'
import { pluginContext, pluginView } from './plugin.ts'
import { profile as makeProfile, type Profile } from './profile.ts'
import { settingRefusal } from './features/settings.ts'
import { runnerHooks } from './features/registry.ts'
import { saves, type LoadedSave, type SaveMeta, type Saves } from './save.ts'
import type { SceneBeat } from './sceneBody.ts'
import type { Command, KvValue, GameState } from './types.ts'
import { view, type View } from './view.ts'
import { upgradeCommand } from './upgrade.ts'

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
  /** After every command, or only when the scene or the turn changes. */
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
   * one, nothing is written there and `setUiSetting` throws.
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
export type CommandLog = { game: string; start: GameState; commands: Command[] }

/**
 * Play a command log back against a game. Its start comes in through
 * `loadState`, and its commands through `upgradeCommand`, so a log from an
 * older engine or game still plays; the reason comes back when it can't.
 * Commands that are refused are skipped, as they were then.
 */
export function replay(game: Game, log: CommandLog): GameState | string {
  const start = loadState(log.start, game)
  if (typeof start === 'string') return start
  let state = start
  for (const command of log.commands) state = apply(state, game, upgradeCommand(command)).state
  return state
}

type Step = { state: GameState; backlog: BacklogEntry[]; commands: Command[] }

/**
 * The one object a UI drives. It wraps `apply` with what every game's UI
 * would otherwise build for itself — undo and redo, a backlog, a command log,
 * saving, loading and autosave — and tells listeners when the state changes.
 * Everything but the command log is off unless the game turns it on.
 */
export function createRunner(game: Game, start: GameState, options: RunnerOptions = {}) {
  const now = options.now ?? Date.now
  const history: HistoryOptions | null =
    options.history === true ? {} : options.history ? options.history : null
  const depth = history?.depth ?? 50
  const backlogLimit =
    options.backlog === true ? 200 : options.backlog ? (options.backlog.limit ?? 200) : 0

  let state = start
  let log: CommandLog = { game: game.id, start, commands: [] }
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
      const choice = shown().scene.choices.find((entry) => entry.id === command.id)
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
    if (autosaveDue(before, state, ticking) && options.saves) {
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

  // The plugins' views see their profile namespaces: read each now, and follow every write after.
  if (options.profile && viewers.size) {
    options.profile.subscribe(profileSeen)
    for (const id of viewers.keys()) remember(async (profile) => profileSeen(id, await profile.get(id)))
  }

  /** After a command took: what it changes in the profile. */
  function recordInProfile(before: GameState, after: GameState, command: Command): void {
    if (!options.profile) return
    // The features' first: a play setting changed is written for the next game.
    for (const hooks of runnerHooks) hooks.afterCommand?.(command, remember)
    if (game.finished && !finishedRecorded && holds(after, game.finished, game)) {
      finishedRecorded = true
      const at = now()
      remember((profile) => profile.update('finished', (stored) => stored ?? { at }))
    }
    for (const plugin of game.plugins ?? []) {
      const onCommand = plugin.profile?.onCommand
      if (!onCommand) continue
      remember((profile) => profile.update(plugin.id, (stored) => onCommand(after, before, stored, pluginContext(plugin, after, game))))
    }
  }

  /** Put a state in play from scratch: fresh history, backlog and log, and this much time already played. */
  function begin(next: GameState, playedAlready: number): void {
    const before = state
    state = next
    log = { game: game.id, start: state, commands: [] }
    backlog = []
    undoStack = []
    redoStack = []
    playedBefore = playedAlready
    since = now()
    changed(before)
  }

  /** Put a loaded save in play: fresh history, backlog and log, and its time played. */
  function restore(loaded: LoadedSave): void {
    begin(loaded.state, loaded.meta.played)
  }

  /** Whether the autosave policy wants a save now. A tick is not a command for `'command'`: a minigame sends ten a second. */
  function autosaveDue(before: GameState, after: GameState, ticking: boolean): boolean {
    const every = options.autosave?.every
    if (!every || !options.saves) return false
    if (every === 'command') return !ticking
    if (every === 'scene') return before.sceneId !== after.sceneId
    return before.turn !== after.turn
  }

  return {
    /** The game this runner plays. */
    game,
    /** The current state. */
    get state(): GameState {
      return state
    },
    /**
     * What a UI draws for the current state. Built once per state: asked again
     * for the same state, it hands back the same object, so a UI, the audio
     * player and the backlog can all read it without building it again.
     * Each plugin's view is shown its own profile namespace. When one of
     * those changes, the view becomes a new object with that plugin's view
     * built again, and listeners are told, though the state is the same.
     */
    view(): View {
      return viewOf(state)
    },
    /**
     * Run a command; returns whether it took, and why not if it did not. A
     * `tick` is logged like any command, but undo steps over it, it adds
     * nothing to the backlog, and it autosaves only when it changes the scene
     * or the turn (for those policies).
     */
    apply(command: Command): Applied {
      const before = state
      const ticking = command.type === 'tick'
      // The view the command was sent from: usually built already, for the UI that sent it.
      let from: View | undefined
      const fromView = () => (from ??= viewOf(before))
      const result = apply(before, game, command)
      if (!result.ok) return result
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
          beats: screen.scene.beats,
        })
        const shown = fromView()
        let next = backlog
        // A minigame drawn over a scene is not the scene: it goes in neither before nor after.
        if (shown.scene.id && !shown.minigame) {
          const last = next.at(-1)
          const showing = last && last.sceneId === shown.scene.id && last.chose === undefined
          if (!showing) next = [...next, entry(shown)]
          if (command.type === 'choose') {
            const label = shown.scene.choices.find((choice) => choice.id === command.id)?.label
            if (label) next = [...next.slice(0, -1), { ...next.at(-1)!, chose: label }]
          }
        }
        const after = viewOf(state)
        if (after.scene.id && !after.minigame && (after.scene.id !== shown.scene.id || command.type === 'choose')) next = [...next, entry(after)]
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
      // A tick is written to the profile only when it ends the minigame, not ten times a second.
      if (!ticking || (before.minigame && !state.minigame)) recordInProfile(before, state, command)
      changed(before, ticking)
      return result
    },
    get canUndo(): boolean {
      return undoStack.length > 0
    },
    get canRedo(): boolean {
      return redoStack.length > 0
    },
    /** Step back one command. False when there is nothing to undo. */
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
    /** Step forward again after an undo. False when there is nothing to redo. */
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
    /** What was shown, oldest first. Empty unless the backlog is on. */
    backlog(): BacklogEntry[] {
      return backlog
    },
    /** The start state and every command since, for `replay`. */
    log(): CommandLog {
      return log
    },
    /** Time played, in milliseconds, counting from any save loaded. */
    played,
    /** The saves this runner writes to, for a menu that lists, exports or imports them. Undefined without `saves`. */
    saves: options.saves,
    /** Whether the game turned on undo, and the backlog: what a menu should offer. */
    offers: { undo: Boolean(history), backlog: backlogLimit > 0 },
    /** Save to a slot now. Needs `saves`. */
    async save(slot: string, name?: string): Promise<SaveMeta> {
      if (!options.saves) throw new Error('This runner was given no saves to write to.')
      const saves = options.saves
      const toSave = state
      await saving
      return saves.write(slot, toSave, { name, played: played() })
    },
    /**
     * Put a save in play that did not come from a slot — one the player
     * imported from a file (`saves.importText`) — as `load` would.
     */
    restore,
    /**
     * Load a slot: the state, a fresh history, backlog and log from it, and
     * the time played it recorded. Null if the slot is empty; a string says
     * why it could not be read.
     */
    async load(slot: string): Promise<LoadedSave | string | null> {
      if (!options.saves) throw new Error('This runner was given no saves to read from.')
      const loaded = await options.saves.read(slot)
      if (!loaded || typeof loaded === 'string') return loaded
      restore(loaded)
      return loaded
    },
    /** Settles when every autosave and profile write so far has been written, and the profile first read for the plugins' views. */
    async settled(): Promise<SaveMeta | null> {
      await remembering
      return saving
    },
    /** The profile this runner writes settings and `finished` to. Undefined without `profile`. */
    profile: options.profile,
    /**
     * Change a `ui` setting: checked against its declaration, then written to
     * the profile, never to the state. Returns why it was refused, or
     * undefined. A `play` setting is changed with the `setting` command.
     */
    setUiSetting(id: string, value: KvValue): string | undefined {
      if (!options.profile) throw new Error('This runner was given no profile to write settings to.')
      const refused = settingRefusal(game, id, value, 'ui')
      if (refused) return refused
      remember((profile) => profile.update<Record<string, KvValue>>('settings', (stored) => ({ ...stored, [id]: value })))
      return undefined
    },
    /**
     * Start a new game in place: fresh history, backlog and log, no time
     * played. Settings not given come from the profile's `settings`; the seed
     * is random unless given. For New Game+, pass `carry: runner.state`.
     */
    async newGame(start: StartOptions = {}): Promise<GameState> {
      // What the features take from the profile: the play settings.
      let given = start
      for (const hooks of runnerHooks) if (hooks.newGame) given = await hooks.newGame(given, options.profile)
      const fresh = startingState(game, { seed: randomSeed(), ...given })
      begin(fresh, 0)
      return fresh
    },
    /**
     * Hear about every change of state, and every change to what the view
     * shows of the profile, which leaves the state as it was. Returns the way to stop.
     */
    subscribe(listener: (state: GameState) => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export type Runner = ReturnType<typeof createRunner>

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

/**
 * A runner with what most games in a browser want: a new game with a random
 * seed, undo 50 steps deep, saves and a profile in `localStorage`, and an
 * autosave each turn. Pass a `start` to begin elsewhere, `settings` for the
 * new game's play settings (the profile's, read beforehand), and runner
 * options to change any default; they are merged over these. Any UI can use
 * it: the React UI's `mountGame` does, and so does the vanilla template.
 */
export function browserRunner(
  game: Game,
  options: RunnerOptions & { start?: GameState; settings?: Record<string, unknown> } = {},
): Runner {
  const { start, settings, ...runnerOptions } = options
  const driver = localStorageDriver()
  return createRunner(game, start ?? startingState(game, { seed: randomSeed(), settings }), {
    history: { depth: 50 },
    saves: saves(game, driver),
    profile: makeProfile(game, driver),
    autosave: { every: 'turn' },
    ...runnerOptions,
  })
}
