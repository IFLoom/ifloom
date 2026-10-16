import { DocsBody, DocsDescription, DocsPage, DocsTitle, MarkdownCopyButton, PageLastUpdate, ViewOptionsPopover } from 'fumadocs-ui/layouts/docs/page'
import { createRelativeLink } from 'fumadocs-ui/mdx'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMDXComponents } from '@/components/mdx'
import { getPageMarkdownUrl, repoUrl, siteUrl } from '@/lib/shared'
import { source } from '@/lib/source'

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const MDX = page.data.body
  const markdownUrl = getPageMarkdownUrl(page).url

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row items-center gap-2 border-b pb-6">
        <MarkdownCopyButton className="ifl-action" markdownUrl={markdownUrl} />
        {/* The AI links ask the assistant to read the page's Markdown, which reads better than its HTML. */}
        <ViewOptionsPopover className="ifl-action" markdownUrl={markdownUrl} pageUrl={siteUrl + markdownUrl} githubUrl={`${repoUrl}/blob/main/site/content/docs/${page.path}`} />
      </div>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
      {page.data.lastModified && <PageLastUpdate date={page.data.lastModified} />}
    </DocsPage>
  )
}

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()
  return { title: page.data.title, description: page.data.description }
}
