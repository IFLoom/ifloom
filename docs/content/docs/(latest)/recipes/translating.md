---
title: "Translating a game"
description: "Make a translation of your game as one pack: list every field a player reads with ifloom words, fill in a words table, translate the prose and strings, and load it."
---
A translation is one [pack](/docs/reference/content#pack). Its `words` table gives other words to every label, name and line your content writes in place, its `prose` translates the lines read by key, and its `strings` the engine's and plugins' own words. This recipe makes a French translation of a small café game and loads it.

The words in your content stay where you wrote them. The pack only lays other words over them as the game loads, so you keep writing the game in one language and translations follow.

## 1. List what to translate

[`ifloom words`](/docs/cli#ifloom-words) lists every field a player reads, each with its key, its words and where it is. Write them out as a table to start the translation from:

```sh
npx ifloom words --out words.en.json
```

The command builds the game from its [game module](/docs/cli#the-game-module), with no translation loaded, and asks the engine's [`translatableFields(game)`](/docs/reference/words#translatablefields) for the fields. A script can do the same:

```ts
// scripts/words.ts: run with `node scripts/words.ts`
import { writeFileSync } from 'node:fs'
import { translatableFields } from '@ifloom/engine'
import module from '../src/game.ts'

const { game } = module.build()
const table = Object.fromEntries(translatableFields(game).map((field) => [field.key, field.text]))
writeFileSync('words.en.json', JSON.stringify(table, null, 2) + '\n')
```

For a game with one scene and an action, `words.en.json` reads:

```json
{
  "scene.cafe.counter.title": "The counter",
  "scene.cafe.counter.text.intro": "Ava looks up from the till.",
  "scene.cafe.counter.text.4c1f0a": "@ava: \"What can I get you?\"",
  "scene.cafe.counter.choice.tea.label": "A pot of tea",
  "scene.cafe.counter.choice.leave.label": "Leave",
  "action.wait.label": "Wait a while",
  "entity.character:ava.name": "Ava",
  "entity.character:ava.description": "Runs the café"
}
```

Each key is the path to the field, with each list entry named by its id. [The words table](/docs/reference/words#keys) lists them all.

A block with an `id` is keyed by it, `text('Ava looks up from the till.', { id: 'intro' })`, and one without is keyed by six hex digits of a hash of its words. A hash key changes when the words do, so the translation of an old line stops matching and the loader tells you. Give long or often-edited blocks an `id` if you'd rather keep their key when you fix a typo.

## 2. Translate the words

Copy the table and translate the values. Keep the keys, the tokens (`{{playerName}}`) and the markup (`@ava:`, `[[act:tea]]`, `**`) as they are:

```ts
// src/lang/fr.ts
import { SCHEMA, type Pack } from '@ifloom/engine'

export const french: Pack = {
  id: 'lang:fr',
  schema: SCHEMA,
  words: {
    'scene.cafe.counter.title': 'Le comptoir',
    'scene.cafe.counter.text.intro': 'Ava lève les yeux de la caisse.',
    'scene.cafe.counter.text.4c1f0a': '@ava: "Je vous sers quoi ?"',
    'scene.cafe.counter.choice.tea.label': 'Une théière',
    'scene.cafe.counter.choice.leave.label': 'Partir',
    'action.wait.label': 'Attendre un peu',
    'entity.character:ava.description': 'Tient le café',
  },
}
```

Leave out anything that reads the same, such as Ava's name. A field the table doesn't name keeps its words.

## 3. Translate the prose and the strings

The words table covers what's written in place. Two more tables cover the rest, in the same pack:

- **`prose`**: the lines read by key, from `{ prose: 'place.cafe' }` blocks, `variants`, pools, `[[tip:…]]` and the React UI's `[[ui:modal|…]]`. Give each key its translation.
- **`strings`**: the engine's and plugins' own words, such as `Not enough coins.` and the calendar's day names. [Strings](/docs/reference/strings) lists every key.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

export const french: Pack = {
  id: 'lang:fr',
  schema: SCHEMA,
  words: { /* … */ },
  prose: { 'place.cafe': 'Six tables, dont une bancale.' },
  strings: { notEnough: 'Pas assez de {stat}.', 'calendar/period.morning': 'matin' },
}
```

## 4. Load it

Pass the pack to [`loadGame`](/docs/reference/content#loadgame) in `packs`, after any supporter content and before the player's mods:

```ts
// src/game.ts
import { loadGame, type Pack } from '@ifloom/engine'
import { french } from './lang/fr.ts'
import { town } from './world/town.ts'

export function build({ language = 'en' } = {}) {
  const packs: Pack[] = language === 'fr' ? [french] : []
  return loadGame([town], { id: 'small-town', title: 'Small Town' }, { packs })
}
```

The game decides which language to load, before it starts: from the browser's language (`navigator.language.startsWith('fr')`), from a choice on a first page, or from a setting the player changes, followed by a reload. A translation can also ship as a [mod](/docs/reference/mods) the player installs, a mod file whose `pack` holds the same tables.

A save records the packs it was made with, so a save made in French names `lang:fr`. It loads in English too: a translation changes no ids, only words.

## 5. Check it

`ifloom check`, or the problems `loadGame` returns, reports every key in the table that names no field:

```
lang:fr · words scene.cafe.counter.text.4c1f0a · names no field the game has (translatableFields lists every key)
```

That's a typo in a key, or a line whose words changed since it was translated, so its hash key moved on. List the fields again with `ifloom words` (step 1) and translate the new line.

## Gotchas

- **List the fields from the untranslated game.** On a game loaded with the French pack, a block with no `id` has French words, and so a key made from them.
- **Translate a block whole.** A `{ text }` block is one field, however many paragraphs it has. Split a long block into several, or give it an `id`, to keep each translation small.
- **The player's own words aren't translated.** A name the player types, or a post they make with the feed, is kept as written.
- **A plugin's call arguments aren't in the table.** The text of a post a `feed/post` effect makes, and a generator's pools, are written in the effect or the content. Translate them with a pack that replaces the action or the entry that holds them.
