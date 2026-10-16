/**
 * @ifloom/plugin-jobs: jobs the player applies for, works shifts at, is
 * promoted in and can be fired from.
 *
 * A shift costs stats (energy, say) and time on the calendar, and pays a
 * wage in a spendable stat. A job can have a ladder of ranks, each paying
 * more, reached by shifts worked and conditions. Missing shifts, or a
 * condition such as a low performance stat, gets the player fired.
 *
 * It works with the calendar and places when the game has them: shifts fall
 * on the calendar's weekdays and periods, and are worked at a place on the
 * map. Without them, a shift can be worked anywhere, once a turn.
 */
import {
  definePlugin,
  formatStat,
  holds,
  inRange,
  lackingLine,
  notify,
  pluginQuery,
  renderAction,
  say,
  statDef,
  statValue,
  type Command,
  type Condition,
  type Effect,
  type EffectRef,
  type Game,
  type GameState,
  type PluginArgs,
  type PluginContext,
  type PluginProblem,
  type Price,
  type Range,
  type Reference,
  type RenderedChoice,
  type Requirement,
} from '@ifloom/engine'

/** What working one shift takes. */
export type ShiftDef = {
  /** Stats it spends, by id: `{ energy: 30 }`. Checked before the shift, like an activity's cost. */
  cost?: Record<string, number>
  /** How many of the calendar's periods it takes. None if left out, or without the calendar. */
  passes?: number
  /** More effects, applied after the cost and before the pay: a performance stat going up, say. */
  effects?: EffectRef[]
}

/** One step on a job's ladder. */
export type RankDef = {
  id: string
  /** What the player reads: "Barista". */
  title: string
  /** What a shift pays at this rank, by stat: `{ coins: 18 }`. */
  pay: Record<string, number>
  /** What it takes to be promoted to it. The first rank, where the player starts, needs nothing. */
  requires?: { shifts?: number; when?: Condition }
}

/** What gets the player fired. */
export type FireDef = {
  /** Fired after missing this many shifts in all. */
  missed?: number
  /** Fired as soon as this holds after a command: a performance stat too low, say. */
  when?: Condition
}

/** A job, as content declares it. */
export type JobDef = {
  id: string
  title: string
  /** A line or two about it, for the job board. */
  description?: string
  /** What it takes to be hired, each with the reason it's refused. */
  requires?: Requirement[]
  /** Where shifts are worked, with the places plugin. Anywhere if left out. */
  at?: string[]
  /** The weekdays it has shifts on, with the calendar plugin, from 0. Every day if left out. */
  days?: number[]
  /** The periods a shift can start in, with the calendar plugin. Any if left out. */
  hours?: string[]
  shift: ShiftDef
  /** The ladder, lowest first. The player is hired at the first. */
  ranks: RankDef[]
  fire?: FireDef
}

/** A job the player holds, as the save keeps it. */
export type HeldJob = {
  /** Which rank, from 0. */
  rank: number
  /** Shifts worked in all. */
  shifts: number
  /** Shifts missed in all. */
  missed: number
  /** The day they were hired: the calendar's day, or the turn without one. */
  hiredOn: number
  /** The day of the last shift worked, or null. */
  lastWorked: number | null
}

/** What the plugin keeps in a save. */
export type JobsState = {
  /** The jobs the player holds, by id. */
  held: Record<string, HeldJob>
  /** Jobs the player was fired from, with the day. They can't apply again. */
  fired: Record<string, number>
}

/** A rank as the UI shows it. */
export type RankView = { id: string; title: string; pay: Price | null }

/** A job as the UI shows it. */
export type JobView = {
  id: string
  title: string
  description: string
  hired: boolean
  /** The day the player was fired, or null. */
  firedOn: number | null
  /** The rank held, or null when not hired. */
  rank: RankView | null
  /** The next rank up, and how many more shifts it needs (0 when shifts aren't what's missing), or null at the top or when not hired. */
  next: (RankView & { shiftsToGo: number }) | null
  /** What a shift pays now: the rank's pay, or the first rank's for a job not held. */
  pay: Price | null
  shifts: number
  missed: number
  /** The next day with a shift: `inDays` 0 for today. Null when not hired or nothing is due in the next two weeks. */
  nextShift: { day: number; inDays: number } | null
  /** The button that applies, or null once hired or fired. Its `disabled` says what's missing. */
  apply: RenderedChoice | null
  /** The button that works a shift, or null when not hired. Its `price` is the shift's cost. */
  work: RenderedChoice | null
}

export type JobsView = {
  /** Every job, in the order the game declares them. */
  jobs: JobView[]
}

const ID = 'jobs'

function emptyState(): JobsState {
  return { held: {}, fired: {} }
}

/** The game's jobs: `data.jobs.jobs`, from its packs. */
export function jobDefs(game: Game): JobDef[] {
  return (game.data?.[ID]?.jobs ?? []) as JobDef[]
}

function jobOf(game: Game, id: unknown): JobDef | undefined {
  return jobDefs(game).find((job) => job.id === String(id ?? ''))
}

function sliceOf(state: GameState): JobsState {
  return (state.plugins?.[ID]?.state as JobsState | undefined) ?? emptyState()
}

/** The day: the calendar's, or the turn without one. */
function dayOf(state: GameState, game: Game): number {
  return (pluginQuery(game, 'calendar/now')?.(state) as { day: number } | undefined)?.day ?? state.turn
}

function hasCalendar(game: Game): boolean {
  return Boolean(pluginQuery(game, 'calendar/now'))
}

/** Is this day one the job has shifts on? Asked of the calendar's own weekday, on the clock moved to that day. */
function shiftDay(job: JobDef, day: number, state: GameState, context: PluginContext<JobsState>): boolean {
  if (!job.days || !hasCalendar(context.game)) return true
  const then = context.apply([{ custom: 'calendar/set', with: { day } }], state)
  return holds(then, { custom: 'calendar/weekday', with: { value: job.days } }, context.game)
}

/** Is the player at the job's workplace? Always, without the places plugin or a job with no `at`. */
function atWork(job: JobDef, context: PluginContext<JobsState>): boolean {
  if (!job.at) return true
  const here = context.query<string | null>('places/here')
  return here === undefined || (here !== null && job.at.includes(here))
}

function rankOf(job: JobDef, held: HeldJob | undefined): RankDef | undefined {
  return held ? job.ranks[Math.min(held.rank, job.ranks.length - 1)] : undefined
}

function payOf(job: JobDef, held: HeldJob | undefined): Record<string, number> {
  return (rankOf(job, held) ?? job.ranks[0])?.pay ?? {}
}

function priceView(game: Game, amounts: Record<string, number>): Price | null {
  const stats = Object.entries(amounts)
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => ({ id, amount, text: formatStat(statDef(game, id), amount) }))
  return stats.length ? { stats } : null
}

/** Why the player can't apply, or undefined. */
function cantApply(state: GameState, args: PluginArgs, context: PluginContext<JobsState>): string | undefined {
  const { game, slice } = context
  const job = jobOf(game, args.job)
  if (!job) return say(game, 'jobs/unknown')
  if (slice.held[job.id]) return say(game, 'jobs/alreadyHired')
  if (slice.fired[job.id] !== undefined) return say(game, 'jobs/wasFired')
  for (const requirement of job.requires ?? []) if (!holds(state, requirement.when, game)) return requirement.reason
  return undefined
}

/** Why the player can't work a shift now, or undefined. */
function cantWork(state: GameState, args: PluginArgs, context: PluginContext<JobsState>): string | undefined {
  const { game, slice } = context
  const job = jobOf(game, args.job)
  if (!job) return say(game, 'jobs/unknown')
  const held = slice.held[job.id]
  if (!held) return say(game, 'jobs/notHired')
  if (!atWork(job, context)) return say(game, 'jobs/notHere')
  const today = dayOf(state, game)
  if (!shiftDay(job, today, state, context)) return say(game, 'jobs/noShiftToday')
  if (job.hours) {
    const period = context.query<{ period: string }>('calendar/now')?.period
    if (period !== undefined && !job.hours.includes(period)) return say(game, 'jobs/notNow')
  }
  if (held.lastWorked === today) return say(game, 'jobs/workedToday')
  for (const [stat, amount] of Object.entries(job.shift.cost ?? {})) {
    if (amount > 0 && statValue(state, game, stat) < amount) return lackingLine(statDef(game, stat), stat, amount, game)
  }
  return undefined
}

/** What a shift applies: the cost, the time, the job's own effects, then the pay. */
function shiftEffects(job: JobDef, held: HeldJob | undefined): Effect[] {
  const cost: Effect[] = Object.entries(job.shift.cost ?? {})
    .filter(([, amount]) => amount > 0)
    .map(([key, amount]) => ({ kind: 'stat', key, by: -amount }))
  const time: Effect[] = job.shift.passes ? [{ kind: 'custom', name: 'calendar/pass', with: { periods: job.shift.passes } }] : []
  const pay: Effect[] = Object.entries(payOf(job, held))
    .filter(([, amount]) => amount !== 0)
    .map(([key, amount]) => ({ kind: 'stat', key, by: amount }))
  return [...cost, ...time, ...pay]
}

function hired(state: GameState, job: JobDef, context: PluginContext<JobsState>): GameState {
  const slice = sliceOf(state)
  if (slice.held[job.id]) return state
  const fired = { ...slice.fired }
  delete fired[job.id]
  const record: HeldJob = { rank: 0, shifts: 0, missed: 0, hiredOn: dayOf(state, context.game), lastWorked: null }
  return context.set({ held: { ...slice.held, [job.id]: record }, fired }, state)
}

function firedFrom(state: GameState, job: JobDef, context: PluginContext<JobsState>): GameState {
  const slice = sliceOf(state)
  if (!slice.held[job.id]) return state
  const held = { ...slice.held }
  delete held[job.id]
  const next = context.set({ held, fired: { ...slice.fired, [job.id]: dayOf(state, context.game) } }, state)
  return notify(next, { id: `job.${job.id}.fired`, title: say(context.game, 'jobs/firedNotice', { title: job.title }), tag: 'jobs' })
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
  for (const job of jobDefs(game)) {
    let held = sliceOf(next).held[job.id]
    if (!held) continue
    // The days that ended in this command, not counting the day they were hired.
    let missed = 0
    for (let day = Math.max(from, held.hiredOn + 1); day < to; day += 1) {
      if (held.lastWorked !== day && shiftDay(job, day, after, context)) missed += 1
    }
    if (missed) {
      held = { ...held, missed: held.missed + missed }
      next = context.set({ ...sliceOf(next), held: { ...sliceOf(next).held, [job.id]: held } }, next)
    }
    const fire = job.fire
    if (fire && ((fire.missed !== undefined && held.missed >= fire.missed) || (fire.when && holds(next, fire.when, game)))) {
      next = firedFrom(next, job, context)
      continue
    }
    let rank = held.rank
    while (rank + 1 < job.ranks.length) {
      const needs = job.ranks[rank + 1].requires
      if ((needs?.shifts ?? 0) > held.shifts || (needs?.when && !holds(next, needs.when, game))) break
      rank += 1
    }
    if (rank !== held.rank) {
      next = context.set({ ...sliceOf(next), held: { ...sliceOf(next).held, [job.id]: { ...held, rank } } }, next)
      next = notify(next, { id: `job.${job.id}.rank`, title: say(game, 'jobs/promoted', { title: job.ranks[rank].title }), tag: 'jobs' })
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
  return { id: rank.id, title: rank.title, pay: priceView(game, rank.pay) }
}

/** Everything the UI needs for a job board. */
export function jobsView(state: GameState, context: PluginContext<JobsState>): JobsView {
  const { game, slice } = context
  return {
    jobs: jobDefs(game).map((job): JobView => {
      const held = slice.held[job.id]
      const rank = rankOf(job, held)
      const up = held ? job.ranks[held.rank + 1] : undefined
      const firedOn = slice.fired[job.id] ?? null
      return {
        id: job.id,
        title: job.title,
        description: job.description ?? '',
        hired: Boolean(held),
        firedOn,
        rank: rank ? rankView(game, rank) : null,
        next: up && held ? { ...rankView(game, up), shiftsToGo: Math.max(0, (up.requires?.shifts ?? 0) - held.shifts) } : null,
        pay: priceView(game, payOf(job, held)),
        shifts: held?.shifts ?? 0,
        missed: held?.missed ?? 0,
        nextShift: held ? nextShift(job, held, state, context) : null,
        apply: held || firedOn !== null ? null : renderAction(state, game, { id: `apply.${job.id}`, label: job.title, command: applyFor(job.id) }),
        work: held ? renderAction(state, game, { id: `work.${job.id}`, label: job.title, command: work(job.id) }) : null,
      }
    }),
  }
}

function jobRef(args: PluginArgs): Reference[] {
  return args.job === undefined ? [] : [{ entry: String(args.job), plugin: ID, list: 'jobs', noun: 'job' }]
}

/**
 * The plugin. Add it to the game's `plugins`, and put jobs in a pack's
 * `data.jobs.jobs`.
 */
export function jobs() {
  return definePlugin<JobsState>({
    id: ID,
    version: 1,
    start: emptyState,
    cooperates: ['calendar', 'places'],
    strings: {
      unknown: 'There’s no such job.',
      alreadyHired: 'You already work there.',
      wasFired: 'They won’t have you back.',
      notHired: 'You don’t work there.',
      notHere: 'You aren’t at work.',
      noShiftToday: 'No shift today.',
      notNow: 'Not a time for a shift.',
      workedToday: 'You’ve done today’s shift.',
      promoted: 'Promoted: {title}',
      firedNotice: 'You’ve lost your job: {title}',
    },
    conditions: {
      /** `{ custom: 'jobs/hired', with: { job, rank? } }`: holds the job, at that rank if asked. */
      hired: (_state, args, { slice, game }) => {
        const job = jobOf(game, args.job)
        const held = job && slice.held[job.id]
        if (!job || !held) return false
        return args.rank === undefined || rankOf(job, held)?.id === String(args.rank)
      },
      /** `{ custom: 'jobs/fired', with: { job } }`: was fired from it. */
      fired: (_state, args, { slice }) => slice.fired[String(args.job ?? '')] !== undefined,
      /** `{ custom: 'jobs/shifts', with: { job, gte… } }`: shifts worked at a job held, in a range. */
      shifts: (_state, args, { slice }) => {
        const held = slice.held[String(args.job ?? '')]
        return held !== undefined && inRange(held.shifts, args as Range)
      },
    },
    effects: {
      /** `{ custom: 'jobs/hire', with: { job } }`: hired now, with no requirements asked. */
      hire: (state, args, context) => {
        const job = jobOf(context.game, args.job)
        return job ? hired(state, job, context) : state
      },
      /** `{ custom: 'jobs/fire', with: { job } }`: fired now, with the notice. */
      fire: (state, args, context) => {
        const job = jobOf(context.game, args.job)
        return job ? firedFrom(state, job, context) : state
      },
    },
    commands: {
      /** `{ type: 'custom', name: 'jobs/apply', with: { job } }`. */
      apply: {
        whyNot: (state, args, context) => cantApply(state, args, context),
        run: (state, args, context) => hired(state, jobOf(context.game, args.job)!, context),
      },
      /** `{ type: 'custom', name: 'jobs/work', with: { job } }`. */
      work: {
        whyNot: (state, args, context) => cantWork(state, args, context),
        spends: (_state, args, { game }) => jobOf(game, args.job)?.shift.cost,
        effectsOf: (_state, args, { game, slice }) => {
          const job = jobOf(game, args.job)
          return job ? shiftEffects(job, slice.held[job.id]) : []
        },
        run: (state, args, context) => {
          const job = jobOf(context.game, args.job)!
          const held = context.slice.held[job.id]
          const today = dayOf(state, context.game)
          // The shift's own effects come after the cost and the time, before the pay.
          const effects = shiftEffects(job, held)
          const pay = effects.filter((effect) => effect.kind === 'stat' && effect.by > 0)
          const before = effects.filter((effect) => !pay.includes(effect))
          let next = context.apply([...before, ...(job.shift.effects ?? []), ...pay])
          const slice = sliceOf(next)
          const record = slice.held[job.id] ?? held
          next = context.set({ ...slice, held: { ...slice.held, [job.id]: { ...record, shifts: record.shifts + 1, lastWorked: today } } }, next)
          return next
        },
      },
      /** `{ type: 'custom', name: 'jobs/quit', with: { job } }`: leave it. The player can apply again. */
      quit: {
        whyNot: (_state, args, { slice, game }) => (slice.held[String(args.job ?? '')] ? undefined : say(game, 'jobs/notHired')),
        run: (state, args, context) => {
          const held = { ...context.slice.held }
          delete held[String(args.job)]
          return context.set({ ...context.slice, held }, state)
        },
      },
    },
    hooks: { after: review },
    view: (state, context) => jobsView(state, context),
    references: {
      calls: (_kind, _name, args) => jobRef(args),
      content: (game) =>
        jobDefs(game).map((job) => ({
          list: 'jobs',
          id: job.id,
          refs: [
            ...(job.at ?? []).map((location): Reference => ({ entry: location, plugin: 'places', list: 'locations', noun: 'location' })),
            ...(job.requires ?? []).map((requirement): Reference => ({ within: 'requires', refs: [{ when: requirement.when }] })),
            { within: 'shift', refs: [...Object.keys(job.shift?.cost ?? {}).map((stat): Reference => ({ stat, writes: true })), { effects: job.shift?.effects }] },
            ...(job.ranks ?? []).map((rank): Reference => ({
              within: `rank ${rank.id}`,
              refs: [...Object.keys(rank.pay ?? {}).map((stat): Reference => ({ stat, writes: true })), { when: rank.requires?.when }],
            })),
            { within: 'fire', refs: [{ when: job.fire?.when }] },
          ],
        })),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const job of jobDefs(game)) {
        const problem = (what: string) => problems.push({ list: 'jobs', id: job.id, what })
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

/** A command: apply for the job. */
export const applyFor = (job: string): Command => ({ type: 'custom', name: 'jobs/apply', with: { job } })
/** A command: work a shift at the job. */
export const work = (job: string): Command => ({ type: 'custom', name: 'jobs/work', with: { job } })
/** A command: leave the job. */
export const quit = (job: string): Command => ({ type: 'custom', name: 'jobs/quit', with: { job } })
/** An effect: hire the player now, asking no requirements. */
export const hire = (job: string): EffectRef => ({ custom: 'jobs/hire', with: { job } })
/** An effect: fire the player from the job now. */
export const fire = (job: string): EffectRef => ({ custom: 'jobs/fire', with: { job } })
/** A condition: the player holds the job, at this rank if given. */
export const hasJob = (job: string, rank?: string): Condition => ({ custom: 'jobs/hired', with: rank === undefined ? { job } : { job, rank } })
/** A condition: the player was fired from the job. */
export const wasFired = (job: string): Condition => ({ custom: 'jobs/fired', with: { job } })
/** A condition: shifts worked at a job the player holds, in this range. */
export const shiftsWorked = (job: string, range: Range): Condition => ({ custom: 'jobs/shifts', with: { job, ...range } })
