---
title: "Presentation hints"
description: "The ui hints and inline pieces the React UI reads from content, such as transitions, reveals, dice and stat bars, and checkUiHints."
---
`@ifloom/react`, the optional React UI, reads these hints, so everything here is React only. To render a game in plain DOM, Vue or React by hand, see [Start your own UI](/docs/0.1.0/how-to/render/start).

A ui hint is a `ui` field content writes on a scene, a choice, a block, a stat, a kind, an entity, a location or the game, which the engine carries to the view as written. [Presentation hints](/docs/0.1.0/reference/ui-hints) explains the mechanism, and this page lists the hints the React UI reads. [Add a transition or reveal lines](/docs/0.1.0/how-to/add-a-transition) uses them. In the showcase: `examples/showcase/src/story/moving-day.ts`.

| Key | Meaning |
|---|---|
| [`transition`](#transition) | On a scene, a location or the game, how the screen comes on and goes off. On a choice or an action, how the screen it leads to comes in. |
| [`transitionNames`](#transitionnames) | On the game, the transition names of the game's own. |
| [`reveal`](#reveal) | On a block, a wait before the block comes in. |
| [`dice`](#dice) | On a block, the roll rendered above it, which the block waits for. |
| [`timer`](#timer) | On a block, the running timer that counts down under it. |
| [`tilt`](#tilt) | On a block, its picture set at a slight angle. |
| [`fold`](#fold) | On a section, the words the player opens and shuts its beats by. |
| [`display`](#display) | On a stat, a number, a bar or pips. |
| [`hue`](#hue) | On an entity or a kind, the colour of their spoken lines. |
| [`settings`](#settings) | On the game, the ui settings the React UI applies itself. |

Importing `@ifloom/react` anywhere in a game types these hints, so `ui: { display: 'dial' }` on a stat is a type error. A hint the React UI doesn't know still compiles, so another UI or a mod can add its own, and [`checkUiHints`](#checkuihints) reports one the types let through. Prose holds [inline pieces](#inlineui) too, `[[ui:name|words|arg]]`, which the React UI renders by name.

[`Scene`](/docs/0.1.0/reference/react/components#scene) renders the beats of a section with any hint, the React UI's or the game's own, as one `group` part. It copies each of the section's hints that's a string, a number or `true`/`false` onto the group as a `data-*` attribute, its camel-case name written in dashes, so `ui: { card: 'result' }` renders `data-card="result"`. A hint on a single block makes no group, and a hint that's an object or a list isn't copied. [Add panels, sections, components and hints](/docs/0.1.0/how-to/react/extend-the-react-ui) declares and styles a hint of the game's own.

## transition

`transition` sets how a screen comes on (`in`) and goes off (`out`), over `ms` milliseconds each. Its value is a [`Transition`](#transition-1) or a [`TransitionName`](#transitionname), and a name on its own means the same both ways.

On a [scene](/docs/0.1.0/reference/scenes#datascene) it is that scene's. On a [location](/docs/0.1.0/reference/plugins/places#place) it is the room's while no scene is open. In the content's own `ui` it is the default for every screen that sets none, field by field, so a scene that sets only `in` takes `out` and `ms` from the game's. With no hint anywhere, a screen swaps at once with `'none'`, and `ms` is 300 when nothing sets it.

On a choice or an [action](/docs/0.1.0/reference/actions), `transition` sets how the screen it leads to comes in, over whatever that screen says. A bare name there is only the `in`, and an `out` changes how the screen the choice leaves goes off. The runner records the choice that led to the screen in its snapshot's [`pressed`](/docs/0.1.0/reference/runner#runnersnapshot), so a click, a number key, an inline action and a hotspot all count.

`Scene` plays a transition only when [`view.scene.key`](/docs/0.1.0/reference/view#view) changes: a new scene, a minigame or another room. A choice that keeps the same scene open plays nothing. The scene before stays on the page, inert and hidden from screen readers, for its `out`, and the new one comes in by its `in`. [`useScene`](/docs/0.1.0/reference/react/components#usescene) returns the same transition for a part of your own.

```ts
import type { Content } from '@ifloom/engine'

export const flat: Content = {
  ui: { transition: { in: 'fade', ms: 250 } },
  scenes: [
    {
      id: 'flat.window',
      title: 'By the window',
      ui: { transition: { in: 'fade', out: 'fade', ms: 600 } },
      body: [{ text: 'The high street is waking up.' }],
      choices: [{ id: 'unpack', label: 'Unpack', ui: { transition: { in: 'slide-up', ms: 400 } }, effects: [{ scene: null }] }],
    },
  ],
}
```

### TransitionName

`TransitionName` is one of the built-in transitions in `TRANSITIONS`, or a name of the game's own from [`transitionNames`](#transitionnames). Its type is in [`TransitionName`](/docs/0.1.0/api/react#transitionname), and the list in [`TRANSITIONS`](/docs/0.1.0/api/react#transitions).

| Key | Meaning |
|---|---|
| `fade` | The screen fades up from nothing, and fades away. |
| `slide-up` | The screen rises into place from a little below, and rises and fades. |
| `slide-left` | The screen slides in from the right, and slides off to the left. |
| `zoom` | The screen grows slightly into place, and grows slightly and fades. |
| `none` | The screen appears and goes at once. |

### Transition

`Transition` is the object form of a `transition` hint. Every field is in [`Transition`](/docs/0.1.0/api/react#transition). `in` and `out` are the game's, else `'none'`, if left out, and `ms` is 300.

## transitionNames

`transitionNames` on the game lists transition names of its own, which a stylesheet renders with CSS keyed on `data-transition-in`, `data-transition-out` and `data-reveal`. A name is lower-case letters, digits and `-`. [Add a transition or reveal lines](/docs/0.1.0/how-to/add-a-transition) styles one.

```ts
import type { Content } from '@ifloom/engine'

export const town: Content = { ui: { transitionNames: ['curtain'] } }
```

## reveal

`reveal` on a [block](/docs/0.1.0/reference/scenes#block) makes it wait `delay` milliseconds after the reveal before it, or after the scene comes on, then come in with `as`. Its value is a [`Reveal`](/docs/0.1.0/api/react#reveal). `delay` is 800 and `as` is `'fade'` if left out.

The hint arrives on the first beat the block makes, and every beat from there waits, up to the next block with a reveal. `Scene` renders each revealed run in a `reveal` part with `data-reveal` and `--ifloom-reveal-at`, and holds the choices back until the last. Every word is in the page from the start, so a screen reader reads it. A click on the scene or any key shows the rest at once, and a player who asks for reduced motion sees it all at once.

Delays add up, so blocks with delays of 800 and 1500 come in at 800 and 2300. [`useScene`](/docs/0.1.0/reference/react/components#usescene) returns the runs with these times, for a `Scene` of your own.

```ts
import type { Block } from '@ifloom/engine'

export const body: Block[] = [
  { prose: 'intro' },
  { prose: 'intro.tonight', ui: { reveal: { delay: 1200 } } },
  { prose: 'intro.cat', ui: { reveal: { delay: 1500, as: 'slide-up' } } },
]
```

### Reveal

`Reveal` is the value of a `reveal` hint, its `delay` and its `as`. Every field is in [`Reveal`](/docs/0.1.0/api/react#reveal).

## dice

`dice` on a [block](/docs/0.1.0/reference/scenes#block) is the key of a [roll](/docs/0.1.0/reference/rolls). When the last command rolled under that key, `Scene` renders the roll's [`DiceRoll`](/docs/0.1.0/reference/react/components#diceroll) above the block.

The dice tumble for a second and settle on the faces rolled, then the total and Passed or Failed come in. The block and everything after it wait in a `reveal` part, so the words don't give the result away, and the choices wait too. A roll made before the last command shows settled. A roll no block names, such as a [trigger](/docs/0.1.0/reference/triggers)'s, shows for a moment over the scene in a [`DiceOverlay`](/docs/0.1.0/reference/react/components#diceoverlay). With motion off or reduced motion, the dice show settled at once, and a screen reader hears the result either way. [Roll dice for a check](/docs/0.1.0/how-to/roll-dice) builds a whole check.

```ts
import type { Block } from '@ifloom/engine'

export const body: Block[] = [
  { prose: 'place.park.stones' },
  { prose: 'park.skim.passed', when: { roll: 'skim', passed: true }, ui: { dice: 'skim' } },
  { prose: 'park.skim.failed', when: { roll: 'skim', passed: false }, ui: { dice: 'skim' } },
]
```

## timer

`timer` on a [block](/docs/0.1.0/reference/scenes#block) is the id of one of the game's [timers](/docs/0.1.0/reference/timers). While that timer runs, `Scene` renders its [`Countdown`](/docs/0.1.0/reference/react/components#countdown) under the block.

The countdown shows the timer's label, a bar that empties with each tick and the seconds left, and carries `data-urgent` with a quarter or less to go. With motion off or reduced motion it shows only the seconds. It goes when the timer runs out or stops. The hint only renders the timer, which runs out on time whether anything renders it or not, and [`Timers`](/docs/0.1.0/reference/react/components#timers) renders every running one elsewhere. [Add a countdown](/docs/0.1.0/how-to/add-a-countdown) builds a timed choice.

```ts
import type { Block } from '@ifloom/engine'

export const body: Block[] = [{ prose: 'flat.ring', ui: { timer: 'flat.ring' } }]
```

## tilt

`tilt` on a [block](/docs/0.1.0/reference/scenes#block) set to `true` sets the block's picture at a slight angle, like a photo dropped on a table. The engine's picture markup has no flag for it, since the angle is presentation.

```ts
import type { Block } from '@ifloom/engine'

export const body: Block[] = [{ prose: 'flat.photo', ui: { tilt: true } }]
```

## fold

`fold` on a section, `{ blocks }`, is the words the player opens its beats by. The engine's [`fold`](/docs/0.1.0/reference/flows#fold) builder writes it.

The engine carries a section's hints on every beat it makes, as the beat's `section`. `Scene` renders those beats in a `<details>` with the words as its summary, shut at first, inside the section's `group` part. A fold is presentation only and keeps no state.

```ts
import { fold, text } from '@ifloom/engine'

export const postcard = fold('Read the postcard', [text('Wish you were here. The sea is cold and the chips are good. J.')])
```

## display

`display` on a [stat](/docs/0.1.0/reference/stats#statdef) sets how the [`StatList`](/docs/0.1.0/reference/react/components#statlist) and the cast UI's [`Relationships`](/docs/0.1.0/reference/plugins/cast#relationships) render it. Its value is a [`StatDisplay`](#statdisplay).

`'number'`, the default, is the value as the game formats it. `'bar'` adds a bar under it from its `min` to its `max`. `'pips'` adds a row of pips, one per point, and a range over 20 renders as a bar and `checkUiHints` reports it. [`StatGauge`](/docs/0.1.0/reference/react/kit#statgauge) renders the bar and the pips.

```ts
import type { StatDef } from '@ifloom/engine'

export const stats: StatDef[] = [
  { id: 'energy', label: 'Energy', start: 80, max: 100, ui: { display: 'bar' } },
  { id: 'charm', label: 'Charm', start: 1, max: 20, ui: { display: 'pips' } },
]
```

### StatDisplay

`StatDisplay` is the value of a stat's `display` hint, `'number'`, `'bar'` or `'pips'`. Its type is in [`StatDisplay`](/docs/0.1.0/api/react#statdisplay).

## hue

`hue` on an [entity](/docs/0.1.0/reference/entities#entitydef), or on a [kind](/docs/0.1.0/reference/entities#kinddef) for all its entities, is a colour as a hue from 0 to 360. While a scene's [speaker](/docs/0.1.0/reference/view#speakerview) has one, `Scene` colours their spoken lines with it, lighter in dark mode.

`Scene` also sets `data-speaker-hue` and `--ifloom-speaker-hue` on the scene, for a stylesheet's own rules.

```ts
import { cast } from '@ifloom/plugin-cast'

export const ava = cast.person({ id: 'ava', name: 'Ava', ui: { hue: 20 }, home: 'park', talk: 'ava.hi' })
```

## settings

`settings` on the game names the [ui settings](/docs/0.1.0/reference/settings) the React UI applies itself, by each setting's id. The settings page renders them as it renders any other.

- **`textSize`** names a ui `choice` setting. [`TextSize`](/docs/0.1.0/reference/react/components#textsize), which `GameShell` renders, copies its value to `data-text-size` on `<html>`. The styles size the page from its root for `small` (87.5%), `normal` (the browser's own), `large` (118.75%) and `larger` (137.5%), and the UI is sized in `rem`, so everything scales.
- **`images`** names a ui `toggle` setting. While it's off, [`Picture`](/docs/0.1.0/reference/react/components#picture) and [`Video`](/docs/0.1.0/reference/react/components#video) render nothing. A [`LayeredPicture`](/docs/0.1.0/reference/react/components#layeredpicture) stays, since its hotspots are part of play.

A sound switch is the engine's, since the audio player reads it too, and the game names it in [`audio.sound`](/docs/0.1.0/reference/audio#gameaudio) or `audio.mute`.

```ts
import type { Content } from '@ifloom/engine'

export const settings: Content = {
  settings: [
    { id: 'textSize', label: 'Text size', type: 'choice', affects: 'ui', options: [{ value: 'normal', label: 'Normal' }, { value: 'large', label: 'Large' }], default: 'normal' },
    { id: 'pictures', label: 'Show pictures', type: 'toggle', affects: 'ui', default: true },
  ],
  ui: { settings: { textSize: 'textSize', images: 'pictures' } },
}
```

### TEXT_SIZES

`TEXT_SIZES` is the `textSize` options the styles size, in order: `small`, `normal`, `large` and `larger`. Its value is in [`TEXT_SIZES`](/docs/0.1.0/api/react#text_sizes). An option of another name needs CSS of the game's own, such as `:root[data-text-size="huge"] { font-size: 150%; }`.

```ts
import { TEXT_SIZES } from '@ifloom/react'
import type { SettingDef } from '@ifloom/engine'

export const textSize: SettingDef = {
  id: 'textSize',
  label: 'Text size',
  type: 'choice',
  affects: 'ui',
  default: 'normal',
  options: TEXT_SIZES.map((size) => ({ value: size, label: size })),
}
```

## InlineUi

An inline piece is a [UI piece](/docs/0.1.0/reference/prose#ui-pieces) in prose, `[[ui:name|words|arg|…]]`, which the React UI renders with the component of that name. The React UI declares five names in the engine's [`InlineUi`](/docs/0.1.0/reference/ui-hints#inlineui):

| Key | Meaning |
|---|---|
| `modal` | `[[ui:modal\|words\|key\|title]]` renders the words as a link that opens a dialog with the prose line `key`, titled `title` or the words. [`InlineModal`](/docs/0.1.0/reference/react/components#inlinemodal) renders it. |
| `image` | `[[ui:image\|words\|path\|alt]]` renders the words as a link that opens the picture at `path` in the viewer. [`InlineImage`](/docs/0.1.0/reference/react/components#inlineimage) renders it. |
| `mail` | `[[ui:mail\|body\|From: Ava\|Subject: Hello]]` renders a letter as a card, the header lines as written and then the body. [`InlineMail`](/docs/0.1.0/reference/react/components#inlinemail) renders it. |
| `prop` | `[[ui:prop\|words\|sticky]]` renders a note in a dashed box by its face, `sticky`, `clip` or `diary`. [`InlineProp`](/docs/0.1.0/reference/react/components#inlineprop) renders it. |
| `mono` | `[[ui:mono\|words]]` renders the words in a monospace face, for a sign or a screen. [`InlineMono`](/docs/0.1.0/reference/react/components#inlinemono) renders it. |

`mail`, `prop` and `mono` open nothing, and a `mail` or `prop` written as a paragraph of its own renders as one. The modal and the image render as buttons in the line, with the part `inline-ui` and `data-ui` set to the name. Escape, the close button or a click outside closes what they opened, and focus goes back to the words.

A modal shows words and can't change the game. A dialog with buttons that change the game is a [panel](/docs/0.1.0/reference/panels) opened from an [inline action](/docs/0.1.0/reference/prose#inline-actions-and-tooltips), and [Show a popup](/docs/0.1.0/how-to/show-a-popup) writes both. A game adds pieces of its own, or replaces a built-in one, with [`inline`](/docs/0.1.0/reference/react/components#inlinecomponents). A name that neither `inline` nor the built-ins have shows its words as plain text.

```ts
export const prose = {
  'place.flat': "Boxes, mostly. The window looks over the high street, and [[ui:modal|the radiator knocks|notice.welcome|Sam's note]] when it feels like it.",
  'notice.welcome': 'Welcome to the building! Bins go out Thursday. Sam, flat 2',
}
```

## Functions

### checkUiHints

`checkUiHints` returns the problems with a game's hints and inline pieces for the React UI, as `where: what` lines, or an empty list. Its signature is in [`checkUiHints`](/docs/0.1.0/api/react#checkuihints).

The engine's [content checker](/docs/0.1.0/reference/checks) only makes sure a hint is data, so `checkUiHints` catches these:

- a hint the React UI doesn't read, such as `ui.transiton`, or one written where it isn't read, such as a `reveal` on a scene
- a transition name neither built in nor in `transitionNames`, or a negative `ms`
- a reveal `delay` that isn't whole milliseconds
- a `display` other than `'number'`, `'bar'` and `'pips'`, or pips on a range over 20
- a `hue` outside 0 to 360
- a block's `dice` that isn't a roll's key, or a block's `timer` that isn't one of the game's timers
- a `settings` key other than `textSize` and `images`, a `textSize` that isn't a ui `choice` setting with options the styles size, or an `images` that isn't a ui `toggle`
- an inline piece whose name is neither built in, nor a plugin UI's, nor in `inline`, a `modal` with no prose key or a missing one, an `image` with no path, and either with more than two arguments

It walks the content with the engine's [`uiInContent`](/docs/0.1.0/reference/ui-hints#uiincontent), as the content checker does, so it reads every `ui` field, every prose line and every block of words written in place, a plugin's content included. A problem in a block names its scene, as `scene park block: ui.dice …`.

```ts
import { describe, expect, it } from 'vitest'
import { checkUiHints } from '@ifloom/react'
import module from '../src/game.ts'

const { game } = module.build()

describe('the content', () => {
  it('has hints the React UI can render', () => {
    expect(checkUiHints(game)).toEqual([])
  })
})
```

### CheckUiOptions

`CheckUiOptions` is the settings for `checkUiHints`, naming the hints and pieces that aren't built in. Every field is in [`CheckUiOptions`](/docs/0.1.0/api/react#checkuioptions).

| Field | Meaning |
|---|---|
| `plugins` | The plugin UIs the game gives `mountGame`, whose hints and inline pieces count as known. |
| `inline` | The game's own inline pieces, the object it gives `mountGame`. |
| `allow` | Hint and piece names not to report, such as the game's own hints or another UI's. |

```ts given
import { checkUiHints } from '@ifloom/react'
import { shopUi } from '@ifloom/plugin-shop/react'
import { expect } from 'vitest'

expect(checkUiHints(game, { plugins: [shopUi], allow: ['card'] })).toEqual([])
```

### UiHint

`UiHint` is a hint's declaration: its `name` under `ui`, the places content writes it in `on`, and a `check` that returns the problems with a value. Every field is in [`UiHint`](/docs/0.1.0/api/react-kit#uihint).

The React UI declares each hint on this page once as a `UiHint`, and `checkUiHints` is built from those declarations, so a hint is known only where its `on` names. Each inline piece is declared the same way, with its name, its component and its check. A plugin UI declares the hints its components read in its [`PluginUi`](/docs/0.1.0/reference/react/kit#pluginui)'s `hints`. Each problem a `check` returns follows the place, such as `ui.timer "kettle" is not a timer the game has`.

### HintCheckContext

`HintCheckContext` is what a hint's `check` is told: the game, what the hint is on, that thing's `id` and the game's transition names. Every field is in [`HintCheckContext`](/docs/0.1.0/api/react-kit#hintcheckcontext).

## Caveats

- The picture an `image` piece opens is text to the engine, so `ifloom build` doesn't check the file exists as it does for `[[img:…]]`.
- Nothing about an inline piece goes in a save or the log, and anything a piece sends with `useGame().send` is a command like any other, so a piece that changes the game is better written as an inline action.
