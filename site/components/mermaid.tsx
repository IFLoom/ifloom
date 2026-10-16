'use client'
// A Mermaid diagram, drawn in the browser. The docs are a static export, so
// nothing renders on a server: the first paint has no diagram, then the
// `mermaid` package loads and draws it. The site is dark only, so there is one
// theme: Mermaid's `base` with colours from the site's ember palette.
// Follows the Fumadocs Mermaid guide.
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

// Warm darks for the boxes, the page's ink for text, and ember for edges and accents.
const themeVariables = {
  darkMode: true,
  background: '#0b0908',
  fontSize: '15px',
  primaryColor: '#1c1511',
  primaryTextColor: '#f5efe7',
  primaryBorderColor: '#ff8a3d',
  secondaryColor: '#16110e',
  secondaryTextColor: '#f5efe7',
  secondaryBorderColor: '#a85a2a',
  tertiaryColor: '#120e0c',
  tertiaryTextColor: '#f5efe7',
  tertiaryBorderColor: '#5a3a24',
  lineColor: '#c7895c',
  textColor: '#f5efe7',
  mainBkg: '#1c1511',
  nodeBorder: '#ff8a3d',
  clusterBkg: '#100c0a',
  clusterBorder: '#5a3a24',
  edgeLabelBackground: '#0b0908',
  titleColor: '#ffb46b',
  noteBkgColor: '#2a1a0f',
  noteTextColor: '#f5efe7',
  noteBorderColor: '#ff8a3d',
  actorBkg: '#1c1511',
  actorBorder: '#ff8a3d',
  actorTextColor: '#f5efe7',
  actorLineColor: '#7a6a5c',
  signalColor: '#e9dccd',
  signalTextColor: '#f5efe7',
  labelBoxBkgColor: '#1c1511',
  labelBoxBorderColor: '#ff8a3d',
  labelTextColor: '#f5efe7',
  loopTextColor: '#f5efe7',
  activationBkgColor: '#2a1a0f',
  activationBorderColor: '#ff8a3d',
  sequenceNumberColor: '#1c0f05',
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
  const { default: mermaid } = use(cachePromise('mermaid', () => import('mermaid')))

  const { svg } = use(
    cachePromise(`chart:${chart}`, () => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        fontFamily: 'inherit',
        themeCSS: 'margin: 1.5rem auto 0;',
        // Mermaid 12 wraps a node's text at 120px. The diagrams break their own lines with <br/>.
        flowchart: { wrappingWidth: 300 },
        theme: 'base',
        themeVariables,
      })
      return mermaid.render(id, chart)
    }),
  )

  return <div className="not-prose my-6 flex justify-center overflow-x-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
}
