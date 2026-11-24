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
  canHold,
  clampStat,
  entityOf,
  holds,
  parseRef,
  resolveHolder,
  sceneOf,
  statOf,
  stringOf,
  writeEntity,
  YOU,
  type CommandRef,
  type Game,
  type KvValue,
} from '@ifloom/engine'
import { arg, defineCalls, definePlugin, type CommandsOf, type DefinedPlugin, type PluginCommand } from '@ifloom/engine/plugin'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

/** The debug readout as the developer sees it, in `view.plugins.debug`. It lists the locks that are on, the triggers that have fired and the seed. */
export type DebugView = {
  /** The game's locks whose `when` holds now, each with its reason and the commands it denies. */
  locks: { reason: string; deny: string[] }[]
  /** The triggers that have fired, each id mapped to the turn it last fired on. */
  fired: Record<string, number>
  /** The save's seed, which every random draw is hashed from. */
  seed: number
}

/** A command that ignores locks, as every debug command does. */
const free = <A>(command: Omit<PluginCommand<null, A>, 'ignoresLocks'>): PluginCommand<null, A> => ({ ...command, ignoresLocks: true })

/** A real number: not text that looks like one, not NaN or Infinity. */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls('debug', {
  commands: {
    /** Put a stat at a value, held to its range; with `of`, an entity's. */
    stat: { stat: arg.string(), to: arg.number(), of: arg.string().optional() },
    /** Set a key in the kv store. */
    kv: { key: arg.string(), to: arg.kv() },
    /** Set how many of a thing a holder holds, `'you'` if `at` is left out. */
    held: { entity: arg.string(), to: arg.number(), at: arg.string().optional(YOU) },
    /** Put the scene `id` on screen; leave `id` out to close it. */
    scene: { id: arg.string().optional() },
    /** Set the calendar's clock. */
    time: { day: arg.number().optional(), period: arg.string().optional() },
    /** Set how many turns have passed. */
    turn: { to: arg.number() },
    /** Be at the place `id`. */
    go: { id: arg.string() },
  },
})

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    debug: DebugView
  }
}

/** The plugin. Add it to `game.plugins` in development builds only. */
function debugPlugin(): DefinedPlugin<null, DebugView> {
  return definePlugin<null, DebugView, typeof CALLS>({
    id: 'debug',
    version: 1,
    calls: CALLS,
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
      notANumber: 'That needs a number.',
      badTime: 'A day is a whole number from 0, and a period one of {periods}.',
      noCalendar: 'This game has no calendar.',
      notATurn: 'A turn is a whole number from 0.',
    },
    commands: {
      /** `{ name: 'debug/stat', with: { stat, to, of? } }`: put a stat at a value, held to its range; with `of`, an entity's. */
      stat: free({
        whyNot: (state, { stat, to, of }, { game }) => {
          const def = statOf(game, stat)
          if (!def) return sayDebug(game, 'noSuchStat', stat)
          if (of !== undefined && !entityOf(state, game, of)) return sayDebug(game, 'noSuchEntity', of)
          // The stat must be the owner's: the player's with no `of`, its kind's with one.
          const kind = of === undefined ? undefined : parseRef(of)?.kind
          if (def.of !== kind) return sayDebug(game, 'notTheirs', stat)
          return isNumber(to) ? undefined : sayDebug(game, 'notANumber')
        },
        // A hand on the state: held to the stat's range, but no game rule (`onStat`) is asked.
        run: (state, { stat: key, to: value, of: ref }, { game }) => {
          const to = clampStat(state, game, key, value)
          if (ref === undefined) return { ...state, stats: { ...state.stats, [key]: to } }
          const entity = entityOf(state, game, ref)!
          return writeEntity(state, ref, { ...entity, stats: { ...entity.stats, [key]: to } })
        },
      }),
      /** `{ name: 'debug/kv', with: { key, to } }`: set a key in the kv store. */
      kv: free({
        // A value that isn't true, false, a number or a word is refused by its declaration.
        run: (state, { key, to }) => ({ ...state, kv: { ...state.kv, [key]: to } }),
      }),
      /**
       * `{ name: 'debug/held', with: { entity, at?, to } }`: set how many of a thing a holder
       * holds, `'you'` if `at` is left out. Never below 0, and a unique thing is taken from whoever had it.
       */
      held: free({
        whyNot: (state, { entity, at, to }, { game }) => {
          if (!entityOf(state, game, entity)) return sayDebug(game, 'noSuchEntity', entity)
          if (!canHold(state, game, resolveHolder(state, at))) return sayDebug(game, 'cantHold', at)
          return isNumber(to) ? undefined : sayDebug(game, 'notANumber')
        },
        run: (_state, { entity, at, to }, { apply }) => apply([{ entity, at, to }]),
      }),
      /** `{ name: 'debug/scene', with: { id } }`: put the scene `id` on screen; leave `id` out to close it. */
      scene: free({
        whyNot: (_state, { id }, { game }) => (id === undefined || sceneOf(game, id) ? undefined : sayDebug(game, 'noSuchScene', id)),
        run: (state, { id }) => ({ ...state, sceneId: id ?? null }),
      }),
      /**
       * `{ name: 'debug/time', with: { day?, period? } }`: set the calendar's clock, when the
       * game has the calendar. No turn ends, and nothing that happens overnight runs.
       */
      time: free({
        whyNot: (_state, { day, period }, { game, query }) => {
          const periods = query('calendar/periods')
          if (!periods) return sayDebug(game, 'noCalendar')
          const ok = (day === undefined || (isNumber(day) && Number.isInteger(day) && day >= 0)) && (period === undefined || periods.includes(period))
          return ok ? undefined : sayDebug(game, 'badTime', undefined, periods.join(', '))
        },
        run: (_state, { day, period }, { apply }) =>
          apply([{ 'calendar/set': { ...(day === undefined ? {} : { day }), ...(period === undefined ? {} : { period }) } }]),
      }),
      /** `{ name: 'debug/turn', with: { to } }`: set how many turns have passed. No turn's rules run. */
      turn: free({
        whyNot: (_state, { to }, { game }) => (isNumber(to) && Number.isInteger(to) && to >= 0 ? undefined : sayDebug(game, 'notATurn')),
        run: (state, { to }) => ({ ...state, turn: to }),
      }),
      /**
       * `{ name: 'debug/go', with: { id } }`: be at the place `id`, when the game has places:
       * no exit needed, and nothing on arrival.
       */
      go: free({
        whyNot: (_state, { id }, { game, query }) => {
          const known = query('places/known', { location: id })
          if (known === undefined) return sayDebug(game, 'noPlaces')
          return known ? undefined : sayDebug(game, 'noSuchPlace', id)
        },
        run: (_state, { id }, { apply }) => apply([{ 'places/move': { location: id } }]),
      }),
    },
    view: (state, { game }): DebugView => ({
      locks: (game.locks ?? []).filter((lock) => holds(state, game, lock.when)).map((lock) => ({ reason: lock.reason, deny: [...lock.deny] })),
      fired: { ...state.fired },
      seed: state.seed,
    }),
  })
}

function sayDebug(game: Game, key: string, id?: string, periods?: string): string {
  return stringOf(game, `debug/${key}`, { ...(id === undefined ? {} : { id }), ...(periods === undefined ? {} : { periods }) })
}

/** A command: put a stat at a value. */
const debugStat = (stat: string, to: number, of?: string): CommandRef => CALLS.commands.stat({ stat, to, ...(of === undefined ? {} : { of }) })
/** A command: set a key in the kv store. */
const debugKv = (key: string, to: KvValue): CommandRef => CALLS.commands.kv({ key, to })
/** A command: set how many of a thing a holder holds, `'you'` if `at` is left out. */
const debugHeld = (entity: string, to: number, at?: string): CommandRef => CALLS.commands.held({ entity, to, ...(at === undefined ? {} : { at }) })
/** A command: put a scene on screen, or close it. */
const debugScene = (scene?: string): CommandRef => CALLS.commands.scene(scene === undefined ? undefined : { id: scene })
/** A command: set the clock. */
const debugTime = (time: { day?: number; period?: string }): CommandRef => CALLS.commands.time(time)
/** A command: set how many turns have passed. */
const debugTurn = (turn: number): CommandRef => CALLS.commands.turn({ to: turn })
/** A command: be somewhere. */
const debugGo = (location: string): CommandRef => CALLS.commands.go({ id: location })

/**
 * Returns the debug plugin, for the game's `plugins` in development builds only. Its commands ignore locks, need no
 * exit and pay no cost, and a release build leaves the plugin out.
 *
 * Its helpers write its commands, such as `debug.stat('coins', 10)`. It cooperates with the calendar and places, which
 * `debug/time` and `debug/go` need.
 */
export const debug = Object.assign(debugPlugin, {
  /** Returns the `debug/stat` command, which sets the stat to `to`, clamped to its range. With `of`, it sets the entity's stat. */
  stat: debugStat,
  /** Returns the `debug/kv` command, which sets the kv key to `to`. */
  kv: debugKv,
  /** Returns the `debug/held` command, which sets how many of the thing the holder `at` holds. `'you'` if `at` is left out. */
  held: debugHeld,
  /** Returns the `debug/scene` command, which opens the scene, or closes the open scene when none is named. */
  scene: debugScene,
  /** Returns the `debug/time` command, which sets the calendar's day and period without ending a turn. It's refused without the calendar. */
  time: debugTime,
  /** Returns the `debug/turn` command, which sets the turn count without running any turn's rules. */
  turn: debugTurn,
  /** Returns the `debug/go` command, which moves the player to the location with no exit needed. It's refused without places. */
  go: debugGo,
})
