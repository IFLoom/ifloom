import { HomeLayout } from 'fumadocs-ui/layouts/home'
import type { ReactNode } from 'react'
import { Provider } from '@/components/provider'
import { baseOptions } from '@/lib/layout.shared'

export default function EditorLayout({ children }: { children: ReactNode }) {
  const base = baseOptions()
  return (
    <Provider>
      <HomeLayout
        {...base}
        links={[
          { text: 'Editor', url: '/editor', active: 'url' },
          { text: 'Snippets', url: '/editor/snippets', active: 'url' },
          { text: 'Docs', url: '/docs/guide/introduction' },
          ...(base.links ?? []),
        ]}
      >
        {children}
      </HomeLayout>
    </Provider>
  )
}
