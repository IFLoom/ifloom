---
title: "Coming from SugarCube or Harlowe"
description: For authors who know Twine's SugarCube or Harlowe story formats. Maps passages, links, macros, variables, special passages, saves, audio and randomness to IFLoom's scenes, choices, conditions, effects and plugins, with side-by-side snippets.
---
If you've written Twine stories in SugarCube or Harlowe, most of what you know carries over. A passage becomes a scene, a link becomes a choice, and a variable becomes a stat or a variable. What changes is where things are written. In Twine, a passage is text with macros mixed in. In IFLoom, a scene is data: its words live under prose keys, and its conditions and effects are plain objects beside them.

This page maps each idea, with their version first and IFLoom's under it. The examples come from the showcase's small town: Ava's café on the corner, and the coins in the player's pocket. If you haven't made a game yet, start with [Your first story](/docs/guide/first-story), then come back here as a phrasebook.

## A whole passage, side by side

Here's a café passage in SugarCube. It shows a line when the player is short of money, and offers a coffee that costs 3 coins:

```html
:: Cafe
Ava looks up from the till. "The usual?"
<<if $coins lt 3>>Your pockets feel light.<</if>>

<<if $coins gte 3>>
  <<link "Buy a coffee (3 coins)" "Street">><<set $coins -= 3>><<set $hadCoffee to true>><</link>>
<<else>>
  You can't afford a coffee.
<</if>>
[[Head back out|Street]]
```

The same scene in IFLoom:

```ts
// src/game.ts
import { SCHEMA, loadGame, type Pack } from '@ifloom/engine'

const cafe: Pack = {
  id: 'cafe',
  schema: SCHEMA,
  stats: [{ id: 'coins', label: 'Coins', start: 5, max: 999, spendable: true }],
  scenes: [
    {
      id: 'cafe',
      title: 'The Corner Café',
      body: [{ text: 'cafe' }, { text: 'cafe/broke', when: { stat: 'coins', lt: 3 } }],
      choices: [
        {
          id: 'coffee',
          blocked: [{ when: { stat: 'coins', lt: 3 }, reason: 'You need 3 coins.' }],
          effects: [{ kind: 'stat', key: 'coins', by: -3 }, { kind: 'flag', key: 'hadCoffee', value: true }, { kind: 'scene', id: 'street' }],
        },
        { id: 'leave', effects: [{ kind: 'scene', id: 'street' }] },
      ],
    },
    { id: 'street', title: 'The high street', body: [{ text: 'street' }], choices: [] },
  ],
  prose: {
    cafe: 'Ava looks up from the till. "The usual?"',
    'cafe/broke': 'Your pockets feel light.',
    'cafe#coffee': 'Buy a coffee (3 coins)',
    'cafe#leave': 'Head back out',
    street: 'The high street, busy with the market.',
  },
}

export default loadGame([cafe], { id: 'corner-cafe', title: 'The Corner Café', introScene: 'cafe' })
```

It's longer, and it does a few things the passage doesn't:

- The coffee button stays on screen when the player can't afford it, greyed out, with `You need 3 coins.` on it. You wrote the rule once and the reason comes with it.
- `coins` is declared, with a start, a range and a label, so the UI lists it and the button shows its price.
- `npm run check` fails if `street` is misspelt anywhere, or a choice has no words.

## SugarCube

### `<<set>>` and effects

```html
<<set $coins += 2>>
<<set $coins to 5>>
<<set $metAva to true>>
<<set $visits += 1>>
```

Each change is an [effect](/docs/reference/effects), and a choice runs its list of effects in order when the player picks it:

```ts
{ kind: 'stat', key: 'coins', by: 2 }
{ kind: 'setStat', key: 'coins', to: 5 }
{ kind: 'flag', key: 'metAva', value: true }
{ kind: 'flag', key: 'visits', add: 1 }
```

Numbers the player sees, earns or spends are [stats](/docs/reference/stats), and you declare each one. A stat stays between its `min` and `max`, so `coins` can't go below 0 however many coffees are bought. Everything else is a [variable](/docs/reference/state#flags), set with the `flag` effect. A variable that was never set reads as 0, so a counter needs no `<<set $visits to 0>>` first. Things the player carries are [items](/docs/reference/game#itemdef): `{ kind: 'item', id: 'umbrella', by: 1 }`.

There's no temporary `_variable`. A value you only need while a scene is on screen is usually a condition you can write where it's used.

### `<<if>>` and `<<elseif>>`

```html
<<if $visits gte 3>>Ava has your cup out before you reach the counter.
<<else>>Ava gives you a polite nod.<</if>>
```

A scene's body is a list of blocks, and each block can have a `when`. A block whose [condition](/docs/reference/conditions) fails is left out:

```ts
body: [
  { text: 'cafe' },
  { text: 'cafe/regular', when: { flag: 'visits', gte: 3 } },
  { text: 'cafe/new', when: { flag: 'visits', lt: 3 } },
],
```

There's no `else`, so an `<<elseif>>` chain becomes blocks whose conditions don't overlap:

```ts
{ text: 'cafe/rich', when: { stat: 'coins', gte: 20 } },
{ text: 'cafe/ok', when: { stat: 'coins', gte: 5, lt: 20 } },
{ text: 'cafe/broke', when: { stat: 'coins', lt: 5 } },
```

`and`, `or` and `not` are `all`, `any` and `not`:

```ts
{ all: [{ stat: 'coins', gte: 3 }, { not: { flag: 'hadCoffee' } }] }
{ any: [{ item: 'umbrella' }, { item: 'raincoat' }] }
{ flag: 'errand', is: 'bread' }
```

An `<<if>>` around a link becomes one of two things on the choice:

- **`when`** hides the choice while it fails, as an `<<if>>` around the link does.
- **`blocked`** keeps it on screen, greyed out, with a reason. Most of the time this is what you want, because the player learns what they're missing.

```ts
{
  id: 'cake',
  when: { seen: 'ava.hi' },
  blocked: [{ when: { stat: 'coins', lt: 4 }, reason: 'You need 4 coins.' }],
  effects: [{ kind: 'stat', key: 'coins', by: -4 }],
}
```

A link whose text changes with the state, such as `<<if $visits gte 3>>[[The usual|Order]]<<else>>[[Order|Order]]<</if>>`, is one choice with `labels`. The first entry whose `when` holds gives the label's prose key:

```ts
{ id: 'order', labels: [{ when: { flag: 'visits', gte: 3 }, key: 'cafe#order-usual' }], effects: [/* ... */] }
```

An `<<if>>` that only exists to vary a line, so the player doesn't read the same words every visit, is a set of [variants](/docs/reference/prose#variantmember). The block `{ variants: 'cafe.chatter' }` shows one of the set each time, and rotates through them.

The engine also remembers things you'd keep a variable for in Twine. `{ seen: 'ava.hi' }` asks whether the player has been to a scene, and `{ chose: 'cafe/coffee' }` asks whether they've ever picked that choice. `visited()` and the "did they pick this?" flag both become conditions you don't have to set up.

### Passages and links

```html
:: Street
The high street, busy with the market.
[[Go to the café|Cafe]]
[[Walk to the park->Park]]
```

A passage is a [scene](/docs/reference/scenes), and each link is a choice whose effects include `{ kind: 'scene', id }`:

```ts
{
  id: 'street',
  body: [{ text: 'street' }],
  choices: [
    { id: 'cafe', effects: [{ kind: 'scene', id: 'cafe' }] },
    { id: 'park', effects: [{ kind: 'scene', id: 'park' }] },
  ],
}
```

The link text is the prose under `scene#choice`, so `'street#cafe': 'Go to the café'`. A scene with no choices is an ending. A setter link, `[[Buy a coffee|Cafe][$coins -= 3]]`, is a choice with more than one effect.

### `<<link>>` and `<<button>>`

```html
<<link "Buy a coffee" "Cafe">><<set $coins -= 3>><</link>>
<<link "Leave a tip">><<set $coins -= 1>><<set $tipped to true>><</link>>
```

Both are choices. A choice with a `scene` effect moves on, and one without stays on the scene, which is redrawn with the new state:

```ts
{ id: 'coffee', effects: [{ kind: 'stat', key: 'coins', by: -3 }, { kind: 'scene', id: 'cafe' }] }
{ id: 'tip', effects: [{ kind: 'stat', key: 'coins', by: -1 }, { kind: 'flag', key: 'tipped', value: true }] }
```

A `<<button>>` in the StoryCaption or PassageFooter, offered on every screen, is an [action](/docs/reference/actions#actiondef). Actions are the game's own buttons, shown while no scene is open, and each sends one [command](/docs/reference/commands). When the button does something with a price, it usually runs an [activity](/docs/reference/actions#activitydef), which can refuse with a reason:

```ts
// in the pack
activities: [
  {
    id: 'coffee',
    cost: { stats: { coins: 3 } },
    requires: [{ reason: 'One is enough for today.', when: { not: { flag: 'hadCoffee' } } }],
    effects: [{ kind: 'flag', key: 'hadCoffee', value: true }],
  },
],

// on the game
actions: [{ id: 'coffee', label: 'Buy a coffee', command: { type: 'activity', id: 'coffee' } }],
```

The button shows the cost as its price, and it's greyed out with `Not enough Coins.` or `One is enough for today.` when it can't be pressed.

### `<<goto>>` and `<<include>>`

```html
<<goto "Street">>
<<include "Menu">>
```

`<<goto>>` is the `scene` effect. Put it in the effects of whatever should move the player: a choice, an activity or a [trigger](/docs/reference/triggers). `{ kind: 'scene', id: null }` closes the scene and goes back to the game's idle screen, which is the room the player is in when the game has the [places plugin](/docs/plugins/places).

A `<<goto>>` that runs as soon as a passage shows, because some condition holds, is a trigger. It fires by itself after a command, the first time its `when` holds:

```ts
triggers: [{ id: 'broke', when: { stat: 'coins', lt: 1 }, effects: [{ kind: 'scene', id: 'broke' }] }]
```

`<<include>>` is a prose key used by more than one scene. A block names a key, and any number of scenes can name the same one:

```ts
{ id: 'cafe.morning', body: [{ text: 'cafe.menu' }, { text: 'cafe.morning' }], choices: [] },
{ id: 'cafe.evening', body: [{ text: 'cafe.menu' }, { text: 'cafe.evening' }], choices: [] },
```

That covers shared words. A scene can't include another scene's choices, so a shared set of links is written on each scene that offers it, or offered once as actions.

### Widgets

```html
:: Widgets [widget]
<<widget "pay">><<set $coins -= _args[0]>><<set $spent += _args[0]>><</widget>>

<<pay 4>>
```

A widget that changes the state is a [custom effect](/docs/reference/custom#effects): a function on `game.custom` that returns effects, called by name from content. A widget that answers a question is a custom condition:

```ts
custom: {
  effects: {
    payFor: (_state, args) => {
      const price = Number(args.price ?? 0)
      return [
        { kind: 'stat', key: 'coins', by: -price },
        { kind: 'flag', key: 'spent', add: price },
      ]
    },
  },
  conditions: {
    canAfford: (state, args) => (state.stats.coins ?? 0) >= Number(args.price ?? 0),
  },
},
```

```ts
{
  id: 'cake',
  when: { custom: 'canAfford', with: { price: 4 } },
  effects: [{ custom: 'payFor', with: { price: 4 } }, { kind: 'scene', id: null }],
}
```

A set of widgets that keeps its own state, such as a loyalty card or an inventory screen, is a [plugin](/docs/reference/plugins). [Your first plugin](/docs/reference/plugins#your-first-plugin) builds the loyalty card in about twenty lines. A widget that only prints markup has no equivalent, because prose can't run code. Its words go in a prose key, and its looks go in your UI.

### `StoryInit` and starting state

```html
:: StoryInit
<<set $coins to 5>>
<<set $energy to 80>>
<<set $hasUmbrella to true>>
<<set $visits to 0>>
```

There's no init passage. You declare what the game keeps, and each declaration carries its starting value:

```ts
stats: [
  { id: 'coins', label: 'Coins', start: 5, max: 999, spendable: true },
  { id: 'energy', label: 'Energy', start: 80 },
],
items: [{ id: 'umbrella', name: 'umbrella', desc: 'Big enough for two.', kind: 'gear' }],
```

`gear` starts at 1 and `stuff` at 0, unless `start` says otherwise. Variables need no declaration, and one that's never been set reads as 0, so `$visits` needs no line at all. The first scene is the game's `introScene`.

When you'd write a variable with a start value that isn't 0, ask whether it's really a stat (a number the player sees or spends) or an item (a thing they have). If it's neither, set it with an effect on the first scene's choices.

### `State.variables` and `setup`

```js
State.variables.coins        // the player's coins
setup.dishes = {
  soup: { name: 'Soup of the day', price: 6 },
  toast: { name: 'Cheese on toast', price: 4 },
}
```

In IFLoom the whole game is one [state](/docs/reference/state) object, and it's also the save. Stats are in `state.stats`, variables in `state.flags` and items in `state.items`. Content reads them with conditions, and only custom functions and your UI read the object itself.

Data in `setup` that never changes is content: it stays in your TypeScript, beside the scenes. When you'd keep several of something, each with numbers that change in play, declare a kind and its [entities](/docs/reference/entities):

```ts
kinds: [{ id: 'dish', label: 'Dish', plural: 'Menu' }],
stats: [{ id: 'price', label: 'Price', of: 'dish', start: 4 }],
entities: [
  { id: 'soup', of: 'dish', name: 'Soup of the day', stats: { price: 6 } },
  { id: 'toast', of: 'dish', name: 'Cheese on toast', stats: { price: 4 } },
],
```

The same effects and conditions reach them with `of`:

```ts
{ kind: 'stat', key: 'price', by: 1, of: 'dish:soup' }
{ stat: 'price', of: 'dish:soup', gte: 6 }
```

Entities are kept in the save, can be created and removed in play, and the checker knows their kinds and stats.

### `StoryInterface`, `PassageHeader` and the UI bar

SugarCube draws the UI bar, and the special passages (StoryCaption, StoryMenu, PassageHeader, PassageFooter and StoryInterface) let you add to it or replace it. IFLoom's engine draws nothing. It hands a UI a [view](/docs/reference/view) of what to show.

With the `vanilla`, `vue` and `svelte` [templates](/docs/guide/frameworks), the page is yours, so you put each part where SugarCube's UI bar and passage would go. The [React UI](/docs/react) is the ready-made one, and its [layouts](/docs/react#layouts) name the parts of the screen and where they go:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts, in the vanilla template: a bar at the side and the passage beside it
function draw(view: View): void {
  const bar = document.createElement('aside')
  add(bar, 'h1', view.title)
  add(bar, 'p', view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · '), 'stats')
  const passage = document.createElement('main')
  for (const beat of view.scene.beats) if (beat.kind === 'text') add(passage, 'p', beat.text)
  for (const choice of [...view.scene.choices, ...view.actions]) {
    const button = add(passage, 'button', choice.label)
    button.disabled = Boolean(choice.disabled)
    button.onclick = () => runner.apply(choice.command)
  }
  root.replaceChildren(bar, passage)
}
```

```ts tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import game from './game.ts'

mountGame(game, {
  layout: { sidebar: ['title', 'stats', 'menu', 'inventory'], stage: ['scene', 'inputs', 'actions'] },
  pages: { subtitle: 'A week at the corner café' },
})
```

```vue tab="Vue" tab-group="framework"
<!-- src/App.vue, in the vue template: a bar at the side and the passage beside it -->
<script setup lang="ts">
import { runner, view } from './runner.ts'
import Beat from './Beat.vue'
</script>

<template>
  <aside>
    <h1>{{ view.title }}</h1>
    <p class="stats">{{ view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · ') }}</p>
  </aside>
  <main>
    <Beat v-for="(beat, at) in view.scene.beats" :key="at" :beat="beat" />
    <button
      v-for="(choice, at) in [...view.scene.choices, ...view.actions]"
      :key="at"
      :disabled="Boolean(choice.disabled)"
      @click="runner.apply(choice.command)"
    >
      {{ choice.label }}
    </button>
  </main>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/App.svelte, in the svelte template: a bar at the side and the passage beside it -->
<script lang="ts">
  import { runner, view } from './runner.ts'
  import Beat from './Beat.svelte'
</script>

<aside>
  <h1>{$view.title}</h1>
  <p class="stats">{$view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · ')}</p>
</aside>
<main>
  {#each $view.scene.beats as beat, at (at)}<Beat {beat} />{/each}
  {#each [...$view.scene.choices, ...$view.actions] as choice, at (at)}
    <button disabled={Boolean(choice.disabled)} onclick={() => runner.apply(choice.command)}>{choice.label}</button>
  {/each}
</main>
```

In the React UI, a layout is the closest thing to arranging the UI bar:

- **StoryCaption** is a part on the sidebar, such as `'stats'`, or a component of your own in the list. See [Parts of your own](/docs/react#parts-of-your-own).
- **StoryMenu** is the player's menu, the `'menu'` part.
- **PassageHeader and PassageFooter** are parts above and below `'scene'` on the stage.
- **The title and start screen** are [pages](/docs/react#pages), turned on with `pages`. [The title screen and settings](/docs/guide/title-screen) walks through them, with a title screen of your own for the other templates.
- **StoryInterface**, a whole interface of your own, is [your own root](/docs/react/customising#8-write-your-own-root), or any of the other templates. See [Using another framework](/docs/guide/frameworks).

### The `Setting` API

```js
Setting.addToggle("hints", { label: "Show hints", default: true });
// in a passage: <<if settings.hints>>…<</if>>
```

Settings are declared on the game, and the React UI draws a settings page from them. A `play` setting is part of the game, and conditions read it. A `ui` setting only changes how things look, so it's kept in the player's profile and never in the state. See [Settings](/docs/reference/settings).

```ts
settings: [
  { id: 'hints', label: 'Show hints', kind: 'toggle', default: true },
  { id: 'textSize', label: 'Text size', kind: 'choice', affects: 'ui', options: [{ value: 'small', label: 'Small' }, { value: 'large', label: 'Large' }], default: 'small' },
],
```

```ts
{ text: 'cafe/hint', when: { setting: 'hints' } }
```

### Old saves, `Config.saves` and `Save.onLoad`

```js
Config.saves.version = 2;
Save.onLoad.add(function (save) {
  /* rename $money to $coins in each moment of the save's history */
});
```

In SugarCube, when an update renames a variable, you set a save version and patch old saves in a load handler yourself. In IFLoom you give the game a `version` and a step in `migrations` for each version that needs one. A step takes a save's state and returns the new one:

```ts
import type { Game } from '@ifloom/engine'

const base: Partial<Game> = {
  // Version 1 kept the purse in a variable called money. Version 2 has a coins stat.
  version: 2,
  migrations: {
    1: (state) => {
      const { money, ...flags } = state.flags
      return money === undefined ? state : { ...state, flags, stats: { ...state.stats, coins: Number(money) } }
    },
  },
}
```

The engine runs every step from the save's version up to the game's when the save loads, so a save from two versions ago runs both. See [The game's own migrations](/docs/reference/saves#the-games-own-migrations).

Saving itself needs no setup. [`mountGame`](/docs/react#mountgame) keeps saves in the browser's `localStorage` and autosaves to the `auto` slot each turn. The React UI's menu saves and loads, and undo goes 50 steps back. To change any of that, pass [`RunnerOptions`](/docs/reference/runner#runneroptions) as `runner`. What should outlive a save, such as the player's settings or that they've finished the game once, goes in the [profile](/docs/reference/profile).

### `<<audio>>`

```html
<<cacheaudio "calm" "music/calm.ogg">>
<<audio "calm" play loop>>
<<audio ":all" stop>>
```

Tracks are declared once in `game.audio`, each on a channel. A scene names what plays on each background channel while it's open, and effects play a sound or change the music:

```ts
audio: {
  tracks: {
    calm: { src: 'music/calm.ogg', channel: 'music' },
    'cafe.murmur': { src: 'cafe-murmur.ogg', channel: 'ambience' },
    bell: { src: 'door-bell.ogg' },
  },
  default: { music: 'calm' },
},
```

```ts
{ id: 'cafe', audio: { ambience: 'cafe.murmur' }, body: [{ text: 'cafe' }], choices: [] }
{ kind: 'sound', track: 'bell' }
{ kind: 'audio', channel: 'music', track: null }
```

The engine works out what should be playing, and the [audio player](/docs/reference/audio-player) plays it. The React UI starts it for you, and its settings page gets volume and mute when you declare those settings. See [Audio](/docs/reference/audio).

### Images and video

```html
[img[The café at opening time|images/cafe.jpg]]
<video src="clips/kettle.mp4" autoplay loop muted></video>
```

Prose can't hold HTML, so pictures and clips are markup on a paragraph of their own:

```md
[[wide:scene/cafe|The café at opening time]]

[[video:clips/kettle|A kettle coming to the boil]]
```

A path without an extension is a `.jpg` (or an `.mp4` for a video) under `public/art/`, and `ifloom check` reports a file that isn't there. A video plays like a GIF unless you add flags such as `controls` or `sound`. See [Markup](/docs/reference/prose#markup) for pictures, video, speech and the rest, and [Media](/docs/reference/media) for pools of pictures picked by tags.

### `random()` and `either()`

```html
<<set _cake to either("lemon", "carrot", "walnut")>>
Today's cake is _cake.
<<if random(1, 4) is 1>>A cat is asleep on the window seat.<</if>>
```

IFLoom has no runtime randomness. Every draw is worked out from the save's seed and names you give it, so the same save on the same turn always draws the same. What you'd use `either()` for usually fits one of three things.

**A line that varies** is a set of variants. Each time the block shows, it draws a member, and it rotates so the player doesn't read the same line twice running:

```ts
body: [{ text: 'cafe' }, { variants: 'cafe.chatter' }],
// in the pack
variants: { 'cafe.chatter': ['cafe.chatter/rain', 'cafe.chatter/market', 'cafe.chatter/cat'] },
```

**Something that may happen** is a [storylet](/docs/reference/storylets): a scene marked as drawn from a set, with a weight and its own `when`. An effect draws one of the eligible scenes:

```ts
import type { DataScene, Effect } from '@ifloom/engine'

const windowSeat: DataScene = {
  id: 'cafe.window',
  drawnFrom: ['cafe'],
  weight: 3,
  when: { not: { seen: 'cafe.window' } },
  body: [{ text: 'cafe.window' }],
  choices: [{ id: 'leave', effects: [{ kind: 'scene', id: null }] }],
}

const sit: Effect = { kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }
```

**A value worked out in code** uses [`pick`, `roll`, `chance` or `weighted`](/docs/reference/random), with the seed, the turn and a name for the draw. A custom value prints it in prose as `{{v:cake}}`:

```ts
import { pick } from '@ifloom/engine'

custom: {
  values: { cake: (state) => pick(['lemon', 'carrot', 'walnut'], state.seed, state.turn, 'cafe.cake') },
},
```

```ts
'cafe.special': "Today's cake is {{v:cake}}.",
```

Reloading or undoing deals the same cake. That's on purpose: the player can't re-roll by reloading, and a playtest gives the same result every run.

### `<<timed>>`

```html
The kettle starts to rattle.
<<timed 3s>>It clicks off. Time to pour.<</timed>>
```

The engine has no clock that runs by itself, and prose is drawn all at once. A timer belongs to a [minigame](/docs/reference/minigames), a small game inside the story with states, inputs and timers. This one waits three seconds for the kettle, unless the player pours early:

```ts
minigames: [
  {
    id: 'kettle',
    label: 'The kettle',
    start: 'boiling',
    states: {
      boiling: { label: 'kettle.boiling', after: { ms: 3000, go: 'boiled' }, on: [{ input: 'pour', go: 'early' }] },
      boiled: { final: { effects: [{ kind: 'scene', id: 'kettle.done' }] } },
      early: { final: { effects: [{ kind: 'scene', id: 'kettle.weak' }] } },
    },
  },
],
```

A scene with `minigame: 'kettle'` starts it when the player enters. The React UI runs the clock, so the timer counts down on screen. A `<<timed>>` that only reveals text after a pause, with nothing for the player to do, has no direct equivalent. Make the reveal a choice ("Wait"), or animate it in your UI.

## Harlowe

Harlowe's macros map to the same places as SugarCube's.

| Harlowe | IFLoom |
|---|---|
| `(set: $coins to it + 2)` | `{ kind: 'stat', key: 'coins', by: 2 }`, an [effect](/docs/reference/effects) on a choice |
| `(set: $metAva to true)` | `{ kind: 'flag', key: 'metAva', value: true }` |
| `(if: $coins >= 3)[…](else:)[…]` | A block or a choice with `when: { stat: 'coins', gte: 3 }`, and one with `lt: 3` for the else |
| `(link-goto: "Go to the café", "Cafe")` | A choice with `{ kind: 'scene', id: 'cafe' }`, labelled by the prose key `street#cafe` |
| `(go-to: "Cafe")` | The `scene` effect, on a choice or a [trigger](/docs/reference/triggers) |
| `(display: "Menu")` | A prose key, `cafe.menu`, used as a block in each scene that shows it |
| `(either: "rain", "sun")` | A [variants](/docs/reference/prose#variantmember) block, or [`pick`](/docs/reference/random#pick) in a custom value |
| `(random: 1, 6)` | [`roll`](/docs/reference/random#roll) in a custom function, or `{ kind: 'minigameVar', key, random: [1, 6] }` in a minigame |
| `(dm: "name", "Soup", "price", 6)` | An [entity](/docs/reference/entities) of a declared kind, with its own stats and variables |
| `(a: "lemon", "carrot")` | A plain TypeScript array in your content, or a [collection](/docs/reference/collections) when the player gathers entries |
| `\|order>[…]` with `(replace: ?order)[…]` | A choice that stays on the scene and sets a variable, and a block whose `when` reads it |
| `(live: 2s)[…]` | A [minigame](/docs/reference/minigames) timer |
| `(dialog: "The café is closing.")` | A [notice](/docs/reference/notices), with the `notify` effect |
| `(save-game: "Slot A")` | The React UI's save menu, or [`runner.save('a')`](/docs/reference/runner#the-runners-members) |

Hooks are the biggest difference. Harlowe changes parts of a passage in place. IFLoom redraws the whole scene from the state after every choice, so you change the state and let the blocks follow:

```html
|order>[Ava waits for your order.]
(link: "Ask for the usual")[(replace: ?order)[Ava is already reaching for your cup.]]
```

```ts
{
  id: 'cafe',
  body: [
    { text: 'cafe/waiting', when: { not: { flag: 'askedUsual' } } },
    { text: 'cafe/usual', when: { flag: 'askedUsual' } },
  ],
  choices: [{ id: 'usual', when: { not: { flag: 'askedUsual' } }, effects: [{ kind: 'flag', key: 'askedUsual', value: true }] }],
}
```

A datamap you'd keep in a variable becomes an entity when it's one of several things with numbers that change, such as dishes on a menu. Its fields are stats and variables, declared and checked. A datamap that never changes is plain TypeScript in your content.

`(dialog:)` maps to a notice only loosely. A notice is news shown beside the story, such as a toast, not a box the player must close before going on. For a message the player must acknowledge, open a scene with one choice.

## What IFLoom does for you

- **Rules written once.** A condition that greys out a choice carries its reason, and the same check runs when the button is drawn and when it's pressed. The player sees `You need 3 coins.` on the button, and the button and the refusal never disagree. In Twine you'd write the `<<if>>` around the link and the line explaining it separately.
- **`ifloom check` before anyone plays.** Every scene, stat, item, kind and prose key that content names is checked, so a typo shows up as a line like `cafe · scene cafe · goes to unknown scene "stret"` instead of a broken link in play. See [`ifloom check`](/docs/cli#ifloom-check).
- **Typed content.** Scenes, conditions and effects are TypeScript types, so your editor completes `kind: 'stat'` and underlines a missing field as you type.
- **Seeded randomness that replays.** Every draw comes from the save's seed. Undo can't re-roll, a bug report's save reproduces exactly, and tests give the same result every run. See [Randomness](/docs/reference/random).
- **Versioned saves.** Give the game a `version` and `migrations`, and saves from older releases load into the new one. See [Saves](/docs/reference/saves#the-games-own-migrations).
- **Playtests and snapshots.** [`ifloom playtest`](/docs/cli#ifloom-playtest) plays the game with no one at the keyboard and writes every screen to a transcript. [`ifloom snapshot`](/docs/cli#ifloom-snapshot) records how every scene reads, and tells you which ones a change altered.
- **One-file builds.** [`ifloom build`](/docs/cli#ifloom-build) makes one HTML file that opens from disk, like a Twine story, with your pictures beside it or inside it.

## What's different

- **No raw HTML or JavaScript in prose.** Prose is words with a small [markup](/docs/reference/prose#markup) for speech, pictures, video and sound. Anything that looks different is your UI's job, through [themes and CSS](/docs/react/customising), and anything that computes is a custom function.
- **Content is data in TypeScript.** There's no story file to open in a Twine editor. Scenes are objects in `.ts` files, and their words are in `prose`. You edit them in a code editor, and you can split them across as many files and [packs](/docs/reference/loader#pack) as you like.
- **State is typed and declared.** Stats, items, kinds, settings and inputs are declared before they're used. Variables don't need declaring, but only hold a number, a string or `true`/`false`. There's no storing objects or functions in the state, because the state is the save and must survive being written out as JSON.
- **The whole scene redraws.** There's no changing text in place after a passage is shown. A choice changes the state, and the scene is drawn again from it.
- **Not into TypeScript?** The [editor](/docs/guide/editor) at `/editor` lets you write scenes, choices, stats and items from forms in your browser and play them as you go. When you're done, you export the pack as TypeScript or JSON and drop it into a game.

## Where next

- [Your first story](/docs/guide/first-story) builds a short story with scenes, choices, a stat, a counter and a name input.
- [Core concepts](/docs/guide/concepts) explains the ideas behind scenes, stats, turns and saves.
- [Scenes](/docs/reference/scenes), [Conditions](/docs/reference/conditions) and [Effects](/docs/reference/effects) list everything a scene can do.
