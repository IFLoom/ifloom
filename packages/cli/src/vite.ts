/**
 * The Vite setup every IFLoom game builds with: one HTML file with the JS and
 * CSS inside it, its pictures beside it in `art/`. It knows no framework: a
 * game adds its own framework's Vite plugin (React, Vue, Svelte) and Tailwind,
 * if it uses them, in `vite.plugins`.
 *
 *   // vite.config.ts
 *   import { ifloom } from '@ifloom/cli/vite'
 *   export default ifloom()
 *
 * Inside the IFLoom checkout it reads the @ifloom packages' source (see
 * `source.ts`). It also encrypts the game's locked content, if it has any in `src/unlocks/`,
 * into the page (see `unlocks.ts`).
 */
import { createServer, type Plugin, type UserConfig, type ViteDevServer } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { configLoader, sourcePlugin } from './source.ts'
import { UNLOCKS_DIR, isLockedModule, lockedFiles, lockedScript } from './unlocks.ts'

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
    plugins: [...(vite.plugins ?? []), sourcePlugin(), unlocksPlugin(), ...(singleFile ? [viteSingleFile()] : [])],
  }
}

/**
 * Locked content in the page: refuses any import of `src/unlocks/` from the
 * page's code, and puts each unlock's packs, encrypted under its code, in the
 * page's head. A build without a code fails; `dev` leaves that unlock out and
 * says so. Nothing happens in a game without `src/unlocks/`.
 */
function unlocksPlugin(): Plugin {
  let root = process.cwd()
  let mode = 'production'
  let building = true
  let server: ViteDevServer | undefined
  return {
    name: 'ifloom:unlocks',
    configResolved(config) {
      root = config.root
      mode = config.mode
      building = config.command === 'build'
    },
    configureServer(dev) {
      server = dev
    },
    load(id, loadOptions) {
      if (!loadOptions?.ssr && isLockedModule(root, id)) {
        this.error(`${id} is locked content (${UNLOCKS_DIR}/), which the page must never import: ifloom build encrypts it into the page instead.`)
      }
      return null
    },
    async transformIndexHtml(html) {
      if (!lockedFiles(root).length) return html
      // The game module and the locked packs are TypeScript: load them as `ifloom check` does.
      const loader =
        server ??
        (await createServer({
          root,
          mode,
          configLoader: configLoader(root),
          server: { middlewareMode: true, hmr: false, watch: null },
          appType: 'custom',
          logLevel: 'error',
        }))
      try {
        const made = await lockedScript({ root, mode, load: (path) => loader.ssrLoadModule(path), strict: building })
        if (made.problems.length) throw new Error(`Locked content:\n  ${made.problems.join('\n  ')}`)
        for (const note of made.notes) console.warn(`[ifloom] ${note}`)
        return made.script ? html.replace(/<head>/i, (head) => `${head}${made.script}`) : html
      } finally {
        if (loader !== server) await loader.close()
      }
    },
  }
}
