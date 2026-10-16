import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './global.css'

export const metadata: Metadata = {
  title: { default: 'IFLoom', template: '%s | IFLoom' },
  description: 'An interactive fiction engine for TypeScript: linear novels, management games and life sims on one core.',
  metadataBase: new URL('https://ifloom.dev'),
  // Public but not indexed until the engine is published.
  // TODO(launch): remove, with app/robots.ts and the X-Robots-Tag header in next.config.mjs. See ROADMAP "Release readiness".
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  )
}
