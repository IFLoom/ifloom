import { say } from './strings.ts'
import { holds, type Condition } from './condition.ts'
import type { Game } from './game.ts'
import type { FlagValue, GameState } from './types.ts'

/**
 * Something the player types or picks, written to a variable: a name for a
 * pet, the time an alarm goes off, a note. The engine checks the value against
 * the declaration, so a UI can't put anything else in.
 */
export type InputDef = {
  id: string
  /** What the field is called. */
  label: string
  kind: 'text' | 'number' | 'choice'
  /** The variable it writes. The input's id if left out. */
  variable?: string
  /** Only on offer while this holds. */
  when?: Condition
  /** Text: the most characters, after trimming. 40 if left out. */
  maxLength?: number
  /** Number: the range, inclusive. */
  min?: number
  max?: number
  /** Choice: the values on offer, with what the player reads for each. */
  options?: { value: FlagValue; label: string }[]
}

export function inputById(game: Game, id: string): InputDef | undefined {
  return game.inputs?.find((entry) => entry.id === id)
}

/** The value as it will be written: text trimmed. */
export function inputValue(input: InputDef, value: FlagValue): FlagValue {
  return input.kind === 'text' && typeof value === 'string' ? value.trim() : value
}

/** Why this value can't be entered, as the player reads it; undefined if it can. */
export function inputRefusal(state: GameState, game: Game, id: string, value: FlagValue | undefined): string | undefined {
  const input = inputById(game, id)
  if (!input) return say(game, 'noSuchInput')
  if (!holds(state, input.when, game)) return say(game, 'notNow')
  if (value === undefined) return say(game, 'enterSomething')
  switch (input.kind) {
    case 'text': {
      if (typeof value !== 'string' || !value.trim()) return say(game, 'enterSomething')
      const most = input.maxLength ?? 40
      return value.trim().length > most ? say(game, 'tooLong', { n: most }) : undefined
    }
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return say(game, 'enterNumber')
      if ((input.min !== undefined && value < input.min) || (input.max !== undefined && value > input.max)) {
        if (input.min !== undefined && input.max !== undefined) return say(game, 'between', { min: input.min, max: input.max })
        return input.min !== undefined ? say(game, 'atLeast', { min: input.min }) : say(game, 'atMost', { max: input.max! })
      }
      return undefined
    }
    case 'choice':
      return (input.options ?? []).some((option) => option.value === value) ? undefined : say(game, 'notAnOption')
  }
}
