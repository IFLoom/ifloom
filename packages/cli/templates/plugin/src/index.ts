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
import { definePlugin, say, type CommandRef, type Condition, type DefinedPlugin, type EffectRef, type Game, type PluginProblem } from '@ifloom/engine'

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

/** The game's entries: `data.__id__.entries`, from its content and packs. */
export function __camel__Entries(game: Game): __Pascal__Entry[] {
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
 * `label`) and change nothing.
 */
export function __camel__(): DefinedPlugin<__Pascal__State, __Pascal__View> {
  return definePlugin<__Pascal__State, __Pascal__View>({
    id: ID,
    version: 1,
    start: () => ({ marked: {} }),
    strings: { noSuchEntry: 'There is nothing like that.' },
    conditions: {
      /** `{ '__id__/marked': { entry } }`: the entry has been marked. */
      marked: (_state, args, { slice }) => slice.marked[entryId(args)] !== undefined,
    },
    effects: {
      /** `{ '__id__/mark': { entry } }`: mark the entry now. */
      mark: (state, args, { slice, set, game }) => {
        const id = entryId(args)
        if (slice.marked[id] !== undefined || !__camel__Entries(game).some((entry) => entry.id === id)) return state
        return set({ ...slice, marked: { ...slice.marked, [id]: state.turn } })
      },
    },
    commands: {
      /** `{ '__id__/mark': { id } }`: mark the entry `id`. */
      mark: {
        whyNot: (_state, args, { game }) => (__camel__Entries(game).some((entry) => entry.id === entryId(args)) ? undefined : say(game, '__id__/noSuchEntry')),
        run: (state, args, { slice, set }) => set({ ...slice, marked: { ...slice.marked, [entryId(args)]: state.turn } }),
      },
    },
    view: (_state, { slice, game }): __Pascal__View => ({
      entries: __camel__Entries(game).map((entry) => ({ id: entry.id, label: entry.label, marked: slice.marked[entry.id] !== undefined })),
    }),
    references: {
      // The entry a condition, effect or command names, for the content checker.
      calls: (_kind, _name, args) => (entryId(args) === '' ? [] : [{ entry: entryId(args), plugin: ID, list: 'entries', noun: 'entry' }]),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      const seen = new Set<string>()
      for (const entry of __camel__Entries(game)) {
        if (seen.has(entry.id)) problems.push({ list: 'entries', id: entry.id, what: 'two entries share this id' })
        seen.add(entry.id)
      }
      return problems
    },
  })
}

/** A condition: the entry has been marked. */
export const __camel__Marked = (entry: string): Condition => ({ [`${ID}/marked`]: { entry } })
/** An effect: mark the entry. */
export const mark__Pascal__ = (entry: string): EffectRef => ({ [`${ID}/mark`]: { entry } })
/** A command: mark the entry. */
export const mark__Pascal__Command = (entry: string): CommandRef => ({ [`${ID}/mark`]: { id: entry } })
