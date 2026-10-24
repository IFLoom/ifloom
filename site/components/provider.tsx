'use client'
import { RootProvider } from 'fumadocs-ui/provider/next'
import type { ReactNode } from 'react'
import SearchDialog from '@/components/search'

// The docs are dark only, like the homepage: the theme is
// forced, the system setting is ignored, and the `d` key no longer toggles it.
const theme = { forcedTheme: 'dark', defaultTheme: 'dark', enableSystem: false, hotKey: false } as const

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={theme} search={{ SearchDialog }}>
      {children}
    </RootProvider>
  )
}
