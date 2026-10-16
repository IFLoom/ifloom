import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  // A static site for GitHub Pages, served from https://ifloom.github.io/ifloom/.
  output: 'export',
  basePath: '/ifloom',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
}

export default withMDX(config)
