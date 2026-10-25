/**
 * {{title}}, a plugin for IFLoom. TODO: what it adds, in a sentence or two.
 *
 * It imports only `@ifloom/engine` and requires no other plugin. To work with
 * one the game may have, list it in `cooperates` and ask it through its
 * conditions, effects and `query`, which answer nothing when the game lacks it.
 * Any UI draws its view from `view.plugins.__id__`. Its own React UI is in
 * `src/react/`, the `/react` subpath, which a game drawn another way never loads.
 *
 * How each part is named: https://ifloom.dev/docs/reference/plugins#naming
 */
import { definePlugin, stringOf, type CommandRef, type Condition, type DefinedPlugin, type EffectRef, type Game, type PluginProblem } from '@ifloom/engine'

const ID = '__id__'

/** One entry of the plugin's content, from the game's `data.__id__.entries`. TODO: the real fields. */
export type __Pascal__Entry = {
  id: string
  label: string
}

/** What the plugin keeps in a save. Bump `version` and add a migration when this changes shape. */
export type __Pascal__State = {
  /** Entries marked, with the turn each was marked on. */
  marked: Record<string, number>
}

/** What a UI reads at `view.plugins.__id__`. */
export type __Pascal__View = {
  entries: { id: string; label: string; marked: boolean }[]
}

/**
 * What content writes for each call, and what the view holds, so a game that
 * imports the plugin has its calls checked: `{ '__id__/marked': { entyr } }`
 * fails to compile. Keep each entry true to what the plugin reads.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry {
    '__id__/marked': { entry: string }
  }
  interface EffectRegistry {
    '__id__/mark': { entry: string }
  }
  interface CommandRegistry {
    '__id__/mark': { id: string }
  }
  interface ViewRegistry {
    '__id__': __Pascal__View
  }
}

/** The game's entries: `data.__id__.entries`, from its content and packs. A list is read with `<list>Of(game)`, one by id with `<one>Of(game, id)`. */
export function entriesOf(game: Game): __Pascal__Entry[] {
  return (game.data?.[ID]?.entries ?? []) as __Pascal__Entry[]
}

/** The entry a call names: a condition's or an effect's `entry`, a command's `id`. */
function entryId(args: Record<string, unknown>): string {
  return String(args.entry ?? args.id ?? '')
}

/**
 * The plugin. Add it to the game's `plugins`, and put entries in its content's
 * `data.__id__.entries`. Anything a mod could add or change is content in
 * `data`, never an option. Hooks are flat members named `onX` (`onTurn`,
 * `onCommand`) and return the next state; providers are nouns (`view`,
 * `label`) and change nothing. The helpers content is written with go on the
 * factory, below.
 */
function __camel__Plugin(): DefinedPlugin<__Pascal__State, __Pascal__View> {
  return definePlugin<__Pascal__State, __Pascal__View>({
    id: ID,
    version: 1,
    start: () => ({ marked: {} }),
    // The plugin's own lines, which a game rewords by their full key, `__id__/noSuchEntry`.
    strings: { noSuchEntry: 'There is nothing like that.' },
    // Which fields of its content are words a player reads, so a translation's `words` table reaches them:
    // `__id__/entries.<id>.label`. https://ifloom.dev/docs/reference/words
    words: { entries: { label: true } },
    conditions: {
      /** `{ '__id__/marked': { entry } }`: the entry has been marked. */
      marked: (_state, args, { slice }) => slice.marked[entryId(args)] !== undefined,
    },
    effects: {
      /** `{ '__id__/mark': { entry } }`: mark the entry now. */
      mark: (state, args, { slice, set, game }) => {
        const id = entryId(args)
        if (slice.marked[id] !== undefined || !entriesOf(game).some((entry) => entry.id === id)) return state
        return set({ ...slice, marked: { ...slice.marked, [id]: state.turn } })
      },
    },
    commands: {
      /** `{ '__id__/mark': { id } }`: mark the entry `id`. */
      mark: {
        whyNot: (_state, args, { game }) => (entriesOf(game).some((entry) => entry.id === entryId(args)) ? undefined : stringOf(game, '__id__/noSuchEntry')),
        run: (state, args, { slice, set }) => set({ ...slice, marked: { ...slice.marked, [entryId(args)]: state.turn } }),
      },
    },
    view: (_state, { slice, game }): __Pascal__View => ({
      entries: entriesOf(game).map((entry) => ({ id: entry.id, label: entry.label, marked: slice.marked[entry.id] !== undefined })),
    }),
    references: {
      // The entry a condition, effect or command names, for the content checker.
      calls: (_table, _name, args) => (entryId(args) === '' ? [] : [{ entry: entryId(args), plugin: ID, list: 'entries', noun: 'entry' }]),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      const seen = new Set<string>()
      for (const entry of entriesOf(game)) {
        if (seen.has(entry.id)) problems.push({ list: 'entries', id: entry.id, what: 'two entries share this id' })
        seen.add(entry.id)
      }
      return problems
    },
  })
}

/** A condition: the entry has been marked. */
const marked = (entry: string): Condition => ({ [`${ID}/marked`]: { entry } })
/** An effect: mark the entry. */
const mark = (entry: string): EffectRef => ({ [`${ID}/mark`]: { entry } })
/** A command: mark the entry. */
const markCommand = (entry: string): CommandRef => ({ [`${ID}/mark`]: { id: entry } })

/**
 * The plugin, with its helpers on it: `__camel__()` makes the plugin for the
 * game's `plugins`, and content is written with `__camel__.mark('bread')`,
 * so the helpers' names never clash with another plugin's.
 */
export const __camel__ = Object.assign(__camel__Plugin, { marked, mark, markCommand })
