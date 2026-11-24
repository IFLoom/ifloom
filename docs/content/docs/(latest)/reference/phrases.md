---
title: "Phrases"
description: "Words for the middle of a sentence that change with the state, declared in content's phrases, grouped by name, with arguments if they need them, and printed with a token such as {{outfit.verdict}}."
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

```ts shape
type Phrases = { [name: string]: Phrase | Phrases }
```

The `phrases` key of [`Content`](/docs/reference/content#content) and of a [`Pack`](/docs/reference/content#pack).

- **A list of rows** is one phrase. Its rows are tried in order, and the first whose `when` holds gives the words. A row with no `when` always fits, so put one last as the otherwise.
- **A plain string** is a phrase with one row and no condition, for words you might change later or a mod might replace.
- **An object with `args` and `rows`** is a phrase that takes arguments. See [Arguments](#arguments).
- **Any other object** is a group. Its keys are phrases, or more groups, as deep as you like.

### Phrase, PhraseRow and PhraseWithArgs

One phrase as content writes it, one of its rows, and a phrase that takes arguments.

```ts shape
type Phrase = string | PhraseRow[] | PhraseWithArgs
type PhraseRow = { when?: Condition; text: string }
type PhraseWithArgs = { args: string[]; rows: PhraseRow[] }
```

A phrase's name is its path through the groups, joined with `.`: `outfit.verdict` above. Print it as `{{outfit.verdict}}`.

The words of a row are read as prose is, so they can carry tokens of their own, another phrase's included. A phrase that prints itself stops after a few rounds rather than going on for ever.

When no row fits, the phrase prints nothing at all. Give it a last row with no `when` if a gap would read badly.

## Arguments

A phrase that should change with who or what it's about takes arguments. Name them in `args`, and give its rows in `rows`:

```ts fragment
phrases: {
  mood: {
    word: {
      args: ['who'],
      rows: [
        { when: { stat: 'friendship', of: '$who', gte: 20 }, text: 'beams' },
        { when: { stat: 'friendship', of: '$who', lt: 5 }, text: 'shrugs' },
        { text: 'nods' },
      ],
    },
    greeting: {
      args: ['who', 'place'],
      rows: [
        { when: { 'cast/at': { character: '$who', at: '$place' } }, text: '{{cast/name character=$who}} waves from across the room' },
        { text: 'no sign of $who' },
      ],
    },
  },
}
```

A token passes them as `key=value` after the name, as it passes a value's arguments:

```md
Ava {{mood.word who=ava}} when you come in. {{mood.greeting who=ava place=cafe}}.
```

In a row's `when`, any string that is exactly `$` and an argument's name, such as `'$who'`, becomes what the token passed. The value is read as an entity, the way a [spoken line's id](/docs/reference/prose#speech) is:

- a bare id, `ava`, is `character:ava` if there is one, or else the one entity with that id;
- a full reference, `place:cafe`, is used as written;
- anything that names no entity, such as `Robin` or `3`, is passed as text or a number.

In a row's `text`, `$who` becomes the entity's name as the player reads it, with any tokens in the name filled, or the value as passed when it names no entity. Inside a token in the row, it becomes the reference instead, so `{{kv:mood of=$who}}` reads Ava's kv store and `{{mood.word who=$who}}` passes her on to another phrase. A fallback after a `|` gets the name.

Only the names in `args` are replaced. A price such as `$5`, or `$who` in a phrase that doesn't declare `who`, is left as written.

A [value reference](/docs/reference/amounts) passes arguments in its `with`: `{ value: 'game/mood.word', with: { who: 'ava' } }`.

## How a name is looked up

A bare token such as `{{weather}}` is looked up in this order:

1. A phrase of that name.
2. A [value](/docs/reference/custom#values) of that name in the game's `rules.values`.
3. A key of that name in the player's [kv store](/docs/reference/state#kv).

So code and content can share a group. A value in `rules.values` can be named `outfit.price`, beside the phrase `outfit.verdict`, and both print the same way.

A phrase also answers where a value is asked for by name, with `game/` in front: `{ value: 'game/outfit.verdict' }`. As an [amount](/docs/reference/amounts) it's read as a number, so that only makes sense for a phrase whose words are a number.

## game.phrases

```ts fragment
phrases?: Record<string, PhraseRow[] | PhraseWithArgs>
```

[`loadGame`](/docs/reference/content#loadgame) flattens what your content and packs declare into `game.phrases`, by full name, with a plain string turned into one row: `{ 'outfit.verdict': [...], weather: [{ text: 'grey and close' }] }`. A phrase with arguments stays as `{ args, rows }`. A game you build by hand writes it this way.

Phrases merge by full name. Each is declared once across your content, and two files can add phrases to the same group. A pack's phrase replaces the one of that name whole, row list and arguments and all, and a pack can add new ones to a group:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const mod: Pack = { id: 'mod:posh', schema: SCHEMA, phrases: { outfit: { verdict: 'immaculate', hat: 'a felt cap' } } }
```

## Translating them

Each row's words are in the [words table](/docs/reference/words) under `phrase.<name>.<row>`, counting rows from 0: `phrase.outfit.verdict.0` is `sharp`. A phrase with arguments is named the same way, by its rows. A translation gives each its words, and the conditions stay as they are. Keep the `$who` in the translated words where the name should go.

## The checks

The [content checker](/docs/reference/checks) reports, under `phrase <name>`:

- a phrase with no rows, as `a phrase needs at least one row`
- a row after one with no `when`, as `row <n> has no when, so the rows after it are never shown`
- a row with no `text`
- a name that `rules.values` has too, since the phrase would always win
- a name inside a group that is also a phrase, such as `outfit` and `outfit.verdict` from two files
- `args` that is empty, isn't a list of names, or names one twice, as `args is empty; leave args out of a phrase that takes none` and `args names who twice`
- a row that uses a `$name` its phrase doesn't declare, as `row <n> uses $whom, which isn't one of its args (who)`. Only `$` followed by a letter counts, so `$5` is never reported.
- whatever each row's `when` and words name that the game doesn't have, under `phrase <name> row <n>`. An argument is checked as `'$'`, an entity the token names.

It also checks the tokens in your prose. A token with a group in its name, such as `{{outfit.verdit}}`, that names no phrase, value or kv key is reported. So is a token that leaves out an argument its phrase takes, as `mood.word takes who`, or passes one it doesn't take, as `mood.word takes who, not whom`. See [Tokens](/docs/reference/checks#tokens).

**Gotchas.**
- An argument's value can't hold a space, since a token's arguments are split on spaces. Pass an id, not a name.
- A bare id is read as an entity first. If a character and a value share a word, such as `who=ava` meaning the text `ava`, the character wins.
- A phrase is worked out each time it's printed, from the state now. A line the player read earlier is drawn again with the new words if the scene is drawn again, as any token is.
- A bare name has no `/`. `{{messages/unread}}` is the messages plugin's value, never a phrase.
