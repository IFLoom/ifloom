---
title: "The words table"
description: "A pack's words table gives other words to each field a player reads by its key, and translatableFields lists those keys."
---
The words table is a pack's `words`, which gives other words to the fields of your content that a player reads, each by its key. Every such field is [written in place](/docs/0.1.0/reference/glossary#words-in-place), such as a choice's `label`, an entity's `name` or a `{ text }` block, so a translation is one pack with this table, its `prose` and its `strings`. [Translate your game](/docs/0.1.0/how-to/translate-your-game) makes one, and [Content and packs](/docs/0.1.0/explanation/content-and-packs) explains how a pack goes over the content.

```ts
import { translatableFields, type WordField, type WordPart, type WordShape } from '@ifloom/engine'
```

## words

The `words` key of a [`Pack`](/docs/0.1.0/reference/content#pack), other words for content's fields by key. Every form is in [`Pack`](/docs/0.1.0/api/engine#pack).

[`loadGame`](/docs/0.1.0/reference/content#loadgame) lays the table over the content once everything is merged, and a later pack's words go over an earlier one's. The game's content files stay as they are. A key is the path to the field in content, with each list entry named by its id.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

export const french: Pack = {
  id: 'lang:fr',
  schema: SCHEMA,
  words: {
    'action.wait.label': 'Attendre un peu',
    'entity.character:ava.description': 'Tient le café',
    'scene.cafe.counter.title': 'Le comptoir',
    'scene.cafe.counter.text.intro': 'Ava lève les yeux de la caisse.',
    'scene.cafe.counter.choice.tea.label': 'Une théière',
  },
  prose: { 'cafe.menu': 'Thé, café, tartines.' },
}
```

| Key | Meaning |
|---|---|
| `action.wait.label` | An action's label, and `action.tip.labels.<hash>.label` a label under a condition. |
| `action.tip.blocked.<hash>.reason` | An action's refusal, beside `action.tip.once.reason` and `action.tip.irreversible`. |
| `scene.cafe.counter.title` | A scene's title. |
| `scene.cafe.counter.choice.tea.label` | A choice in a scene, in its ending choices or at a decision. |
| `scene.cafe.counter.text.intro` | A `{ text }` block or `say` line, by its `id` or a hash of its words. |
| `scene.cafe.counter.alt.<hash>` | A picture's `alt`, beside `scene.cafe.counter.fold.<hash>` for a fold's label. |
| `scene.flat.picture.hotspots.door.label` | A hotspot's label on a scene's picture. |
| `action.wait.notify.<id>.title` | A notice an effect raises, beside its `.text`. |
| `action.sketch.create.<hash>.name` | The name a `create` effect gives what it makes, beside its `.description`. |
| `action.snap.feed/post.<hash>.text` | Words in a plugin's effect, as its calls declare with [`arg.words()`](/docs/0.1.0/reference/plugin-calls). |
| `entity.character:ava.name` | An entity's name, beside its `.description`. |
| `kind.staff.label` | A kind's label, beside its `.plural`. |
| `entity.location:cafe.traits.places/location.blocked.<hash>.reason` | A trait's words on an entity, and `kind.vendor.traits.…` the words a kind's trait gives. |
| `stat.coins.label` | A stat's label, beside `.format` (or `.format.one` and `.format.other`), `.lacking` and `.levels.notice`. |
| `storyline.ava.name` | A storyline's name. |
| `setting.difficulty.label` | A setting's or an input's label, and `setting.difficulty.options.hard.label` an option's. |
| `lock.<id>.reason` | A lock's reason, beside `saveable.<id>.reason`. |
| `timer.phone.label` | A timer's label. |
| `minigame.arrows.title` | A minigame's title, beside `minigame.arrows.states.round.label`. |
| `phrase.outfit.verdict.0` | A [phrase](/docs/0.1.0/reference/phrases)'s row, counted from 0. |
| `quests/quests.coffee.name` | A plugin's content, `<plugin>/<list>.<id>.<field>`. |

A key stays put while you rearrange a scene. Every choice is `scene.<scene>.choice.<id>` wherever it stands, and every block of words is `scene.<scene>.text.<id>`, in the body, a section or a choice's `then`. A notice's key holds its `id`, or a hash of its title and text. An entry of a list with no id, such as a `blocked` entry, takes its `value`, else a hash of its words, else its place in the list. Blocks, choices and notices in an entity's trait take keys under the entity the same way.

A block with no `id` takes six hex digits of a hash of its words as its key, so changing the words changes the key and the old translation names no field. The loader reports that key, which says the line needs translating again. A block with an `id` keeps its key whatever its words, and two blocks with the same words in one scene share one key.

The table leaves out these words, which a pack gives elsewhere:

- Lines read by key, `{ prose }` blocks, variants, a pool's and a tooltip's lines and the React UI's modal, which the pack's `prose` translates under the same keys.
- The engine's and plugins' own lines, which the pack's [`strings`](/docs/0.1.0/reference/strings) translate.
- UI hints, carried as written, apart from a fold's label.
- A plugin call's arguments its plugin doesn't declare with `arg.words()`.
- A generator's pools, whose values a condition can read. A translated game gives its own pools in a pack.

## WordField

One field of a game's content that a player reads, with its key in the words table, its words now and where it is. Every field is in [`WordField`](/docs/0.1.0/api/engine#wordfield).

`text` holds the words as written, tokens and markup included. `where` names the field as a problem names it, such as `'scene cafe.counter'`.

```ts fragment
{ key: 'action.wait.label', text: 'Wait a while', where: 'action wait' }
```

## WordShape

The fields of a piece of content that are words, for a plugin to say of its own data and traits. Every form is in [`WordShape`](/docs/0.1.0/api/engine#wordshape).

A plugin gives one for each list of its `data` in its [data lists](/docs/0.1.0/reference/plugin-calls), and a trait gives one in its [`TraitDef`](/docs/0.1.0/api/engine-plugin#traitdef)'s `words`. Every first-party plugin declares its own, so a quest's name and hints, a location's room text and a person's pronouns are in the table. A field no plugin declares isn't.

```ts
import { defineData, definePlugin, list } from '@ifloom/engine/plugin'
import type { QuestDef } from '@ifloom/plugin-quests'

const DATA = defineData('quests', {
  quests: list<QuestDef>({ noun: 'quest', words: { name: true, description: true, stages: [{ hint: true }] } }),
})

export const quests = definePlugin<null>({ id: 'quests', version: 1, data: DATA, traits: [{ id: 'quests/giver', words: { greeting: true } }] })
```

## WordPart

What one field of a `WordShape` holds. Every form is in [`WordPart`](/docs/0.1.0/api/engine#wordpart).

| Kind | Meaning |
|---|---|
| `true` | A field of words, or a record of them, such as a stat's `{ one, other }` or a person's `pronouns`. |
| `'blocks'` | A list of blocks, such as a scene's body, with its words, pictures' `alt`, folds and choices. |
| `'effects'` | A list of effects, with the words of the notices they raise. |
| `'button'` | A button, as an action is, with its label, labels, refusals, once reason, warning and effects. |
| A `WordShape` | An object's own fields. |
| `[part]` | A list of entries, each named by its id. |
| `{ '*': part }` | A record of entries, each named by its key. |

## Functions

### translatableFields

Returns every field of a game's content that a player reads, each once, by its key, with its words now and where it is. Its signature is in [`translatableFields`](/docs/0.1.0/api/engine#translatablefields).

It lists the fields of every storyline, trigger, scene, minigame, timer, action, input, setting, stat, kind and entity, lock, saveable reason and phrase, in that order, then each plugin's content. A field several entities share, such as a kind's trait default, is listed once. [`ifloom words`](/docs/0.1.0/reference/cli#ifloom-words) prints the list, and `ifloom words --out words.en.json` writes it as a table.

```ts
import { loadGame, translatableFields } from '@ifloom/engine'
import { town } from './world/town.ts'

const { game } = loadGame([town], { id: 'small-town', title: 'Small Town' })
export const table = Object.fromEntries(translatableFields(game).map((field) => [field.key, field.text]))
```

## Checks

[`loadGame`](/docs/0.1.0/reference/content#loadgame) and [`checkGame`](/docs/0.1.0/reference/checks) check every words table:

| Problem | Cause |
|---|---|
| `names no field the game has (translatableFields lists every key)` | A key in a pack's `words` is misspelt, or names a block whose words changed since it was translated. The problem is pinned on the pack that brought the key. |
| `two fields with different words share the words key "…"; give a block of words an id, or rename one` | Two blocks in one scene have the same `id`, or two ids join into one key. |

## Caveats

- On a game loaded with a translation, a block with no `id` has the translated words, and so a key made from them. List the fields from the game in the language you write it in.
