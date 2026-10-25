import { describe, expect, it } from 'vitest'
import type { Pack } from '../../src/loader.ts'

/**
 * A pack is data only: it comes from outside the game's code (a mod, a JSON
 * export, unlocked content), so nothing in it can be a function. Code is the
 * game's `rules` and its plugins. This fails in `npm run typecheck` when a
 * key of `Pack`, or anything inside one, admits a function.
 */

type Fn = (...args: never[]) => unknown
/** How deep to look: deep enough for a scene's choices' effects' arguments. */
type Deeper = [1, 2, 3, 4, 5, 6, 7, 8]
/** Every path into `T` that ends in a function, as `scenes>choices>run>FN`, down to six levels. */
type FunctionPaths<T, D extends number = 0> = D extends 6
  ? never
  : T extends Fn
    ? 'FN'
    : T extends readonly (infer U)[]
      ? FunctionPaths<U, Deeper[D]>
      : T extends object
        ? { [K in keyof T & string]-?: `${K}>${FunctionPaths<Exclude<T[K], undefined>, Deeper[D]>}` }[keyof T & string]
        : never
type EndsInFunction<S> = S extends `${string}FN` ? S : never

/** `never` while `Pack` is data only; otherwise the paths that aren't, which then fail to be `never`. */
type PackFunctions = EndsInFunction<FunctionPaths<Pack>>
const none: [PackFunctions] extends [never] ? true : PackFunctions = true

describe('a pack', () => {
  it('admits no functions, at any depth the type test looks', () => {
    expect(none).toBe(true)
  })
})
