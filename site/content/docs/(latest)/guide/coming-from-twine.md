---
title: "Coming from SugarCube or Harlowe"
description: For authors who know Twine's SugarCube or Harlowe story formats. Maps passages, links, macros, variables, special passages, saves, audio and randomness to IFLoom's scenes, choices, conditions, effects and plugins, with side-by-side snippets.
---
If you've written Twine stories in SugarCube or Harlowe, most of what you know carries over. A passage becomes a scene, a link becomes a choice, and a variable becomes a stat or a key in the kv store. What changes is where things are written. In Twine, a passage is text with macros mixed in. In IFLoom, a scene is data: its words are written in place, as blocks of text and choice labels, and its conditions and effects are plain objects beside them.

This page maps each idea, with their version first and IFLoom's under it. The examples come from the showcase's small town: Ava's café on the corner, and the coins in the player's pocket. If you haven't made a game yet, start with [Your first story](/docs/guide/first-story), then come back here as a phrasebook.

## A whole passage, side by side

This café passage in SugarCube shows a line when the player is short of money, and offers a coffee that costs 3 coins:

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

The same scene in IFLoom, in one file to keep it short:

```ts
// src/game.ts
import { loadGame, text, type Content } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'

const cafe: Content = {
  introScene: 'cafe',
  stats: [{ id: 'coins', label: 'Coins', start: 5, max: 999, spendable: true, format: '{n} coins' }],
  scenes: [
    {
      id: 'cafe',
      title: 'The Corner Café',
      body: [text('Ava looks up from the till. "The usual?"'), text('Your pockets feel light.', { when: { stat: 'coins', lt: 3 } })],
      choices: [
        {
          id: 'coffee',
          label: 'Buy a coffee',
          blocked: [{ when: { stat: 'coins', lt: 3 }, reason: 'You need 3 coins.' }],
          effects: [{ stat: 'coins', by: -3 }, { kv: 'hadCoffee', to: true }, { scene: 'street' }],
        },
        { id: 'leave', label: 'Head back out', effects: [{ scene: 'street' }] },
      ],
    },
    { id: 'street', title: 'The high street', body: [text('The high street, busy with the market.')], choices: [] },
  ],
}

// What the page and the CLI build the game from.
export default defineGame({ build: () => loadGame([cafe], { id: 'corner-cafe', title: 'The Corner Café' }) })
```

It's longer, and it does a few things the passage doesn't:

- The coffee button stays on screen when the player can't afford it, greyed out, with `You need 3 coins.` on it. You wrote the rule once and the reason comes with it.
- `coins` is declared, with a start, a range and a label, so the UI lists it. Because it's `spendable`, the button works its price out from the choice's effects and shows `Buy a coffee (3 coins)` by itself. Leave the price out of the label, or it shows twice.
- `npm run check` fails if `street` is misspelt anywhere.

### Where passages go

A Twine story is one file of passages. An IFLoom game is a few files, each exporting [`Content`](/docs/reference/loader#content), in the layout every template starts with (see [Organising a game](/docs/guide/organising)):

| In Twine | In an IFLoom game |
|---|---|
| `StoryInit`, the variables every passage uses | `src/world/`, a file per kind: `stats.ts`, `things.ts`, `cast.ts` for the people |
| The passages of one place, chapter or character | A file in `src/story/`, such as `story/cafe.ts`, with those scenes, their words and anything else that belongs there |
| Passages tagged `widget`, and JavaScript in the Story JavaScript | `src/rules.ts`: the game's own code, its hooks and the functions content calls by name |
| The story's title and its start passage | `src/game.ts`, the [game module](/docs/cli#the-game-module), which lists the files' content for `loadGame` and holds the title. The start passage is `introScene`, in the content that holds it. |

So the café above would be `src/story/cafe.ts`, with its scenes and their words, and `coins` would go in `src/world/stats.ts`, where every other area can use it.

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
{ stat: 'coins', by: 2 }
{ stat: 'coins', to: 5 }
{ kv: 'metAva', to: true }
{ kv: 'visits', by: 1 }
```

Numbers the player sees, earns or spends are [stats](/docs/reference/stats), and you declare each one. A stat stays between its `min` and `max`, so `coins` can't go below 0 however many coffees are bought. Everything else goes in the [kv store](/docs/reference/state#kv): keys with a true/false, number or text value, set with the `kv` effect. A key that was never set reads as 0, so a counter needs no `<<set $visits to 0>>` first. Things the player carries are [entities](/docs/reference/entities#holding-things) they hold: `{ entity: 'item:umbrella', by: 1 }` gives one, and the `give` helper writes it.

There's no temporary `_variable`. A value you only need while a scene is on screen is usually a condition you can write where it's used.

### `<<if>>` and `<<elseif>>`

```html
<<if $visits gte 3>>Ava has your cup out before you reach the counter.
<<else>>Ava gives you a polite nod.<</if>>
```

A scene's body is a list of blocks, and each block can have a `when`. A block whose [condition](/docs/reference/conditions) fails is left out:

```ts
body: [
  text('The café is warm and smells of toast.'),
  text('Ava has your cup out before you reach the counter.', { when: { kv: 'visits', gte: 3 } }),
  text('Ava gives you a polite nod.', { when: { kv: 'visits', lt: 3 } }),
],
```

An `<<elseif>>` chain is a [`cases`](/docs/reference/flows#the-first-that-fits) block. Only the first block whose `when` holds is shown, and a last block with no `when` is the `<<else>>`:

```ts
import { cases, text } from '@ifloom/engine'

cases([
  text('You could buy the whole cake cabinet.', { when: { stat: 'coins', gte: 20 } }),
  text('Enough for a coffee and a bun.', { when: { stat: 'coins', gte: 5 } }),
  text('Your pockets feel light.'),
]),
```

### `<<if>>` in the middle of a line, `<<print>>` and `$var`

```html
The mirror says you look <<if $outfit is "suit">>sharp<<else>>fine, probably<</if>>.
Coins: <<print $coins>>. Hello, $name.
```

A few words that change in the middle of a sentence are a [phrase](/docs/reference/phrases). Declare it once in your content's `phrases`, with rows tried in order, and print it with a token:

```ts
phrases: {
  outfit: {
    verdict: [{ when: { kv: 'outfit', is: 'suit' }, text: 'sharp' }, { text: 'fine, probably' }],
  },
},
// 'The mirror says you look {{outfit.verdict}}.'
```

A `<<print>>` with a ternary, such as `<<print $tired ? "slowly" : "briskly">>`, is a phrase the same way. Nested objects are groups, so phrases that belong together sit together, and the token names the path.

`$name` and `<<print $name>>` are a [token](/docs/reference/prose#tokens): `{{name}}` prints the kv key `name`, or a value of the game's own by that name. A stat has no token of its own, so print one with a value in `rules.values` that reads it with [`statValue`](/docs/reference/stats#statvalue).

`and`, `or` and `not` are `all`, `any` and `not`:

```ts
{ all: [{ stat: 'coins', gte: 3 }, { not: { kv: 'hadCoffee' } }] }
{ any: [{ entity: 'item:umbrella', at: 'you' }, { entity: 'item:raincoat', at: 'you' }] }
{ kv: 'errand', is: 'bread' }
```

An `<<if>>` around a link becomes one of two things on the choice:

- **`when`** hides the choice while it fails, as an `<<if>>` around the link does.
- **`blocked`** keeps it on screen, greyed out, with a reason. Most of the time this is what you want, because the player learns what they're missing.

```ts
{
  id: 'cake',
  when: { seen: 'ava.hi' },
  blocked: [{ when: { stat: 'coins', lt: 4 }, reason: 'You need 4 coins.' }],
  effects: [{ stat: 'coins', by: -4 }],
}
```

A link whose text changes with the state, such as `<<if $visits gte 3>>[[The usual|Order]]<<else>>[[Order|Order]]<</if>>`, is one choice with `labels`. The first entry whose `when` holds gives its words, and `label` is the rest of the time:

```ts
{ id: 'order', label: 'Order', labels: [{ when: { kv: 'visits', gte: 3 }, label: 'The usual' }], effects: [/* ... */] }
```

An `<<if>>` that only exists to vary a line, so the player doesn't read the same words every visit, is a set of [variants](/docs/reference/prose#variantmember). The block `{ variants: 'cafe.chatter' }` shows one of the set each time, and rotates through them.

The engine also remembers things you'd keep a variable for in Twine. `{ seen: 'ava.hi' }` asks whether the player has been to a scene, and `{ chose: 'cafe#coffee' }` asks whether they've ever picked that choice. `visited()` and the "did they pick this?" variable both become conditions you don't have to set up.

### Passages and links

```html
:: Street
The high street, busy with the market.
[[Go to the café|Cafe]]
[[Walk to the park->Park]]
```

A passage is a [scene](/docs/reference/scenes), and each link is a choice whose effects include `{ scene: 'cafe' }`:

```ts
{
  id: 'street',
  body: [text('The high street, busy with the market.')],
  choices: [
    { id: 'cafe', label: 'Go to the café', effects: [{ scene: 'cafe' }] },
    { id: 'park', label: 'Walk to the park', effects: [{ scene: 'park' }] },
  ],
}
```

The link text is the choice's `label`. A scene with no choices is an ending. A setter link, `[[Buy a coffee|Cafe][$coins -= 3]]`, is a choice with more than one effect.


A passage that carries on after a link, with the text the link brings below it, is a [flowing scene](/docs/reference/flows). A decision partway through the body waits for the pick, and the pick's `then` comes next, before the rest of the passage. A link back to an earlier part of the passage, such as a list of questions to ask, is a `point()` and a choice that `jump()`s to it. The logic stays in data, beside the words, rather than in the prose.
### `<<link>>` and `<<button>>`

```html
<<link "Buy a coffee" "Cafe">><<set $coins -= 3>><</link>>
<<link "Leave a tip">><<set $coins -= 1>><<set $tipped to true>><</link>>
```

Both are choices. A choice with a `scene` effect moves on, and one without stays on the scene, which is redrawn with the new state:

```ts
{ id: 'coffee', effects: [{ stat: 'coins', by: -3 }, { scene: 'cafe' }] }
{ id: 'tip', effects: [{ stat: 'coins', by: -1 }, { kv: 'tipped', to: true }] }
```

A `<<button>>` in the StoryCaption or PassageFooter, offered on every screen, is an [action](/docs/reference/actions#actiondef). Actions are the game's own buttons, shown while no scene is open. One can have a cost, effects, and `blocked` entries that refuse it with a reason:

```ts
// in the content
actions: [
  {
    id: 'coffee',
    label: 'Buy a coffee',
    cost: { stats: { coins: 3 } },
    blocked: [{ when: { kv: 'hadCoffee' }, reason: 'One is enough for today.' }],
    effects: [{ kv: 'hadCoffee', to: true }],
  },
],
```

The button shows the cost as its price, and it's greyed out with `Not enough Coins.` or `One is enough for today.` when it can't be pressed.

### `<<goto>>` and `<<include>>`

```html
<<goto "Street">>
<<include "Menu">>
```

`<<goto>>` is the `scene` effect. Put it in the effects of whatever should move the player: a choice, an action or a [trigger](/docs/reference/triggers). `{ scene: null }` closes the scene and goes back to the game's idle screen, which is the room the player is in when the game has the [places plugin](/docs/plugins/places).

A `<<goto>>` that runs as soon as a passage shows, because some condition holds, is a trigger. It fires by itself after a command, the first time its `when` holds:

```ts
triggers: [{ id: 'broke', when: { stat: 'coins', lt: 1 }, effects: [{ scene: 'broke' }] }]
```

`<<include>>` is a line of prose kept by key and read by more than one scene. A `{ prose }` block names a key in the `prose` table, and any number of scenes can name the same one:

```ts
{ id: 'cafe.morning', body: [{ prose: 'cafe.menu' }, { prose: 'cafe.morning' }], choices: [] },
{ id: 'cafe.evening', body: [{ prose: 'cafe.menu' }, { prose: 'cafe.evening' }], choices: [] },
```

That covers shared words. A scene can't include another scene's choices, so a shared set of links is written on each scene that offers it, or offered once as actions.

### Widgets

```html
:: Widgets [widget]
<<widget "pay">><<set $coins -= _args[0]>><<set $spent += _args[0]>><</widget>>

<<pay 4>>
```

A widget that changes the state is one of the [game's own effects](/docs/reference/custom#effects): a function in the game's `rules` that returns effects, called by name from content with `game/` in front. A widget that answers a question is one of its conditions:

```ts
// src/rules.ts
export const rules: GameRules = {
  effects: {
    payFor: (_state, args) => {
      const price = Number(args.price ?? 0)
      return [
        { stat: 'coins', by: -price },
        { kv: 'spent', by: price },
      ]
    },
  },
  conditions: {
    canAfford: (state, args) => (state.stats.coins ?? 0) >= Number(args.price ?? 0),
  },
}
```

```ts
{
  id: 'cake',
  when: { 'game/canAfford': { price: 4 } },
  effects: [{ 'game/payFor': { price: 4 } }, { scene: null }],
}
```

A set of widgets that keeps its own state, such as a loyalty card or an inventory screen, is a [plugin](/docs/reference/plugins). [Your first plugin](/docs/reference/plugins#your-first-plugin) builds the loyalty card in about twenty lines. A widget that only prints markup has no equivalent, because prose can't run code. Its words go in a block of text, or a line kept by key when several scenes share it, and its looks go in your UI.

### `StoryInit` and starting state

```html
:: StoryInit
<<set $coins to 5>>
<<set $energy to 80>>
<<set $hasUmbrella to true>>
<<set $visits to 0>>
```

There's no init passage. You declare what the game keeps, and each declaration carries its starting value. What every part of the story uses goes in `src/world/`, a file for each kind:

```ts
// src/world/stats.ts and src/world/things.ts, shown together
stats: [
  { id: 'coins', label: 'Coins', start: 5, max: 999, spendable: true },
  { id: 'energy', label: 'Energy', start: 80 },
],
kinds: [{ id: 'item', label: 'Thing', listed: false }],
entities: [{ id: 'umbrella', of: 'item', name: 'umbrella', description: 'Big enough for two.', at: 'player' }],
```

A thing starts with whoever its `at` names, here the player, and with nobody if it gives none. Keys in the kv store need no declaration, and one that's never been set reads as 0, so `$visits` needs no line at all. The first scene is the content's `introScene`.

When you'd write a variable with a start value that isn't 0, ask whether it's really a stat (a number the player sees or spends) or a thing they have. If it's neither, give it in the content's starting `kv`, as in `kv: { mood: 'tired' }`.

### `State.variables` and `setup`

```js
State.variables.coins        // the player's coins
setup.dishes = {
  soup: { name: 'Soup of the day', price: 6 },
  toast: { name: 'Cheese on toast', price: 4 },
}
```

In IFLoom the whole game is one [state](/docs/reference/state) object, and it's also the save. Stats are in `state.stats`, the kv store in `state.kv` and what the player holds in `state.held`. Content reads them with conditions, and only the game's own code and your UI read the object itself.

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
{ stat: 'price', by: 1, of: 'dish:soup' }
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
  for (const beat of view.scene.beats) if (beat.type === 'text') add(passage, 'p', beat.text)
  for (const choice of [...view.scene.choices, ...view.actions]) {
    const button = add(passage, 'button', choice.label)
    button.disabled = Boolean(choice.disabled)
    button.onclick = () => runner.apply(choice.command)
  }
  root.replaceChildren(bar, passage)
}
```

```tsx tab="React" tab-group="framework"
// src/layout.tsx: a bar at the side and the passage beside it
import { Game, GameMenu, InputFields, Inventory, RoomActions, Scene, Sidebar, StatList, Story, Title } from '@ifloom/react'

export function Layout() {
  return (
    <Game>
      <Sidebar>
        <Title />
        <StatList />
        <GameMenu />
        <Inventory />
      </Sidebar>
      <Story>
        <Scene />
        <InputFields />
        <RoomActions />
      </Story>
    </Game>
  )
}
```

```ts tab="React" tab-group="framework"
// src/main.ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'
import { Layout } from './layout.tsx'

mountGame(module.build(), { layout: Layout, pages: { subtitle: 'A week at the corner café' } })
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

In the React UI, the layout in `src/layout.tsx` is the closest thing to arranging the UI bar:

- **StoryCaption** is a part in the `Sidebar`, such as `StatList`, or a component of your own beside it. See [Layouts](/docs/react#layouts).
- **StoryMenu** is the player's menu, `GameMenu`.
- **PassageHeader and PassageFooter** are parts above and below `Scene` in the `Story`.
- **The title and start screen** are [pages](/docs/react#pages), turned on with `pages`. [The title screen and settings](/docs/recipes/title-screen) walks through them, with a title screen of your own for the other templates.
- **StoryInterface**, a whole interface of your own, is [your own root](/docs/react/customising#8-write-your-own-root), or any of the other templates. See [Your own UI in any framework](/docs/guide/frameworks).

### The `Setting` API

```js
Setting.addToggle("hints", { label: "Show hints", default: true });
// in a passage: <<if settings.hints>>…<</if>>
```

Settings are declared on the game, and the React UI draws a settings page from them. A `play` setting is part of the game, and conditions read it. A `ui` setting only changes how things look, so it's kept in the player's profile and never in the state. See [Settings](/docs/reference/settings).

```ts
settings: [
  { id: 'hints', label: 'Show hints', type: 'toggle', default: true },
  { id: 'textSize', label: 'Text size', type: 'choice', affects: 'ui', options: [{ value: 'small', label: 'Small' }, { value: 'large', label: 'Large' }], default: 'small' },
],
```

```ts
text('The board above the till has today’s specials.', { when: { setting: 'hints' } })
```

### Old saves, `Config.saves` and `Save.onLoad`

```js
Config.saves.version = 2;
Save.onLoad.add(function (save) {
  /* rename $money to $coins in each moment of the save's history */
});
```

In SugarCube, when an update renames a variable, you set a save version and patch old saves in a load handler yourself. In IFLoom you give the game a `version` in the base you pass to `loadGame`, and a step in its [`rules`](/docs/reference/rules)' `migrations` for each version that needs one. A step takes a save's state and returns the new one:

```ts
import { loadGame, type GameRules } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'

const rules: GameRules = {
  migrations: {
    // Version 1 kept the purse in a kv key called money. Version 2 has a coins stat.
    1: (state) => {
      const { money, ...kv } = state.kv
      return money === undefined ? state : { ...state, kv, stats: { ...state.stats, coins: Number(money) } }
    },
  },
}

export default defineGame({ build: () => loadGame([cafe], { id: 'corner-cafe', title: 'The Corner Café', version: 2, rules }) })
```

The engine runs every step from the save's version up to the game's when the save loads, so a save from two versions ago runs both. See [The game's own migrations](/docs/reference/saves#the-games-own-migrations).

Saving itself needs no setup. [`mountGame`](/docs/react#mountgame) keeps saves in the browser's `localStorage` and autosaves to the `auto` slot each turn. The React UI's menu saves and loads, and undo goes 50 steps back. To change any of that, pass [`RunnerOptions`](/docs/reference/runner#runneroptions) as `runner`. What should outlive a save, such as the player's settings or that they've finished the game once, goes in the [profile](/docs/reference/profile).

`Config.saves.isAllowed` is the content's [`saveable`](/docs/reference/game#saveable): a list of conditions, each with the reason the player reads, and saving is refused while one holds. The React UI greys out its Save button with that reason, and the runner skips its autosave too.

```ts
export const cafe: Content = {
  saveable: [{ when: { not: { kv: 'playerName' } }, reason: 'Type your name first.' }],
}
```

Autosave only writes when its moment comes, so with `autosave: { every: 'turn' }` (the default) the first autosave is the first morning, after the intro is done.

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
{ id: 'cafe', audio: { ambience: 'cafe.murmur' }, body: [text('The café hums.')], choices: [] }
{ sound: 'bell' }
{ audio: 'music', to: null }
```

The engine works out what should be playing, and the [audio player](/docs/browser/audio-player) plays it. The React UI starts it for you, and its settings page gets volume and mute when you declare those settings. See [Audio](/docs/reference/audio).

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
body: [text('The café hums.'), { variants: 'cafe.chatter' }],
// in the content: the lines are kept by key in `prose`, and the variants list them
variants: { 'cafe.chatter': ['cafe.chatter.rain', 'cafe.chatter.market', 'cafe.chatter.cat'] },
```

**Something that may happen** is a [storylet](/docs/reference/storylets): a scene marked as drawn from a set, with a weight and its own `when`. An effect draws one of the eligible scenes:

```ts
import { text, type DataScene, type Effect } from '@ifloom/engine'

const windowSeat: DataScene = {
  id: 'cafe.window',
  drawnFrom: ['cafe'],
  weight: 3,
  when: { not: { seen: 'cafe.window' } },
  body: [text('You take the stool by the window.')],
  choices: [{ id: 'leave', label: 'Finish your cup', effects: [{ scene: null }] }],
}

const sit: Effect = { scene: { from: 'cafe', otherwise: 'cafe.quiet' } }
```

**A value worked out in code** uses [`drawOne`, `draw`, `chance` or `weighted`](/docs/reference/random), with the seed, the turn and a name for the draw. A value in the game's `rules` prints it in prose as `{{cake}}`:

```ts
import { drawOne, type GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  values: { cake: (state) => drawOne(['lemon', 'carrot', 'walnut'], state.seed, state.turn, 'cafe.cake') },
}
```

```ts
'cafe.special': "Today's cake is {{cake}}.",
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
      boiled: { final: { effects: [{ scene: 'kettle.done' }] } },
      early: { final: { effects: [{ scene: 'kettle.weak' }] } },
    },
  },
],
```

A scene with `minigame: 'kettle'` starts it when the player enters. The React UI runs the clock, so the timer counts down on screen. A `<<timed>>` that only reveals text after a pause, with nothing for the player to do, is a block with a [presentation hint](/docs/reference/ui-hints): in the React UI, `ui: { reveal: { delay: 1500 } }`. Nothing in the game waits, so a test or a replay sees the text at once.

### A life sim: the clock, the day's end and game over

Many SugarCube games keep `$time` and `$weekday` themselves, move them on with a `<<timelink>>`-style widget, and run a long `<<dayshift>>` widget when the player sleeps. Each of those maps to a part of IFLoom:

| SugarCube | IFLoom |
|---|---|
| `$time` as a number of periods, `$weekday`, `$gameDay` | The [calendar plugin](/docs/plugins/calendar), with your periods: `calendar({ periods: [{ id: 'early', label: 'early morning' }, ...] })`. The header reads them, and conditions test them with `calendar.period('evening')` and `calendar.weekday(5, 6)`. |
| A link that costs time, `<<set $time += 2>>` | [`calendar.pass(2)`](/docs/plugins/calendar#effects) in the choice's or action's effects. The button shows `until noon` by itself. |
| "Too late" once `$time` reaches night | The calendar's [curfew guard](/docs/plugins/calendar#the-guard), and `blocked` entries such as `{ when: calendar.period('night'), reason: 'Too late for that.' }`. |
| A `Sleep` passage that only works late | The calendar's [`calendar.sleep()`](/docs/plugins/calendar#commands) command, with `sleep: { from: ['evening', 'night'] }`. |
| `<<dayshift>>`: payday, rent, decay, mood, which morning passage to show | [`rules.onTurn`](/docs/reference/rules#a-days-end-step-by-step). It runs once per day, sees the state as the player went to bed as `before`, and applies effects in the order you write them, ending with the scene the morning opens on. |
| Per-day flags reset in the widget, `<<set $talkedToday to false>>` | The content's [`resets`](/docs/reference/rules#resets): `resets: { talkedToday: false }`. |
| Opening hours, `<<if $weekday lte 5 and $time lte 1>>[[Office]]<</if>>` | A place's [`blocked`](/docs/plugins/places#opening-hours) entries. The exit stays on screen, greyed out with the reason. |
| Where someone is, `$ava.location` set by a schedule widget | A [cast](/docs/plugins/cast#where-people-are) character's `schedule`. |
| Warnings in StoryCaption, such as "Rent due tomorrow" | Blocks with a `when` in each place's body. See [Lines on every place](/docs/plugins/places#lines-on-every-place). |
| One-off feedback, "You got paid" | A [notice](/docs/reference/notices) from the `notify` effect. |
| `<<goto "Game Over">>` | A scene with a "Play again" choice, or no choices, a `phase` kv key and a lock. See [Endings](/docs/reference/scenes#endings). |
| `Engine.restart()` | A choice that sends [`{ type: 'newGame' }`](/docs/reference/commands#newgame). The runner starts a new game and keeps the player's settings. |
| `Config.saves.isAllowed` | The content's [`saveable`](/docs/reference/game#saveable): `blocked` entries, refused while `when` holds, with the reason on the greyed-out Save button. |

The day's end is the biggest change. A `<<dayshift>>` widget changes variables one after another, and each line sees the last. `rules.onTurn` works the same way: each `apply` runs on the state the one before it left, so the rent can come out of the wages just paid. What the day held before the night's resets is in `before`. [A day's end, step by step](/docs/reference/rules#a-days-end-step-by-step) shows one.

[Life sim patterns](/docs/recipes/life-sim-patterns) has short worked examples of the rest: work each new day, cooldowns, wages paid on a Friday, who's behind an exit, lines shared across places, placeholders for missing art, and the order refusals come in.

## Harlowe

Harlowe's macros map to the same places as SugarCube's.

| Harlowe | IFLoom |
|---|---|
| `(set: $coins to it + 2)` | `{ stat: 'coins', by: 2 }`, an [effect](/docs/reference/effects) on a choice |
| `(set: $metAva to true)` | `{ kv: 'metAva', to: true }` |
| `(if: $coins >= 3)[…](else:)[…]` | A [`cases`](/docs/reference/flows#the-first-that-fits) block: one with `when: { stat: 'coins', gte: 3 }`, then one with no `when` for the else. On a choice, `when` or `blocked`. |
| `(print: $name)`, `$name` in a passage | A [token](/docs/reference/prose#tokens), `{{name}}` |
| `(if:)` in the middle of a sentence | A [phrase](/docs/reference/phrases), printed as `{{outfit.verdict}}` |
| `(link-goto: "Go to the café", "Cafe")` | A choice with `{ scene: 'cafe' }` and `label: 'Go to the café'` |
| `(go-to: "Cafe")` | The `scene` effect, on a choice or a [trigger](/docs/reference/triggers) |
| `(display: "Menu")` | A line kept by key in `prose`, `cafe.menu`, read with `{ prose: 'cafe.menu' }` in each scene that shows it |
| `(either: "rain", "sun")` | A [variants](/docs/reference/prose#variantmember) block, or [`drawOne`](/docs/reference/random#drawone) in a value of the game's own |
| `(random: 1, 6)` | `roll` on the [context](/docs/reference/custom#customcontext) of the game's own code, or `{ kv: key, of: 'minigame', random: [1, 6] }` in a minigame |
| `(dm: "name", "Soup", "price", 6)` | An [entity](/docs/reference/entities) of a declared kind, with its own stats and kv store |
| `(a: "lemon", "carrot")` | A plain TypeScript array in your content, or [things the player holds](/docs/reference/entities#notes-photos-and-other-things-made-in-play) when they gather them |
| `\|order>[…]` with `(replace: ?order)[…]` | A choice that stays on the scene and sets a kv key, and a block whose `when` reads it |
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
    text('Ava waits for your order.', { when: { not: { kv: 'askedUsual' } } }),
    text('Ava is already reaching for your cup.', { when: { kv: 'askedUsual' } }),
  ],
  choices: [{ id: 'usual', label: 'Ask for the usual', when: { not: { kv: 'askedUsual' } }, effects: [{ kv: 'askedUsual', to: true }] }],
}
```

A datamap you'd keep in a variable becomes an entity when it's one of several things with numbers that change, such as dishes on a menu. Its fields are stats and kv keys. A datamap that never changes is plain TypeScript in your content.

`(dialog:)` maps to a notice only loosely. A notice is news shown beside the story, such as a toast, not a box the player must close before going on. For a message the player must acknowledge, open a scene with one choice.

## What IFLoom does for you

- **Rules written once.** A condition that greys out a choice carries its reason, and the same check runs when the button is drawn and when it's pressed. The player sees `You need 3 coins.` on the button, and the button and the refusal never disagree. In Twine you'd write the `<<if>>` around the link and the line explaining it separately.
- **`ifloom check` before anyone plays.** Every scene, stat, kind and prose key that content names is checked, so a typo shows up as a line like `cafe · scene cafe · goes to unknown scene "stret"` instead of a broken link in play. See [`ifloom check`](/docs/cli#ifloom-check).
- **Typed content.** Scenes, conditions and effects are TypeScript types, so your editor completes `stat: 'coins'` and underlines a missing field as you type.
- **Seeded randomness that replays.** Every draw comes from the save's seed. Undo can't re-roll, a bug report's save reproduces exactly, and tests give the same result every run. See [Randomness](/docs/reference/random).
- **Versioned saves.** Give the game a `version` and `migrations`, and saves from older releases load into the new one. See [Saves](/docs/reference/saves#the-games-own-migrations).
- **Playtests and snapshots.** [`ifloom playtest`](/docs/cli#ifloom-playtest) plays the game with no one at the keyboard and writes every screen to a transcript. [`ifloom snapshot`](/docs/cli#ifloom-snapshot) records how every scene reads, and tells you which ones a change altered.
- **One-file builds.** [`ifloom build`](/docs/cli#ifloom-build) makes one HTML file that opens from disk, like a Twine story, with your pictures beside it or inside it.

## What's different

- **No raw HTML or JavaScript in prose.** Prose is words with a small [markup](/docs/reference/prose#markup) for speech, pictures, video and sound. Anything that looks different is your UI's job, through [themes and CSS](/docs/react/customising), and anything that computes is the game's own code, in `rules`.
- **Content is data in TypeScript.** There's no story file to open in a Twine editor. Scenes are objects in `.ts` files, with their words written in them. You edit them in a code editor, and you can split them across as many files as you like (see [Content and packs](/docs/reference/loader#content-and-packs)).
- **State is typed and declared.** Stats, kinds, entities, settings and inputs are declared before they're used. Keys in the kv store don't need declaring, but only hold a number, a string or `true`/`false`. There's no storing objects or functions in the state, because the state is the save and must survive being written out as JSON.
- **The whole scene redraws.** There's no changing text in place after a passage is shown. A choice changes the state, and the scene is drawn again from it.

## Where next

- [Your first story](/docs/guide/first-story) builds a short story with scenes, choices, a stat, a counter and a name input.
- [Core concepts](/docs/guide/concepts) explains the ideas behind scenes, stats, turns and saves.
- [Life sim patterns](/docs/recipes/life-sim-patterns) shows the common pieces of a life sim built from what the engine and plugins have.
- [Scenes](/docs/reference/scenes), [Conditions](/docs/reference/conditions) and [Effects](/docs/reference/effects) list everything a scene can do.
