import { createGetUrl } from 'fumadocs-core/source'

export const appName = 'IFLoom'
// Next adds this to links and assets by itself, but not to text we write out,
// such as llms.txt or the search index's address.
export const basePath = '/ifloom'
export const siteUrl = 'https://ifloom.github.io/ifloom'
export const docsRoute = '/docs'
export const docsContentRoute = '/llms.mdx/docs'
export const repoUrl = 'https://github.com/IFLoom/ifloom'

/** What the version dropdown calls the docs in `content/docs/(latest)/`. */
export const latestTitle = 'Latest (pre-release)'

const getContentUrl = createGetUrl(docsContentRoute)

/** Each page as plain Markdown, for agents: `/llms.mdx/docs/<slug>/content.md`. */
export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md']
  return { segments, url: getContentUrl(segments, page.locale) }
}
