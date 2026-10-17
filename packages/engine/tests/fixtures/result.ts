import type { Result } from '../../src/index.ts'

/** A result's value; a failure fails the test with its reason. */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`expected ok, got: ${result.reason}`)
  return result.value
}
