/**
 * @ifloom/plugin-debug — commands for testing a game while it runs: set a stat
 * (an entity's too) or a kv key, set how many of a thing someone holds, jump
 * to a scene, set the
 * clock, go anywhere.
 *
 * Every command here ignores locks, needs no exit and pays no cost: it is a
 * hand on the state, not a move in the story. A release build leaves the plugin
 * out of `game.plugins`, and none of it is there.
 *
 * Its view lists what a debugger wants on screen: the locks that are on, the
 * triggers that have fired, and the seed.
 */
import {
  clampStat,
  definePlugin,
  entityOf,
  canHold,
  holds,
  resolveHolder,
  YOU,
  parseRef,
  stringOf,
  sceneById,
  statDef,
  writeEntity,
  type CommandRef,
  type DefinedPlugin,
  type Game,
  type KvValue,
  type PluginCommand,
} from '@ifloom/engine'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

export type DebugView = {
  /** Every lock whose `when` holds now, with what it stops and why. */
  locks: { reason: string; deny: string[] }[]
  /** Triggers that have fired, with the turn each last did. */
  fired: Record<string, number>
  seed: number
}

const free = (command: Omit<PluginCommand<null>, 'ignoresLocks'>): PluginCommand<null> => ({ ...command, ignoresLocks: true })

/** A real number: not text that looks like one, not NaN or Infinity. */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isKvValue(value: unknown): value is KvValue {
  return typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string'
}

/** The plugin. Add it to `game.plugins` in development builds only. */
/**
 * What content writes for each of the plugin's calls, its queries' answers
 * and its view, so a call with a misspelled argument fails to compile.
 */
declare module '@ifloom/engine' {
  interface CommandCalls {
    'debug/stat': { stat: string; to: number; of?: string }
    'debug/kv': { key: string; to: KvValue }
    'debug/held': { entity: string; to: number; at?: string }
    'debug/scene': { id?: string } | true
    'debug/time': { day?: number; period?: string }
    'debug/turn': { to: number }
    'debug/go': { id: string }
  }
  interface PluginViews {
    debug: DebugView
  }
}

export function debug(): DefinedPlugin<null, DebugView> {
  return definePlugin<null, DebugView>({
    id: 'debug',
    version: 1,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    commandVersion: COMMAND_VERSION,
    commandMigrations,
    // The clock is the calendar's and the map is the places plugin's: debug/time and debug/go set them when the game has them.
    cooperates: ['calendar', 'places'],
    strings: {
      noSuchStat: 'There is no stat called {id}.',
      noSuchEntity: 'There is nobody and nothing called {id}.',
      notTheirs: 'That is not whose {id} it is.',
      cantHold: '{id} can’t hold things.',
      noSuchPlace: 'There is no location called {id}.',
      noPlaces: 'This game has no places.',
      noSuchScene: 'There is no scene called {id}.',
      badValue: 'A kv key holds true, false, a number or a word.',
      notANumber: 'That needs a number.',
      badTime: 'A day is a whole number from 0, and a period one of {periods}.',
      noCalendar: 'This game has no calendar.',
      notATurn: 'A turn is a whole number from 0.',
    },
    commands: {
      /** `{ name: 'debug/stat', with: { stat, to, of? } }`: put a stat at a value, held to its range; with `of`, an entity's. */
      stat: free({
        whyNot: (state, args, { game }) => {
          const def = statDef(game, String(args.stat))
          if (!def) return sayDebug(game, 'noSuchStat', String(args.stat))
          if (args.of !== undefined && !entityOf(state, game, String(args.of))) return sayDebug(game, 'noSuchEntity', String(args.of))
          // The stat must be the owner's: the player's with no `of`, its kind's with one.
          const kind = args.of === undefined ? undefined : parseRef(String(args.of))?.kind
          if (def.of !== kind) return sayDebug(game, 'notTheirs', String(args.stat))
          return isNumber(args.to) ? undefined : sayDebug(game, 'notANumber')
        },
        // A hand on the state: held to the stat's range, but no game rule (`onStat`) is asked.
        run: (state, args, { game }) => {
          const key = String(args.stat)
          const to = clampStat(state, game, key, Number(args.to))
          if (args.of === undefined) return { ...state, stats: { ...state.stats, [key]: to } }
          const ref = String(args.of)
          const entity = entityOf(state, game, ref)!
          return writeEntity(state, ref, { ...entity, stats: { ...entity.stats, [key]: to } })
        },
      }),
      /** `{ name: 'debug/kv', with: { key, to } }`: set a key in the kv store. */
      kv: free({
        whyNot: (_state, args, { game }) => (isKvValue(args.to) ? undefined : sayDebug(game, 'badValue')),
        run: (state, args) => ({ ...state, kv: { ...state.kv, [String(args.key)]: args.to as KvValue } }),
      }),
      /**
       * `{ name: 'debug/held', with: { entity, at?, to } }`: set how many of a thing a holder
       * holds, `'you'` if `at` is left out. Never below 0, and a unique thing is taken from whoever had it.
       */
      held: free({
        whyNot: (state, args, { game }) => {
          if (!entityOf(state, game, String(args.entity))) return sayDebug(game, 'noSuchEntity', String(args.entity))
          const at = args.at === undefined ? YOU : String(args.at)
          if (!canHold(state, game, resolveHolder(state, at))) return sayDebug(game, 'cantHold', at)
          return isNumber(args.to) ? undefined : sayDebug(game, 'notANumber')
        },
        run: (_state, args, { apply }) => apply([{ entity: String(args.entity), at: args.at === undefined ? YOU : String(args.at), to: Number(args.to) }]),
      }),
      /** `{ name: 'debug/scene', with: { id } }`: put the scene `id` on screen; leave `id` out to close it. */
      scene: free({
        whyNot: (_state, args, { game }) =>
          args.id === undefined || sceneById(game, String(args.id)) ? undefined : sayDebug(game, 'noSuchScene', String(args.id)),
        run: (state, args) => ({ ...state, sceneId: args.id === undefined ? null : String(args.id) }),
      }),
      /**
       * `{ name: 'debug/time', with: { day?, period? } }`: set the calendar's clock, when the
       * game has the calendar. No turn ends, and nothing that happens overnight runs.
       */
      time: free({
        whyNot: (_state, args, { game, query }) => {
          const periods = query<string[]>('calendar/periods')
          if (!periods) return sayDebug(game, 'noCalendar')
          const ok =
            (args.day === undefined || (isNumber(args.day) && Number.isInteger(args.day) && args.day >= 0)) &&
            (args.period === undefined || periods.includes(String(args.period)))
          return ok ? undefined : sayDebug(game, 'badTime', undefined, periods.join(', '))
        },
        run: (_state, args, { apply }) =>
          apply([
            {
              'calendar/set': {
                ...(args.day === undefined ? {} : { day: Number(args.day) }),
                ...(args.period === undefined ? {} : { period: String(args.period) }),
              },
            },
          ]),
      }),
      /** `{ name: 'debug/turn', with: { to } }`: set how many turns have passed. No turn's rules run. */
      turn: free({
        whyNot: (_state, args, { game }) => (isNumber(args.to) && Number.isInteger(args.to) && args.to >= 0 ? undefined : sayDebug(game, 'notATurn')),
        run: (state, args) => ({ ...state, turn: Number(args.to) }),
      }),
      /**
       * `{ name: 'debug/go', with: { id } }`: be at the place `id`, when the game has places:
       * no exit needed, and nothing on arrival.
       */
      go: free({
        whyNot: (_state, args, { game, query }) => {
          const known = query<boolean>('places/known', { location: String(args.id) })
          if (known === undefined) return sayDebug(game, 'noPlaces')
          return known ? undefined : sayDebug(game, 'noSuchPlace', String(args.id))
        },
        run: (_state, args, { apply }) => apply([{ 'places/move': { location: String(args.id) } }]),
      }),
    },
    view: (state, { game }): DebugView => ({
      locks: (game.locks ?? []).filter((lock) => holds(state, lock.when, game)).map((lock) => ({ reason: lock.reason, deny: [...lock.deny] })),
      fired: { ...state.fired },
      seed: state.seed,
    }),
  })
}

function sayDebug(game: Game, key: string, id?: string, periods?: string): string {
  return stringOf(game, `debug/${key}`, { ...(id === undefined ? {} : { id }), ...(periods === undefined ? {} : { periods }) })
}

/** A command: put a stat at a value. */
export const debugStat = (stat: string, to: number, of?: string): CommandRef => ({ 'debug/stat': { stat, to, ...(of === undefined ? {} : { of }) } })
/** A command: set a key in the kv store. */
export const debugKv = (key: string, to: KvValue): CommandRef => ({ 'debug/kv': { key, to } })
/** A command: set how many of a thing a holder holds, `'you'` if `at` is left out. */
export const debugHeld = (entity: string, to: number, at?: string): CommandRef => ({ 'debug/held': { entity, to, ...(at === undefined ? {} : { at }) } })
/** A command: put a scene on screen, or close it. */
export const debugScene = (scene?: string): CommandRef => ({ 'debug/scene': { id: scene } })
/** A command: set the clock. */
export const debugTime = (time: { day?: number; period?: string }): CommandRef => ({ 'debug/time': time })
/** A command: set how many turns have passed. */
export const debugTurn = (turn: number): CommandRef => ({ 'debug/turn': { to: turn } })
/** A command: be somewhere. */
export const debugGo = (location: string): CommandRef => ({ 'debug/go': { id: location } })
