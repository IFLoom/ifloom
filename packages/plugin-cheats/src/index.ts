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
  definePlugin,
  holds,
  renderAction,
  say,
  type Blocked,
  type CommandRef,
  type Condition,
  type DefinedPlugin,
  type EffectRef,
  type Game,
  type GameState,
  type PluginArgs,
  type PluginContext,
  type PluginProblem,
  type Reference,
  type RenderedChoice,
} from '@ifloom/engine'
import { CONTENT_VERSION, contentMigrations } from './upgrade.ts'

const ID = 'cheats'

/** A cheat, as content declares it in a pack's `data.cheats.cheats`. */
export type CheatDef = {
  id: string
  /** What its button says: "+20 coins". */
  label: string
  /** A line about it, for the panel. */
  description?: string
  /** What it does, in order, as any effect list runs. */
  effects: EffectRef[]
  /**
   * Why it is refused: the first entry whose `when` holds greys the button
   * out with its reason, or leaves it off the panel with `hide`. A
   * supporter-only cheat is `{ when: { not: { 'unlocks/has': { unlock: 'supporter' } } }, reason: 'For supporters' }`.
   */
  blocked?: Blocked[]
  /** The heading it is listed under in the panel. Cheats with none come first. */
  group?: string
  /** Usable once in a save. */
  once?: boolean
}

/** One use of a cheat: which, and on which turn. */
export type CheatUse = { cheat: string; turn: number }

/** What the plugin keeps in a save. */
export type CheatsState = {
  /** Every use of a cheat in this save, oldest first. */
  used: CheatUse[]
}

/** A cheat as the UI shows it. */
export type CheatView = {
  id: string
  label: string
  description: string
  /** The heading it goes under, or null. */
  group: string | null
  once: boolean
  /** How many times this save has used it. */
  used: number
  /** The button that uses it: greyed out with its reason while blocked or, for a `once` cheat, after its use. */
  button: RenderedChoice
}

/** What the UI reads at `view.plugins.cheats`. */
export type CheatsView = {
  /** The cheats the player can see, in the order the game declares them. A blocked one with `hide` is left out. */
  cheats: CheatView[]
  /** How many cheats this save has used in all. */
  used: number
}

/** The game's cheats: `data.cheats.cheats`, from its packs. */
export function cheatDefs(game: Game): CheatDef[] {
  return (game.data?.[ID]?.cheats ?? []) as CheatDef[]
}

function cheatOf(game: Game, id: unknown): CheatDef | undefined {
  const wanted = String(id ?? '')
  return cheatDefs(game).find((cheat) => cheat.id === wanted)
}

function sliceOf(state: GameState): CheatsState {
  return (state.plugins?.[ID]?.state as CheatsState | undefined) ?? { used: [] }
}

function timesUsed(slice: CheatsState, cheat?: string): number {
  return cheat === undefined ? slice.used.length : slice.used.filter((use) => use.cheat === cheat).length
}

/** The first `blocked` entry that holds now, or undefined. */
function blockedBy(cheat: CheatDef, state: GameState, game: Game): Blocked | undefined {
  return (cheat.blocked ?? []).find((entry) => holds(state, entry.when, game))
}

/** Why the player can't use the cheat now, or undefined. */
function cantUse(state: GameState, args: PluginArgs, context: PluginContext<CheatsState>): string | undefined {
  const { game, slice } = context
  const cheat = cheatOf(game, args.id)
  if (!cheat) return say(game, 'cheats/unknown')
  const blocked = blockedBy(cheat, state, game)
  if (blocked) return blocked.reason
  if (cheat.once && timesUsed(slice, cheat.id) > 0) return say(game, 'cheats/usedOnce')
  return undefined
}

/** Everything the UI needs for a cheat panel. */
export function cheatsView(state: GameState, context: PluginContext<CheatsState>): CheatsView {
  const { game, slice } = context
  const shown = cheatDefs(game).filter((cheat) => !blockedBy(cheat, state, game)?.hide)
  return {
    cheats: shown.map((cheat): CheatView => ({
      id: cheat.id,
      label: cheat.label,
      description: cheat.description ?? '',
      group: cheat.group ?? null,
      once: Boolean(cheat.once),
      used: timesUsed(slice, cheat.id),
      button: renderAction(state, game, { id: `cheat.${cheat.id}`, label: cheat.label, command: runCheat(cheat.id) }),
    })),
    used: slice.used.length,
  }
}

function cheatRef(cheat: unknown): Reference[] {
  return cheat === undefined ? [] : [{ entry: String(cheat), plugin: ID, list: 'cheats', noun: 'cheat' }]
}

/**
 * The plugin. Add it to the game's `plugins`, and put cheats in a pack's
 * `data.cheats.cheats`.
 */
export function cheats(): DefinedPlugin<CheatsState, CheatsView> {
  return definePlugin<CheatsState, CheatsView>({
    id: ID,
    version: 1,
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
      used: (_state, args, { slice }) => timesUsed(slice, args.cheat === undefined ? undefined : String(args.cheat)) > 0,
    },
    values: {
      /** <code v-pre>{{v:cheats/used}}</code>: how many times this save has used a cheat; with `cheat`, that one. */
      used: (_state, args, { slice }) => timesUsed(slice, args.cheat === undefined ? undefined : String(args.cheat)),
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
          const slice = sliceOf(next)
          return context.set({ used: [...slice.used, { cheat: cheat.id, turn: state.turn }] }, next)
        },
      },
    },
    view: (state, context) => cheatsView(state, context),
    references: {
      calls: (kind, _name, args) => cheatRef(kind === 'commands' ? args.id : args.cheat),
      content: (game) =>
        cheatDefs(game).map((cheat) => ({
          list: 'cheats',
          id: cheat.id,
          refs: [{ effects: cheat.effects }, ...(cheat.blocked ?? []).map((entry): Reference => ({ within: 'blocked', refs: [{ when: entry.when }] }))],
        })),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      const seen = new Set<string>()
      for (const cheat of cheatDefs(game)) {
        const problem = (what: string) => problems.push({ list: 'cheats', id: cheat.id, what })
        if (seen.has(cheat.id)) problem('two cheats share this id')
        seen.add(cheat.id)
        if (typeof cheat.label !== 'string' || !cheat.label.trim()) problem('has no label')
        if (!Array.isArray(cheat.effects) || !cheat.effects.length) problem('has no effects')
        for (const entry of cheat.blocked ?? []) if (typeof entry.reason !== 'string' || !entry.reason.trim()) problem('a blocked entry has no reason')
      }
      return problems
    },
  })
}

/** A command: use the cheat. */
export const runCheat = (cheat: string): CommandRef => ({ [`${ID}/use`]: { id: cheat } })
/** A condition: this save has used the cheat, or any cheat when none is named. */
export const cheatUsed = (cheat?: string): Condition => ({ [`${ID}/used`]: cheat === undefined ? {} : { cheat } })
