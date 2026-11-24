---
title: "Phrases"
description: "Reference for Phrases, Phrase, PhraseRow and PhraseWithArgs: words for the middle of a sentence that change with the state, declared in content's phrases and printed with a token such as {{outfit.verdict}}."
---
A phrase is a few words that change with the state, for the middle of a sentence. Your content declares phrases in `phrases`, each as rows tried in order, and prose prints one anywhere words go with a [token](/docs/reference/prose#tokens), such as `{{outfit.verdict}}`. [Translate your game](/docs/how-to/translate-your-game) gives a phrase's rows other words.

```ts
import type { Phrase, PhraseRow, Phrases, PhraseWithArgs } from '@ifloom/engine'
```

## Phrases

The `phrases` key of [`Content`](/docs/reference/content#content) and of a [`Pack`](/docs/reference/content#pack), a tree of groups with a phrase at each leaf. Every form is in [`Phrases`](/docs/api/engine#phrases).

A list of rows, a plain string or an object with `args` and `rows` is a phrase. Any other object is a group, whose keys are phrases or more groups. A phrase's name is its path through the groups joined with `.`, so the phrase below is `outfit.verdict` and prints as `{{outfit.verdict}}`.

```ts
import type { Content } from '@ifloom/engine'

export const flat: Content = {
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
  scenes: [{ id: 'flat.mirror', body: [{ text: 'The mirror says you look {{outfit.verdict}}. Outside it is {{weather}}.' }], choices: [] }],
}
```

[`loadGame`](/docs/reference/content#loadgame) flattens the content's and packs' phrases into `game.phrases` by full name, with a plain string made one row. Each phrase is declared once across your content, and two files can add phrases to one group. A pack's phrase replaces the one of that name whole, rows and arguments together, and a pack can add new phrases to a group.

The engine looks a bare token's name up as a phrase first, then as a [value](/docs/reference/custom#values) in `rules.values`, then as a key in the player's [kv store](/docs/reference/glossary#kv). So a value named `outfit.price` sits beside the phrase `outfit.verdict` and prints the same way. A phrase also answers where a value is asked for by name with `game/` in front, `{ value: 'game/outfit.verdict' }`, and an [amount](/docs/reference/amounts) reads it as a number.

The words table names each row's words `phrase.<name>.<row>`, counting rows from 0, so `phrase.outfit.verdict.0` is `sharp`. A translation gives the rows other words, and the conditions stay as they are (see [The words table](/docs/reference/words)).

## Phrase, PhraseRow and PhraseWithArgs

A `Phrase` is one phrase in content, a string, a list of `PhraseRow`s, or a `PhraseWithArgs` that takes arguments. Every form is in [`Phrase`](/docs/api/engine#phrase), [`PhraseRow`](/docs/api/engine#phraserow) and [`PhraseWithArgs`](/docs/api/engine#phrasewithargs).

The engine tries a phrase's rows in order, and the first whose `when` holds gives the words. A row with no `when` always fits, so put one last as the fallback. When no row fits, the phrase prints nothing. The engine reads a row's words as prose, so they can hold tokens of their own, another phrase's included, and a phrase that prints itself stops after a few rounds.

### args

The names of a phrase's arguments, which a token passes as `key=value` after the phrase's name. In a row's `when`, a string that is exactly `$` and an argument's name, such as `'$who'`, becomes the value the token passed.

```ts fragment
mood: {
  word: {
    args: ['who'],
    rows: [
      { when: { stat: 'friendship', of: '$who', gte: 20 }, text: 'beams' },
      { when: { stat: 'friendship', of: '$who', lt: 5 }, text: 'shrugs' },
      { text: 'nods' },
    ],
  },
}
```

The token `{{mood.word who=ava}}` prints Ava's word. The engine reads a value as an entity, as it reads a [spoken line's id](/docs/reference/prose#speech):

- A bare id such as `ava` is `character:ava` when there is one, else the one entity with that id.
- A full reference such as `location:cafe` names that entity.
- A value that names no entity, such as `Robin` or `3`, passes as text or a number.

In a row's `text`, `$who` becomes the entity's name with its tokens filled, or the value as passed when it names no entity. Inside a token in the row, it becomes the reference, so `{{kv:mood of=$who}}` reads Ava's kv store. Only the names in `args` are replaced, so a price such as `$5` stays as written. A [value reference](/docs/reference/custom#valueref) passes arguments in its `with`, `{ value: 'game/mood.word', with: { who: 'ava' } }`.

## Checks

The [content checker](/docs/reference/checks) checks every phrase, under `phrase <name>`:

| Problem | Cause |
|---|---|
| `a phrase needs at least one row` | A phrase has no rows. |
| `row 2 has no when, so the rows after it are never shown` | A row comes after one with no `when`. |
| `args is empty; leave args out of a phrase that takes none` | `args` lists no names. |
| `args names who twice` | `args` names one argument twice. |
| `row 1 uses $whom, which isn't one of its args (who)` | A row uses a `$name` its phrase doesn't declare. Only `$` before a letter counts. |
| `mood.word takes who` | A token leaves out an argument its phrase takes. |
| `mood.word takes who, not whom` | A token passes an argument its phrase doesn't take. |

The checker also reports a row with no `text`, a name that `rules.values` has too, and a group name that is also a phrase, such as `outfit` and `outfit.verdict` from two files. It checks each row's `when` and words as any condition and line, with an argument read as `'$'`. It reports a token with a group in its name, such as `{{outfit.verdit}}`, that names no phrase, value or kv key, as [Tokens](/docs/reference/checks#prose) lists.

## Caveats

- An argument's value can't hold a space, since a token's arguments are split on spaces. Pass an id, not a name.
- The engine reads a bare id as an entity first, so `who=ava` passes the character, never the text `ava`, while a character `ava` exists.
- The engine works a phrase out each time it prints, from the state now. A line the player read earlier shows the new words when the scene renders again.
- A name with a `/` is a plugin's value, so `{{messages/unread}}` is never a phrase.
