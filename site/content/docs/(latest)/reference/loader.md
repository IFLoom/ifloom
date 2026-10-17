---
title: "Packs and loading"
description: "Packs and loadGame: what a pack can hold, how packs merge, patches, schema upgrades and what the loader adds."
---
`loadGame` takes your content as a list of packs, merges them in order into one game, and checks the result. Every broken reference comes back as a problem that names the pack it came from.

```ts
import { loadGame, SCHEMA, upgradePack, type Pack, type Patch, type Loaded } from '@ifloom/engine'
```

Your game's own content is simply the first pack. Any later pack, such as a mod, is laid over it by id. This page covers the merge and which pack a problem is pinned on. The checks themselves are on [Checking content](/docs/reference/checks). [Mods](/docs/reference/mods) covers the other half: the packs a player installs into a built game, the file they come in, the store that keeps them and how the game loads them at start-up.

## Pack

```ts
type Pack = {
  id: string
  schema: number
  scenes?: (Scene | DataScene)[]
  items?: ItemDef[]
  storylines?: StorylineDef[]
  activities?: ActivityDef[]
  stats?: StatDef[]
  kinds?: KindDef[]
  entities?: EntityDef[]
  collections?: CollectionDef[]
  triggers?: TriggerDef[]
  inputs?: InputDef[]
  minigames?: MinigameDef[]
  settings?: SettingDef[]
  strings?: Record<string, string>
  prose?: Record<string, string>
  variants?: Record<string, VariantMember[]>
  custom?: Custom
  patches?: Patch[]
  data?: Record<string, Record<string, readonly PluginEntry[]>>
  audio?: Partial<GameAudio>
  media?: GameMedia
}
```

| Field | Merged how |
|---|---|
| `id` | Names the pack in problems, such as `'town'` or `'mod:sunday-market'`. |
| `schema` | The [`SCHEMA`](#schema) it was written for. An older pack is [upgraded](#upgradepack) as it loads. A newer one is skipped whole, with a problem. |
| `scenes`, `items`, `storylines`, `activities`, `stats`, `kinds`, `collections`, `triggers`, `inputs`, `minigames`, `settings` | By `id`. A later pack's entry replaces an earlier one with the same id as a whole, so fields aren't merged. The order is first appearance. Any `kinds`, `collections`, `triggers`, `inputs`, `minigames` and `settings` on `loadGame`'s `base` come before every pack's. |
| `entities` | By kind and id (`'staff:ana'`), so two kinds may each have an entity with the same id. A later pack's entity replaces an earlier one with the same kind and id. The order is first appearance, and the base's come first. See [Entities](/docs/reference/entities). |
| `strings` | By key. A later pack wins, and every pack wins over the base's `strings`. A pack of nothing but `strings` is a translation. See [Strings](/docs/reference/strings#overriding). |
| `prose` | By key. A later pack wins. |
| `variants` | By variants name. A later pack appends members to the list. A member is a prose key, or `{ text, weight }` to give it a [weight](/docs/reference/prose#variantmember). |
| `custom` | [Custom functions](/docs/reference/custom), kind by kind (`conditions`, `effects`, `values`, `panels`) and then by name. A later pack's function replaces an earlier one's of the same kind and name, and the rest are kept. |
| `patches` | Applied straight away, in order. See [Patches](#patches). |
| `data` | Content for the game's [plugins](/docs/reference/plugins#content-and-checks), by plugin id and then list name, such as `{ quests: { quests: [...] } }`. Each list merges by entry `id`, as scenes do. The result is at `game.data.quests.quests`. Locations and characters are content of this kind: `data.places.locations` for the [places plugin](/docs/plugins/places#in-a-pack) and `data.cast.characters` for the [cast](/docs/plugins/cast#in-a-pack). |
| `audio` | [Audio](/docs/reference/audio#gameaudio), over the base's own `audio`. `tracks` merge by id, and a later pack's track replaces an earlier one. `channels` merge by id too, field by field. A later pack's `mute` wins, and its `default` wins channel by channel. |
| `media` | [Media](/docs/reference/media#gamemedia), over the base's own `media`. `pools` merge by id, and a later pack's pool replaces an earlier one with the same id as a whole. To add a file to a pool, a mod redeclares the pool with every file. |

Some of a game can only go on the `base` you give [`loadGame`](#loadgame), never in a pack: `title`, `actions`, `rules`, `plugins`, `introScene`, `startPhase`, `finished`, `carryOver`, `saveName`, `version`, `migrations` and `transitions`. A pack that has one of them anyway loads without it, and the loader doesn't say so. TypeScript does, because they aren't in the `Pack` type, so type-check your packs.

### How packs merge

Everything a pack declares is keyed, whether by id, prose key, variants name or custom function name, and a later pack wins on any key it repeats. So a mod that changes one custom condition ships just that one:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const longerMarket: Pack = {
  id: 'mod:longer-market-days',
  schema: SCHEMA,
  custom: { conditions: { marketDay: (state) => [5, 6].includes(state.turn % 7) } },
}
```

The game's other custom conditions, and its effects, values and panels, are left alone.

## SCHEMA

```ts
const SCHEMA = 9
```

The content format this engine reads. Write `schema: SCHEMA` in your own packs so they always match.

A pack written for an older schema still loads. [`loadGame`](#loadgame) and [`readMod`](/docs/reference/mods#readmod) upgrade it first with [`upgradePack`](#upgradepack), so a mod file made for an earlier version of your game keeps working after you update the engine. A pack written for a newer schema than this engine reads is refused rather than half-loaded. `loadGame` skips it with the problem `written for schema 10, this engine reads 9`, and a mod like that is refused when the player adds it.

## upgradePack

```ts
function upgradePack(pack: { schema: number }): Pack | string
```

Brings a pack written for an older [`SCHEMA`](#schema) up to this one, or says why it can't. The engine keeps one step for each schema change, and a pack goes through them in order until it reaches `SCHEMA`. Each step rewrites what that change renamed or reshaped, such as an old name for a condition, in every scene, choice and effect of the pack.

| Step | What it rewrites |
|---|---|
| 4 to 5 | Flags become the [kv store](/docs/reference/state#kv). `{ flag }` and `{ storylineFlag }` conditions become `{ kv }` and `{ storylineKv }`. The `flag` effect becomes `kv`, with `value` as `to` and `add` as `by`, and `storylineFlag` becomes `storylineKv` with `to`. A `flags` record on an entity, a character, a generator template or a `create` effect becomes `kv`, and an input's `variable` becomes `key`. Prose, strings, variants and custom functions are left alone. |
| 5 to 6 | One naming rule for content (see [Effects](/docs/reference/effects#effect) and [Commands](/docs/reference/commands#command)). An effect names its target by its noun: `stat`'s and `setStat`'s `key` becomes `stat` (and `setStat` becomes `stat` with `to`), `item`'s, `scene`'s and `minigame`'s `id` becomes `item`, `scene` and `minigame`, `storylineKv`'s and `closeStoryline`'s `id` becomes `storyline`, `collect`'s `to` and `discard`'s `from` become `collection` (and `discard`'s `id` becomes `entry`), and `remove`'s `of` becomes `entity`. `phase`'s `value`, `audio`'s `track` and `minigameVar`'s `value` become `to`, and `minigameVar`'s `add` becomes `by`. `{ has }` becomes `{ item }`, `{ turn: true, gte }` becomes `{ turn: { gte } }`, `{ counter }` and `storylineKv`'s inner `is` become one `{ storylineKv }`, and a `{ collection }` condition's `id` becomes `entry`. The `use` command's `itemId` becomes `id`, and `setting`'s and `input`'s `value` becomes `to`. The first-party plugins' renamed arguments follow, such as `places/go`'s `to`, which becomes `id`. Gating: an activity's or a job's `requires` becomes `blocked`, with each `when` turned round, and a place's or an app's `locked` becomes `blocked`. |
| 6 to 7 | A plugin call's arguments are always an object (see [PluginCall](/docs/reference/custom#plugincall)). The first-party calls that took a bare value name it: `{ 'places/at': ['cafe'] }` becomes `{ 'places/at': { location: ['cafe'] } }`, and the same for `places/within` and `places/move` (`location`), `cast/here` and `cast/met` (`character`), `calendar/period` (`period`), `calendar/weekday` (`day`) and `calendar/pass` (`by`), in the short form and the long. Values take arguments instead of holding them in their names: an app's badge `{ count: 'messages/unread-texts' }` becomes `{ value: 'messages/unread', with: { channel: 'texts' } }`, `feed/unseen-<feed>` becomes `feed/unseen` with `{ feed }`, and any other `count` becomes `value`. Prose and strings get the same change in their tokens: `{{v:messages/unread-texts}}` becomes `{{v:messages/unread channel=texts}}`. |
| 7 to 8 | The timed-effects plugin is the [statuses plugin](/docs/plugins/statuses). `effects/active`, `effects/apply` and `effects/remove` become `statuses/active`, `statuses/apply` and `statuses/remove`, in the short form and the long, and a condition's or an effect's `effect` becomes `status` (a command keeps its `id`). Its content moves from `data.effects.effects` to `data.statuses.statuses`, and its strings from `effects/unknown` and `effects/notActive` to `statuses/…`. |
| 8 to 9 | An item's `kind` and a place's `kind` are gone. Each becomes a tag: `{ kind: 'stuff' }` becomes `{ tags: ['stuff'] }`, and a place's `'street'`, `'venue'` or `'room'` the same way. An item that was `'gear'` with no `start` also gets `start: 1`, since gear used to start at one. |

Schema 4 is the oldest a pack can be.

It returns the pack at `SCHEMA`, or one of these reasons:

| When | Returns |
|---|---|
| `schema` is newer than `SCHEMA` | `written for schema 10, this engine reads 9` |
| `schema` is older than the oldest schema there's a step from | `written for schema 3, too old for this engine to read (it reads 9)` |

A pack already at `SCHEMA` comes back unchanged, as the same object. The pack you pass in is never changed, so keep the result.

```ts
import { upgradePack } from '@ifloom/engine'

const pack = upgradePack(JSON.parse(text))
if (typeof pack === 'string') console.warn(`old-pack.json: ${pack}`)
```

You rarely call it yourself, because `loadGame` and `readMod` do. Use it when you read a pack some other way, for example a tool that edits packs and writes them back at the current schema.

**Gotcha.** Steps only cover packs in files: data scenes, plugin content and the rest of what JSON can hold. A pack written in TypeScript is checked by the compiler against the current types, so when a schema changes, you update it by hand and set its `schema` to `SCHEMA` again.

## loadGame

```ts
function loadGame(
  packs: Pack[],
  base: Omit<Game, 'scenes' | 'items' | 'storylines' | 'activities' | 'stats'>,
): Loaded

type Loaded = {
  game: Game
  prose: Record<string, string>
  variants: Record<string, string[]>
  problems: Problem[]
}
```

Merges `packs` in order, lays the result over `base`, builds `game.prose` from the packs' prose and variants, and checks the game with [`checkGame`](/docs/reference/checks#checkgame). See [What the loader adds](#what-the-loader-adds). `base` carries everything that isn't content: the game's `id`, `title`, `introScene`, `plugins`, `rules`, `actions` and so on. The game that comes back is ready to run. Data scenes render through the engine's [default runtime](/docs/reference/scenes#defaultruntime) with no further wiring.

`base` needs only `id` and `title`. Leave out `introScene` for a game that opens on its idle screen (with the [places plugin](/docs/plugins/places), the room it starts in). A linear story passes `{ id, title, introScene }`. See [Shapes of game](/docs/guide/shapes).

This is how the showcase builds Small Town, trimmed to the parts that matter here:

```ts
import { describeProblem, loadGame, type Pack } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { custom } from './content/custom.ts'
import { town } from './content/town.ts'

export function smallTown({ mods = [] as Pack[] } = {}) {
  const { game, problems } = loadGame([town, ...mods], {
    id: 'small-town',
    title: 'Small Town',
    introScene: 'intro',
    custom,
    plugins: [calendar({ start: { day: 0, period: 'night' } }), places({ start: 'flat' }), cast()],
    actions: [{ id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } }],
  })
  return { game, problems: problems.map(describeProblem) }
}
```

The real file is `examples/showcase/src/game.ts`. It also adds the phone, quests, wardrobe and debug plugins, a start phase, strings and rules. Its `main.tsx` logs the problems as warnings and starts the game anyway.

**Gotchas:**
- `loadGame` never throws on bad content. It returns problems, and it's up to you whether to refuse to start.
- `game.scenes` holds `DataScene`s exactly as declared, beside any hand-written `Scene`s. The engine turns a data scene into a `Scene` the first time [`sceneById`](/docs/reference/game#scenebyid) asks for it, so you don't wrap them yourself.
- `game.prose` is a [`proseStore`](/docs/reference/prose#prosestore-1) over the merged prose and variants. It replaces any `prose` on `base`. `Loaded.prose` and `Loaded.variants` are the same merged records, for tools that want the raw text.
- `game.packs` lists the packs' ids in order. [Saves](/docs/reference/saves#savemeta) record it, so loading a save made with a mod the player has since removed names that mod. A [mod file](/docs/reference/mods)'s pack is always `mod:<id>`.
- Custom functions can sit on `base` or in packs. The base's come first, and each pack lays its own over them by name, kind by kind.
- A key a pack can't hold is reported, not quietly dropped: `a pack has no "actions", so it was left out`. The game's `actions`, `rules`, `plugins` and the rest of what isn't content go on `base`.
- [Plugins](/docs/reference/plugins) go on `base`, as `plugins`, and only there. A pack can't add one. Plugin content can sit in `base.data` and in packs' `data`, and the base's comes first.
- `kinds`, `entities`, `collections`, `triggers` and `inputs` can sit on `base` as well as in packs. The base's come first, are reported as from `base`, and each pack lays its own over them by id (entities by kind and id). A plugin's own `kinds` come before the base's, so the game can redeclare them, and the entities a plugin makes from its content are added only where the game hasn't declared one with the same kind and id.

## Patches

```ts
type Patch =
  | { scene: string; addChoice: Choice; before?: string }
  | { scene: string; dropChoice: string }
  | { scene: string; replaceChoice: Choice }
```

A patch makes a small change to a scene an earlier pack declared, so you don't have to replace the whole scene. You can add a choice (at the end, or before the choice whose id is `before`), drop one by id, or replace the one with the same id.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const mod: Pack = {
  id: 'mod:compliments',
  schema: SCHEMA,
  prose: { 'ava.hi#coffee': 'Ask what she recommends' },
  patches: [
    { scene: 'ava.hi', addChoice: { id: 'coffee', effects: [{ kind: 'stat', stat: 'energy', by: 5 }] }, before: 'bye' },
  ],
}
```

**Gotchas:**
- Only a [`DataScene`](/docs/reference/scenes#datascene) can be patched. Patching a hand-written `Scene` is a problem.
- A patch applies to the scene as it stands when its pack is read. A later pack that redeclares the scene replaces it, patch and all.
- A `before` that names a choice that isn't there adds the choice at the end, without a problem. A `replaceChoice` with no matching id is a problem.

## What the loader adds

`loadGame` merges the packs, then checks the merged game with the [content checker](/docs/reference/checks), the same `checkGame` you can run on any game. It pins each problem on the pack that introduced it: the pack that last declared or patched the scene, item, stat, prose key, track or plugin entry the problem is in. What came with `base`, such as the game's `actions`, `finished` and `carryOver`, is reported against `base`. [Checking content](/docs/reference/checks) has the full list of checks.

It also reports what is wrong with the packs themselves, which the merged game no longer shows:

| `where` | Problem |
|---|---|
| `pack` | `written for schema …, this engine reads …`, or `… too old for this engine to read …`: the pack's `schema` is newer than [`SCHEMA`](#schema), or older than any [upgrade step](#upgradepack). The whole pack is skipped. |
| `patch <scene>` | `no such scene`, `that scene is not declarative, so it cannot be patched`, and `no choice <id>` for a `replaceChoice` with no match. |
| `setting <id>` | `two settings share this id`: twice in one pack's list, or the base's. A later pack redeclaring one is fine. |
| `variants <name>` | `"…" has a weight of …; a weight must be above 0`, for a [variants member](/docs/reference/prose#variantmember) with a weight of 0 or less. |
| `data <plugin>` | `the game has no plugin named "<plugin>"`: a pack carries content for a plugin the game wasn't built with. That content is skipped. |

Some problems as [`describeProblem`](/docs/reference/checks#problem-and-describeproblem) prints them:

```text
town · scene ava.hi · gated on unknown scene "ava.hello"
mod:night-market · activity browse · unknown stat "stamina"
mod:night-market · trigger parcel · unknown collection "drawer"
mod:night-market · locations yard · no prose for "place.yard"
mod:new-menu · entity dish:pie · no dish stat named "coins"
town · stat service · derive goes round in a cycle: service → mood → service
```

## See it in an example

- All three examples build their game with `loadGame` over a pack with `schema: SCHEMA`. Small Town's [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) loads its `town` pack with the player's mods after it, `loadGame([town, ...mods], { ... })`.
- [`examples/showcase/mods/fog-season.json`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/mods/fog-season.json) is a pack that adds to the high street's `street.weather` variants and replaces the park's prose, which shows how a later pack merges.
