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
import {
  arg,
  defineCalls,
  defineData,
  definePlugin,
  list,
  stringOf,
  type CommandRef,
  type CommandsOf,
  type Condition,
  type ConditionsOf,
  type DefinedPlugin,
  type EffectRef,
  type EffectsOf,
  type Game,
  type PluginProblem,
} from '@ifloom/engine'

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
 * The lists of the plugin's content, each declared once: `data.__id__.entries`,
 * what one entry is called in a problem, and which of its fields are words a
 * player reads, so a translation's `words` table reaches them
 * (`__id__/entries.<id>.label`, https://ifloom.dev/docs/reference/words).
 */
const DATA = defineData(ID, { entries: list<__Pascal__Entry>({ noun: 'entry', words: { label: true } }) })

/**
 * The plugin's conditions, effects and commands, each declared once with what
 * it takes. The implementations below are handed their arguments typed and
 * read from what content wrote; the content checker reports an argument left
 * out, of the wrong shape or that names an entry the game lacks; and the
 * helpers write calls with these writers.
 */
const CALLS = defineCalls(ID, {
  conditions: {
    /** The entry has been marked. */
    marked: { entry: arg.entry(DATA.entries) },
  },
  effects: {
    /** Mark the entry now. */
    mark: { entry: arg.entry(DATA.entries) },
  },
  commands: {
    /** Mark the entry `id`. */
    mark: { id: arg.entry(DATA.entries) },
  },
})

/**
 * What content writes for each call, from `CALLS`, and what the view holds,
 * so a game that imports the plugin has its calls checked:
 * `{ '__id__/marked': { entyr } }` fails to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    '__id__': __Pascal__View
  }
}

/** The game's entries: `data.__id__.entries`, from its content and packs. A list is read with `<list>Of(game)`, one by id with `<one>Of(game, id)`. */
export function entriesOf(game: Game): __Pascal__Entry[] {
  return DATA.entries.all(game)
}

/** One of the game's entries, by id. */
export function entryOf(game: Game, id: string): __Pascal__Entry | undefined {
  return DATA.entries.get(game, id)
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
  return definePlugin<__Pascal__State, __Pascal__View, typeof CALLS>({
    id: ID,
    version: 1,
    calls: CALLS,
    data: DATA,
    start: () => ({ marked: {} }),
    // The plugin's own lines, which a game rewords by their full key, `__id__/noSuchEntry`.
    strings: { noSuchEntry: 'There is nothing like that.' },
    conditions: {
      /** `{ '__id__/marked': { entry } }`: the entry has been marked. */
      marked: (_state, { entry }, { slice }) => slice.marked[entry] !== undefined,
    },
    effects: {
      /** `{ '__id__/mark': { entry } }`: mark the entry now. */
      mark: (state, { entry }, { slice, set, game }) => {
        if (slice.marked[entry] !== undefined || !entryOf(game, entry)) return state
        return set({ ...slice, marked: { ...slice.marked, [entry]: state.turn } })
      },
    },
    commands: {
      /** `{ '__id__/mark': { id } }`: mark the entry `id`. */
      mark: {
        whyNot: (_state, { id }, { game }) => (entryOf(game, id) ? undefined : stringOf(game, '__id__/noSuchEntry')),
        run: (state, { id }, { slice, set }) => set({ ...slice, marked: { ...slice.marked, [id]: state.turn } }),
      },
    },
    view: (_state, { slice, game }): __Pascal__View => ({
      entries: entriesOf(game).map((entry) => ({ id: entry.id, label: entry.label, marked: slice.marked[entry.id] !== undefined })),
    }),
    // What a call names comes from `CALLS`. What the content names would go in `references.content`, `DATA.entries.content(game, ...)`.
    check: (game) => {
      const problems: PluginProblem[] = []
      const seen = new Set<string>()
      for (const entry of entriesOf(game)) {
        if (seen.has(entry.id)) problems.push(DATA.entries.problem(entry.id, 'two entries share this id'))
        seen.add(entry.id)
      }
      return problems
    },
  })
}

/** A condition: the entry has been marked. */
const marked = (entry: string): Condition => CALLS.conditions.marked({ entry })
/** An effect: mark the entry. */
const mark = (entry: string): EffectRef => CALLS.effects.mark({ entry })
/** A command: mark the entry. */
const markCommand = (entry: string): CommandRef => CALLS.commands.mark({ id: entry })

/**
 * The plugin, with its helpers on it: `__camel__()` makes the plugin for the
 * game's `plugins`, and content is written with `__camel__.mark('bread')`,
 * so the helpers' names never clash with another plugin's.
 */
export const __camel__ = Object.assign(__camel__Plugin, { marked, mark, markCommand })
