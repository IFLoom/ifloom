/**
 * The Vite setup every IFLoom game builds with: one HTML file with the JS and
 * CSS inside it, its pictures beside it in `art/`. It knows no framework: a
 * game adds its own framework's Vite plugin (React, Vue, Svelte) and Tailwind,
 * if it uses them, in `vite.plugins`.
 *
 *   // vite.config.ts
 *   import { ifloom } from '@ifloom/cli/vite'
 *   export default ifloom()
 */
import type { UserConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export type IfloomViteOptions = {
  /** Put everything in the one HTML file, or leave the JS and CSS beside it. One file if left out. */
  singleFile?: boolean
  /** Merged over the preset: the game's framework plugin and anything else it needs go in `vite.plugins`. */
  vite?: UserConfig
}

export function ifloom(options: IfloomViteOptions = {}): UserConfig {
  const { singleFile = true, vite = {} } = options
  return {
    ...vite,
    // Relative paths, so the folder opens from disk or from an itch.io subpath.
    base: './',
    // The game's own plugins first, so the single-file step sees what they made.
    plugins: [...(vite.plugins ?? []), ...(singleFile ? [viteSingleFile()] : [])],
  }
}
