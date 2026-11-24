import {
  actionOf,
  callOf,
  apply,
  buildEffects,
  entitiesOf,
  commandOf,
  inlineChoices,
  pluginQuery,
  statOf,
  view,
  type Command,
  type CommandRef,
  type Game,
  type GameState,
  type RenderedChoice,
  type View,
} from '@ifloom/engine'

/** A function that chooses the next command for `playtest` from the view, the state and the game. It returns null to stop the run. */
export type Policy = (screen: View, state: GameState, game: Game) => CommandRef | null

/** Settings for `playtest`. Each is optional. */
export type PlaytestOptions = {
  /** The number of turns the run plays before it stops. 7 if left out. */
  turns?: number
  /** The most commands the run sends, whatever the turn, so a policy that goes round in circles still stops. 2000 if left out. */
  steps?: number
}

/**
 * One turn's numbers in a playtest, taken as the turn ended. They hold the player's stats and the number of entities of
 * each listed kind.
 */
export type TurnMetrics = {
  /** The turn's number, counting from 1. */
  turn: number
  /** The player's stats and, by kind id, the number of entities of each listed kind, as the turn ended. */
  stats: Record<string, number>
  /** The ids of the scenes the turn opened, in order. */
  scenes: string[]
  /** The number of the policy's commands the game refused during the turn. */
  refused: number
}

/** The result of a `playtest` run, with its transcript, each turn's numbers and the refusals. */
export type Playtest = {
  /** The run's transcript as plain text, with each screen and the command sent from it. */
  transcript: string
  /** Each turn's numbers, in order. */
  turns: TurnMetrics[]
  /** The policy's commands that the game refused, each with its turn and reason. Each one is a bug in the policy or the game. */
  refusals: { turn: number; command: Command; reason: string }[]
  /** The state the run ended on. */
  state: GameState
}

/**
 * Returns a view as plain text, as `ifloom playtest` writes it. The text has the turn, the time, the body, each choice
 * and action with its price or reason, and the inputs.
 */
export function screenText(screen: View): string {
  const where = [`Turn ${screen.turn + 1}`, screen.when].filter(Boolean)
  const lines = [`== ${where.join(' · ')}`, `# ${screen.scene.title}`, screen.scene.body]
  const buttons = [
    ...inlineChoices(screen.scene.beats),
    ...screen.scene.choices,
    ...screen.actions,
    // Say whose button it is: every person's reads "Talk".
    ...peopleOn(screen).flatMap((person) => person.actions.map((action) => ({ ...action, label: `${person.name}: ${action.label}` }))),
  ]
  for (const button of buttons) {
    const price = [...(button.price?.stats ?? []).map((stat) => stat.text), ...(button.price?.notes ?? [])]
    lines.push(
      `  [${button.disabled ? ' ' : '>'}] ${button.label}${price.length ? ` (${price.join(', ')})` : ''}${button.disabled ? ` — ${button.disabled}` : ''}`,
    )
  }
  for (const exit of exitsOn(screen)) lines.push(`  -> ${exit.label}${exit.disabled ? ` — ${exit.disabled}` : ''}`)
  // Inputs are asked inside a scene, as the UIs draw them.
  if (screen.scene.id) for (const input of screen.inputs) lines.push(`  [input] ${input.label}: ${input.value === null ? '—' : String(input.value)}`)
  return lines.join('\n')
}

/** How many times one screen, state and command may come round in a turn before the run stops as going in circles. */
const ROUNDS = 3

/** A place as the explorer walks it: its exits and its actions. */
type Place = { id: string; exits: readonly string[]; actions?: readonly { command: CommandRef }[] }

/** The game's places, asked of the places plugin by name: none without it. */
function placesIn(game: Game, state: GameState): Place[] {
  return (pluginQuery(game, 'places/all')?.(state) as Place[] | undefined) ?? []
}

/** Where the player is, asked of the places plugin by name: nowhere without it. */
function here(game: Game, state: GameState): string | null {
  return pluginQuery(game, 'places/here')?.(state) ?? null
}

/** Who is on screen, with their buttons: the cast plugin's, read by shape. Nobody without it. */
function peopleOn(screen: View): { name: string; actions: View['actions'] }[] {
  return (screen.plugins.cast as { present?: { name: string; actions: View['actions'] }[] } | undefined)?.present ?? []
}

/** The exits on screen, from the places plugin's view, each with the command that takes it. */
function exitsOn(screen: View): RenderedChoice[] {
  return (screen.plugins.places as { exits?: RenderedChoice[] } | undefined)?.exits ?? []
}

/** A command that goes to bed: the calendar's, asked for by name so nothing needs importing. */
function isBed(command: Command): boolean {
  return command.type === 'custom' && command.name === 'calendar/sleep'
}

/** Does this place offer a bed: an action, its own or the game's, that goes to bed? */
function hasBed(game: Game, all: Place[], locationId: string | null): boolean {
  const actions = [...(all.find((place) => place.id === locationId)?.actions ?? []), ...(game.actions ?? [])]
  return actions.some((action) => action.command !== undefined && isBed(commandOf(action.command)))
}

/** The first step on the shortest walk from here to a place where `goal` holds, if there is one. */
function toward(all: Place[], from: string | null, goal: (locationId: string) => boolean): string | undefined {
  if (from === null) return undefined
  const first = new Map<string, string>()
  const queue = [from]
  const seen = new Set([from])
  while (queue.length) {
    const at = queue.shift()!
    if (at !== from && goal(at)) return first.get(at)
    for (const next of all.find((place) => place.id === at)?.exits ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      first.set(next, at === from ? next : first.get(at)!)
      queue.push(next)
    }
  }
  return undefined
}

/** Would this command end the turn? Tried on the state as it is: draws are seeded, so the try is the real thing. */
function endsTurn(game: Game, state: GameState, command: Command): boolean {
  const out = apply(state, game, command)
  return out.ok && out.state.turn > state.turn
}

/** A tick that runs the soonest running timer out, as a player waiting would, or null while none runs. */
function waitFor(screen: View): Command | null {
  const soonest = Math.min(...screen.timers.map((timer) => timer.left))
  return Number.isFinite(soonest) ? { type: 'tick', ms: Math.max(soonest, 1) } : null
}

/**
 * Returns a policy that explores the game as a curious player would, rather than following a route through the story.
 * It never chooses a choice or action that carries a warning.
 *
 * In a scene it chooses a choice it hasn't chosen yet. Otherwise, at the calendar's bedtime it goes to bed, walking
 * home if it must. Failing that it talks to someone and does something, each once a turn, leaving an action that ends
 * the turn till last. Then it walks to the nearest location it hasn't visited this turn, waits for a running timer with
 * a `tick`, and at last ends the turn.
 */
export function explorer(): Policy {
  const visited = new Map<number, Set<string>>()
  // Choices made in scenes, over the whole run: a scene met again takes a branch not yet taken.
  const chosen = new Set<string>()
  return (screen, state, game) => {
    const today = visited.get(state.turn) ?? new Set<string>()
    visited.set(state.turn, today)
    // In a scene: a choice not yet made in this playtest, so a second visit takes another branch.
    if (screen.scene.id) {
      const open = [...inlineChoices(screen.scene.beats), ...screen.scene.choices].filter((choice) => !choice.disabled && !choice.warning)
      const fresh = open.find((choice) => !chosen.has(`${screen.scene.id}/${choice.id}`)) ?? open[0]
      if (fresh) chosen.add(`${screen.scene.id}/${fresh.id}`)
      return fresh?.command ?? waitFor(screen) ?? { type: 'leave' }
    }
    // When the calendar says it is late enough for bed, go, walking home if need be.
    if (pluginQuery(game, 'calendar/bedtime')?.(state)) {
      const bed = screen.actions.find((entry) => isBed(entry.command) && !entry.disabled)
      if (bed) return bed.command
      const all = placesIn(game, state)
      const step = toward(all, here(game, state), (id) => hasBed(game, all, id))
      const exit = exitsOn(screen).find((entry) => entry.id === step && !entry.disabled)
      if (exit) return exit.command
    }
    const at = here(game, state)
    if (at !== null) today.add(at)
    const person = peopleOn(screen)
      .flatMap((entry) => entry.actions)
      .find((action) => !action.disabled)
    if (person && !today.has(`talk:${person.id}`)) {
      today.add(`talk:${person.id}`)
      return person.command
    }
    // Something to do here that isn't simply passing time, nor the end of the turn: an action with an effect, or another command.
    const action = screen.actions.find((entry) => {
      if (entry.disabled || entry.warning || today.has(`do:${entry.id}`) || isBed(entry.command)) return false
      if (endsTurn(game, state, entry.command)) return false
      if (entry.command.type !== 'action') return true
      // An action that only lets time pass is waiting, not doing; its cost does not count.
      const effects = buildEffects(game, actionOf(state, game, entry.command.id)?.effects ?? [])
      return effects.some((effect) => callOf(effect)?.name !== 'calendar/pass')
    })
    if (action) {
      today.add(`do:${action.id}`)
      return action.command
    }
    // Somewhere not yet seen today, by way of places already seen if it must.
    const step = toward(placesIn(game, state), at, (id) => !today.has(id))
    const exit = exitsOn(screen).find((entry) => entry.id === step && !entry.disabled)
    if (exit) {
      // Counted as seen as it's set out for, so a place that sends the player straight back isn't headed for again.
      today.add(exit.id)
      return exit.command
    }
    // Nothing new, but a timer is running (a message on its way, say): wait for the first to run out.
    const wait = waitFor(screen)
    if (wait) return wait
    // Nothing new: pass time, ending the turn if something does, else something not done this turn.
    const usable = screen.actions.filter((entry) => !entry.disabled && !entry.warning && !isBed(entry.command))
    const rest = usable.find((entry) => endsTurn(game, state, entry.command)) ?? usable.find((entry) => !today.has(`do:${entry.id}`)) ?? usable[0]
    if (rest) today.add(`do:${rest.id}`)
    return rest?.command ?? null
  }
}

/**
 * Returns the result of playing from `start` with `policy`, the explorer by default. It stops when `turns` or `steps`
 * run out, the policy returns null, the game restarts or a screen keeps repeating.
 *
 * The transcript writes each notice once, under the screen it first shows on.
 */
export function playtest(game: Game, start: GameState, policy: Policy = explorer(), options: PlaytestOptions = {}): Playtest {
  const turns = options.turns ?? 7
  const limit = options.steps ?? 2000
  const lines: string[] = []
  const metrics: TurnMetrics[] = []
  const refusals: Playtest['refusals'] = []
  let state = start
  let scenes: string[] = []
  let refused = 0
  let refusedLast = false
  // Notices already printed: the explorer never dismisses them, so each shows once, where it was raised.
  const told = new Set<string>()
  // Each screen, state and command this turn, and how often it has come round.
  const rounds = new Map<string, number>()
  const close = (turn: number) => {
    // The player's stats, then how many there are of each kind of entity the game lists. A kind that's never
    // listed, such as the places' `location` or the shop's `vendor`, is the plugin's bookkeeping, not a number to watch.
    const stats = Object.fromEntries([
      ...(game.stats ?? []).filter((stat) => !stat.of).map((stat) => [stat.id, state.stats[stat.id] ?? statOf(game, stat.id)?.start ?? 0]),
      ...(game.kinds ?? []).filter((kind) => kind.listed !== false).map((kind) => [kind.id, entitiesOf(state, game, kind.id).length]),
    ])
    metrics.push({ turn: turn + 1, stats, scenes, refused })
    scenes = []
    refused = 0
  }
  for (let step = 0; step < limit && state.turn - start.turn < turns; step += 1) {
    const screen = view(state, game)
    const text = screenText(screen)
    const news = screen.notices.unseen.filter((notice) => !told.has(notice.id)).reverse()
    for (const notice of news) told.add(notice.id)
    lines.push([text, ...news.map((notice) => `  ! ${notice.title}${notice.text ? `: ${notice.text}` : ''}`)].join('\n'))
    const picked = policy(screen, state, game)
    if (!picked) break
    const command = commandOf(picked)
    lines.push(`> ${JSON.stringify(command)}`)
    // The same screen, the same state and the same command, again and again in one turn: nothing is moving, so stop.
    const key = JSON.stringify([state.turn, text, command, state.stats, state.kv, state.held, state.plugins])
    const round = (rounds.get(key) ?? 0) + 1
    rounds.set(key, round)
    if (round >= ROUNDS) {
      lines.push('  going round in circles: the same screen and command keep coming back, so the playtest stops here')
      break
    }
    const out = apply(state, game, command)
    if (!out.ok) {
      refused += 1
      refusals.push({ turn: state.turn + 1, command, reason: out.reason ?? '' })
      lines.push(`  refused: ${out.reason}`)
      // Refused twice running with nothing in between: a policy that can't move on stops here.
      if (refusedLast && JSON.stringify(refusals.at(-2)?.command) === JSON.stringify(command)) break
      refusedLast = true
      continue
    }
    refusedLast = false
    // The game started over (a `newGame`, say from an ending's choice): the run played is done.
    if (out.newGame) {
      lines.push('  a new game: the playtest stops here')
      break
    }
    if (out.state.sceneId && out.state.sceneId !== state.sceneId) scenes.push(out.state.sceneId)
    if (out.state.turn !== state.turn) {
      close(state.turn)
      rounds.clear()
    }
    state = out.state
  }
  // The turn it stopped in, unless that is only the start of the turn after the last one it was asked for.
  if (state.turn - start.turn < turns) close(state.turn)
  return { transcript: lines.join('\n\n'), turns: metrics, refusals, state }
}

/** Returns a playtest's turn numbers as a tab-separated table, with a header row and one row a turn. */
export function metricsText(turns: TurnMetrics[]): string {
  const stats = Object.keys(turns[0]?.stats ?? {})
  const rows = [['turn', ...stats, 'scenes', 'refused'].join('\t')]
  for (const turn of turns) rows.push([turn.turn, ...stats.map((id) => turn.stats[id]), turn.scenes.length, turn.refused].join('\t'))
  return rows.join('\n')
}
