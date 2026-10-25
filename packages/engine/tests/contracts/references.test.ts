import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Command, Condition, ConditionKey, EffectKey } from '../../src/types.ts'
import { COMMAND_TYPES, CONDITION_KEYS, EFFECT_KEYS, TABLES } from '../../src/core.ts'

/**
 * Every kind of condition, effect and command has an entry that says what it
 * names, so the content checker can't forget what a new one names. The
 * entries are typed complete (core.ts, `TABLES`), so a gap fails to compile;
 * this holds the lists to the type unions, and the entries to the lists.
 */
describe('the reference table', () => {
  it('covers every condition, effect and command kind the types declare', () => {
    expectTypeOf<(typeof EFFECT_KEYS)[number]>().toEqualTypeOf<EffectKey>()
    expectTypeOf<(typeof COMMAND_TYPES)[number]>().toEqualTypeOf<Command['type']>()
    expectTypeOf<(typeof CONDITION_KEYS)[number]>().toEqualTypeOf<ConditionKey>()
    // Every condition but a plugin's short call has a key from the list.
    type Uncovered<C> = C extends unknown ? (keyof C extends `${string}/${string}` ? never : Extract<keyof C, ConditionKey> extends never ? C : never) : never
    expectTypeOf<Uncovered<Condition>>().toBeNever()
  })

  it('has one entry for each kind, each saying what it names', () => {
    for (const table of [TABLES.conditions, TABLES.effects, TABLES.commands]) {
      for (const entry of Object.values(table)) expect(typeof entry.references).toBe('function')
    }
    expect(Object.keys(TABLES.conditions).sort()).toEqual([...CONDITION_KEYS].sort())
    expect(Object.keys(TABLES.effects).sort()).toEqual([...EFFECT_KEYS].sort())
    expect(Object.keys(TABLES.commands).sort()).toEqual([...COMMAND_TYPES].sort())
  })
})
