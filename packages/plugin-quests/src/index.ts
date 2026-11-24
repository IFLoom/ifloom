/**
 * The quests plugin, which tracks the player's quests, the stages done and the hint for the next stage.
 *
 * Conditions on the game state mark each stage done, the same conditions that gate the content, so a quest can't
 * drift from the story it describes. The plugin never takes progress back, so a stage that was done stays done.
 *
 * The code's word is quest. The game decides what the player sees it called, such as a journal or a to-do list.
 */
import { holds, stringOf, type CommandRef, type Condition, type EffectRef, type Game, type GameState, type RenderedChoice } from '@ifloom/engine'
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
  type EffectsOf,
  type PluginProblem,
} from '@ifloom/engine/plugin'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

/** A stage the game declares in a {@link QuestDef}'s `stages`. The stage is done the first time its `done` holds after the stages before it. */
export type QuestStage = {
  /** The stage's id, unique within its quest. */
  id: string
  /** The stage's hint, which the player reads while on this stage. */
  hint: string
  /** The condition that marks the stage done, the first time it holds once the stages before it are done. */
  done: Condition
}

/** A quest the game declares in `data.quests.quests`. It needs at least one stage. */
export type QuestDef = {
  /** The quest's id. */
  id: string
  /** The quest's name, such as "Find your feet". */
  name: string
  /** The quest's line or two for the quest list. */
  description?: string
  /** The id of the storyline the quest belongs to, for a UI that groups quests by storyline. */
  storyline?: string
  /** The condition that starts the quest the first time it holds. Without it, only the `quests/start` effect starts the quest. */
  starts?: Condition
  /** True to leave the quest out of the count of quests to find until it starts. */
  secret?: boolean
  /** The quest's stages, in order. The quest is done when the last stage is. */
  stages: QuestStage[]
}

/** The quests a save keeps for the player, their progress, tracking and news. Quests themselves are read from content. */
export type QuestsState = {
  /** The turn each started quest started on, by quest id. */
  started: Record<string, number>
  /** The number of stages done in each started quest, by quest id. */
  reached: Record<string, number>
  /** The turn each finished quest finished on, by quest id. */
  done: Record<string, number>
  /** The id of the quest the player tracks, or null. */
  tracked: string | null
  /** Each quest's progress when the player last looked at it, by quest id. It counts the stages done, plus one once the quest is finished. */
  seen: Record<string, number>
}

/** A started quest as the player sees it, in `view.plugins.quests.active` and `done`. */
export type QuestEntry = {
  /** The quest's id. */
  id: string
  /** The quest's name. */
  name: string
  /** The quest's description, or `''` when it has none. */
  description: string
  /** The id of the quest's storyline, for a UI that groups quests by storyline, or null. */
  storyline: string | null
  /** The hint for the stage the player is on, or `''` once the quest is done. */
  hint: string
  /** The number of the quest's stages done. */
  stage: number
  /** The number of the quest's stages. */
  stages: number
  /** The turn the quest started on. */
  startedOn: number
  /** The turn the quest was done on, or null while it isn't. */
  doneOn: number | null
  /** True when the player tracks this quest. */
  tracked: boolean
  /** True when the quest has started or moved on since the player last looked. */
  updated: boolean
  /**
   * The button that tracks the quest, or stops tracking it once tracked, or null once the quest is done. Its label is
   * the `quests/track` or `quests/untrack` string.
   */
  track: RenderedChoice | null
}

/** The quests as the player sees them, in `view.plugins.quests`. */
export type QuestsView = {
  /** The quests started and not finished, the tracked one first and then the newest first. */
  active: QuestEntry[]
  /** The finished quests, the most recent first. */
  done: QuestEntry[]
  /** The number of quests not started yet, secret ones left out. */
  toFind: number
  /** The number of quests with news the player hasn't looked at, for a badge. */
  updates: number
  /** The button that marks every quest's news seen, labelled with the `quests/allSeen` string (`Mark all seen`), or null while there is none. */
  seen: RenderedChoice | null
}

const ID = 'quests'

/** The plugin's one list, `quests`, as content writes it in `data.quests.quests` (a plugin's `data` holds its lists by name), with the words a player reads in each, for a translation's `words` table. */
const DATA = defineData(ID, {
  quests: list<QuestDef>({ noun: 'quest', words: { name: true, description: true, stages: [{ hint: true }] } }),
})

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** Started and not finished. */
    active: { quest: arg.entry(DATA.quests) },
    /** Finished. */
    done: { quest: arg.entry(DATA.quests) },
    /** That stage is done. */
    reached: { quest: arg.entry(DATA.quests), stage: arg.string() },
  },
  effects: {
    /** Start it now, if it has not started. */
    start: { quest: arg.entry(DATA.quests) },
  },
  commands: {
    /** Track the quest `id`; with none, stop tracking. */
    track: { id: arg.entry(DATA.quests).optional() },
    /** Mark the quest `id` seen; with none, all of them. */
    seen: { id: arg.entry(DATA.quests).optional() },
  },
})

/**
 * What content writes for each of the plugin's calls (from `CALLS`) and its
 * view, so a call with a misspelled argument fails to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    quests: QuestsView
  }
}

function emptyState(): QuestsState {
  return { started: {}, reached: {}, done: {}, tracked: null, seen: {} }
}

/** Returns the game's quests, from `data.quests.quests` in its content and packs. */
export function questsOf(game: Game): QuestDef[] {
  return DATA.quests.all(game)
}

/** Returns the quest with this id, or undefined when the game has none. */
export function questOf(game: Game, id: string): QuestDef | undefined {
  return DATA.quests.get(game, id)
}

/**
 * Returns the quests record brought up to date with the game state. It never takes progress back.
 *
 * @remarks
 * It starts each quest whose `starts` holds, moves each started quest through every stage that is done, in order, and
 * marks finished quests done. A finished quest stops being tracked. A quest condition asked during this pass reads the
 * record as it stands so far.
 */
export function advance(record: QuestsState, state: GameState, game: Game): QuestsState {
  // A quest can start or move on when another one has: its conditions then ask
  // about quests while this pass is still working them out. They read the
  // record as it stands so far rather than starting a pass of their own.
  if (working) return working
  try {
    return advanceOnce(record, state, game)
  } finally {
    working = null
  }
}

/** The record while `advance` is part-way through, for quest conditions asked during it. */
let working: QuestsState | null = null

function advanceOnce(record: QuestsState, state: GameState, game: Game): QuestsState {
  let next = record
  working = next
  const turn = state.turn
  for (const quest of questsOf(game)) {
    let started = next.started[quest.id]
    if (started === undefined) {
      if (!quest.starts || !holds(state, game, quest.starts)) continue
      started = turn
      next = { ...next, started: { ...next.started, [quest.id]: turn } }
      working = next
    }
    if (next.done[quest.id] !== undefined) continue
    let reached = next.reached[quest.id] ?? 0
    while (reached < quest.stages.length && holds(state, game, quest.stages[reached].done)) reached += 1
    if (reached !== (next.reached[quest.id] ?? 0)) {
      next = { ...next, reached: { ...next.reached, [quest.id]: reached } }
      working = next
    }
    if (reached >= quest.stages.length) {
      next = {
        ...next,
        done: { ...next.done, [quest.id]: turn },
        tracked: next.tracked === quest.id ? null : next.tracked,
      }
      working = next
    }
  }
  return next
}

/** How far a quest has got, as one number: stages done, and one more once it is finished. */
function mark(record: QuestsState, id: string): number {
  return (record.reached[id] ?? 0) + (record.done[id] !== undefined ? 1 : 0)
}

/** Started or moved on since the player last looked. */
function isUpdated(record: QuestsState, id: string): boolean {
  const seen = record.seen[id]
  return seen === undefined || seen < mark(record, id)
}

function entry(quest: QuestDef, record: QuestsState, state: GameState, game: Game): QuestEntry {
  const stage = record.reached[quest.id] ?? 0
  const doneOn = record.done[quest.id] ?? null
  return {
    id: quest.id,
    name: quest.name,
    description: quest.description ?? '',
    storyline: quest.storyline ?? null,
    hint: doneOn === null ? (quest.stages[stage]?.hint ?? '') : '',
    stage,
    stages: quest.stages.length,
    startedOn: record.started[quest.id] ?? 0,
    doneOn,
    tracked: record.tracked === quest.id,
    updated: isUpdated(record, quest.id),
    track:
      doneOn === null
        ? renderAction(state, game, {
            id: `track.${quest.id}`,
            label: stringOf(game, record.tracked === quest.id ? `${ID}/untrack` : `${ID}/track`),
            command: record.tracked === quest.id ? trackQuest() : trackQuest(quest.id),
          })
        : null,
  }
}

/** How many started quests have news the player has not looked at. */
function updatesIn(record: QuestsState, game: Game): number {
  return questsOf(game).filter((quest) => record.started[quest.id] !== undefined && isUpdated(record, quest.id)).length
}

/** Everything the UI needs to draw the quest list. */
function questsView(record: QuestsState, game: Game, state: GameState): QuestsView {
  const defs = questsOf(game)
  const started = defs.filter((quest) => record.started[quest.id] !== undefined)
  const active = started
    .filter((quest) => record.done[quest.id] === undefined)
    .map((quest) => entry(quest, record, state, game))
    .sort((a, b) => Number(b.tracked) - Number(a.tracked) || b.startedOn - a.startedOn)
  const done = started
    .filter((quest) => record.done[quest.id] !== undefined)
    .map((quest) => entry(quest, record, state, game))
    .sort((a, b) => (b.doneOn ?? 0) - (a.doneOn ?? 0))
  const updates = [...active, ...done].filter((quest) => quest.updated).length
  return {
    active,
    done,
    toFind: defs.filter((quest) => record.started[quest.id] === undefined && !quest.secret).length,
    updates,
    seen: updates ? renderAction(state, game, { id: 'seen', label: stringOf(game, `${ID}/allSeen`), command: seeQuests() }) : null,
  }
}

/** Returns the quests plugin for the game's `plugins`. The game declares its quests in `data.quests.quests`. */
function questsPlugin(): DefinedPlugin<QuestsState, QuestsView> {
  return definePlugin<QuestsState, QuestsView, typeof CALLS>({
    id: ID,
    version: 1,
    calls: CALLS,
    data: DATA,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    commandVersion: COMMAND_VERSION,
    commandMigrations,
    start: emptyState,
    strings: {
      notDoing: 'You are not doing that.',
      // The view's buttons.
      track: 'Track',
      untrack: 'Untrack',
      allSeen: 'Mark all seen',
    },
    conditions: {
      /** `{ 'quests/active': { quest } }`: started and not finished. */
      active: (state, { quest }, { slice, game }) => {
        const record = advance(slice, state, game)
        return record.started[quest] !== undefined && record.done[quest] === undefined
      },
      /** `{ 'quests/done': { quest } }`: finished. */
      done: (state, { quest }, { slice, game }) => advance(slice, state, game).done[quest] !== undefined,
      /** `{ 'quests/reached': { quest, stage } }`: that stage is done. */
      reached: (state, args, { slice, game }) => {
        const quest = questOf(game, args.quest)
        const at = quest?.stages.findIndex((stage) => stage.id === args.stage) ?? -1
        return at >= 0 && (advance(slice, state, game).reached[quest!.id] ?? 0) > at
      },
    },
    effects: {
      /** `{ 'quests/start': { quest } }`: start it now, if it has not started. */
      start: (state, { quest: id }, { slice, set, game }) => {
        if (slice.started[id] !== undefined || !questOf(game, id)) return state
        return set(advance({ ...slice, started: { ...slice.started, [id]: state.turn } }, state, game))
      },
    },
    commands: {
      /** `{ 'quests/track': { id } }`: track the quest `id`; leave `id` out to stop tracking. */
      track: {
        whyNot: (state, { id }, { slice, game }) => {
          if (!id) return undefined
          const record = advance(slice, state, game)
          if (record.started[id] === undefined || record.done[id] !== undefined) return stringOf(game, 'quests/notDoing')
          return undefined
        },
        run: (_state, { id }, { slice, set }) => set({ ...slice, tracked: id || null }),
      },
      /** `{ 'quests/seen': { id } }`: mark the quest `id` seen; leave `id` out to mark them all. */
      seen: {
        run: (state, { id: one }, { slice, set, game }) => {
          const record = advance(slice, state, game)
          const ids = one ? [one] : Object.keys(record.started)
          const seen = { ...record.seen }
          for (const id of ids) seen[id] = mark(record, id)
          return set({ ...record, seen })
        },
      },
    },
    values: {
      /** `{{quests/updates}}`: quests with news, for a badge. */
      updates: (state, _args, { slice, game }) => updatesIn(advance(slice, state, game), game),
    },
    onCommand: (_before, after, { slice, set, game }) => {
      const next = advance(slice, after, game)
      return next === slice ? after : set(next)
    },
    view: (state, { slice, game }) => questsView(advance(slice, state, game), game, state),
    references: {
      content: (game) =>
        DATA.quests.content(game, (quest) => [
          ...(quest.storyline ? [{ storyline: quest.storyline }] : []),
          ...(quest.stages ?? []).map((stage) => ({ within: `stage ${stage.id}`, refs: [{ when: stage.done }] })),
          { within: 'starts', refs: [{ when: quest.starts }] },
        ]),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const quest of questsOf(game)) {
        const say = (what: string) => problems.push(DATA.quests.problem(quest.id, what))
        if (!quest.stages?.length) say('has no stages')
        const ids = new Set<string>()
        for (const stage of quest.stages ?? []) {
          if (ids.has(stage.id)) say(`two stages are called "${stage.id}"`)
          ids.add(stage.id)
        }
      }
      return problems
    },
  })
}

/** Returns the `quests/active` condition, which holds while the quest is started and not finished. */
const questActive = (quest: string): Condition => CALLS.conditions.active({ quest })
/** Returns the `quests/done` condition, which holds once the quest is finished. */
const questDone = (quest: string): Condition => CALLS.conditions.done({ quest })
/** Returns the `quests/reached` condition, which holds once this stage of the quest is done. */
const questReached = (quest: string, stage: string): Condition => CALLS.conditions.reached({ quest, stage })
/** Returns the `quests/start` effect, which starts the quest now if it hasn't started. */
const startQuest = (quest: string): EffectRef => CALLS.effects.start({ quest })
/** Returns the `quests/track` command, which tracks the quest, or stops tracking with no argument. */
const trackQuest = (quest?: string): CommandRef => CALLS.commands.track(quest === undefined ? undefined : { id: quest })
/** Returns the `quests/seen` command, which marks the quest's news seen, or every quest's with no argument. */
const seeQuests = (quest?: string): CommandRef => CALLS.commands.seen(quest === undefined ? undefined : { id: quest })

/**
 * The quests plugin's factory, with its helpers as properties. `quests()` returns the plugin for the game's
 * `plugins`, and content calls helpers such as `quests.done('bread')`.
 */
export const quests = Object.assign(questsPlugin, {
  /** Returns the `quests/active` condition, which holds while the quest is started and not finished. */
  active: questActive,
  /** Returns the `quests/done` condition, which holds once the quest is finished. */
  done: questDone,
  /** Returns the `quests/reached` condition, which holds once this stage of the quest is done. */
  reached: questReached,
  /** Returns the `quests/start` effect, which starts the quest now if it hasn't started. */
  start: startQuest,
  /** Returns the `quests/track` command, which tracks the quest, or stops tracking with no argument. */
  track: trackQuest,
  /** Returns the `quests/seen` command, which marks the quest's news seen, or every quest's with no argument. */
  seen: seeQuests,
})
