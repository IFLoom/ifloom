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
}

const PLUGINS = ['achievements', 'calendar', 'cast', 'debug', 'devices', 'feed', 'generators', 'jobs', 'messages', 'places', 'quests', 'shop', 'statuses', 'wardrobe']

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
  transpilePackages: ['@ifloom/engine', '@ifloom/react', '@ifloom/audio', ...PLUGINS.map((name) => `@ifloom/plugin-${name}`)],
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
