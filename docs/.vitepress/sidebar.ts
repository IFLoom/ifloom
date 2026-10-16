import type { DefaultTheme } from 'vitepress'

// The sidebar for the latest docs. A release copies it, as JSON, into
// sidebars/versioned/<version>.json (see scripts/snapshot-docs.ts).
export const sidebar: DefaultTheme.SidebarMulti = {
  '/guide/': [
    {
      text: 'Guide',
      items: [
        { text: 'Introduction', link: '/guide/introduction' },
        { text: 'Installation', link: '/guide/installation' },
        { text: 'Your first story', link: '/guide/first-story' },
        { text: 'Shapes of game', link: '/guide/shapes' },
        { text: 'The title screen and settings', link: '/guide/title-screen' },
        { text: 'Using another framework', link: '/guide/frameworks' },
        { text: 'A game with a world', link: '/guide/first-game' },
        { text: 'Core concepts', link: '/guide/concepts' },
        { text: 'Shipping a game', link: '/guide/shipping' },
        { text: 'The showcase', link: '/guide/showcase' },
        { text: 'Using IFLoom with an AI agent', link: '/guide/agents' },
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
        { text: 'Settings', link: '/reference/settings' },
        { text: 'Entities', link: '/reference/entities' },
        { text: 'Scenes', link: '/reference/scenes' },
        { text: 'Storylets', link: '/reference/storylets' },
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
        { text: 'Activities and buttons', link: '/reference/actions' },
        { text: 'Locks', link: '/reference/locks' },
        { text: 'Rules and hooks', link: '/reference/rules' },
        { text: 'Writing a plugin', link: '/reference/plugins' },
      ],
    },
    {
      text: 'Running a game',
      items: [
        { text: 'The runner', link: '/reference/runner' },
        { text: 'The view', link: '/reference/view' },
        { text: 'Saves', link: '/reference/saves' },
        { text: 'The profile', link: '/reference/profile' },
        { text: 'Packs and loading', link: '/reference/loader' },
        { text: 'Checking content', link: '/reference/checks' },
        { text: 'Mods', link: '/reference/mods' },
      ],
    },
    {
      text: 'Systems',
      items: [
        { text: 'Storylines', link: '/reference/storylines' },
        { text: 'Collections', link: '/reference/collections' },
        { text: 'Notices', link: '/reference/notices' },
        { text: 'Triggers', link: '/reference/triggers' },
        { text: 'Inputs', link: '/reference/inputs' },
        { text: 'Minigames', link: '/reference/minigames' },
        { text: 'Progress and limits', link: '/reference/progress' },
        { text: 'Randomness', link: '/reference/random' },
        { text: 'Audio', link: '/reference/audio' },
        { text: 'The audio player', link: '/reference/audio-player' },
        { text: 'Media', link: '/reference/media' },
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
  '/react/': [
    {
      text: 'The React UI',
      items: [
        { text: 'Overview', link: '/react/' },
        { text: 'Make it your own', link: '/react/customising' },
        { text: 'Components', link: '/react/components' },
        { text: 'Extending', link: '/react/extending' },
      ],
    },
  ],
  '/cli/': [
    {
      text: 'The CLI',
      items: [
        { text: 'Overview', link: '/cli/' },
        { text: 'ifloom new', link: '/cli/#ifloom-new' },
        { text: 'ifloom dev', link: '/cli/#ifloom-dev' },
        { text: 'ifloom build', link: '/cli/#ifloom-build' },
        { text: 'ifloom check', link: '/cli/#ifloom-check' },
        { text: 'ifloom playtest', link: '/cli/#ifloom-playtest' },
        { text: 'ifloom snapshot', link: '/cli/#ifloom-snapshot' },
        { text: 'The Vite preset', link: '/cli/#the-vite-preset' },
        { text: 'For scripts', link: '/cli/#for-scripts' },
      ],
    },
  ],
}
