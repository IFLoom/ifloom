import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './global.css'

export const metadata: Metadata = {
  title: { default: 'IFLoom', template: '%s | IFLoom' },
  description: 'An interactive fiction engine for TypeScript: linear novels, management games and life sims on one core.',
  metadataBase: new URL('https://ifloom.dev'),
  // Public but not indexed until the engine is published.
  // TODO(launch): remove, with app/robots.ts and the X-Robots-Tag header in next.config.mjs.
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The site is dark only. The class is here from the first paint; the docs'
    // provider forces the same theme, so it never changes.
    <html lang="en-GB" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  )
}
