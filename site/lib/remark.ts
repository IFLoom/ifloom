import type { Root, RootContent } from 'mdast'
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
