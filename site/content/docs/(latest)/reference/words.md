---
title: "The words table"
description: "Give every label, name and line of a game other words with one pack: the words table, the key each field has, translatableFields, and how a plugin says which of its fields are words."
---
Every word a player reads in your content is written in place: a choice's `label`, an entity's `name`, a `{ text }` block in a scene. A translation gives those fields other words with one pack that carries a `words` table, keyed by field.

```ts
import { SCHEMA, translatableFields, type Pack, type WordField, type WordShape, type WordPart } from '@ifloom/engine'

const french: Pack = {
  id: 'lang:fr',
  schema: SCHEMA,
  words: {
    'action.wait.label': 'Attendre un peu',
    'entity.character:ava.description': 'Tient le café',
    'scene.cafe.counter.title': 'Le comptoir',
    'scene.cafe.counter.text.intro': 'Ava lève les yeux de la caisse.',
    'scene.cafe.counter.choice.tea.label': 'Une théière',
  },
  // Lines read by key, from `{ prose }` blocks, variants and pools, are translated in the pack's own prose.
  prose: { 'place.cafe': 'Six tables, dont une bancale.' },
}
```

[`loadGame`](/docs/reference/loader#loadgame) lays the table over your content once everything is merged, and a later pack's words go over an earlier one's. The game's content files stay as they are. A key that names no field is a [problem](#problems). [Translating a game](/docs/recipes/translating) walks through making one.

The words table is for the words in your content. The engine's and plugins' own words (refusals such as "You can't afford that", the calendar's day names) are [strings](/docs/reference/strings), which a pack overrides in its `strings` table, as before.

## Keys

A key is the path to the field, as your content writes it, with each list entry named by its id.

| Field | Key |
|---|---|
| An action's label | `action.wait.label` |
| A label that depends on state | `action.tip.labels.<hash>.label` |
| Why it's refused | `action.tip.blocked.<hash>.reason` |
| Its once-a-turn reason and warning | `action.tip.once.reason`, `action.tip.irreversible` |
| A scene's title | `scene.cafe.counter.title` |
| A choice in a scene, anywhere in it | `scene.cafe.counter.choice.tea.label` |
| A block of words in a scene | `scene.cafe.counter.text.intro`, or `scene.cafe.counter.text.<hash>` |
| A picture's `alt`, a fold's label | `scene.cafe.counter.alt.<hash>`, `scene.cafe.counter.fold.<hash>` |
| A hotspot on a scene's stage | `scene.flat.stage.hotspots.door.label` |
| A notice an effect raises | `action.wait.notify.<id or hash>.title` and `.text` |
| What a `create` effect names the thing it makes | `action.sketch.create.<hash>.name` and `.description` |
| Words in a plugin's effect, as its [`callWords`](/docs/reference/plugins#words) declare | `action.snap.feed/post.<hash>.text` |
| An entity's name and description | `entity.character:ava.name`, `entity.character:ava.description` |
| A kind's label and plural | `kind.staff.label`, `kind.staff.plural` |
| A trait's words on an entity | `entity.location:cafe.traits.places/location.blocked.<hash>.reason` |
| A trait's words a kind gives | `kind.vendor.traits.shop/vendor.blocked.<hash>.reason` |
| A stat's label, format and refusal | `stat.coins.label`, `stat.coins.format` (or `.format.one` and `.format.other`), `stat.coins.lacking`, `stat.coins.levels.notice` |
| A storyline's name | `storyline.ava.name` |
| A setting's or an input's label, and an option's | `setting.difficulty.label`, `setting.difficulty.options.hard.label` |
| A lock's reason, a saveable reason | `lock.<id or hash>.reason`, `saveable.<id or hash>.reason` |
| A timer's label | `timer.phone.label` |
| A minigame's title and a state's label | `minigame.arrows.title`, `minigame.arrows.states.round.label` |
| A plugin's content | `<plugin>/<list>.<id>.<field>`: `quests/quests.coffee.name`, `quests/quests.coffee.stages.order.hint` |

Some things are named so that a key stays put while you rearrange a scene:

- **Every choice** in a scene is `scene.<scene>.choice.<id>`, whether it's among the ending choices or at a decision in the body. A choice's id is unique in its scene.
- **Every block of words** written in place, `{ text }` or `say`, is `scene.<scene>.text.<id>`, wherever it sits: in the body, in a section, in a choice's `then`. Give a block an `id` (`text('…', { id: 'intro' })`) to name it. Without one, it's named by six hex digits of a hash of its words.
- **Every notice** an effect raises is `<entry>.notify.<id>`, by the notice's `id`, or a hash of its title and text. A `create` effect's words are `<entry>.create.<hash>`, and a plugin effect's `<entry>.<plugin>/<name>.<hash>`, each by a hash of its own words.
- **An entry of a list with no id**, such as a `blocked` entry or a `labels` entry, is named by its `value` (a setting's option), else a hash of its own words, else its place in the list.

Blocks, choices and notices in an entity's trait are named under the entity in the same way: a place's room text is `entity.location:cafe.text.<hash>`, and its button `entity.location:cafe.traits.places/location.actions.sit.label`.

### Words named by a hash

A block with no `id` has a key made from its words, so the key changes when you change the words, and a translation of the old words no longer names a field. The loader reports that key, which tells you the line needs translating again. If you'd rather fix a typo without that, give the block an `id`: its key then stays the same whatever its words are, and the old translation keeps applying.

Two blocks with the same words in one scene share a key, and a translation gives them both the same words.

### What isn't in the table

- **Lines read by key**: `{ prose }` blocks, `variants`, the lines a pool or a `[[tip:…]]` names, and the prose a `[[ui:modal|…]]` piece shows. Translate them in the pack's own `prose`, under the same keys.
- **Strings**: the engine's and plugins' own words, in the pack's `strings`.
- **UI hints**, which are carried as written, except a `fold()`'s label, which is the player's words.
- **A plugin call's arguments its plugin doesn't declare** in [`callWords`](/docs/reference/plugins#words). The feed's post and comment text are in the table; a call's ids aren't.
- **A generator's pools.** Their values can be names, but also kv values a condition reads, so translating one could change what the game decides. Give a translated game its own pools in a pack instead.

## translatableFields

```ts
function translatableFields(game: Game): WordField[]
```

Every field of a game's content a player reads, each once, by its key, with the words it has now and where it is. Call it on the game loaded without its translation packs, and you have the words to translate:

```ts
import { loadGame, translatableFields } from '@ifloom/engine'

const { game } = loadGame(content, base)
const table = Object.fromEntries(translatableFields(game).map((field) => [field.key, field.text]))
// { 'action.wait.label': 'Wait a while', 'scene.cafe.counter.title': 'The counter', … }
console.log(JSON.stringify(table, null, 2))
```

It lists the fields of every scene, action, storyline, kind, entity, stat, setting, input, lock, saveable reason, trigger, timer and minigame, the traits each plugin declares words for, and each plugin's content. A field is listed once even when several share its key, such as a kind's trait default that every entity of the kind has.

[`ifloom words`](/docs/cli#ifloom-words) prints this list for a game, and `ifloom words --out words.en.json` writes the table above to a file.

**Gotcha.** On a game loaded with a translation, a block with no `id` has the translated words, and so a key made from them. List the fields from the game in the language you write it in.

## WordField

```ts
type WordField = {
  key: string    // its key in a pack's `words` table: 'action.wait.label'
  text: string   // the words it has, as written, tokens and markup included
  where: string  // where it is, as a problem names it: 'scene cafe.counter', 'quests coffee'
}
```

## WordShape

```ts
type WordShape = { readonly [field: string]: WordPart }
type WordPart = true | 'blocks' | 'effects' | 'button' | WordShape | readonly [WordPart]
```

Which fields of a piece of content are words, for a plugin to say of its own content and traits. Each field of the shape is one of these:

| Part | Means |
|---|---|
| `true` | A field of words, or a record of them, such as a stat's `{ one, other }` or a person's `pronouns`. |
| `'blocks'` | A list of blocks, as a scene's body: its words, pictures' `alt`, folds and choices. |
| `'effects'` | A list of effects: the words of the notices they raise. |
| `'button'` | A button, as an action is: its label, labels, blocked reasons, once reason, warning and effects. |
| A shape | An object's own fields. |
| `[part]` | A list of entries, each named by its id. |
| `{ '*': part }` | A record of entries, each named by its key. |

A plugin gives one for each list of its `data` in its [`words`](/docs/reference/plugins#words), and a trait gives one for its data in its [`TraitDef.words`](/docs/reference/entities#traits):

```ts
definePlugin({
  id: 'quests',
  version: 1,
  words: { quests: { name: true, description: true, stages: [{ hint: true }] } },
  traits: [{ id: 'quests/giver', words: { greeting: true } }],
})
```

Every first-party plugin declares its own: the quests' titles, summaries and hints, a place's room text, buttons and refusals, a vendor's `closed`, a person's full name, pronouns and talk labels, and so on. A field a plugin doesn't declare isn't in the table.

## Problems

[`loadGame`](/docs/reference/loader#loadgame) and [`checkGame`](/docs/reference/checks) report:

| Problem | Where | Means |
|---|---|---|
| `names no field the game has (translatableFields lists every key)` | `words <key>` | The pack's key is misspelt, or names a block whose words changed since it was translated. |
| `two fields with different words share the words key "…"; give a block of words an id, or rename one` | The entry | Two blocks in one scene have the same `id`, or two ids join into the same key. |

The first is pinned on the pack that brought the key.
