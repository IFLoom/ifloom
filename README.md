# IFLoom

An interactive fiction engine for any shape of game. It handles a linear novel
that remembers your choices, a management game played a week at a time, or a
town where characters keep their own schedules.

You write the game in TypeScript and the engine runs it. A finished game builds
to a single `index.html` that opens straight from disk or uploads to itch.io as
it is.

> **Pre-release.** Nothing here is a stable API yet, and the packages aren't on
> npm. See the [roadmap](ROADMAP.md).

**Docs:** in [`site/content/docs/`](site/content/docs); run `npm run docs:dev` to
read them in a browser. They're published at https://ifloom.dev/docs, with
[llms.txt](https://ifloom.dev/llms.txt), [llms-full.txt](https://ifloom.dev/llms-full.txt)
and an MCP server at `https://ifloom.dev/api/mcp` for AI agents.

## What a game looks like

A game is plain data: scenes, choices, stats and the text that goes with them.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

export const letter: Pack = {
  id: 'letter',
  schema: SCHEMA,
  stats: [{ id: 'courage', label: 'Courage', start: 1, max: 5 }],
  scenes: [
    {
      id: 'mat',
      body: [{ text: 'mat' }],
      choices: [
        { id: 'open', effects: [{ kind: 'stat', stat: 'courage', by: 1 }, { kind: 'scene', scene: 'stairs' }] },
        { id: 'shelf', effects: [{ kind: 'scene', scene: 'stairs' }] },
      ],
    },
    {
      id: 'stairs',
      // The engine remembers every choice, so later scenes can ask about it.
      body: [{ text: 'stairs' }, { text: 'stairs.opened', when: { chose: 'mat#open' } }],
      choices: [],
    },
  ],
  prose: {
    mat: 'On the mat is a letter with a name on it that isn’t yours.',
    'mat#open': 'Open it',
    'mat#shelf': 'Put it on the shelf',
    stairs: 'Your neighbour catches you on the landing.',
    'stairs.opened': 'You think of the postcard you found inside.',
  },
}
```

The engine works out what is on screen and which choices are available, and
explains why the others are not. You can draw the screen yourself with any
framework, or let `@ifloom/react` draw it for you in React.

## How it is put together

The **core** handles turns, scenes, stats, a kv store, entities, storylines,
triggers, inputs and saves. It has no built-in idea of time or place, and no
characters.

**Plugins** add those things when a game needs them. Each plugin is its own
package, and a game includes only the ones it uses. A novel needs no plugins at
all, and a life sim might use the calendar, places and cast.

A few guarantees hold for every game:

- **Saves replay exactly.** Randomness is seeded from the save, so loading a
  save and making the same choices gives the same results. Undo, snapshot tests
  and automated playtests all depend on this.
- **Everything is bundled.** A game loads nothing over the network at runtime,
  so it still works when opened from a file.
- **The engine is headless.** It has no DOM and no UI framework, and runs the
  same in a browser, in Node or in a test. The React UI is one way to draw a
  game, and the templates also draw one with plain DOM, Vue or Svelte.

## Packages

| Package | What it is |
|---|---|
| `@ifloom/engine` | The core: state, commands, scenes, conditions, effects and saves. |
| `@ifloom/react` | The React UI: components that draw a game's screen, and `mountGame` to start one in a line. It comes with four theme presets, and every part of it can be restyled or replaced. |
| `@ifloom/cli` | `ifloom new`, `dev`, `build`, `check`, `playtest` and `snapshot`, and the Vite preset. |
| `@ifloom/plugin-calendar` | Days, times of day, weeks, sleep and a curfew. |
| `@ifloom/plugin-places` | Locations with exits, and travel between them. |
| `@ifloom/plugin-cast` | Characters with schedules, conversations, calls and relationship stats. |
| `@ifloom/plugin-quests` | A quest log with progress and hints. |
| `@ifloom/plugin-statuses` | Timed statuses that change stats for a few turns. |
| `@ifloom/plugin-achievements` | Achievements, secret ones and progress counts, kept in the player's profile. |
| `@ifloom/plugin-shop` | Vendors, stock, selling back and daily discounts. |
| `@ifloom/plugin-jobs` | Jobs, shifts and wages, promotions and getting fired. |
| `@ifloom/plugin-generators` | Entities made from templates and pools of values, seeded. |
| `@ifloom/plugin-wardrobe` | Clothing slots and what the player is wearing. |
| `@ifloom/plugin-devices` | Phones, laptops and other in-game devices with their own apps. |
| `@ifloom/plugin-messages` | Message threads whose replies are choices. |
| `@ifloom/plugin-feed` | Social feeds, the player's posts and the reactions to them. |
| `@ifloom/phone` | A ready-made smartphone combining devices, messages and feeds. |
| `@ifloom/plugin-cheats` | Cheats for the player, free or kept for supporters, with a log of each use. |
| `@ifloom/plugin-unlocks` | Codes the player enters to unlock cheats and encrypted content. |
| `@ifloom/plugin-debug` | Commands for testing: set stats, jump to scenes, move time. |
| `@ifloom/browser` | Browser helpers for any UI: the minigame clock, keyboard shortcuts and save slots. |
| `@ifloom/audio` | The audio player: plays a game's music and sounds in the browser. |

## Examples

| Example | Shape |
|---|---|
| [`examples/novel`](examples/novel) | *The Letter*: a three-chapter linear story with no plugins. |
| [`examples/cafe`](examples/cafe) | *The Corner Café*: a management game played a week at a time. |
| [`examples/showcase`](examples/showcase) | *Small Town*: a life sim that uses every feature. |

## Getting started

Until the packages are on npm, you work inside a clone of this repo. You'll
need Node 22.18 or later (24 is recommended), because the checkout runs the
packages' TypeScript source. The built packages, which a game beside the
checkout installs with `npm run pack`, run on Node 20.19 or later.

```bash
git clone https://github.com/IFLoom/ifloom.git
cd ifloom
npm install
npm run dev -w @ifloom/example-novel   # play The Letter in your browser
```

To start your own game:

```bash
npm run new -- my-story    # makes games/my-story, which git ignores
npm install
npm run dev -w my-story
```

That gives you a small two-scene game drawn with the React UI. Add
`--template` to start from something else:

| Template | What you get |
|---|---|
| `react` | The default: two scenes, drawn with the React UI. |
| `vanilla` | The same game drawn with plain DOM and no framework. |
| `vue`, `svelte` | The same game drawn with Vue or Svelte. |
| `next` | The same game drawn with the React UI, in a Next.js app. |
| `novel`, `cafe`, `town` | A copy of one of the examples. |

A React game also gets a theme preset (`paper`, `terminal`, `studio` or
`storybook`), picked at random for a `react` game. Choose one with `--theme`:
`npm run new -- my-story --theme paper`.

Your game's `package.json` lists the `@ifloom/*` packages it uses and its UI's
Vite plugins. Vite itself comes with `@ifloom/cli`. The [installation guide](site/content/docs/(latest)/guide/installation.md) also
covers keeping your game in its own folder outside the checkout.

## Documentation

The docs are Markdown pages in [`site/content/docs/`](site/content/docs), and the
website that shows them, with the homepage, is the Next.js app in [`site/`](site).
Run `npm run docs:dev` to browse them locally at http://localhost:3000/. A
good order for a first read is the introduction, *Your first story*, then
*Shapes of game*.

## Working on the engine

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run docs:build   # checks the docs' links, then builds the site
```

[AGENTS.md](AGENTS.md) has the conventions the code follows, and
[ROADMAP.md](ROADMAP.md) has what comes next and the known problems.

## Licence

MIT. See [LICENSE](LICENSE).
