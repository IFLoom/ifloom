import { storylineOf, storylineOpen } from './storylines.ts'
import { holds, type Condition, type Range } from './condition.ts'
import { customCall, customCondition } from './custom.ts'
import type { Game } from './game.ts'
import { turnsSince } from './progress.ts'
import { bindCurrent, entitiesOf, entityOf } from './entities.ts'
import { statBand } from './stats.ts'
import type { GameState } from './types.ts'

/**
 * Why a condition holds or not, part by part.
 *
 * The question authors ask most is "why is this greyed out?" or "why is this
 * missing?". `explain` answers it: the whole condition tree, each part marked
 * true or false, each leaf saying what it read and what it wanted.
 */
export type Explanation = {
  holds: boolean
  /** One line: what this part checked, what it found. */
  why: string
  /** The parts of an `all`, `any` or `not`. */
  parts?: Explanation[]
}

function wanted(range: Range): string {
  const parts = [
    range.gte !== undefined ? `${range.gte} or more` : '',
    range.gt !== undefined ? `more than ${range.gt}` : '',
    range.lte !== undefined ? `${range.lte} or less` : '',
    range.lt !== undefined ? `below ${range.lt}` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(' and ') : 'more than 0'
}

function ranged(range: Range): boolean {
  return range.gte !== undefined || range.gt !== undefined || range.lte !== undefined || range.lt !== undefined
}

function leaf(state: GameState, condition: Condition, game: Game | undefined): string {
  const c = condition as Record<string, unknown> & Range
  if ('flag' in condition) {
    const owner = condition.of === undefined ? state.flags : entityOf(state, condition.of)?.flags
    if (!owner) return `${condition.of} is not in the game; wants it there`
    const value = owner[condition.flag]
    const want = condition.is !== undefined ? `= ${JSON.stringify(condition.is)}` : ranged(c) ? wanted(c) : 'set'
    return `${condition.of === undefined ? '' : `${condition.of} `}flag ${condition.flag} is ${value === undefined ? 'unset' : JSON.stringify(value)}; wants ${want}`
  }
  if ('setting' in condition) {
    const value = state.settings?.[condition.setting]
    const want = condition.is !== undefined ? `= ${JSON.stringify(condition.is)}` : ranged(c) ? wanted(c) : 'on'
    return `setting ${condition.setting} is ${value === undefined ? 'unset' : JSON.stringify(value)}; wants ${want}`
  }
  if ('chose' in condition) return `choice ${condition.chose} picked ${state.chosen?.[condition.chose] ?? 0} times; wants ${wanted(c)}`
  if ('seen' in condition) return `scene ${condition.seen} seen ${state.seen?.[condition.seen] ?? 0} times; wants ${wanted(c)}`
  if ('since' in condition) {
    const turns = turnsSince(state, condition.since)
    return turns === null
      ? `scene ${condition.since} not seen yet; wants ${wanted(c)} turns since`
      : `scene ${condition.since} first seen ${turns} turns ago; wants ${wanted(c)}`
  }
  if ('storylineFlag' in condition) {
    const { storyline, key, is } = condition.storylineFlag
    const value = storylineOf(state, storyline).flags[key]
    const want = is === undefined ? 'set' : `= ${JSON.stringify(is)}`
    return `storyline ${storyline} flag ${key} is ${value === undefined ? 'unset' : JSON.stringify(value)}; wants ${want}`
  }
  if ('stat' in condition) {
    if (condition.of === undefined) return `stat ${condition.stat} is ${state.stats[condition.stat] ?? 0}; wants ${wanted(c)}`
    const entity = entityOf(state, condition.of)
    if (!entity) return `${condition.of} is not in the game`
    return `${condition.of} stat ${condition.stat} is ${entity.stats[condition.stat] ?? 0}; wants ${wanted(c)}`
  }
  if ('count' in condition) {
    const refs = entitiesOf(state, condition.count)
    const n = condition.where ? refs.filter((ref) => holds(state, bindCurrent(condition.where, ref), game)).length : refs.length
    return `${n} ${condition.count}${condition.where ? ' where it holds' : ''}; wants ${wanted(c)}`
  }
  if ('entity' in condition) return `${condition.entity} is ${entityOf(state, condition.entity) ? '' : 'not '}in the game`
  if ('tier' in condition) {
    const band = game ? statBand(state, game, condition.tier) : 0
    return `stat ${condition.tier} is in band ${band}; wants band ${condition.gte} or more`
  }
  if ('storyline' in condition) {
    const open = storylineOpen(state, condition.storyline)
    return `storyline ${condition.storyline} is ${open ? 'open' : 'closed'}; wants it ${condition.open ?? true ? 'open' : 'closed'}`
  }
  if ('counter' in condition) {
    const { storyline, key } = condition.counter
    const value = storylineOf(state, storyline).flags[key]
    return `counter ${storyline}.${key} is ${typeof value === 'number' ? value : 0}; wants ${wanted(c)}`
  }
  if ('item' in condition) return `item ${condition.item}: ${state.items[condition.item] ?? 0} carried; wants ${wanted(c)}`
  if ('collection' in condition) {
    const entries = state.collections?.[condition.collection] ?? []
    if (condition.id !== undefined) {
      return `${condition.collection} ${entries.some((entry) => entry.id === condition.id) ? 'has' : 'lacks'} ${condition.id}; wants it there`
    }
    return `${condition.collection} has ${entries.length}; wants ${ranged(c) ? wanted(c) : 'at least 1'}`
  }
  if ('has' in condition) return `item ${condition.has}: ${state.items[condition.has] ?? 0} owned; wants at least 1`
  if ('scene' in condition) return `scene on screen is ${state.sceneId ?? 'none'}; wants one of ${condition.scene.join(', ')}`
  if ('turn' in condition) return `turn ${state.turn}; wants ${wanted(c)}`
  if ('phase' in condition) return `phase is ${state.phase || '(none)'}; wants one of ${condition.phase.join(', ')}`
  const call = customCall(condition)
  if (call) {
    return customCondition(game, call.custom)
      ? `custom condition ${call.custom}`
      : `custom condition ${call.custom} is not declared by the game`
  }
  return 'an unknown condition'
}

/** Explain a condition against a state, part by part. No condition always holds. */
export function explain(
  state: GameState,
  condition: Condition | undefined,
  game?: Game,
): Explanation {
  if (!condition) return { holds: true, why: 'no condition' }
  if ('all' in condition) {
    const parts = condition.all.map((entry) => explain(state, entry, game))
    const failing = parts.filter((part) => !part.holds).length
    return {
      holds: failing === 0,
      why: failing ? `all of ${parts.length}: ${failing} fail` : `all of ${parts.length} hold`,
      parts,
    }
  }
  if ('any' in condition) {
    const parts = condition.any.map((entry) => explain(state, entry, game))
    const passing = parts.filter((part) => part.holds).length
    return {
      holds: passing > 0,
      why: passing ? `any of ${parts.length}: ${passing} hold` : `any of ${parts.length}: none hold`,
      parts,
    }
  }
  if ('not' in condition) {
    const inner = explain(state, condition.not, game)
    return { holds: !inner.holds, why: `not: the part below ${inner.holds ? 'holds' : 'fails'}`, parts: [inner] }
  }
  return { holds: holds(state, condition, game), why: leaf(state, condition, game) }
}

/** An explanation as indented lines, ✓ or ✗ on each: for a log or a debug panel. */
export function explainText(explanation: Explanation, depth = 0): string {
  const line = `${'  '.repeat(depth)}${explanation.holds ? '✓' : '✗'} ${explanation.why}`
  return [line, ...(explanation.parts ?? []).map((part) => explainText(part, depth + 1))].join('\n')
}
