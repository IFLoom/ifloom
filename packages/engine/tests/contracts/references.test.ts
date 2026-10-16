import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Command, Condition, ConditionKind, Effect } from '../../src/types.ts'
import { COMMAND_KINDS, CONDITION_KINDS, EFFECT_KINDS, KINDS } from '../../src/core.ts'

/**
 * Every kind of condition, effect and command has an entry that says what it
 * names, so the content checker can't forget what a new one names. The
 * entries are typed complete (core.ts, `KINDS`), so a gap fails to compile;
 * this holds the lists to the type unions, and the entries to the lists.
 */
describe('the reference table', () => {
  it('covers every condition, effect and command kind the types declare', () => {
    expectTypeOf<(typeof EFFECT_KINDS)[number]>().toEqualTypeOf<Effect['kind']>()
    expectTypeOf<(typeof COMMAND_KINDS)[number]>().toEqualTypeOf<Command['type']>()
    expectTypeOf<(typeof CONDITION_KINDS)[number]>().toEqualTypeOf<ConditionKind>()
    // Every condition but a plugin's short call has a key from the list.
    type Uncovered<C> = C extends unknown ? (keyof C extends `${string}/${string}` ? never : Extract<keyof C, ConditionKind> extends never ? C : never) : never
    expectTypeOf<Uncovered<Condition>>().toBeNever()
  })

  it('has one entry for each kind, each saying what it names', () => {
    for (const table of [KINDS.conditions, KINDS.effects, KINDS.commands]) {
      for (const entry of Object.values(table)) expect(typeof entry.references).toBe('function')
    }
    expect(Object.keys(KINDS.conditions).sort()).toEqual([...CONDITION_KINDS].sort())
    expect(Object.keys(KINDS.effects).sort()).toEqual([...EFFECT_KINDS].sort())
    expect(Object.keys(KINDS.commands).sort()).toEqual([...COMMAND_KINDS].sort())
  })
})
