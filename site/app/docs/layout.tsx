import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'
import { Provider } from '@/components/provider'
import { baseOptions } from '@/lib/layout.shared'
import { source } from '@/lib/source'
import { layoutTabs } from '@/lib/tabs'

export default function Layout({ children }: { children: ReactNode }) {
  const tree = source.getPageTree()
  return (
    <Provider>
      <DocsLayout tree={tree} tabs={layoutTabs(tree)} {...baseOptions()}>
        {children}
      </DocsLayout>
    </Provider>
  )
}
