---
title: "Schema history"
description: "Each change to the content format and what upgradePack rewrites in an older pack, schema by schema."
---
A [pack](/docs/0.1.0/reference/glossary#pack), such as a mod, records the [`SCHEMA`](/docs/0.1.0/reference/content#schema) it was written for, and [`upgradePack`](/docs/0.1.0/reference/content#upgradepack) carries an older one forward when [`loadGame`](/docs/0.1.0/reference/content#loadgame) loads it. This page lists what each schema changed, and so what the upgrade rewrites. Your own content isn't upgraded, so the [content checker](/docs/0.1.0/reference/checks) reports what it finds in an older form. [Content, packs and the base](/docs/0.1.0/explanation/content-and-packs) explains why. In the showcase, Small Town, `examples/showcase/src/game.ts` lays the player's mods over the content with `loadGame`, which upgrades each one.

## How a pack is carried forward

`SCHEMA` is 30, and the oldest pack `upgradePack` reads is schema 4. The engine keeps one step for each schema that changed what it reads, keyed by the schema it upgrades from, and runs them in order. Each first-party plugin carries its own content with its [content migrations](/docs/0.1.0/reference/plugin-migrations#contentversion-and-contentmigrations), numbered by the engine's schema. Before the engine's step from each schema, every plugin's steps keyed by that schema or below run, and the rest run after the engine's last.

A schema with no engine step changed only what a plugin reads, so a pack goes through it unchanged unless that plugin is in the game. Schemas 7, 8, 12, 14, 24 and 29 are these. A plugin left out of the list given to `upgradePack` leaves its content as it was.

## Schemas

Each schema below lists what the step to it rewrites, the first-party plugins' steps included. A pack upgraded with those plugins comes out as described.

### Schema 5

Flags become the [kv store](/docs/0.1.0/reference/state#kv). `{ flag }` and `{ storylineFlag }` conditions become `{ kv }` and `{ storylineKv }`, and schema 19 later folds `storylineKv` into `kv`. The `flag` effect becomes `kv`, with `value` as `to` and `add` as `by`, and `storylineFlag` becomes `storylineKv` with `to`. A `flags` record on an entity, a character, a generator template or a `create` effect becomes `kv`, and an input's `variable` becomes `key`. Prose, strings, variants and code are left alone.

### Schema 6

Content follows one naming rule, so an effect names its target by its noun, as [Effects](/docs/0.1.0/reference/effects#effect) and [Commands](/docs/0.1.0/reference/commands#command) describe. The step makes these renames:

- `stat`'s `key` becomes `stat`, and `setStat` becomes `stat` with `to`.
- `item`'s, `scene`'s and `minigame`'s `id` becomes `item`, `scene` and `minigame`.
- `storylineKv`'s and `closeStoryline`'s `id` becomes `storyline`, and `remove`'s `of` becomes `entity`.
- `collect`'s `to` and `discard`'s `from` become `collection`, and `discard`'s `id` becomes `entry`.
- `phase`'s `value`, `audio`'s `track` and `minigameVar`'s `value` become `to`, and `minigameVar`'s `add` becomes `by`.
- `{ has }` becomes `{ item }`, `{ turn: true, gte }` becomes `{ turn: { gte } }`, and a `{ collection }` condition's `id` becomes `entry`.
- `{ counter }` and `storylineKv`'s inner `is` become one `{ storylineKv }`.
- The `use` command's `itemId` becomes `id`, and `setting`'s and `input`'s `value` becomes `to`.

The first-party plugins' renamed arguments follow, such as `places/go`'s `to`, which becomes `id`, and the calendar's `calendar/pass`, which takes `by` for `periods`. An activity's or a job's `requires` becomes `blocked`, with each `when` turned round, and a place's or an app's `locked` becomes `blocked`.

### Schema 7

A plugin call's arguments are always an object, as [`PluginCall`](/docs/0.1.0/reference/custom#plugincall) describes. The first-party calls that took a bare value name it: `{ 'places/at': ['cafe'] }` becomes `{ 'places/at': { location: ['cafe'] } }`. The same goes for `places/within` and `places/move` (`location`), `cast/here` and `cast/met` (`character`), `calendar/period` (`period`), `calendar/weekday` (`day`) and `calendar/pass` (`by`).

Values take arguments instead of holding them in their names. An app's badge `{ count: 'messages/unread-texts' }` becomes `{ value: 'messages/unread', with: { channel: 'texts' } }`, `feed/unseen-<feed>` becomes `feed/unseen` with `{ feed }`, and any other `count` becomes `value`. Prose and strings get the same change in their tokens, so `{{v:messages/unread-texts}}` becomes `{{v:messages/unread channel=texts}}`. The plugins' own steps make this change, and the engine has none.

### Schema 8

The timed-effects plugin is the [statuses plugin](/docs/0.1.0/reference/plugins/statuses). `effects/active`, `effects/apply` and `effects/remove` become `statuses/active`, `statuses/apply` and `statuses/remove`, and a condition's or an effect's `effect` becomes `status`. Its content moves from `data.effects.effects` to `data.statuses.statuses`, and its strings from `effects/…` to `statuses/…`. The statuses plugin's own step makes this change.

### Schema 9

An item's `kind` and a place's `kind` become tags: `{ kind: 'stuff' }` becomes `{ tags: ['stuff'] }`, and a place's `'street'`, `'venue'` or `'room'` the same way. An item that was `'gear'` with no `start` also gets `start: 1`, since gear started at one.

### Schema 10

A choice in a scene is named `scene#choice`, so `{ chose: 'ch1.mat/open' }` becomes `{ chose: 'ch1.mat#open' }`. Prose keys are the game's own names, which code can hold too, so the step leaves them as they are.

### Schema 11

A stat's hidden `bands` become [levels](/docs/0.1.0/reference/stats#statlevels) the player isn't shown. `bands: [10, 20]` becomes `levels: { at: [10, 20], hidden: true }`, and `{ tier: 'charm', gte: 2 }` becomes `{ level: 'charm', gte: 2 }`. A stat that had both keeps its `levels` and loses its `bands`.

### Schema 12

The [feed plugin](/docs/0.1.0/reference/plugins/feed#values)'s value `feed/unseen` becomes `feed/unread`, in a value's name, such as a badge's `{ value: 'feed/unseen' }`, and in tokens, such as `{{v:feed/unseen feed=social}}`. The feed plugin's own step makes this change.

### Schema 13

Items and collections become [entities](/docs/0.1.0/reference/entities#holder-and-placement). The step rewrites these parts of a pack:

- A pack's `items` become entities of an `item` kind, which the pack declares unlisted unless it already declares it. Each keeps its `id`, `name`, `desc` and `tags`, its `start` becomes `at: { player: start }`, and its `use` becomes the [inventory plugin](/docs/0.1.0/reference/plugins/inventory)'s `inventory/usable` trait.
- A `collections` entry becomes an unlisted kind of the same id and name, and the phone's `gallery` becomes `photo`.
- `{ item: 'tea', gte: 2 }` becomes `{ entity: 'item:tea', at: 'you', gte: 2 }`, and the `item` effect becomes the `entity` effect with `at: 'you'`.
- The `use` command becomes `{ 'inventory/use': { id: 'item:tea' } }`.
- `collect` becomes `create`, given to the player, with the entry's `title` as its name, its prose as its description, its `image` and its `data` as kv. `discard` becomes `remove`.
- `{ collection, entry }` becomes `{ entity: '<kind>:<entry>' }`, and `{ collection, …range }` counts what the player holds of the kind.
- A shop good's `item`, and the `item` of `shop/buy`, `shop/sell`, `shop/inStock` and `wardrobe/wearing`, become `entity` with `item:` in front, as do `wardrobe/wear`'s `id` and a wardrobe slot's `start`.
- `data.wardrobe.clothes` becomes rows of the `wardrobe/wearable` trait in the pack's `traits`, and `debug/item` becomes `debug/held`.
- The strings `doesNothing` and `haveNone` become `inventory/doesNothing` and `inventory/haveNone` (and `wardrobe/haveNone`), with `{item}` written `{thing}`.

### Schema 14

The [cast](/docs/0.1.0/reference/plugins/cast#persondef)'s characters are entities with the `cast/person` trait. Each entry of `data.cast.characters` becomes an entity of the kind `character`, after the pack's own entities. It keeps its `id`, `name`, `tags`, `stats` and `kv`, its `role` becomes `desc` and its `portrait` becomes `image`, and everything else becomes the trait. `data.cast.characters` goes, and the cast's own step makes the change.

### Schema 15

A [kind](/docs/0.1.0/reference/entities#kinddef)'s named conditions are its `flags`, so `{ id: 'staff', marks: { senior: … } }` becomes `{ id: 'staff', flags: { senior: … } }`.

### Schema 16

Presentation is the UI's, written as [ui hints](/docs/0.1.0/reference/ui-hints) in the React UI's words. The step makes these changes:

- A scene's and a place's `transition` becomes `ui.transition`, and a scene's `frame` goes.
- A block's `reveal` becomes `ui.reveal`.
- `[[reveal]]` on a line of its own, in a `{ text }` block's prose, splits that prose there. The words before it keep the key, and each part after it gets a key of its own (`<key>.2`, `<key>.3`) and a block with `ui.reveal`, under the same `when`. The step takes `[[reveal]]` out anywhere else, and the words show at once.
- A `transition` effect in a choice's effects becomes that choice's `ui.transition`, and is dropped anywhere else.
- A stat's `display` becomes `ui.display`.
- The cast's `hue`, on a `cast/person` trait, becomes the entity's or the kind's `ui.hue`. A `traits` row's `hue` moves to the pack's own entity of that reference, or is dropped when the pack doesn't declare it.

### Schema 17

A scene's `panel: 'prices'` becomes `panel: { panel: 'prices' }`, a [scene's panel](/docs/0.1.0/reference/panels#scenepanel), and its `panelData` goes.

### Schema 18

The game's own code is its [`rules`](/docs/0.1.0/reference/rules), called as a plugin's is, with `game` in front. `{ custom: 'tired' }` becomes `{ 'game/tired': true }`, and with `with`, `{ 'game/tired': with }`. A plugin's call written `{ custom: 'quests/done', with }` becomes its short form. A `{ kind: 'custom', name }` effect names `game/<name>` when the name has no plugin, a value `{ value: 'payroll' }` names `game/payroll`, and `{{v:payroll}}` becomes `{{v:game/payroll}}`. A pack's own `custom` functions are code, which a pack can't hold, so the loader reports them.

### Schema 19

The kv store names whose store it reads in `of`, as the [`kv`](/docs/0.1.0/reference/conditions#kv) condition describes. The step makes these changes:

- `{ storylineKv: { storyline: 'baker', key: 'visits' }, gte: 3 }` becomes `{ kv: 'visits', of: 'storyline:baker', gte: 3 }`, and the `storylineKv` effect becomes a `kv` effect with that `of`.
- `{ minigameVar: 'score' }` becomes `{ kv: 'score', of: 'minigame' }`, and so does its effect.
- The phase is the kv key `phase`. `{ phase: ['open'] }` becomes `{ kv: 'phase', is: ['open'] }`, the `phase` effect becomes a `kv` effect on `phase`, and `startPhase: 'arrival'` becomes the starting kv `kv: { phase: 'arrival' }`.
- In prose and strings, `{{n:baker.visits}}` becomes `{{kv:visits of=storyline:baker}}`.

### Schema 20

Each entry of `activities` becomes an [action](/docs/0.1.0/reference/actions#actiondef) with no label, its `cost`, `blocked` and `effects` as they were. An action the pack declares with the same id, whose command did that activity, takes them in place of its command. `{ type: 'activity', id }` becomes `{ type: 'action', id }` wherever a command is, and a lock's `deny` and `except` name `'action'` for `'activity'`.

### Schema 21

Effects are told apart by their key, as conditions are, and [Effects](/docs/0.1.0/reference/effects#effect) describes each. The step makes these changes:

- `{ kind: 'stat', stat, by }` becomes `{ stat, by }`, and `{ kind: 'kv', key: 'met', to }` becomes `{ kv: 'met', to }`.
- `{ kind: 'scene', scene }` becomes `{ scene }`, `{ kind: 'scene', from, otherwise }` becomes `{ scene: { from, otherwise } }`, and `{ kind: 'turn' }` becomes `{ turn: true }`, or `{ turn: { by } }` with `by`.
- `remove`, `move` and `you` name their entity in their key, `closeStoryline` its storyline, `notify` its title, `audio` its channel, `sound` its track and `roll` its key.
- `create`'s `of` becomes its key and its `entity` becomes `with`. `each`'s `of` becomes its key, or a [`Select`](/docs/0.1.0/reference/entities#select) with `at`, `tag` or `trait`.
- A call, `{ kind: 'custom', name, with }`, becomes its short form.
- An input's and a setting's `kind` becomes `type`.

The plugins whose content holds effects (statuses, devices, inventory, jobs, places, messages and cheats) rewrite theirs too, and so do the effects in entities' traits.

### Schema 22

The engine's [beats](/docs/0.1.0/reference/prose#scenebeat) are text, speech, pictures, video and sound, and the look of a letter or a sign is the UI's. In prose and strings, `[[mail]] … [[/mail]]` becomes the React UI's [UI piece](/docs/0.1.0/reference/prose#ui-pieces) `[[ui:mail|body|From: …|Subject: …]]`. `[[sticky]]`, `[[clip]]` and `[[diary]]` become `[[ui:prop|words|sticky]]` and so on, and a paragraph starting `> ` becomes `[[ui:mono|words]]`, each a paragraph of its own. Words a piece can't hold, such as a `|` or a `]`, stay as plain paragraphs.

A picture's `rot` flag goes, and a `{ text }` block whose line had one gets the React UI's block hint `ui: { tilt: true }`. A choice's `labels` entries name their words `label` (was `key`), as every [button](/docs/0.1.0/reference/actions#buttondef)'s do. A minigame's `vars` become its `kv`, the store `{ kv, of: 'minigame' }` reads.

### Schema 23

[Speech](/docs/0.1.0/reference/prose#speech) names who says it by id, `@ava: "…"`, and the view shows their name from their entity. In `prose` and in scenes' `{ words }` blocks, a line written `Ava: "…"` becomes `@ava: "…"` when exactly one entity in the context or the pack has that name. The step writes the bare id when that reads as the entity, a `character` or the one entity with that id, else the full reference, `@staff:jo:`. `You:`, or a line under the game's or the pack's string `you`, becomes `@you:`. A name no entity has, or one two entities share, stays a labelled line with no speaker.

### Schema 24

The [places plugin](/docs/0.1.0/reference/plugins/places#location)'s locations and the [shop](/docs/0.1.0/reference/plugins/shop#vendor)'s vendors are entities with their plugin's trait. Each entry of `data.places.locations` becomes an entity `{ of: 'location', id, name, desc, image, tags, traits: { 'places/location': { … } } }`. Its old `tag` becomes the `desc` and its `art` the `image`, an empty one dropped, and `{{v:places/tag}}` becomes `{{v:places/desc}}`. Each entry of `data.shop.vendors` becomes `{ of: 'vendor', id, name, traits: { 'shop/vendor': { … } } }`. They follow the pack's own entities, and `data.places` and `data.shop` go once nothing is left in them. Each plugin's own step makes the change, and saves need nothing, because the entities were `location:<id>` and `vendor:<id>` before too.

### Schema 25

The words a player reads are written in place, as [The words table](/docs/0.1.0/reference/words) describes. The step makes these changes, wherever a block is, in scenes, patches, plugin `data` and entities' traits:

- A block of words written in place, `{ words }`, becomes `{ text }`, and a block that read the prose by key, `{ text: key }`, becomes `{ prose: key }`.
- A label that is a prose key becomes that prose's words. That covers a choice's, an action's or a `labels` entry's, in a scene, an action or a plugin's buttons, a `notify` effect's `text` and a minigame state's `label`.
- A scene's choice with no label gets the words of the prose `<scene>#<choice>` it read.
- The [messages plugin](/docs/0.1.0/reference/plugins/messages)'s replies get `label` from `<message>#<reply>`, and the [feed](/docs/0.1.0/reference/plugins/feed)'s `feed/post` and `feed/react` their `text`'s words.

The words come from the pack's own prose, else the prose under it in the context. A key neither has is left as written, and reads as those words. A choice with no label and no prose shows its id.

### Schema 26

A thing's line is its `description` and a heading its `title`. An entity's `desc`, in `entities` and in a `create` effect's `with`, becomes `description`, and a minigame's `label` becomes its `title`. The `words` table's `entity.<ref>.desc` and `minigame.<id>.label` follow. The plugins' own steps rename theirs:

- A quest's `title` and `summary` become its `name` and `description`.
- A status's `label` and `summary` become its `name` and `description`, and its `onStart`, `eachTurn` and `onEnd` become its `effects: { start, turn, end }`.
- An achievement's, a job's and a rank's `title`, and a cheat's and an unlock's `label`, become their `name`.
- A generator template's `desc` becomes its `description`, and the value `places/desc` becomes `places/description`.
- The cast's `offstage`, for someone nowhere on the map, becomes `away`, the cast's `AWAY`.

### Schema 27

A `variants` block's `art`, the variants a member's picture is drawn from, becomes `image`, and a weighted variants member `{ text: key, weight }` becomes `{ prose: key, weight }`. A trigger's `once: 'game'` or `'turn'` becomes `{ per: 'game' }` or `{ per: 'turn' }`, the one [`Once`](/docs/0.1.0/reference/actions#once) shape. The plugins' own steps change these:

- A [cheat](/docs/0.1.0/reference/plugins/cheats#cheatdef)'s `once: true` becomes `{ per: 'game' }`.
- A [vendor](/docs/0.1.0/reference/plugins/shop#vendor)'s `hours`, `open` and `closed` become its `blocked` entries: `{ when: { 'shop/outside': { period: hours } }, reason }` and `{ when: { not: open }, reason }`. The reason is `closed`, else `{ string: 'shop/closed' }`.
- A [device](/docs/0.1.0/reference/plugins/devices#section)'s app section of words, `{ prose: [...] }`, becomes `{ blocks: [...] }`.

### Schema 28

"Stage" means only a quest's stage. A scene's layered picture with hotspots, `stage`, becomes its [`picture`](/docs/0.1.0/reference/scenes#picture), and the `words` table's `scene.<id>.stage.hotspots.<hotspot>.label` becomes `scene.<id>.picture.hotspots.<hotspot>.label`. The [places plugin](/docs/0.1.0/reference/plugins/places#location)'s own step does the same for a location's `stage`, on an entity, on a kind or in a `traits` row, and for its words keys.

### Schema 29

`devices/close` puts a [device](/docs/0.1.0/reference/plugins/devices#devicesclose) away, and `devices/home` takes it back to its home screen, which `devices/close` did before. The devices plugin's own step rewrites a `devices/close` call in a pack as `devices/home`, and its command step does the same in a command log. Your own content isn't upgraded, so write `devices.home(device)` where you meant the home screen.

### Schema 30

Values print with a bare token. In every string of the pack but its code, `{{v:game/payroll}}` becomes `{{payroll}}`, and `{{v:messages/unread channel=texts}}` becomes `{{messages/unread channel=texts}}`, as [Tokens](/docs/0.1.0/reference/prose#tokens) describes. A game's value whose name starts with a digit or a `-` keeps its `{{v:…}}`, which still prints. [Phrases](/docs/0.1.0/reference/phrases), the `cases` block and a minigame input's `label` came in with this schema too, and need no step.

## Command logs

A [command log](/docs/0.1.0/reference/runner#commandlog) records the `schema` and each plugin's `commandVersion` its commands were written for, and [`replay`](/docs/0.1.0/reference/runner#replay) carries an older log's commands forward. The engine has two command steps:

- **From schema 5.** The `use` command's `itemId` becomes `id`, and `setting`'s and `input`'s `value` becomes `to`.
- **From schema 19.** `{ type: 'activity', id }` becomes `{ type: 'action', id }`.

Each plugin carries its own commands with its [command migrations](/docs/0.1.0/reference/plugin-migrations#commandversion-and-commandmigrations), keyed by the version each step upgrades from:

- **5 → 6.** Cast, debug, devices, feed, jobs, messages, places, quests and wardrobe name a command's one target `id`, and debug also sets a value with `to`.
- **6 → 7.** The devices plugin's `devices/close` becomes `devices/home`.
- **7 → 8.** The timed-effects plugin's commands become the statuses plugin's, by the same name.
- **12 → 13.** The engine's `use` becomes `inventory/use` on the thing the item became, and the shop's, the wardrobe's and debug's commands name that entity, with `debug/item` becoming `debug/held`.

[Older saves](/docs/0.1.0/upgrading/old-saves#command-logs-from-older-engines) lists what a log from before logs kept versions does.

## Content written in an older form

Your own content is compiled against the engine you build it with, so TypeScript reports a field the engine renamed. Content that still type-checks in an older form, or a plain-JS game's, gets one of these problems from the content checker instead:

| Problem | Cause |
|---|---|
| `{ custom: "…" } is written in short now, as { "game/…": { … } }, or true for no arguments` | A condition or an effect calls code in the long form from before schema 18. It never holds, or does nothing. |
| `effects are told apart by their key now, as { …: … }, not { kind: "…" }` | An effect still has the `kind` field from before schema 21. It does nothing. |
| `` `{ words }` is `{ text }` now: a block of words written in place is `{ text: "…" }` `` | A block from before schema 25 holds `words`. |
| `{ text: "…" } names the prose "…", but a { text } block is words written in place now (schema 25): write the words, or { prose: "…" } to read that prose` | A `{ text }` block's words are a prose key the game has, as a block read them before schema 25. |
| `label "…" names the prose "…", but a label is words written in place now (schema 25): write the words` | A choice's or an action's `label` or `labels` entry, a minigame state's `label` or a reply's `label` is a prose key the game has. A `notify` effect's text and a `feed/post` or `feed/react` text get the same problem, starting `notice text`, `post` or `comment`. |
| `no label: its words are no longer read from the prose "…" (schema 25), so give it label: "…"` | A scene's choice, or a message's reply, has no `label`, and the game's prose has words under `<scene>#<choice>` or `<message>#<reply>`. With no label, it shows its id. |
| `[[reveal]] is no longer markup and would be shown as written; …` | Prose holds `[[reveal]]`, which schema 16 replaced with a block's `ui.reveal` hint. |
| `{{v:…}} is written {{…}} now: …` | A token names a value in the form from before schema 30. It still prints, and a pack's is rewritten. |
| `clothes are things with the wardrobe/wearable trait now: …` | Content holds a `data.wardrobe.clothes` list from before schema 13. Give each thing the `wardrobe/wearable` trait instead. |

Words with a space in them are never read as a prose key, so `label: 'Leave'` is never reported. [Upgrade IFLoom](/docs/0.1.0/upgrading) runs the checker as part of moving a game to a newer engine.
