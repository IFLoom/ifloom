/**
 * The jobs plugin, which adds jobs the player applies for, works shifts at, is promoted in and can be fired from.
 *
 * A shift costs stats (such as energy) and time on the calendar, and pays a wage in a spendable stat. A job can have a
 * ladder of ranks, each reached by shifts worked and conditions. Missing shifts, or a condition such as a low
 * performance stat, gets the player fired.
 *
 * With the calendar, shifts fall on the job's weekdays and periods. Without it, the player can work one shift a turn.
 * A shift is refused while one of its `blocked` entries holds, such as `places.onlyAt(['cafe'])` for a workplace.
 */
import {
  holds,
  inRange,
  lackingLine,
  notify,
  pluginQuery,
  reasonOf,
  statValue,
  stringOf,
  type Blocked,
  type CommandRef,
  type Condition,
  type Effect,
  type EffectRef,
  type Game,
  type GameState,
  type Price,
  type Range,
  type RenderedChoice,
} from '@ifloom/engine'
import {
  arg,
  defineCalls,
  defineData,
  definePlugin,
  list,
  panelOf,
  priceView,
  renderAction,
  type CommandsOf,
  type ConditionsOf,
  type DefinedPlugin,
  type EffectsOf,
  type PluginContext,
  type PluginProblem,
  type Reference,
} from '@ifloom/engine/plugin'

/** A job's shift, which the game declares in a {@link JobDef}'s `shift`. It sets what one shift costs, takes and does. */
export type ShiftDef = {
  /**
   * The reasons a shift is refused. The first entry whose `when` holds gives its reason.
   *
   * A workplace is one entry, such as `places.onlyAt(['cafe'], { string: 'jobs/notHere' })`, which never holds
   * without the places plugin.
   */
  blocked?: Blocked[]
  /** The stats a shift spends, by id, such as `{ energy: 30 }`. The plugin refuses the shift while the player has too little, as for an action's cost. */
  cost?: Record<string, number>
  /** The number of the calendar's periods a shift takes. None if left out, or without the calendar. */
  passes?: number
  /** The shift's other effects, which run after the cost and the time and before the pay, such as raising a performance stat. */
  effects?: EffectRef[]
}

/** A rank on a job's ladder, which the game declares in a {@link JobDef}'s `ranks`. The player starts at the first. */
export type RankDef = {
  /** The rank's id, unique within its job. */
  id: string
  /** The rank's name, such as "Barista". */
  name: string
  /** The pay for a shift at this rank, by stat, such as `{ coins: 18 }`. */
  pay: Record<string, number>
  /**
   * The rank's requirements for a promotion, a number of shifts worked and a condition. The first rank, where the
   * player starts, can't have any.
   */
  requires?: { shifts?: number; when?: Condition }
}

/** The rules that get the player fired from a job, which the game declares in a {@link JobDef}'s `fire`. */
export type FireDef = {
  /** The number of missed shifts, in all, that gets the player fired. At least 1. */
  missed?: number
  /** The condition that gets the player fired as soon as it holds after a command, such as a performance stat too low. */
  when?: Condition
}

/** A job the game declares in `data.jobs.jobs`. It needs at least one rank. */
export type JobDef = {
  /** The job's id. */
  id: string
  /** The job's name, such as "Weekend help". */
  name: string
  /** The job's line or two for the job board. */
  description?: string
  /** The reasons an application is refused. The first entry whose `when` holds gives its reason. */
  blocked?: Blocked[]
  /** The weekdays the job has shifts on, from 0, read with the calendar plugin. Every day if left out. */
  days?: number[]
  /** The calendar periods a shift can start in. Any period if left out. */
  hours?: string[]
  /** The job's shift, its cost, time and effects. */
  shift: ShiftDef
  /** The job's ladder of ranks, lowest first. The player is hired at the first. */
  ranks: RankDef[]
  /** The rules that get the player fired. The player is never fired if left out. */
  fire?: FireDef
}

/** The record a save keeps for a job the player holds, in {@link JobsState}'s `held`. The plugin reads the job's definition from content. */
export type HeldJob = {
  /** The index of the rank the player holds, from 0. */
  rank: number
  /** The number of shifts the player has worked at the job. */
  shifts: number
  /** The number of shifts the player has missed at the job. */
  missed: number
  /** The day the player was hired, the calendar's day or the turn without the calendar. */
  hiredOn: number
  /** The day of the last shift worked, or null before the first. */
  lastWorked: number | null
}

/** The jobs a save keeps for the player, held and fired. The plugin reads the jobs from content. */
export type JobsState = {
  /** The jobs the player holds, by job id. */
  held: Record<string, HeldJob>
  /** The day the player was fired from each job, by job id. The player can't apply for these again. */
  fired: Record<string, number>
}

/** A rank as the player sees it, in a {@link JobView}'s `rank` and `next`. */
export type RankView = {
  /** The rank's id. */
  id: string
  /** The rank's name. */
  name: string
  /** The pay for a shift at this rank, or null when it pays nothing. */
  pay: Price | null
}

/** A job as the player sees it, in `view.plugins.jobs.jobs`. */
export type JobView = {
  /** The job's id. */
  id: string
  /** The job's name. */
  name: string
  /** The job's description, or `''` when it has none. */
  description: string
  /** True while the player holds the job. */
  hired: boolean
  /** The day the player was fired from the job, or null. */
  firedOn: number | null
  /** The rank the player holds, or null when not hired. */
  rank: RankView | null
  /**
   * The next rank up with the number of shifts still needed for it, or null at the top or when not hired.
   * `shiftsToGo` is 0 when only the rank's condition is missing.
   */
  next: (RankView & { shiftsToGo: number }) | null
  /** The pay for a shift now, the held rank's or the first rank's for a job not held. */
  pay: Price | null
  /** The number of shifts the player has worked at the job. */
  shifts: number
  /** The number of shifts the player has missed at the job. */
  missed: number
  /** The next day with a shift, with `inDays` 0 for today. Null when not hired or when no shift falls in the next two weeks. */
  nextShift: { day: number; inDays: number } | null
  /** The button that applies, or null once hired or fired. Its `disabled` gives the reason an application is refused. */
  apply: RenderedChoice | null
  /** The button that works a shift, or null when not hired. Its `price` is the shift's cost. */
  work: RenderedChoice | null
  /** The button that leaves the job, labelled with the `jobs/quit` string (`Quit`), or null when not hired. */
  quit: RenderedChoice | null
}

/** The jobs as the player sees them, in `view.plugins.jobs`. */
export type JobsView = {
  /** The game's jobs, in the order the game declares them. */
  jobs: JobView[]
  /**
   * The jobs on the open `jobs` panel, or null while it's closed. It holds only the jobs the panel's `with.job` names,
   * or every job when it names none.
   */
  panel: JobView[] | null
}

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    jobs: JobsView
  }
}

const ID = 'jobs'
/** The panel a UI draws the job board in. */
const PANEL = 'jobs'

/** The plugin's one list, `jobs`, as content writes it in `data.jobs.jobs` (a plugin's `data` holds its lists by name), with the words a player reads in each, for a translation's `words` table. */
const DATA = defineData(ID, {
  jobs: list<JobDef>({
    noun: 'job',
    words: { name: true, description: true, blocked: [{ reason: true }], shift: { effects: 'effects', blocked: [{ reason: true }] }, ranks: [{ name: true }] },
  }),
})

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** Holds the job, at that rank if asked. */
    hired: { job: arg.entry(DATA.jobs), rank: arg.string().optional() },
    /** Was fired from it. */
    fired: { job: arg.entry(DATA.jobs) },
    /** A shift at the job was worked today; at any job held, with none. */
    worked: { job: arg.entry(DATA.jobs).optional() },
    /** Shifts worked at a job held, in a range: `{ job, gte: 3 }`. */
    shifts: { job: arg.entry(DATA.jobs), ...arg.bounds },
  },
  effects: {
    /** Hired now, with no requirements asked. */
    hire: { job: arg.entry(DATA.jobs) },
    /** Fired now, with the notice. */
    fire: { job: arg.entry(DATA.jobs) },
  },
  commands: {
    /** Apply for the job `id`. */
    apply: { id: arg.entry(DATA.jobs) },
    /** Work a shift at the job `id`. */
    work: { id: arg.entry(DATA.jobs) },
    /** Leave the job `id`. */
    quit: { id: arg.entry(DATA.jobs) },
  },
})

function emptyState(): JobsState {
  return { held: {}, fired: {} }
}

/** Returns the game's jobs, from `data.jobs.jobs` in its content and packs. */
export function jobsOf(game: Game): JobDef[] {
  return DATA.jobs.all(game)
}

/** Returns the job with this id, or undefined when the game has none. */
export function jobOf(game: Game, id: string): JobDef | undefined {
  return DATA.jobs.get(game, id)
}

/** The day: the calendar's, asked by name, or the turn without one. */
function dayOf(state: GameState, game: Game): number {
  return pluginQuery<{ day: number }>(game, 'calendar/now')?.(state).day ?? state.turn
}

function hasCalendar(game: Game): boolean {
  return Boolean(pluginQuery(game, 'calendar/now'))
}

/** Is this day one the job has shifts on? Asked of the calendar's own weekday, on the clock moved to that day. */
function shiftDay(job: JobDef, day: number, state: GameState, context: PluginContext<JobsState>): boolean {
  if (!job.days || !hasCalendar(context.game)) return true
  const then = context.apply([{ 'calendar/set': { day } }], state)
  return holds(then, context.game, { 'calendar/weekday': { day: job.days } })
}

function rankOf(job: JobDef, held: HeldJob | undefined): RankDef | undefined {
  return held ? job.ranks[Math.min(held.rank, job.ranks.length - 1)] : undefined
}

function payOf(job: JobDef, held: HeldJob | undefined): Record<string, number> {
  return (rankOf(job, held) ?? job.ranks[0])?.pay ?? {}
}

/** Why the player can't apply, or undefined. */
function cantApply(state: GameState, { id }: { id: string }, context: PluginContext<JobsState>): string | undefined {
  const { game, slice } = context
  const job = jobOf(game, id)
  if (!job) return stringOf(game, 'jobs/unknown')
  if (slice.held[job.id]) return stringOf(game, 'jobs/alreadyHired')
  if (slice.fired[job.id] !== undefined) return stringOf(game, 'jobs/wasFired')
  for (const entry of job.blocked ?? []) if (holds(state, game, entry.when)) return reasonOf(game, entry.reason)
  return undefined
}

/** Why the player can't work a shift now, or undefined. */
function cantWork(state: GameState, { id }: { id: string }, context: PluginContext<JobsState>): string | undefined {
  const { game, slice } = context
  const job = jobOf(game, id)
  if (!job) return stringOf(game, 'jobs/unknown')
  const held = slice.held[job.id]
  if (!held) return stringOf(game, 'jobs/notHired')
  for (const entry of job.shift.blocked ?? []) if (holds(state, game, entry.when)) return reasonOf(game, entry.reason)
  const today = dayOf(state, game)
  // A finished shift says so first: once worked, the shift's day and hours
  // have usually moved on, and "not today" would hide why.
  if (held.lastWorked === today) return stringOf(game, 'jobs/workedToday')
  if (!shiftDay(job, today, state, context)) return stringOf(game, 'jobs/noShiftToday')
  if (job.hours) {
    const period = context.query<{ period: string }>('calendar/now')?.period
    if (period !== undefined && !job.hours.includes(period)) return stringOf(game, 'jobs/notNow')
  }
  for (const [stat, amount] of Object.entries(job.shift.cost ?? {})) {
    if (amount > 0 && statValue(state, game, stat) < amount) return lackingLine(game, stat, amount)
  }
  return undefined
}

/** What a shift applies: the cost, the time, the job's own effects, then the pay. */
function shiftEffects(job: JobDef, held: HeldJob | undefined): Effect[] {
  const cost: Effect[] = Object.entries(job.shift.cost ?? {})
    .filter(([, amount]) => amount > 0)
    .map(([stat, amount]) => ({ stat, by: -amount }))
  const time: Effect[] = job.shift.passes ? [{ 'calendar/pass': { by: job.shift.passes } }] : []
  const pay: Effect[] = Object.entries(payOf(job, held))
    .filter(([, amount]) => amount !== 0)
    .map(([stat, amount]) => ({ stat, by: amount }))
  return [...cost, ...time, ...pay]
}

function hired(state: GameState, job: JobDef, context: PluginContext<JobsState>): GameState {
  const slice = context.get(state)
  if (slice.held[job.id]) return state
  const fired = { ...slice.fired }
  delete fired[job.id]
  const record: HeldJob = { rank: 0, shifts: 0, missed: 0, hiredOn: dayOf(state, context.game), lastWorked: null }
  return context.set({ held: { ...slice.held, [job.id]: record }, fired }, state)
}

function firedFrom(state: GameState, job: JobDef, context: PluginContext<JobsState>): GameState {
  const slice = context.get(state)
  if (!slice.held[job.id]) return state
  const held = { ...slice.held }
  delete held[job.id]
  const next = context.set({ held, fired: { ...slice.fired, [job.id]: dayOf(state, context.game) } }, state)
  return notify(next, { id: `job.${job.id}.fired`, title: stringOf(context.game, 'jobs/firedNotice', { title: job.name }), tag: 'jobs' })
}

/**
 * After every command: count the shifts missed on the days that went by, fire
 * the player from jobs whose `fire` holds, then promote them up any rank they
 * now qualify for.
 */
function review(before: GameState, after: GameState, context: PluginContext<JobsState>): GameState {
  const { game } = context
  if (!Object.keys(context.slice.held).length) return after
  let next = after
  const from = dayOf(before, game)
  const to = dayOf(after, game)
  for (const job of jobsOf(game)) {
    let held = context.get(next).held[job.id]
    if (!held) continue
    // The days that ended in this command, not counting the day they were hired.
    let missed = 0
    for (let day = Math.max(from, held.hiredOn + 1); day < to; day += 1) {
      if (held.lastWorked !== day && shiftDay(job, day, after, context)) missed += 1
    }
    if (missed) {
      held = { ...held, missed: held.missed + missed }
      const now = context.get(next)
      next = context.set({ ...now, held: { ...now.held, [job.id]: held } }, next)
    }
    const fire = job.fire
    if (fire && ((fire.missed !== undefined && held.missed >= fire.missed) || (fire.when && holds(next, game, fire.when)))) {
      next = firedFrom(next, job, context)
      continue
    }
    let rank = held.rank
    while (rank + 1 < job.ranks.length) {
      const needs = job.ranks[rank + 1].requires
      if ((needs?.shifts ?? 0) > held.shifts || (needs?.when && !holds(next, game, needs.when))) break
      rank += 1
    }
    if (rank !== held.rank) {
      const now = context.get(next)
      next = context.set({ ...now, held: { ...now.held, [job.id]: { ...held, rank } } }, next)
      next = notify(next, { id: `job.${job.id}.rank`, title: stringOf(game, 'jobs/promoted', { title: job.ranks[rank].name }), tag: 'jobs' })
    }
  }
  return next
}

/** The next day with a shift, from today, within two weeks. */
function nextShift(job: JobDef, held: HeldJob, state: GameState, context: PluginContext<JobsState>): JobView['nextShift'] {
  const today = dayOf(state, context.game)
  for (let day = today; day < today + 14; day += 1) {
    if (day === today && held.lastWorked === today) continue
    if (shiftDay(job, day, state, context)) return { day, inDays: day - today }
  }
  return null
}

function rankView(game: Game, rank: RankDef): RankView {
  return { id: rank.id, name: rank.name, pay: priceView(game, rank.pay) }
}

/** Everything the UI needs for a job board. */
function jobsView(state: GameState, context: PluginContext<JobsState>): JobsView {
  const { game, slice } = context
  const jobs = jobsOf(game).map((job): JobView => {
    const held = slice.held[job.id]
    const rank = rankOf(job, held)
    const up = held ? job.ranks[held.rank + 1] : undefined
    const firedOn = slice.fired[job.id] ?? null
    return {
      id: job.id,
      name: job.name,
      description: job.description ?? '',
      hired: Boolean(held),
      firedOn,
      rank: rank ? rankView(game, rank) : null,
      next: up && held ? { ...rankView(game, up), shiftsToGo: Math.max(0, (up.requires?.shifts ?? 0) - held.shifts) } : null,
      pay: priceView(game, payOf(job, held)),
      shifts: held?.shifts ?? 0,
      missed: held?.missed ?? 0,
      nextShift: held ? nextShift(job, held, state, context) : null,
      apply: held || firedOn !== null ? null : renderAction(state, game, { id: `apply.${job.id}`, label: job.name, command: applyFor(job.id) }),
      work: held ? renderAction(state, game, { id: `work.${job.id}`, label: job.name, command: work(job.id) }) : null,
      quit: held ? renderAction(state, game, { id: `quit.${job.id}`, label: stringOf(game, `${ID}/quit`), command: quit(job.id) }) : null,
    }
  })
  // The board content opened, with only the jobs it lists if it lists any.
  const open = panelOf(state, game)
  const only = open?.panel === PANEL ? open.with.job : undefined
  const board = open?.panel === PANEL ? jobs.filter((job) => !Array.isArray(only) || only.includes(job.id)) : null
  return { jobs, panel: board }
}

/** Returns the jobs plugin for the game's `plugins`. The game declares its jobs in `data.jobs.jobs`. */
function jobsPlugin(): DefinedPlugin<JobsState, JobsView> {
  return definePlugin<JobsState, JobsView, typeof CALLS>({
    id: ID,
    version: 1,
    calls: CALLS,
    data: DATA,
    start: emptyState,
    // A shift's `blocked` can ask places where the player is.
    cooperates: ['calendar', 'places'],
    strings: {
      unknown: 'There’s no such job.',
      alreadyHired: 'You already work there.',
      wasFired: 'They won’t have you back.',
      notHired: 'You don’t work there.',
      // A reason for a shift's `places.onlyAt()` entry: `{ string: 'jobs/notHere' }`.
      notHere: 'You aren’t at work.',
      noShiftToday: 'No shift today.',
      notNow: 'Not a time for a shift.',
      workedToday: 'You’ve done today’s shift.',
      promoted: 'Promoted: {title}',
      // The notice a paid shift raises, with the job's name and its pay. Reworded to '', no notice.
      paid: 'Paid {pay} at {title}',
      firedNotice: 'You’ve lost your job: {title}',
      // The button that leaves a job.
      quit: 'Quit',
    },
    conditions: {
      /** `{ 'jobs/hired': { job, rank? } }`: holds the job, at that rank if asked. */
      hired: (_state, { job: id, rank }, { slice, game }) => {
        const job = jobOf(game, id)
        const held = job && slice.held[job.id]
        if (!job || !held) return false
        return rank === undefined || rankOf(job, held)?.id === rank
      },
      /** `{ 'jobs/fired': { job } }`: was fired from it. */
      fired: (_state, { job }, { slice }) => slice.fired[job] !== undefined,
      /**
       * `{ 'jobs/worked': { job } }`: a shift at the job was worked today, the
       * day the calendar says (or this turn, without one), as the refusal
       * "You've done today's shift." reads it. `true` for any job held.
       */
      worked: (state, { job }, { slice, game }) => {
        const today = dayOf(state, game)
        return Object.entries(slice.held).some(([id, held]) => (job === undefined || id === job) && held.lastWorked === today)
      },
      /** `{ 'jobs/shifts': { job, gte… } }`: shifts worked at a job held, in a range. */
      shifts: (state, range, { slice, game }) => {
        const held = slice.held[range.job]
        return held !== undefined && inRange(state, game, held.shifts, range)
      },
    },
    effects: {
      /** `{ 'jobs/hire': { job } }`: hired now, with no requirements asked. */
      hire: (state, args, context) => {
        const job = jobOf(context.game, args.job)
        return job ? hired(state, job, context) : state
      },
      /** `{ 'jobs/fire': { job } }`: fired now, with the notice. */
      fire: (state, args, context) => {
        const job = jobOf(context.game, args.job)
        return job ? firedFrom(state, job, context) : state
      },
    },
    commands: {
      /** `{ 'jobs/apply': { id } }`: apply for the job `id`. */
      apply: {
        whyNot: (state, args, context) => cantApply(state, args, context),
        run: (state, { id }, context) => hired(state, jobOf(context.game, id)!, context),
      },
      /** `{ 'jobs/work': { id } }`: work a shift at the job `id`. */
      work: {
        whyNot: (state, args, context) => cantWork(state, args, context),
        spends: (_state, { id }, { game }) => jobOf(game, id)?.shift.cost,
        effectsOf: (_state, { id }, { game, slice }) => {
          const job = jobOf(game, id)
          return job ? shiftEffects(job, slice.held[job.id]) : []
        },
        run: (state, { id }, context) => {
          const job = jobOf(context.game, id)!
          const held = context.slice.held[job.id]
          const today = dayOf(state, context.game)
          // The shift's own effects come after the cost and the time, before the pay.
          const effects = shiftEffects(job, held)
          const pay = effects.filter((effect) => 'stat' in effect && 'by' in effect && typeof effect.by === 'number' && effect.by > 0)
          const before = effects.filter((effect) => !pay.includes(effect))
          let next = context.apply([...before, ...(job.shift.effects ?? []), ...pay])
          const slice = context.get(next)
          const record = slice.held[job.id] ?? held
          next = context.set({ ...slice, held: { ...slice.held, [job.id]: { ...record, shifts: record.shifts + 1, lastWorked: today } } }, next)
          // Say what the shift paid, at the rank it was worked at, as a promotion or a firing is said.
          const wage = priceView(context.game, payOf(job, held))
          const paid = wage ? stringOf(context.game, 'jobs/paid', { title: job.name, pay: wage.text }) : ''
          if (paid.trim()) next = notify(next, { id: `job.${job.id}.paid`, title: paid, tag: 'jobs' })
          return next
        },
      },
      /** `{ 'jobs/quit': { id } }`: leave the job `id`. The player can apply again. */
      quit: {
        whyNot: (_state, { id }, { slice, game }) => (slice.held[id] ? undefined : stringOf(game, 'jobs/notHired')),
        run: (state, { id }, context) => {
          const held = { ...context.slice.held }
          delete held[id]
          return context.set({ ...context.slice, held }, state)
        },
      },
    },
    onCommand: review,
    values: {
      /**
       * `{{jobs/rank job=barista}}`: the name of the rank the player holds at
       * the job, such as "Head barista"; '' when not hired, so a fallback shows:
       * `{{jobs/rank job=barista|out of work}}`.
       */
      rank: (_state, args, { slice, game }) => {
        const job = DATA.jobs.get(game, args.job)
        return (job && rankOf(job, slice.held[job.id])?.name) ?? ''
      },
    },
    view: (state, context) => jobsView(state, context),
    references: {
      // The `jobs` panel shows the job board, or only the jobs `with.job` lists.
      panels: (panel, args): Reference[] => {
        if (panel !== PANEL || args.job === undefined) return []
        if (!Array.isArray(args.job) || !args.job.every((job) => typeof job === 'string')) return [{ problem: "the jobs panel's job is a list of job ids" }]
        return args.job.map((job: string) => DATA.jobs.ref(job))
      },
      content: (game) =>
        DATA.jobs.content(game, (job) => [
          ...(job.blocked ?? []).map((entry): Reference => ({ within: 'blocked', refs: [{ when: entry.when }, { reason: entry.reason }] })),
          {
            within: 'shift',
            refs: [
              ...Object.keys(job.shift?.cost ?? {}).map((stat): Reference => ({ stat, writes: true })),
              { effects: job.shift?.effects },
              ...(job.shift?.blocked ?? []).map((entry): Reference => ({ within: 'blocked', refs: [{ when: entry.when }, { reason: entry.reason }] })),
            ],
          },
          ...(job.ranks ?? []).map((rank): Reference => ({
            within: `rank ${rank.id}`,
            refs: [...Object.keys(rank.pay ?? {}).map((stat): Reference => ({ stat, writes: true })), { when: rank.requires?.when }],
          })),
          { within: 'fire', refs: [{ when: job.fire?.when }] },
        ]),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const job of jobsOf(game)) {
        const problem = (what: string) => problems.push(DATA.jobs.problem(job.id, what))
        if (!job.ranks?.length) problem('has no ranks')
        const ids = new Set<string>()
        for (const rank of job.ranks ?? []) {
          if (ids.has(rank.id)) problem(`two ranks are called "${rank.id}"`)
          ids.add(rank.id)
        }
        if (job.ranks?.[0]?.requires) problem(`the first rank, "${job.ranks[0].id}", is where the player starts, so it can't have requires`)
        for (const day of job.days ?? []) if (!Number.isInteger(day) || day < 0) problem(`days: ${day} is not a weekday`)
        if (job.shift?.passes !== undefined && !(job.shift.passes >= 0)) problem('shift.passes must be 0 or more')
        if (job.fire?.missed !== undefined && !(job.fire.missed >= 1)) problem('fire.missed must be 1 or more')
      }
      return problems
    },
  })
}

/**
 * Returns the effect that opens the job board in the `jobs` panel. With `jobs`, the board shows only those, as for a
 * newspaper's ads or a café's notice.
 */
const openJobs = (jobs?: string[]): Effect => (jobs === undefined ? { panel: PANEL } : { panel: PANEL, with: { job: jobs } })
/** Returns the `jobs/apply` command, which applies for the job. */
const applyFor = (job: string): CommandRef => CALLS.commands.apply({ id: job })
/** Returns the `jobs/work` command, which works a shift at the job. */
const work = (job: string): CommandRef => CALLS.commands.work({ id: job })
/** Returns the `jobs/quit` command, which leaves the job. */
const quit = (job: string): CommandRef => CALLS.commands.quit({ id: job })
/** Returns the `jobs/hire` effect, which hires the player now without checking the job's `blocked`. */
const hire = (job: string): EffectRef => CALLS.effects.hire({ job })
/** Returns the `jobs/fire` effect, which fires the player from the job now, with a notice. */
const fire = (job: string): EffectRef => CALLS.effects.fire({ job })
/** Returns the `jobs/hired` condition, which holds while the player holds the job, at `rank` if given. */
const hasJob = (job: string, rank?: string): Condition => CALLS.conditions.hired(rank === undefined ? { job } : { job, rank })
/** Returns the `jobs/fired` condition, which holds once the player has been fired from the job. */
const wasFired = (job: string): Condition => CALLS.conditions.fired({ job })
/** Returns the `jobs/shifts` condition, which holds while the shifts worked at a held job fall in the range. */
const shiftsWorked = (job: string, range: Range): Condition => CALLS.conditions.shifts({ job, ...range })
/** Returns the `jobs/worked` condition, which holds once the player has worked a shift today, at `job` or at any job. */
const workedToday = (job?: string): Condition => CALLS.conditions.worked(job === undefined ? undefined : { job })

/**
 * The jobs plugin's factory, with its helpers as properties. `jobs()` returns the plugin for the game's `plugins`,
 * and content calls helpers such as `jobs.apply('cafe')` and `jobs.fire('cafe')`.
 */
export const jobs = Object.assign(jobsPlugin, {
  /** Returns the effect that opens the job board in the `jobs` panel, showing only `jobs` if given. */
  open: openJobs,
  /** Returns the `jobs/apply` command, which applies for the job. */
  apply: applyFor,
  /** Returns the `jobs/work` command, which works a shift at the job. */
  work,
  /** Returns the `jobs/quit` command, which leaves the job. */
  quit,
  /** Returns the `jobs/hire` effect, which hires the player now without checking the job's `blocked`. */
  hire,
  /** Returns the `jobs/fire` effect, which fires the player from the job now, with a notice. */
  fire,
  /** Returns the `jobs/hired` condition, which holds while the player holds the job, at `rank` if given. */
  hired: hasJob,
  /** Returns the `jobs/fired` condition, which holds once the player has been fired from the job. */
  fired: wasFired,
  /** Returns the `jobs/shifts` condition, which holds while the shifts worked at a held job fall in the range. */
  shifts: shiftsWorked,
  /** Returns the `jobs/worked` condition, which holds once the player has worked a shift today, at `job` or at any job. */
  worked: workedToday,
})
