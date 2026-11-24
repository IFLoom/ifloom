/**
 * One runner for every upgrade chain: a save's `STEPS`, a plugin's and the
 * game's save `migrations`, `PACK_STEPS` with each plugin's
 * `contentMigrations`, and `COMMAND_STEPS` with each plugin's
 * `commandMigrations`. Each chain's steps are keyed by the version they
 * upgrade *from*, and each chain says what a version with no step means.
 * Internal.
 */

/**
 * What a version with no step means. `carry`: nothing this chain reshapes
 * changed then, so the value goes on as it is. `refuse`: every version needs
 * a step, and the value can't be carried past a gap.
 */
export type Gap = 'carry' | 'refuse'

/** A chain of steps, from `from` up to `to`. */
export type Chain<T> = {
  from: number
  to: number
  /** The step that upgrades a value from this version to the next, if there is one. */
  step: (version: number) => ((value: T) => T) | undefined
  gap: Gap
  /** What every version passed sets on the value, step or none, such as a pack's schema number. */
  stamp?: (value: T, version: number) => T
}

export type ChainRun<T> =
  | { ok: true; value: T; /** Whether any chain passed a version. */ moved: boolean }
  | { ok: false; /** The chain that refused a gap, and the version it had no step from. */ chain: Chain<T>; version: number }

/**
 * Run `main` from its `from` to its `to`. Each chain in `beside` (a plugin's,
 * say) is brought up to the main chain's version before the main step from
 * that version runs, in the order given, so a step keyed by a version meets
 * the value as the main chain had it then; once the main chain is done, each
 * runs up to its own `to`. A beside chain whose `to` is lower stops there.
 */
export function runChain<T>(value: T, main: Chain<T>, beside: readonly Chain<T>[] = []): ChainRun<T> {
  const at = beside.map((chain) => chain.from)
  let now = value
  let moved = false
  const advance = (chain: Chain<T>, version: number): boolean => {
    const step = chain.step(version)
    if (!step && chain.gap === 'refuse') return false
    if (step) now = step(now)
    if (chain.stamp) now = chain.stamp(now, version + 1)
    moved = true
    return true
  }
  const catchUp = (upTo: number): ChainRun<T> | undefined => {
    for (const [index, chain] of beside.entries()) {
      const target = Math.min(upTo, chain.to)
      while (at[index] < target) {
        if (!advance(chain, at[index])) return { ok: false, chain, version: at[index] }
        at[index] += 1
      }
    }
    return undefined
  }
  for (let version = main.from; version < main.to; version += 1) {
    const stuck = catchUp(version + 1)
    if (stuck) return stuck
    if (!advance(main, version)) return { ok: false, chain: main, version }
  }
  return catchUp(Infinity) ?? { ok: true, value: now, moved }
}

/** `runChain` for chains that all carry over a gap, which can't fail. */
export function carryChain<T>(value: T, main: Omit<Chain<T>, 'gap'>, beside: readonly Omit<Chain<T>, 'gap'>[] = []): { value: T; moved: boolean } {
  const carry = (chain: Omit<Chain<T>, 'gap'>): Chain<T> => ({ ...chain, gap: 'carry' })
  const run = runChain(value, carry(main), beside.map(carry))
  if (!run.ok) throw new Error('a chain that carries over gaps refused one')
  return { value: run.value, moved: run.moved }
}
