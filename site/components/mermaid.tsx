'use client'
// A Mermaid diagram, drawn in the browser. The docs are a static export, so
// nothing renders on a server: the first paint has no diagram, then the
// `mermaid` package loads and draws it for the current theme, and draws it
// again when the theme changes. Follows the Fumadocs Mermaid guide.
import { useTheme } from 'next-themes'
import { Suspense, use, useEffect, useId, useState } from 'react'

export function Mermaid({ chart }: { chart: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  // Its own boundary, so the rest of the page stays on screen while mermaid loads.
  return (
    <Suspense fallback={null}>
      <MermaidContent chart={chart} />
    </Suspense>
  )
}

const cache = new Map<string, Promise<unknown>>()

function cachePromise<T>(key: string, make: () => Promise<T>): Promise<T> {
  let promise = cache.get(key) as Promise<T> | undefined
  if (!promise) {
    promise = make()
    cache.set(key, promise)
  }
  return promise
}

function MermaidContent({ chart }: { chart: string }) {
  // Mermaid uses the id in CSS selectors, so keep it to plain characters.
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  const { resolvedTheme } = useTheme()
  const theme = resolvedTheme === 'dark' ? 'dark' : 'default'
  const { default: mermaid } = use(cachePromise('mermaid', () => import('mermaid')))

  const { svg } = use(
    cachePromise(`${theme}:${chart}`, () => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        fontFamily: 'inherit',
        themeCSS: 'margin: 1.5rem auto 0;',
        // Mermaid 12 wraps a node's text at 120px. The diagrams break their own lines with <br/>.
        flowchart: { wrappingWidth: 300 },
        theme,
      })
      return mermaid.render(`${id}-${theme}`, chart)
    }),
  )

  return <div className="not-prose my-6 flex justify-center overflow-x-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
}
