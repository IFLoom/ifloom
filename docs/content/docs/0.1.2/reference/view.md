---
title: "The view"
description: "The view is one plain value that holds everything a UI renders for a state, already worded for the player."
---
The view is one plain value that says everything a UI renders for a state: the scene and its choices, the room's actions, stats, things, notices and each plugin's slice, already worded for the player. [`view`](#view-1) builds it, and a UI sends back the `command` on whatever the player presses. [State, commands and the view](/docs/0.1.2/explanation/state-and-commands#the-view-is-what-a-ui-renders) explains why a UI reads only the view, and [Start your own UI](/docs/0.1.2/how-to/render/start) renders one.

In the showcase: `examples/showcase/tests/showcase.test.ts`, whose tests play the game and read the view after each command.

```ts
import { inlineChoices, screen, view, type Price, type RenderedChoice, type Screen, type View, type ViewOptions } from '@ifloom/engine'
import { pictureView, priceView, renderAction } from '@ifloom/engine/plugin'
```

## View

One state as a UI renders it, from the core, each feature and each plugin. Every field is in [`View`](/docs/0.1.2/api/engine#view).

Every button in the view carries the command it sends and its price, and one that can't be pressed carries the reason, worded for the player. The reducer refuses a command with the same reasons, so the screen and the rules never disagree, and a UI shows a greyed-out button with its reason rather than hiding it. The view never holds a spoiler, such as what a choice would change, so a UI can show any part of it.

A list of things the game declares is an array in declaration order, each entry with its `id`, so a UI finds one with `find`. `statsById` is the one record beside its list, because a HUD reads one stat by id more often than it renders them all. The engine keeps no clock, locations or people, so the calendar's day, the location the player is at and who's there are plugins' slices in `plugins`.

```ts given
import { view } from '@ifloom/engine'

const shown = view(state, game)
shown.when // 'Day 1 · Monday morning · High Street', with the calendar and places
shown.scene.id === null // true while no scene is open
shown.inputs.find((input) => input.id === 'playerName')?.value
```

Each part of the view is explained on the page of the feature it comes from:

| Key | Meaning |
|---|---|
| `title` | The game's [`title`](/docs/0.1.2/reference/content#gamebase). |
| `turn` | The number of [turns](/docs/0.1.2/reference/state#turn) that have passed, 0 on the first. |
| `when` | Every plugin's [`label`](/docs/0.1.2/reference/plugin-api#plugin) for the state, in the order `game.plugins` lists them, joined with ` · `, or `null` when no plugin gives one. |
| `scene` | The open scene, or the room while none is open, explained under [`scene`](#scene) below and on [Scenes](/docs/0.1.2/reference/scenes#view). Its `beats` are on [Prose](/docs/0.1.2/reference/prose#view), its `choices` are [`RenderedChoice`](#renderedchoice)s, and a flowing scene's are on [Flows](/docs/0.1.2/reference/flows#view). |
| `actions` | The room's actions while no scene is open, explained on [Actions](/docs/0.1.2/reference/actions#view). |
| `stats`, `statsById` | The player's stats, each a [`StatView`](#statview), explained on [Stats](/docs/0.1.2/reference/stats#view). |
| `entities` | The listed kinds with their entities, explained on [Entities](/docs/0.1.2/reference/entities#view). What the player has is each receiver's slice of `plugins`, such as `plugins.inventory`. |
| `notices` | The notices not yet dismissed, explained on [Notices](/docs/0.1.2/reference/notices#view). |
| `inputs` | The inputs on offer now, explained on [Inputs](/docs/0.1.2/reference/inputs#view). |
| `settings` | Every setting the game declares, explained on [Settings](/docs/0.1.2/reference/settings#view). |
| `minigame` | The minigame being played, or `null`, explained on [Minigames](/docs/0.1.2/reference/minigames#view). |
| `timers` | The running timers, explained on [Timers](/docs/0.1.2/reference/timers#view). |
| `rolls` | The rolls the last command made, explained on [Rolls](/docs/0.1.2/reference/rolls#view). |
| `changes` | The tracked stats the last command moved, explained on [Changes](/docs/0.1.2/reference/changes#view). |
| `audio` | What each audio channel plays and the sounds that are due, an [`AudioView`](/docs/0.1.2/reference/audio#audioview). |
| `panel` | The panel open over the story, or `null`, an [`OpenPanel`](/docs/0.1.2/reference/panels#openpanel). |
| `saving` | Whether the player can save now, a [`SavingView`](#savingview). |
| `plugins` | Each plugin's slice by plugin id, and the game's own [`rules.view`](/docs/0.1.2/reference/rules#gamerules) under `game`, typed by the [`ViewRegistry`](/docs/0.1.2/reference/plugin-calls) once you import the plugin. |

### scene

The open scene as rendered, or the room while none is open, with the same fields either way. Every field is in [`View`](/docs/0.1.2/api/engine#view).

| Field | Meaning |
|---|---|
| `key` | The screen on show: `scene:<id>` while a scene is open, `minigame:<id>` while a minigame runs, `room:<id>` for a plugin's [room scene](/docs/0.1.2/reference/plugin-views) and `room` with none. It changes only when the screen does, so a UI keys an animation or moves focus by it. |
| `beats` | The body parsed for rendering, with pictures and videos in place and pool markup resolved to files. `body` holds the same words as markup text. |
| `fresh` | The index of the first beat the flow's last step brought, so a UI animates only those. It's 0 before the visit's first step, for a scene with no decisions, and for the room. |
| `speaker` | Who's talking, a [`SpeakerView`](#speakerview), from the render's `speaker`, else the scene's. `image` is the render's, else the speaker's. |
| `choices` | The visible choices, disabled ones included, minus those the prose renders inline, which are `action` spans in `beats`. |

While no scene is open, the room's `id` is `null`, it has no choices, and its title and body come from the first plugin whose room `scene` provider answers, else the game's `title` and an empty body. While a minigame runs, `title` is the minigame's `label`, the beats are its state's label, `choices` is empty and `picture` is `null`, and `id` stays the scene's or the room's underneath. A `state.sceneId` that names no scene reads as the [`momentPassed`](/docs/0.1.2/reference/strings#buttons-and-labels) line with one choice, `lookAround`, which sends `leave`.

## Screen

One state as the engine renders it once, before `view` formats it, with what the view leaves out. Every field is in [`Screen`](/docs/0.1.2/api/engine#screen).

The screen keeps each choice's effects, the new [pool picks](/docs/0.1.2/reference/media#mediastate) and the track each background channel resolves to. The reducer reads it after each command to record the picks and the tracks, and locks, guards and prices read the choices' effects. The engine renders the open scene once per screen, so a command never renders a scene twice, and the view can't disagree with the screen.

`view` drops `effects` from each choice, `tracks` from the audio and `picks` altogether, and takes the rest as it is. A tool that maps where choices lead, or a UI that previews an outcome, reads the screen.

### ScreenChoice

A [`RenderedChoice`](#renderedchoice) with the effects choosing it would apply, in `screen.choices` and `screen.actions`. Its definition is in [`ScreenChoice`](/docs/0.1.2/api/engine#screenchoice).

### ScreenScene

The open scene or the room as the screen renders it, which is [`view.scene`](#scene) without `picture` and `choices`, since `Screen` keeps those beside it. Every field is in [`ScreenScene`](/docs/0.1.2/api/engine#screenscene).

## ViewOptions

Settings for `view` and `screen` besides the state. Every field is in [`ViewOptions`](/docs/0.1.2/api/engine#viewoptions).

`profile` holds the player's [profile](/docs/0.1.2/reference/profile) by namespace, and each plugin's view reads only its own namespace as [`context.profile`](/docs/0.1.2/reference/plugin-api#plugincontext). A runner with a profile passes it. Without it, no plugin's view sees the profile. The reducer never passes it, so a pool pick that a plugin's view makes must not depend on the profile, or the pick changes on the next visit.

## RenderedChoice

A button as a UI renders it: a scene's choice, an action, a plugin's button or an inline action in a beat's spans. Every field is in [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice).

A UI sends `command` when the player presses it. The fields a UI shows besides the `label` are these:

| Field | Meaning |
|---|---|
| `disabled` | The reason the button can't be pressed, which the UI shows. |
| `warning` | A plugin [guard](/docs/0.1.2/reference/plugin-api#plugin)'s soft refusal, such as the calendar's `That would run past dawn.` The button can be pressed, but the reducer refuses it with this line. The engine sets none of its own. |
| `irreversible` | A warning to show before sending, from a choice marked [`irreversible`](/docs/0.1.2/reference/scenes#choice). |
| `price` | What pressing it costs, a [`Price`](#price). |
| `tags`, `ui` | A choice's tags and its or an action's [presentation hints](/docs/0.1.2/reference/ui-hints), carried as written. The engine gives them no meaning. |

## Price

What pressing a button costs, shown on it beforehand. Every field is in [`Price`](/docs/0.1.2/api/engine#price).

`text` is the whole price in one line, each stat's amount through its `format` and then the notes, joined by the [`priceSeparator`](/docs/0.1.2/reference/strings#buttons-and-labels) string, such as `'2 coins · until evening'`. `stats` lists only amounts above 0. An action's stats come from its `cost`, in the cost's order, then from what its command spends. A choice's come from its negative `stat` effects on the player's [spendable](/docs/0.1.2/reference/stats#statdef) stats, in declaration order, and never from a stat with `of`.

`notes` are every plugin's [price](/docs/0.1.2/reference/plugin-api#plugin) provider's notes for the button's effects, in the order `game.plugins` lists them, such as the calendar's `until evening`. A button with notes and no cost has a price of only `{ notes, text }`, and one with neither has no `price`. The price shows only costs, never what a choice pays out, because a payout on a button tells the player which button is the right one.

## StatView

One stat as a UI shows it, the player's in `view.stats` or an entity's in its `stats`. Every field is in [`StatView`](/docs/0.1.2/api/engine#statview).

`value` is [`statValue`](/docs/0.1.2/reference/stats#statvalue), so a derived stat is worked out and a stat the save lacks shows its `start`. `max` is worked out against the state now, `min` is the declared `min` or 0, and `text` is the value through the stat's [`format`](/docs/0.1.2/reference/stats#statwords). `level` is there only for a stat with [`levels`](/docs/0.1.2/reference/stats#statlevels), as [`statLevel`](/docs/0.1.2/reference/stats#statlevel) returns it.

```ts given
import { view } from '@ifloom/engine'

const { energy } = view(state, game).statsById
const filled = (energy.value - energy.min) / (energy.max - energy.min)
```

## EntitiesView and EntityView

A [kind](/docs/0.1.2/reference/entities#kinddef) of entity in `view.entities`, with an `EntityView` for each entity the view may show. Every field is in [`EntitiesView`](/docs/0.1.2/api/engine#entitiesview) and [`EntityView`](/docs/0.1.2/api/engine#entityview).

An `EntitiesView` has the kind's `label`, its `plural` (the `label` if left out) and its `unique`. Its `entries` are the [listed](/docs/0.1.2/reference/entities#listed) entities whose `visible` holds, declared ones in content order, then those made in play. Each entry's `name` and `description` have their tokens filled in for this save, `ref` is how content names it, and `flags` holds each of its kind's [`flags`](/docs/0.1.2/reference/entities#flags) by name. Its `stats` are its kind's listed stats whose `visible` holds with `'$'` as the entity, so two entries of one kind can show different stats.

```ts given
import { view } from '@ifloom/engine'

const staff = view(state, game).entities.find((kind) => kind.id === 'staff')
staff?.entries.map((entry) => entry.name) // ['Ana', 'Dev'], once Dev is hired
```

## NoticesView and NoticeView

The notices not yet [dismissed](/docs/0.1.2/reference/commands#dismiss), in `view.notices`. Every field is in [`NoticesView`](/docs/0.1.2/api/engine#noticesview) and [`NoticeView`](/docs/0.1.2/api/engine#noticeview).

`unseen` lists them newest first, each with its `text` (`''` when it has none) and the `turn` it was raised in. `byTag` counts them by `tag`, with untagged notices under `''`, and a tag with none unseen has no key.

## InputView

An [input](/docs/0.1.2/reference/inputs) on offer now, in `view.inputs`, as a UI renders a field for it. Every field is in [`InputView`](/docs/0.1.2/api/engine#inputview).

`maxLength` is set only for a text input, 40 if left out. `min` and `max` are `null` when not declared, `options` is `[]` for anything but a choice, and `value` is what the input's kv key holds, or `null`. A UI sends the player's entry as `{ type: 'input', id, to }`.

## SettingView

A [setting](/docs/0.1.2/reference/settings) as a settings screen renders it, in `view.settings`. Every field is in [`SettingView`](/docs/0.1.2/api/engine#settingview).

`affects` is `'play'` if left out. `options` is there only for a choice, and `min`, `max` and `step` only for a range. `value` is a `play` setting's value from [`state.settings`](/docs/0.1.2/reference/state#settings), and `null` for a `ui` setting, which the state doesn't hold, so a UI reads both from the runner's [`settings`](/docs/0.1.2/reference/runner#settings).

## SpeakerView

Who's speaking in a scene, at `view.scene.speaker`, read from their [entity](/docs/0.1.2/reference/entities). Every field is in [`SpeakerView`](/docs/0.1.2/api/engine#speakerview).

The id is the render's `speaker`, else the scene's, and the engine never guesses it from the scene's id. An id that names no entity gives `null`. `name` is the entity's with its tokens filled in, `image` its picture or `null`, and `ui` its [presentation hints](/docs/0.1.2/reference/ui-hints), such as the React UI's colour for their lines. [`speakerOf`](/docs/0.1.2/reference/plugin-views#speakerof) gives the same for any id, such as a message's sender.

## SavingView

Whether the player can save now, by the game's [`saveable`](/docs/0.1.2/reference/game#saveable), in `view.saving`. Every field is in [`SavingView`](/docs/0.1.2/api/engine#savingview).

`allowed` is `false` while a `saveable` entry's `when` holds, and `reason` is then that entry's reason, else `null`. `visible` is `false` while that entry has `hide: true`. [`runner.save`](/docs/0.1.2/reference/runner#save-load-and-restore) refuses with the same reason, so a UI greys its Save button out while `allowed` is `false` and leaves it off while `visible` is `false`. Loading is always allowed.

## Functions

### view

Returns the [`View`](#view) of a state. Every parameter is in [`view`](/docs/0.1.2/api/engine#view-1).

It's pure, and it builds the view from [`screen`](#screen-1), so it renders the open scene once per call. A runner passes [`ViewOptions`](#viewoptions) so that plugins' views see the profile, and a UI driven by a runner reads [`runner.view()`](/docs/0.1.2/reference/runner#view), which builds each state's view once.

```ts given
import { view } from '@ifloom/engine'

const shown = view(state, game)
for (const action of shown.actions) console.log(action.label, action.disabled ?? '')
```

### screen

Returns the [`Screen`](#screen) of a state, the layer `view` is built from. Every parameter is in [`screen`](/docs/0.1.2/api/engine#screen-1).

It's pure and builds the plugins' views, so it costs about what `view` costs. Most code never calls it.

```ts given
import { screen } from '@ifloom/engine'

for (const choice of screen(state, game).choices) {
  console.log(choice.label, choice.effects.length, 'effects')
}
```

### inlineChoices

Returns the buttons a body's beats render inline, in the order they come. Every parameter is in [`inlineChoices`](/docs/0.1.2/api/engine#inlinechoices). With `view.scene.choices`, or `view.actions` in the room, it lists everything the player can press on the screen, for a test, a bot or a text UI.

```ts given
import { inlineChoices, view } from '@ifloom/engine'

const shown = view(state, game)
const everything = [...inlineChoices(shown.scene.beats), ...shown.scene.choices]
```

### renderAction

Returns an [action](/docs/0.1.2/reference/actions#actiondef) as a [`RenderedChoice`](#renderedchoice), as the view renders the room's actions. Every parameter is in [`renderAction`](/docs/0.1.2/api/engine-plugin#renderaction).

The button gets its `label`, a [`Price`](#price), `disabled` from the first `blocked` entry that holds or else [`whyNot`](/docs/0.1.2/reference/actions#whynot) for its command, and `warning` from the plugins' guards. `owner` is the id of the plugin whose action it is. An action with a cost, effects or `once` sends `{ type: 'action', id }`, and with an owner the id is `'<owner>/<id>'`. It doesn't test the action's `when`, so a plugin leaves out an action whose `when` fails before rendering it, as the view does.

```ts given
import { renderAction } from '@ifloom/engine/plugin'
import { places } from '@ifloom/plugin-places'

// A map app's button, pressed from the flat.
const button = renderAction(state, game, { id: 'cafe', label: 'Go to the café', command: places.go('cafe') })
button.disabled // 'You cannot get there from here.'
```

### pictureView

Returns a [picture](/docs/0.1.2/reference/media#picturedef) resolved for rendering, as the view resolves `view.scene.picture`, or `null` when the picture is undefined. Every parameter is in [`pictureView`](/docs/0.1.2/api/engine-plugin#pictureview).

It leaves out a layer whose `when` fails or whose pool has nothing, and takes a pool layer's file from the pick for `owner` and the slot `picture:<index>`. A `choice` hotspot takes the command, `disabled` and `warning` of the choice with its id in `choices`, and is left out when there's none, so a plugin passes the rendered choices or `null`. A `command` hotspot is a button from [`renderAction`](#renderaction), left out while a lock with `hide` stops it. Any hotspot is left out while its `when` fails or its layer isn't shown.

It never writes the state. It writes a new pick into the `picks` it's given, and the reducer records them after the command, so a plugin's view passes its context's `picks` or the pool picks aren't kept.

```ts fragment
import { pictureView } from '@ifloom/engine/plugin'

const picture = pictureView(state, game, cafe.picture, 'cafe', null, context.picks)
```

### priceView

Returns a [`Price`](#price) for a plugin's view that shows a price of its own, such as a job's wage for a shift, or `null` when there's nothing to show. Every parameter is in [`priceView`](/docs/0.1.2/api/engine-plugin#priceview). It words each stat above 0 through its `format`, in the order given, then adds the notes.

```ts given
import { priceView } from '@ifloom/engine/plugin'

priceView(game, { coins: 2 }, ['until evening'])?.text // '2 coins · until evening'
```

## Caveats

- `statsById` ignores a stat's `visible`, so a UI that renders a stat from it decides for itself when to show it.
- `view.scene.choices` and `view.actions` leave out what the prose renders inline. A UI that lists every button joins them with [`inlineChoices`](#inlinechoices).
- A `view` you call yourself, outside the runner, shows no plugin the profile, so a plugin's view can differ from the one the runner builds.
