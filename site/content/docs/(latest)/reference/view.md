---
title: "The view"
description: "What view() hands a UI: the scene and its beats, choices and buttons with prices and reasons, stats, notices and plugins' parts."
---
The engine has no UI of its own. It hands your UI one object, a `View`, that says everything there is to draw, and takes back [commands](/docs/reference/commands). A UI's loop is:

1. `const shown = view(state, game)`
2. Draw `shown`.
3. When the player presses something, send the `command` on it: `state = apply(state, game, command).state`.
4. Go to 1.

Every button in a `View` already carries its command and its price. If it can't be pressed, it also carries the reason, worded for the player. The reducer refuses with the same reasons, so the screen and the rules can't disagree. Show greyed-out buttons with their reason rather than hiding them.

Any framework can draw from the view, or none at all. [The React UI](/docs/react), `@ifloom/react`, is a ready-made one that draws all of this. To use something else, such as Vue, Svelte or plain DOM, see [Your own UI in any framework](/docs/guide/frameworks). The rest of this page is for writing your own.

```ts
import { renderAction, screen, view, type View } from '@ifloom/engine'
```

## view

```ts
function view(state: GameState, game: Game, options?: ViewOptions): View
```

Builds the whole `View` from the state in one pass. It's pure, and cheap enough to call after every command. It's built from [`screen`](#screen), so the open scene is rendered once per call, however many choices it has.

`options` is a [`ViewOptions`](#viewoptions). You rarely pass it yourself: the [runner](/docs/reference/runner#the-view-cache) does, so that plugins' views can show what the player's profile holds. Called with only the state and the game, no plugin's view sees the profile.

```ts
import { view } from '@ifloom/engine'

const shown = view(state, game)
header.textContent = shown.when ?? shown.title   // 'Day 1 · Monday morning · High Street' with the calendar and places
for (const action of shown.actions) addButton(action.label, action.disabled, action.command)
```

## screen

```ts
function screen(state: GameState, game: Game, options?: ViewOptions): Screen
```

What one state shows, before it's formatted as a `View`. `view` is built from it, and the reducer reads it after each command to record pool picks and what each audio channel started playing. It renders the open scene once and answers every choice's availability, effects and price from that one render.

`view` is what every UI draws. It holds only what the player may see, already worded and formatted: labels, prices, reasons and stat text. `screen` is the layer under it. It keeps what a UI shouldn't show, such as what each choice would apply, and the bookkeeping the engine records after a command. Most code never calls it.

### Why there are two

They answer different questions about the same state.

- **The view is a contract with the UI.** Anything in it can go on the page, so it never carries a spoiler like a choice's hidden effects. A UI in any framework can draw it without knowing the rules, and the [React UI](/docs/react), the templates and your own UI all read the same thing.
- **The screen is what the engine works from.** The reducer needs to know which pool files and tracks the new state shows, so that it can record them. Choices' effects feed locks, guards and prices. Working those out means rendering the open scene, and doing that a second time could give a different answer.

So the engine draws each state once, as a screen, and the view is formatted from it. Neither can disagree with the other, and a command never renders a scene more than once.

Use `view` to draw a game. Reach for `screen` when you need something the view leaves out:

- **What each choice would apply.** A UI that previews a choice's outcome, or a tool that maps where choices lead, reads `choices[i].effects`.
- **The picks and tracks.** A plugin or a tool that wants to know which pool files a state shows, or which track each channel resolves to, reads `picks` and `audio.tracks`.

```ts
import { screen } from '@ifloom/engine'

const shown = screen(state, game)
for (const choice of shown.choices) {
  const spends = choice.effects.filter((effect) => effect.kind === 'stat' && effect.by < 0)
  console.log(choice.label, choice.disabled ?? 'open', spends.length ? 'costs something' : '')
}
```

It's pure, like `view`. It builds the plugins' views too, so it costs about as much as `view` does. `options` is the same as `view`'s. The reducer never passes it, so what it records never depends on the profile.

### ViewOptions

```ts
type ViewOptions = { profile?: Readonly<Record<string, unknown>> }
```

What a view or a screen is drawn with besides the state. `profile` is what the player's [profile](/docs/reference/profile) holds, by namespace. Each plugin's view is handed only its own namespace, as [`context.profile`](/docs/reference/plugins#plugincontext). A runner with a profile passes it for you.

```ts
import { view } from '@ifloom/engine'

// What a runner does: the plugins' views see what's stored under their ids.
const shown = view(state, game, { profile: { achievements: { earned: ['regular'] } } })
```

**Gotcha.** A pool pick a plugin's view makes must not depend on the profile. The reducer records picks from a screen built without it, so a pick that only the profile chose would change on the next visit.

### Screen

```ts
type Screen = {
  scene: ScreenScene
  choices: ScreenChoice[]
  actions: ScreenChoice[]
  stage: StageView | null
  plugins: Record<string, unknown>
  picks: Record<string, string>
  audio: AudioView & { tracks: Record<string, string | null> }
}

type ScreenChoice = RenderedChoice & { effects: Effect[] }

type ScreenScene = {
  id: string | null
  key: string
  title: string
  body: string
  beats: SceneBeat[]
  tags: string[]
  panel: string | null
  panelData: unknown
  speaker: SpeakerView | null
  stageImage: string | null
  ui?: Ui<SceneUi>
}
```

| Field | Meaning |
|---|---|
| `scene` | The open scene as rendered, or the room when none is open. The same fields as [`view.scene`](#the-scene) without `stage` and `choices`. While a [minigame](#minigame) runs, it's drawn over either. |
| `choices` | The open scene's visible choices, except those its prose draws inline. Each is a [`RenderedChoice`](#renderedchoice) with `effects`: what choosing it would apply. Empty for the room, and while a minigame runs. |
| `actions` | The room's buttons while no scene or minigame is open, except those its prose draws inline, as [`view.actions`](#the-idle-screen), each with the effects its command would apply (see [`effectsOf`](/docs/reference/actions#effectsof)). |
| `stage` | The open scene's stage, resolved as [`stageView`](#stageview) does. `null` for the room, and while a minigame runs. |
| `plugins` | Every plugin's view, by plugin id, as [`view.plugins`](#plugins). |
| `picks` | The [pool picks](/docs/reference/media#remembered-picks) this state shows that `state.media.picks` doesn't hold yet, by pick key. The reducer records them. Empty once they're recorded. |
| `audio` | [`view.audio`](#audio), plus `tracks`: the track each background channel resolves to, or `null` for silence. The reducer records a channel's track as started when it changes. |

`view` drops `effects` from each choice, `tracks` from the audio and `picks` altogether. Everything else it takes as it is.

## View

`View` has a fixed set of fields, plus [`plugins`](#plugins), where each plugin adds its own slice. What the player wears, for example, is the [wardrobe plugin](/docs/plugins/wardrobe)'s slice. The engine has no phone of its own, but it has the parts one is built from: the [things you hold](#held), such as notes and photos, [notices](#notices) and [inputs](#inputs). [Messages](/docs/plugins/messages), [feeds](/docs/plugins/feed) and [devices](/docs/plugins/devices) are plugins, each with its own slice, and the [phone bundle](/docs/plugins/phone) wires them together.

### The clock and the player

| Field | Type | Meaning |
|---|---|---|
| `title` | `string` | The game's `title`. |
| `phase` | `string` | The stretch of the game the player is in. |
| `turn` | `number` | How many [turns](/docs/reference/state#turn) have passed. It's `0` on the first turn, not one-based. |
| `when` | `string \| null` | When and where the game is, in plugins' words. It's every plugin's [`label`](/docs/reference/plugins#labels), in the order `game.plugins` lists them, joined with ` · `, such as `'Day 3 · Wednesday morning · The Corner Café'` from the [calendar](/docs/plugins/calendar#the-label) and then the [places plugin](/docs/plugins/places#the-label). `null` when no plugin gives one. |

The engine keeps no time of day, so the view has no day or period of its own. In a game with the [calendar plugin](/docs/plugins/calendar), the day, weekday, period and whether it's time for bed are at `view.plugins.calendar`, a [`CalendarView`](/docs/plugins/calendar#calendarview), and its words are in `when`.

The view has no player name, because the engine doesn't keep one. A game that asks for a name keeps it in the [kv store](/docs/reference/state#kv). Read it from `state.kv.playerName`, or print it in prose with `{{playerName}}`.

### The idle screen

While no scene is open, the screen is the idle screen. It shows the [stage](#the-scene) in `scene`, and the buttons here.

| Field | Type | Meaning |
|---|---|---|
| `actions` | [`RenderedChoice[]`](#renderedchoice) | What the player can do. |

`actions` is empty while a scene or a [minigame](#minigame) is open, or while a [lock](/docs/reference/locks) that stops everything is on. Then the player can only move through the scene.

A button the room's prose draws inline with `[[act:id]]` is left out of `actions`, and is in `scene.beats` instead (see [inline actions](/docs/reference/prose#inline-actions-and-tooltips)).

Otherwise `actions` is every plugin's [`buttons`](/docs/reference/plugins#buttons), in the order `game.plugins` lists them, then the game's own [`actions`](/docs/reference/game#game). A button is left out while its `when` doesn't hold, or while a [lock](/docs/reference/locks) with `hide: true` stops its command. All of them are drawn alike, with [`renderAction`](#renderaction). The engine adds none of its own, so the showcase declares its Wait a while button in `game.actions`.

The engine keeps no places, so the view has no location or exits of its own. With the [places plugin](/docs/plugins/places), the room is at `view.plugins.places`, a [`PlacesView`](/docs/plugins/places#placesview), with its `location` and its `exits`. Each exit is an [`ExitView`](/docs/plugins/places#exitview) carrying the command that takes it. The room's own actions are the plugin's buttons, so they come first in `actions`. Its name is in `when`, and its description is the stage.

```ts
import type { PlacesView } from '@ifloom/plugin-places'

const room = shown.plugins.places as PlacesView | undefined
for (const exit of room?.exits ?? []) addButton(exit.label, exit.disabled, exit.command)
```

The engine keeps no characters either, so the view has no people of its own. With the [cast plugin](/docs/plugins/cast), who's in the room is at `view.plugins.cast`, a [`CastView`](/docs/plugins/cast#castview). Each of its `present` is a [`PersonView`](/docs/plugins/cast#personview) with a Talk button in its `actions`. Like the view's `actions`, these are empty while a scene is open or a lock stops everything.

```ts
import type { CastView } from '@ifloom/plugin-cast'

const people = (shown.plugins.cast as CastView | undefined)?.present ?? []
for (const person of people) for (const talk of person.actions) addButton(`${person.name}: ${talk.label}`, talk.disabled, talk.command)
```

### The scene

`scene` is what fills the main column. With a scene open, it's that scene's render. Without one, it's the stage: `id: null`, no choices, and a title and body from the first plugin whose [`stage`](/docs/reference/plugins#stage) answers. The stage's `body` blocks go through the same [renderer](/docs/reference/scenes#renderscene) as a data scene, with the game's prose. The [places plugin](/docs/plugins/places#the-stage)'s stage is the room the player is in, with its name as the title. With no plugin answering, the title is the game's `title` and the body is empty.

| Field | Type | Meaning |
|---|---|---|
| `id` | `string \| null` | The scene, or `null` for the stage. |
| `key` | `string` | Which screen this is: `scene:<id>` while a scene is open, `minigame:<id>` while a [minigame](#minigame) runs, `room:<id>` for a plugin's stage (a place, with the places plugin), and `room` with none. It changes when the screen does, and only then, so a UI keys an animation or moves focus by it. A choice that keeps the same scene open keeps the key. |
| `title` | `string` | The title in the scene's rendered [`SceneView`](/docs/reference/scenes#sceneview), else the scene's own, else the title of a plugin's [stage](/docs/reference/plugins#stage) (the room's name, with the places plugin), else the game's `title`. |
| `body` | `string` | The raw prose, with its markup. In-place `{ media }` blocks are in it as markup, and `@pool` markup is already resolved to files. |
| `beats` | [`SceneBeat[]`](/docs/reference/prose#scenebeat) | The prose parsed, with the scene's pictures and videos in place and pool markup resolved to files. Draw these, not `body`. |
| `tags` | `string[]` | The render's `tags`, else the scene's, else `[]`. The engine gives them no meaning, so style the scene by them. The stage has none. |
| `panel` | `string \| null` | A bespoke panel to draw instead of the choice list. |
| `panelData` | `unknown` | What that panel needs. Opaque to the engine. |
| `speaker` | [`SpeakerView`](#speakerview) ` \| null` | Who's talking. The id is the render's `speaker`, else the scene's, and the first plugin whose [`speaker`](/docs/reference/plugins#speakers) knows it says who it is (the [cast](/docs/plugins/cast#speakers) does for its characters). `null` otherwise. Never guessed from the scene's id. |
| `stageImage` | `string \| null` | The big picture: the render's `portrait`, else the speaker's portrait, else `null`. |
| `stage` | [`StageView`](/docs/reference/media#stageview) ` \| null` | The scene's [layered picture and hotspots](/docs/reference/scenes#the-stage), resolved by [`stageView`](#stageview). `null` when the scene has none, and on the idle screen (a place's stage is in its [plugin view](/docs/plugins/places#placesview)). |
| `choices` | [`RenderedChoice[]`](#renderedchoice) | The visible choices. Hidden ones (`visible: false`) are left out, and disabled ones stay. So are the ones the prose draws inline with `[[act:id]]`: those are in `beats`, as `action` [spans](/docs/reference/prose#inlinespan). |
| `ui` | `Ui<SceneUi>`, optional | The scene's [presentation hints](/docs/reference/ui-hints) as written, or the room's (a place's) while no scene is open. Left out when there are none, and while a minigame runs. The engine gives them no meaning. |

If `state.sceneId` names a scene the game doesn't have, the scene reads "The moment has passed." under the stage's title (else the game's), with one choice, Look around, which sends `leave`. Both lines are in the [strings table](/docs/reference/strings#buttons-and-labels), as `momentPassed` and `lookAround`.

`inScene` (`boolean`) is `true` whenever a scene is open.

While a [minigame](#minigame) runs, `scene` is drawn over: its `title` is the minigame's `label` (else the scene's or the stage's title), its `body` and `beats` are the running state's `label` rendered as prose, and `panel` and `panelData` are `null`. Its `id` and the rest stay those of the scene or the stage underneath. `choices` is empty and `stage` is `null`.

### The player's numbers and things

| Field | Type | Meaning |
|---|---|---|
| `stats` | [`StatView[]`](#statview) | The player's [declared stats](/docs/reference/stats) that are `listed` and whose `visible` condition holds, in declaration order. A stat declared `of` a kind belongs to an entity, and is in [`entities`](#entities) instead. |
| `statsById` | `Record<string, `[`StatView`](#statview)`>` | Every one of the player's declared stats, by id, listed or not and visible or not. Read a purse or a gauge your UI draws its own way from here, such as `shown.statsById.coins.text`. |

What the player carries is in [`held`](#held). The [inventory plugin](/docs/plugins/inventory)'s slice adds a button to use each thing that can be used.

### entities

| Field | Type | Meaning |
|---|---|---|
| `entities` | `Record<string, `[`EntitiesView`](#entitiesview-and-entityview)`>` | Every [listed](/docs/reference/entities#listing) [kind](/docs/reference/entities), by id, with the entities whose `listed` and `visible` hold, declared ones first, and the stats the player can see on each. A listed kind with none to show is there, with no entries. A kind whose `listed` is `false` isn't here, and neither are a plugin's kinds unless the plugin lists them. |

```ts
const { staff } = view(state, game).entities
staff.plural                                   // 'Staff'
staff.entries.map((entry) => entry.name)       // ['Ana', 'Dev'], once Dev is hired
staff.entries[0].stats.map((stat) => stat.text) // ['5', '60', '£12']
```

### held

| Field | Type | Meaning |
|---|---|---|
| `held` | [`HeldView[]`](#heldview) | What you [hold](/docs/reference/entities#holding-things): what the [protagonist](/docs/reference/entities#protagonists-you-and-player) being played holds, then what the player holds. With nobody played, just the player's. Things held by nobody else are never here, so it gives nothing away. |

```ts
view(state, game).held.map((thing) => `${thing.name} ×${thing.count}`)   // ['Apple ×2', 'A red scarf ×1']
```

### notices

| Field | Type | Meaning |
|---|---|---|
| `notices` | [`NoticesView`](#noticesview-and-noticeview) | The [notices](/docs/reference/notices) not yet dismissed, newest first, and how many each tag has, for badges. |

```ts
const { unseen, byTag } = shown.notices
postBadge.textContent = String(byTag.post ?? 0)
if (unseen[0]) toast(unseen[0].title, unseen[0].text)
```

### inputs

| Field | Type | Meaning |
|---|---|---|
| `inputs` | `Record<string, `[`InputView`](#inputview)`>` | The [inputs](/docs/reference/inputs) on offer now (those whose `when` holds), by id, each with the value its kv key holds. |

### settings

| Field | Type | Meaning |
|---|---|---|
| `settings` | [`SettingView`](#settingview)`[]` | Every [setting](/docs/reference/settings) the game declares, in order, `play` and `ui` alike. Empty when it declares none. |

That's enough to draw a whole settings screen from the view. See [`SettingView`](#settingview) for where each value comes from.

### minigame

| Field | Type | Meaning |
|---|---|---|
| `minigame` | [`MinigameView`](/docs/reference/minigames#minigameview) ` \| null` | The [minigame](/docs/reference/minigames) being played, with its state, its words, the time left on its timer, the live inputs, its variables and its keys. `null` when none runs. |

```ts
const game = shown.minigame
if (game) {
  drawText(game.label ?? '')
  if (game.timeTotal) drawCountdown(game.timeLeft! / game.timeTotal)
  for (const input of game.inputs) addButton(input, () => send({ type: 'minigame', input }))
}
```

While it runs, send `{ type: 'tick', ms }` about every 100 ms when `timeLeft` isn't `null`. The React UI draws it with [`MinigameCard`](/docs/react/components#minigamecard) and runs the clock for you.

### audio

| Field | Type | Meaning |
|---|---|---|
| `audio` | [`AudioView`](/docs/reference/audio#audioview) | What should be playing on each [channel](/docs/reference/audio#channels), and the one-shot sounds that are due. Empty (`{ channels: {}, cues: [], muteSetting: null }`) when the game has no `audio`. |

Each background channel has already been chosen by priority: the open scene, then an effect, then a plugin such as the place, then the game's default. Each cue has a key that stays the same across view calls and reloads, so a player plays it once:

```ts
const { channels, cues, muteSetting } = shown.audio
channels.ambience.src      // 'audio/cafe-murmur.ogg' at the café
channels.music.volumeSetting  // 'musicVolume': read its value from the profile
cues.map((cue) => cue.key) // ['scene:1234:3:1:knock']
```

The engine never reads the [profile](/docs/reference/profile), so the view gives the setting ids (`volumeSetting` on each channel, and `muteSetting`) and the player reads their values. [`@ifloom/audio`](/docs/browser/audio-player) does all of this. See [Audio](/docs/reference/audio).

### panel

| Field | Type | Meaning |
|---|---|---|
| `panel` | [`OpenPanel`](/docs/reference/panels#openpanel) ` \| null` | The [panel](/docs/reference/panels) content opened, by name, with what it was opened with. `null` when none is open. |

Draw it over everything else by its name, and send `{ type: 'closePanel' }` when the player closes it. See [Drawing a panel](/docs/reference/panels#drawing-a-panel). The React UI draws it with [`PanelHost`](/docs/react/components#panelhost).

### rolls

| Field | Type | Meaning |
|---|---|---|
| `rolls` | [`Roll`](/docs/reference/rolls#roll)`[]` | The [rolls](/docs/reference/effects#roll) the last command made, in order. Empty when it made none. |

Each roll is what happened and nothing more: the key, the dice (`'2d6'`), the face each die showed, what was added, the total, and with a target, the target and whether it passed. A roll made by a [trigger](/docs/reference/triggers) or a plugin's hook in the same command is there too. Use it to show the dice as they land. The next command clears it, so a UI animates a roll once.

```ts
const shown = runner.view()
for (const roll of shown.rolls) {
  const outcome = roll.against === undefined ? '' : roll.passed ? ' (passed)' : ' (failed)'
  log(`${roll.dice}: ${roll.faces.join(' + ')}${roll.plus ? ` + ${roll.plus}` : ''} = ${roll.total}${outcome}`)
}
```

The React UI draws a roll with [`DiceRoll`](/docs/react/components#diceroll), in the story where a block's [`dice`](/docs/react/hints#dice) hint names it. The [Dice rolls and checks](/docs/recipes/dice) recipe shows the same with other frameworks.

### timers

| Field | Type | Meaning |
|---|---|---|
| `timers` | [`TimerView`](/docs/reference/timers#timerview)`[]` | The running [timers](/docs/reference/timers), in the order they started: each one's `id`, `label` (or `null`), the milliseconds `left` and its `total` length. Empty when none runs. |

It never says what a timer does when it runs out, so it's safe to show. Draw a countdown from `left / total`, and send `{ type: 'tick', ms }` about every 100 ms while it isn't empty, as [`startClock`](/docs/browser#startclock) does.

```ts
const shown = runner.view()
for (const timer of shown.timers) {
  drawCountdown(timer.label ?? timer.id, timer.left / timer.total, Math.ceil(timer.left / 1000))
}
```

A timer only shows in the view while it runs. Once it runs out or is stopped, it's gone, and nothing stays behind to draw. The React UI draws one with [`Countdown`](/docs/react/components#countdown), after a block whose [`timer`](/docs/react/hints#timer) hint names it. The [Timed choices and countdowns](/docs/recipes/timers) recipe shows the same with other frameworks.

### saving

| Field | Type | Meaning |
|---|---|---|
| `saving` | `SavingView` | Whether the player can save now, by the game's [`saveable`](/docs/reference/game#saveable). |

```ts
type SavingView = {
  allowed: boolean        // false while a `saveable` entry holds
  reason: string | null   // that entry's reason, or null when allowed
  visible: boolean        // false while that entry has `hide`
}
```

Grey out your Save button with `reason` while `allowed` is `false`, and leave it off while `visible` is `false`. [`runner.save`](/docs/reference/runner#the-runners-members) refuses with the same reason, so the view only saves the player a press. Loading is always allowed.

```ts tab="Plain JS" tab-group="framework"
// src/main.ts, in the vanilla template: in draw(view), for the side column
const { allowed, reason, visible } = view.saving
if (visible) {
  const save = add(sidebar, 'button', 'Save')
  save.disabled = !allowed
  if (reason) {
    save.title = reason
    add(sidebar, 'p', reason, 'reason')
  }
  save.onclick = () => runner.save('quick')
}
```

```tsx tab="React" tab-group="framework"
// The React UI's saves menu greys its Save buttons out for you. A button of your own:
import { useGame } from '@ifloom/react'

export function QuickSave() {
  const { runner, view } = useGame()
  const { allowed, reason, visible } = view.saving
  if (!visible) return null
  return (
    <>
      <button disabled={!allowed} title={reason ?? undefined} onClick={() => void runner.save('quick')}>Save</button>
      {reason ? <p className="reason">{reason}</p> : null}
    </>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Layout.vue, in the vue template: in the side column -->
<script setup lang="ts">
import { runner, view } from './runner.ts'
</script>

<template>
  <template v-if="view.saving.visible">
    <button :disabled="!view.saving.allowed" :title="view.saving.reason ?? undefined" @click="runner.save('quick')">Save</button>
    <p v-if="view.saving.reason" class="reason">{{ view.saving.reason }}</p>
  </template>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Layout.svelte, in the svelte template: in the side column -->
<script lang="ts">
  import { runner, view } from './runner.ts'
</script>

{#if $view.saving.visible}
  <button disabled={!$view.saving.allowed} title={$view.saving.reason ?? undefined} onclick={() => runner.save('quick')}>Save</button>
  {#if $view.saving.reason}<p class="reason">{$view.saving.reason}</p>{/if}
{/if}
```

The vanilla, Vue and Svelte templates have a Save and a Load button like these in a Saves section of the side column.

### plugins

| Field | Type | Meaning |
|---|---|---|
| `plugins` | `Record<string, unknown>` | What each [plugin](/docs/reference/plugins#the-view) gives the UI, by plugin id. A plugin without a `view` has no entry. |

The engine doesn't look inside a slice, so give it its type where you read it. A plugin package exports the type:

```ts
import type { QuestsView } from '@ifloom/plugin-quests'

const journal = shown.plugins.quests as QuestsView
badge.textContent = String(journal.updates)
```

Buttons for a plugin's commands are ordinary [actions](/docs/reference/actions#actiondef) carrying `{ type: 'custom', name }`. They're greyed out with the plugin's `whyNot` line, like any other. A plugin can offer them itself while no scene is open, with [`buttons`](/docs/reference/plugins#buttons).

## RenderedChoice

```ts
type RenderedChoice = {
  id: string
  label: string
  price?: Price
  disabled?: string
  tags?: string[]
  irreversible?: string
  warning?: string
  command: Command
  ui?: Ui<ChoiceUi>
}
```

Every pressable thing in a `View`: scene choices, the game's and plugins' buttons, the cast's Talk buttons, and the inline actions in a beat's [spans](/docs/reference/prose#inlinespan). Send `command` when it's pressed.

- **`disabled`** is the reason it can't be pressed. Show it.
- **`warning`** means the button can be pressed, but the reducer will refuse it with this line. It's a plugin [guard](/docs/reference/plugins#guards)'s soft refusal, such as the [calendar](/docs/plugins/calendar#the-guard)'s `That would run past dawn.` Show it and offer something else. It comes from [`warningOf`](/docs/reference/actions#warningof), on buttons and scene choices alike. The places plugin's exits carry one too, as [`ExitView.warning`](/docs/plugins/places#exitview). The engine sets no warnings of its own.
- **`irreversible`** is a warning to show before sending. The [React UI](/docs/react/components#choicebutton) prints it on the button.
- **`tags`** are a scene choice's [`tags`](/docs/reference/scenes#scenechoice), passed through as words to style or filter it by. The engine gives them no meaning, and other buttons have none.
- **`price`** is what pressing it will cost. See [Price](#price).
- **`ui`** is a scene choice's or an action's [presentation hints](/docs/reference/ui-hints), as written, such as the React UI's [`transition`](/docs/react/hints#transition-on-a-choice). Left out when there are none.

## inlineChoices

```ts
import { inlineChoices } from '@ifloom/engine'

function inlineChoices(beats: readonly SceneBeat[]): RenderedChoice[]
```

The choices or buttons a body's beats draw inline, in the order they come. With `view.scene.choices` (or `view.actions` in a room) it's everything the player can press on the screen, which a test, a bot or a text UI may want in one list.

```ts
const shown = view(state, game)
const all = [...inlineChoices(shown.scene.beats), ...shown.scene.choices]
```

## renderAction

```ts
function renderAction(state: GameState, game: Game, action: ActionDef): RenderedChoice
```

Turns an [action](/docs/reference/actions#actiondef) into a button, exactly as the view does for the idle screen's buttons. Use it in a [plugin](/docs/reference/plugins) that shows actions somewhere other than a room, such as an app on a device or a notice board. The button gets:

- its `label`
- a `price` from the activity's `cost`, if the action sends `{ type: 'activity' }`, plus any notes [plugins' prices](/docs/reference/plugins#prices) give for the command's effects
- `disabled` from the first `blocked` entry that holds, or else [`whyNot`](/docs/reference/actions#whynot) for its command
- `warning` from [`warningOf`](/docs/reference/actions#warningof)

```ts
import { renderAction } from '@ifloom/engine'
import { go } from '@ifloom/plugin-places'

// A "go to the café" button in a map app, pressed from the flat:
const button = renderAction(state, game, { id: 'cafe', label: 'Go to the café', command: go('cafe') })
button.disabled  // 'You cannot get there from here.'
```

**Gotcha.** It doesn't test the action's `when`. Leave out the actions whose `when` doesn't hold before rendering them, as the view does.

## stageView

```ts
import { stageView } from '@ifloom/engine'

function stageView(
  state: GameState,
  game: Game,
  stage: MediaStage | undefined,
  owner: string,
  choices?: readonly RenderedChoice[] | null,
  picks?: Record<string, string>,
): StageView | null
```

Resolves a [stage](/docs/reference/scenes#the-stage) into what a UI draws, as the view does for `view.scene.stage`. Use it in a plugin that has a stage of its own, as the [places plugin](/docs/plugins/places#placesview) does for a room.

- **Layers** whose `when` fails are left out. A pool layer gets its file from the [pool pick](/docs/reference/media#pools) for `owner` and the slot `stage:<index>`, and one whose pool has nothing is left out too.
- **A `choice` hotspot** takes the command, `disabled` and `warning` of the choice with that id in `choices`, and is left out when there's no such choice. Pass the scene's rendered choices. With none (`null`, the default), every choice hotspot is left out.
- **A `command` hotspot** is a button made by [`renderAction`](#renderaction). It's left out while a lock with `hide: true` stops its command.
- **Any hotspot** is left out while its `when` fails or its `layer` isn't shown.

It returns `null` when `stage` is undefined.

```ts
import { stageView } from '@ifloom/engine'

// The café's stage, as the places plugin draws it in its view:
const stage = stageView(state, game, cafe.stage, 'cafe', null, context.picks)
stage?.hotspots.find((hotspot) => hotspot.id === 'door')?.disabled  // 'Staff only.'
```

**Gotcha.** It never writes the state. A new pick is written into `picks` when you pass it, and the reducer records what's there after each command (see [Media](/docs/reference/media#remembered-picks)). In a plugin's [`view`](/docs/reference/plugins#the-view), pass your context's `picks`, or the stage's pool picks won't be kept.

## StatView

```ts
type StatView = {
  key: StatKey
  label: string
  value: number
  min: number
  max: number
  text: string
  level?: { level: number; next: number | null; progress: number }
  ui?: Ui<StatUi>
}
```

One stat as the UI shows it. `min` is the stat's declared `min`, or 0, so a UI can draw a bar from `min` to `max`. `ui` is the stat's [presentation hints](/docs/reference/ui-hints) as written, such as the React UI's [`display`](/docs/react/hints#display), and is left out when it has none. `value` is [`statValue`](/docs/reference/stats#statvalue), so a [derived stat](/docs/reference/stats#derived-stats) is already worked out, and a stat the save doesn't have yet shows its `start`. `max` is [`statMax`](/docs/reference/stats#statmax) right now, so a ceiling that names a custom value is already worked out. `text` is the value through the stat's [`format`](/docs/reference/stats#formatstat), such as `'12 coins'`.

`level` is only there for a stat that declares [`levels`](/docs/reference/stats#levels). It's what [`statLevel`](/docs/reference/stats#statlevel) gives:

| Field | What it is |
|---|---|
| `level` | The level the stat is at, from 0. |
| `next` | The value the next level starts at, or `null` at the top level. |
| `progress` | How far the value is from this level's start to `next`, from 0 to 1. It's 1 at the top level. Level 0 starts at the stat's `min`. |

```ts
// levels: { at: [10, 30, 60] }, cooking at 20
view(state, game).statsById.cooking.level // { level: 1, next: 30, progress: 0.5 }
```

An entity's stats in [`entities`](#entities) get `level` the same way, worked out for that entity.

```ts
const { energy } = view(state, game).statsById
drawGauge(energy.value / energy.max, energy.label)
```

**Gotcha:** `statsById` ignores `visible`, so a UI that draws a stat from it decides for itself when to show it.

## Price

```ts
type Price = {
  stats?: { id: string; amount: number; text: string }[]
  notes?: string[] // what plugins say it costs: '2 dishes to wash', 'until evening'
}
```

What pressing a button will cost, to show on it beforehand. A `price` sits on any [`RenderedChoice`](#renderedchoice).

Each entry in `stats` is a stat spent, its amount, and the amount written through the stat's `format`, such as `'3 coins'`. Only amounts above zero are listed.

- For an activity, the stats come from its `cost`, in the order the cost lists them.
- For a scene choice, they come from its effects. Each negative `stat` effect on one of the player's [spendable](/docs/reference/stats#statdef) stats counts, in declaration order. A `stat` effect with `of`, on an [entity](/docs/reference/entities)'s stat, never does.

`notes` are every plugin's [price](/docs/reference/plugins#prices) for the button's effects, in the order `game.plugins` lists them. Time passing, for example, is the [calendar](/docs/plugins/calendar#price-notes)'s note `until evening`. A button with notes and no cost has a price of only `{ notes }`, and a button with neither has no `price`.

**Gotcha:** it only shows costs. What a choice pays is deliberately left off, because a payout printed on a button tells the player which button is the right one.

## EntitiesView and EntityView

```ts
type EntitiesView = {
  label: string
  plural: string
  unique: boolean
  entries: EntityView[]
}

type EntityView = {
  id: string
  ref: string
  name: string
  desc: string | null
  image: string | null
  tags: string[]
  flags: Record<string, boolean>
  stats: StatView[]
  kv: Record<string, KvValue>
  ui?: Ui<EntityUi>
}
```

A [kind](/docs/reference/entities#kinddef) of entity as the UI draws it. It has the kind's `label`, its `plural` (the `label` if the kind declares none), its `unique` (`false` if left out), and an entry for each entity of that kind the view may show: the [listed](/docs/reference/entities#listing) ones whose `visible` holds, declared ones in content order, then those created in play.

| `EntityView` field | What it holds |
|---|---|
| `id` | Its id within the kind: `'ana'`, `'#1'`. |
| `ref` | How content names it, such as `'staff:ana'`. It's what an effect's `of` or an [`{ entity }`](/docs/reference/conditions#entity) condition takes. |
| `name` | Its name, with [prose tokens](/docs/reference/prose#tokens) filled in for this save. |
| `desc` | Its description, filled in the same way, or `null`. |
| `image` | Its picture's path through [`artSrc`](/docs/reference/prose#artsrc), or `null`. |
| `tags` | Its kind's tags, then its own. |
| `flags` | Each of its kind's [`flags`](/docs/reference/entities#listing), by name, and whether it holds for this entity. `{}` when the kind declares none. Use it to split a list, such as people you've met and people you haven't, without the engine hiding anything more. |
| `stats` | Its kind's `listed` stats whose `visible` holds with `'$'` bound to it, in the order the game declared them, as [`StatView`](#statview)s with its own values. |
| `kv` | Its kv store as it reads: its declaration's keys with what play set laid over them. |
| `ui` | Its [presentation hints](/docs/reference/ui-hints): its kind's with its own laid over them (see [`entityUi`](/docs/reference/ui-hints#entityui)). Left out when it has none. |

**Gotcha.** Each entity's `stats` is decided on its own, so two entries of one kind can show different stats. The [React UI](/docs/react/components#entitytable)'s table makes a column for every stat any row shows, and leaves the other rows' cells blank.

## HeldView

```ts
type HeldView = {
  ref: EntityRef
  name: string
  desc: string | null
  image: string | null
  tags: string[]
  count: number
  at: Holder
  ui?: Ui<EntityUi>
}
```

One thing in [`view.held`](#held). `ref` is how content names it. `name` and `desc` are filled in for this save, `image` is its picture through [`artSrc`](/docs/reference/prose#artsrc), and `tags` are its kind's then its own. All of them read through the entity it was made [like](/docs/reference/entities#things-made-like-another). `ui` is its [presentation hints](/docs/reference/ui-hints), as [`entityUi`](/docs/reference/ui-hints#entityui) gives them, and is left out when it has none. `count` is how many are held, and `at` who holds them: the protagonist's reference, or `'player'`. They come in the game's order of its entities, each holder's in turn. A thing whose `visible` doesn't hold is left out, but its kind's `listed` doesn't matter here.

## NoticesView and NoticeView

```ts
type NoticesView = {
  unseen: NoticeView[]
  byTag: Record<string, number>
}

type NoticeView = {
  id: string
  title: string
  text: string
  image: string | null
  tag: string | null
  turn: number
}
```

`unseen` is every notice not yet [dismissed](/docs/reference/commands#dismiss), newest first. Each has its `text` filled in from prose (`''` if it has none), and `turn` is the [turn](/docs/reference/state#turn) it was raised in, counted from 0. `byTag` counts them by `tag`. Untagged notices count under `''`, and a tag with none unseen has no key. Seen notices aren't in the view, but they stay in [`state.notices`](/docs/reference/state#notices) until they roll off.

## InputView

```ts
type InputView = {
  id: string
  label: string
  kind: 'text' | 'number' | 'choice'
  maxLength: number | null
  min: number | null
  max: number | null
  options: { value: KvValue; label: string }[]
  value: KvValue | null
}
```

An [input](/docs/reference/inputs) as the UI draws a field for it. `maxLength` is only set for text inputs, and is 40 if the input doesn't say. `min` and `max` are `null` when not declared. `options` is `[]` for anything but a choice. `value` is what its kv key holds now, or `null` if it holds nothing yet. Send what the player enters as `{ type: 'input', id, to: value }`.

## SettingView

```ts
type SettingView = {
  id: string
  label: string
  kind: 'toggle' | 'choice' | 'range'
  affects: 'play' | 'ui'
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  step?: number
  default: KvValue
  value: KvValue | null
}
```

A [setting](/docs/reference/settings) as a settings screen draws it. `options` is only there for a choice, and `min`, `max` and `step` only for a range (`step` only if declared). `affects` is `'play'` when the declaration leaves it out.

`value` is the setting's value in this game for a `play` setting, from [`state.settings`](/docs/reference/state#settings). For a `ui` setting it's `null`, because a `ui` setting isn't in the state. A runner gives both kinds with [`runner.settings()`](/docs/reference/runner#settings):

```ts
const values = runner.settings()
for (const setting of runner.view().settings) drawSetting(setting, values[setting.id])
```

Send a change of either kind through [`runner.setSetting`](/docs/reference/runner#setsetting).

## SpeakerView

```ts
type SpeakerView = {
  id: string
  name: string
  portrait: string | null
  ui?: Ui<EntityUi>
}
```

Who's speaking in a scene, at `view.scene.speaker`. The id is the render's `speaker`, else the scene's `speaker`. It's never guessed from the scene's id. The first [plugin](/docs/reference/plugins#speakers) whose `speaker` knows the id says who it is, and the [cast](/docs/plugins/cast#speakers) answers for its characters. An id no plugin knows gives `null`, so a game with no such plugin shows no speaker, whatever its scenes name.

| Field | What it is |
|---|---|
| `id` | The speaker id, as the scene named it. |
| `name` | What the player reads over their lines. |
| `portrait` | Their picture. `null` for none, and the UI draws no face. The cast always gives one: the character's `portrait`, or `art/character/<id>.jpg`. |
| `ui` | Their [presentation hints](/docs/reference/ui-hints), such as the React UI's [`hue`](/docs/react/hints#hue) for the colour of their lines. The cast gives their entity's, as [`entityUi`](/docs/reference/ui-hints#entityui) reads them. Left out when there are none. |

Exported from `@ifloom/engine` alongside [`Plugin`](/docs/reference/plugins#plugin), which returns it from `speaker`.

## See it in an example

The tests read the view: [`examples/novel/tests/novel.test.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/tests/novel.test.ts) checks `view(state, game).scene` and `inputs`, and [`examples/cafe/tests/cafe.test.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/tests/cafe.test.ts) checks `stats`, `statsById`, `entities` and `actions`.
