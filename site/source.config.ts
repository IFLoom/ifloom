// Global MDX options for the docs. The collection itself is defined in
// lib/source.ts with the macro API.
import { defineConfig } from 'fumadocs-mdx/config'
import { remarkDirectiveAdmonition } from 'fumadocs-core/mdx-plugins'
import remarkDirective from 'remark-directive'
import rehypeRaw from 'rehype-raw'
import { remarkDropTitle, remarkPlainDirectives } from './lib/remark'

export default defineConfig({
  mdxOptions: {
    // remark-directive gives `:::tip[Title]` and `::include[file]`.
    remarkPlugins: [remarkDirective, remarkDirectiveAdmonition, remarkPlainDirectives, remarkDropTitle],
    // The pages are plain Markdown, so `<details>` is raw HTML. rehype-raw
    // turns it into elements, and leaves MDX's own nodes alone.
    rehypePlugins: (plugins) => [
      [rehypeRaw, { passThrough: ['mdxjsEsm', 'mdxFlowExpression', 'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression'] }],
      ...plugins,
    ],
  },
})
