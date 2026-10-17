/**
 * Inside the IFLoom checkout, a game reads the @ifloom packages' TypeScript
 * source rather than their built `dist/`: each package's `exports` has an
 * `ifloom-source` condition pointing at `src/`, and this turns it on in Vite
 * for a game whose folder is in the checkout (the examples, `games/*`). A
 * game anywhere else, such as one beside the checkout or one installed from
 * npm, gets the built packages as any user does. See ADR 0012.
 */
import { existsSync } from 'node:fs'
import { relative, resolve, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defaultClientConditions, defaultServerConditions, type Plugin } from 'vite'

/** The export condition that names an @ifloom package's source. */
export const SOURCE_CONDITION = 'ifloom-source'

/** The checkout this CLI runs from (`packages/cli/src` or `dist` in it), or undefined when it was installed. */
function checkoutRoot(): string | undefined {
  const root = fileURLToPath(new URL('../../../', import.meta.url))
  return existsSync(resolve(root, 'packages/engine/src/index.ts')) && existsSync(resolve(root, 'tsdown.base.ts')) ? root : undefined
}

/** Whether a game in `root` is inside the IFLoom checkout, and so reads the packages' source. */
export function inCheckout(root: string, checkout = checkoutRoot()): boolean {
  if (!checkout) return false
  const path = relative(checkout, resolve(root))
  return !path.startsWith('..') && !isAbsolute(path)
}

/** The Vite plugin that resolves @ifloom packages to their source for a game inside the checkout, in the page and in `ifloom check`. */
export function sourcePlugin(): Plugin {
  return {
    name: 'ifloom:source',
    config(config) {
      if (!inCheckout(config.root ?? process.cwd())) return
      return {
        resolve: { conditions: [SOURCE_CONDITION, ...defaultClientConditions] },
        ssr: { resolve: { conditions: [SOURCE_CONDITION, ...defaultServerConditions] } },
      }
    },
  }
}

/**
 * How Vite loads a game's `vite.config.ts`. Inside the checkout Node imports
 * it itself (`native`), so its `@ifloom/cli/vite` import takes the source
 * condition that the checkout's `.npmrc` gives Node; Vite's own config bundler
 * knows no custom condition and would look in `dist/`. Elsewhere, Vite's default.
 */
export function configLoader(root = process.cwd()): 'native' | undefined {
  return inCheckout(root) ? 'native' : undefined
}
