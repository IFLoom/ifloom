# IFLoom

An interactive fiction engine for any shape of game. It handles a linear novel
that remembers your choices, a management game played a week at a time, or a
town where characters keep their own schedules.

You write the game in TypeScript and the engine runs it. A finished game builds
to a single `index.html` that opens straight from disk or uploads to itch.io as
it is.

> **Pre-release.** Nothing here is a stable API yet, and the packages are not on
> npm. See the [roadmap](ROADMAP.md).

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
        { id: 'open', effects: [{ kind: 'stat', key: 'courage', by: 1 }, { kind: 'scene', id: 'stairs' }] },
        { id: 'shelf', effects: [{ kind: 'scene', id: 'stairs' }] },
      ],
    },
    {
      id: 'stairs',
      // The engine remembers every choice, so later scenes can ask about it.
      body: [{ text: 'stairs' }, { text: 'stairs/opened', when: { chose: 'mat/open' } }],
      choices: [],
    },
  ],
  prose: {
    mat: 'On the mat is a letter with a name on it that isn’t yours.',
    'mat#open': 'Open it',
    'mat#shelf': 'Put it on the shelf',
    stairs: 'Your neighbour catches you on the landing.',
    'stairs/opened': 'You think of the postcard you found inside.',
  },
}
```

The engine works out what is on screen and which choices are available, and
explains why the others are not. You can draw the screen yourself, or let
`@ifloom/ui` draw it for you in React.

## How it is put together

The **core** handles turns, scenes, stats, variables, entities, storylines,
triggers, inputs and saves. It has no built-in idea of time or place, and no
characters.

**Plugins** add those things when a game needs them. Each plugin is its own
package, and a game includes only the ones it uses. A novel needs no plugins at
all; a life sim might use the calendar, places and cast.

A few guarantees hold for every game:

- **Saves replay exactly.** Randomness is seeded from the save, so loading a
  save and making the same choices gives the same results. Undo, snapshot tests
  and automated playtests all depend on this.
- **Everything is bundled.** A game loads nothing over the network at runtime,
  so it still works when opened from a file.
- **The engine is headless.** It has no DOM and runs the same in a browser, in
  Node or in a test.

## Packages

| Package | What it is |
|---|---|
| `@ifloom/engine` | The core: state, commands, scenes, conditions, effects and saves. |
| `@ifloom/ui` | React components that draw a game's screen, for you to restyle and extend. |
| `@ifloom/cli` | `ifloom dev`, `build`, `check`, `playtest` and `snapshot`. |
| `@ifloom/plugin-calendar` | Days, times of day, weeks, sleep and a curfew. |
| `@ifloom/plugin-places` | Locations with exits, and travel between them. |
| `@ifloom/plugin-cast` | Characters with schedules, conversations, calls and relationship stats. |
| `@ifloom/plugin-quests` | A quest log with progress and hints. |
| `@ifloom/plugin-wardrobe` | Clothing slots and what the player is wearing. |
| `@ifloom/plugin-devices` | Phones, laptops and other in-game devices with their own apps. |
| `@ifloom/plugin-messages` | Message threads whose replies are choices. |
| `@ifloom/plugin-feed` | Social feeds, the player's posts and the reactions to them. |
| `@ifloom/phone` | A ready-made smartphone combining devices, messages and feeds. |
| `@ifloom/plugin-debug` | Commands for testing: set stats, jump to scenes, move time. |

## Examples

| Example | Shape |
|---|---|
| [`examples/novel`](examples/novel) | *The Letter*: a three-chapter linear story with no plugins. |
| [`examples/cafe`](examples/cafe) | *The Corner Café*: a management game played a week at a time. |
| [`examples/showcase`](examples/showcase) | *Small Town*: a life sim that uses every feature. |

Play one in the browser:

```bash
npm install
npm run dev -w @ifloom/example-novel
```

## Documentation

The docs live in [`docs/`](docs). To browse them locally, run
`npm run docs:dev`. Start with the introduction, then *Shapes of game* and
*Your first game*.

## Working on it

Requires Node 22.6 or later.

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run docs:build
```

[AGENTS.md](AGENTS.md) has the conventions the code follows, and
[ROADMAP.md](ROADMAP.md) has what comes next and the known problems.

## Licence

MIT. See [LICENSE](LICENSE).
