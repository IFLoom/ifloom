import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'IFLoom',
  description:
    'An interactive fiction engine where storylines are woven through a living world.',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Reference', link: '/reference/game' },
      { text: 'Plugins', link: '/plugins/' },
      { text: 'UI', link: '/ui/' },
      { text: 'CLI', link: '/cli/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Introduction', link: '/guide/introduction' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Your first game', link: '/guide/first-game' },
            { text: 'Core concepts', link: '/guide/concepts' },
            { text: 'Shapes of game', link: '/guide/shapes' },
            { text: 'Shipping a game', link: '/guide/shipping' },
            { text: 'The showcase', link: '/guide/showcase' },
            { text: 'API status', link: '/guide/status' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'The game',
          items: [
            { text: 'The game', link: '/reference/game' },
            { text: 'Game state', link: '/reference/state' },
            { text: 'Stats', link: '/reference/stats' },
            { text: 'Entities', link: '/reference/entities' },
            { text: 'Scenes', link: '/reference/scenes' },
            { text: 'Prose and markup', link: '/reference/prose' },
            { text: 'Strings', link: '/reference/strings' },
          ],
        },
        {
          text: 'Logic',
          items: [
            { text: 'Commands', link: '/reference/commands' },
            { text: 'Effects', link: '/reference/effects' },
            { text: 'Conditions', link: '/reference/conditions' },
            { text: 'Custom functions', link: '/reference/custom' },
            { text: 'Actions', link: '/reference/actions' },
            { text: 'Locks', link: '/reference/locks' },
            { text: 'Rules and hooks', link: '/reference/rules' },
            { text: 'Plugins', link: '/reference/plugins' },
          ],
        },
        {
          text: 'Running a game',
          items: [
            { text: 'The runner', link: '/reference/runner' },
            { text: 'Saves', link: '/reference/saves' },
            { text: 'Mods', link: '/reference/mods' },
          ],
        },
        {
          text: 'Systems',
          items: [
            { text: 'Storylines', link: '/reference/world' },
            { text: 'Collections', link: '/reference/collections' },
            { text: 'Notices', link: '/reference/notices' },
            { text: 'Triggers', link: '/reference/triggers' },
            { text: 'Inputs', link: '/reference/inputs' },
            { text: 'Progress and limits', link: '/reference/progress' },
            { text: 'Randomness', link: '/reference/random' },
            { text: 'The view', link: '/reference/view' },
            { text: 'Loading and mods', link: '/reference/loader' },
          ],
        },
      ],
      '/plugins/': [
        {
          text: 'First-party plugins',
          items: [
            { text: 'Overview', link: '/plugins/' },
            { text: 'Calendar', link: '/plugins/calendar' },
            { text: 'Places', link: '/plugins/places' },
            { text: 'Cast', link: '/plugins/cast' },
            { text: 'Quests', link: '/plugins/quests' },
            { text: 'Wardrobe', link: '/plugins/wardrobe' },
            { text: 'Messages', link: '/plugins/messages' },
            { text: 'Feed', link: '/plugins/feed' },
            { text: 'Devices', link: '/plugins/devices' },
            { text: 'Debug', link: '/plugins/debug' },
            { text: 'Phone', link: '/plugins/phone' },
          ],
        },
      ],
      '/ui/': [
        {
          text: 'The base UI',
          items: [
            { text: 'Overview', link: '/ui/' },
            { text: 'Components', link: '/ui/components' },
            { text: 'Extending', link: '/ui/extending' },
          ],
        },
      ],
      '/cli/': [
        {
          text: 'The CLI',
          items: [
            { text: 'Overview', link: '/cli/' },
            { text: 'ifloom dev', link: '/cli/#ifloom-dev' },
            { text: 'ifloom build', link: '/cli/#ifloom-build' },
            { text: 'ifloom check', link: '/cli/#ifloom-check' },
            { text: 'The Vite preset', link: '/cli/#the-vite-preset' },
            { text: 'For scripts', link: '/cli/#for-scripts' },
          ],
        },
      ],
    },
    search: { provider: 'local' },
  },
})
