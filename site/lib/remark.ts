import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { PhrasingContent, Root, RootContent, TableRow } from 'mdast'
import type { VFile } from 'vfile'

type Parent = { children: RootContent[] }

/**
 * remark-directive reads `word:name` in prose as a directive. Any text or leaf
 * directive that no other plugin has used goes back to the text it was written
 * as, so a colon in a sentence never makes words vanish.
 */
export function remarkPlainDirectives() {
  return (tree: Root, file: VFile) => {
    const source = String(file.value)
    const original = (node: RootContent) => {
      const { start, end } = node.position ?? {}
      return start?.offset !== undefined && end?.offset !== undefined ? source.slice(start.offset, end.offset) : ''
    }
    const visit = (parent: Parent) => {
      parent.children = parent.children.map((child) => {
        if (child.type === 'textDirective') return { type: 'text', value: original(child) }
        if (child.type === 'leafDirective') return { type: 'paragraph', children: [{ type: 'text', value: original(child) }] }
        if ('children' in child) visit(child as Parent)
        return child
      })
    }
    visit(tree)
  }
}

/**
 * Each page's title comes from its front matter, so a level-one heading in the
 * content is dropped. The changelog page includes CHANGELOG.md, whose own
 * `# Changelog` would otherwise show twice.
 */
export function remarkDropTitle() {
  // CHANGELOG.md comes in as a node of its own, so look below the top level too.
  const drop = (parent: Parent) => {
    parent.children = parent.children.filter((node) => !(node.type === 'heading' && node.depth === 1))
    for (const child of parent.children) if ('children' in child && child.type !== 'heading') drop(child as Parent)
  }
  return (tree: Root) => drop(tree)
}

/** One entry of `content/community-plugins.json`. `packages/engine/tests/contracts/community-plugins.test.ts` holds the file to this shape. */
export type CommunityPlugin = {
  /** What the plugin is called, such as "Weather". */
  name: string
  /** Who wrote it: a name or a handle. */
  author: string
  /** The npm package. */
  npm: string
  /** Its repository, an https URL. */
  repo: string
  /** What it adds, in a sentence. */
  description: string
  /** The `@ifloom/engine` versions it works with, as a semver range such as `^0.1.0`. */
  ifloom: string
}

const text = (value: string): PhrasingContent => ({ type: 'text', value })
const code = (value: string): PhrasingContent => ({ type: 'inlineCode', value })
const link = (url: string, child: PhrasingContent): PhrasingContent => ({ type: 'link', url, children: [child] })
const row = (cells: PhrasingContent[]): TableRow => ({ type: 'tableRow', children: cells.map((cell) => ({ type: 'tableCell', children: [cell] })) })

/**
 * `::community-plugins[../../../community-plugins.json]` becomes a table of the
 * plugins that file lists, or a line saying none are listed yet. The path is
 * relative to the page. The page's Markdown (llms.txt) gets the table too.
 */
export function remarkCommunityPlugins() {
  return (tree: Root, file: VFile) => {
    tree.children = tree.children.map((node): RootContent => {
      if (node.type !== 'leafDirective' || node.name !== 'community-plugins') return node
      const at = node.children.map((child) => ('value' in child ? child.value : '')).join('')
      const path = resolve(dirname(file.path), at)
      const { plugins } = JSON.parse(readFileSync(path, 'utf8')) as { plugins: CommunityPlugin[] }
      if (!plugins.length) {
        return { type: 'paragraph', children: [text('None are listed yet. Yours could be the first: see how listing works below.')] }
      }
      const sorted = [...plugins].sort((a, b) => a.name.localeCompare(b.name))
      return {
        type: 'table',
        align: [null, null, null, null, null],
        children: [
          row([text('Plugin'), text('Package'), text('Author'), text('What it adds'), text('IFLoom')]),
          ...sorted.map((plugin) =>
            row([
              link(plugin.repo, text(plugin.name)),
              link(`https://www.npmjs.com/package/${plugin.npm}`, code(plugin.npm)),
              text(plugin.author),
              text(plugin.description),
              code(plugin.ifloom),
            ]),
          ),
        ],
      }
    })
  }
}
