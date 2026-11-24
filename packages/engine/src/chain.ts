/**
 * The one runner for every upgrade chain. Internal.
 *
 * It runs a save's `STEPS` with the plugins' and the game's save `migrations`, `PACK_STEPS` with each plugin's
 * `contentMigrations`, and `COMMAND_STEPS` with each plugin's `commandMigrations`. Each chain keys its steps by the
 * version they upgrade from, and says what a version with no step means.
 */

/**
 * The rule a chain follows at a version with no step. With `carry` the value goes on unchanged, and with `refuse`
 * the chain stops there.
 */
export type Gap = 'carry' | 'refuse'

/** A chain of upgrade steps, run from version `from` up to version `to`. */
export type Chain<T> = {
  /** The chain's starting version, the one the value has now. */
  from: number
  /** The chain's last version, the one the value ends at. */
  to: number
  /** The chain's step that upgrades a value from `version` to the next, or undefined when it has none. */
  step: (version: number) => ((value: T) => T) | undefined
  /** The chain's rule at a version with no step. */
  gap: Gap
  /** The chain's stamp, which writes each version passed onto the value, such as a pack's schema number. */
  stamp?: (value: T, version: number) => T
}

/** The result of {@link runChain}, the upgraded value or the chain and version that refused a gap. */
export type ChainRun<T> =
  | { ok: true; value: T; /** The run's moved mark, true when any chain passed a version. */ moved: boolean }
  | { ok: false; /** The chain that refused a gap, at `version`, the version it had no step from. */ chain: Chain<T>; version: number }

/**
 * Returns the value run through `main` from its `from` to its `to`, with each chain in `beside` alongside. Returns
 * the refusing chain and version when a `refuse` chain meets a gap.
 *
 * Before the main step from a version runs, each `beside` chain (a plugin's, say) catches up to that version, in the
 * order given. So a step keyed by a version meets the value as the main chain had it then. Once the main chain is
 * done, each `beside` chain runs up to its own `to`.
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

/** Returns the value run through chains that all carry over a gap, as {@link runChain} does. It can't fail. */
export function carryChain<T>(value: T, main: Omit<Chain<T>, 'gap'>, beside: readonly Omit<Chain<T>, 'gap'>[] = []): { value: T; moved: boolean } {
  const carry = (chain: Omit<Chain<T>, 'gap'>): Chain<T> => ({ ...chain, gap: 'carry' })
  const run = runChain(value, carry(main), beside.map(carry))
  if (!run.ok) throw new Error('a chain that carries over gaps refused one')
  return { value: run.value, moved: run.moved }
}
