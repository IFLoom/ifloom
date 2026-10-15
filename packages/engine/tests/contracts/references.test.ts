import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Command, Effect } from '../../src/types.ts'
import {
  COMMAND_KINDS,
  CONDITION_KINDS,
  EFFECT_KINDS,
  commandKindsComplete,
  commandTable,
  conditionKindsComplete,
  conditionTable,
  effectKindsComplete,
  effectTable,
} from '../../src/references.ts'

/**
 * Every kind of condition, effect and command has an entry in the reference
 * table, so the content checker can't forget what a new one names. The lists
 * are held to the type unions when this compiles, and the tables to the lists
 * when it runs.
 */
describe('the reference table', () => {
  it('covers every condition, effect and command kind the types declare', () => {
    // Each of these is typed `true` only while its list covers its union; a gap fails to compile.
    expect([conditionKindsComplete, effectKindsComplete, commandKindsComplete]).toEqual([true, true, true])
    expectTypeOf<(typeof EFFECT_KINDS)[number]>().toEqualTypeOf<Effect['kind']>()
    expectTypeOf<(typeof COMMAND_KINDS)[number]>().toEqualTypeOf<Command['type']>()
  })

  it('has one entry for each kind, and no others', () => {
    expect(Object.keys(conditionTable).sort()).toEqual([...CONDITION_KINDS].sort())
    expect(Object.keys(effectTable).sort()).toEqual([...EFFECT_KINDS].sort())
    expect(Object.keys(commandTable).sort()).toEqual([...COMMAND_KINDS].sort())
  })
})
