import type { MetadataRoute } from 'next'

// Public but not indexed until the engine is published.
// TODO(launch): allow crawling, and remove metadata.robots in app/layout.tsx and the
// X-Robots-Tag header in next.config.mjs. See ROADMAP "Release readiness".
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } }
}
