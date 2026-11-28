---
title: "Content and packs"
description: "The content a game declares, how loadGame merges it with packs, and the problems it reports."
---
Content is the game's own data, one [`Content`](/docs/0.1.2/api/engine#content) object per file in `src/world/` and `src/story/`. A pack is data from outside the game's code, such as a mod, and goes over the content. [`loadGame`](#loadgame) merges both with a base that holds the game's id and code, and checks the result. [Content, packs and the base](/docs/0.1.2/explanation/content-and-packs) explains why the three are kept apart, and [Organise your game's files](/docs/0.1.2/how-to/organise-your-files) shows how to lay content out.

In the showcase: `examples/showcase/src/game.ts`.

## Content

One file of the game's content, such as `story/cafe.ts`, declaring each scene, stat or prose key once across all the files. Every field is in [`Content`](/docs/0.1.2/api/engine#content).

Content has no id and no schema, because the engine it is compiled with reads it. Renaming a file or splitting one in two changes nothing a save records. A save depends on the ids inside the content, so keep scene, entity and storyline ids stable once players have saves.

`loadGame` merges the content in the order you list it, after each plugin's own `content`. Lists keep that order, so triggers fire in it, and plugins such as quests and places list their entries in it. Each key merges as the table says.

| Key | Meaning |
|---|---|
| `name` | The name problems give this file, such as `story.cafe`. Problems say `content` for a file without one. |
| `scenes`, `storylines`, `stats`, `kinds`, `actions`, `triggers`, `inputs`, `minigames`, `timers`, `settings` | Lists merged by `id`, each id declared once across the content. |
| `introScene` | The [scene](/docs/0.1.2/reference/scenes#datascene) a new game opens on, given by one file. A game without one opens on its room. |
| `player` | What the game says of the player, given by one file: `image`, the picture beside the player's own spoken lines (a path in `art/` or a URL), checked as a file. A protagonist the [`you`](/docs/0.1.2/reference/effects#you) effect chooses is an entity, with its own picture. |
| `finished`, `carryOver` | The condition for a finished game and what a New Game+ keeps, each given by one file. See [`CarryOver`](/docs/0.1.2/reference/state#carryover). |
| `kv`, `resets` | The [kv store](/docs/0.1.2/reference/glossary#kv) a new game starts with, and the keys put back each turn, merged by key. See [`resets`](/docs/0.1.2/reference/rules#resets). |
| `entities` | The [entities](/docs/0.1.2/reference/entities#entitydef) there at the start, merged by kind and id, so two kinds can each have an entity `ana`. |
| `traits` | Trait data by trait id and then entity. See [traits](#traits). |
| `locks`, `saveable` | [Locks](/docs/0.1.2/reference/locks) and save refusals, each file's added after the ones before. A lock with an `id` is declared once. |
| `phrases` | [Phrases](/docs/0.1.2/reference/phrases), merged by full name such as `outfit.verdict`, so two files can add to one group. |
| `credits` | [Credit groups](/docs/0.1.2/reference/credits#creditgroup), merged by `id`. A file that names a group already declared adds its credits after that group's. |
| `changes` | The stats whose [changes](/docs/0.1.2/reference/changes) the view lists, every file's added together, each once. |
| `strings` | The engine's and plugins' [own lines](/docs/0.1.2/reference/strings), reworded, merged by key. |
| `prose` | Lines read by [prose key](/docs/0.1.2/reference/prose), merged by key. |
| `words` | Other words for the content's fields, laid over the merged game. See [The words table](/docs/0.1.2/reference/words). |
| `variants` | Sets of lines [drawn at random](/docs/0.1.2/reference/prose#variantmember). Each file appends its members to a name. |
| `data` | The plugins' content, by plugin id and list name. See [data](#data). |
| `audio` | The game's [music and sounds](/docs/0.1.2/reference/audio#gameaudio). Tracks and channels merge by id. |
| `media` | [Pools of pictures](/docs/0.1.2/reference/media#gamemedia), merged by id. |
| `ui` | [UI hints](/docs/0.1.2/reference/ui-hints) for the whole game, merged by key. |

The base holds `id`, `title`, `version`, `plugins`, `receivers` and `rules`, and content never does. `loadGame` leaves out any of those keys that content holds, and reports `content has no "…", so it was left out`. It does the same for `id`, `schema` and `patches`, which only a pack has, and for `custom`, which belongs in [`rules`](/docs/0.1.2/reference/rules). TypeScript reports them sooner, because they aren't in the `Content` type.

This file, cut down from the showcase's `story/cafe.ts`, declares a scene and a kv key the café puts back each day.

```ts
import type { Content } from '@ifloom/engine'

export const cafe: Content = {
  name: 'story.cafe',
  resets: { hadCoffee: false },
  scenes: [
    {
      id: 'cafe.window',
      title: 'The window seat',
      body: [{ text: 'Rain runs down the glass while your coffee goes cold.' }],
      choices: [{ id: 'leave', label: 'Finish your cup', effects: [{ scene: null }] }],
    },
  ],
}
```

[Organise your game's files](/docs/0.1.2/how-to/organise-your-files) shows the folders every game uses.

### data

Content for the game's plugins, under the plugin's id and then each of its lists by name. Every plugin keeps its lists by name, even a plugin with one list, so it can add a list later without moving the first. That's why the unlocks are at `data.unlocks.unlocks`: the plugin `unlocks`, then its list of unlocks. Its other list, the cheats, is beside it at `data.unlocks.cheats`.

Each list merges by entry `id`, as scenes do, and the merged list is at `game.data.unlocks.cheats`. The [words table](/docs/0.1.2/reference/words) names an entry the same way, as in `unlocks/cheats.coins.name`, and each plugin's [reference page](/docs/0.1.2/reference/plugins) names the lists it reads. Locations, vendors and characters are entities in `entities`, not `data`.

```ts
import type { Content } from '@ifloom/engine'

export const town: Content = {
  data: {
    unlocks: { cheats: [{ id: 'coins', name: '+20 coins', effects: [{ stat: 'coins', by: 20 }] }] },
    messages: { channels: [{ id: 'texts', name: 'Texts' }], messages: [] },
  },
}
```

`loadGame` skips the `data` of a plugin the game wasn't built with, and reports it.

### traits

A table that gives entities [traits](/docs/0.1.2/reference/entities#traittable) by trait id and then entity, without writing the entities out again. `loadGame` works out each entity's traits from three places:

1. A row in the `traits` table, from the content or a pack. A pack's row replaces an earlier one.
2. Otherwise, the entity's own `traits`.
3. Under either, its kind's `traits`, as defaults. The engine merges two objects field by field, the entity's fields winning, and replaces any other value whole.

The result is in `game.traits`, every declared entity's traits as plain data, which [`traitOf`](/docs/0.1.2/reference/entities#traitof) reads. A row for an entity no content declares is a problem, `unknown entity "…"`.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

export const gentler: Pack = {
  id: 'mod:gentle-wash',
  schema: SCHEMA,
  traits: { 'laundry/washable': { 'clothing:scarf': { temp: 30, gentle: true }, 'clothing:hat': { temp: 30 } } },
}
```

## Pack

Content from outside the game's code, such as a mod, unlocked supporter content or a JSON export, laid over the content and the packs before it. Every field is in [`Pack`](/docs/0.1.2/api/engine#pack). A pack has every key `Content` has except `name`, plus these:

| Field | Meaning |
|---|---|
| `id` | The pack's name in problems and saves, such as `'supporter'`. A [mod](/docs/0.1.2/reference/mods)'s id is always `mod:<id>`. |
| `schema` | The [`SCHEMA`](#schema) the pack was written for. `loadGame` upgrades an older pack and skips a newer one. |
| `plugins` | The version of each plugin's content the pack was written for, such as `{ shop: 13 }`. A plugin left out is read as written for the pack's `schema`, or for the plugin's own version if that's lower. |
| `patches` | Changes to the choices of scenes declared before the pack. See [`Patch`](#patch). |

A pack may declare any key again, with no problem. Its scene, entity, stat, plugin entry or `traits` row replaces the one with the same id whole, so fields aren't merged. Its `prose`, `strings`, `words`, `kv`, `resets` and `ui` hints replace the keys it gives and keep the rest. Its `locks` and `saveable` entries come after the earlier ones, and a lock with an `id` replaces the one with that id. Its `introScene`, `finished` and `carryOver` replace the content's.

A pack appends its `variants` members. Its audio `tracks` and media `pools` replace the ones with the same id, so a mod that adds a file to a pool declares the pool again with every file. Its audio `channels` merge field by field, and its `mute` and `default` win.

A pack holds data only. The game's functions are its [`rules`](/docs/0.1.2/reference/rules), which no pack can change. This mod replaces one action and leaves the game's other actions alone:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

export const longerWait: Pack = {
  id: 'mod:longer-wait',
  schema: SCHEMA,
  actions: [{ id: 'wait', label: 'Wait all afternoon', effects: [{ stat: 'energy', by: 20 }, { 'calendar/pass': { by: 2 } }] }],
}
```

[Let players add mods](/docs/0.1.2/how-to/let-players-add-mods) shows how a built game loads a player's packs.

## Patch

A change a pack makes to one choice of a scene that the content or an earlier pack declared, so the pack needn't replace the whole scene. Every form is in [`Patch`](/docs/0.1.2/api/engine#patch).

A patch adds a choice with `addChoice` (at the end, or before the choice named by `before`), drops one by id with `dropChoice`, or replaces the one with the same id with `replaceChoice`. Only packs have patches, so content changes the scene itself. `loadGame` applies each patch as it reads its pack, and a later pack that declares the scene again replaces it, patch and all.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

export const recommend: Pack = {
  id: 'mod:recommend',
  schema: SCHEMA,
  patches: [{ scene: 'ava.hi', addChoice: { id: 'recommend', label: 'Ask what she recommends', effects: [{ stat: 'energy', by: 5 }] }, before: 'bye' }],
}
```

A `before` that names no choice adds the choice at the end, with no problem. A `replaceChoice` with no matching id is a problem.

## SCHEMA

The version of the pack format this engine reads, a whole number that goes up with the engine. A pack written in TypeScript sets `schema: SCHEMA`, so it always matches. Content has no schema.

`loadGame` upgrades a pack written for an older schema with [`upgradePack`](#upgradepack) before merging it, so a mod made for an earlier version of a game keeps working. It skips a pack written for a newer schema whole, with the problem `written for schema <n>, this engine reads <SCHEMA>`. [Schema history](/docs/0.1.2/upgrading/schema-history) lists what each schema changed.

## GameBase

The second argument of [`loadGame`](#loadgame), holding the game's `id`, `title`, `version`, `plugins`, `receivers` and `rules`, and nothing a mod could change. Every field is in [`GameBase`](/docs/0.1.2/api/engine#gamebase), and [`Game`](/docs/0.1.2/reference/game#game) describes each.

`receivers` lists, by plugin id, the order the [`receive`](/docs/0.1.2/reference/effects#receive) effect asks the plugins that keep things, such as `['wardrobe', 'inventory']` so clothes go to the wardrobe and the rest to the inventory. The order of `plugins` if left out. An id that isn't a [receiver](/docs/0.1.2/reference/entities#receivers) is a problem.

A base needs only `id` and `title`. `loadGame` leaves out any other key on it and says where the key belongs, as in `the base has no "actions", so it was left out; it is content now, so it goes in the game's content`. The game's code (`custom`, `migrations` and `saveName`) goes in `rules`.

## LoadOptions

The third argument of [`loadGame`](#loadgame). Every field is in [`LoadOptions`](/docs/0.1.2/api/engine#loadoptions). Its one field, `packs`, lists the packs laid over the content in order, each upgraded first. A game with no mods or unlocked content leaves the argument out.

## Loaded

The answer of [`loadGame`](#loadgame), with the merged game, its raw prose and variants, and every problem found. Every field is in [`Loaded`](/docs/0.1.2/api/engine#loaded).

`game` is ready to run. `prose` and `variants` are the merged records `game.prose` reads, for tools that want the raw text. `problems` lists what the loader and [`checkGame`](/docs/0.1.2/reference/checks#checkgame) found, each a [`Problem`](/docs/0.1.2/reference/checks#problem). A game with problems still loads, so a build either shows them or fails on them.

## PackContext

The facts [`upgradePack`](#upgradepack) needs about the game a pack goes over: the entities its content and plugins declare, the game's string `you`, and the prose under the pack. Every field is in [`PackContext`](/docs/0.1.2/api/engine-plugin#packcontext), which `@ifloom/engine/plugin` exports.

The step that names who says a spoken line reads the entities and `you`, and the step that gives a label its words reads the prose. `loadGame` passes the context, with the entities and prose of the packs before this one. Without it, those steps read only the pack's own.

## Functions

### loadGame

Returns the game merged from the base, the content and then the packs, with every problem found. Its signature is in [`loadGame`](/docs/0.1.2/api/engine#loadgame).

`loadGame` merges each plugin's own `content` first, then the content in order, then each pack in order. It builds `game.prose` from the prose and variants, then checks the game with [`checkGame`](/docs/0.1.2/reference/checks#checkgame). It never throws on bad content, so the caller decides whether to start a game with problems.

A plugin's own content isn't counted as declared by the game's content. Content can declare one of the plugin's kinds again and keep the fields it leaves out (such as `listed`), and a pack can replace anything in it by id. The entities a plugin makes from its content are added only where the game hasn't declared one with the same kind and id.

This is a template's `src/game.ts`. Its [game module](/docs/0.1.2/reference/cli#the-game-module) builds the game with `loadGame` and passes on the unlocked packs `ifloom check` gives it:

```ts
import { loadGame } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

export default defineGame({
  build: ({ unlocked }) => loadGame([stats, opening], { id: 'my-story', title: 'My Story' }, { packs: unlocked }),
})
```

The showcase's `src/game.ts` lists every file from `world/` and `story/`, and lays the player's unlocked content and then their mods over it with `{ packs: [...unlocked, ...mods] }`.

### upgradePack

Returns a pack written for an older [`SCHEMA`](#schema), and for older versions of the game's plugins, carried forward to this engine's, as a [`Result`](/docs/0.1.2/reference/common#result). Its signature is in [`upgradePack`](/docs/0.1.2/api/engine#upgradepack).

Pass the game's plugins, the same list as the base's `plugins`. The engine runs one step per schema change, and each plugin's [content migrations](/docs/0.1.2/reference/plugin-migrations) alongside them. A plugin left out of the list leaves its content as it was. A pack with nothing to change comes back as the same object, and the pack passed in is never changed.

It fails with one of these reasons:

| Problem | Cause |
|---|---|
| `written for schema <n>, this engine reads <SCHEMA>` | The pack's `schema` is newer than this engine's. |
| `written for schema <n>, too old for this engine to read (it reads <SCHEMA>)` | The pack's `schema` is older than the oldest step. |
| `written for version <n> of the shop plugin's content, this game's reads <m>` | The pack's `plugins` names a newer version of a plugin's content than the game has. |

`loadGame` calls it for every pack, mods included. A tool that reads a pack some other way calls it too:

```ts given
import { readFileSync } from 'node:fs'
import { upgradePack } from '@ifloom/engine'

const upgraded = upgradePack(JSON.parse(readFileSync('old-pack.json', 'utf8')), game.plugins ?? [])
if (!upgraded.ok) console.warn(`old-pack.json: ${upgraded.reason}`)
```

[Upgrade IFLoom](/docs/0.1.2/upgrading) covers moving a game and its packs to a newer engine.

## Checks

`loadGame` checks the merged game with the [content checker](/docs/0.1.2/reference/checks). It pins each problem on the pack that last declared or patched the thing, or else on the content's `name`. It reports a key the base can't hold against `base`, and a problem in a plugin's own content against that plugin's id.

It also reports these problems with the content and packs themselves, which the merged game no longer shows:

| Problem | Cause |
|---|---|
| `scene "cafe.counter" · declared twice` | Two files of the content declare the same key. With a `name` on both files, it ends `declared twice, in story.cafe and story.town`. |
| `pack · written for schema …` | The pack's `schema` is newer than [`SCHEMA`](#schema), or older than any step, so `loadGame` skips the whole pack. |
| `patch <scene> · no such scene` | A patch names a scene nobody declared. |
| `patch <scene> · no choice <id>` | A `replaceChoice` names no choice of that scene. |
| `content · content has no "…", so it was left out` | Content holds a key only the base or a pack has, such as `rules`, `id` or `patches`. |
| `pack · a pack has no "…", so it was left out` | A pack holds a key only the base has, such as `rules` or `custom`. |
| `base · the base has no "…", so it was left out` | The base holds a key that belongs in content or `rules`. |
| `setting <id> · two settings share this id` | One list declares a setting twice. |
| `variants <name> · … a weight must be above 0` | A [variants member](/docs/0.1.2/reference/prose#variantmember) has a weight of 0 or less. |
| `data <plugin> · the game has no plugin named "<plugin>"` | Content or a pack holds `data` for a plugin the game wasn't built with. |

The declared-twice check covers every key content declares by id or key: scenes, prose keys, strings, stats, kinds, entities, `traits` rows, storylines, actions, locks with an `id`, triggers, inputs, minigames, timers, phrases, settings, kv and `resets` keys, `ui` hints, `introScene`, `finished`, `carryOver`, audio tracks, media pools and plugin entries. Files may add to one variants name, and only the same line listed twice is reported.

[`describeProblem`](/docs/0.1.2/reference/checks#describeproblem) prints a problem with its source in front:

```text
story.ava · scene ava.hi · gated on unknown scene "ava.hello"
mod:night-market · action browse · spends unknown stat "stamina"
content · stat service · derive goes round in a cycle: service → mood → service
```

## Caveats

- Content isn't upgraded when the engine changes, because the engine it is compiled with reads it. TypeScript reports what changed, and a plain-JS game gets a problem from `loadGame` for each old name it meets.
- A pack replaces a scene, entity or plugin entry whole, so a mod that changes one field of a scene declares the whole scene again or uses a [`Patch`](#patch).
- `game.packs` lists the packs' ids in order and nothing for the content. A [save](/docs/0.1.2/reference/saves#savemeta) records it, so a save made with a mod the player has since removed names that mod.
