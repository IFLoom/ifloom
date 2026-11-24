/**
 * Inputs: what the player types or picks, each written to a key in the kv store. The
 * engine checks the value against the declaration, so a UI can't put
 * anything else in.
 */
import { stringOf } from '../strings.ts'
import type { Game } from '../game.ts'
import type { Condition, KvValue, GameState } from '../types.ts'
import { byId, defineFeature, listWords, mergedById, type FeatureContext } from './feature.ts'

/**
 * An input the game declares in `inputs`, a field the player fills in, such as a pet's name. The `input` command writes
 * its value to a kv key and refuses one the declaration doesn't allow.
 */
export type InputDef = {
  /** The input's id, which the `input` command names. */
  id: string
  /** The input's label, the name of the field the player fills in. */
  label: string
  /** The input's type, `text` (typed words), `number` or `choice` (one of `options`). */
  type: 'text' | 'number' | 'choice'
  /** The kv key the input writes. The input's id if left out. */
  key?: string
  /** The input's condition. The input is on offer only while it holds. */
  when?: Condition
  /** The most characters a `text` input takes, after trimming. 40 if left out. */
  maxLength?: number
  /** The lowest number a `number` input takes, included. No bound if left out. */
  min?: number
  /** The highest number a `number` input takes, included. No bound if left out. */
  max?: number
  /** The values a `choice` input offers, each with the label the player reads. */
  options?: { value: KvValue; label: string }[]
}

/** An input as the player sees it, in `view.inputs`. Only inputs whose `when` holds are listed. */
export type InputView = {
  /** The input's id, which the `input` command names. */
  id: string
  /** The input's label, the name of the field. */
  label: string
  /** The input's type, `text`, `number` or `choice`. */
  type: InputDef['type']
  /** The most characters a `text` input takes, after trimming, 40 unless the input sets it. Null for a number or a choice. */
  maxLength: number | null
  /** The lowest number the input takes. Null with no bound, and for text or a choice. */
  min: number | null
  /** The highest number the input takes. Null with no bound, and for text or a choice. */
  max: number | null
  /** The values a `choice` input offers, each with its label. Empty for text or a number. */
  options: { value: KvValue; label: string }[]
  /** The value the input's kv key holds now. Null when it's unset. */
  value: KvValue | null
}

/** The inputs feature's command, content key, view and reference, as types. */
export type InputsShape = {
  commands: {
    /** A command that writes the value `to` to the input's kv key. A button leaves `to` out, and the UI asks the player for it. */
    input: { type: 'input'; id: string; to?: KvValue }
  }
  game: {
    /** The game's inputs, the fields the player fills in, each writing a kv key. */
    inputs?: InputDef[]
  }
  pack: {
    /** The pack's inputs, merged by id over the content's. */
    inputs?: InputDef[]
  }
  view: {
    /** The inputs on offer now, in the order the game declares them, each with its value. */
    inputs: InputView[]
  }
  lists: 'input'
  references: {
    /** A reference to an input by id. */
    input: { input: string }
  }
}

/** Returns the input the game declares with this id. Undefined when there's none. */
export function inputOf(game: Game, id: string): InputDef | undefined {
  return game.inputs?.find((entry) => entry.id === id)
}

/** Returns the value the `input` command writes for an input. Text is trimmed, and other values are kept as they are. */
export function inputValue(input: InputDef, value: KvValue): KvValue {
  return input.type === 'text' && typeof value === 'string' ? value.trim() : value
}

/** Returns the reason the player reads when this value can't be entered now. Undefined when it can. */
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

/** The inputs feature, which checks the player's values and writes them to the kv store. */
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
  content: { inputs: { declares: byId('input'), words: listWords('inputs', 'input', { label: true, options: [{ label: true }] }) } },
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
