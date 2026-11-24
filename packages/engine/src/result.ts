/**
 * The answer of a call that can fail in a way its caller should expect, such as a save that won't read. A function
 * that returns a `Result` never throws for those failures.
 *
 * `ok` tells success from failure. On success `value` holds the answer. On failure `reason` says why, in words a
 * player can read, and `cause` holds the error behind it when one was thrown (a save driver's, say), for a log.
 */
export type Result<T> = { ok: true; value: T; reason?: never; cause?: never } | { ok: false; reason: string; cause?: unknown; value?: never }

/** Returns a successful `Result` that holds `value`. */
export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

/** Returns a failed `Result` with its `reason`, and the error behind it as `cause` when one was thrown. */
export function fail<T = never>(reason: string, cause?: unknown): Result<T> {
  return cause === undefined ? { ok: false, reason } : { ok: false, reason, cause }
}
