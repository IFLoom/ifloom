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

Author-facing words, used in docs and new API: scene, choice, action, location, character, storyline, stage, stat, variable, requires, effects, cost, once/cooldown, turn, kind, entity, trigger, lock, variants, block, tag, item, save, mod. Developer words: plugin, pack, hook, panel, view, state slice, snapshot, content checker (`checkGame`, the one walk that checks a game's content and lists the files it names), references (what a condition, effect, command or plugin's content names, from each kind's `references` entry and a plugin's `references`), state intake (`loadState`, the one way a state from outside, such as a save, comes into play: the engine's steps, the plugins' and the game's migrations, then what the game declares; a new game comes from `startingState`, and both read each field's defaults from `FIELDS` in `intake.ts`, which holds the core's fields and each feature's `state`). Feature (a core feature, such as scenes, stats, items, entities or triggers: each one module in `src/features/` that declares its state, kinds, pack key, checks and the references it resolves, view piece, after-command steps, fills and carries; never a plugin, see ADR 0007), `defineFeature` (how a core feature is declared; internal, not exported). `screen` (`screen(state, game)`, one state drawn once: the open scene or the room, its choices with their effects, availability and price, the stage, the plugins' views, and the pool picks and audio they imply; `view` formats it, and the reducer records picks and audio from it). Page, in the React UI only: the title screen and the pages around the game (settings, load, credits, the gate and any a game adds), turned on with the `pages` option. Never call those screens, so `screen` keeps one meaning. The code uses these words too (storyline, character, `View`, `Game`, `Pack`, stages, blocks, variants); `docs/guide/status.md` lists the few renames still to come.

Decisions a future review must not re-open are in `docs/adr/`.

Every user-visible change adds a line to `CHANGELOG.md`, under `[Unreleased]` in Added, Changed, Removed or Fixed. Write it for someone making a game, not as a commit message. The docs show it at `/changelog`.

## Adding to the core

A core kind of condition, effect or command, or a field of the state, belongs to a feature in `packages/engine/src/features/` (ADR 0007). To add one:

1. Add its type to the feature's shape (`SettingsShape`, say) and its entry to the matching table in the feature's `defineFeature`. The public `Condition`, `Effect`, `Command`, `GameState`, `Game`, `Pack` and `View` are built from the shapes, so there's nothing else to edit. A new kind of `Reference` gets its resolver in the feature's `resolve`.
2. For a new feature, write the module with `defineFeature`, then add it to `FEATURES` and its shape to `Shapes` in `features/registry.ts`. Where it goes in `FEATURES` matters: its after-command steps, checks and fills run in that order.
3. Keep the feature a leaf. Import only types, other features, `strings`, `entities`, `notices`, `storylines`, `collections`, `context`, `tier` and `sceneBody`; take everything else (`holds`, `runEffects`, `buildEffects`, `weighted` and the rest) from the `FeatureContext` argument. `tests/contracts/features.test.ts` fails otherwise.
4. A helper the engine exports that needs the core (`activityBlocked`, `lockedBy`, `fireTriggers`, `statValue`) stays in its module outside `features/` (`activity.ts`, `locks.ts`), which binds the core's context and calls the feature's version.
5. `src/core.ts` keeps only the kinds that are no feature's: `all`, `any`, `not`, the custom calls and `start`.

## Docs

Anything the engine exports is documented in `docs/` (VitePress, published at https://ifloom.github.io/ifloom/). A change to the exports ships with its docs: load the `ifloom-docs` skill.

The docs are versioned. The pages under `docs/` are the latest docs, which the version switcher in the nav calls "Latest (pre-release)". Each folder in `docs/versions/` is a released version, served at `/ifloom/<version>/` with its own sidebar and listed in the switcher (`docs/.vitepress/config.ts` finds them). A release keeps a copy of the docs as they were:

1. Run `node scripts/snapshot-docs.ts <version>` (for example `0.1.0`). It copies the docs into `docs/versions/<version>/`, points their links at the copy, and writes the sidebar to `docs/.vitepress/sidebars/versioned/<version>.json`.
2. After the first release, change `latest` in `docs/.vitepress/config.ts` from `'Latest (pre-release)'` to `'Latest'`.
3. Run `npm run docs:build` and commit the snapshot with the release.

Don't edit a snapshot afterwards, except to fix something that was wrong in that release's docs. `llms.txt` covers the latest docs only.

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
