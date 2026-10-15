import { holds, type Condition } from './condition.ts'
import type { Game } from './game.ts'
import { localStorageDriver } from './drivers.ts'
import { apply, startingState, type Applied } from './reduce.ts'
import { saves, type LoadedSave, type SaveMeta, type Saves } from './save.ts'
import type { SceneBeat } from './sceneBody.ts'
import type { Command, GameState } from './types.ts'
import { view, type View } from './view.ts'

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
   * Told when an autosave or `save` fails to write. Later saves still run;
   * without this, a failure is dropped.
   */
  onSaveError?: (error: unknown) => void
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

/** Play a command log back against a game. Commands that are refused are skipped, as they were then. */
export function replay(game: Game, log: CommandLog): GameState {
  let state = log.start
  for (const command of log.commands) state = apply(state, game, command).state
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
  const listeners = new Set<(state: GameState) => void>()

  const notify = () => {
    for (const listener of listeners) listener(state)
  }
  const played = () => playedBefore + (now() - since)
  const snapshot = (): Step => ({ state, backlog, commands: log.commands })

  function barrier(before: GameState, after: GameState, command: Command, shown: View): boolean {
    if (!history) return false
    if (history.stopAtIrreversible !== false && command.type === 'choose') {
      const choice = shown.scene.choices.find((entry) => entry.id === command.id)
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

  /** After any change of state — a command, an undo, a load — save if the policy says so. */
  function changed(before: GameState): void {
    if (autosaveDue(before, state) && options.saves) {
      const slot = options.autosave?.slot ?? 'auto'
      const toSave = state
      const saves = options.saves
      void queueWrite(() => saves.write(slot, toSave, { played: played() }))
    }
    notify()
  }

  /** Put a loaded save in play: fresh history, backlog and log, and its time played. */
  function restore(loaded: LoadedSave): void {
    const before = state
    state = loaded.state
    log = { game: game.id, start: state, commands: [] }
    backlog = []
    undoStack = []
    redoStack = []
    playedBefore = loaded.meta.played
    since = now()
    changed(before)
  }

  function autosaveDue(before: GameState, after: GameState): boolean {
    const every = options.autosave?.every
    if (!every || !options.saves) return false
    if (every === 'command') return true
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
    /** What a UI draws for the current state. */
    view(): View {
      return view(state, game)
    },
    /** Run a command; returns whether it took, and why not if it did not. */
    apply(command: Command): Applied {
      const before = state
      const shown = view(before, game)
      const result = apply(before, game, command)
      if (!result.ok) return result
      const prior = snapshot()
      state = result.state
      log = { ...log, commands: [...log.commands, command] }
      if (backlogLimit) {
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
        let next = backlog
        if (shown.scene.id) {
          const last = next.at(-1)
          const showing = last && last.sceneId === shown.scene.id && last.chose === undefined
          if (!showing) next = [...next, entry(shown)]
          if (command.type === 'choose') {
            const label = shown.scene.choices.find((choice) => choice.id === command.id)?.label
            if (label) next = [...next.slice(0, -1), { ...next.at(-1)!, chose: label }]
          }
        }
        const after = view(state, game)
        if (after.scene.id && (after.scene.id !== shown.scene.id || command.type === 'choose')) next = [...next, entry(after)]
        backlog = next.slice(-backlogLimit)
      }
      if (history) {
        if (barrier(before, state, command, shown)) undoStack = []
        else undoStack = [...undoStack, prior].slice(-depth)
        redoStack = []
      }
      changed(before)
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
    /** Settles when every autosave so far has been written. */
    settled(): Promise<SaveMeta | null> {
      return saving
    },
    /** Hear about every change of state. Returns the way to stop. */
    subscribe(listener: (state: GameState) => void): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export type Runner = ReturnType<typeof createRunner>

/**
 * A runner with what most games in a browser want: a new game with a random
 * seed, undo 50 steps deep, saves in `localStorage` and an autosave each turn.
 * Pass a `start` to begin elsewhere, and runner options to change any default;
 * they are merged over these. Any UI can use it: the React UI's `mountGame`
 * does, and so does the vanilla template.
 */
export function browserRunner(game: Game, options: RunnerOptions & { start?: GameState } = {}): Runner {
  const { start, ...runnerOptions } = options
  return createRunner(game, start ?? startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
    history: { depth: 50 },
    saves: saves(game, localStorageDriver()),
    autosave: { every: 'turn' },
    ...runnerOptions,
  })
}
