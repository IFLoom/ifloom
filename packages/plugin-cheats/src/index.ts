/**
 * @ifloom/plugin-cheats: cheats the player can use from a panel, such as
 * "+20 coins" or "skip to chapter 3". Each runs its effects at once, in any
 * scene and through any lock, costs nothing and ends no turn unless its
 * effects say so.
 *
 * A cheat is offered to everyone, or refused with a reason (or hidden) while
 * one of its `blocked` conditions holds: so a cheat can wait for a supporter
 * unlock, a finished game or a kv key the game sets, by naming that plugin's
 * or the game's condition. Nothing here knows which.
 *
 * The plugin keeps a log of which cheats were used and on which turn, so a
 * replay shows them and content can ask `cheats/used`.
 *
 * Unlike `@ifloom/plugin-debug`, which is for the developer and left out of a
 * release build, this is part of the game the player gets.
 */
import {
  holds,
  reasonOf,
  stringOf,
  type Blocked,
  type CommandRef,
  type Condition,
  type EffectRef,
  type Game,
  type GameState,
  type Once,
  type RenderedChoice,
} from '@ifloom/engine'
import {
  arg,
  defineCalls,
  defineData,
  definePlugin,
  list,
  renderAction,
  type CommandsOf,
  type ConditionsOf,
  type DefinedPlugin,
  type PluginContext,
  type PluginProblem,
} from '@ifloom/engine/plugin'
import { CONTENT_VERSION, contentMigrations } from './upgrade.ts'

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    cheats: CheatsView
  }
}

const ID = 'cheats'

/** The plugin's one list, `cheats`, as content writes it in `data.cheats.cheats` (a plugin's `data` holds its lists by name), with the words a player reads in each, for a translation's `words` table. */
const DATA = defineData(ID, {
  cheats: list<CheatDef>({ noun: 'cheat', words: { name: true, description: true, blocked: [{ reason: true }], effects: 'effects' } }),
})

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** This save has used the cheat, or any cheat when `cheat` is left out. */
    used: { cheat: arg.entry(DATA.cheats).optional() },
  },
  commands: {
    /** Use the cheat `id`. */
    use: { id: arg.entry(DATA.cheats) },
  },
})

/**
 * A cheat the game declares in `data.cheats.cheats`. Using it runs its effects at once, in any scene and through any
 * lock, and ends no turn unless its effects do.
 */
export type CheatDef = {
  /** The cheat's id, unique among the game's cheats. */
  id: string
  /** The cheat's name, which its button shows, such as "+20 coins". */
  name: string
  /** The cheat's line in the cheats panel. */
  description?: string
  /** The cheat's effects, run in order. It must have at least one. */
  effects: EffectRef[]
  /**
   * The cheat's refusals. The first entry whose `when` holds refuses the button with its reason, or leaves the cheat
   * out of the view with `hide`.
   *
   * A supporter-only cheat is `{ when: { not: { 'unlocks/has': { unlock: 'supporter' } } }, reason: 'For supporters' }`.
   */
  blocked?: Blocked[]
  /** The heading the cheat is listed under in the panel. Cheats with none come first. */
  group?: string
  /**
   * The cheat's limit, once in a save (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`), as a choice's `once` is.
   *
   * `reason` is the refusal once it's used. The `cheats/usedOnce` string, "Already used.", if left out.
   */
  once?: Once
}

/** A use of a cheat, one entry of `CheatsState.used`. */
export type CheatUse = {
  /** The id of the cheat used. */
  cheat: string
  /** The turn the cheat was used on. */
  turn: number
}

/** The log of cheat uses a save keeps. Definitions are read from content, so only the uses are kept. */
export type CheatsState = {
  /** The save's uses of cheats, oldest first. */
  used: CheatUse[]
}

/** A cheat as the player sees it, in `view.plugins.cheats.cheats`. */
export type CheatView = {
  /** The cheat's id. */
  id: string
  /** The cheat's name. */
  name: string
  /** The cheat's description, or `''` when it has none. */
  description: string
  /** The heading the cheat goes under, or null when it has none. */
  group: string | null
  /** The cheat's `once` limit, `'game'` or `'turn'`, or null when it can be used any number of times. */
  once: 'game' | 'turn' | null
  /** The number of times this save has used the cheat. */
  used: number
  /** The cheat's button. It's refused with its reason while a `blocked` entry holds, or once a `once` cheat is used. */
  button: RenderedChoice
}

/** The cheats as the player sees them, in `view.plugins.cheats`. */
export type CheatsView = {
  /** The cheats the player can see, in the order the game declares them. A cheat refused by an entry with `hide` is left out. */
  cheats: CheatView[]
  /** The number of cheat uses in this save, counting every cheat. */
  used: number
}

/** Returns the game's cheats, `data.cheats.cheats` from its content and packs, in declared order. */
export function cheatsOf(game: Game): CheatDef[] {
  return DATA.cheats.all(game)
}

/** Returns the game's cheat with the id `id`, or undefined when there is none. */
export function cheatOf(game: Game, id: string): CheatDef | undefined {
  return DATA.cheats.get(game, id)
}

function timesUsed(slice: CheatsState, cheat?: string): number {
  return cheat === undefined ? slice.used.length : slice.used.filter((use) => use.cheat === cheat).length
}

/** Has a cheat with `once` been used as often as it can: ever, or this turn? */
function spent(state: GameState, slice: CheatsState, cheat: CheatDef): boolean {
  return slice.used.some((use) => use.cheat === cheat.id && (cheat.once?.per !== 'turn' || use.turn === state.turn))
}

/** The first `blocked` entry that holds now, or undefined. */
function blockedBy(cheat: CheatDef, state: GameState, game: Game): Blocked | undefined {
  return (cheat.blocked ?? []).find((entry) => holds(state, game, entry.when))
}

/** Why the player can't use the cheat now, or undefined. */
function cantUse(state: GameState, { id }: { id: string }, context: PluginContext<CheatsState>): string | undefined {
  const { game, slice } = context
  const cheat = cheatOf(game, id)
  if (!cheat) return stringOf(game, 'cheats/unknown')
  const blocked = blockedBy(cheat, state, game)
  if (blocked) return reasonOf(game, blocked.reason)
  if (cheat.once && spent(state, slice, cheat)) return reasonOf(game, cheat.once.reason ?? { string: 'cheats/usedOnce' })
  return undefined
}

/** Everything the UI needs for a cheat panel. */
function cheatsView(state: GameState, context: PluginContext<CheatsState>): CheatsView {
  const { game, slice } = context
  const shown = cheatsOf(game).filter((cheat) => !blockedBy(cheat, state, game)?.hide)
  return {
    cheats: shown.map((cheat): CheatView => ({
      id: cheat.id,
      name: cheat.name,
      description: cheat.description ?? '',
      group: cheat.group ?? null,
      once: cheat.once?.per ?? null,
      used: timesUsed(slice, cheat.id),
      button: renderAction(state, game, { id: `cheat.${cheat.id}`, label: cheat.name, command: runCheat(cheat.id) }),
    })),
    used: slice.used.length,
  }
}

/**
 * The plugin. Add it to the game's `plugins`, and put cheats in the content's
 * `data.cheats.cheats`.
 */
function cheatsPlugin(): DefinedPlugin<CheatsState, CheatsView> {
  return definePlugin<CheatsState, CheatsView, typeof CALLS>({
    id: ID,
    version: 1,
    calls: CALLS,
    data: DATA,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    start: () => ({ used: [] }),
    // Unlocks is what a supporter-only cheat names in its `blocked`, when the game has it.
    cooperates: ['unlocks'],
    strings: {
      unknown: 'There’s no such cheat.',
      usedOnce: 'Already used.',
    },
    conditions: {
      /** `{ 'cheats/used': { cheat? } }`: this save has used the cheat, or any cheat when `cheat` is left out. */
      used: (_state, { cheat }, { slice }) => timesUsed(slice, cheat) > 0,
    },
    values: {
      /** `{{cheats/used}}`: how many times this save has used a cheat; with `cheat`, that one. */
      used: (_state, args, { slice }) => timesUsed(slice, typeof args.cheat === 'string' ? args.cheat : undefined),
    },
    commands: {
      /**
       * `{ 'cheats/use': { id } }`: use the cheat `id`. Works in any scene and
       * through any lock, costs nothing, and ends no turn unless its effects do.
       */
      use: {
        ignoresLocks: true,
        whyNot: cantUse,
        run: (state, args, context) => {
          const cheat = cheatOf(context.game, args.id)!
          const next = context.apply(cheat.effects ?? [], state)
          const slice = context.get(next)
          return context.set({ used: [...slice.used, { cheat: cheat.id, turn: state.turn }] }, next)
        },
      },
    },
    view: (state, context) => cheatsView(state, context),
    references: {
      content: (game) =>
        DATA.cheats.content(game, (cheat) => [
          { effects: cheat.effects },
          { reason: cheat.once?.reason },
          ...(cheat.blocked ?? []).map((entry) => ({ within: 'blocked', refs: [{ when: entry.when }, { reason: entry.reason }] })),
        ]),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      const seen = new Set<string>()
      for (const cheat of cheatsOf(game)) {
        const problem = (what: string) => problems.push(DATA.cheats.problem(cheat.id, what))
        if (seen.has(cheat.id)) problem('two cheats share this id')
        seen.add(cheat.id)
        if (typeof cheat.name !== 'string' || !cheat.name.trim()) problem('has no name')
        if (!Array.isArray(cheat.effects) || !cheat.effects.length) problem('has no effects')
        for (const entry of cheat.blocked ?? [])
          if (typeof entry.reason === 'string' ? !entry.reason.trim() : typeof entry.reason?.string !== 'string') problem('a blocked entry has no reason')
      }
      return problems
    },
  })
}

/** A command: use the cheat. */
const runCheat = (cheat: string): CommandRef => CALLS.commands.use({ id: cheat })
/** A condition: this save has used the cheat, or any cheat when none is named. */
const cheatUsed = (cheat?: string): Condition => CALLS.conditions.used(cheat === undefined ? undefined : { cheat })

/**
 * Returns the cheats plugin, for the game's `plugins`. It cooperates with unlocks, whose `unlocks/has` condition a
 * supporter-only cheat names in `blocked`.
 *
 * Content declares the cheats in `data.cheats.cheats`, and the helpers write its calls, such as `cheats.use('rich')`.
 */
export const cheats = Object.assign(cheatsPlugin, {
  /** Returns the `cheats/use` command, which runs the cheat's effects through any lock and logs the use. */
  use: runCheat,
  /** Returns the `cheats/used` condition, which holds once this save has used the cheat, or any cheat when none is named. */
  used: cheatUsed,
})
