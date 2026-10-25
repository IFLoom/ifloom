import { holds, type Condition } from './condition.ts'
import { conditionEntry, conditionKeys, featureContext } from './core.ts'
import type { Game } from './game.ts'
import type { GameState } from './types.ts'
import { withAmounts } from './amount.ts'

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

/** One leaf's line, from its kind's entry; a condition with no kind key, or several, says so. */
function leaf(state: GameState, condition: Condition, game: Game): string {
  const entry = conditionEntry(condition)
  if (entry) return entry.explain(state, withAmounts(state, condition, game), game, featureContext())
  const kinds = conditionKeys(condition)
  return kinds.length ? `a condition with ${kinds.length} keys (${kinds.join(', ')}); wants one` : 'an unknown condition'
}

/** Explain a condition against a state, part by part. No condition always holds. */
export function explain(state: GameState, game: Game, condition: Condition | undefined): Explanation {
  if (!condition) return { holds: true, why: 'no condition' }
  // `all`, `any` and `not` are explained part by part. A condition with another kind key besides is a leaf, and holds nowhere.
  const kinds = conditionKeys(condition)
  const kind = kinds.length === 1 ? kinds[0] : undefined
  if (kind === 'all' && 'all' in condition) {
    const parts = condition.all.map((entry) => explain(state, game, entry))
    const failing = parts.filter((part) => !part.holds).length
    return {
      holds: failing === 0,
      why: failing ? `all of ${parts.length}: ${failing} fail` : `all of ${parts.length} hold`,
      parts,
    }
  }
  if (kind === 'any' && 'any' in condition) {
    const parts = condition.any.map((entry) => explain(state, game, entry))
    const passing = parts.filter((part) => part.holds).length
    return {
      holds: passing > 0,
      why: passing ? `any of ${parts.length}: ${passing} hold` : `any of ${parts.length}: none hold`,
      parts,
    }
  }
  if (kind === 'not' && 'not' in condition) {
    const inner = explain(state, game, condition.not)
    return { holds: !inner.holds, why: `not: the part below ${inner.holds ? 'holds' : 'fails'}`, parts: [inner] }
  }
  return { holds: holds(state, game, condition), why: leaf(state, condition, game) }
}

/** An explanation as indented lines, ✓ or ✗ on each: for a log or a debug panel. */
export function explainText(explanation: Explanation, depth = 0): string {
  const line = `${'  '.repeat(depth)}${explanation.holds ? '✓' : '✗'} ${explanation.why}`
  return [line, ...(explanation.parts ?? []).map((part) => explainText(part, depth + 1))].join('\n')
}
