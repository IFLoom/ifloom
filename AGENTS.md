# IFLoom

An interactive fiction engine for any shape of game: a linear novel, a
management game a week at a time, a social sim with a calendar, places and
characters on their own schedules. The core keeps turns, scenes, stats and
entities; plugins add the rest. Games compile to a static folder that opens
from disk. Pre-release; nothing here is a stable API yet.

## Packages

| Package | What |
|---|---|
| `packages/engine` (`@ifloom/engine`) | State, commands, scenes, conditions, effects, saves, the plugin API. Pure TypeScript, no DOM. |
| `packages/plugin-calendar` (`@ifloom/plugin-calendar`) | The periods of a day, the days of a week, sleep and a curfew, and what a turn is: a period, a day or a week. |
| `packages/plugin-places` (`@ifloom/plugin-places`) | Locations with exits and things to do, travel between them, and where the player is. Locations are content: `data.places.locations`. |
| `packages/plugin-cast` (`@ifloom/plugin-cast`) | Characters with schedules, who is in the room, talking and calling; each character an entity, so relationships are stats the game declares. Characters are content: `data.cast.characters`. |
| `packages/plugin-quests` (`@ifloom/plugin-quests`) | Quests: stages done by conditions, progress that is never taken back, tracking and news. |
| `packages/plugin-wardrobe` (`@ifloom/plugin-wardrobe`) | Slots the game declares, clothes that go in them, and what the player has on. |
| `packages/plugin-messages` (`@ifloom/plugin-messages`) | Channels and threads of messages that arrive when the story allows; replies are choices. |
| `packages/plugin-feed` (`@ifloom/plugin-feed`) | Feeds of posts that appear when the story allows, the player's own posts, likes and comments. |
| `packages/plugin-devices` (`@ifloom/plugin-devices`) | Devices with apps built from sections; opening one is free and doesn't leave the room. |
| `packages/phone` (`@ifloom/phone`) | A bundle, not a plugin: `phone()` wires devices, messages and feed into a smartphone. |
| `packages/plugin-debug` (`@ifloom/plugin-debug`) | Debug commands that ignore locks; left out of release builds. |
| `packages/audio` (`@ifloom/audio`) | The audio player: `startAudio(runner)` plays `view.audio` in the browser with plain `HTMLAudioElement`s. Imports only the engine; any UI can use it. |
| `packages/react` (`@ifloom/react`) | The React UI: React and shadcn/ui (Radix, Tailwind v4), and `mountGame`. Reads plugins' views by shape and depends on no plugin. One UI among possible others: nothing else depends on it. |
| `packages/cli` (`@ifloom/cli`) | `ifloom new`, `dev`, `build`, `check`, `playtest`, `snapshot`, and the Vite preset `@ifloom/cli/vite`. Owns the build tools (Vite, Tailwind, the plugins) as dependencies, so a game lists only `@ifloom/*`. Templates in `templates/`; `ifloom new` also copies the examples. |
| `examples/showcase` | Small Town: the game that uses every feature. Its tests play it; the docs point at its source. |
| `examples/novel` | The Letter: a linear novel with no plugins, places or clock, the smallest shape of game. |
| `games/` | Not in git: users' own games, made by `npm run new -- <name>`, as workspaces of the checkout. |
| `examples/cafe` | The Corner Café: a management game a week at a time, with staff and dishes as entities. |

A first-party plugin is a package of its own that imports only `@ifloom/engine` (its `tests/contracts/boundary.test.ts` holds it to that) and requires no other plugin. It may work with others when the game has them, by name only: it lists them in `cooperates` and asks them through conditions, effects and `query`. It is documented under `docs/plugins/`, and a docs contract fails on any export the page does not name.

`packages/engine/tests/fixtures/` holds a small town game with no story; engine tests run against it. The showcase is `examples/showcase`.

## Rules the engine keeps

- **Deterministic.** Every draw goes through `random.ts`, hashed from the save's seed, the turn and a name. Same save, same cards.
- **Nothing loads at runtime.** Everything a game needs is bundled when it is built, because a game opened from disk can fetch nothing. `tests/contracts/boundary.test.ts` enforces it.
- **No genre, no game.** The engine knows no stat, phase, place or person by name; a game declares them and supplies its own logic through `pack.rules`. Examples, comments and docs use everyday, neutral fiction.
- **Standalone.** The engine imports nothing outside its own folder.
- **Framework-neutral.** The engine and plugins import no UI framework; React lives only in `@ifloom/react`, and the Vite preset adds React and Tailwind only for games that depend on them. The `vanilla` template proves a game runs without React.

## Words

Author-facing words, used in docs and new API: scene, choice, action, location, character, storyline, stage, stat, variable, requires, effects, cost, once/cooldown, turn, kind, entity, trigger, lock, variants, block, tag, item, save, mod. Developer words: plugin, pack, hook, panel, view, state slice, snapshot, content checker (`checkGame`, the one walk that checks a game's content and lists the files it names). The code uses these words too (storyline, character, `View`, `Game`, `Pack`, stages, blocks, variants); `docs/guide/status.md` lists the few renames still to come.

Decisions a future review must not re-open are in `docs/adr/`.

## Docs

Anything the engine exports is documented in `docs/` (VitePress, published at https://ifloom.github.io/ifloom/). A change to the exports ships with its docs: load the `ifloom-docs` skill.

## Verify

```bash
npm test             # engine tests, boundary rules, docs coverage
npm run typecheck    # strict
npm run lint
npm run docs:build   # fails on dead links
```

`ROADMAP.md` is the order of work and the list of known problems; read it
before starting a step, and update it when one lands.

The first game built on the engine (a separate private repo) is frozen and is
not kept building against later engine changes; it is refactored onto the
engine once the roadmap's core steps are done.
