---
title: "Prose and markup"
description: "The prose table, the markup in the words a player reads, and the functions that parse prose into beats and spans."
---
A game's words are [written in place](/docs/reference/glossary#words-in-place), in a scene's blocks, its choices' labels and an entity's name. A line several scenes share, a set of lines drawn at random, or a line a mod rewrites by key goes in content's `prose` table under a [prose key](/docs/reference/glossary#prose-key) instead. Either way, the view fills the tokens in the words and parses their markup into beats a UI renders. [Put a choice in a line](/docs/how-to/put-a-choice-in-a-line) and [Show a popup](/docs/how-to/show-a-popup) use the markup, and [Translate your game](/docs/how-to/translate-your-game) gives the words other languages.

In the showcase: `examples/showcase/src/story/ava.prose.ts`, which keeps Ava's lines and her small talk by key beside `story/ava.ts`.

```ts
import { artSrc, fillTokens, inlineMarkup, mediaType, proseBeats, type BeatSize, type InlinePart, type InlineSpan, type ProseStore, type SceneBeat, type VariantMember } from '@ifloom/engine'
import { parseBeats, styledBeats, type SpeakerFinder } from '@ifloom/engine/plugin'
```

## ProseStore

The game's `prose`, which `{ prose }` blocks, variants and markup read lines through by key. Every field is in [`ProseStore`](/docs/api/engine#prosestore).

[`loadGame`](/docs/reference/content#loadgame) makes the store from the `prose` and `variants` of the content and packs, so a game rarely writes one. `line` returns a key's words with tokens filled for a state, or `undefined` when nobody wrote them. `variants` returns a set's member keys in the order declared, and `weight` a member's weight, 1 when left out. `keys` lists every key with words, so the [content checker](/docs/reference/checks) reads the markup in all the prose, and without it the checker reads only the keys content names.

A prose key is a plain string, such as `cafe.menu`, and the `.` in it is a convention. Keep `/` out of it, since `/` names a plugin (see [Ids and separators](/docs/reference/common#ids-and-separators)). A pack's `prose` replaces a line under the same key.

| Key | Meaning |
|---|---|
| `cafe.menu` | A line a `{ prose }` block, a tooltip or the React UI's modal reads. |
| `ava.smalltalk.rain` | A member of the variants `ava.smalltalk`, listed in content's `variants`. |
| `ava.smalltalk.rain#chat` | A reply to one drawn line, which labels the choice `chat` while that member is the one shown (see [`Choice`](/docs/reference/scenes#choice)). |

```ts
import type { Content } from '@ifloom/engine'

export const cafe: Content = {
  prose: {
    'cafe.menu': 'Tea, coffee, toast. **Cake on Fridays.**',
    'ava.smalltalk.rain': '@ava: "Bring a coat, it’s coming down sideways."',
    'ava.smalltalk.rain#chat': 'Say you forgot yours',
  },
  variants: { 'ava.smalltalk': ['ava.smalltalk.rain'] },
}
```

## VariantMember

One member of a set of variants in content's `variants`, a prose key or `{ text, weight }`. Every form is in [`VariantMember`](/docs/api/engine#variantmember).

A plain key weighs 1, and so does `{ text }` with no weight. While every member weighs 1, the set rotates, starting somewhere new each turn and walking one step per draw, so a line comes up again only once the set has gone round. A set with any other weight draws a [weighted](/docs/reference/random#weighted) pick from the whole set each time, seeded by the save, the turn and the count of draws, and the same line can come up twice running. The engine counts only the members a [`variants` block](/docs/reference/scenes#block)'s `gate` leaves in.

```ts fragment
variants: {
  'street.weather': [{ text: 'street.weather.sun', weight: 3 }, 'street.weather.drizzle', 'street.weather.wind'],
}
```

A content file or a pack that adds to a set adds its members with their weights.

## Tokens

A token is a name in double braces that the engine fills in for the save when it reads the words. Every block of words, label and line the view shows has its tokens filled, through [`fillTokens`](#filltokens).

| Key | Meaning |
|---|---|
| `{{weather}}` | A name of the game's own, looked up as a [phrase](/docs/reference/phrases), then a [value](/docs/reference/custom#values) in `rules.values`, then a string or number in the player's [kv store](/docs/reference/glossary#kv). |
| `{{outfit.verdict}}` | The same for a name in a group, with `.` between the groups. |
| `{{coffeePrice weeks=2}}` | A value of the game's own asked with arguments, here `{ weeks: 2 }`. |
| `{{mood.word who=ava}}` | A phrase that takes [arguments](/docs/reference/phrases#phrase-phraserow-and-phrasewithargs), which its rows read as `$who`. |
| `{{quests/updates}}` | The value `updates` of the plugin `quests`, as text. |
| `{{messages/unread channel=texts}}` | A plugin's value asked with arguments, here `{ channel: 'texts' }`. |
| `{{kv:playerName}}` | The key `playerName` in the player's kv store, and nothing else. |
| `{{kv:visits of=storyline:ava}}` | A key in another kv store, named as the [`kv` condition](/docs/reference/conditions#kv)'s `of` names it, a storyline's, the running minigame's or an entity's. |
| `{{flatmateName\|Your flatmate}}` | The token, or the words after the `\|` while it's unset. Any token can end this way. |

A token is unset when its kv key is unset or is `true` or `false`, its phrase has no row that fits, or its value is missing or gives `''`. An unset token shows its fallback as written, and an unset bare name with no fallback prints nothing. Any other token that names nothing, such as a plugin's value the game lacks, stays in place, braces and all, so the missing name shows on screen.

A bare name is letters, digits, `_` and `-`, starting with a letter or `_`, in parts joined by `.`, so a key named `9lives` can't be printed this way. A plugin's token is its id, a `/` and the value's name. Arguments follow the name as `key=value`, split on spaces, and a number or `true` or `false` passes as one, anything else as text. What a token prints is never read for tokens again, so a name the player typed shows as typed.

The engine has no player name of its own. A game sets a kv key, with an [input](/docs/reference/inputs) or in the `kv` given to [`startingState`](/docs/reference/commands#startingstate), and prose reads it as `{{playerName}}`.

## Markup

The view splits the words of a block or a line on blank lines, and makes each paragraph one [`SceneBeat`](#scenebeat). A paragraph can't carry a class. A line that should stand out is a block of its own with a `when`, and a UI decides how it looks.

| Key | Meaning |
|---|---|
| A plain paragraph | A `text` beat. |
| `@ava: "New beans this week."` | A `say` beat under Ava, with her reference as `speaker` and her name (see [Speech](#speech)). |
| `Stranger: "Lovely day."` | A `say` beat shown under the label `Stranger`, with no `speaker`. |
| `"Anything else?"` | A `say` beat, taking turns between a character and the player. |
| `[[img:place/market]]`, `[[wide:scene/market-morning\|The market at seven]]` | An `image` beat (see [Images](#images)). |
| `[[video:clips/kettle]]`, `[[widevideo:clips/rain\|controls]]` | A `video` beat (see [Videos](#videos)). |
| `[[img:@door\|red,night]]` | An `image` beat with a file picked from a pool (see [Pools](#pools)). |
| `[[sound:knock]]`, `[[voice:ava.hello]]` | A `sound` beat, and a spoken line's voice (see [Sound and voice](#sound-and-voice)). |
| `[[act:answer\|Pick it up]]`, `[[tip:cafe.menu\|the menu]]` | An inline choice and a tooltip inside a paragraph (see [Inline actions and tooltips](#inline-actions-and-tooltips)). |
| `[[ui:modal\|the note\|notice.welcome]]` | A UI piece inside a paragraph (see [UI pieces](#ui-pieces)). |
| `**closed**`, `*again*` | Bold and italic words inside a paragraph (see [Bold and italics](#bold-and-italics)). |

Prose has no markup for timing. A paragraph that should wait before it appears is a [block](/docs/reference/scenes#block) of its own with a [presentation hint](/docs/reference/ui-hints), such as the React UI's `reveal`.

### Speech

A spoken line is a whole paragraph of the form `@id: "…"`, under the id of who says it. The id names an entity as a scene's [`speaker`](/docs/reference/scenes#speaker) does: a bare id, a full reference such as `@staff:dev`, `@you` for whoever the player is playing, or `@player` for the player. The beat's `speaker` is the entity's reference and its `name` is the entity's name with tokens filled, so renaming an entity renames every line under its id. Its `image` is the speaker's picture, the entity's `image` through [`artSrc`](#artsrc), or for the player's own line content's [`player.image`](/docs/reference/content#content), and left out when there's none, so a UI can put a portrait beside every line.

The player's own lines, and those of the entity the player is playing, have `who: 'player'`. They show under the name the player's saves are listed under, from [`rules.saveName`](/docs/reference/rules#savename), or else the string `you`, which a game in another language rewords in its [strings](/docs/reference/strings#buttons-and-labels).

A labelled line, `Name: "…"`, is a character's line under the label as written, with no `speaker`, for someone with no entity such as a voice on the radio. The label is letters in any alphabet, spaces, `'` and `-`, and the engine never matches it against entities' names, so `You: "…"` is a stranger called You. A bare quote, a whole paragraph in `"…"` or `“…”`, is the player's after a character's line and a character's anywhere else. Any other paragraph starts the turns again.

```md
Ava wipes her hands on her apron.

"You're early."

"Couldn't sleep."

@ava: "Then you get the first cup."
```

That's narration, a character, the player, then Ava.

### Images

`[[img:path]]` is a picture in the column and `[[wide:path]]` one that spans it. A part after a `|` is the alt text, and the path goes through [`artSrc`](#artsrc). How a picture sits on the page is the UI's, written as a [hint](/docs/reference/ui-hints) on its block. The markup must be a paragraph of its own, or the whole paragraph shows as text, brackets included.

### Videos

`[[video:path]]` is a short clip in the column and `[[widevideo:path]]` a wide one. A clip plays by itself, loops, is muted and has no controls, as a GIF does. A bare name is an `.mp4`, so `clips/kettle` is `art/clips/kettle.mp4`, and a path ending in `.mp4` or `.webm` is a video whichever markup names it. Flags after the path, in any order, change how it plays, and any other part is the alt text.

| Key | Meaning |
|---|---|
| `controls` | The clip shows the player's controls and waits for the player to press play. |
| `once` | The clip plays once in place of looping. |
| `sound` | The clip plays with sound. |
| `poster=path` | The clip shows this picture before it plays, with the path through `artSrc`. |

```md
[[widevideo:clips/high-street|controls|sound|poster=clips/high-street-still|The high street on market day]]
```

### Pools

`@` and a [pool](/docs/reference/media)'s name in place of a path has the engine pick a file. The first part after the pool is always the tags, joined by commas, so `[[img:@door||A front door]]` gives alt text with no tags. The engine picks a file with every tag, dropping the last tag until a file fits, down to any file in the pool. It remembers the pick, so the same markup in the same place shows the same file on every visit and after a reload. A pool with nothing to give leaves the markup out.

```md
[[img:@door|red,night|The front door]]
```

### Sound and voice

`[[sound:id]]` on a paragraph of its own plays a [track](/docs/reference/audio#trackdef) once when the scene opens, as a `sound` beat that renders nothing. `[[voice:id]]` at the end of a spoken line is that line read aloud, kept on the `say` beat as `voice`, and the line shows without it. Anywhere else, `[[voice:id]]` stays in the words. The open scene's sounds and voices are in `view.audio.cues` in beat order, and voices play on the `voice` channel one after another.

```md
[[sound:buzz]]

@ava: "Are you coming to the café?" [[voice:ava.cafe]]
```

### Inline actions and tooltips

These two go inside a paragraph, in narration or a spoken line. `[[act:id|words]]` shows the scene's choice `id` inside the line, with `words` on it or the choice's own label for `[[act:id]]`, and the view leaves the choice out of the list of choices. In a room, `id` names one of the room's actions instead. `[[tip:key|words]]` shows `words` with a note the player can open, the prose line `key` with its tokens filled.

```md
Your phone is ringing on the counter. [[act:answer|Pick it up]], or let it ring.

The [[tip:cafe.board|board above the till]] lists six kinds of toast.
```

The paragraph's beat gets `spans`, and an `action` span carries the whole [`RenderedChoice`](/docs/api/engine#renderedchoice), so a UI greys it out and prices it as it would in the list. A choice off the screen, hidden by its `when` or a `blocked` entry with `hide`, shows as its words with nothing to press. A choice shows inline once, so a second `[[act:]]` for it shows as words. The backlog keeps an inline action as its words.

### UI pieces

A UI piece, `[[ui:name|words|arg|…]]`, is a piece of a UI's own inside a paragraph, such as a note the player opens or a photo to look at. `name` is an id, with a plugin's id and `/` in front for a piece a plugin's UI renders. `words` are what the line shows, and what a screen reader, the backlog and `ifloom playtest` read. Everything after the words is the piece's arguments, as text, in order.

```md
Boxes, mostly. [[ui:modal|The radiator knocks|notice.welcome|Sam's note]] when it feels like it.

[[ui:mail|The atlas you asked for is in.|From: The Library|Subject: Your reservation]]
```

The engine gives a piece no meaning and passes it to the view as a `ui` span, so a piece can't change the state and stays out of the log. A dialog with buttons that change the game is an inline action whose choice opens a [panel](/docs/reference/panels). A piece's words can run over blank lines, so a letter can have paragraphs. The React UI renders five pieces, `modal`, `image`, `mail`, `prop` and `mono`, and a UI types its own by augmenting [`InlineUi`](/docs/reference/ui-hints).

### Bold and italics

Two stars around words make them bold and one star makes them italic, inside a paragraph, as in Markdown. The beat gets `bold` and `italic` spans, and its `text` is the words without the stars.

```md
The sign on the door says **Closed**, but the light is *still* on.
```

A star opens only when no space follows it and closes only when no space comes before it, so `5 * 3 = 15` and a line of `* * *` stay as written. `\*` shows a star, written `'\\*'` in a TypeScript string. Bold and italics don't nest, and `***words***` shows its stars as written.

## SceneBeat

One piece of a rendered body, told apart by its `type`: words, a spoken line, a picture, a video, a sound or a past choice. Every form is in [`SceneBeat`](/docs/api/engine#scenebeat).

A `say` beat's `who` says whether the line is the player's, `speaker` is the entity it's under when it's one's, and `name` is who to show it under. A `chose` beat is a choice the player made earlier in a [flowing scene](/docs/reference/flows), with its label, where the decision was. A `sound` beat renders nothing. A `video` beat always has `autoplay`, `loop`, `muted` and `controls`, which are `true`, `true`, `true` and `false` with no flags, and `autoplay` is `false` with `controls`.

A `text` or `say` beat has `spans` only when its paragraph holds an inline action, a tooltip, a UI piece, bold or italics, and its `text` is the words without the markup either way. `ui` is on the first beat of a [block](/docs/reference/scenes#block) with presentation hints, and `section` on every beat of a section with hints, such as a fold's `{ fold: 'Read the postcard' }`. A `{ media }` block's beat stands where the block is, before the body with `at: 'lead'` and after it with `at: 'end'`.

```ts fragment
{ type: 'say', who: 'character', speaker: 'character:ava', name: 'Ava', text: 'New beans this week.' }
```

## BeatSize

The width of an `image` or `video` beat, `inline` in the column with the words or `wide` across it. Every form is in [`BeatSize`](/docs/api/engine#beatsize).

## InlineSpan

One piece of a paragraph with inline markup, in order, so the `text` of every span joined is the beat's `text`. Every form is in [`InlineSpan`](/docs/api/engine#inlinespan).

| Kind | Meaning |
|---|---|
| `text` | Words shown as they are. |
| `action` | An inline choice, with the words of its link and the `choice` it presses, as `view.scene.choices` has it. Send `choice.command` when it's pressed and `disabled` is unset. |
| `tip` | A tooltip, with the words shown and the note in `tip`, filled for this save. |
| `ui` | A UI piece as written, with its `name`, its words and its `args`. |
| `bold`, `italic` | Words shown in bold or in italics, without their stars. |

A UI that doesn't know a span's type, or a `ui` span's name, can show its `text`, and the line still reads.

## InlinePart

One part of a line as [`inlineMarkup`](#inlinemarkup) cuts it, plain text or a piece of markup with its words and the markup as written. Every form is in [`InlinePart`](/docs/api/engine#inlinepart).

## SpeakerFinder

A function that takes the id a line is written under and returns who says it and the name to show, as [`parseBeats`](#parsebeats) takes it. Every form is in [`SpeakerFinder`](/docs/api/engine-plugin#speakerfinder).

## View

`view.scene.beats` holds the open scene's body, or the room's, as [`SceneBeat`](#scenebeat)s, and `view.scene.body` holds the same words as markup text. To render the beats' spans, see [Render inline choices and tooltips](/docs/how-to/render/scene#render-inline-choices-and-tooltips).

## Functions

### fillTokens

Returns a string with its [tokens](#tokens) filled for a state. Its signature is in [`fillTokens`](/docs/api/engine#filltokens).

The engine calls it on every block of words, label and line it shows. A UI or plugin calls it for words of its own, such as a panel's.

```ts given
import { fillTokens } from '@ifloom/engine'

fillTokens(state, game, '{{playerName}} has been here {{kv:visits of=storyline:ava}} times.')
// 'Sam has been here 4 times.'
```

### parseBeats

Returns the beats of a body of words, cut into paragraphs and spoken lines as [Markup](#markup) describes. Its signature is in [`parseBeats`](/docs/api/engine-plugin#parsebeats).

`find` is a [`SpeakerFinder`](#speakerfinder). Without it, `@you` and `@player` are the player's lines under `You`, and any other id is a character's under the id, with no `speaker`. The view already calls it, so code needs it only for words outside a scene. It leaves `[[act:]]`, `[[tip:]]`, `[[ui:]]` and stars in the words, since only the view knows the choices and the prose.

```ts
import { parseBeats } from '@ifloom/engine/plugin'

export const beats = parseBeats('The kettle clicks off.\n\n@ava: "Tea?"')
```

### styledBeats

Returns beats with their bold, italics and [UI pieces](#ui-pieces) cut into [spans](#inlinespan). Its signature is in [`styledBeats`](/docs/api/engine-plugin#styledbeats).

The view does this for a scene and a room, and a plugin's `context.beats` does it for the blocks it renders. A beat that already has `spans` stays as it is, and `[[act:]]` and `[[tip:]]` stay in the words.

```ts
import { parseBeats, styledBeats } from '@ifloom/engine/plugin'

styledBeats(parseBeats('The sign says **Closed**.'))
// [{ type: 'text', text: 'The sign says Closed.', spans: [{ type: 'text', text: 'The sign says ' }, { type: 'bold', text: 'Closed' }, { type: 'text', text: '.' }] }]
```

### proseBeats

Returns the prose line at a key as beats, with tokens filled, speakers named from their entities, and bold, italics and UI pieces in spans, or `null` when the game has no line at that key. Its signature is in [`proseBeats`](/docs/api/engine#prosebeats).

A UI uses it for a line it shows away from the scene, such as the dialog a UI piece opens. As with `styledBeats`, `[[act:]]` and `[[tip:]]` stay in the words.

```ts given
import { proseBeats } from '@ifloom/engine'

proseBeats(runner.state, runner.game, 'cafe.menu')
// [{ type: 'text', text: 'Tea, coffee, toast. Cake on Fridays.', spans: [...] }]
```

### inlineMarkup

Returns a line cut at its `[[act:]]`, `[[tip:]]`, `[[ui:]]`, bold and italic markup, or `null` when it has none. Its signature is in [`inlineMarkup`](/docs/api/engine#inlinemarkup).

Each part is an [`InlinePart`](#inlinepart). Malformed markup stays in the text around it, and each `\*` in a text part is already a plain star. The view makes its spans from it, and an editor can preview a line with it.

```ts
import { inlineMarkup } from '@ifloom/engine'

inlineMarkup('Ring. [[act:answer|Pick up]]')
// [{ type: 'text', text: 'Ring. ' }, { type: 'act', id: 'answer', text: 'Pick up', markup: '[[act:answer|Pick up]]' }]
```

### artSrc

Returns the path a picture or video loads from, under `art/`. Its signature is in [`artSrc`](/docs/api/engine#artsrc).

It strips a leading `/`, `art/` or `/art/`, and puts `art/` in front. A path with no media extension gets `.jpg`, or `.mp4` when `type` is `'video'`, and a URL such as `https://…` or `data:…` stays as it is. Every picture and video in the view has been through it, so a UI renders the view's paths as they come. The path is relative, so a built game opened from disk or a subpath finds `art/` beside its `index.html`.

```ts
import { artSrc } from '@ifloom/engine'

artSrc('place/cafe') // 'art/place/cafe.jpg'
artSrc('/art/place/cafe.png') // 'art/place/cafe.png'
artSrc('clips/kettle', 'video') // 'art/clips/kettle.mp4'
```

### mediaType

Returns whether a file is a picture or a video, by its extension. Its signature is in [`mediaType`](/docs/api/engine#mediatype).

`.mp4` and `.webm` are videos, and every other file is a picture, animated `.gif` and `.webp` included.

```ts
import { mediaType } from '@ifloom/engine'

mediaType('clips/kettle.mp4') // 'video'
mediaType('place/cafe.webp') // 'image'
```

## Checks

The [content checker](/docs/reference/checks) reads the markup in every block, label and prose line:

| Problem | Cause |
|---|---|
| `a spoken line is under "ava", which names no entity` | A line's `@id` names no entity. |
| `[[act:answer]] names no choice or action offered here` | An inline action names a choice the scene doesn't have. |
| `[[act:answer]] is in two blocks that can show together; only the first is drawn as an action` | Two lines that can show at once name one choice. |
| `[[tip:cafe.board]] needs the words to show: [[tip:cafe.board\|words]]` | A tooltip has no words. |
| `unknown flag "contols" in [[video:…]]` | A video has a `name=value` part, or a part beside the alt text, that isn't a flag. |
| `video flag "loop" on a picture in [[img:…]]` | A picture has a flag only a video takes. |
| `"*sigh" is not closed, so it is shown as written; close it, or write \* for a star` | A star opens and never closes. |
| `[[reveal]] is no longer markup and would be shown as written; …` | A paragraph holds `[[reveal]]`, which prose doesn't read. |

The checker also reports an unknown pool, track or tag, a tooltip key with no prose, a UI piece with no name, a name that isn't an id, no words or an empty argument, and markup that isn't closed. It warns about a bare token with no fallback that may print nothing, and reports a token that names no phrase, value or key, as [Tokens](/docs/reference/checks#prose) lists. Whether a UI renders a piece's name is that UI's own check, such as the React UI's `checkUiHints`.

## Caveats

- A paragraph that starts and ends with a quote is all speech, narration in the middle included. `"Morning," Ava says. "Beans are in."` shows `Ava says` as speech, so put the narration in its own paragraph.
- A line under an id or a label must use straight quotes and end with one, so `@ava: “…”` is plain text.
- A token's fallback can't hold a token, and a phrase wins over a value of one name, which wins over a kv key.
- In a room scene, `[[sound:id]]` becomes a beat but no cue, because no scene is open.
- Markup in a picture's alt text, a UI piece's words or a choice's label shows as written.
