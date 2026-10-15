/**
 * The Vite setup every IFLoom game builds with: React, Tailwind, and one HTML
 * file with the JS and CSS inside it, its pictures beside it in `art/`.
 *
 *   // vite.config.ts
 *   import { defineConfig } from 'vite'
 *   import { ifloom } from '@ifloom/cli/vite'
 *   export default defineConfig(ifloom())
 */
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export type IfloomViteOptions = {
  /** Put everything in the one HTML file, or leave the JS and CSS beside it. One file if left out. */
  singleFile?: boolean
  /** Merged over the preset, for anything else the game needs. */
  vite?: UserConfig
}

export function ifloom(options: IfloomViteOptions = {}): UserConfig {
  const { singleFile = true, vite = {} } = options
  return {
    ...vite,
    // Relative paths, so the folder opens from disk or from an itch.io subpath.
    base: './',
    plugins: [react(), tailwindcss(), ...(singleFile ? [viteSingleFile()] : []), ...(vite.plugins ?? [])],
  }
}
