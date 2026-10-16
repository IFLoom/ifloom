import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type DefaultTheme } from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'
import { sidebar } from './sidebar'

// Released docs are snapshots in docs/versions/<version>/, each made by
// scripts/snapshot-docs.ts with its sidebar in sidebars/versioned/<version>.json.
// A snapshot is served at /<version>/ and listed in the version switcher.
const docs = fileURLToPath(new URL('..', import.meta.url))
const versions = existsSync(`${docs}/versions`)
  ? readdirSync(`${docs}/versions`, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  : []

// What the switcher calls the docs at the root.
const latest = 'Latest (pre-release)'

function prefixed(items: DefaultTheme.SidebarItem[], version: string): DefaultTheme.SidebarItem[] {
  return items.map((item) => ({
    ...item,
    ...(item.link?.startsWith('/') ? { link: `/${version}${item.link}` } : {}),
    ...(item.items ? { items: prefixed(item.items, version) } : {}),
  }))
}

const versionSidebars: DefaultTheme.SidebarMulti = {}
for (const version of versions) {
  const saved = JSON.parse(readFileSync(`${docs}/.vitepress/sidebars/versioned/${version}.json`, 'utf8')) as DefaultTheme.SidebarMulti
  for (const [path, items] of Object.entries(saved)) {
    versionSidebars[`/${version}${path}`] = prefixed(items as DefaultTheme.SidebarItem[], version)
  }
}

export default defineConfig({
  title: 'IFLoom',
  description: 'An interactive fiction engine for TypeScript: linear novels, management games and life sims on one core.',
  base: '/ifloom/',
  cleanUrls: true,
  // Decision records are for contributors, not the site.
  srcExclude: ['adr/**'],
  // llms.txt describes the latest docs only, not the snapshots.
  vite: { plugins: [llmstxt({ ignoreFiles: ['versions/**'] })] },
  lastUpdated: true,
  head: [
    // The homepage fades its sections in. This hides them before the first
    // paint, so they don't flash; it does nothing on the docs pages.
    ['script', {}, "if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('ifl-reveal')"],
  ],
  // docs/versions/0.1.0/guide/x.md is served at /0.1.0/guide/x.
  rewrites: { 'versions/:rest*': ':rest*' },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Reference', link: '/reference/game' },
      { text: 'Plugins', link: '/plugins/' },
      { text: 'React UI', link: '/react/' },
      { text: 'CLI', link: '/cli/' },
      { text: 'Changelog', link: '/changelog' },
      { component: 'VersionSwitcher', props: { versions, latest } },
    ],
    sidebar: { ...sidebar, ...versionSidebars },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/IFLoom/ifloom' }],
    editLink: { pattern: 'https://github.com/IFLoom/ifloom/edit/main/docs/:path' },
  },
})
