/**
 * Inputs: what the player types or picks, each written to a key in the kv store. The
 * engine checks the value against the declaration, so a UI can't put
 * anything else in.
 */
import { stringOf } from '../strings.ts'
import type { Game } from '../game.ts'
import type { Condition, KvValue, GameState } from '../types.ts'
import { defineFeature, mergedById, type FeatureContext } from './feature.ts'

/**
 * Something the player types or picks, written to a kv key: a name for a
 * pet, the time an alarm goes off, a note. The engine checks the value against
 * the declaration, so a UI can't put anything else in.
 */
export type InputDef = {
  id: string
  /** What the field is called. */
  label: string
  type: 'text' | 'number' | 'choice'
  /** The kv key it writes. The input's id if left out. */
  key?: string
  /** Only on offer while this holds. */
  when?: Condition
  /** Text: the most characters, after trimming. 40 if left out. */
  maxLength?: number
  /** Number: the range, inclusive. */
  min?: number
  max?: number
  /** Choice: the values on offer, with what the player reads for each. */
  options?: { value: KvValue; label: string }[]
}

export type InputView = {
  id: string
  label: string
  type: InputDef['type']
  maxLength: number | null
  min: number | null
  max: number | null
  options: { value: KvValue; label: string }[]
  /** What its key holds now, if anything. */
  value: KvValue | null
}

/** What the inputs feature adds, as types. */
export type InputsShape = {
  commands: {
    /** Write what the player typed or picked, `to` that value. A button leaves `to` out and the UI asks. */
    input: { type: 'input'; id: string; to?: KvValue }
  }
  game: {
    /** What the player can type or pick, and the kv key each one writes. */
    inputs?: InputDef[]
  }
  pack: {
    inputs?: InputDef[]
  }
  view: {
    /** The inputs on offer now, in the order the game declares them, with the value each holds. */
    inputs: InputView[]
  }
  lists: 'input'
  references: {
    input: { input: string }
  }
}

export function inputOf(game: Game, id: string): InputDef | undefined {
  return game.inputs?.find((entry) => entry.id === id)
}

/** The value as it will be written: text trimmed. */
export function inputValue(input: InputDef, value: KvValue): KvValue {
  return input.type === 'text' && typeof value === 'string' ? value.trim() : value
}

/** Why this value can't be entered, as the player reads it; undefined if it can. */
export function inputRefusal(state: GameState, game: Game, id: string, value: KvValue | undefined, cx: FeatureContext): string | undefined {
  const input = inputOf(game, id)
  if (!input) return stringOf(game, 'noSuchInput')
  if (!cx.holds(state, game, input.when)) return stringOf(game, 'notNow')
  if (value === undefined) return stringOf(game, 'enterSomething')
  switch (input.type) {
    case 'text': {
      if (typeof value !== 'string' || !value.trim()) return stringOf(game, 'enterSomething')
      const most = input.maxLength ?? 40
      return value.trim().length > most ? stringOf(game, 'tooLong', { n: most }) : undefined
    }
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return stringOf(game, 'enterNumber')
      if ((input.min !== undefined && value < input.min) || (input.max !== undefined && value > input.max)) {
        if (input.min !== undefined && input.max !== undefined) return stringOf(game, 'between', { min: input.min, max: input.max })
        return input.min !== undefined ? stringOf(game, 'atLeast', { min: input.min }) : stringOf(game, 'atMost', { max: input.max! })
      }
      return undefined
    }
    case 'choice':
      return (input.options ?? []).some((option) => option.value === value) ? undefined : stringOf(game, 'notAnOption')
  }
}

export const inputs = defineFeature<InputsShape>({
  name: 'inputs',
  commands: {
    input: {
      whyNot: (state, command, game, cx) => inputRefusal(state, game, command.id, command.to, cx),
      run: (state, command, game) => {
        const input = inputOf(game, command.id)!
        const key = input.key ?? input.id
        return { ...state, kv: { ...state.kv, [key]: inputValue(input, command.to!) } }
      },
      references: (command) => [{ input: command.id }],
    },
  },
  pack: mergedById<InputsShape['game'], InputsShape['pack'], InputDef>({ base: (game) => game.inputs, pack: (pack) => pack.inputs }, (game, list) => {
    game.inputs = list
  }),
  lists: ['input'],
  check: (game, tools) => {
    tools.twice(
      'input',
      'inputs',
      (game.inputs ?? []).map((entry) => entry.id),
    )
    for (const input of game.inputs ?? []) {
      const source = { list: 'input', id: input.id }
      const where = `input ${input.id}`
      tools.check(source, where, [{ when: input.when }])
      if (input.type === 'choice' && !input.options?.length) tools.problem(source, where, 'a choice with no options')
      if (input.min !== undefined && input.max !== undefined && input.min > input.max) tools.problem(source, where, 'min is above max')
    }
  },
  resolve: (game) => {
    const ids = new Set((game.inputs ?? []).map((input) => input.id))
    return { input: (ref) => (ids.has(ref.input) ? [] : [`unknown input "${ref.input}"`]) }
  },
  view: (state, game, _shown, cx) => ({
    inputs: (game.inputs ?? [])
      .filter((input) => cx.holds(state, game, input.when))
      .map((input): InputView => ({
        id: input.id,
        label: input.label,
        type: input.type,
        maxLength: input.type === 'text' ? (input.maxLength ?? 40) : null,
        min: input.min ?? null,
        max: input.max ?? null,
        options: input.options ?? [],
        value: state.kv[input.key ?? input.id] ?? null,
      })),
  }),
})
