import defaultMdxComponents from 'fumadocs-ui/mdx'
import { CalloutContainer, type CalloutContainerProps } from 'fumadocs-ui/components/callout'
import { CodeBlockTabs, CodeBlockTabsTrigger } from 'fumadocs-ui/components/codeblock'
import type { ComponentProps } from 'react'
import type { MDXComponents } from 'mdx/types'
import { Mermaid } from '@/components/mermaid'

/** A callout (`:::tip`, `:::warning`) with the class global.css gives the glass look. */
function GlassCallout({ className, ...props }: CalloutContainerProps) {
  return <CalloutContainer className={className ? `ifl-callout ${className}` : 'ifl-callout'} {...props} />
}

const withClass = (name: string, className?: string) => (className ? `${name} ${className}` : name)

/** A group of code tabs, with the class global.css gives the editor look. */
function EditorTabs({ className, ...props }: ComponentProps<typeof CodeBlockTabs>) {
  return <CodeBlockTabs className={withClass('ifl-code-tabs', className)} {...props} />
}

function EditorTab({ className, ...props }: ComponentProps<typeof CodeBlockTabsTrigger>) {
  return <CodeBlockTabsTrigger className={withClass('ifl-code-tab', className)} {...props} />
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    CalloutContainer: GlassCallout,
    CodeBlockTabs: EditorTabs,
    CodeBlockTabsTrigger: EditorTab,
    Mermaid,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
