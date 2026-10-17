/**
 * The build every @ifloom package shares: ES modules, their `.d.ts` with
 * declaration maps, and source maps, in `dist/`. Each package's
 * `tsdown.config.ts` names its entry points. The @ifloom packages a package
 * uses are its peers, so tsdown leaves them (and every other dependency) as
 * imports. Inside this checkout nothing reads `dist/`: the repo's tools take
 * the `ifloom-source` export condition straight to `src/` (ADR 0012).
 */
import { defineConfig, type UserConfig } from 'tsdown'

export function define(entry: string[], options: UserConfig = {}): UserConfig {
  return defineConfig({
    entry,
    format: 'esm',
    platform: 'neutral',
    target: 'es2023',
    // `.js` and `.d.ts`, as the packages are `"type": "module"`.
    fixedExtension: false,
    sourcemap: true,
    dts: { sourcemap: true },
    // Mirror src/, so each module keeps its name in a stack trace and a source map.
    unbundle: true,
    report: false,
    ...options,
  }) as UserConfig
}
