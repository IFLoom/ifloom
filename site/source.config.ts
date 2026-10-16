// Global MDX options for the docs. The collection itself is defined in
// lib/source.ts with the macro API.
import { defineConfig } from 'fumadocs-mdx/config'
import { remarkDirectiveAdmonition, remarkMdxMermaid } from 'fumadocs-core/mdx-plugins'
import remarkDirective from 'remark-directive'
import rehypeRaw from 'rehype-raw'
import { remarkDropTitle, remarkPlainDirectives } from './lib/remark'
import { emberTheme } from './lib/shiki-theme'

export default defineConfig({
  mdxOptions: {
    // remark-directive gives `:::tip[Title]` and `::include[file]`.
    // remarkMdxMermaid turns a ```mermaid block into <Mermaid chart="…" />;
    // the page's Markdown (llms.txt, copy as Markdown) keeps the code block.
    remarkPlugins: [remarkDirective, remarkDirectiveAdmonition, remarkPlainDirectives, remarkDropTitle, remarkMdxMermaid],
    // The pages are plain Markdown, so `<details>` is raw HTML. rehype-raw
    // turns it into elements, and leaves MDX's own nodes alone.
    rehypePlugins: (plugins) => [
      [rehypeRaw, { passThrough: ['mdxjsEsm', 'mdxFlowExpression', 'mdxJsxFlowElement', 'mdxJsxTextElement', 'mdxTextExpression'] }],
      ...plugins,
    ],
    // One dark code theme, as the site is dark only. Fumadocs' CSS reads both
    // colour variables, so both name the same theme.
    rehypeCodeOptions: { themes: { light: emberTheme, dark: emberTheme }, defaultColor: false },
  },
})
