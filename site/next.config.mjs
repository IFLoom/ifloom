import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

const PLUGINS = ['achievements', 'calendar', 'cast', 'debug', 'devices', 'effects', 'feed', 'generators', 'jobs', 'messages', 'places', 'quests', 'shop', 'wardrobe']

/** @type {import('next').NextConfig} */
const config = {
  // A static site for GitHub Pages, served from https://ifloom.github.io/ifloom/.
  output: 'export',
  basePath: '/ifloom',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  // The editor uses the engine, the React UI and the plugins straight from the workspace, as TypeScript.
  transpilePackages: ['@ifloom/engine', '@ifloom/react', '@ifloom/audio', ...PLUGINS.map((name) => `@ifloom/plugin-${name}`)],
}

export default withMDX(config)
