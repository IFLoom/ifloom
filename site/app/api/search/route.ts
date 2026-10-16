import { createFromSource } from 'fumadocs-core/search/server'
import { source, versionOf } from '@/lib/source'

export const revalidate = false

// A static search index, written to /ifloom/api/search at build time. Each
// page is tagged with its version, so the search box looks only at the docs
// being read.
export const { staticGET: GET } = createFromSource(source, {
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
