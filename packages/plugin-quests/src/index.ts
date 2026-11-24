/**
 * @ifloom/plugin-quests — what the player is doing, how far they have got, and
 * the hint for what comes next.
 *
 * A quest's stages are done by conditions on the game state — the same data
 * that gates the content — so a quest can't drift from the story it describes.
 * Progress is kept once it is made: a stage that was done stays done.
 *
 * The engine word is *quest*. What the player sees it called — a journal, a
 * diary, a to-do list — is the game's choice.
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

/** One step of a quest. */
export type QuestStage = {
  id: string
  /** What the player reads while this is the stage they are on. */
  hint: string
  /** The stage is done the first time this holds, once the stages before it are. */
  done: Condition
}

export type QuestDef = {
  id: string
  /** What the player reads: "Find your feet". */
  name: string
  /** A line or two about it, for the quest list. */
  description?: string
  /** The storyline it belongs to, for a UI that groups quests by person. */
  storyline?: string
  /**
   * It starts the first time this holds. Leave it out to start the quest only
   * with the `quests/start` effect.
   */
  starts?: Condition
  /** Left out of the count of quests still to find until it starts. */
  secret?: boolean
  /** In order. The quest is done when the last one is. */
  stages: QuestStage[]
}

/** What the plugin keeps in a save. */
export type QuestsState = {
  /** Quests started, with the turn each one started. */
  started: Record<string, number>
  /** How many of each started quest's stages are done. */
  reached: Record<string, number>
  /** Quests finished, with the turn. */
  done: Record<string, number>
  /** The quest the player has pinned, if any. */
  tracked: string | null
  /** How far each quest had got when the player last looked at it: stages done, plus one once finished. */
  seen: Record<string, number>
}

/** A quest as the UI shows it. */
export type QuestEntry = {
  id: string
  name: string
  /** A line about it; `''` with none. */
  description: string
  /** The storyline it belongs to, for a UI that groups quests by person, or null. */
  storyline: string | null
  /** The hint for the stage the player is on; empty once the quest is done. */
  hint: string
  /** Stages done, and how many there are. */
  stage: number
  /** How many stages it has. */
  stages: number
  /** The turn it started. */
  startedOn: number
  /** The turn it was done, or null while it isn't. */
  doneOn: number | null
  /** Whether it's the quest the player tracks. */
  tracked: boolean
  /** Started or moved on since the player last looked. */
  updated: boolean
  /**
   * The button that tracks it, or stops tracking it once it's tracked
   * (labelled with the `quests/track` or `quests/untrack` string), or null
   * once the quest is done.
   */
  track: RenderedChoice | null
}

export type QuestsView = {
  /** Started and not finished; the tracked one first, then newest first. */
  active: QuestEntry[]
  /** Finished, most recent first. */
  done: QuestEntry[]
  /** Quests not started yet, secret ones left out. */
  toFind: number
  /** How many quests have news the player has not looked at: a badge. */
  updates: number
  /** The button that marks every quest's news seen (the `quests/allSeen` string, `Mark all seen`), or null while there is none. */
  seen: RenderedChoice | null
}

const ID = 'quests'

/** The plugin's content: `data.quests.quests`, with the words a player reads in each, for a translation's `words` table. */
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

/** The game's quests: `data.quests.quests`, from its packs. */
export function questsOf(game: Game): QuestDef[] {
  return DATA.quests.all(game)
}

/** One of the game's quests, by id. */
export function questOf(game: Game, id: string): QuestDef | undefined {
  return DATA.quests.get(game, id)
}

/**
 * Bring the record up to date with the game state: start what should start,
 * move each quest on through every stage that is done, in order, and mark the
 * ones that are finished. Nothing is ever taken back.
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

/**
 * The plugin. Add it to the game's `plugins`, and put quests in a pack's
 * `data.quests.quests`.
 */
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
      /** <code v-pre>{{quests/updates}}</code>: quests with news, for a badge. */
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

/** A condition: the quest is started and not finished. */
const questActive = (quest: string): Condition => CALLS.conditions.active({ quest })
/** A condition: the quest is finished. */
const questDone = (quest: string): Condition => CALLS.conditions.done({ quest })
/** A condition: this stage of the quest is done. */
const questReached = (quest: string, stage: string): Condition => CALLS.conditions.reached({ quest, stage })
/** An effect: start the quest now. */
const startQuest = (quest: string): EffectRef => CALLS.effects.start({ quest })
/** A command: pin this quest, or unpin with no argument. */
const trackQuest = (quest?: string): CommandRef => CALLS.commands.track(quest === undefined ? undefined : { id: quest })
/** A command: the player has looked at this quest, or at all of them. */
const seeQuests = (quest?: string): CommandRef => CALLS.commands.seen(quest === undefined ? undefined : { id: quest })

/**
 * The plugin, with its helpers on it: `quests()` makes the plugin for the
 * game's `plugins`, and content is written with `quests.done('bread')`.
 */
export const quests = Object.assign(questsPlugin, {
  active: questActive,
  done: questDone,
  reached: questReached,
  start: startQuest,
  track: trackQuest,
  seen: seeQuests,
})
