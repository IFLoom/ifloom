---
title: "Content, packs and loading"
description: "Content and packs, and loadGame: what each can hold, how they merge, patches, schema upgrades and what the loader adds."
---
`loadGame` takes your game's content and any packs, merges them into one game, and checks the result. Every broken reference comes back as a problem that says where it came from.

```ts
import { loadGame, SCHEMA, upgradePack, type Content, type GameBase, type LoadOptions, type Loaded, type Pack, type Patch } from '@ifloom/engine'
```

This page covers what content and packs are, how they merge, and which piece a problem is pinned on. The checks themselves are on [Checking content](/docs/reference/checks). [Mods](/docs/reference/mods) covers the packs a player installs into a built game: the file they come in, the store that keeps them and how the game loads them at start-up.

## Content and packs

Your game is **content**: the scenes, stats, things, prose and plugin content in your own files, such as `src/world/stats.ts` and `src/story/cafe.ts`. Split it across as many files as you like, and rename or move them whenever you want. Each file exports a [`Content`](#content) object, and `src/game.ts` passes the list of them to [`loadGame`](#loadgame).

A **pack** is something added on top of the game from outside your code: a player's [mod](/docs/reference/mods), [supporter content](/docs/plugins/unlocks) a code unlocks. A [`Pack`](#pack) is content with an `id` and a `schema`, and it can [patch](#patches) a scene.

The two load differently:

| | Content | Packs |
|---|---|---|
| Where it comes from | Your own files, built with the game | A mod, unlocked content or a JSON file |
| What it declares | Each scene, stat, prose key and the rest once, across all your files. Declaring one twice is a [problem](#one-key-declared-twice). | Anything. A pack replaces what the content or an earlier pack declared by the same id or key, with no problem. |
| Order | Merged first, in the order you list it | Merged over the content, in order, so the last one wins |
| Saves | Not recorded | Each pack's `id` is recorded in [saves](/docs/reference/saves#savemeta), and a missing mod is named when a save loads |
| Schema | None. It's compiled against the engine you build with. | The [`SCHEMA`](#schema) it was written for. An older one is [upgraded](#upgradepack). |
| Patches | No. Change the scene itself. | Yes, see [Patches](#patches) |

Lists keep the order you combine your content in. Triggers fire in that order, and plugins such as quests and places list their entries in it.

Because content has no id, renaming a file or splitting one into two changes nothing a player can see. What a save does depend on is the ids inside your content: keep scene, entity and storyline ids stable once players have saves.

Because content has no schema, it isn't upgraded when you update the engine. In TypeScript the compiler tells you what changed. In a plain-JS game, `loadGame` and `ifloom check` report each old name they meet, such as `unknown effect kind "setStat"`, or `unknown stat "undefined"` for an effect whose field was renamed. The [upgrade steps](#upgradepack) list what each schema renamed.

## Content

```ts
type Content = {
  name?: string
  scenes?: (Scene | DataScene)[]
  storylines?: StorylineDef[]
  activities?: ActivityDef[]
  stats?: StatDef[]
  kinds?: KindDef[]
  entities?: EntityDef[]
  traits?: TraitTable
  triggers?: TriggerDef[]
  inputs?: InputDef[]
  minigames?: MinigameDef[]
  timers?: TimerDef[]
  settings?: SettingDef[]
  strings?: Record<string, string>
  prose?: Record<string, string>
  variants?: Record<string, VariantMember[]>
  custom?: Custom
  data?: Record<string, Record<string, readonly PluginEntry[]>>
  audio?: Partial<GameAudio>
  media?: GameMedia
}
```

One file of your game's content. This is the novel's first chapter, cut down:

```ts
import type { Content } from '@ifloom/engine'

export const ch1: Content = {
  inputs: [{ id: 'playerName', label: 'Your name', kind: 'text', maxLength: 20, when: { not: { kv: 'playerName' } } }],
  scenes: [{ id: 'ch1.mat', title: 'Chapter one: the mat', body: [{ text: 'ch1.mat' }], choices: [] }],
  prose: { 'ch1.mat': 'The flat still smells of someone else’s cooking. On the mat is a letter with a name on it that isn’t yours.' },
}
```

| Field | Merged how |
|---|---|
| `name` | Optional. What problems call this content, such as `story.cafe`. Without one, they say `content`. |
| `scenes`, `storylines`, `activities`, `stats`, `kinds`, `triggers`, `inputs`, `minigames`, `timers`, `settings` | By `id`, each declared once across your content. The order is the order you combine your content in. Any `kinds`, `triggers`, `inputs`, `minigames`, `timers` and `settings` on `loadGame`'s `base` come first. |
| `entities` | By kind and id (`'staff:ana'`), so two kinds may each have an entity with the same id. The base's come first. See [Entities](/docs/reference/entities). |
| `traits` | By trait id and then entity, one row each. See [Traits](#traits). |
| `strings` | By key, over the base's `strings`. A file of nothing but `strings` is a translation. See [Strings](/docs/reference/strings#overriding). |
| `prose` | By key. |
| `variants` | By variants name. Each file appends its members to the list, so several files can add lines to one name. A member is a prose key, or `{ text, weight }` to give it a [weight](/docs/reference/prose#variantmember). |
| `custom` | [Custom functions](/docs/reference/custom), kind by kind (`conditions`, `effects`, `values`, `panels`) and then by name. |
| `data` | Content for the game's [plugins](/docs/reference/plugins#content-and-checks), by plugin id and then list name, such as `{ quests: { quests: [...] } }`. Each list merges by entry `id`, as scenes do. The result is at `game.data.quests.quests`. Locations are content of this kind: `data.places.locations` for the [places plugin](/docs/plugins/places#in-your-content). The [cast](/docs/plugins/cast#in-your-content)'s characters are entities instead, in `entities`. |
| `audio` | [Audio](/docs/reference/audio#gameaudio), over the base's own `audio`. `tracks` and `channels` merge by id, and `mute` and `default` go over the base's. |
| `media` | [Media](/docs/reference/media#gamemedia), over the base's own `media`. `pools` merge by id. |

Some of a game can only go on the `base` you give [`loadGame`](#loadgame), never in content or a pack: `title`, `actions`, `rules`, `plugins`, `introScene`, `startPhase`, `finished`, `carryOver`, `saveName`, `version`, `migrations` and `ui`. Content that has one of them anyway loads without it, with the problem `content has no "…", so it was left out`. So does content with an `id`, a `schema` or `patches`, which only a pack has. TypeScript catches all of these sooner, because they aren't in the `Content` type.

### One key declared twice

Two of your files can end up declaring the same thing by mistake: a scene copied into a second file, or a stat declared in both `world/stats.ts` and a chapter. `loadGame` reports it as a problem, so `ifloom check` fails on it:

```text
content · scene "cafe.counter" · declared twice
```

Give your content a `name` and the problem says which two files it's in:

```text
story.town · scene "cafe.counter" · declared twice, in story.cafe and story.town
```

It looks at everything content declares by a key: scenes (storylets too), prose keys, strings, stats, kinds, entities, rows of the `traits` table (as in `trait "laundry/washable" on "clothing:hat"`), storylines, activities, triggers, inputs, minigames, timers, settings, custom functions, audio tracks, media pools and plugin content (`data`, by plugin, list and `id`, as in `places/locations "cafe"`). Content appends to a variants name, so two files adding lines to one name is fine. Only the same line listed by both is reported.

To change something on purpose, change it where it's declared. Packs are the only way to replace what the content declares.

### Traits

The `traits` key gives entities [traits](/docs/reference/entities#traits) by trait id and then entity, without writing the entities out again:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const gentler: Pack = {
  id: 'mod:gentle-wash',
  schema: SCHEMA,
  traits: { 'laundry/washable': { 'clothing:scarf': { temp: 30, gentle: true }, 'clothing:hat': { temp: 30 } } },
}
```

The loader works out each entity's traits from three places, in this order:

1. A row in the `traits` table, from your content or a pack. A pack's row replaces an earlier one.
2. Otherwise, the entity's own `traits`.
3. Under either, its kind's `traits`, as defaults. Two objects are merged field by field, the entity's fields winning. Any other value is replaced whole.

A row replaces the entity's own value whole, but still sits on the kind's default. The result is in [`game.traits`](/docs/reference/game#game), every declared entity's traits as plain data, which [`traitOf`](/docs/reference/entities#traitof) reads. A row for an entity no content declares is a problem, `unknown entity "…"`.

Packs written before traits existed have no `traits` key, so they need no upgrade. The key is new, not a change to an old one, and [`SCHEMA`](#schema) stays the same.

## Pack

```ts
type Pack = Omit<Content, 'name'> & {
  id: string
  schema: number
  patches?: Patch[]
}
```

Content from outside your code, laid over the game. It has everything [`Content`](#content) has except `name`, plus:

| Field | What it does |
|---|---|
| `id` | Names the pack in problems and saves, such as `'supporter'` or `'mod:sunday-market'`. A [mod](/docs/reference/mods)'s is always `mod:<id>`. |
| `schema` | The [`SCHEMA`](#schema) it was written for. An older pack is [upgraded](#upgradepack) as it loads. A newer one is skipped whole, with a problem. |
| `patches` | Small changes to scenes the content or an earlier pack declared, applied straight away, in order. See [Patches](#patches). |

A pack merges as content does, except that it may repeat any key. Its scene, entity, stat or plugin entry replaces the one with the same id as a whole, so fields aren't merged. So does a row of its `traits` table, for that trait on that entity. Its `prose`, `strings` and custom functions replace the ones with the same key or name, and the rest are kept. Its `variants` members are appended. Its audio `tracks` and media `pools` replace the ones with the same id, its audio `channels` merge field by field, and its `mute` and `default` win. To add a file to a pool, a mod redeclares the pool with every file.

So a mod that changes one custom condition ships only that one:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const longerMarket: Pack = {
  id: 'mod:longer-market-days',
  schema: SCHEMA,
  custom: { conditions: { marketDay: (state) => [5, 6].includes(state.turn % 7) } },
}
```

The game's other custom conditions, and its effects, values and panels, are left alone.

A pack written before this split may still have `overrides: true`, which told the loader a pack replaced things on purpose. Every pack does now, so the field is ignored.

## SCHEMA

```ts
const SCHEMA = 16
```

The format of packs this engine reads. Write `schema: SCHEMA` in a pack you write in TypeScript so it always matches. Your content has no schema.

A pack written for an older schema still loads. [`loadGame`](#loadgame) and [`readMod`](/docs/reference/mods#readmod) upgrade it first with [`upgradePack`](#upgradepack), so a mod file made for an earlier version of your game keeps working after you update the engine. A pack written for a newer schema than this engine reads is refused rather than half-loaded. `loadGame` skips it with the problem `written for schema 17, this engine reads 16`, and a mod like that is refused when the player adds it.

## upgradePack

```ts
function upgradePack(pack: { schema: number }): Result<Pack>
```

Brings a pack written for an older [`SCHEMA`](#schema) up to this one, or says why it can't, as a [`Result`](/docs/reference/runner#result). The engine keeps one step for each schema change, and a pack goes through them in order until it reaches `SCHEMA`. Each step rewrites what that change renamed or reshaped, such as an old name for a condition, in every scene, choice and effect of the pack.

| Step | What it rewrites |
|---|---|
| 4 to 5 | Flags become the [kv store](/docs/reference/state#kv). `{ flag }` and `{ storylineFlag }` conditions become `{ kv }` and `{ storylineKv }`. The `flag` effect becomes `kv`, with `value` as `to` and `add` as `by`, and `storylineFlag` becomes `storylineKv` with `to`. A `flags` record on an entity, a character, a generator template or a `create` effect becomes `kv`, and an input's `variable` becomes `key`. Prose, strings, variants and custom functions are left alone. |
| 5 to 6 | One naming rule for content (see [Effects](/docs/reference/effects#effect) and [Commands](/docs/reference/commands#command)). An effect names its target by its noun: `stat`'s and `setStat`'s `key` becomes `stat` (and `setStat` becomes `stat` with `to`), `item`'s, `scene`'s and `minigame`'s `id` becomes `item`, `scene` and `minigame`, `storylineKv`'s and `closeStoryline`'s `id` becomes `storyline`, `collect`'s `to` and `discard`'s `from` become `collection` (and `discard`'s `id` becomes `entry`), and `remove`'s `of` becomes `entity`. `phase`'s `value`, `audio`'s `track` and `minigameVar`'s `value` become `to`, and `minigameVar`'s `add` becomes `by`. `{ has }` becomes `{ item }`, `{ turn: true, gte }` becomes `{ turn: { gte } }`, `{ counter }` and `storylineKv`'s inner `is` become one `{ storylineKv }`, and a `{ collection }` condition's `id` becomes `entry`. The `use` command's `itemId` becomes `id`, and `setting`'s and `input`'s `value` becomes `to`. The first-party plugins' renamed arguments follow, such as `places/go`'s `to`, which becomes `id`. Gating: an activity's or a job's `requires` becomes `blocked`, with each `when` turned round, and a place's or an app's `locked` becomes `blocked`. |
| 6 to 7 | A plugin call's arguments are always an object (see [PluginCall](/docs/reference/custom#plugincall)). The first-party calls that took a bare value name it: `{ 'places/at': ['cafe'] }` becomes `{ 'places/at': { location: ['cafe'] } }`, and the same for `places/within` and `places/move` (`location`), `cast/here` and `cast/met` (`character`), `calendar/period` (`period`), `calendar/weekday` (`day`) and `calendar/pass` (`by`), in the short form and the long. Values take arguments instead of holding them in their names: an app's badge `{ count: 'messages/unread-texts' }` becomes `{ value: 'messages/unread', with: { channel: 'texts' } }`, `feed/unseen-<feed>` becomes `feed/unseen` with `{ feed }`, and any other `count` becomes `value`. Prose and strings get the same change in their tokens: `{{v:messages/unread-texts}}` becomes `{{v:messages/unread channel=texts}}`. |
| 7 to 8 | The timed-effects plugin is the [statuses plugin](/docs/plugins/statuses). `effects/active`, `effects/apply` and `effects/remove` become `statuses/active`, `statuses/apply` and `statuses/remove`, in the short form and the long, and a condition's or an effect's `effect` becomes `status` (a command keeps its `id`). Its content moves from `data.effects.effects` to `data.statuses.statuses`, and its strings from `effects/unknown` and `effects/notActive` to `statuses/…`. |
| 8 to 9 | An item's `kind` and a place's `kind` are gone. Each becomes a tag: `{ kind: 'stuff' }` becomes `{ tags: ['stuff'] }`, and a place's `'street'`, `'venue'` or `'room'` the same way. An item that was `'gear'` with no `start` also gets `start: 1`, since gear used to start at one. |
| 9 to 10 | A choice in a scene is `scene#choice`, as its label's prose key already was (see [Ids and separators](/docs/reference/game#ids-and-separators)). `{ chose: 'ch1.mat/open' }` becomes `{ chose: 'ch1.mat#open' }`. Prose keys are your own names, which code can hold too, so they're left as they are. |
| 10 to 11 | A stat's hidden `bands` are [levels](/docs/reference/stats#statlevels) the player isn't shown: `bands: [10, 20]` becomes `levels: { at: [10, 20], hidden: true }`, and `{ tier: 'charm', gte: 2 }` becomes `{ level: 'charm', gte: 2 }`. A stat that had both keeps its `levels` and loses its `bands`. |
| 11 to 12 | The [feed plugin](/docs/plugins/feed#values)'s value `feed/unseen` is `feed/unread`, as its view and the messages plugin count news: in a value's name, such as a badge's `{ value: 'feed/unseen' }`, and in prose and strings tokens, `{{v:feed/unseen feed=social}}`. |
| 12 to 13 | Items and collections are [entities](/docs/reference/entities#holding-things). A pack's `items` become entities of an `item` kind, which the pack declares unlisted unless it already does: `{ id, name, desc, tags }` as they were, a `start` as `at: { player: start }`, and a `use` as the [inventory plugin](/docs/plugins/inventory)'s `inventory/usable` trait. A `collections` entry becomes an unlisted kind of the same id and name (the phone's `gallery` is `photo`). `{ item: 'tea', gte: 2 }` becomes `{ entity: 'item:tea', at: 'you', gte: 2 }`, and the `item` effect the `entity` effect with `at: 'you'`. The `use` command becomes `{ 'inventory/use': { id: 'item:tea' } }`. `collect` becomes `create`, given to the player, with the entry's `title` as its name, its prose (from the pack's own `prose`) as its description, its `image` and its `data` as kv. `discard` becomes `remove`. `{ collection, entry }` becomes `{ entity: '<kind>:<entry>' }`, and `{ collection, …range }` counts what the player holds of the kind. A shop good's `item`, and `shop/buy`, `shop/sell`, `shop/inStock` and `wardrobe/wearing`'s `item`, become `entity`, with `item:` in front, as do `wardrobe/wear`'s `id` and a wardrobe slot's `start`. `data.wardrobe.clothes` becomes rows of the `wardrobe/wearable` trait in the pack's `traits`. `debug/item` becomes `debug/held`. The strings `doesNothing` and `haveNone` become `inventory/doesNothing` and `inventory/haveNone` (and `wardrobe/haveNone`), with `{item}` written `{thing}`. |
| 13 to 14 | The [cast](/docs/plugins/cast#characters)'s characters are entities with the `cast/person` trait. Each entry of `data.cast.characters` becomes an entity of the kind `character`, after the pack's own entities: its `id`, `name`, `tags`, `stats` and `kv` as they were, its `role` as `desc` and its `portrait` as `image`, and everything else (`fullName`, `schedule`, `talk`, `call` and the rest) as the trait. `data.cast.characters` goes. |
| 14 to 15 | A [kind](/docs/reference/entities#kinddef)'s named conditions are its `flags`: `{ id: 'staff', marks: { senior: … } }` becomes `{ id: 'staff', flags: { senior: … } }`. |
| 15 to 16 | How things look and move is the UI's, written as [presentation hints](/docs/reference/ui-hints) in the React UI's words. A scene's and a place's `transition` becomes `ui.transition`, and a scene's `frame` goes. A block's `reveal` becomes `ui.reveal`. `[[reveal]]` on a line of its own, in the prose of a scene's or a place's `{ text }` block, splits that prose there: the words before it keep the key, and each part after it gets a key of its own (`<key>.2`, `<key>.3`) and a block of its own with `ui.reveal`, under the same `when`. Anywhere else, such as inside a paragraph or in a variants member, the markup is taken out and the words show at once. A `transition` effect in a choice's effects becomes that choice's `ui.transition` (`{ in, ms }`), and is dropped anywhere else. A stat's `display` becomes `ui.display`. The cast's `hue`, on a person's `cast/person` trait, becomes the entity's or the kind's `ui.hue`; a `traits` table row's `hue` moves to the pack's own entity of that reference, or is dropped when the pack doesn't declare it. |

Schema 4 is the oldest a pack can be.

It returns the pack at `SCHEMA`, or one of these reasons:

| When | Returns |
|---|---|
| `schema` is newer than `SCHEMA` | `written for schema 17, this engine reads 16` |
| `schema` is older than the oldest schema there's a step from | `written for schema 3, too old for this engine to read (it reads 16)` |

A pack already at `SCHEMA` comes back unchanged, as the same object. The pack you pass in is never changed, so keep the result.

```ts
import { upgradePack } from '@ifloom/engine'

const upgraded = upgradePack(JSON.parse(text))
if (!upgraded.ok) console.warn(`old-pack.json: ${upgraded.reason}`)
```

You rarely call it yourself, because `loadGame` and `readMod` do. Use it when you read a pack some other way, for example a tool that edits packs and writes them back at the current schema.

**Gotcha.** Steps only cover packs: data scenes, plugin content and the rest of what JSON can hold. Your content is compiled against the current types, so when a schema changes, you update it by hand. See [Content and packs](#content-and-packs).

## loadGame

```ts
function loadGame(content: readonly Content[], base: GameBase, options?: LoadOptions): Loaded

type GameBase = Omit<Game, 'scenes' | 'storylines' | 'activities' | 'stats'>

type LoadOptions = {
  packs?: readonly Pack[]
}

type Loaded = {
  game: Game
  prose: Record<string, string>
  variants: Record<string, string[]>
  problems: Problem[]
}
```

Merges `content` in order, then each of `options.packs` over it in order, lays the result over `base`, builds `game.prose` from the prose and variants, and checks the game with [`checkGame`](/docs/reference/checks#checkgame). See [What the loader adds](#what-the-loader-adds). `base` (a `GameBase`) carries everything that isn't content: the game's `id`, `title`, `introScene`, `plugins`, `rules`, `actions` and so on. The game that comes back is ready to run. Data scenes render through the engine's [default runtime](/docs/reference/scenes#defaultruntime) with no further wiring.

`base` needs only `id` and `title`. Leave out `introScene` for a game that opens on its idle screen (with the [places plugin](/docs/plugins/places), the room it starts in). A linear story passes `{ id, title, introScene }`. See [Shapes of game](/docs/guide/shapes).

A game with no mods or unlocks leaves out the third argument. This is the template's `src/game.ts`:

```ts
import { loadGame } from '@ifloom/engine'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

export default loadGame([stats, opening], { id: 'my-story', title: 'My Story', introScene: 'start' })
```

This is how the showcase builds Small Town, trimmed to the parts that matter here. The player's unlocked supporter content and mods are packs, over the town's content:

```ts
import { describeProblem, loadGame, type Content, type Pack } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { custom } from './rules.ts'
import { stats } from './world/stats.ts'
import { movingDay } from './story/moving-day.ts'
import { cafe } from './story/cafe.ts'

export const content: Content[] = [stats, movingDay, cafe]

export function smallTown({ unlocked = [] as Pack[], mods = [] as Pack[] } = {}) {
  const { game, problems } = loadGame(
    content,
    {
      id: 'small-town',
      title: 'Small Town',
      introScene: 'intro',
      custom,
      plugins: [calendar({ start: { day: 0, period: 'night' } }), places({ start: 'flat' }), cast()],
      actions: [{ id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } }],
    },
    { packs: [...unlocked, ...mods] },
  )
  return { game, problems: problems.map(describeProblem) }
}
```

The real file is `examples/showcase/src/game.ts`, which lists all fifteen of the town's content files from `world/` and `story/`. It also adds the phone, quests, wardrobe and debug plugins, a start phase, strings and rules. Its `main.tsx` logs the problems as warnings and starts the game anyway.

**Gotchas:**
- `loadGame` never throws on bad content. It returns problems, and it's up to you whether to refuse to start.
- `game.scenes` holds `DataScene`s exactly as declared, beside any hand-written `Scene`s. The engine turns a data scene into a `Scene` the first time [`sceneById`](/docs/reference/game#scenebyid) asks for it, so you don't wrap them yourself.
- `game.prose` is a [`proseStore`](/docs/reference/prose#prosestore-1) over the merged prose and variants. It replaces any `prose` on `base`. `Loaded.prose` and `Loaded.variants` are the same merged records, for tools that want the raw text.
- `game.packs` lists the packs' ids in order, and nothing for your content. [Saves](/docs/reference/saves#savemeta) record it, so loading a save made with a mod the player has since removed names that mod.
- Custom functions can sit on `base`, in content and in packs. The base's come first, and the content and packs lay theirs over them by name, kind by kind.
- [Plugins](/docs/reference/plugins) go on `base`, as `plugins`, and only there. Content and packs can't add one. Plugin content can sit in `base.data`, in content and in packs, and the base's comes first.
- `kinds`, `entities`, `triggers` and `inputs` can sit on `base` as well as in content. The base's come first and are reported as from `base`. A plugin's own `kinds` come before the base's, so the game can redeclare them, keeping the plugin's fields it leaves out (such as `listed`), and the entities a plugin makes from its content are added only where the game hasn't declared one with the same kind and id.

## Patches

```ts
type Patch =
  | { scene: string; addChoice: Choice; before?: string }
  | { scene: string; dropChoice: string }
  | { scene: string; replaceChoice: Choice }
```

A patch makes a small change to a scene the content or an earlier pack declared, so a pack doesn't have to replace the whole scene. Only packs have patches: in your own content, change the scene itself. You can add a choice (at the end, or before the choice whose id is `before`), drop one by id, or replace the one with the same id.

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

`loadGame` merges the content and packs, then checks the merged game with the [content checker](/docs/reference/checks), the same `checkGame` you can run on any game. It pins each problem on where the thing it's in came from: the pack that last declared or patched the scene, entity, stat, prose key, track or plugin entry, or else the content's `name` (`content` if it has none). What came with `base`, such as the game's `actions`, `finished` and `carryOver`, is reported against `base`. [Checking content](/docs/reference/checks) has the full list of checks.

It also reports what is wrong with the content and packs themselves, which the merged game no longer shows:

| `where` | Problem |
|---|---|
| `pack` | `written for schema …, this engine reads …`, or `… too old for this engine to read …`: the pack's `schema` is newer than [`SCHEMA`](#schema), or older than any [upgrade step](#upgradepack). The whole pack is skipped. |
| `patch <scene>` | `no such scene`, `that scene is not declarative, so it cannot be patched`, and `no choice <id>` for a `replaceChoice` with no match. |
| `<what>`, such as `scene "cafe.counter"` | `declared twice`, or `declared twice, in <name> and <name>` when both files have a `name`: your content declares the same key twice. See [One key declared twice](#one-key-declared-twice). |
| `content` | `content has no "…", so it was left out`: a key content can't hold, such as `actions`, or an `id`, `schema` or `patches`, which only a pack has. |
| `pack` | `a pack has no "…", so it was left out`: a key a pack can't hold, such as `actions`. |
| `setting <id>` | `two settings share this id`: twice in one list, or the base's. |
| `variants <name>` | `"…" has a weight of …; a weight must be above 0`, for a [variants member](/docs/reference/prose#variantmember) with a weight of 0 or less. |
| `data <plugin>` | `the game has no plugin named "<plugin>"`: content or a pack carries plugin content for a plugin the game wasn't built with. That content is skipped. |

Some problems as [`describeProblem`](/docs/reference/checks#problem-and-describeproblem) prints them:

```text
story.ava · scene ava.hi · gated on unknown scene "ava.hello"
mod:night-market · activity browse · unknown stat "stamina"
mod:night-market · trigger parcel · unknown kind "drawer"
mod:night-market · locations yard · no prose for "place.yard"
mod:new-menu · entity dish:pie · no dish stat named "coins"
content · stat service · derive goes round in a cycle: service → mood → service
```

## See it in an example

- All three examples build their game with `loadGame` from the content in their `world/` and `story/` folders. Small Town's [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) loads the player's unlocked content and mods over it as packs, `loadGame(content, { ... }, { packs: [...unlocked, ...mods] })`.
- [`examples/showcase/mods/fog-season.json`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/mods/fog-season.json) is a pack that adds to the high street's `street.weather` variants and replaces the park's prose, which shows how a pack merges.
