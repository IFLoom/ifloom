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

Because content has no schema, it isn't upgraded when you update the engine. In TypeScript the compiler tells you what changed. In a plain-JS game, `loadGame` and `ifloom check` report each old name they meet, such as `effects are told apart by their key now, as { stat: … }, not { kind: "stat" }`, or `unknown stat "undefined"` for an effect whose field was renamed. The [upgrade steps](#upgradepack) list what each schema renamed.

## Content

```ts
type Content = {
  name?: string
  scenes?: (Scene | DataScene)[]
  introScene?: string
  storylines?: StorylineDef[]
  stats?: StatDef[]
  kv?: Record<string, KvValue>
  resets?: Record<string, KvValue>
  kinds?: KindDef[]
  entities?: EntityDef[]
  traits?: TraitTable
  actions?: ActionDef[]
  locks?: Lock[]
  triggers?: TriggerDef[]
  inputs?: InputDef[]
  minigames?: MinigameDef[]
  timers?: TimerDef[]
  settings?: SettingDef[]
  saveable?: Blocked[]
  finished?: Condition
  carryOver?: CarryOver
  strings?: Record<string, string>
  prose?: Record<string, string>
  words?: Record<string, string>
  variants?: Record<string, VariantMember[]>
  data?: Record<string, Record<string, readonly PluginEntry[]>>
  audio?: Partial<GameAudio>
  media?: GameMedia
  ui?: Ui<GameUi>
}
```

One file of your game's content. This is the novel's first chapter, cut down:

```ts
import type { Content } from '@ifloom/engine'

export const ch1: Content = {
  inputs: [{ id: 'playerName', label: 'Your name', type: 'text', maxLength: 20, when: { not: { kv: 'playerName' } } }],
  scenes: [{ id: 'ch1.mat', title: 'Chapter one: the mat', body: [{ prose: 'ch1.mat' }], choices: [] }],
  prose: { 'ch1.mat': 'The flat still smells of someone else’s cooking. On the mat is a letter with a name on it that isn’t yours.' },
}
```

| Field | Merged how |
|---|---|
| `name` | Optional. What problems call this content, such as `story.cafe`. Without one, they say `content`. |
| `scenes`, `storylines`, `stats`, `kinds`, `actions`, `triggers`, `inputs`, `minigames`, `timers`, `settings` | By `id`, each declared once across your content. The order is the order you combine your content in. A plugin's own [`content`](/docs/reference/plugins#kinds-and-entities) comes first. |
| `introScene`, `finished`, `carryOver` | One value each, given by one file of your content. See [Game](/docs/reference/game#game). |
| `kv`, `resets` | By key, each declared once: `kv` is what a new game's [kv store](/docs/reference/state#kv) starts with, and `resets` what goes back each turn (see [`resets`](/docs/reference/rules#resets)). |
| `locks`, `saveable` | Added, each file's after the ones before. A [lock](/docs/reference/locks) with an `id` is declared once by it. |
| `ui` | [Presentation hints](/docs/reference/ui-hints) for the whole game, by key. |
| `entities` | By kind and id (`'staff:ana'`), so two kinds may each have an entity with the same id. See [Entities](/docs/reference/entities). |
| `traits` | By trait id and then entity, one row each. See [Traits](#traits). |
| `strings` | By key: the engine's and plugins' own lines, reworded. See [Strings](/docs/reference/strings#overriding). |
| `prose` | By key. |
| `words` | By key: other words for the fields of the content, laid over it once everything is merged. A translation is one pack with this table. See [The words table](/docs/reference/words). |
| `variants` | By variants name. Each file appends its members to the list, so several files can add lines to one name. A member is a prose key, or `{ text, weight }` to give it a [weight](/docs/reference/prose#variantmember). |
| `data` | Content for the game's [plugins](/docs/reference/plugins#content-and-checks), by plugin id and then list name, such as `{ quests: { quests: [...] } }`. Each list merges by entry `id`, as scenes do. The result is at `game.data.quests.quests`. The [places plugin](/docs/plugins/places#in-your-content)'s locations, the [shop](/docs/plugins/shop#writing-vendors)'s vendors and the [cast](/docs/plugins/cast#in-your-content)'s characters are entities instead, in `entities`. |
| `audio` | [Audio](/docs/reference/audio#gameaudio). `tracks` and `channels` merge by id, and `mute` and `default` go over the earlier ones. |
| `media` | [Media](/docs/reference/media#gamemedia). `pools` merge by id. |

What the game is and its code go on the `base` you give [`loadGame`](#loadgame), never in content or a pack: `id`, `title`, `version`, `plugins` and `rules`. Content that has one of them anyway loads without it, with the problem `content has no "…", so it was left out`. So does content with an `id`, a `schema` or `patches`, which only a pack has, and content with `custom`, which is the game's code now and goes in [`rules`](/docs/reference/rules). TypeScript catches all of these sooner, because they aren't in the `Content` type.

### One key declared twice

Two of your files can end up declaring the same thing by mistake: a scene copied into a second file, or a stat declared in both `world/stats.ts` and a chapter. `loadGame` reports it as a problem, so `ifloom check` fails on it:

```text
content · scene "cafe.counter" · declared twice
```

Give your content a `name` and the problem says which two files it's in:

```text
story.town · scene "cafe.counter" · declared twice, in story.cafe and story.town
```

It looks at everything content declares by a key: scenes (storylets too), prose keys, strings, stats, kinds, entities, rows of the `traits` table (as in `trait "laundry/washable" on "clothing:hat"`), storylines, actions, locks with an `id`, triggers, inputs, minigames, timers, settings, kv and `resets` keys, `ui` hints, `introScene`, `finished`, `carryOver`, audio tracks, media pools and plugin content (`data`, by plugin, list and `id`, as in `quests/quests "settle"`). Content appends to a variants name, so two files adding lines to one name is fine. Only the same line listed by both is reported.

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
  plugins?: Record<string, number>
  patches?: Patch[]
}
```

Content from outside your code, laid over the game. It has everything [`Content`](#content) has except `name`, plus:

| Field | What it does |
|---|---|
| `id` | Names the pack in problems and saves, such as `'supporter'` or `'mod:sunday-market'`. A [mod](/docs/reference/mods)'s is always `mod:<id>`. |
| `schema` | The [`SCHEMA`](#schema) it was written for. An older pack is [upgraded](#upgradepack) as it loads. A newer one is skipped whole, with a problem. |
| `plugins` | The version of each plugin's content it was written for, by plugin id: `{ shop: 13 }`. A plugin's own steps carry an older one forward as it loads, and a newer one is skipped whole, with a problem. A plugin left out is read as written for the pack's `schema`, or for the plugin's own version if that's lower. See [Content and command migrations](/docs/reference/plugins#content-and-command-migrations). |
| `patches` | Small changes to scenes the content or an earlier pack declared, applied straight away, in order. See [Patches](#patches). |

A pack merges as content does, except that it may repeat any key. Its scene, entity, stat or plugin entry replaces the one with the same id as a whole, so fields aren't merged. So does a row of its `traits` table, for that trait on that entity. Its `prose`, `strings`, `words`, `kv`, `resets` and `ui` hints replace the ones with the same key, and the rest are kept. Its `locks` and `saveable` entries come after the ones before, and a lock with an `id` replaces the one with that id. Its `introScene`, `finished` and `carryOver` replace the content's whole. Its `variants` members are appended. Its audio `tracks` and media `pools` replace the ones with the same id, its audio `channels` merge field by field, and its `mute` and `default` win. To add a file to a pool, a mod redeclares the pool with every file.

So a mod that changes one button ships only that one:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const longerNap: Pack = {
  id: 'mod:longer-naps',
  schema: SCHEMA,
  actions: [{ id: 'nap', label: 'Sleep till noon', effects: [{ stat: 'energy', by: 40 }, { 'calendar/pass': { by: 2 } }] }],
}
```

The game's other actions are left alone. A pack holds data only: the game's own functions are its [`rules`](/docs/reference/rules), which no pack can change.

A pack written before this split may still have `overrides: true`, which told the loader a pack replaced things on purpose. Every pack does now, so the field is ignored.

## SCHEMA

```ts
const SCHEMA = 27
```

The format of packs this engine reads. Write `schema: SCHEMA` in a pack you write in TypeScript so it always matches. Your content has no schema.

A pack written for an older schema still loads. [`loadGame`](#loadgame) upgrades it first with [`upgradePack`](#upgradepack), mods included, so a mod file made for an earlier version of your game keeps working after you update the engine or a plugin. A pack written for a newer schema than this engine reads is refused rather than half-loaded. `loadGame` skips it with the problem `written for schema 28, this engine reads 27`, and a mod like that is refused when the player adds it.

## upgradePack

```ts
function upgradePack(pack: { schema: number; plugins?: Record<string, number> }, plugins: readonly Plugin[], context?: PackContext): Result<Pack>

type PackContext = { entities?: readonly unknown[]; you?: readonly string[]; prose?: Readonly<Record<string, string>> }
```

Brings a pack written for an older [`SCHEMA`](#schema) up to this one, and for older versions of the game's plugins up to theirs, or says why it can't, as a [`Result`](/docs/reference/runner#result). Pass the game's plugins, the same list as the base's `plugins`. The engine keeps one step for each schema change, and a pack goes through them in order until it reaches `SCHEMA`. Each step rewrites what that change renamed or reshaped, such as an old name for a condition, in every scene, choice and effect of the pack.

`context` is what a step needs to know of the game the pack goes over: the entities its content and plugins declare, the game's string `you`, and the prose under the pack. The step from schema 22 reads the entities and `you`, to know whose name a spoken line was written under, and the step from schema 24 reads the prose, to give a label that was a prose key its words. [`loadGame`](#loadgame) passes it, with the entities and prose of the packs before this one too. Leave it out and those steps read only the pack's own.

What a plugin reads (its `data`, its calls' arguments, its strings and its traits) is that plugin's to carry forward, with its own [`contentMigrations`](/docs/reference/plugins#content-and-command-migrations). The engine runs them alongside its own steps: before its step from each schema, every plugin's steps keyed by that schema or below, and after its last, the rest. The table below lists what both rewrite at each schema, the first-party plugins' steps included, so an old pack upgraded with those plugins comes out as described. Without a plugin in the list, its content is left as it was.

| Step | What it rewrites |
|---|---|
| 4 to 5 | Flags become the [kv store](/docs/reference/state#kv). `{ flag }` and `{ storylineFlag }` conditions become `{ kv }` and `{ storylineKv }`. The `flag` effect becomes `kv`, with `value` as `to` and `add` as `by`, and `storylineFlag` becomes `storylineKv` with `to`. (Schema 19 folds `storylineKv` into `kv`.) A `flags` record on an entity, a character, a generator template or a `create` effect becomes `kv`, and an input's `variable` becomes `key`. Prose, strings, variants and custom functions are left alone. |
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
| 16 to 17 | One panel model (see [A scene's panel](/docs/reference/panels#a-scenes-panel)). A scene's `panel: 'prices'` becomes `panel: { panel: 'prices' }`, and its `panelData` goes. |
| 17 to 18 | The game's own code is its [`rules`](/docs/reference/rules), called as a plugin's is, with `game` in front. `{ custom: 'tired' }` becomes `{ 'game/tired': true }`, and with `with`, `{ 'game/tired': with }`. A plugin's call written `{ custom: 'quests/done', with }` becomes its short form. A `{ kind: 'custom', name }` effect names `game/<name>` when the name has no plugin, a value `{ value: 'payroll' }` names `game/payroll`, and in prose and strings `{{v:payroll}}` becomes `{{v:game/payroll}}`. A pack's own `custom` functions are code, which a pack can't hold, so the loader reports them. |
| 18 to 19 | One kv vocabulary, with whose store in `of` (see [`kv`](/docs/reference/conditions#kv)). `{ storylineKv: { storyline: 'baker', key: 'visits' }, gte: 3 }` becomes `{ kv: 'visits', of: 'storyline:baker', gte: 3 }`, and the `storylineKv` effect a `kv` effect with that `of`. `{ minigameVar: 'score' }` becomes `{ kv: 'score', of: 'minigame' }`, and so does its effect. The phase is the kv key `phase`: `{ phase: ['open'] }` becomes `{ kv: 'phase', is: ['open'] }`, the `phase` effect a `kv` effect on `phase`, and `startPhase: 'arrival'` the starting kv `kv: { phase: 'arrival' }`. In prose and strings, `{{n:baker.visits}}` becomes `{{kv:visits of=storyline:baker}}`. |
| 19 to 20 | One kind of button (see [`ActionDef`](/docs/reference/actions#actiondef)). Each of `activities` becomes an action with no label, its `cost`, `blocked` and `effects` as they were. An action the pack declares with the same id, whose command did that activity, takes them in place of its command. `{ type: 'activity', id }` becomes `{ type: 'action', id }` wherever a command is, and a lock's `deny` and `except` name `'action'` for `'activity'`. |
| 20 to 21 | Effects are told apart by their key, as conditions are (see [Effects](/docs/reference/effects#effect)). `{ kind: 'stat', stat, by }` becomes `{ stat, by }`, `{ kind: 'kv', key: 'met', to }` becomes `{ kv: 'met', to }`, `{ kind: 'scene', scene }` becomes `{ scene }`, `{ kind: 'scene', from, otherwise }` becomes `{ scene: { from, otherwise } }`, and `{ kind: 'turn' }` becomes `{ turn: true }` (with `by`, `{ turn: { by } }`). `remove`, `move` and `you` name their entity in their key, `closeStoryline` its storyline, `notify` its title, `audio` its channel, `sound` its track and `roll` its key. `create`'s `of` becomes its key and its `entity` becomes `with`, and `each`'s `of` becomes its key, or with `at`, `tag` or `trait` a [`Select`](/docs/reference/entities#select). A call, `{ kind: 'custom', name, with }`, becomes its short form. An input's and a setting's `kind` becomes `type`. The plugins whose content holds effects (statuses, devices, inventory, jobs, places, messages and cheats) rewrite theirs too, and so do the effects in entities' traits. |
| 21 to 22 | The engine's [beats](/docs/reference/prose#scenebeat) are text, speech, pictures, video and sound, and how a letter or a sign looks is the UI's. In prose and strings, `[[mail]] … [[/mail]]` becomes the React UI's [piece](/docs/reference/prose#letters-notes-and-signs) `[[ui:mail|body|From: …|Subject: …]]`, `[[sticky]]`, `[[clip]]` and `[[diary]]` become `[[ui:prop|words|sticky]]` (and so on), and a paragraph starting `> ` becomes `[[ui:mono|words]]`, each a paragraph of its own. Words a piece can't hold (a `|` or a `]`) stay as plain paragraphs. A picture's `rot` flag goes, and a scene's `{ text }` block whose line had one gets the React UI's block hint `ui: { tilt: true }`. A choice's `labels` entries name their words `label` (was `key`), as every [button](/docs/reference/actions#buttondef)'s do. A minigame's `vars` are its `kv`, the store `{ kv, of: 'minigame' }` reads. |
| 22 to 23 | [Speech](/docs/reference/prose#speech) names who says it by id, `@ava: "…"`, and the view shows their name from their entity. In `prose` and in scenes' `{ words }` blocks (`{ text }` blocks since schema 25), a line written `Ava: "…"` becomes `@ava: "…"` when exactly one entity, in `context` or the pack, has that name: its bare id when that reads as the entity (a `character`, or the one entity with that id), else its full reference, `@staff:jo:`. `You:`, or a line under the game's or the pack's string `you`, becomes `@you:`. A name no entity has, or that two share, is left as it was, a line under that label with no speaker. |
| 23 to 24 | The [places plugin](/docs/plugins/places#older-content)'s locations and the [shop](/docs/plugins/shop#checks)'s vendors are entities with their plugin's trait. Each entry of `data.places.locations` becomes an entity `{ of: 'location', id, name, desc, image, tags, traits: { 'places/location': { ... } } }`, its old `tag` the `desc` and its `art` the `image` (an empty one dropped), and `{{v:places/tag}}` becomes `{{v:places/desc}}`. Each entry of `data.shop.vendors` becomes `{ of: 'vendor', id, name, traits: { 'shop/vendor': { ... } } }`. They follow the pack's own entities, and `data.places` and `data.shop` go when nothing is left in them. Each plugin's own step does it (content version 24). |
| 24 to 25 | The words a player reads are written in place (see [The words table](/docs/reference/words)). A block of words written in place, `{ words }`, becomes `{ text }`, and a block that read the prose by key, `{ text: key }`, becomes `{ prose: key }`, wherever a block is: scenes, patches, plugin `data` and entities' traits. A label that is a prose key (a choice's, an action's or a `labels` entry's, in a scene, an action or a plugin's buttons) becomes that prose's words, and so does a scene's choice with no label, from the prose `<scene>#<choice>` it read, a `notify` effect's `text` and a minigame state's `label`. The [messages plugin](/docs/plugins/messages)'s replies get `label` from `<message>#<reply>`, and the [feed](/docs/plugins/feed)'s `feed/post` and `feed/react` their `text`'s words (content version 25). The words come from the pack's own prose, else the prose under it in `context`. A key neither has is left as written, and now reads as those words, and a choice with no label and no prose shows its id, as it did. |
| 25 to 26 | One word each: a thing's line is its `description` and a heading its `title`. An entity's `desc` (in `entities` and in a `create` effect's `with`) becomes `description`, a minigame's `label` its `title`, and the `words` table's `entity.<ref>.desc` and `minigame.<id>.label` follow. The plugins' own steps (content version 26) rename theirs: a quest's `title` and `summary` are its `name` and `description`, a status's `label` and `summary` its `name` and `description` and its `onStart`, `eachTurn` and `onEnd` its `effects: { start, turn, end }`, an achievement's, a job's and a rank's `title` and a cheat's and an unlock's `label` their `name`, a generator template's `desc` its `description`, the value `places/desc` is `places/description`, and the cast's `offstage`, where someone nowhere on the map is, is `away`. |
| 26 to 27 | A `variants` block's `art`, the variants a member's picture is drawn from, is `image`. |

Schema 4 is the oldest a pack can be.

It returns the pack at `SCHEMA`, with `plugins` recording each plugin's version, or one of these reasons:

| When | Returns |
|---|---|
| `schema` is newer than `SCHEMA` | `written for schema 28, this engine reads 27` |
| `schema` is older than the oldest schema there's a step from | `written for schema 3, too old for this engine to read (it reads 25)` |
| `plugins` gives a newer version of a plugin's content than the game has | `written for version 14 of the shop plugin's content, this game's reads 13` |

A pack with nothing to do comes back unchanged, as the same object. The pack you pass in is never changed, so keep the result.

```ts
import { upgradePack } from '@ifloom/engine'

const upgraded = upgradePack(JSON.parse(text), game.plugins ?? [])
if (!upgraded.ok) console.warn(`old-pack.json: ${upgraded.reason}`)
```

You rarely call it yourself: [`loadGame`](#loadgame) upgrades every pack in `packs` with the base's plugins, mods included.

You rarely call it yourself, because `loadGame` and `readMod` do. Use it when you read a pack some other way, for example a tool that edits packs and writes them back at the current schema.

**Gotcha.** Steps only cover packs: data scenes, plugin content and the rest of what JSON can hold. Your content is compiled against the current types, so when a schema changes, you update it by hand. See [Content and packs](#content-and-packs).

## loadGame

```ts
function loadGame(content: readonly Content[], base: GameBase, options?: LoadOptions): Loaded

type GameBase = Pick<Game, 'id' | 'title' | 'version' | 'plugins' | 'rules'>

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

Merges each plugin's own [`content`](/docs/reference/plugins#kinds-and-entities) first, then `content` in order, then each of `options.packs` over it in order, builds `game.prose` from the prose and variants, and checks the game with [`checkGame`](/docs/reference/checks#checkgame). See [What the loader adds](#what-the-loader-adds). The game that comes back is ready to run. Data scenes are [drawn](/docs/reference/scenes#running-data-scenes) with no further wiring.

`base` (a `GameBase`) says what the game is and holds its code, and nothing a mod could change:

| Key | What it is |
|---|---|
| `id` | The game's id, which saves are kept under. |
| `title` | The game's name. |
| `version` | The game's own version, for [its save migrations](/docs/reference/saves#the-games-own-migrations). 1 if left out. |
| `plugins` | The [plugins](/docs/reference/plugins) it's built with, in the order their hooks run. |
| `rules` | The game's own code: hooks, the functions content calls as `game/…`, commands, `saveName` and `migrations`. See [Rules and hooks](/docs/reference/rules). |

`base` needs only `id` and `title`. Anything else on it is left out with a problem that says where it goes: `the base has no "actions", so it was left out; it is content now, so it goes in the game's content`, or, for `custom`, `migrations` and `saveName`, one that says it is the game's code and goes in `rules`. Where the game opens is content's `introScene`: leave it out for a game that opens on its idle screen (with the [places plugin](/docs/plugins/places), the room it starts in). See [Shapes of game](/docs/guide/shapes).

A game with no mods or unlocks leaves out the third argument. This is the template's `src/game.ts`, whose [game module](/docs/cli#the-game-module) builds the game with `loadGame`, passing on the locked packs `ifloom check` gives it:

```ts
import { loadGame } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

export default defineGame({
  build: ({ unlocked }) => loadGame([stats, opening], { id: 'my-story', title: 'My Story' }, { packs: unlocked }),
})
```

This is how the showcase builds Small Town, trimmed to the parts that matter here. The player's unlocked supporter content and mods are packs, over the town's content:

```ts
import { loadGame, type Content, type Pack } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { rules } from './rules.ts'
import { stats } from './world/stats.ts'
import { actions } from './world/actions.ts'
import { movingDay } from './story/moving-day.ts'
import { cafe } from './story/cafe.ts'

// moving-day.ts gives the introScene and the starting kv, actions.ts the buttons.
export const content: Content[] = [stats, actions, movingDay, cafe]

export function smallTown({ unlocked = [] as Pack[], mods = [] as Pack[] } = {}) {
  return loadGame(
    content,
    {
      id: 'small-town',
      title: 'Small Town',
      plugins: [calendar({ start: { day: 0, period: 'night' } }), places({ start: 'flat' }), cast()],
      rules,
    },
    { packs: [...unlocked, ...mods] },
  )
}

// The release build, for the CLI: the unlocked packs `ifloom check` reads from src/unlocks/, and no mods.
export default defineGame({ build: ({ unlocked }) => smallTown({ unlocked }) })
```

The real file is `examples/showcase/src/game.ts`, which lists all of the town's content files from `world/` and `story/`, with the phone's content first. It also adds the phone, quests, wardrobe and debug plugins. Its `main.tsx` calls `smallTown` with the player's mods, logs the problems as warnings with `describeProblem`, and starts the game anyway.

**Gotchas:**
- `loadGame` never throws on bad content. It returns problems, and it's up to you whether to refuse to start.
- `game.scenes` holds `DataScene`s exactly as declared. The engine works out how to draw each one the first time it's shown.
- `game.prose` is a [`ProseStore`](/docs/reference/game#prosestore) over the merged prose and variants. `Loaded.prose` and `Loaded.variants` are the same merged records, for tools that want the raw text.
- `game.packs` lists the packs' ids in order, and nothing for your content. [Saves](/docs/reference/saves#savemeta) record it, so loading a save made with a mod the player has since removed names that mod.
- The game's own functions are its [`rules`](/docs/reference/rules), on `base` and only there. Content and packs can't hold code.
- [Plugins](/docs/reference/plugins) go on `base`, as `plugins`, and only there. Content and packs can't add one. Plugin content can sit in content and in packs.
- Each plugin's own [`content`](/docs/reference/plugins#kinds-and-entities) is merged first, under the game's, and isn't counted as declared by your content. Your content can redeclare one of its kinds, keeping the plugin's fields it leaves out (such as `listed`), and a pack can replace anything in it by id. The entities a plugin makes from its content are added only where the game hasn't declared one with the same kind and id.

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
  patches: [
    { scene: 'ava.hi', addChoice: { id: 'coffee', label: 'Ask what she recommends', effects: [{ stat: 'energy', by: 5 }] }, before: 'bye' },
  ],
}
```

**Gotchas:**
- A patch applies to the scene as it stands when its pack is read. A later pack that redeclares the scene replaces it, patch and all.
- A `before` that names a choice that isn't there adds the choice at the end, without a problem. A `replaceChoice` with no matching id is a problem.

## What the loader adds

`loadGame` merges the content and packs, then checks the merged game with the [content checker](/docs/reference/checks), the same `checkGame` you can run on any game. It pins each problem on where the thing it's in came from: the pack that last declared or patched the scene, entity, stat, prose key, track or plugin entry, or else the content's `name` (`content` if it has none). A key `base` can't hold is reported against `base`, and what came from a plugin's own content against that plugin's id. [Checking content](/docs/reference/checks) has the full list of checks.

It also reports what is wrong with the content and packs themselves, which the merged game no longer shows:

| `where` | Problem |
|---|---|
| `pack` | `written for schema …, this engine reads …`, or `… too old for this engine to read …`: the pack's `schema` is newer than [`SCHEMA`](#schema), or older than any [upgrade step](#upgradepack). The whole pack is skipped. |
| `patch <scene>` | `no such scene`, `that scene is not declarative, so it cannot be patched`, and `no choice <id>` for a `replaceChoice` with no match. |
| `<what>`, such as `scene "cafe.counter"` | `declared twice`, or `declared twice, in <name> and <name>` when both files have a `name`: your content declares the same key twice. See [One key declared twice](#one-key-declared-twice). |
| `content` | `content has no "…", so it was left out`: a key content can't hold, such as `rules` or `custom`, or an `id`, `schema` or `patches`, which only a pack has. |
| `pack` | `a pack has no "…", so it was left out`: a key a pack can't hold, such as `rules` or `custom`. |
| `base` | `the base has no "…", so it was left out`, with where it goes: content (`actions`, `introScene` and the rest) or `rules` (`custom`, `migrations`, `saveName`). |
| `setting <id>` | `two settings share this id`: twice in one list. |
| `variants <name>` | `"…" has a weight of …; a weight must be above 0`, for a [variants member](/docs/reference/prose#variantmember) with a weight of 0 or less. |
| `data <plugin>` | `the game has no plugin named "<plugin>"`: content or a pack carries plugin content for a plugin the game wasn't built with. That content is skipped. |

Some problems as [`describeProblem`](/docs/reference/checks#problem-and-describeproblem) prints them:

```text
story.ava · scene ava.hi · gated on unknown scene "ava.hello"
mod:night-market · action browse · spends unknown stat "stamina"
mod:night-market · trigger parcel · unknown kind "drawer"
mod:night-market · locations yard · no prose for "place.yard"
mod:new-menu · entity dish:pie · no dish stat named "coins"
content · stat service · derive goes round in a cycle: service → mood → service
```

## See it in an example

- All three examples build their game with `loadGame` from the content in their `world/` and `story/` folders. Small Town's [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) loads the player's unlocked content and mods over it as packs, `loadGame(content, { ... }, { packs: [...unlocked, ...mods] })`.
- [`examples/showcase/mods/fog-season.json`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/mods/fog-season.json) is a pack that adds to the high street's `street.weather` variants and replaces the park's prose, which shows how a pack merges.
