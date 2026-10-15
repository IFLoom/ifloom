/**
 * The Vite setup every IFLoom game builds with: one HTML file with the JS and
 * CSS inside it, its pictures beside it in `art/`. React and Tailwind are added
 * when the game uses them (the React UI does); any other framework's plugin
 * goes in `vite.plugins`.
 *
 *   // vite.config.ts
 *   import { defineConfig } from 'vite'
 *   import { ifloom } from '@ifloom/cli/vite'
 *   export default defineConfig(ifloom())
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export type IfloomViteOptions = {
  /** Put everything in the one HTML file, or leave the JS and CSS beside it. One file if left out. */
  singleFile?: boolean
  /** Add React's Vite plugin. On when the game depends on `@ifloom/react` or `react`, off otherwise. */
  react?: boolean
  /** Add Tailwind's Vite plugin, which the React UI's stylesheet needs. On when the game depends on `@ifloom/react` or `tailwindcss`. */
  tailwind?: boolean
  /** Merged over the preset, for anything else the game needs: another framework's plugin goes in `vite.plugins`. */
  vite?: UserConfig
}

/** The names the game's `package.json` depends on, from `vite.root` or the current folder. */
function dependenciesOf(root: string): Set<string> {
  const file = join(root, 'package.json')
  if (!existsSync(file)) return new Set()
  const pkg = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Record<string, string> | undefined>
  return new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})])
}

export function ifloom(options: IfloomViteOptions = {}): UserConfig {
  const { singleFile = true, vite = {} } = options
  const deps = dependenciesOf(resolve(vite.root ?? process.cwd()))
  const usesReact = options.react ?? (deps.has('@ifloom/react') || deps.has('react'))
  const usesTailwind = options.tailwind ?? (deps.has('@ifloom/react') || deps.has('tailwindcss'))
  return {
    ...vite,
    // Relative paths, so the folder opens from disk or from an itch.io subpath.
    base: './',
    // One React, even when the UI comes from a linked checkout with its own node_modules.
    resolve: { ...vite.resolve, dedupe: [...(usesReact ? ['react', 'react-dom'] : []), ...(vite.resolve?.dedupe ?? [])] },
    plugins: [
      ...(usesReact ? [react()] : []),
      ...(usesTailwind ? [tailwindcss()] : []),
      ...(singleFile ? [viteSingleFile()] : []),
      ...(vite.plugins ?? []),
    ],
  }
}
