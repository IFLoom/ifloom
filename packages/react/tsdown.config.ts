import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { define } from '../../tsdown.base.ts'

const tailwind = join(dirname(createRequire(import.meta.url).resolve('@tailwindcss/cli/package.json')), 'dist/index.mjs')

/** The stylesheets for a game without Tailwind: the whole UI, and each preset, built and minified. */
function css(input: string, output: string) {
  // Quiet unless it fails: the error, with Tailwind's output, says why.
  execFileSync(process.execPath, [tailwind, '--cwd', 'src', '-i', input, '-o', `../dist/${output}`, '--minify'], { stdio: 'pipe' })
}

export default define(['src/index.ts', 'src/kit.ts'], {
  platform: 'browser',
  hooks: {
    'build:done': () => {
      css('styles.css', 'styles.min.css')
      for (const preset of readdirSync('src/themes').filter((file) => file.endsWith('.css'))) {
        css(`themes/${preset}`, `themes/${preset.replace(/\.css$/, '.min.css')}`)
      }
    },
  },
})
