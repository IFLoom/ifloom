import defaultMdxComponents from 'fumadocs-ui/mdx'
import { CalloutContainer, type CalloutContainerProps } from 'fumadocs-ui/components/callout'
import type { MDXComponents } from 'mdx/types'
import { Mermaid } from '@/components/mermaid'

/** A callout (`:::tip`, `:::warning`) with the class global.css gives the glass look. */
function GlassCallout({ className, ...props }: CalloutContainerProps) {
  return <CalloutContainer className={className ? `ifl-callout ${className}` : 'ifl-callout'} {...props} />
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    CalloutContainer: GlassCallout,
    Mermaid,
    ...components,
  } satisfies MDXComponents
}

export const useMDXComponents = getMDXComponents

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>
}
