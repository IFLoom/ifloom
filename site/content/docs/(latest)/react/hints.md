---
title: "Presentation hints"
description: "The ui hints the React UI reads from your content: scene and choice transitions, revealed paragraphs, dice drawn above a line, a countdown under one, stat bars and pips, the colour of a person's lines, and inline pieces in prose such as a popup or a picture to open. With checkUiHints to catch typos."
---
This page is about `@ifloom/react`, the optional React UI. The engine doesn't need it. To draw a game with plain DOM, Vue, Svelte or React by hand, see [Your own UI in any framework](/docs/guide/frameworks).

How a game looks and moves is the UI's business, not the engine's. Content says what it would like in a `ui` field on a scene, a choice, a block, a stat, a kind, an entity, a place or the game, and the engine carries that to the view as written. [Presentation hints](/docs/reference/ui-hints) in the reference explains the mechanism. This page lists the hints the React UI reads.

| Hint | Written on | What the React UI does |
|---|---|---|
| [`transition`](#transition) | A scene, a place, the game | How the screen comes on and goes off. |
| [`transition`](#transition-on-a-choice) | A choice, an action | How the screen it leads to comes in. |
| [`reveal`](#reveal) | A block | The block waits, then comes in. |
| [`dice`](#dice) | A block | The roll under that key is drawn above the block, which waits for the dice to settle. |
| [`timer`](#timer) | A block | The running timer by that id counts down under the block. |
| [`tilt`](#tilt) | A block | Its picture sits at a slight angle. |
| [`fold`](#fold) | A section | Its beats are one part the player opens and shuts. |
| [your own](#your-own-hints) | A section | Its beats are one `group` part, with the hint as a `data-*` attribute. |
| [`display`](#display) | A stat | A number, a bar or pips in the sidebar. |
| [`hue`](#hue) | An entity or a kind | The colour of their spoken lines. |
| [`transitionNames`](#your-own-transition-names) | The game | Transition names of the game's own. |

Prose can also hold [inline pieces](#inline-pieces), `[[ui:name|words|arg]]`, which the React UI draws by name: a popup with a prose line, a picture to open, a letter, a note, a sign, or a component of your own.

Importing `@ifloom/react` anywhere in your game types them: `ui: { display: 'bar' }` on a stat is checked, and `display: 'dial'` is a type error. A hint the React UI doesn't know still compiles, so another UI or a mod can add its own. [`checkUiHints`](#checkuihints) catches a typo the types let through.

The [Transitions recipe](/docs/recipes/transitions) walks through transitions and reveals, and how to draw the same hints with another framework.

## transition

```ts
{
  id: 'ava.river',
  title: 'By the river',
  ui: { transition: { in: 'fade', out: 'fade', ms: 600 } },
  body: [{ prose: 'ava.river' }],
  choices: [/* ... */],
}
```

How a screen comes on (`in`) and goes off (`out`), over `ms` milliseconds each. A name on its own means the same both ways, so `ui: { transition: 'fade' }` is `{ in: 'fade', out: 'fade' }`. On a [scene](/docs/reference/scenes#datascene) it's that scene's. On a [place](/docs/plugins/places#the-location-trait) it's the room's while no scene is open, so walking between places can slide. In the content's `ui`, the game's own hints, it's the default for every screen that says nothing, part by part: a scene that sets only `in` takes `out` and `ms` from the game's.

```ts
export const town: Content = {
  ui: { transition: { in: 'fade', ms: 250 } },
  scenes: [/* ... */],
}
```

With no hint anywhere, a screen comes in and goes out with `'none'`, which is an instant swap. `ms` is 300 when nothing says.

`Scene` plays a transition only when [`view.scene.key`](/docs/reference/view#the-scene) changes: a new scene, a minigame, or another room. A choice that keeps the same scene open plays nothing. The scene before is kept on the page, inert and hidden from screen readers, for its `out`, then the new one comes in by its `in`.

### TransitionName

```ts
import { TRANSITIONS, type TransitionName, type Transition } from '@ifloom/react'

const TRANSITIONS = ['fade', 'slide-up', 'slide-left', 'zoom', 'none'] as const
type TransitionName = (typeof TRANSITIONS)[number] | (string & {})
type Transition = { in?: TransitionName; out?: TransitionName; ms?: number }
```

| Name | Coming in | Going out |
|---|---|---|
| `fade` | Fades up from nothing. | Fades away. |
| `slide-up` | Rises into place from a little below. | Rises and fades. |
| `slide-left` | Slides in from the right. | Slides off to the left. |
| `zoom` | Grows slightly into place. | Grows slightly and fades. |
| `none` | Appears at once. | Goes at once. |

`DEFAULT_TRANSITION_MS` is the 300 milliseconds a transition takes when nothing says.

### Your own transition names

List names of your own in the content's `ui.transitionNames` and draw them with CSS keyed on `data-transition-in`, `data-transition-out` and `data-reveal`. The recipe has [an example](/docs/recipes/transitions#your-own-names). A name is lower-case letters, digits and `-`.

```ts
export const town: Content = { ui: { transitionNames: ['curtain'] } }
```

### transition on a choice

```ts
{ id: 'unpack', ui: { transition: { in: 'slide-up', ms: 400 } }, effects: [{ scene: null }] }
```

How the screen this choice leads to comes in, whatever that screen says. A bare name is only the `in`. An `out` changes how the screen the choice leaves goes off. It works the same on an [action](/docs/reference/actions), a room's button.

The React UI works out which choice was pressed from the command it sent, so a click, a number key, an inline action and a hotspot all count. It plays the hint once, for the screen the choice leads to. When the choice keeps the same screen, nothing plays.

### screenTransition

```ts
import { screenTransition, type ScreenTransition } from '@ifloom/react'

function screenTransition(view: View, game: Game, pressed?: Transition | TransitionName): ScreenTransition

type ScreenTransition = { key: string; in: TransitionName; out: TransitionName; ms: number }
```

The screen in `view` and how it comes and goes, as `Scene` plays it: the scene's or room's `ui.transition` over the game's, with `pressed` (the transition of the choice that led here) deciding how it comes in. For a component of your own that animates as the scene does:

```tsx
import { screenTransition, useGame, useMotion } from '@ifloom/react'

function Heading() {
  const { view, runner } = useGame()
  const motion = useMotion()
  const transition = screenTransition(view, runner.game)
  return (
    <h2 key={transition.key} data-transition-in={motion ? transition.in : undefined}>
      {view.scene.title}
    </h2>
  )
}
```

## reveal

```ts
body: [
  { prose: 'intro' },
  { prose: 'intro.tonight', ui: { reveal: { delay: 1200 } } },
  { prose: 'intro.cat', ui: { reveal: { delay: 1500, as: 'slide-up' } } },
]
```

On a [block](/docs/reference/scenes#block): it waits `delay` milliseconds after the reveal before it, or after the scene comes on, then comes in with `as`. `delay` is 800 (`DEFAULT_REVEAL_DELAY`) and `as` is `'fade'` if left out. A paragraph that should wait goes in a block of its own. The block's hint arrives on the first beat it makes, and everything from there waits, up to the next block with a reveal.

```ts
import { type Reveal } from '@ifloom/react'

type Reveal = { delay?: number; as?: TransitionName }
```

`Scene` draws each revealed run of beats in a `reveal` part with `data-reveal` and `--ifloom-reveal-at`, and holds the choices back until the last. Every word is in the page from the start, so a screen reader reads it. A click on the scene or any key shows the rest at once, and a player who asks for reduced motion gets it all at once.

### revealGroups and lastReveal

```ts
import { revealGroups, lastReveal, type RevealGroup, type RevealPoint } from '@ifloom/react'

function revealGroups(beats: readonly SceneBeat[], rolled?: readonly Roll[]): RevealGroup[]
function lastReveal(beats: readonly SceneBeat[], rolled?: readonly Roll[]): number

type RevealPoint = { delay: number; as: TransitionName; at: number }
type RevealGroup = { reveal: RevealPoint | null; dice?: Roll; beats: { beat: SceneBeat; index: number }[] }
```

`revealGroups` cuts a scene's beats into the run shown with the scene (its `reveal` is `null`) and a run for each beat with `ui.reveal`. `at` is when that reveal comes, counted from the scene coming on: its own delay added to every one before it, so delays of 800 and 1500 come at 800 and 2300. `lastReveal` is the last `at`, or 0 with none. Use them in a [`Beat`](/docs/react/components#beat) or a `Scene` of your own.

With `rolled`, the rolls being shown as they land, a beat whose [`dice`](#dice) hint names one of them starts a run too. Its `dice` is that roll, and it waits `DICE_ROLL_MS` more, for the dice to settle. Leave `rolled` out and dice hints change nothing.

## dice

```ts
body: [
  { prose: 'place.park.stones' },   // 'Flat stones lie along the water’s edge. [[act:skim|Try to skim a stone]].'
  { prose: 'park.skim.passed', when: { roll: 'skim', passed: true }, ui: { dice: 'skim' } },
  { prose: 'park.skim.failed', when: { roll: 'skim', passed: false }, ui: { dice: 'skim' } },
]
```

On a [block](/docs/reference/scenes#block): the key of a [roll](/docs/reference/effects#roll). When the last command rolled under that key, `Scene` draws the roll's [`DiceRoll`](/docs/react/components#diceroll) just above the block. The dice tumble for `DICE_ROLL_MS` (1000) milliseconds and settle on the faces rolled, then the total and Passed or Failed come in. The block, and anything after it, waits for them in a `reveal` part, so the words don't give the result away before the dice do. The choices wait too.

A roll the player made before the last command is drawn settled, with nothing held back. A roll no block names, such as one a [trigger](/docs/reference/triggers) made, shows for a moment over the scene in a [`DiceOverlay`](/docs/react/components#diceoverlay). With motion off, or a player who asks for reduced motion, the dice show settled at once. Either way a screen reader hears the result.

The [Dice rolls and checks](/docs/recipes/dice) recipe builds the whole check.

### rollFor

```ts
import { rollFor, DICE_ROLL_MS } from '@ifloom/react'

function rollFor(beat: SceneBeat, rolls: readonly Roll[]): Roll | undefined
```

The roll a beat's `dice` hint names among `rolls`, such as [`view.rolls`](/docs/reference/view#rolls): the last one under that key. Undefined for a beat with no hint, or one whose roll isn't there. Use it in a [`Beat`](/docs/react/components#beat) of your own to draw dice beside a line. `DICE_ROLL_MS` is how long `DiceRoll` tumbles, in milliseconds.

## timer

```ts
body: [
  { prose: 'flat.ring', ui: { timer: 'flat.ring' } },   // 'Your phone is ringing on the sill. Ava. Answer before it stops.'
]
```

On a [block](/docs/reference/scenes#block): the id of one of the game's [timers](/docs/reference/timers). While that timer runs, `Scene` draws its [`Countdown`](/docs/react/components#countdown) just under the block: the timer's label, a bar that empties with each tick, and the seconds left. With a quarter or less to go, the countdown is marked `data-urgent`. With motion off, or a player who asks for reduced motion, it shows only the seconds. Once the timer runs out or is stopped, the countdown goes.

The hint only draws the timer. The game's clock runs whether or not anything draws it, so a timer no block names still runs out on time. To show one elsewhere, put `Countdown` or `Timers` in your layout.

The [Timed choices and countdowns](/docs/recipes/timers) recipe builds a whole timed choice.

## tilt

```ts
body: [{ prose: 'flat.photo', ui: { tilt: true } }]   // '[[img:photo/ava.svg|Ava at the café]]'
```

On a [block](/docs/reference/scenes#block): `true` sets the block's picture at a slight angle, like a photo dropped on a table. The engine's picture markup has no flag for it, since how a picture sits is the UI's.

## fold

```ts
import { fold, text } from '@ifloom/engine'

fold('Read the postcard', [text(`Wish you were here. The sea is cold and the chips are good. J.`)])
// { blocks: [{ text: '…' }], ui: { fold: 'Read the postcard' } }
```

On a section, `{ blocks }`: the words the fold opens by. The engine carries a section's hints on every beat it makes, as the beat's `section`, and `Scene` draws the beats together in a `<details>` with these words as its summary, shut to begin with, inside the section's `group` part (see [Your own hints](#your-own-hints)). A fold is presentation only and keeps no state. See [Flowing scenes](/docs/reference/flows).

## Your own hints

A section with any hint on it, the React UI's or one of your own, is drawn as one `group` part around its beats. Each of its hints that's a string, a number or `true`/`false` is copied onto the group as a `data-*` attribute, with a camel-case name written in dashes. So a hint of your own is enough to style a whole section as a card, with no component to write.

Say the café wants the end of a shift drawn as a result card. Declare the hint, so content using it is typed:

```ts
// src/rules.ts, or any file the game imports
declare module '@ifloom/engine' {
  interface BlockUi {
    /** Draw the section as a card of this kind. */
    card?: 'result' | 'nudge'
  }
}
```

Write it on a section:

```ts
import { text } from '@ifloom/engine'

body: [
  text('The lunch rush comes and goes.'),
  { blocks: [text('You made 30 coins.'), text('Ava says thanks.')], ui: { card: 'result' } },
]
```

`Scene` draws the section as `<div data-part="group" data-card="result">` holding both beats. Style it in your stylesheet:

```css
[data-part='group'][data-card='result'] {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  padding: 1rem;
}
```

Tell [`checkUiHints`](#checkuihints) about it with `allow`, so it isn't reported as a hint the React UI doesn't read:

```ts
expect(checkUiHints(game, { allow: ['card'] })).toEqual([])
```

A hint on a single block, not a section, makes no group, since the beat is one element already. Wrap the block in `{ blocks: [...] }` to give it one. A hint that's an object or a list isn't copied, so it stays out of the markup.

## display

```ts
stats: [
  { id: 'energy', label: 'Energy', start: 80, max: 100, ui: { display: 'bar' } },
  { id: 'charm', label: 'Charm', start: 1, max: 20, ui: { display: 'pips' } },
]
```

On a [stat](/docs/reference/stats#statdef), `StatDisplay`: how the [`StatList`](/docs/react/components#statlist) and [`Relationships`](/docs/plugins/cast#relationships) draw it. `'number'` (the default) is the value as the game formats it. `'bar'` adds a bar under it from its `min` to its `max`. `'pips'` adds a row of pips, one per point, which suits a range of `MAX_PIPS` (20) or less. A wider range is drawn as a bar, and `checkUiHints` reports it.

```ts
import { type StatDisplay, MAX_PIPS } from '@ifloom/react'

type StatDisplay = 'number' | 'bar' | 'pips'
```

## hue

```ts
import { cast } from '@ifloom/plugin-cast'

cast.person({ id: 'ava', name: 'Ava', ui: { hue: 20 }, home: 'park', talk: 'ava.hi' })
```

On an [entity](/docs/reference/entities#entitydef), or on a [kind](/docs/reference/entities#kinddef) for all of its entities: a colour as a hue from 0 to 360. While a scene's [speaker](/docs/reference/view#speakerview) has one, `Scene` colours their spoken lines with it, lighter in dark mode. It sets `data-speaker-hue` and `--ifloom-speaker-hue` on the scene for your own CSS too:

```css
[data-speaker-hue] [data-part="scene-title"] {
  color: oklch(0.5 0.12 var(--ifloom-speaker-hue));
}
```

## Inline pieces

A [UI piece](/docs/reference/prose#ui-pieces) in prose, `[[ui:name|words|arg|…]]`, is drawn by the component of that name. The React UI has five:

| Markup | What the player sees |
|---|---|
| `[[ui:modal\|words\|key]]`, `[[ui:modal\|words\|key\|title]]` | The words as a link that opens a dialog with the prose line `key`, titled `title` or the words. See [`InlineModal`](/docs/react/components#inlinemodal). |
| `[[ui:image\|words\|path]]`, `[[ui:image\|words\|path\|alt]]` | The words as a link that opens the picture at `path` in the viewer, as a story's pictures open. See [`InlineImage`](/docs/react/components#inlineimage). |
| `[[ui:mail\|body\|From: Ava\|Subject: Hello]]` | A letter or an email as a card: the header lines as written, then the body. See [`InlineMail`](/docs/react/components#inlinemail). |
| `[[ui:prop\|words\|sticky]]` | A note in the story's world in a dashed box, by its face: `sticky`, `clip` or `diary`. See [`InlineProp`](/docs/react/components#inlineprop). |
| `[[ui:mono\|words]]` | The words in a monospace face, for a sign or a screen. See [`InlineMono`](/docs/react/components#inlinemono). |

```ts
const prose = {
  'place.flat':
    "Boxes, mostly. The window looks over the high street, and [[ui:modal|the radiator knocks|notice.welcome|Sam's note]] when it feels like it.",
  'notice.welcome': 'Welcome to the building! Bins go out Thursday. The radiator knocks; ignore it. Sam, flat 2',
}
```

`mail`, `prop` and `mono` draw words and open nothing, and a `mail` or `prop` written as a paragraph of its own draws as one. A letter's body can run over blank lines. The modal and the image are buttons in the line, with the part [`inline-ui`](/docs/react/customising#scenes) and `data-ui` set to the name, so a screen reader announces them as buttons that open a dialog. Escape, the close button or a click outside closes what they opened, and focus goes back to the words. Each preset styles the words differently from an inline action or a tooltip, and the dialog's text has the part `inline-modal`.

A modal shows words and nothing else. It can't change the game, so it suits a note, a letter or a sign. For a dialog with buttons that do something, open a [panel](/docs/reference/panels) from an [inline action](/docs/reference/prose#inline-actions-and-tooltips). [Popups and modals](/docs/recipes/modals) shows both.

### Your own pieces

Give the shell or the provider an `inline` object with a component per name. Each gets the piece's `name`, its words as `text` and its arguments as `args`. One with a built-in name replaces it:

```tsx
// src/main.tsx
import { mountGame, InlineTrigger, PartDialog, type InlineComponents, type InlineProps } from '@ifloom/react'
import { useState } from 'react'
import module from './game.ts'

declare module '@ifloom/engine' {
  interface InlineUi {
    /** `[[ui:map|words|place]]`: the words open the town map with `place` marked. */
    map: [place: string]
  }
}

function TownMap({ text, args: [place] }: InlineProps<'map'>) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <InlineTrigger name="map" open={open} onOpen={() => setOpen(true)}>
        {text}
      </InlineTrigger>
      <PartDialog open={open} onClose={() => setOpen(false)} title="Small Town">
        <img src={`art/map/${place}.svg`} alt={`The town map, with ${place} marked`} />
      </PartDialog>
    </>
  )
}

// Outside any component, so it's the same object on every render.
const inline: InlineComponents = { map: TownMap }

mountGame(module.build(), { inline })
// 'park.gate': 'A sign by the gate shows [[ui:map|where you are|park]].'
```

The `declare module` block types `args` for `map`. A name nothing declares still works, with `args` as text. A name that neither `inline` nor the built-ins have shows its words as plain text, so the line still reads.

Nothing about a piece goes in a save or the log: the engine carries the markup and never sees it open. A piece's words are what the backlog and a screen reader keep. A piece can read the game with [`useGame`](/docs/react/components#usegame), but anything it sends with `send` is a command like any other, so a piece that changes the game is better written as an inline action.

**Gotcha.** The picture an `image` piece opens is only a piece of text to the engine, so `ifloom build` doesn't check the file is there, as it does for `[[img:…]]`. Open it once in the game.

## checkUiHints

```ts
import { checkUiHints } from '@ifloom/react'

function checkUiHints(game: Game, options?: { allow?: readonly string[]; inline?: InlineComponents }): string[]
```

What's wrong with a game's hints for the React UI, as `where: what` lines, or nothing when all is well. The engine's [content checker](/docs/reference/checks) only makes sure a hint is data, so this is where these are caught:

- a hint the React UI doesn't read, such as `ui.transiton` (pass another UI's hints in `allow`)
- a transition name that is neither built in nor in the game's `ui.transitionNames`, or a negative `ms`
- a reveal `delay` that isn't whole milliseconds
- a `display` that isn't `'number'`, `'bar'` or `'pips'`, or pips on a range over 20
- a `hue` outside 0 to 360
- a block's `dice` that isn't a roll's key (letters, digits and `_`)
- a block's `timer` that isn't one of the game's `timers`
- an [inline piece](#inline-pieces) in the prose whose name is neither built in nor in `inline` (pass the same object you give `mountGame`), a `modal` with no prose key or one whose key has no prose, an `image` with no path, and either with more than two arguments

It reads the game's scenes, choices and blocks, its actions, stats, kinds and entities, the places plugin's locations, every prose line, and every block of words written in place. Put it in a test beside the engine's checks:

```ts
import { describe, expect, it } from 'vitest'
import { checkUiHints } from '@ifloom/react'
import module from '../src/game.ts'

const { game } = module.build()

describe('the content', () => {
  it("has hints the React UI can draw", () => {
    expect(checkUiHints(game)).toEqual([])
  })
})
```

## See it in the showcase

Small Town's moving-day scene fades in and reveals its second paragraph, and its Unpack choice slides the flat up (`examples/showcase/src/story/moving-day.ts`). Ava's scene by the river fades, and her line comes a moment later (`story/ava.ts`). At the park, skimming a stone draws its dice above the line that says how it went (`story/park.ts`). At home, Ava's call counts down under the line that says the phone is ringing (`story/flat.ts`). In the flat, "the radiator knocks" opens Sam's welcome note in a dialog, and at the café Ava's name opens her photo (`story/flat.ts`, `story/ava.prose.ts`). Energy is a bar and charm is pips (`world/stats.ts`), and Ava's and Sam's lines have their own colours (`world/cast.ts`). Its tests run `checkUiHints`.
