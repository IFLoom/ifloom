import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

const PLUGINS = ['achievements', 'calendar', 'cast', 'debug', 'devices', 'effects', 'feed', 'generators', 'jobs', 'messages', 'places', 'quests', 'shop', 'wardrobe']

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
}

export default withMDX(config)
