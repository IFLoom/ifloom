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
import {
  definePlugin,
  holds,
  stringOf,
  type CommandRef,
  type Condition,
  type DefinedPlugin,
  type EffectRef,
  type Game,
  type GameState,
  type PluginProblem,
} from '@ifloom/engine'
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
  title: string
  /** A line or two about it, for the quest list. */
  summary?: string
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
  title: string
  summary: string
  storyline: string | null
  /** The hint for the stage the player is on; empty once the quest is done. */
  hint: string
  /** Stages done, and how many there are. */
  stage: number
  stages: number
  startedOn: number
  doneOn: number | null
  tracked: boolean
  /** Started or moved on since the player last looked. */
  updated: boolean
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
}

/**
 * What content writes for each of the plugin's calls, its queries' answers
 * and its view, so a call with a misspelled argument fails to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionCalls {
    'quests/active': { quest: string }
    'quests/done': { quest: string }
    'quests/reached': { quest: string; stage: string }
  }
  interface EffectCalls {
    'quests/start': { quest: string }
  }
  interface CommandCalls {
    'quests/track': { id?: string } | true
    'quests/seen': { id?: string } | true
  }
  interface PluginViews {
    quests: QuestsView
  }
}

const ID = 'quests'

function emptyState(): QuestsState {
  return { started: {}, reached: {}, done: {}, tracked: null, seen: {} }
}

/** The game's quests: `data.quests.quests`, from its packs. */
export function questDefs(game: Game): QuestDef[] {
  return (game.data?.[ID]?.quests ?? []) as QuestDef[]
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
  for (const quest of questDefs(game)) {
    let started = next.started[quest.id]
    if (started === undefined) {
      if (!quest.starts || !holds(state, quest.starts, game)) continue
      started = turn
      next = { ...next, started: { ...next.started, [quest.id]: turn } }
      working = next
    }
    if (next.done[quest.id] !== undefined) continue
    let reached = next.reached[quest.id] ?? 0
    while (reached < quest.stages.length && holds(state, quest.stages[reached].done, game)) reached += 1
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

function entry(quest: QuestDef, record: QuestsState): QuestEntry {
  const stage = record.reached[quest.id] ?? 0
  const doneOn = record.done[quest.id] ?? null
  return {
    id: quest.id,
    title: quest.title,
    summary: quest.summary ?? '',
    storyline: quest.storyline ?? null,
    hint: doneOn === null ? (quest.stages[stage]?.hint ?? '') : '',
    stage,
    stages: quest.stages.length,
    startedOn: record.started[quest.id] ?? 0,
    doneOn,
    tracked: record.tracked === quest.id,
    updated: isUpdated(record, quest.id),
  }
}

/** Everything the UI needs to draw the quest list. */
export function questsView(record: QuestsState, game: Game): QuestsView {
  const defs = questDefs(game)
  const started = defs.filter((quest) => record.started[quest.id] !== undefined)
  const active = started
    .filter((quest) => record.done[quest.id] === undefined)
    .map((quest) => entry(quest, record))
    .sort((a, b) => Number(b.tracked) - Number(a.tracked) || b.startedOn - a.startedOn)
  const done = started
    .filter((quest) => record.done[quest.id] !== undefined)
    .map((quest) => entry(quest, record))
    .sort((a, b) => (b.doneOn ?? 0) - (a.doneOn ?? 0))
  return {
    active,
    done,
    toFind: defs.filter((quest) => record.started[quest.id] === undefined && !quest.secret).length,
    updates: [...active, ...done].filter((quest) => quest.updated).length,
  }
}

/** The quest a call names: `quest` in a condition or an effect, `id` in a command. */
function questId(args: Record<string, unknown>): string {
  return String(args.quest ?? args.id ?? '')
}

/**
 * The plugin. Add it to the game's `plugins`, and put quests in a pack's
 * `data.quests.quests`.
 */
export function quests(): DefinedPlugin<QuestsState, QuestsView> {
  return definePlugin<QuestsState, QuestsView>({
    id: ID,
    version: 1,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    commandVersion: COMMAND_VERSION,
    commandMigrations,
    start: emptyState,
    strings: { notDoing: 'You are not doing that.' },
    conditions: {
      /** `{ 'quests/active': { quest } }`: started and not finished. */
      active: (state, args, { slice, game }) => {
        const record = advance(slice, state, game)
        const id = questId(args)
        return record.started[id] !== undefined && record.done[id] === undefined
      },
      /** `{ 'quests/done': { quest } }`: finished. */
      done: (state, args, { slice, game }) => advance(slice, state, game).done[questId(args)] !== undefined,
      /** `{ 'quests/reached': { quest, stage } }`: that stage is done. */
      reached: (state, args, { slice, game }) => {
        const quest = questDefs(game).find((entry) => entry.id === questId(args))
        const at = quest?.stages.findIndex((stage) => stage.id === args.stage) ?? -1
        return at >= 0 && (advance(slice, state, game).reached[quest!.id] ?? 0) > at
      },
    },
    effects: {
      /** `{ 'quests/start': { quest } }`: start it now, if it has not started. */
      start: (state, args, { slice, set, game }) => {
        const id = questId(args)
        if (slice.started[id] !== undefined || !questDefs(game).some((quest) => quest.id === id)) return state
        return set(advance({ ...slice, started: { ...slice.started, [id]: state.turn } }, state, game))
      },
    },
    commands: {
      /** `{ 'quests/track': { id } }`: track the quest `id`; leave `id` out to stop tracking. */
      track: {
        whyNot: (state, args, { slice, game }) => {
          const id = questId(args)
          if (!id) return undefined
          const record = advance(slice, state, game)
          if (record.started[id] === undefined || record.done[id] !== undefined) return stringOf(game, 'quests/notDoing')
          return undefined
        },
        run: (_state, args, { slice, set }) => set({ ...slice, tracked: questId(args) || null }),
      },
      /** `{ 'quests/seen': { id } }`: mark the quest `id` seen; leave `id` out to mark them all. */
      seen: {
        run: (state, args, { slice, set, game }) => {
          const record = advance(slice, state, game)
          const ids = args.id ? [questId(args)] : Object.keys(record.started)
          const seen = { ...record.seen }
          for (const id of ids) seen[id] = mark(record, id)
          return set({ ...record, seen })
        },
      },
    },
    values: {
      /** <code v-pre>{{v:quests/updates}}</code>: quests with news, for a badge. */
      updates: (state, _args, { slice, game }) => questsView(advance(slice, state, game), game).updates,
    },
    onCommand: (_before, after, { slice, set, game }) => {
      const next = advance(slice, after, game)
      return next === slice ? after : set(next)
    },
    view: (state, { slice, game }) => questsView(advance(slice, state, game), game),
    references: {
      // The quest a condition, effect or command names. Tracking or looking with none is fine.
      calls: (_kind, _name, args) => (questId(args) === '' ? [] : [{ entry: questId(args), plugin: 'quests', list: 'quests', noun: 'quest' }]),
      content: (game) =>
        questDefs(game).map((quest) => ({
          list: 'quests',
          id: quest.id,
          refs: [
            ...(quest.storyline ? [{ storyline: quest.storyline }] : []),
            ...(quest.stages ?? []).map((stage) => ({ within: `stage ${stage.id}`, refs: [{ when: stage.done }] })),
            { within: 'starts', refs: [{ when: quest.starts }] },
          ],
        })),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const quest of questDefs(game)) {
        const say = (what: string) => problems.push({ list: 'quests', id: quest.id, what })
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
export const questActive = (quest: string): Condition => ({ 'quests/active': { quest } })
/** A condition: the quest is finished. */
export const questDone = (quest: string): Condition => ({ 'quests/done': { quest } })
/** A condition: this stage of the quest is done. */
export const questReached = (quest: string, stage: string): Condition => ({ 'quests/reached': { quest, stage } })
/** An effect: start the quest now. */
export const startQuest = (quest: string): EffectRef => ({ 'quests/start': { quest } })
/** A command: pin this quest, or unpin with no argument. */
export const trackQuest = (quest?: string): CommandRef => ({ 'quests/track': { id: quest } })
/** A command: the player has looked at this quest, or at all of them. */
export const seeQuests = (quest?: string): CommandRef => ({ 'quests/seen': { id: quest } })
