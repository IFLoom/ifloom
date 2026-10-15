# Prose and markup

A game keeps its words apart from its logic, under prose keys. A scene names keys, a prose store turns each key into text, and the view parses that text into beats a UI can draw. This page covers all three. For the scenes that name keys, see [Scenes](/reference/scenes).

## Prose keys

A prose key is a plain string. The engine only gives meaning to the label pattern (`scene#choice`) that a [`DataScene`](/reference/scenes#datascene) uses:

| Key | Used for |
|---|---|
| `ava.hi` | Any `text` block. By convention, the scene's id is the key for its main body. |
| `ava.hi/regular` | Any other block. The `/` is a convention, not syntax. |
| `ava.hi#chat` | The label for choice `chat` in scene `ava.hi`. It's the default when a choice gives no `label`. |
| `ava.smalltalk/rain#chat` | A label written for one drawn variant. If that member was drawn, it beats the scene's own label. |

Variants are named lists of keys, and one of them is drawn each time. The [loader](/reference/loader) and [`proseStore`](#prosestore-1) take them as explicit lists (`Pack.variants`), where a member can carry a [weight](#variantmember). A store you build by hand can find them however it likes, for example by key prefix.

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

You rarely write one by hand. [`loadGame`](/reference/loader#loadgame) sets `game.prose` from its packs' prose and variants, and [`proseStore`](#prosestore-1) builds one from two plain records.

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
  'street.weather/drizzle': 'A fine drizzle that never quite becomes rain.',
  'street.weather/sun': 'Sun on the shopfronts.',
}, {
  'street.weather': ['street.weather/drizzle', 'street.weather/sun'],
})
```

### VariantMember

```ts
import type { VariantMember } from '@ifloom/engine'

type VariantMember = string | { text: string; weight?: number }
```

One member of a variants list, in a [pack](/reference/loader#pack)'s `variants` or `proseStore`'s: a prose key, or `{ text, weight }` for a key that should come up more or less often than the rest. A plain key weighs 1, and so does `{ text }` with no weight.

```ts
variants: {
  // Sun three times as often as drizzle or wind.
  'street.weather': [{ text: 'street.weather/sun', weight: 3 }, 'street.weather/drizzle', 'street.weather/wind'],
}
```

How a list draws depends on its weights:

- **Every member weighs 1.** The list rotates, as [`drawVariant`](/reference/scenes#drawvariant) describes. It starts somewhere different each turn and walks one step per draw, so a line doesn't come up twice running until the list has gone round.
- **Any member weighs something else.** Each draw is a [weighted](/reference/random#weighted) pick from the whole list, seeded by the save, the turn and the count of draws so far. Heavier members come up more often, and the same line can come up twice running.

The members counted are the ones left after a [`variants` block](/reference/scenes#block)'s `gate`, so if every member with a weight is gated out, the rest rotate.

A pack that adds to another pack's list adds its members with their weights. The [loader](/reference/loader#the-checks) reports a weight of 0 or less as `"…" has a weight of …; a weight must be above 0`, against `variants <name>`.

**Gotcha.** The store needs the game, because <code v-pre>{{v:name}}</code> reads `game.custom.values` and the game's plugins. It keeps the game by reference, so declare the game first and set `prose` on it afterwards, as above. `loadGame` does this for you.

## Tokens

A line of prose can carry tokens, which are filled in for the save when the line is read:

| Token | Becomes |
|---|---|
| <code v-pre>{{playerName}}</code> | The game's [variable](/reference/state#flags) `playerName`, when it's a string or a number. Any name works the same way, so <code v-pre>{{catName}}</code> is `state.flags.catName`. |
| <code v-pre>{{n:ava.visits}}</code> | The counter `visits` on storyline `ava` ([`count`](/reference/progress#counters)), or 0 if unset. |
| <code v-pre>{{v:coffeePrice}}</code> | The game's [custom value](/reference/custom#values) `coffeePrice`, as text. |
| <code v-pre>{{v:quests/updates}}</code> | The value `updates` of the [plugin](/reference/plugins#naming) `quests`, as text. |

<code v-pre>A coffee is {{v:coffeePrice}} today, {{playerName}}.</code>

The engine has no player name of its own. A game that wants one sets a variable, with an [input](/reference/inputs) or in the `flags` passed to [`startingState`](/reference/commands#startingstate), and prose reads it like any other.

**Gotchas:**
- A <code v-pre>{{name}}</code> whose variable is unset, or is `true` or `false`, is left in place, braces and all. Set the variable before the line is shown, or keep the line behind a [`{ flag }`](/reference/conditions#flag) condition.
- A variable name in a token is letters, digits and `_`, and can't start with a digit. A variable named `cat-name` can be set but can't be printed this way.
- A <code v-pre>{{v:…}}</code> naming a value the game doesn't declare is left in place, so the missing name shows on screen instead of vanishing.
- In <code v-pre>{{n:storyline.key}}</code>, the storyline id is letters, digits, `_` and `-`, and the key is letters, digits and `_`.
- A <code v-pre>{{v:…}}</code> name is letters, digits, `_` and `-`. A plugin value is the plugin's id (letters, digits and `-`), a `/`, and such a name, so <code v-pre>{{v:messages/unread-texts}}</code> prints. Anything else isn't a token and is left as written.
- The pronoun forms on a [cast](/plugins/cast#characterdef) character (`pronouns`) aren't tokens. A game that wants them substitutes them itself.

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

How [`renderScene`](/reference/scenes#renderscene) reads its words, as part of a [`SceneRuntime`](/reference/scenes#sceneruntime). It's a `ProseStore` plus `draw`. `draw` picks one member of a set of variants for this state and returns an effect that records the pick, so the next draw can rotate. You only need it for a custom runtime. The [default runtime](/reference/scenes#defaultruntime) uses `game.prose` and [`drawVariant`](/reference/scenes#drawvariant).

See [Randomness](/reference/random) for why each draw is named.

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

The React UI draws video beats with [`Video`](/react/components#video). A UI of your own reads the flags off the beat.

**Gotchas:**
- Only one part can be the alt text. The loader reports a second one, because it's usually a misspelt flag (`contols`).
- A `name=value` part with a name that isn't a flag, such as `speed=2`, is reported as an unknown flag.
- The loader reports a video flag on a picture, and `rot` on a video.

### Pools

Instead of a path, write `@` and the name of a [pool](/reference/media#pools) to have the engine pick a file for you. The first part after the pool is always the tags you want, separated by commas.

```md
[[img:@door|red,night|The front door]]

[[video:@window|rain]]
```

The engine picks a file with every tag. If no file has them all, it drops the last tag and tries again, down to any file in the pool. The pick is drawn from the save's seed and remembered, so the same markup in the same place shows the same file on every visit and after a reload. See [Media](/reference/media#pools) for the details.

**Gotchas:**
- The tags part comes first even when it's empty. Write `[[img:@door||A front door]]` for alt text with no tags, because `[[img:@door|A front door]]` asks for a tag called "A front door".
- If the pool has nothing to give, the markup is left out.
- The loader reports an unknown pool and a tag no file in the pool has.

### Sound and voice

`[[sound:id]]` on a paragraph of its own plays a [track](/reference/audio#trackdef) once when the scene is shown. It becomes a `sound` beat, which a UI draws as nothing. `[[voice:id]]` at the end of a spoken line is that line read aloud. It's kept on the `say` beat as `voice`, and the line is drawn without it.

```md
The phone buzzes on the table.

[[sound:buzz]]

Ava: "Are you coming to the café?" [[voice:ava.cafe]]
```

The open scene's sound and voice beats are in [`view.audio.cues`](/reference/audio#sounds-and-voices), in beat order, each with a key that changes only when the scene is entered again. Voices go to the `voice` channel. `@ifloom/audio` plays them, one voice after another.

**Gotchas:**
- `[[voice:id]]` only counts at the end of a [spoken line](#speech). Anywhere else it stays in the text, brackets included.
- In a place's body (the [stage](/reference/plugins#stage)), `[[sound:id]]` becomes a beat but isn't cued, because no scene is open.
- The loader reports an unknown track, a playlist, and a track on a background channel such as `music`.

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
  | { kind: 'text'; text: string }
  | { kind: 'mono'; text: string }
  | { kind: 'say'; who: 'character' | 'player'; text: string; voice?: string }
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
```

One piece of a scene. A UI switches on `kind`, and draws nothing for `sound`.

A `video` beat always has all four of `autoplay`, `loop`, `muted` and `controls`, worked out from its [flags](#videos). Without flags they're `true`, `true`, `true` and `false`. With `controls`, `autoplay` is `false`.

A data scene's `{ media }` blocks become `image` or `video` beats where they are in the body. Media with `at: 'lead'` comes before the body, and media with `at: 'end'` (or a hand-built scene's [`media`](/reference/scenes#scenemedia) with no `at`) comes after it.

## parseBeats

```ts
import { parseBeats } from '@ifloom/engine'

function parseBeats(body: string): SceneBeat[]
```

The parser described above. [`view`](/reference/view) already calls it, so you only need it to parse text outside a scene.

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

The result is relative on purpose. A built game is a folder opened from disk or from a subpath, where a path starting `/` would point at the root of the drive or host instead of beside `index.html`. Put your pictures in `art/` next to the game's `index.html`. Sound files work the same way under `audio/`, through [`audioSrc`](/reference/audio#audiosrc).

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

