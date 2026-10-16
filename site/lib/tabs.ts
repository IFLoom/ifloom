import type * as PageTree from 'fumadocs-core/page-tree'
import type { LayoutTab } from 'fumadocs-ui/layouts/shared'

function firstPage(folder: PageTree.Folder): string | undefined {
  if (folder.index) return folder.index.url
  for (const child of folder.children) {
    if (child.type === 'page' && !child.external) return child.url
    if (child.type === 'folder') {
      const url = firstPage(child)
      if (url) return url
    }
  }
}

/**
 * The tabs for the sidebar's dropdowns: one for each root folder. Fumadocs
 * makes these itself, but skips a root with no page directly inside it, and
 * a released version holds only the sections' folders. So a tab here links to
 * the first page anywhere in its folder.
 */
export function layoutTabs(tree: PageTree.Root): LayoutTab[] {
  const tabs: LayoutTab[] = []
  const visit = (node: PageTree.Root | PageTree.Folder) => {
    if ('root' in node && node.root) {
      const url = firstPage(node)
      if (url) tabs.push({ title: node.name, description: node.description, icon: node.icon, url, $folder: node })
    }
    for (const child of node.children) if (child.type === 'folder') visit(child)
  }
  visit(tree)
  return tabs
}
