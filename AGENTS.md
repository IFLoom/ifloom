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
| `packages/plugin-statuses` (`@ifloom/plugin-statuses`) | Timed statuses that last some turns: stat modifiers read through the engine's `statModifiers`, never written, and effects as one starts, each turn and as it ends. Statuses are content: `data.statuses.statuses`. |
| `packages/plugin-achievements` (`@ifloom/plugin-achievements`) | Achievements earned by a condition after each command or by an effect, secret ones, progress counts, and a record in the profile through its `profile` provider. Achievements are content: `data.achievements.achievements`. |
| `packages/plugin-shop` (`@ifloom/plugin-shop`) | Vendors with prices in spendable stats, limited stock and restocking, selling back and seeded daily discounts; opening hours with the calendar, a place with places. Vendors are content: `data.shop.vendors`. |
| `packages/plugin-jobs` (`@ifloom/plugin-jobs`) | Jobs: hiring requirements, shifts that cost stats and time and pay a wage, promotion ladders, missed shifts and firing; shift days and hours with the calendar, a workplace with places. Jobs are content: `data.jobs.jobs`. |
| `packages/plugin-generators` (`@ifloom/plugin-generators`) | Named pools of values and templates that make entities of a kind through `create`, each field from a pool, a range or a fixed value, seeded and replay-exact. Pools and templates are content: `data.generators`. |
| `packages/plugin-wardrobe` (`@ifloom/plugin-wardrobe`) | Slots, clothes that go in them, and what the player has on. Slots and clothes are content: `data.wardrobe.slots`, `data.wardrobe.clothes`. |
| `packages/plugin-messages` (`@ifloom/plugin-messages`) | Channels and threads of messages that arrive when the story allows; replies are choices. Channels and messages are content: `data.messages`. |
| `packages/plugin-feed` (`@ifloom/plugin-feed`) | Feeds of posts that appear when the story allows, the player's own posts, likes and comments. Feeds and posts are content: `data.feed`. |
| `packages/plugin-devices` (`@ifloom/plugin-devices`) | Devices with apps built from sections; opening one is free and doesn't leave the room. Devices and apps are content: `data.devices`. |
| `packages/phone` (`@ifloom/phone`) | A bundle, not a plugin: `phone()` wires devices, messages and feed into a smartphone, and returns the phone as `data`. |
| `packages/plugin-debug` (`@ifloom/plugin-debug`) | Debug commands that ignore locks; left out of release builds. |
| `packages/audio` (`@ifloom/audio`) | The audio player: `startAudio(runner)` plays `view.audio` in the browser with plain `HTMLAudioElement`s. Imports only the engine; any UI can use it. |
| `packages/browser` (`@ifloom/browser`) | Browser helpers in plain DOM for any UI: the minigame clock (`startClock`), keyboard shortcuts (`startKeys`, `startMinigameKeys`), the number for a new save slot (`nextSlot`) and reveal timing. Imports only the engine; the React UI and the templates use it. |
| `packages/react` (`@ifloom/react`) | The React UI: React and shadcn/ui (Radix, Tailwind v4), and `mountGame`. Reads plugins' views by shape and depends on no plugin. One UI among possible others: nothing else depends on it. |
| `packages/cli` (`@ifloom/cli`) | `ifloom new`, `dev`, `build`, `check`, `playtest`, `snapshot`, and the Vite preset `@ifloom/cli/vite`. Owns the build tools (Vite, Tailwind, the plugins) as dependencies, so a game lists only `@ifloom/*`. Templates in `templates/`; `ifloom new` also copies the examples. |
| `examples/showcase` | Small Town: the game that uses every feature. Its tests play it; the docs point at its source. |
| `examples/novel` | The Letter: a linear novel with no plugins, places or clock, the smallest shape of game. |
| `games/` | Not in git: users' own games, made by `npm run new -- <name>`, as workspaces of the checkout. |
| `examples/cafe` | The Corner Café: a management game a week at a time, with staff and dishes as entities. |

A first-party plugin is a package of its own that imports only `@ifloom/engine` (its `tests/contracts/boundary.test.ts` holds it to that) and requires no other plugin. It may work with others when the game has them, by name only: it lists them in `cooperates` and asks them through conditions, effects and `query`. It is documented under `site/content/docs/(latest)/plugins/`, and a docs contract fails on any export the page does not name.

`packages/engine/tests/fixtures/` holds a small town game with no story; engine tests run against it. The showcase is `examples/showcase`.

## Rules the engine keeps

- **Deterministic.** Every draw goes through `random.ts`, hashed from the save's seed, the turn and a name. Same save, same cards.
- **Nothing loads at runtime.** Everything a game needs is bundled when it is built, because a game opened from disk can fetch nothing. `tests/contracts/boundary.test.ts` enforces it.
- **No genre, no game.** The engine knows no stat, phase, place or person by name; a game declares them and supplies its own logic through `pack.rules`. Examples, comments and docs use everyday, neutral fiction.
- **Standalone.** The engine imports nothing outside its own folder.
- **One naming rule for content** (ADR 0008). A condition's or effect's target is named by its noun (`stat`, `item`, `entity`, `storyline`, `scene`; `key` in a kv store), `by` changes a number and `to` sets a value, and a command names its one target `id`. Plugin kinds follow it too. `tests/contracts/naming.test.ts` holds every kind to it.
- **One plugin shape** (ADR 0009). A hook runs at an event and returns the next state, named `onX` (`onTurn`, `onCommand`, and the game's `rules.onTurn`, `rules.onStat`); a provider answers and changes nothing, named by its noun (`guard`, `label`, `view`, `profile`); nothing is nested. A plugin call's short form takes its arguments as an object, `{ 'places/at': { location } }`, and every helper writes it. Values take arguments. Anything a mod could change is content in pack `data`, never a plugin option. `tests/contracts/plugin-shape.test.ts` holds the first-party plugins to it.
- **One separator rule for ids** (ADR 0010). An id is letters, digits, `-` and `_`, in parts joined by `.` (`cafe.counter`, `place.cafe.ava`); `/` names a plugin (`quests/done`, `calendar/period.morning`); `#` is a choice in a scene or a reply (`ch1.mat#open`, in labels, `chose` and `state.chosen`); `:` is a reference with what it is in front (`character:ava`, `mod:naps`, the profile's `core:settings` and `ui:gate`). `tests/contracts/ids.test.ts` holds the examples, the templates and the showcase's plugin content to it.
- **Framework-neutral.** The engine and plugins import no UI framework; React lives only in `@ifloom/react`, and the Vite preset adds React and Tailwind only for games that depend on them. The `vanilla` template proves a game runs without React.

## Words

Author-facing words, used in docs and new API: scene, choice, action, location, character, storyline, stage, stat, kv (the kv store: keys with a true/false, number or text value; never "flags" or "variables"), blocked (why something can be refused: `{ when, reason, hide? }`, refused while `when` holds; never "requires" or "locked"), effects, cost, once/cooldown, turn, kind, entity, trigger, lock, variants, block, tag, item, save, mod. Developer words: plugin, pack, hook (a plugin's or the game's `onX`, run at an event, returning the next state), provider (a plugin member that answers a question and changes nothing, named by its noun: `guard`, `price`, `label`, `stage`, `view`, `profile`), options (a plugin factory's settings, code a mod can't change; content goes in `data`), panel (a game's own UI component, named in `panels`; the React UI's built-in boxes are cards: `LocationCard`, `DebugCard`), view, state slice, snapshot, content checker (`checkGame`, the one walk that checks a game's content and lists the files it names), references (what a condition, effect, command or plugin's content names, from each kind's `references` entry and a plugin's `references`), content migrations (`upgradePack` in `upgrade.ts`, the one way a pack written for an older `SCHEMA` comes in: its `PACK_STEPS`, one per schema change keyed by the schema it upgrades from, as `STEPS` in `intake.ts` are for saves; `loadGame`, `readMod` and the editor's JSON import all go through it), state intake (`loadState`, the one way a state from outside, such as a save, comes into play: the engine's steps, the plugins' and the game's migrations, then what the game declares; a new game comes from `startingState`, and both read each field's defaults from `FIELDS` in `intake.ts`, which holds the core's fields and each feature's `state`). Result (`Result<T>`, `{ ok: true, value } | { ok: false, reason }`: what the runner, the save and mod stores, `loadState`, `replay`, `readMod` and `upgradePack` answer when something can fail in a way a caller should expect; they never throw for those, and the engine's `apply` gives the same shape with the state on both sides; `checkGame`'s problems are a report, not a failure). Feature (a core feature, such as scenes, stats, items, entities or triggers: each one module in `src/features/` that declares its state, kinds, pack key, checks and the references it resolves, view piece, after-command steps, fills and carries; never a plugin, see ADR 0007), `defineFeature` (how a core feature is declared; internal, not exported). `screen` (`screen(state, game)`, one state drawn once: the open scene or the room, its choices with their effects, availability and price, the stage, the plugins' views, and the pool picks and audio they imply; `view` formats it, and the reducer records picks and audio from it). Page, in the React UI only: the title screen and the pages around the game (settings, load, credits, the gate and any a game adds), turned on with the `pages` option. Never call those screens, so `screen` keeps one meaning. The code uses these words too (storyline, character, `View`, `Game`, `Pack`, stages, blocks, variants); `site/content/docs/(latest)/guide/status.md` lists the few renames still to come.

Decisions a future review must not re-open are in `adr/`.

Every user-visible change adds a line to `CHANGELOG.md`, under `[Unreleased]` in Added, Changed, Removed or Fixed. Write it for someone making a game, not as a commit message. The docs show it at `/docs/changelog`.

## Adding to the core

A core kind of condition, effect or command, or a field of the state, belongs to a feature in `packages/engine/src/features/` (ADR 0007). To add one:

1. Add its type to the feature's shape (`SettingsShape`, say) and its entry to the matching table in the feature's `defineFeature`. The public `Condition`, `Effect`, `Command`, `GameState`, `Game`, `Pack` and `View` are built from the shapes, so there's nothing else to edit. A new kind of `Reference` gets its resolver in the feature's `resolve`.
2. For a new feature, write the module with `defineFeature`, then add it to `FEATURES` and its shape to `Shapes` in `features/registry.ts`. Where it goes in `FEATURES` matters: its after-command steps, checks and fills run in that order.
3. Keep the feature a leaf. Import only types, other features, `strings`, `entities`, `notices`, `storylines`, `collections`, `context`, `range` and `sceneBody`; take everything else (`holds`, `runEffects`, `buildEffects`, `weighted` and the rest) from the `FeatureContext` argument. `tests/contracts/features.test.ts` fails otherwise.
4. A helper the engine exports that needs the core (`activityBlocked`, `lockedBy`, `fireTriggers`, `statValue`) stays in its module outside `features/` (`activity.ts`, `locks.ts`), which binds the core's context and calls the feature's version.
5. `src/core.ts` keeps only the kinds that are no feature's: `all`, `any`, `not`, the custom calls and `start`.

## Docs

Anything the engine exports is documented in `site/content/docs/`, the docs part of the website in `site/` (Next.js with Fumadocs, hosted on Vercel at https://ifloom.dev, with the docs under `/docs/`). A change to the exports ships with its docs: load the `ifloom-docs` skill. The homepage is React, in `site/components/home/`. The editor at `/editor` is a client-only React app: its routes are in `site/app/editor/`, and its code in `site/editor/`, with the pure logic in `site/editor/lib/` tested by `npm test`. Decision records in `adr/` aren't on the site.

The pages are plain Markdown (`.md`) with a `title` and a `description` in front matter, and links between pages are absolute: `[Scenes](/docs/reference/scenes#scene)`. Each folder's `meta.json` gives the sidebar's order, and each section is a tab. `npm run docs:links` fails on a link to a page or heading that isn't there.

The docs are versioned. `site/content/docs/(latest)/` holds the latest docs, which the version dropdown calls "Latest (pre-release)" (its `meta.json` makes it a version root). Each other folder in `site/content/docs/` is a released version, served at `/docs/<version>/` and listed in the dropdown. A release keeps a copy of the docs as they were:

1. Run `node scripts/snapshot-docs.ts <version>` (for example `0.1.0`). It copies the latest docs, without the changelog, into `site/content/docs/<version>/`, titles its `meta.json` with the version, and points its links at the copy.
2. After the first release, change the title in `site/content/docs/(latest)/meta.json` and `latestTitle` in `site/lib/shared.ts` from `Latest (pre-release)` to `Latest`.
3. Run `npm run docs:build` and commit the snapshot with the release.

Don't edit a snapshot afterwards, except to fix something that was wrong in that release's docs. `llms.txt` and `llms-full.txt` cover the latest docs only, and search looks only in the version being read.

## Verify

```bash
npm test             # engine tests, boundary rules, docs coverage
npm run typecheck    # strict
npm run lint
npm run docs:build   # checks the links, then builds the site (next build)
```

`scripts/verify.sh` runs these and the examples' check, build and snapshot.

## Hosting

The site runs on Vercel at https://ifloom.dev, which builds `main` on every push. Besides the pages it serves `/api/search` (the docs' search), `/api/mcp` (an MCP server for agents), `llms.txt`, `llms-full.txt` and every page as Markdown under `/llms.mdx/docs/`. The Vercel project is set up as:

- Root directory: `site`, with "Include files outside the root directory in the Build Step" on, because the site imports the packages and reads the theme CSS from `packages/react`.
- Framework preset: Next.js. There's no `vercel.json`.
- Install command: `cd .. && npm ci`. The packages are npm workspaces, so the install runs at the repo root.
- Build command: `npm run build` (`next build` in `site/`).
- Node.js: 22.x, as in `.nvmrc` and `engines` in `site/package.json`.

The site is public but not indexed until the engine is published: `site/app/robots.ts` disallows everything, the root layout sets `robots` to noindex, and `site/next.config.mjs` adds an `X-Robots-Tag` header. ROADMAP's release readiness step removes all three. CI is `.github/workflows/ci.yml`, which runs `scripts/verify.sh` by hand only while the repo is private.

## Skills

In `.claude/skills/`: `ifloom-verify` (finishing and committing any change), `ifloom-core-feature` (a kind, state field or feature in the engine core), `ifloom-plugin` (a new first-party plugin, with `scripts/new-plugin.ts`), `ifloom-docs` (anything exported, or a docs page), `ifloom-ui-check` (screenshots, for React UI and site changes only).

`ROADMAP.md` is the order of work and the list of known problems; read it
before starting a step, and update it when one lands.

The first game built on the engine (a separate private repo) is frozen and is
not kept building against later engine changes; it is refactored onto the
engine once the roadmap's core steps are done.
