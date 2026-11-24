---
title: "Translate your game"
description: "How-to for a translation as one pack: list every field a player reads with ifloom words, fill in a words table, translate the prose and the strings, load the pack in the page, and check its keys."
---
Use this to make your game readable in another language. A translation is one [pack](/docs/reference/glossary#pack) with three tables. Its `words` give other words to every label, name and line your content writes in place. Its `prose` translates the lines read by key, and its `strings` the engine's and plugins' own lines. You keep writing the game in one language, and the pack lays the other words over it as the game loads.

## List what to translate

Run [`ifloom words`](/docs/reference/cli#ifloom-words) with `--out` to write every field a player reads as a table to translate from:

```sh
npx ifloom words --out words.en.json
```

It builds the game from its game module with no packs, and writes each field's key and its words. For a game with one scene and an action, `words.en.json` reads:

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

Each key is the path to the field, with each list entry named by its id. [The words table](/docs/reference/words#words) lists every form. A block of words with an `id`, such as `text('Ava looks up from the till.', { id: 'intro' })`, is keyed by it. One without is keyed by six hex digits of a hash of its words, which change when the words do. Give long or often-edited blocks an `id` to keep their key when you fix a typo.

## Translate the words

Copy the table into a pack's `words` and translate the values. Keep the keys, the tokens (`{{playerName}}`) and the markup (`@ava:`, `[[act:tea]]`, `**`) as they are:

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

## Translate the prose and the strings

Add the two other tables to the same pack:

- **`prose`** translates the lines read by key, by the same keys: `{ prose }` blocks, variants, pools, tooltips and the React UI's popups.
- **`strings`** translates the engine's and plugins' own lines, such as `Not enough coins.` and the calendar's day names. [Strings](/docs/reference/strings) lists every key, and each plugin's page lists its own under `## Strings`.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

export const french: Pack = {
  id: 'lang:fr',
  schema: SCHEMA,
  prose: { 'place.cafe': 'Six tables, dont une bancale.' },
  strings: { finishFirst: 'Finissez ceci d’abord.', 'calendar/period.morning': 'matin' },
}
```

A plugin's line is keyed by the plugin's id, a `/` and the line's name, as in `'calendar/period.morning'`. The React UI's own words, such as its menu, are strings too, under keys that start with `ui.`, listed in [The React UI's strings](/docs/reference/react#strings).

## Load it in the page

Choose the language in the page, before the game starts, and pass the pack to the game module's `build`. A game made from a template passes `unlocked` to `loadGame` as its `packs`:

```ts
// src/language.ts
import type { Pack } from '@ifloom/engine'
import { french } from './lang/fr.ts'

/** The translation to load over the content, from the browser's language. */
export const translation: Pack[] = navigator.language.startsWith('fr') ? [french] : []
```

Then build the game with `module.build({ unlocked: translation })` where the page builds it, in `src/main.ts`. Leave the translation out of `build` itself, so `ifloom words` lists the words you write in. The language can also come from a choice on a first page, or from a setting the player changes, followed by a reload.

A save records the packs it was made with, so a save made in French names `lang:fr`. It loads in English too, since a translation changes no ids. A translation can also ship as a [mod](/docs/how-to/let-players-add-mods), a mod file whose pack holds the same tables.

## Check it worked

`npm run check` builds the game without the translation, so check the pack in a test. [`loadGame`](/docs/reference/content#loadgame) reports every key in the table that names no field:

```ts
// tests/french.test.ts
import { expect, it } from 'vitest'
import module from '../src/game.ts'
import { french } from '../src/lang/fr.ts'

it('names only fields the game has', () => {
  expect(module.build({ unlocked: [french] }).problems).toEqual([])
})
```

A failing key reads `lang:fr · words scene.cafe.counter.text.4c1f0a · names no field the game has`. It's misspelt, or names a line whose words changed since it was translated. List the fields again with `ifloom words` and translate the new line. Then load the page with your browser set to French.

A few words stay as they are:

- **The player's own words.** A name the player types, or a post they make, is kept as written.
- **Calls a plugin doesn't declare as words.** A plugin marks the arguments it translates with [`arg.words()`](/docs/reference/plugin-calls), and a generator's pools aren't in the table. Replace the entry that holds them with a pack of its own.

For more, see:

- [The words table](/docs/reference/words) and [`translatableFields`](/docs/reference/words#translatablefields).
- [Strings](/docs/reference/strings) and [`ifloom words`](/docs/reference/cli#ifloom-words).
- [Why a game's files are content and a mod is a pack](/docs/explanation/content-and-packs#why-a-games-files-are-content-and-a-mod-is-a-pack).
