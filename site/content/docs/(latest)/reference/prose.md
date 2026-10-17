---
title: "Prose and markup"
description: "Prose keys, tokens such as {{playerName}}, markup for speech, pictures, video, sound, inline actions and tooltips, and variants."
---
A game keeps its words apart from its logic, under prose keys. A scene names keys, a prose store turns each key into text, and the view parses that text into beats a UI can draw. This page covers all three. For the scenes that name keys, see [Scenes](/docs/reference/scenes).

## Prose keys

A prose key is a plain string. The engine only gives meaning to the label pattern (`scene#choice`) that a [`DataScene`](/docs/reference/scenes#datascene) uses:

| Key | Used for |
|---|---|
| `ava.hi` | Any `text` block. By convention, the scene's id is the key for its main body. |
| `ava.hi.regular` | Any other block. A `.` before the part is a convention, not syntax. |
| `ava.hi#chat` | The label for choice `chat` in scene `ava.hi`. It's the default when a choice gives no `label`. |
| `ava.smalltalk.rain#chat` | A label written for one drawn variant. If that member was drawn, it beats the scene's own label. |

Keep `/` out of your keys. It names a plugin everywhere else, as in `quests/done`. See [Ids and separators](/docs/reference/game#ids-and-separators).

Variants are named lists of keys, and one of them is drawn each time. The [loader](/docs/reference/loader) and [`proseStore`](#prosestore-1) take them as explicit lists (`Pack.variants`), where a member can carry a [weight](#variantmember). A store you build by hand can find them however it likes, for example by key prefix.

## ProseStore

```ts
import type { ProseStore } from '@ifloom/engine'

type ProseStore = {
  line: (key: string, state?: GameState) => string | undefined
  variants: (name: string) => string[]
  weight?: (name: string, key: string) => number
}
```

The game's `prose` field, where data scenes read their words. `line` returns the words for a key, filled in for this save, or `undefined` if nobody has written them. `variants` returns the member keys of a named set of variants, in declaration order. `weight` returns a member's weight in a set, 1 if it has none. Leave `weight` out and every member weighs 1.

You rarely write one by hand. [`loadGame`](/docs/reference/loader#loadgame) sets `game.prose` from its packs' prose and variants, and [`proseStore`](#prosestore-1) builds one from two plain records.

**Gotcha.** `line` is sometimes called without a state, when the scene renderer only wants to know whether a key is written. Return the raw text in that case.

## proseStore

```ts
function proseStore(
  game: Game,
  lines: Record<string, string>,
  variants?: Record<string, readonly VariantMember[]>,
): ProseStore
```

Builds a prose store from lines by key and variants by name. `line(key, state)` fills in the [tokens](#tokens) for that save with [`fillTokens`](#filltokens), and without a state it returns the line as written. `variants(name)` returns the member keys as given, or `[]`, and `weight(name, key)` returns the weight a member was given, or 1. The `variants` argument defaults to `{}`.

```ts
import { proseStore, type Game } from '@ifloom/engine'

const town: Game = { /* ... */ }
town.prose = proseStore(town, {
  'ava.hi': 'Ava looks up from the till. "Morning, {{playerName}}."',
  'street.weather.drizzle': 'A fine drizzle that never quite becomes rain.',
  'street.weather.sun': 'Sun on the shopfronts.',
}, {
  'street.weather': ['street.weather.drizzle', 'street.weather.sun'],
})
```

### VariantMember

```ts
import type { VariantMember } from '@ifloom/engine'

type VariantMember = string | { text: string; weight?: number }
```

One member of a variants list, in a [pack](/docs/reference/loader#pack)'s `variants` or `proseStore`'s: a prose key, or `{ text, weight }` for a key that should come up more or less often than the rest. A plain key weighs 1, and so does `{ text }` with no weight.

```ts
variants: {
  // Sun three times as often as drizzle or wind.
  'street.weather': [{ text: 'street.weather.sun', weight: 3 }, 'street.weather.drizzle', 'street.weather.wind'],
}
```

How a list draws depends on its weights:

- **Every member weighs 1.** The list rotates, as [`drawVariant`](/docs/reference/scenes#drawvariant) describes. It starts somewhere different each turn and walks one step per draw, so a line doesn't come up twice running until the list has gone round.
- **Any member weighs something else.** Each draw is a [weighted](/docs/reference/random#weighted) pick from the whole list, seeded by the save, the turn and the count of draws so far. Heavier members come up more often, and the same line can come up twice running.

The members counted are the ones left after a [`variants` block](/docs/reference/scenes#block)'s `gate`, so if every member with a weight is gated out, the rest rotate.

A pack that adds to another pack's list adds its members with their weights. The [content checker](/docs/reference/checks) reports a weight of 0 or less as `"…" has a weight of …; a weight must be above 0`, against `variants <name>`.

**Gotcha.** The store needs the game, because `{{v:name}}` reads `game.custom.values` and the game's plugins. It keeps the game by reference, so declare the game first and set `prose` on it afterwards, as above. `loadGame` does this for you.

## Tokens

A line of prose can carry tokens, which are filled in for the save when the line is read:

| Token | Becomes |
|---|---|
| `{{playerName}}` | The key `playerName` in the game's [kv store](/docs/reference/state#kv), when it's a string or a number. Any name works the same way, so `{{catName}}` is `state.kv.catName`. |
| `{{n:ava.visits}}` | The counter `visits` on storyline `ava` ([`count`](/docs/reference/progress#counters)), or 0 if unset. |
| `{{v:coffeePrice}}` | The game's [custom value](/docs/reference/custom#values) `coffeePrice`, as text. |
| `{{v:quests/updates}}` | The value `updates` of the [plugin](/docs/reference/plugins#naming) `quests`, as text. |
| `{{v:messages/unread channel=texts}}` | A value asked with arguments, here `{ channel: 'texts' }`. |

`A coffee is {{v:coffeePrice}} today, {{playerName}}.`

The engine has no player name of its own. A game that wants one sets a kv key, with an [input](/docs/reference/inputs) or in the `kv` passed to [`startingState`](/docs/reference/commands#startingstate), and prose reads it like any other.

**Gotchas:**
- A `{{name}}` whose key is unset, or is `true` or `false`, is left in place, braces and all. Set the key before the line is shown, or keep the line behind a [`{ kv }`](/docs/reference/conditions#kv) condition.
- A key in a token is letters, digits and `_`, and can't start with a digit. A key named `cat-name` can be set but can't be printed this way.
- A `{{v:…}}` naming a value the game doesn't declare is left in place, so the missing name shows on screen instead of vanishing.
- In `{{n:storyline.key}}`, the storyline id is letters, digits, `_` and `-`, and the key is letters, digits and `_`.
- A `{{v:…}}` name is letters, digits, `_` and `-`. A plugin value is the plugin's id (letters, digits and `-`), a `/`, and such a name. Arguments follow the name as `key=value`, separated by spaces, as in `{{v:messages/unread channel=texts}}`. A number or `true`/`false` is passed as one, anything else as text. Anything else isn't a token and is left as written.
- The pronoun forms on a [cast](/docs/plugins/cast#characterdef) character (`pronouns`) aren't tokens. A game that wants them substitutes them itself.

## fillTokens

```ts
function fillTokens(text: string, state: GameState, game: Game): string
```

Fills in the [tokens](#tokens) in one string. `proseStore` calls it on every line. Call it yourself for text that doesn't come from the store, such as an activity's label, a phone message or a custom panel.

```ts
import { fillTokens } from '@ifloom/engine'

fillTokens('{{playerName}} has been here {{n:ava.visits}} times.', state, game)
// 'Sam has been here 4 times.'
```

## Prose

```ts
import type { Prose } from '@ifloom/engine'

type Prose = {
  line: (key: string, state?: GameState) => string | undefined
  variants: (name: string) => string[]
  draw: (state: GameState, name: string, members: string[]) => { id: string; remember: Effect }
}
```

How [`renderScene`](/docs/reference/scenes#renderscene) reads its words, as part of a [`SceneRuntime`](/docs/reference/scenes#sceneruntime). It's a `ProseStore` plus `draw`. `draw` picks one member of a set of variants for this state and returns an effect that records the pick, so the next draw can rotate. You only need it for a custom runtime. The [default runtime](/docs/reference/scenes#defaultruntime) uses `game.prose` and [`drawVariant`](/docs/reference/scenes#drawvariant).

See [Randomness](/docs/reference/random) for why each draw is named.

## Markup

The text at a prose key is split into paragraphs on blank lines, and each paragraph becomes one [`SceneBeat`](#scenebeat). The view does this for you, so `view().scene.beats` is the parsed body.

| Write | Beat |
|---|---|
| Plain paragraph | `{ kind: 'text', text }` |
| `> A thought, in your own head.` | `{ kind: 'mono', text }`. The `> ` is only removed from the start of the paragraph. |
| `Ava: "New beans this week."` | `{ kind: 'say', who: 'character', text }` |
| `You: "Just a coffee, then."` | `{ kind: 'say', who: 'player', text }` |
| `"Anything else?"` (a bare quote) | `say`, alternating (see below). |
| `[[img:place/market]]` | `{ kind: 'image', size: 'inline', src }` |
| `[[wide:scene/market-morning\|The market at seven]]` | `{ kind: 'image', size: 'wide', src, alt }` |
| `[[wide:scene/sign.svg\|A painted sign\|rot]]` | adds `rotate: true` |
| `[[video:clips/kettle]]` | `{ kind: 'video', size: 'inline', src, autoplay, loop, muted, controls }` |
| `[[widevideo:clips/rain\|controls\|Rain on the window]]` | `{ kind: 'video', size: 'wide', src, alt, ... }` |
| `[[img:@door\|red,night]]` | `image`, with a file picked from the pool `door` |
| `[[mail]] … [[/mail]]` | `{ kind: 'mail', headers, body }` |
| `[[sticky]] … [[/sticky]]` | `{ kind: 'prop', face: 'sticky', text }` |
| `[[clip]] … [[/clip]]` | `{ kind: 'prop', face: 'clip', text }` |
| `[[diary]] … [[/diary]]` | `{ kind: 'prop', face: 'diary', text }` |
| `[[sound:knock]]` | `{ kind: 'sound', track }`. Nothing to draw. |
| `Ava: "Hi!" [[voice:ava.hello]]` | `say`, with `voice: 'ava.hello'` |
| `[[reveal]]`, `[[reveal:1500]]`, `[[reveal:1500\|slide-up]]` | `{ kind: 'reveal', delay, as, at }`. Nothing to draw: what follows waits. |
| `… [[act:answer\|Pick it up]] …` inside a paragraph | The paragraph's `text` or `say` beat gets `spans`, with an `action` span for the choice. See [Inline actions and tooltips](#inline-actions-and-tooltips). |
| `… [[tip:cafe.menu\|the menu]] …` inside a paragraph | The same, with a `tip` span holding the prose line `cafe.menu`. |

There's no markup for emphasis or for styling a line. `**bold**` and `*italic*` are left as written, and a paragraph can't carry a class. A line that should stand out, such as a warning that work is due, is a block of its own with a `when`, and your UI decides how it looks. For news the player shouldn't miss, raise a [notice](/docs/reference/notices) instead. Inside the line, a [tooltip](#inline-actions-and-tooltips) can carry the detail.

### Speech

- **A named line** is a whole paragraph of the form `Name: "…"`, where the name is letters, spaces, `'` and `-`. `You` makes it the player's line, and any other name makes it a character's. The name itself isn't kept on the beat, because the UI takes the speaker from the scene.
- **A bare quote** is a whole paragraph wrapped in `"…"` or `“…”`. After a character's line it's the player's. Anywhere else (after the player, after narration, or at the start) it's the character's.
- **Any other paragraph** resets the alternation.

```md
Ava wipes her hands on her apron.

"You're early."

"Couldn't sleep."

Ava: "Then you get the first cup."
```

That's text, character, player, character.

**Gotchas:**
- A named line must use straight quotes and end with one. `Ava: “…”` is plain text.
- A paragraph that starts and ends with a quote is all drawn as speech, even with narration in the middle. `"Morning," Ava says. "Beans are in."` is drawn as speech, `Ava says` included. Put the narration in a paragraph of its own:

```md
Ava looks up from the till.

"Morning. Beans are in."
```

### Images

Write `[[size:path|…]]`, with size `img` (inline) or `wide`. Optional parts follow the path, each after a `|`. `rot` turns the picture (`rotate: true`), and any other part is the alt text. So `[[img:place/market|rot]]` is rotated with no alt, and `[[img:place/market|rot|The market]]` is the same as `[[img:place/market|The market|rot]]`. The path goes through [`artSrc`](#artsrc).

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
- The loader reports a video flag on a picture, and `rot` on a video.

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

Ava: "Are you coming to the café?" [[voice:ava.cafe]]
```

The open scene's sound and voice beats are in [`view.audio.cues`](/docs/reference/audio#sounds-and-voices), in beat order, each with a key that changes only when the scene is entered again. Voices go to the `voice` channel. `@ifloom/audio` plays them, one voice after another.

**Gotchas:**
- `[[voice:id]]` only counts at the end of a [spoken line](#speech). Anywhere else it stays in the text, brackets included.
- In a place's body (the [stage](/docs/reference/plugins#stage)), `[[sound:id]]` becomes a beat but isn't cued, because no scene is open.
- The loader reports an unknown track, a playlist, and a track on a background channel such as `music`.

### Reveals

`[[reveal]]` on a paragraph of its own holds back what follows. It waits 800 milliseconds after the reveal before it, or after the scene comes on, then the UI brings the rest in with a fade. Give a delay in whole milliseconds after a colon, and a [transition name](/docs/reference/transitions#transitionname) after a `|`:

```md
Ava is on the bench with her shoes off, feeding the ducks the crusts of the day.

[[reveal:1500|slide-up]]

"I told you it was the only quiet in town." She shuffles up to make room.
```

Each one becomes a `reveal` beat. Its `at` is when it comes, counted from the scene coming on, so a UI can time each group without adding the delays up itself. A block's [`reveal`](/docs/reference/scenes#block) field writes the same markup. See [Reveals](/docs/reference/transitions#reveals) for what a UI should do with it.

**Gotchas:**
- Only a paragraph of its own counts. `[[reveal]]` inside a paragraph is shown as written, and the loader reports it.
- The text after a reveal is in the beats from the start. Only how it's drawn waits, so screen readers have it all.

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
  body: [{ text: 'kitchen.phone' }],
  choices: [
    { id: 'answer', command: openApp('texts'), effects: [{ kind: 'kv', key: 'answered', to: true }] },
    { id: 'ignore', effects: [{ kind: 'scene', scene: null }] },
  ],
}
```

**Gotchas:**
- A choice left off the screen (its `when` fails, or a `blocked` entry with `hide` holds) is drawn as its words, with no link. So is one the scene doesn't have, and the loader reports it.
- One choice is drawn inline once. A second `[[act:]]` for it shows as words, and the loader reports it when both can be on screen together. Two blocks that each have a `when` are taken to be alternatives and aren't reported.
- A tooltip whose key has no prose shows its words with no note, and the loader reports it. `[[tip:key]]` with no words is shown as written.
- Inline markup in a `> ` line, a picture's alt text or a fenced section is shown as written.
- The backlog keeps an inline action as its words, with nothing to press. Tooltips stay.

### Fenced sections

`[[mail]]`, `[[sticky]]`, `[[clip]]` and `[[diary]]` open a section that runs to the matching close tag, across blank lines. Text before and after is parsed as usual. In `mail`, leading `From:`, `To:`, `Cc:`, `Bcc:`, `Subject:` and `Date:` lines become `headers` (`{ key, value }`, in order). One blank line after them is skipped, and the rest is `body`.

```md
[[mail]]
From: The Library
Subject: Your reservation

The atlas you asked for is in. We hold books for a week.
[[/mail]]
```

## SceneBeat

```ts
import type { SceneBeat } from '@ifloom/engine'

type SceneBeat =
  | { kind: 'text'; text: string; spans?: InlineSpan[] }
  | { kind: 'mono'; text: string }
  | { kind: 'say'; who: 'character' | 'player'; text: string; voice?: string; spans?: InlineSpan[] }
  | { kind: 'image'; src: string; alt?: string; size: 'inline' | 'wide'; rotate?: boolean }
  | {
      kind: 'video'
      src: string
      poster?: string
      alt?: string
      size: 'inline' | 'wide'
      autoplay: boolean
      loop: boolean
      muted: boolean
      controls: boolean
    }
  | { kind: 'mail'; headers: { key: string; value: string }[]; body: string }
  | { kind: 'prop'; face: 'sticky' | 'clip' | 'diary'; text: string }
  | { kind: 'sound'; track: string }
  | { kind: 'reveal'; delay: number; as: TransitionName; at: number }
```

One piece of a scene. A UI switches on `kind`, and draws nothing for `sound` or `reveal`. A `reveal` beat marks where held-back beats start: see [Reveals](#reveals).

A `text` or `say` beat has `spans` only when its paragraph holds an [inline action or a tooltip](#inline-actions-and-tooltips) that the view could draw. Its `text` is the same words without the markup either way.

A `video` beat always has all four of `autoplay`, `loop`, `muted` and `controls`, worked out from its [flags](#videos). Without flags they're `true`, `true`, `true` and `false`. With `controls`, `autoplay` is `false`.

A data scene's `{ media }` blocks become `image` or `video` beats where they are in the body. Media with `at: 'lead'` comes before the body, and media with `at: 'end'` (or a hand-built scene's [`media`](/docs/reference/scenes#scenemedia) with no `at`) comes after it.

## InlineSpan

```ts
import type { InlineSpan } from '@ifloom/engine'

type InlineSpan =
  | { kind: 'text'; text: string }
  | { kind: 'action'; text: string; choice: RenderedChoice }
  | { kind: 'tip'; text: string; tip: string }
```

One piece of a paragraph that holds [inline actions or tooltips](#inline-actions-and-tooltips), in order. Joined, the `text` of every span is the beat's `text`.

- `text` is words to draw as they are.
- `action` is an inline action: `text` is the words of its link, and `choice` is what it presses, as [`view.scene.choices`](/docs/reference/view#the-scene) would have it (`command`, `disabled`, `price`, `irreversible`, `warning`). Send `choice.command` when it's pressed and `disabled` is unset.
- `tip` is a tooltip: `text` is the words shown, and `tip` the note, filled in for this save.

A UI draws an `action` as a button in the line and a `tip` as a button that shows its note. The React UI does both with [`InlineAction`](/docs/react/components#inlineaction) and [`Tip`](/docs/react/components#tip). For your own UI, see [Actions and tooltips in the text](/docs/guide/inline-actions).

## parseBeats

```ts
import { parseBeats } from '@ifloom/engine'

function parseBeats(body: string): SceneBeat[]
```

The parser described above. [`view`](/docs/reference/view) already calls it, so you only need it to parse text outside a scene. It leaves `[[act:]]` and `[[tip:]]` in the text: the view draws them, because only the view knows the choices and the prose.

## inlineMarkup

```ts
import { inlineMarkup, type InlinePart } from '@ifloom/engine'

function inlineMarkup(text: string): InlinePart[] | null

type InlinePart =
  | { kind: 'text'; text: string }
  | { kind: 'act'; id: string; text?: string; markup: string }
  | { kind: 'tip'; key: string; text: string; markup: string }
```

A line cut at its `[[act:]]` and `[[tip:]]` markup, as written, or `null` when it has none. `markup` is the markup itself. Malformed markup (no id or key, a tooltip with no words) stays in the text around it. The view uses it to make [`InlineSpan`](#inlinespan)s, and an editor can use it to preview a line.

```ts
inlineMarkup('Ring. [[act:answer|Pick up]]')
// [{ kind: 'text', text: 'Ring. ' }, { kind: 'act', id: 'answer', text: 'Pick up', markup: '[[act:answer|Pick up]]' }]
```

## artSrc

```ts
import { artSrc } from '@ifloom/engine'

function artSrc(path: string, kind?: 'image' | 'video'): string
```

Resolves a picture's or a video's path. Everything in the engine resolves media through it. It strips a leading `/`, `art/` or `/art/`, and puts `art/` in front. If the path doesn't already end in `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.avif`, `.svg`, `.mp4` or `.webm`, it adds `.jpg`, or `.mp4` when `kind` is `'video'`.

```ts
artSrc('place/cafe')             // 'art/place/cafe.jpg'
artSrc('/art/place/cafe.png')    // 'art/place/cafe.png'
artSrc('clips/kettle', 'video')  // 'art/clips/kettle.mp4'
```

The result is relative on purpose. A built game is a folder opened from disk or from a subpath, where a path starting `/` would point at the root of the drive or host instead of beside `index.html`. Put your pictures in `art/` next to the game's `index.html`. Sound files work the same way under `audio/`, through [`audioSrc`](/docs/reference/audio#audiosrc).

## mediaKind

```ts
import { mediaKind } from '@ifloom/engine'

function mediaKind(src: string): 'image' | 'video'
```

Whether a file is drawn as a picture or a video, by its extension. `.mp4` and `.webm` are videos, and everything else is a picture, animated `.gif` and `.webp` included.

```ts
mediaKind('clips/kettle.mp4') // 'video'
mediaKind('place/cafe.webp')  // 'image'
```

## See it in an example

- Small Town: [`examples/showcase/src/content/prose.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/prose.ts) holds every line by key, with choice labels as `<scene>#<choice>`. Ava's greeting is speech, and her small talk uses named lines. The flat's line prints a custom value with `{{v:catName}}`.
- Small Town's intro has a tooltip on "launderette", and the flat's `place.flat.text` line holds `[[act:read-text|Check it]]`, the room's button that opens the phone's messages.
- The Letter: the `prose` in [`examples/novel/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/game.ts) prints the reader's name with `{{playerName}}`.
