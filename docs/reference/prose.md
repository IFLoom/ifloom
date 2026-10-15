# Prose and markup

The words of a game live apart from its logic, under **prose keys**. A scene names keys; a prose store turns a key into text; the view parses that text into **beats** a UI can draw. This page covers all three. For the scenes that name keys, see [Scenes](/reference/scenes).

## Prose keys

A prose key is a plain string. The engine attaches meaning to only one pattern, used by [`DataScene`](/reference/scenes#datascene):

| Key | Used for |
|---|---|
| `market.stall` | Any `text` block — by convention the scene's id for its main body. |
| `market.stall/weekend` | Any other block. The `/` is a convention, not syntax. |
| `market.stall#buy` | The label for choice `buy` in scene `market.stall` — the default when a choice gives no `label`. |
| `market.stall.chat/2#buy` | A label written for one drawn variant: if that member was drawn, it beats the scene's own label. |

**Variants** are named lists of keys, one of which is drawn each time. Through the [loader](/reference/loader) and [`proseStore`](#prosestore-1) they are listed explicitly (`Pack.variants`); a hand-built store can find them however it likes, for example by key prefix.

## ProseStore

```ts
import type { ProseStore } from '@ifloom/engine'

type ProseStore = {
  line: (key: string, state?: GameState) => string | undefined
  variants: (name: string) => string[]
}
```

The game's `prose` field: where data scenes read their words. `line` returns the words for a key, filled in for this save, or `undefined` if nobody has written them; `variants` returns the member keys of a named set of variants, in declaration order.

You rarely write one by hand. [`loadGame`](/reference/loader#loadgame) sets `game.prose` from its packs' prose and variants, and [`proseStore`](#prosestore-1) builds one from two plain records.

**Gotcha:** `line` is sometimes called *without* a state — the scene renderer calls it only to ask whether a key is written. Return the raw text then.

## proseStore

```ts
function proseStore(
  game: Game,
  lines: Record<string, string>,
  variants?: Record<string, string[]>,
): ProseStore
```

A prose store from lines by key and variants by name. `line(key, state)` fills the [tokens](#tokens) for that save with [`fillTokens`](#filltokens); without a state it returns the line as written. `variants(name)` returns the list as given, or `[]`. `variants` defaults to `{}`.

```ts
import { proseStore } from '@ifloom/engine'

const town: Game = { /* ... */ }
town.prose = proseStore(town, {
  'cafe.counter': 'Rosa wipes the counter. "Morning, {{playerName}}."',
  'cafe.weather/rain': 'Rain on the window.',
  'cafe.weather/sun': 'Sun on the tables.',
}, {
  'cafe.weather': ['cafe.weather/rain', 'cafe.weather/sun'],
})
```

**Gotcha:** the store needs the game, because <code v-pre>{{v:name}}</code> reads `game.custom.values` and the game's plugins. It keeps the game by reference, so declare the game first and set `prose` on it afterwards, as above. `loadGame` does this for you.

## Tokens

A line of prose can carry tokens, filled for the save when the line is read:

| Token | Becomes |
|---|---|
| <code v-pre>{{playerName}}</code> | The game's [variable](/reference/state#flags) `playerName`, when it is a string or a number. Any name works the same way: <code v-pre>{{catName}}</code> is `state.flags.catName`. |
| <code v-pre>{{n:rosa.visits}}</code> | The counter `visits` on storyline `rosa` ([`count`](/reference/progress#counters)), 0 if unset. |
| <code v-pre>{{v:breadPrice}}</code> | The game's [custom value](/reference/custom#values) `breadPrice`, as text. |
| <code v-pre>{{v:quests/updates}}</code> | The value `updates` of the [plugin](/reference/plugins#naming) `quests`, as text. |

<code v-pre>A loaf is {{v:breadPrice}} today, {{playerName}}.</code>

The engine has no player name of its own. A game that wants one sets a variable — with an [input](/reference/inputs), or in the `flags` passed to [`startingState`](/reference/commands#startingstate) — and prose reads it like any other.

**Gotchas:**
- A <code v-pre>{{name}}</code> whose variable is unset, or is `true` or `false`, is **left in place**, braces and all. Set the variable before the line is shown, or keep the line behind a [`{ flag }`](/reference/conditions#flag) condition.
- A variable name in a token is letters, digits and `_`, not starting with a digit. A variable named `cat-name` is set fine but cannot be printed this way.
- A <code v-pre>{{v:…}}</code> naming a value the game does not declare is **left in place**, so the missing name shows on screen instead of vanishing.
- In <code v-pre>{{n:storyline.key}}</code>, the storyline id is letters, digits, `_` and `-`, and the key letters, digits and `_`. A <code v-pre>{{v:…}}</code> name is letters, digits, `_` and `-`; a plugin value is the plugin's id (letters, digits and `-`), a `/`, and such a name, so <code v-pre>{{v:messages/unread-texts}}</code> prints. Anything else is not a token and is left as written.
- The pronoun forms on a [cast](/plugins/cast#characterdef) character (`pronouns`) are not tokens; a game that wants them substitutes them itself.

## fillTokens

```ts
function fillTokens(text: string, state: GameState, game: Game): string
```

Fills the [tokens](#tokens) in one string. `proseStore` calls it on every line; call it yourself for text that does not come from the store — an activity's label, a phone message, a custom panel.

```ts
fillTokens('{{playerName}} has been here {{n:rosa.visits}} times.', state, town)
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

What [`renderScene`](/reference/scenes#renderscene) reads its words through, as part of a [`SceneRuntime`](/reference/scenes#sceneruntime): a `ProseStore` plus `draw`, which picks one member of a set of variants for this state and returns an effect recording the pick, so the next draw can rotate. You need it only for a custom runtime; the [default runtime](/reference/scenes#defaultruntime) uses `game.prose` and [`drawVariant`](/reference/scenes#drawvariant).

See [Randomness](/reference/random) for why each draw is named.

## Markup

The text at a prose key is split into **paragraphs** on blank lines. Each paragraph becomes one [`SceneBeat`](#scenebeat). The view does this for you: `view().scene.beats` is the parsed body.

| Write | Beat |
|---|---|
| Plain paragraph | `{ kind: 'text', text }` |
| `> A thought, in your own head.` | `{ kind: 'mono', text }` — the `> ` is removed from the start of the paragraph only. |
| `Baker: "Fresh out of rye, sorry."` | `{ kind: 'say', who: 'character', text }` |
| `You: "Just a bun, then."` | `{ kind: 'say', who: 'player', text }` |
| `"Anything else?"` (a bare quote) | `say`, alternating — see below. |
| `[[img:place/market]]` | `{ kind: 'image', size: 'inline', src }` |
| `[[wide:scene/market-morning\|The market at seven]]` | `{ kind: 'image', size: 'wide', src, alt }` |
| `[[wide:scene/sign.svg\|A painted sign\|rot]]` | adds `rotate: true` |
| `[[mail]] … [[/mail]]` | `{ kind: 'mail', headers, body }` |
| `[[sticky]] … [[/sticky]]` | `{ kind: 'prop', face: 'sticky', text }` |
| `[[clip]] … [[/clip]]` | `{ kind: 'prop', face: 'clip', text }` |
| `[[diary]] … [[/diary]]` | `{ kind: 'prop', face: 'diary', text }` |

### Speech

- A **named line** is a whole paragraph of the form `Name: "…"`, where the name is letters, spaces, `'` and `-`. `You` makes it the player's; any other name makes it a character's. The name itself is not kept on the beat — the UI takes the speaker from the scene.
- A **bare quote** is a whole paragraph wrapped in `"…"` or `“…”`. It alternates: after a character's line it is the player's; otherwise (after the player, after narration, at the start) it is the character's.
- Any non-speech paragraph resets the alternation.

```md
The baker wipes her hands on her apron.

"You're early."

"Couldn't sleep."

Baker: "Then you get the first batch."
```

That is text, character, player, character.

**Gotchas:**
- A named line must use straight quotes and end with one; `Baker: “…”` is plain text.
- A paragraph that **starts and ends with a quote** is a spoken line, all of it, even with narration in the middle: `"Morning," the baker says. "Rye's out."` is drawn as speech, `the baker says` included. Put the narration in a paragraph of its own:

```md
The baker looks up from the till.

"Morning. Rye's out."
```

### Images

`[[size:path|…]]` with size `img` (inline) or `wide`. After the path come optional parts, each after a `|`: `rot` turns the picture (`rotate: true`), and any other part is the alt text. `[[img:place/market|rot]]` is rotated with no alt; `[[img:place/market|rot|The market]]` and `[[img:place/market|The market|rot]]` are the same. The path goes through [`artSrc`](#artsrc).

**Gotcha:** the image must be a paragraph on its own. Anything else in the paragraph, or any other size word, and the whole paragraph is drawn as plain text, brackets included.

### Fenced sections

`[[mail]]`, `[[sticky]]`, `[[clip]]` and `[[diary]]` open a section that runs to the matching close tag, across blank lines. Text before and after is parsed as usual. In `mail`, leading `From:`, `To:`, `Cc:`, `Bcc:`, `Subject:` and `Date:` lines become `headers` (`{ key, value }`, in order); one blank line after them is skipped and the rest is `body`.

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
  | { kind: 'say'; who: 'character' | 'player'; text: string }
  | { kind: 'image'; src: string; alt?: string; size: 'inline' | 'wide'; rotate?: boolean }
  | { kind: 'mail'; headers: { key: string; value: string }[]; body: string }
  | { kind: 'prop'; face: 'sticky' | 'clip' | 'diary'; text: string }
```

One drawable piece of a scene, in order. A UI switches on `kind`. Beats from a scene's [`media`](/reference/scenes#scenemedia) are merged in as `image` beats: `lead` media first, then the body, then the rest.

## parseBeats

```ts
import { parseBeats } from '@ifloom/engine'

function parseBeats(body: string): SceneBeat[]
```

The parser above; [`view`](/reference/view) already calls it, so you need it only to parse text outside a scene.

## artSrc

```ts
import { artSrc } from '@ifloom/engine'

function artSrc(path: string): string
```

The one place a picture's path is resolved. Strips a leading `/`, `art/` or `/art/`, puts `art/` in front, and adds `.jpg` unless the path already ends in `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.webm`, `.mp4` or `.svg`.

```ts
artSrc('place/cafe')          // 'art/place/cafe.jpg'
artSrc('/art/place/cafe.png') // 'art/place/cafe.png'
```

The result is relative on purpose: a built game is a folder opened from disk or from a subpath, where a path starting `/` points at the root of the drive or host instead of beside `index.html`. Put your pictures in `art/` next to the game's `index.html`.
