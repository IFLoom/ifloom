---
title: "Twine phrasebook"
description: "Each SugarCube and Harlowe macro, special passage and idea beside the IFLoom scene, choice, condition, effect or plugin that does the same."
---
This phrasebook maps each SugarCube and Harlowe idea to IFLoom, with the Twine version first and IFLoom's under it. A passage is a [scene](/docs/reference/scenes), a link is a choice, and a variable is a stat or a key in the [kv store](/docs/reference/glossary#kv). [Move a story from Twine](/docs/how-to/move-from-twine) converts a whole passage, and [Differences from Twine, Ink and Ren'Py](/docs/explanation/design#differences-from-twine-ink-and-renpy) explains why IFLoom keeps rules out of the prose.

The examples come from the showcase's café on the corner, and the coins in the player's pocket.

## SugarCube

Each SugarCube macro or special passage below has the IFLoom content that does its job.

### `<<set>>` and effects

```html
<<set $coins += 2>>
<<set $coins to 5>>
<<set $metAva to true>>
<<set $visits += 1>>
```

Each change is an [effect](/docs/reference/effects), and a choice runs its list of effects in order when the player chooses it:

```ts fragment
{ stat: 'coins', by: 2 }
{ stat: 'coins', to: 5 }
{ kv: 'metAva', to: true }
{ kv: 'visits', by: 1 }
```

A number the player sees, earns or spends is a [stat](/docs/reference/stats), declared with a range, so `coins` can't go below 0 however many coffees are bought. Everything else goes in the kv store, keys with a true/false, number or text value, set with the `kv` effect. A key that was never set reads as 0, so a counter needs no `<<set $visits to 0>>` first. A thing the player carries is an [entity](/docs/reference/entities#holder-and-placement) they hold, so `{ entity: 'item:umbrella', by: 1 }` gives one.

IFLoom has no temporary `_variable`. A value needed only while a scene is on screen is a condition written where it's used.

### `<<if>>` and `<<elseif>>`

```html
<<if $visits gte 3>>Ava has your cup out before you reach the counter.
<<else>>Ava gives you a polite nod.<</if>>
```

A scene's body is a list of blocks, and each block can have a `when`. A block whose [condition](/docs/reference/conditions) fails is left out:

```ts fragment
body: [
  text('The café is warm and smells of toast.'),
  text('Ava has your cup out before you reach the counter.', { when: { kv: 'visits', gte: 3 } }),
  text('Ava gives you a polite nod.', { when: { kv: 'visits', lt: 3 } }),
],
```

An `<<elseif>>` chain is a [`cases`](/docs/reference/flows#cases) block. It shows only the first block whose `when` holds, and a last block with no `when` is the `<<else>>`:

```ts
import { cases, text } from '@ifloom/engine'

export const purse = cases([
  text('You could buy the whole cake cabinet.', { when: { stat: 'coins', gte: 20 } }),
  text('Enough for a coffee and a bun.', { when: { stat: 'coins', gte: 5 } }),
  text('Your pockets feel light.'),
])
```

### `<<if>>` in a line, `<<print>>` and `$var`

```html
The mirror says you look <<if $outfit is "suit">>sharp<<else>>fine, probably<</if>>.
Coins: <<print $coins>>. Hello, $name.
```

A few words that change in the middle of a sentence are a [phrase](/docs/reference/phrases). Content declares it once in `phrases`, with rows tried in order, and prose prints it with a token:

```ts fragment
phrases: {
  outfit: {
    verdict: [{ when: { kv: 'outfit', is: 'suit' }, text: 'sharp' }, { text: 'fine, probably' }],
  },
},
// 'The mirror says you look {{outfit.verdict}}.'
```

A `<<print>>` with a ternary, such as `<<print $tired ? "slowly" : "briskly">>`, is a phrase the same way. Nested objects are groups, and the token names the path.

`$name` and `<<print $name>>` are a [token](/docs/reference/prose#tokens). `{{name}}` prints the kv key `name`, or a value of the game's own by that name. A stat has no token of its own, so a value in `rules.values` that reads it with [`statValue`](/docs/reference/stats#statvalue) prints it.

`and`, `or` and `not` are `all`, `any` and `not`:

```ts fragment
{ all: [{ stat: 'coins', gte: 3 }, { not: { kv: 'hadCoffee' } }] }
{ any: [{ entity: 'item:umbrella', at: 'you' }, { entity: 'item:raincoat', at: 'you' }] }
{ kv: 'errand', is: 'bread' }
```

An `<<if>>` around a link becomes one of two fields on the choice:

- **`when`** hides the choice while it fails, as an `<<if>>` around the link does.
- **`blocked`** keeps the choice on screen, greyed out, with a reason, so the player learns what they're missing.

```ts fragment
{
  id: 'cake',
  when: { seen: 'ava.hi' },
  blocked: [{ when: { stat: 'coins', lt: 4 }, reason: 'You need 4 coins.' }],
  effects: [{ stat: 'coins', by: -4 }],
}
```

A link whose text changes with the state, such as `<<if $visits gte 3>>[[The usual|Order]]<<else>>[[Order|Order]]<</if>>`, is one choice with `labels`. The first entry whose `when` holds gives its words, and `label` gives them the rest of the time:

```ts fragment
{ id: 'order', label: 'Order', labels: [{ when: { kv: 'visits', gte: 3 }, label: 'The usual' }], effects: [{ scene: 'cafe.order' }] }
```

An `<<if>>` that only varies a line, so the player doesn't read the same words every visit, is a set of [variants](/docs/reference/prose#variantmember). The block `{ variants: 'cafe.chatter' }` shows one of the set each time.

The engine also remembers what a Twine story keeps a variable for. `{ seen: 'ava.hi' }` asks whether the player has been to a scene, and `{ chose: 'cafe#coffee' }` asks whether they've ever chosen that choice, so `visited()` and a "did they choose this?" variable both become conditions with nothing to set up.

### Passages and links

```html
:: Street
The high street, busy with the market.
[[Go to the café|Cafe]]
[[Walk to the park->Park]]
```

A passage is a scene, and each link is a [choice](/docs/reference/scenes#choice) whose effects include `{ scene: 'cafe' }`:

```ts fragment
{
  id: 'street',
  body: [text('The high street, busy with the market.')],
  choices: [
    { id: 'cafe', label: 'Go to the café', effects: [{ scene: 'cafe' }] },
    { id: 'park', label: 'Walk to the park', effects: [{ scene: 'park' }] },
  ],
}
```

The link text is the choice's `label`, and a scene with no choices is an ending. A setter link, `[[Buy a coffee|Cafe][$coins -= 3]]`, is a choice with more than one effect.

A passage that carries on after a link, with the text the link brings below it, is a [flowing scene](/docs/reference/flows). A decision partway through the body waits for the player to choose, and the choice's `then` comes next, before the rest of the passage. A link back to an earlier part of the passage, such as a list of questions to ask, is a `point()` and a choice that `jump()`s to it. The jump goes in the choice's `effects`, never its `then`:

```ts fragment
point('questions'),
decide('ask', [
  choice('beans', 'Ask about the beans', { then: [say('mara', 'From the hills, mostly.')], effects: [jump('questions')] }),
  choice('done', 'That’s all'),
]),
```

### `<<link>>` and `<<button>>`

```html
<<link "Buy a coffee" "Cafe">><<set $coins -= 3>><</link>>
<<link "Leave a tip">><<set $coins -= 1>><<set $tipped to true>><</link>>
```

Both are choices. A choice with a `scene` effect moves on, and one without stays on the scene, which renders again with the new state:

```ts fragment
{ id: 'coffee', label: 'Buy a coffee', effects: [{ stat: 'coins', by: -3 }, { scene: 'cafe' }] }
{ id: 'tip', label: 'Leave a tip', effects: [{ stat: 'coins', by: -1 }, { kv: 'tipped', to: true }] }
```

A `<<button>>` in the StoryCaption or PassageFooter, offered on every screen, is an [action](/docs/reference/actions#actiondef), one of the game's own buttons shown while no scene is open. An action can have a cost, effects, and `blocked` entries that refuse it with a reason:

```ts fragment
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

The button shows the cost as its price, and it's greyed out with `Not enough Coins.` or `One is enough for today.` when the player can't press it.

### `<<goto>>` and `<<include>>`

```html
<<goto "Street">>
<<include "Menu">>
```

`<<goto>>` is the `scene` effect, in the effects of whatever moves the player: a choice, an action or a [trigger](/docs/reference/triggers). `{ scene: null }` closes the scene and goes back to the room, which shows the location the player is at when the game has the [places plugin](/docs/reference/plugins/places).

A `<<goto>>` that runs as soon as a passage shows, because a condition holds, is a trigger. It fires by itself after a command, the first time its `when` holds:

```ts fragment
triggers: [{ id: 'broke', when: { stat: 'coins', lt: 1 }, effects: [{ scene: 'broke' }] }]
```

`<<include>>` is a line kept by key in the `prose` table and read by more than one scene. A `{ prose }` block names the key, and any number of scenes can name the same one:

```ts fragment
{ id: 'cafe.morning', body: [{ prose: 'cafe.menu' }, { prose: 'cafe.morning' }], choices: [] },
{ id: 'cafe.evening', body: [{ prose: 'cafe.menu' }, { prose: 'cafe.evening' }], choices: [] },
```

A scene can't include another scene's choices, so a shared set of links is written on each scene that offers it, or offered once as actions.

### Widgets

```html
:: Widgets [widget]
<<widget "pay">><<set $coins -= _args[0]>><<set $spent += _args[0]>><</widget>>

<<pay 4>>
```

A widget that changes the state is one of the game's own [macros](/docs/reference/custom#macros), a function in the game's `rules` that returns effects, which content calls by name with `game/` in front. A widget that answers a question is one of its [conditions](/docs/reference/custom#conditions):

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  macros: {
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

```ts fragment
{
  id: 'cake',
  when: { 'game/canAfford': { price: 4 } },
  effects: [{ 'game/payFor': { price: 4 } }, { scene: null }],
}
```

A set of widgets that keeps its own state, such as a loyalty card, is a plugin ([Write a plugin](/docs/how-to/write-a-plugin)). A widget that only prints markup has no counterpart, because prose can't run code. Its words go in a block of text, or a line kept by key when several scenes share it, and its looks go in the UI.

### `StoryInit` and starting state

```html
:: StoryInit
<<set $coins to 5>>
<<set $energy to 80>>
<<set $hasUmbrella to true>>
<<set $visits to 0>>
```

IFLoom has no init passage. Content declares what the game keeps, and each declaration carries its starting value. The declarations every part of the story uses go in `src/world/`, a file for each kind:

```ts fragment
stats: [
  { id: 'coins', label: 'Coins', start: 5, max: 999, spendable: true },
  { id: 'energy', label: 'Energy', start: 80 },
],
kinds: [{ id: 'item', label: 'Thing', listed: false }],
entities: [{ id: 'umbrella', of: 'item', name: 'umbrella', description: 'Big enough for two.', at: 'player' }],
```

A thing starts with the holder its `at` names, here the player, and with nobody when it gives none. A kv key needs no declaration and reads as 0 until set, so `$visits` needs no line at all. A kv key that starts at another value goes in the content's starting `kv`, such as `kv: { mood: 'tired' }`. The first scene is the content's `introScene`.

### `State.variables` and `setup`

```js
State.variables.coins // the player's coins
setup.dishes = {
  soup: { name: 'Soup of the day', price: 6 },
  toast: { name: 'Cheese on toast', price: 4 },
}
```

The whole game is one [state](/docs/reference/state) object, which is also the save. Stats are in `state.stats`, the kv store in `state.kv` and what the player holds in `state.held`. Content reads them with conditions, and only the game's own code and the UI read the object itself.

Data in `setup` that never changes is content, plain TypeScript beside the scenes. Several of something, each with numbers that change in play, are a kind and its [entities](/docs/reference/entities#kinddef):

```ts fragment
kinds: [{ id: 'dish', label: 'Dish', plural: 'Menu' }],
stats: [{ id: 'price', label: 'Price', of: 'dish', start: 4 }],
entities: [
  { id: 'soup', of: 'dish', name: 'Soup of the day', stats: { price: 6 } },
  { id: 'toast', of: 'dish', name: 'Cheese on toast', stats: { price: 4 } },
],
```

The same effects and conditions reach them with `of`, such as `{ stat: 'price', by: 1, of: 'dish:soup' }`. The save keeps what play changes about entities, content can create and remove them in play, and the checker knows their kinds and stats.

### `StoryInterface`, `PassageHeader` and the UI bar

SugarCube renders the UI bar, and its special passages add to it or replace it. The engine renders nothing and lists what to show in its [view](/docs/reference/view), so the page is the UI's. With the `vanilla` and `vue` templates the page is yours ([Start your own UI](/docs/how-to/render/start)). The [React UI](/docs/reference/react) is the ready-made one, and its layout in `src/layout.tsx` places the parts of the screen:

| SugarCube | IFLoom |
|---|---|
| StoryCaption | A part in the React UI's `Sidebar`, such as `StatList`, or a component of your own beside it. |
| StoryMenu | The player's menu, `GameMenu`. |
| PassageHeader and PassageFooter | Parts above and below `Scene` in the `Story`. |
| The title and start screen | The React UI's pages, turned on with `pages` ([Add a title screen](/docs/how-to/add-a-title-screen)). |
| StoryInterface | A layout of your own ([Rearrange or replace the React UI's parts](/docs/how-to/react/replace-parts)), or another template. |

[Arrange the layout](/docs/how-to/arrange-the-layout) moves the parts in each template.

### The `Setting` API

```js
Setting.addToggle('hints', { label: 'Show hints', default: true })
// in a passage: <<if settings.hints>>…<</if>>
```

Content declares [settings](/docs/reference/settings) on the game, and the React UI renders a settings page from them. A `play` setting is part of the game, and conditions read it. A `ui` setting changes only how the game looks, so the player's profile keeps it and the state never does:

```ts fragment
settings: [
  { id: 'hints', label: 'Show hints', type: 'toggle', default: true },
  { id: 'textSize', label: 'Text size', type: 'choice', affects: 'ui', options: [{ value: 'small', label: 'Small' }, { value: 'large', label: 'Large' }], default: 'small' },
],
```

```ts
import { text } from '@ifloom/engine'

export const hint = text('The board above the till has today’s specials.', { when: { setting: 'hints' } })
```

### Old saves, `Config.saves` and `Save.onLoad`

```js
Config.saves.version = 2
Save.onLoad.add(function (save) {
  /* rename $money to $coins in each moment of the save's history */
})
```

A game gives its base a `version` and a step in its rules' [`migrations`](/docs/reference/rules#migrations) for each version that needs one. A step takes a save's state and returns the new one, and the engine runs every step from the save's version up to the game's when the save loads:

```ts
import { loadGame, type GameRules } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { cafe } from './story/cafe.ts'

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

[Migrate your saves](/docs/upgrading/migrate-your-saves) writes and tests a step. Saving needs no setup. [`mountGame`](/docs/reference/react#mountgame) keeps saves in the browser's `localStorage`, autosaves each turn and undoes 50 steps back, and its `runner` option takes [`RunnerOptions`](/docs/reference/runner#runneroptions) to change that. What should outlive a save, such as the player's settings, goes in the [profile](/docs/reference/profile).

`Config.saves.isAllowed` is the content's [`saveable`](/docs/reference/game#saveable), a list of conditions with the reason the player reads. The engine refuses a save while one holds, the React UI greys its Save button out with the reason, and the runner skips its autosave:

```ts
import type { Content } from '@ifloom/engine'

export const cafe: Content = {
  saveable: [{ when: { not: { kv: 'playerName' } }, reason: 'Type your name first.' }],
}
```

### `<<audio>>`

```html
<<cacheaudio "calm" "music/calm.ogg">>
<<audio "calm" play loop>>
<<audio ":all" stop>>
```

Content declares each track once in `audio`, on a channel. A scene names what plays on each background channel while it's open, and effects play a sound or change the music:

```ts fragment
audio: {
  tracks: {
    calm: { src: 'music/calm.ogg', channel: 'music' },
    'cafe.murmur': { src: 'cafe-murmur.ogg', channel: 'ambience' },
    bell: { src: 'door-bell.ogg' },
  },
  default: { music: 'calm' },
},
```

```ts fragment
{ id: 'cafe', audio: { ambience: 'cafe.murmur' }, body: [text('The café hums.')], choices: [] }
{ sound: 'bell' }
{ audio: 'music', to: null }
```

The engine works out what should play, and the [audio player](/docs/reference/browser/audio-player) plays it. See [Audio](/docs/reference/audio).

### Images and video

```html
[img[The café at opening time|images/cafe.jpg]]
<video src="clips/kettle.mp4" autoplay loop muted></video>
```

Prose can't hold HTML, so a picture or a clip is markup on a paragraph of its own:

```md
[[wide:scene/cafe|The café at opening time]]

[[video:clips/kettle|A kettle coming to the boil]]
```

A path without an extension is a `.jpg`, or an `.mp4` for a video, under `public/art/`, and `ifloom check` reports a file that isn't there. A video plays like a GIF unless markup adds flags such as `controls` or `sound`. See [Markup](/docs/reference/prose#markup) for pictures, video, speech and the rest, and [Media](/docs/reference/media) for pools of pictures picked by tags.

### `random()` and `either()`

```html
<<set _cake to either("lemon", "carrot", "walnut")>>
Today's cake is _cake.
<<if random(1, 4) is 1>>A cat is asleep on the window seat.<</if>>
```

IFLoom has no runtime randomness. The engine works every draw out from the save's seed and a name, so the same save on the same turn always draws the same. The jobs of `either()` fit three tools:

- **A line that varies** is a set of variants. Each time the block shows, it draws a member, and it rotates so the player doesn't read the same line twice running.
- **A scene that may happen** is a [storylet](/docs/reference/storylets), a scene drawn from a set by weight among those whose `when` holds.
- **A value worked out in code** uses [`drawOne`, `draw`, `chance` or `weighted`](/docs/reference/random), with the seed, the turn and a name for the draw.

This storylet and the effect that draws from its set give the café a window seat:

```ts
import { text, type DataScene, type Effect } from '@ifloom/engine'

export const windowSeat: DataScene = {
  id: 'cafe.window',
  drawnFrom: ['cafe'],
  weight: 3,
  when: { not: { seen: 'cafe.window' } },
  body: [text('You take the stool by the window.')],
  choices: [{ id: 'leave', label: 'Finish your cup', effects: [{ scene: null }] }],
}

export const sit: Effect = { scene: { from: 'cafe', otherwise: 'cafe.quiet' } }
```

This value draws today's cake, which prose prints as `{{cake}}`:

```ts
import { drawOne, type GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  values: { cake: (state) => drawOne(['lemon', 'carrot', 'walnut'], state.seed, state.turn, 'cafe.cake') },
}
```

Reloading or undoing draws the same cake, so the player can't draw again by reloading, and a playtest gives the same result every run.

### `<<timed>>`

```html
The kettle starts to rattle.
<<timed 3s>>It clicks off. Time to pour.<</timed>>
```

The engine has no clock that runs by itself. A countdown with something for the player to do is a [timer](/docs/reference/timers) or a [minigame](/docs/reference/minigames), a small game inside the story with states, inputs and timers. This one waits three seconds for the kettle, unless the player pours early:

```ts fragment
minigames: [
  {
    id: 'kettle',
    title: 'The kettle',
    start: 'boiling',
    states: {
      boiling: { label: 'The kettle is coming to the boil.', after: { ms: 3000, go: 'boiled' }, on: [{ input: 'pour', go: 'early' }] },
      boiled: { final: { effects: [{ scene: 'kettle.done' }] } },
      early: { final: { effects: [{ scene: 'kettle.weak' }] } },
    },
  },
],
```

A scene with `minigame: 'kettle'` starts it when the player enters. A `<<timed>>` that only reveals text after a pause, with nothing for the player to do, is a block with a [presentation hint](/docs/reference/ui-hints), in the React UI `ui: { reveal: { delay: 1500 } }`. Nothing in the game waits, so a test or a replay sees the text at once.

### A life sim's clock, day's end and game over

A SugarCube life sim keeps `$time` and `$weekday` itself, moves them on with a widget, and runs a long day-shift widget when the player sleeps. Each of those maps to a part of IFLoom:

| SugarCube | IFLoom |
|---|---|
| `$time` as a number of periods, `$weekday`, `$gameDay` | The [calendar plugin](/docs/reference/plugins/calendar), with the game's periods, such as `calendar({ periods: [{ id: 'early', label: 'early morning' }, ...] })`. Conditions test them with `calendar.period('evening')` and `calendar.weekday(5, 6)`. |
| A link that costs time, `<<set $time += 2>>` | `calendar.pass(2)` in the choice's or action's effects. The button shows `until noon` by itself. |
| "Too late" once `$time` reaches night | The calendar's curfew, and `blocked` entries such as `{ when: calendar.period('night'), reason: 'Too late for that.' }`. |
| A Sleep passage that works only late | The calendar's `calendar.sleep()` command, with `sleep: { from: ['evening', 'night'] }`. |
| A day-shift widget for payday, rent, decay, mood and the morning passage | [`rules.onTurn`](/docs/reference/rules#onturn), which runs once a day and applies effects in the order written ([Run code at the end of a turn](/docs/how-to/run-code-at-the-end-of-a-turn)). |
| Per-day flags reset in the widget, `<<set $talkedToday to false>>` | The content's [`resets`](/docs/reference/rules#resets), such as `resets: { talkedToday: false }`. |
| Opening hours, `<<if $weekday lte 5 and $time lte 1>>[[Office]]<</if>>` | A location's `blocked` entries, which keep the exit on screen, greyed out with the reason ([Add a location](/docs/how-to/add-a-location)). |
| Where someone is, `$ava.location` set by a schedule widget | A [cast](/docs/reference/plugins/cast) character's `schedule` ([Add a character with a schedule](/docs/how-to/add-a-character)). |
| Warnings in StoryCaption, such as "Rent due tomorrow" | Blocks with a `when` in each location's body. |
| One-off feedback, "You got paid" | A [notice](/docs/reference/notices) from the `notify` effect. |
| `<<goto "Game Over">>` | A scene with a Play again choice or no choices ([End the game](/docs/how-to/end-the-game)). |
| `Engine.restart()` | A choice that sends [`{ type: 'newGame' }`](/docs/reference/commands#newgame). The runner starts a new game and keeps the player's settings. |

A day-shift widget changes variables one after another, and each line sees the last. `rules.onTurn` works the same way, since each `apply` runs on the state the one before it left, so the rent can come out of the wages just paid. [Run things each day](/docs/how-to/schedule-daily-work) has cooldowns, new-day work and pay.

## Harlowe

Harlowe's macros map to the same places as SugarCube's.

| Harlowe | IFLoom |
|---|---|
| `(set: $coins to it + 2)` | `{ stat: 'coins', by: 2 }`, an [effect](/docs/reference/effects) on a choice. |
| `(set: $metAva to true)` | `{ kv: 'metAva', to: true }`. |
| `(if: $coins >= 3)[…](else:)[…]` | A [`cases`](/docs/reference/flows#cases) block, one block with `when: { stat: 'coins', gte: 3 }` and then one with no `when` for the else. On a choice, it's `when` or `blocked`. |
| `(print: $name)`, `$name` in a passage | A [token](/docs/reference/prose#tokens), `{{name}}`. |
| `(if:)` in the middle of a sentence | A [phrase](/docs/reference/phrases), printed as `{{outfit.verdict}}`. |
| `(link-goto: "Go to the café", "Cafe")` | A choice with `{ scene: 'cafe' }` and `label: 'Go to the café'`. |
| `(go-to: "Cafe")` | The `scene` effect, on a choice or a [trigger](/docs/reference/triggers). |
| `(display: "Menu")` | A line kept by key in `prose`, such as `cafe.menu`, read with `{ prose: 'cafe.menu' }` in each scene that shows it. |
| `(either: "rain", "sun")` | A [variants](/docs/reference/prose#variantmember) block, or [`drawOne`](/docs/reference/random#drawone) in a value of the game's own. |
| `(random: 1, 6)` | A [`roll`](/docs/reference/rolls) effect, `roll` on the [context](/docs/reference/custom#customcontext) of the game's own code, or `{ kv: key, of: 'minigame', random: [1, 6] }` in a minigame. |
| `(dm: "name", "Soup", "price", 6)` | An [entity](/docs/reference/entities) of a declared kind, with its own stats and kv store. |
| `(a: "lemon", "carrot")` | A plain TypeScript array in content, or things the player holds when they gather them ([Give the player things to hold and use](/docs/how-to/give-the-player-things)). |
| `\|order>[…]` with `(replace: ?order)[…]` | A choice that stays on the scene and sets a kv key, and a block whose `when` reads it. |
| `(live: 2s)[…]` | A [timer](/docs/reference/timers), or a [minigame](/docs/reference/minigames)'s. |
| `(dialog: "The café is closing.")` | A [notice](/docs/reference/notices) from the `notify` effect, or a scene with one choice for a message the player must acknowledge. |
| `(save-game: "Slot A")` | The React UI's save menu, or [`runner.save('a')`](/docs/reference/runner#save-load-and-restore). |

Harlowe changes parts of a passage in place with hooks. IFLoom renders the whole scene again from the state after every choice, so a choice changes the state and the blocks follow:

```html
|order>[Ava waits for your order.]
(link: "Ask for the usual")[(replace: ?order)[Ava is already reaching for your cup.]]
```

```ts fragment
{
  id: 'cafe',
  body: [
    text('Ava waits for your order.', { when: { not: { kv: 'askedUsual' } } }),
    text('Ava is already reaching for your cup.', { when: { kv: 'askedUsual' } }),
  ],
  choices: [{ id: 'usual', label: 'Ask for the usual', when: { not: { kv: 'askedUsual' } }, effects: [{ kv: 'askedUsual', to: true }] }],
}
```

A datamap that holds one of several things with numbers that change, such as a dish on a menu, becomes an entity whose fields are stats and kv keys. A datamap that never changes is plain TypeScript in content. A notice is news shown beside the story, not a box the player must close, so `(dialog:)` maps to one only loosely.
