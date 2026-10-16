import { HomeLayout } from 'fumadocs-ui/layouts/home'
import type { ReactNode } from 'react'
import { Provider } from '@/components/provider'
import { baseOptions } from '@/lib/layout.shared'

export default function EditorLayout({ children }: { children: ReactNode }) {
  return (
    <Provider>
      <HomeLayout {...baseOptions()}>{children}</HomeLayout>
    </Provider>
  )
}
