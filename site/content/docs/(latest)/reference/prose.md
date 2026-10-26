---
title: "Prose and markup"
description: "Words written in place and lines kept by key, tokens such as {{playerName}}, markup for speech, pictures, video, sound, inline actions and tooltips, and variants."
---
A game's words are written where they're read: a scene's blocks of text, its choices' labels, an entity's name. A line several scenes share, or a set of lines drawn at random, is kept by key in the `prose` table instead. Either way, the view parses the words into beats a UI can draw. This page covers the words, the tokens and markup in them, and the prose table. For the scenes they sit in, see [Scenes](/docs/reference/scenes), and to translate them, [The words table](/docs/reference/words).

## Words in place and prose keys

Most words go straight into the content, as a `{ text }` block, a `say` line, a `label` or a `name`:

```ts
body: [text('Ava looks up from the till.'), say('ava', 'Morning. The usual?')],
choices: [{ id: 'tea', label: 'A pot of tea', effects: [] }],
```

The `prose` table holds lines read by key. Use it for:

- **A line shared between scenes**, read with `{ prose: 'cafe.menu' }` in each.
- **Variants**: a set of lines a `{ variants }` block draws from, one each visit (see [VariantMember](#variantmember)).
- **What markup names by key**: a [tooltip](#inline-actions-and-tooltips)'s words, `[[tip:cafe.menu|the menu]]`, and the React UI's `[[ui:modal|…|key]]`.
- **A line a mod should rewrite by key**: a pack's `prose` replaces the line under the same key.

A prose key is a plain string:

| Key | Used for |
|---|---|
| `cafe.menu` | A `{ prose }` block, a tooltip or a modal. A `.` before the part is a convention, not syntax. |
| `ava.smalltalk.rain` | A member of the variants `ava.smalltalk`. |
| `ava.smalltalk.rain#chat` | A reply written for one drawn line: if that member was drawn, it labels the choice `chat` over its own label. |

Keep `/` out of your keys. It names a plugin everywhere else, as in `quests/done`. See [Ids and separators](/docs/reference/game#ids-and-separators).

A label is never a prose key. Before schema 25, a `{ text }` block named a key, a choice with no `label` read the prose `<scene>#<choice>`, and a label or a notice's `text` could be a key. A pack of an older schema is rewritten when it loads, from its own prose or the game's. Your own content isn't, so the [checker](/docs/reference/checks#words-written-as-prose-keys) reports each one with the words to write.

Variants are named lists of keys, and one of them is drawn each time. The [loader](/docs/reference/loader) takes them as explicit lists (`Pack.variants`), where a member can carry a [weight](#variantmember). A store you build by hand can find them however it likes, for example by key prefix.

## ProseStore

```ts
import type { ProseStore } from '@ifloom/engine'

type ProseStore = {
  line: (key: string, state?: GameState) => string | undefined
  variants: (name: string) => string[]
  weight?: (name: string, key: string) => number
}
```

The game's `prose` field, where `{ prose }` blocks, variants and markup read lines by key. `line` returns the words for a key, filled in for this save, or `undefined` if nobody has written them. `variants` returns the member keys of a named set of variants, in declaration order. `weight` returns a member's weight in a set, 1 if it has none. Leave `weight` out and every member weighs 1.

You rarely write one by hand. [`loadGame`](/docs/reference/loader#loadgame) sets `game.prose` from the content's and packs' prose and variants.

**Gotcha.** `line` is sometimes called without a state, when the scene renderer only wants to know whether a key is written. Return the raw text in that case.

## VariantMember

```ts
import type { VariantMember } from '@ifloom/engine'

type VariantMember = string | { text: string; weight?: number }
```

One member of a variants list, in your [content](/docs/reference/loader#content)'s `variants`: a prose key, or `{ text, weight }` for a key that should come up more or less often than the rest. A plain key weighs 1, and so does `{ text }` with no weight.

```ts
variants: {
  // Sun three times as often as drizzle or wind.
  'street.weather': [{ prose: 'street.weather.sun', weight: 3 }, 'street.weather.drizzle', 'street.weather.wind'],
}
```

How a list draws depends on its weights:

- **Every member weighs 1.** The list rotates. It starts somewhere different each turn and walks one step per draw, so a line doesn't come up twice running until the list has gone round.
- **Any member weighs something else.** Each draw is a [weighted](/docs/reference/random#weighted) pick from the whole list, seeded by the save, the turn and the count of draws so far. Heavier members come up more often, and the same line can come up twice running.

The members counted are the ones left after a [`variants` block](/docs/reference/scenes#block)'s `gate`, so if every member with a weight is gated out, the rest rotate.

Content or a pack that adds to a list adds its members with their weights. The [content checker](/docs/reference/checks) reports a weight of 0 or less as `"…" has a weight of …; a weight must be above 0`, against `variants <name>`.

**Gotcha.** The store needs the game, because `{{v:game/name}}` reads the game's [`rules.values`](/docs/reference/custom#values) and its plugins' values. It keeps the game by reference, so declare the game first and set `prose` on it afterwards, as above. `loadGame` does this for you.

## Tokens

A line of prose can carry tokens, which are filled in for the save when the line is read:

| Token | Becomes |
|---|---|
| `{{playerName}}` | The key `playerName` in the player's [kv store](/docs/reference/state#kv), when it's a string or a number. Any name works the same way, so `{{catName}}` is `state.kv.catName`. |
| `{{kv:playerName}}` | The same, written out. |
| `{{kv:visits of=storyline:ava}}` | The key `visits` in another kv store, named as the [`kv` condition's `of`](/docs/reference/conditions#kv) names it: a storyline's (`of=storyline:ava`), the running minigame's (`of=minigame`), or an entity's (`of=character:ava`, `of=you`). |
| `{{v:game/coffeePrice}}` | The game's own [value](/docs/reference/custom#values) `coffeePrice`, from its `rules.values`, as text. |
| `{{v:quests/updates}}` | The value `updates` of the [plugin](/docs/reference/plugins#naming) `quests`, as text. |
| `{{v:messages/unread channel=texts}}` | A value asked with arguments, here `{ channel: 'texts' }`. |

`A coffee is {{v:game/coffeePrice}} today, {{playerName}}.`

The engine has no player name of its own. A game that wants one sets a kv key, with an [input](/docs/reference/inputs) or in the `kv` passed to [`startingState`](/docs/reference/commands#startingstate), and prose reads it like any other.

**Gotchas:**
- A `{{name}}` or `{{kv:…}}` whose key is unset, or is `true` or `false`, is left in place, braces and all. Set the key before the line is shown, or keep the line behind a [`{ kv }`](/docs/reference/conditions#kv) condition.
- A key in a token is letters, digits and `_`, and can't start with a digit. A key named `cat-name` can be set but can't be printed this way.
- A `{{v:…}}` naming a value the game doesn't declare is left in place, so the missing name shows on screen instead of vanishing.
- In `{{kv:key of=…}}`, `of` comes after the key with a space between, and the store it names has no spaces in it. An `of` naming an entity that isn't there leaves the token in place.
- A `{{v:…}}` name is the plugin's id (letters, digits and `-`), or `game` for the game's own, a `/`, and the value's name (letters, digits, `_` and `-`). A name with no `/` in front is left in place. Arguments follow the name as `key=value`, separated by spaces, as in `{{v:messages/unread channel=texts}}`. A number or `true`/`false` is passed as one, anything else as text. Anything else isn't a token and is left as written.
- The pronoun forms on a [cast](/docs/plugins/cast#person-1) character (`pronouns`) aren't tokens. A game that wants them substitutes them itself.

## fillTokens

```ts
function fillTokens(state: GameState, game: Game, text: string): string
```

Fills in the [tokens](#tokens) in one string. The engine calls it on every block of words, label and line it shows. Call it yourself for text of your own, such as a panel's.

```ts
import { fillTokens } from '@ifloom/engine'

fillTokens(state, game, '{{playerName}} has been here {{kv:visits of=storyline:ava}} times.')
// 'Sam has been here 4 times.'
```

## Markup

The words of a block, or of a line kept by key, are split into paragraphs on blank lines, and each paragraph becomes one [`SceneBeat`](#scenebeat). The view does this for you, so `view().scene.beats` is the parsed body.

| Write | Beat |
|---|---|
| Plain paragraph | `{ type: 'text', text }` |
| `@ava: "New beans this week."` | `{ type: 'say', who: 'character', speaker: 'character:ava', name: 'Ava', text }` |
| `@you: "Just a coffee, then."` | `{ type: 'say', who: 'player', name, text }`, with the player's name |
| `Stranger: "Lovely day."` | `{ type: 'say', who: 'character', name: 'Stranger', text }`, with no `speaker` |
| `"Anything else?"` (a bare quote) | `say`, alternating (see below). |
| `[[img:place/market]]` | `{ type: 'image', size: 'inline', src }` |
| `[[wide:scene/market-morning\|The market at seven]]` | `{ type: 'image', size: 'wide', src, alt }` |
| `[[video:clips/kettle]]` | `{ type: 'video', size: 'inline', src, autoplay, loop, muted, controls }` |
| `[[widevideo:clips/rain\|controls\|Rain on the window]]` | `{ type: 'video', size: 'wide', src, alt, ... }` |
| `[[img:@door\|red,night]]` | `image`, with a file picked from the pool `door` |
| `[[sound:knock]]` | `{ type: 'sound', track }`. Nothing to draw. |
| `@ava: "Hi!" [[voice:ava.hello]]` | `say`, with `voice: 'ava.hello'` |
| `… [[act:answer\|Pick it up]] …` inside a paragraph | The paragraph's `text` or `say` beat gets `spans`, with an `action` span for the choice. See [Inline actions and tooltips](#inline-actions-and-tooltips). |
| `… [[tip:cafe.menu\|the menu]] …` inside a paragraph | The same, with a `tip` span holding the prose line `cafe.menu`. |
| `… [[ui:modal\|the note\|notice.welcome]] …` inside a paragraph | The same, with a `ui` span the engine carries as written, for your UI to draw. See [UI pieces](#ui-pieces). |
| `… **closed** …`, `… *again* …` inside a paragraph | The same, with a `bold` or `italic` span. See [Bold and italics](#bold-and-italics). |

A paragraph can't carry a class. A line that should stand out, such as a warning that work is due, is a block of its own with a `when`, and your UI decides how it looks. For news the player shouldn't miss, raise a [notice](/docs/reference/notices) instead. Inside the line, [bold or italics](#bold-and-italics) can stress a word and a [tooltip](#inline-actions-and-tooltips) can carry the detail.

### Speech

- **A line under an id** is a whole paragraph of the form `@id: "…"`. The id names who says it, the same way a scene's [speaker](/docs/reference/scenes#speakers) is named:
  - a bare id, `@ava`, is `character:ava`, or else the one entity with that id;
  - a full reference, `@character:ava` or `@staff:dev`, is that entity;
  - `@you` is whoever the player is [playing](/docs/reference/entities#protagonists-you-and-player): the protagonist's entity, or the player when there's none;
  - `@player` is the player.

  The beat's `speaker` is the entity's reference, so a UI can tell Ava's lines from Sam's, and `name` is the name to show, read from the entity as the player reads it (tokens filled). Rename or translate an entity and every line under its id shows the new name. The player's own line has `who: 'player'`, and so has the line of the entity the player is playing. The player's name is the one their saves are listed under ([`rules.saveName`](/docs/reference/rules#savename), such as a name they typed), or the string `you` (`You` in English, so a game in Spanish sets `strings: { you: 'Tú' }`). The [checker](/docs/reference/checks#checkgame) reports an id that names no entity, or a bare id two kinds share.
- **A labelled line** is a whole paragraph of the form `Name: "…"`, where the label is letters in any alphabet, spaces, `'` and `-`. It's a character's line shown under the label as written, with no `speaker`: use it for someone with no entity, such as a voice on the radio. A label is never matched against entities' names, so `You: "…"` is a stranger called You, not the player. Write `@you:` for the player.
- **A bare quote** is a whole paragraph wrapped in `"…"` or `“…”`. After a character's line it's the player's. Anywhere else (after the player, after narration, or at the start) it's the character's.
- **Any other paragraph** resets the alternation.

```md
Ava wipes her hands on her apron.

"You're early."

"Couldn't sleep."

@ava: "Then you get the first cup."
```

That's text, character, player, character.

**Gotchas:**
- A line under an id or a label must use straight quotes and end with one. `@ava: “…”` is plain text.
- A pack written before schema 23 wrote speech under names, `Ava: "…"`. [`upgradePack`](/docs/reference/loader#upgradepack) rewrites a line whose name is exactly one entity's into `@ava:`, and `You:` (or the game's string `you`) into `@you:`. A name no entity has, or that two entities share, stays a labelled line.
- A paragraph that starts and ends with a quote is all drawn as speech, even with narration in the middle. `"Morning," Ava says. "Beans are in."` is drawn as speech, `Ava says` included. Put the narration in a paragraph of its own:

```md
Ava looks up from the till.

"Morning. Beans are in."
```

### Images

Write `[[size:path|…]]`, with size `img` (inline) or `wide`. A part after the path, after a `|`, is the alt text: `[[img:place/market|The market]]`. The path goes through [`artSrc`](#artsrc). How a picture sits on the page is the UI's, written as a [hint](/docs/reference/ui-hints) on its block, such as the React UI's [`tilt`](/docs/react/hints#tilt).

**Gotcha.** The image must be a paragraph on its own. If there's anything else in the paragraph, or a size word other than `img`, `wide`, `video` or `widevideo`, the whole paragraph is drawn as plain text, brackets included.

### Videos

`[[video:path|…]]` puts a short clip in the text, and `[[widevideo:path|…]]` puts a wide one. By default a clip behaves like a GIF: it plays by itself, loops, has no sound and plays inline. Flags after the path change that, in any order:

| Flag | What it does |
|---|---|
| `controls` | Shows the player's controls. The clip then waits for the player to press play (`autoplay: false`). |
| `once` | Plays once instead of looping. |
| `sound` | Plays with sound instead of muted. |
| `poster=path` | Shows this picture before the clip plays. The path goes through `artSrc`. |

Any other part is the alt text, as for a picture.

```md
The kettle starts to rattle on the hob.

[[video:clips/kettle|A kettle coming to the boil]]

[[widevideo:clips/high-street|controls|sound|poster=clips/high-street-still|The high street on market day]]
```

A bare name is an `.mp4` (`clips/kettle` is `art/clips/kettle.mp4`). A path ending in `.mp4` or `.webm` is drawn as a video whichever markup names it, so `[[img:clips/kettle.mp4]]` is a video too. An animated `.gif` or `.webp` is a picture.

The React UI draws video beats with [`Video`](/docs/react/components#video). A UI of your own reads the flags off the beat.

**Gotchas:**
- Only one part can be the alt text. The loader reports a second one, because it's usually a misspelt flag (`contols`).
- A `name=value` part with a name that isn't a flag, such as `speed=2`, is reported as an unknown flag.
- The loader reports a video flag on a picture, and `rot`, which turned a picture before schema 22 and is now read as alt text.

### Pools

Instead of a path, write `@` and the name of a [pool](/docs/reference/media#pools) to have the engine pick a file for you. The first part after the pool is always the tags you want, separated by commas.

```md
[[img:@door|red,night|The front door]]

[[video:@window|rain]]
```

The engine picks a file with every tag. If no file has them all, it drops the last tag and tries again, down to any file in the pool. The pick is drawn from the save's seed and remembered, so the same markup in the same place shows the same file on every visit and after a reload. See [Media](/docs/reference/media#pools) for the details.

**Gotchas:**
- The tags part comes first even when it's empty. Write `[[img:@door||A front door]]` for alt text with no tags, because `[[img:@door|A front door]]` asks for a tag called "A front door".
- If the pool has nothing to give, the markup is left out.
- The loader reports an unknown pool and a tag no file in the pool has.

### Sound and voice

`[[sound:id]]` on a paragraph of its own plays a [track](/docs/reference/audio#trackdef) once when the scene is shown. It becomes a `sound` beat, which a UI draws as nothing. `[[voice:id]]` at the end of a spoken line is that line read aloud. It's kept on the `say` beat as `voice`, and the line is drawn without it.

```md
The phone buzzes on the table.

[[sound:buzz]]

@ava: "Are you coming to the café?" [[voice:ava.cafe]]
```

The open scene's sound and voice beats are in [`view.audio.cues`](/docs/reference/audio#sounds-and-voices), in beat order, each with a key that changes only when the scene is entered again. Voices go to the `voice` channel. `@ifloom/audio` plays them, one voice after another.

**Gotchas:**
- `[[voice:id]]` only counts at the end of a [spoken line](#speech). Anywhere else it stays in the text, brackets included.
- In a place's body (its [room scene](/docs/reference/plugins#scene)), `[[sound:id]]` becomes a beat but isn't cued, because no scene is open.
- The loader reports an unknown track, a playlist, and a track on a background channel such as `music`.

### Paragraphs that wait

Prose has no markup for timing. To make a paragraph wait before it appears, put it in a [block](/docs/reference/scenes#block) of its own and give the block a [presentation hint](/docs/reference/ui-hints) such as the React UI's [`reveal`](/docs/react/hints#reveal). The block's hints arrive on the first beat it makes.

`[[reveal]]` used to be markup. The checker reports one left in prose (`[[reveal]] is no longer markup and would be shown as written`), and a pack written before schema 16 has it turned into blocks by [`upgradePack`](/docs/reference/loader#upgradepack).

### Inline actions and tooltips

These two go inside a paragraph, in narration or a spoken line. Unlike the markup above, they don't need a paragraph of their own.

```md
Your phone is ringing on the counter. [[act:answer|Pick it up]], or let it ring.

The [[tip:cafe.board|board above the till]] lists six kinds of toast.
```

- `[[act:id|words]]` draws the scene's choice `id` inside the line, as a link with `words` on it. Write `[[act:id]]` to use the choice's own label. A choice named this way is left out of the list of choices, so it's in one place on the screen. In a room (a place's prose, while no scene is open), `id` names one of the room's buttons instead: the place's `actions` or the game's.
- `[[tip:key|words]]` shows `words` with a short note the player can open. The note is the prose line `key`, so it can be translated and changed by a mod like any other line, and its [tokens](#tokens) are filled in.

The view gives the paragraph's beat a `spans` list: the same words in pieces, in order. An `action` span carries the whole [`RenderedChoice`](/docs/reference/view#renderedchoice), so a UI can grey it out with its reason and show its price, as it would in the list. A `tip` span carries the note. The beat's `text` still has every word, without the markup, for a UI that draws only text. See [`InlineSpan`](#inlinespan).

A choice can send any command as well as its effects, with its [`command`](/docs/reference/scenes#choice) field, so an inline action can open the phone or buy something from a shop:

```ts
const kitchen: DataScene = {
  id: 'kitchen.phone',
  body: [text('Your phone buzzes on the counter. [[act:answer|Pick it up]], or leave it.')],
  choices: [
    { id: 'answer', label: 'Answer the phone', command: devices.open('texts'), effects: [{ kv: 'answered', to: true }] },
    { id: 'ignore', label: 'Leave it', effects: [{ scene: null }] },
  ],
}
```

**Gotchas:**
- A choice left off the screen (its `when` fails, or a `blocked` entry with `hide` holds) is drawn as its words, with no link. So is one the scene doesn't have, and the loader reports it.
- One choice is drawn inline once. A second `[[act:]]` for it shows as words, and the loader reports it when both can be on screen together. Two blocks that each have a `when` are taken to be alternatives and aren't reported.
- A tooltip whose key has no prose shows its words with no note, and the loader reports it. `[[tip:key]]` with no words is shown as written.
- Inline markup in a picture's alt text or a UI piece's words is shown as written.
- The backlog keeps an inline action as its words, with nothing to press. Tooltips stay.

### UI pieces

Sometimes a word should open something that changes nothing in the game: the full text of a note, a photo to look at closely. Write `[[ui:name|words|arg|…]]` inside a paragraph, in narration or a spoken line:

```md
Boxes, mostly. The window looks over the high street, and [[ui:modal|the radiator knocks|notice.welcome|Sam's note]] when it feels like it.

[[ui:image|Ava|photo/ava.svg|Ava at the café counter]] looks up from the till and grins.
```

- `name` says which of your UI's components draws it. It's an id (letters, digits, `-` and `_`, in parts joined by `.`), with a plugin's name and `/` in front for a piece a plugin's UI draws.
- `words` are what the line shows. They're also what a screen reader, the backlog and `ifloom playtest` read.
- Everything after the words is the piece's arguments, as text, in order. There can be none.

The engine gives a UI piece no meaning. The view hands it to the UI as a `ui` span, `{ type: 'ui', name, text, args }`, with the words in `text`, and the beat's `text` has the words as for any other span. So a piece can't change the state, and it isn't in the log or a replay. Something that should change the game, such as a dialog with buttons that buy things, is an [inline action](#inline-actions-and-tooltips) whose choice opens a [panel](/docs/reference/panels). [Popups and modals](/docs/recipes/modals) shows both.

The React UI draws five pieces itself. `modal` opens a dialog with a prose line, and `image` opens a picture in the viewer. `mail`, `prop` and `mono` draw a letter, a note and a sign, as the engine's own beats did before schema 22. A game adds its own by name. See [Inline pieces](/docs/react/hints#inline-pieces). A UI types its names and arguments by augmenting [`InlineUi`](/docs/reference/ui-hints#inlineui).

The content checker reports a piece with no name, a name that isn't an id, no words or an empty argument, and markup that isn't closed. It doesn't know what a name means, so whether your UI draws it is that UI's check: the React UI's is [`checkUiHints`](/docs/react/hints#checkuihints).

### Bold and italics

Two stars around words make them bold, and one star makes them italic, as in Markdown. They go inside a paragraph, in narration or a spoken line:

```md
The sign on the door says **Closed**, but the light is *still* on.

@ava: "I said *one* croissant."
```

The paragraph's beat gets `spans`, with a `bold` or `italic` span for the styled words. Its `text` is the words without the stars, so a screen reader, the backlog and the playtest read "The sign on the door says Closed, but the light is still on."

To show a star as it is, write `\*`: `Five \* three` shows "Five * three". You rarely need to, because a star only opens when a space doesn't follow it and only closes when a space doesn't come before it. `5 * 3 = 15` and a line of `* * *` stay as written.

**Gotchas:**
- Bold and italics don't go inside each other, and `***words***` isn't read. The stars are shown as written, and the loader reports them.
- A star that opens and never closes, such as `*sigh`, is shown as written, and the loader reports it. Close it, or write `\*`.
- Stars around an inline action or a tooltip (`**[[act:go]]**`), or inside their words, are shown as written, and the loader reports the first kind.
- A picture's alt text, a UI piece's words and a choice's label show stars as written.
- In a TypeScript string, `\*` is written `'\\*'`, because the backslash has to survive the string.

### Letters, notes and signs

The engine's beats are text, speech, pictures, video and sound. How a letter, a sticky note or a sign looks is a UI's, so you write one as a [UI piece](#ui-pieces) on a paragraph of its own. The React UI draws these three:

```md
[[ui:mail|The atlas you asked for is in. We hold books for a week.|From: The Library|Subject: Your reservation]]

[[ui:prop|Back in five minutes|sticky]]

[[ui:mono|CLOSED FOR STOCKTAKING]]
```

A UI piece's words can run over blank lines, so a letter's body can have paragraphs. A pack written before schema 22 used `[[mail]] … [[/mail]]`, `[[sticky]]`, `[[clip]]`, `[[diary]]` and `> ` lines, and [`upgradePack`](/docs/reference/loader#upgradepack) rewrites them into these pieces.

## SceneBeat

```ts
import type { SceneBeat } from '@ifloom/engine'

type SceneBeat = (
  | { type: 'text'; text: string; spans?: InlineSpan[] }
  | { type: 'say'; who: 'character' | 'player'; speaker?: EntityRef; name?: string; text: string; voice?: string; spans?: InlineSpan[] }
  | { type: 'image'; src: string; alt?: string; size: 'inline' | 'wide' }
  | {
      type: 'video'
      src: string
      poster?: string
      alt?: string
      size: 'inline' | 'wide'
      autoplay: boolean
      loop: boolean
      muted: boolean
      controls: boolean
    }
  | { type: 'sound'; track: string }
  | { type: 'chose'; label: string }
) & { ui?: Ui<BlockUi>; section?: Ui<BlockUi> }
```

One piece of a scene. A UI switches on `type`, and draws nothing for `sound`. A `chose` beat is a pick the player made earlier in a [flowing scene](/docs/reference/flows), with the choice's words as `label`, where the decision was: draw it, restyle it or leave it out. `section` is the hints of the section a beat sits in, on every beat of it, such as a fold's `{ fold: 'Read the postcard' }`. A `say` beat's `who` says whether it's the player's line, `speaker` is the entity it's written under, when it's one's, and `name` is who to show it under (see [Speech](#speech)). `ui` is there on the first beat of a [block](/docs/reference/scenes#block) that has [presentation hints](/docs/reference/ui-hints), as the block wrote them, so a UI knows where the block starts and what it asked for.

A `text` or `say` beat has `spans` only when its paragraph holds an [inline action or a tooltip](#inline-actions-and-tooltips) that the view could draw, or [bold or italics](#bold-and-italics). Its `text` is the same words without the markup either way.

A `video` beat always has all four of `autoplay`, `loop`, `muted` and `controls`, worked out from its [flags](#videos). Without flags they're `true`, `true`, `true` and `false`. With `controls`, `autoplay` is `false`.

A data scene's `{ media }` blocks become `image` or `video` beats where they are in the body. Media with `at: 'lead'` comes before the body, and media with `at: 'end'` comes after it.

## InlineSpan

```ts
import type { InlineSpan } from '@ifloom/engine'

type InlineSpan =
  | { type: 'text'; text: string }
  | { type: 'action'; text: string; choice: RenderedChoice }
  | { type: 'tip'; text: string; tip: string }
  | { type: 'ui'; name: string; text: string; args: string[] }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
```

One piece of a paragraph that holds [inline actions or tooltips](#inline-actions-and-tooltips), [UI pieces](#ui-pieces) or [bold or italics](#bold-and-italics), in order. Joined, the `text` of every span is the beat's `text`.

- `text` is words to draw as they are.
- `action` is an inline action: `text` is the words of its link, and `choice` is what it presses, as [`view.scene.choices`](/docs/reference/view#the-scene) would have it (`command`, `disabled`, `price`, `irreversible`, `warning`). Send `choice.command` when it's pressed and `disabled` is unset.
- `tip` is a tooltip: `text` is the words shown, and `tip` the note, filled in for this save.
- `ui` is a UI piece, as written: `name` says which of your UI's components draws it, `text` is its words and `args` the arguments after them. The engine gives it no meaning.
- `bold` and `italic` are words to draw in bold or in italics, without their stars.

A UI draws an `action` as a button in the line, a `tip` as a button that shows its note, and `bold` and `italic` as `<strong>` and `<em>`. A UI that doesn't know a type, or a `ui` span's name, can draw its `text`, and the line still reads. The React UI does all four, with [`InlineAction`](/docs/react/components#inlineaction), [`Tip`](/docs/react/components#tip) and the parts `bold` and `italic`. For your own UI, see [Actions and tooltips in the text](/docs/recipes/inline-actions).

## parseBeats

```ts
import { parseBeats } from '@ifloom/engine'

function parseBeats(
  body: string,
  hints?: readonly { at: number; ui: Ui<BlockUi> }[],
  find?: (id: string) => { who: 'character' | 'player'; speaker?: EntityRef; name: string },
): SceneBeat[]
```

The parser described above. `hints` puts each block's `ui` on the first beat of the block that starts at its `at`, a character offset into `body`. `find` says who a line under `@id` is, and the name to show. Left out, `@you` and `@player` are the player's, under `You`, and any other id is a character's under the id, with no `speaker`. [`view`](/docs/reference/view) already calls it, so you only need it to parse text outside a scene. It leaves `[[act:]]`, `[[tip:]]`, `[[ui:]]` and the stars of bold and italics in the text: the view draws them, and only the view knows the choices and the prose.

## styledBeats

```ts
import { parseBeats, styledBeats } from '@ifloom/engine'

function styledBeats(beats: readonly SceneBeat[]): SceneBeat[]
```

Draws the [bold and italics](#bold-and-italics) and the [UI pieces](#ui-pieces) in `text` and `say` beats that don't go through a scene's view: each gets `bold`, `italic` and `ui` [spans](#inlinespan), and its `text` has the words alone. The view does this for a scene and a room, and a plugin's [`context.beats`](/docs/reference/plugins#beats) does it for the blocks it draws. Call it on beats you parse yourself:

```ts
styledBeats(parseBeats('The sign says **Closed**.'))
// [{ type: 'text', text: 'The sign says Closed.', spans: [{ type: 'text', text: 'The sign says ' }, { type: 'bold', text: 'Closed' }, { type: 'text', text: '.' }] }]
```

`[[act:]]` and `[[tip:]]` stay in the words as written, because only the view knows the choices and the prose. A beat that already has `spans` is left as it is.

## inlineMarkup

```ts
import { inlineMarkup, type InlinePart } from '@ifloom/engine'

function inlineMarkup(text: string): InlinePart[] | null

type InlinePart =
  | { type: 'text'; text: string }
  | { type: 'act'; id: string; text?: string; markup: string }
  | { type: 'tip'; key: string; text: string; markup: string }
  | { type: 'ui'; name: string; text: string; args: string[]; markup: string }
  | { type: 'bold'; text: string; markup: string }
  | { type: 'italic'; text: string; markup: string }
```

A line cut at its `[[act:]]`, `[[tip:]]`, `[[ui:]]`, bold and italic markup, as written, or `null` when it has none. `markup` is the markup itself, and a bold or italic part's `text` is its words without the stars. Malformed markup (no id or key, a tooltip or UI piece with no words, a UI piece whose name isn't an id or with an empty argument, a star that never closes) stays in the text around it, and each `\*` in a text part is already a plain star. The view uses it to make [`InlineSpan`](#inlinespan)s, and an editor can use it to preview a line.

```ts
inlineMarkup('Ring. [[act:answer|Pick up]]')
// [{ type: 'text', text: 'Ring. ' }, { type: 'act', id: 'answer', text: 'Pick up', markup: '[[act:answer|Pick up]]' }]
```

## artSrc

```ts
import { artSrc } from '@ifloom/engine'

function artSrc(path: string, type?: 'image' | 'video'): string
```

Resolves a picture's or a video's path. Everything in the engine resolves media through it, and every picture and video in the view has been through it: a scene's, an entity's, a notice's and every plugin's. It strips a leading `/`, `art/` or `/art/`, and puts `art/` in front. If the path doesn't already end in `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`, `.svg`, `.mp4` or `.webm`, it adds `.jpg`, or `.mp4` when `type` is `'video'`. A URL, such as `https://…` or `data:…`, is left as it is.

```ts
artSrc('place/cafe')             // 'art/place/cafe.jpg'
artSrc('/art/place/cafe.png')    // 'art/place/cafe.png'
artSrc('clips/kettle', 'video')  // 'art/clips/kettle.mp4'
artSrc('https://example.com/a.png')  // 'https://example.com/a.png'
```

So content writes a picture the same way everywhere, as a path in `art/`, and your UI draws the view's paths as they come, with no call to `artSrc` of its own.

The result is relative on purpose. A built game is a folder opened from disk or from a subpath, where a path starting `/` would point at the root of the drive or host instead of beside `index.html`. Put your pictures in `art/` next to the game's `index.html`. Sound files work the same way under `audio/`, through [`audioSrc`](/docs/reference/audio#audiosrc).

## mediaType

```ts
import { mediaType } from '@ifloom/engine'

function mediaType(src: string): 'image' | 'video'
```

Whether a file is drawn as a picture or a video, by its extension. `.mp4` and `.webm` are videos, and everything else is a picture, animated `.gif` and `.webp` included.

```ts
mediaType('clips/kettle.mp4') // 'video'
mediaType('place/cafe.webp')  // 'image'
```

## Drawing it

A `text` or `say` beat has `spans` when its line holds something the view can draw: [bold or italics](#bold-and-italics), an [inline action or a tooltip](#inline-actions-and-tooltips), or a [UI piece](#ui-pieces). Without spans, draw its `text` as it is. With them, draw each [`InlineSpan`](#inlinespan) by its `type`, and send an `action` span's `choice.command` when it's pressed. A `ui` span means only what your UI makes of it, so draw it by its `name`, or show its words.

The React UI's [`Scene`](/docs/react/components#scene) draws every span, and its own UI pieces `modal` and `image`. A piece of your own is a component in `inline`, under its name. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/prose.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/mount-prose.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Prose.vue]{meta='tab="Vue" tab-group="framework"'}

## See it in an example

- Small Town: each file in [`examples/showcase/src/story/`](https://github.com/IFLoom/ifloom/tree/main/examples/showcase/src/story) holds its own lines by key, with choice labels as `<scene>#<choice>`, and Ava's and the café's are in files of their own beside them, such as [`examples/showcase/src/story/ava.prose.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.prose.ts). Ava's greeting is speech, and her small talk uses named lines. The flat's line prints a custom value with `{{v:catName}}`.
- Small Town's intro has a tooltip on "launderette", and the flat's `place.flat.text` line holds `[[act:read-text|Check it]]`, the room's button that opens the phone's messages.
- The Letter: the `prose` in [`examples/novel/src/story/ch1.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/story/ch1.ts) prints the reader's name with `{{playerName}}`.
