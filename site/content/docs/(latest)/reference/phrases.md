---
title: "Phrases"
description: "Words for the middle of a sentence that change with the state, declared in content's phrases, grouped by name, and printed with a token such as {{outfit.verdict}}."
---
A phrase is a few words that change with the state, for the middle of a sentence. You declare it once in your content's `phrases`, as rows tried in order, and print it anywhere words go with a [token](/docs/reference/prose#tokens).

```ts
import type { Content } from '@ifloom/engine'

const flat: Content = {
  phrases: {
    outfit: {
      verdict: [
        { when: { 'wardrobe/wearing': { entity: 'clothing:suit' } }, text: 'sharp' },
        { when: { stat: 'energy', lt: 2 }, text: 'tired' },
        { text: 'fine, probably' },
      ],
    },
    weather: 'grey and close',
  },
  scenes: [
    {
      id: 'flat.mirror',
      body: [{ text: 'The mirror says you look {{outfit.verdict}}. Outside it is {{weather}}.' }],
      choices: [],
    },
  ],
}
```

With the suit on, the player reads "The mirror says you look sharp." Otherwise it's "tired" or "fine, probably", whichever row fits first.

## Phrases

```ts
type Phrases = { [name: string]: Phrase | Phrases }
type Phrase = string | PhraseRow[]
type PhraseRow = { when?: Condition; text: string }
```

The `phrases` key of [`Content`](/docs/reference/loader#content) and of a [`Pack`](/docs/reference/loader#pack).

- **A list of rows** is one phrase. Its rows are tried in order, and the first whose `when` holds gives the words. A row with no `when` always fits, so put one last as the otherwise.
- **A plain string** is a phrase with one row and no condition, for words you might change later or a mod might replace.
- **An object** is a group. Its keys are phrases, or more groups, as deep as you like.

A phrase's name is its path through the groups, joined with `.`: `outfit.verdict` above. Print it as `{{outfit.verdict}}`.

The words of a row are read as prose is, so they can carry tokens of their own, another phrase's included. A phrase that prints itself stops after a few rounds rather than going on for ever.

When no row fits, the phrase prints nothing at all. Give it a last row with no `when` if a gap would read badly.

## How a name is looked up

A bare token such as `{{weather}}` is looked up in this order:

1. A phrase of that name.
2. A [value](/docs/reference/custom#values) of that name in the game's `rules.values`.
3. A key of that name in the player's [kv store](/docs/reference/state#kv).

So code and content can share a group. A value in `rules.values` can be named `outfit.price`, beside the phrase `outfit.verdict`, and both print the same way.

A phrase also answers where a value is asked for by name, with `game/` in front: `{ value: 'game/outfit.verdict' }`. As an [amount](/docs/reference/amounts) it's read as a number, so that only makes sense for a phrase whose words are a number.

## game.phrases

```ts
phrases?: Record<string, PhraseRow[]>
```

[`loadGame`](/docs/reference/loader#loadgame) flattens what your content and packs declare into `game.phrases`, by full name, with a plain string turned into one row: `{ 'outfit.verdict': [...], weather: [{ text: 'grey and close' }] }`. A game you build by hand writes it this way.

Phrases merge by full name. Each is declared once across your content, and two files can add phrases to the same group. A pack's phrase replaces the one of that name whole, row list and all, and a pack can add new ones to a group:

```ts
const mod: Pack = { id: 'mod:posh', schema: SCHEMA, phrases: { outfit: { verdict: 'immaculate', hat: 'a felt cap' } } }
```

## Translating them

Each row's words are in the [words table](/docs/reference/words) under `phrase.<name>.<row>`, counting rows from 0: `phrase.outfit.verdict.0` is `sharp`. A translation gives each its words, and the conditions stay as they are.

## The checks

The [content checker](/docs/reference/checks) reports, under `phrase <name>`:

- a phrase with no rows, as `a phrase needs at least one row`
- a row after one with no `when`, as `row <n> has no when, so the rows after it are never shown`
- a row with no `text`
- a name that `rules.values` has too, since the phrase would always win
- a name inside a group that is also a phrase, such as `outfit` and `outfit.verdict` from two files
- whatever each row's `when` and words name that the game doesn't have, under `phrase <name> row <n>`

It also checks the tokens in your prose. A token with a group in its name, such as `{{outfit.verdit}}`, that names no phrase, value or kv key is reported. See [Tokens](/docs/reference/checks#tokens).

**Gotchas.**
- A phrase has no arguments. Words that change with who is spoken about, such as a character's pronoun, need a phrase for each, or a value in `rules.values` that takes `with`.
- A phrase is worked out each time it's printed, from the state now. A line the player read earlier is drawn again with the new words if the scene is drawn again, as any token is.
- A bare name has no `/`. `{{messages/unread}}` is the messages plugin's value, never a phrase.
