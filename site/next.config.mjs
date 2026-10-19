import { readdirSync } from 'node:fs'
import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** Docs pages that moved, old path to new, each redirected as a page and as its Markdown under /llms.mdx/. */
const MOVED = {
  // The timed-effects plugin became the statuses plugin.
  'plugins/effects': 'plugins/statuses',
  // The how-to pages left the guide for Recipes.
  'guide/title-screen': 'recipes/title-screen',
  'guide/hud': 'recipes/hud',
  'guide/plugin-ui': 'recipes/plugin-ui',
  'guide/minigames': 'recipes/minigames',
  'guide/transitions': 'recipes/transitions',
  'guide/inline-actions': 'recipes/inline-actions',
  // The browser packages left the engine's reference.
  'reference/browser': 'browser',
  'reference/audio-player': 'browser/audio-player',
  // Collections became things the player holds, entities like any other.
  'reference/collections': 'reference/entities',
  // Transitions and reveals left the engine for the React UI's presentation hints.
  'reference/transitions': 'react/hints',
}

/**
 * The site reads the @ifloom packages' TypeScript source, as everything in the
 * checkout does (ADR 0012). Turbopack has no setting for export conditions, so
 * each package's entry is aliased to its src/index.ts, which Next compiles.
 */
const PACKAGES = readdirSync(new URL('../packages', import.meta.url)).filter((name) => name !== 'cli')

/** @type {import('next').NextConfig} */
const config = {
  // Served by Vercel at https://ifloom.dev, with server routes for search and MCP.
  reactStrictMode: true,
  // The repo has its own AGENTS.md; stop `next dev` writing another into site/.
  agentRules: false,
  // Each page-rendering worker takes most of a gigabyte, so a machine with many
  // cores and little memory runs out with one per core. Four is plenty.
  experimental: { cpus: 4 },
  // The editor uses the engine, the React UI and the plugins straight from the workspace, as TypeScript.
  transpilePackages: PACKAGES.map((name) => `@ifloom/${name}`),
  turbopack: { resolveAlias: Object.fromEntries(PACKAGES.map((name) => [`@ifloom/${name}`, `../packages/${name}/src/index.ts`])) },
  // `npm run build:lean` builds with webpack, which compiles in well under half the
  // memory Turbopack takes (about 6 GB against 15), so the checkout's own checks
  // fit a small machine. It reads the packages' source through their export condition.
  webpack(config) {
    config.resolve.conditionNames = ['ifloom-source', '...']
    return config
  },
  // TODO(launch): remove, with app/robots.ts and metadata.robots in app/layout.tsx. See ROADMAP "Release readiness".
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
  },
  // Pages that moved, so old links still land.
  async redirects() {
    return Object.entries(MOVED).flatMap(([from, to]) => [
      { source: `/docs/${from}`, destination: `/docs/${to}`, permanent: true },
      // A page's Markdown is at /llms.mdx/docs/<page>/content.md.
      { source: `/llms.mdx/docs/${from}/:rest*`, destination: `/llms.mdx/docs/${to}/:rest*`, permanent: true },
    ])
  },
}

export default withMDX(config)
