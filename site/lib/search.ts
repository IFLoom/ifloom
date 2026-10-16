import { createFromSource } from 'fumadocs-core/search/server'
import { source, versionOf } from './source.ts'

/**
 * The docs' search server, behind /api/search and the MCP `search` tool. Each
 * page is tagged with its version, so the search box looks only at the docs
 * being read.
 */
export const searchServer = createFromSource(source, {
  language: 'english',
  buildIndex: (page) => ({
    title: page.data.title,
    description: page.data.description,
    url: page.url,
    id: page.url,
    structuredData: page.data.structuredData,
    tag: versionOf(page),
  }),
})
