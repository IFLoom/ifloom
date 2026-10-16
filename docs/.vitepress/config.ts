import { fileURLToPath } from 'node:url'
import llmstxt from 'vitepress-plugin-llms'
import defineVersionedConfig from 'vitepress-versioning-plugin'
import { sidebar } from './sidebar'

// Released docs are snapshots in docs/versions/<version>/ (see
// scripts/snapshot-docs.ts). The plugin serves each at /<version>/ with its own
// sidebar and fills the version switcher in the nav.
export default defineVersionedConfig({
  title: 'IFLoom',
  description: 'An interactive fiction engine for TypeScript: linear novels, management games and life sims on one core.',
  base: '/ifloom/',
  cleanUrls: true,
  // Decision records are for contributors, not the site.
  srcExclude: ['adr/**'],
  // llms.txt describes the latest docs only, not the snapshots.
  vite: { plugins: [llmstxt({ ignoreFiles: ['versions/**'] })] },
  lastUpdated: true,
  // One locale, declared so the versioning plugin builds each snapshot's
  // sidebar: it only does that per locale.
  locales: { root: { label: 'English', lang: 'en-GB' } },
  versioning: {
    // The name the switcher gives the docs at the root. Set it to the
    // release's version when you snapshot one.
    latestVersion: 'Latest (pre-release)',
  },
  themeConfig: {
    versionSwitcher: false,
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Reference', link: '/reference/game' },
      { text: 'Plugins', link: '/plugins/' },
      { text: 'React UI', link: '/react/' },
      { text: 'CLI', link: '/cli/' },
      { text: 'Changelog', link: '/changelog' },
      { component: 'VersionSwitcher' },
    ],
    sidebar,
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/IFLoom/ifloom' }],
    editLink: { pattern: 'https://github.com/IFLoom/ifloom/edit/main/docs/:path' },
  },
}, fileURLToPath(new URL('.', import.meta.url)))
