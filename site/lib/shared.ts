import { createGetUrl } from 'fumadocs-core/source'

export const appName = 'IFLoom'
export const description = 'An interactive fiction engine for TypeScript: linear novels, management games and life sims on one core.'
export const siteUrl = 'https://ifloom.dev'
export const docsRoute = '/docs'
export const docsContentRoute = '/llms.mdx/docs'
export const repoUrl = 'https://github.com/IFLoom/ifloom'

/** What the version dropdown calls the docs in `content/docs/(latest)/`. */
export const latestTitle = 'Latest'

const getContentUrl = createGetUrl(docsContentRoute)

/** Each page as plain Markdown, for agents: `/llms.mdx/docs/<slug>/content.md`. */
export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md']
  return { segments, url: getContentUrl(segments, page.locale) }
}
