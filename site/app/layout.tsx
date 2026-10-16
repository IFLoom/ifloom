import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './global.css'

export const metadata: Metadata = {
  title: { default: 'IFLoom', template: '%s | IFLoom' },
  description: 'An interactive fiction engine for TypeScript: linear novels, management games and life sims on one core.',
  metadataBase: new URL('https://ifloom.github.io/ifloom/'),
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  )
}
