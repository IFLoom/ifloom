// The React UI's theme presets as plain stylesheets, at /ifloom/editor/preview/themes/<name>.css.
// The preview links the one the author picks, so only that one applies.
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const dynamic = 'force-static'

const PRESETS = ['paper', 'terminal', 'studio', 'storybook']

export function generateStaticParams() {
  return PRESETS.map((name) => ({ name: `${name}.css` }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const preset = name.replace(/\.css$/, '')
  if (!PRESETS.includes(preset)) return new Response('Not found', { status: 404 })
  // The build runs in site/, beside the packages.
  const css = await readFile(path.join(process.cwd(), '..', 'packages', 'react', 'src', 'themes', `${preset}.css`), 'utf8')
  return new Response(css, { headers: { 'Content-Type': 'text/css; charset=utf-8' } })
}
