---
title: "Strings"
description: "The engine's and plugins' own lines by key, such as refusals and labels, and how a game or a translation rewords them."
---
Everything the engine says to the player in its own words, such as a refusal, a button label or a save's name, comes from one table, by key. The table is in English. Your game can replace any line with its own, and so can a pack, which means a translation can ship as a [mod](/docs/reference/loader).

```ts
import { STRINGS, stringOf, type StringKey, type Strings } from '@ifloom/engine'
```

Lines your game writes itself aren't in the table, because they're already your words and the engine prints them as written. These include:

- a [lock](/docs/reference/locks)'s `reason`
- an [action](/docs/reference/actions#blocked)'s `blocked` `reason` and a cost's `reasons`
- a stat's [`lacking`](/docs/reference/stats#lackingline)
- a [place](/docs/plugins/places#the-location-trait)'s `blocked` `reason`
- a [cast](/docs/plugins/cast#calls) character's `call.busy` and a [talk option](/docs/plugins/cast#talkoption)'s `label`

## A worked example

Say you want the town to sound a little friendlier:

```ts
import { apply, whyNot, type Game } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'

const game: Game = {
  // ...
  strings: {
    finishFirst: 'Not yet, love.',
    'cast/talk': 'Chat',
    'cast/notHere': '{name} has popped out.',
  },
}

// `busy` is a state with a scene open
whyNot(busy, game, { type: 'action', id: 'coffee' })     // 'Not yet, love.'
apply(busy, game, places.go('high-street')).reason              // 'Not yet, love.' (the places plugin says it too)
whyNot(busy, game, cast.talk('ava'))                           // 'Not yet, love.' (and so does the cast)
whyNot(state, game, cast.talk('ava'))                          // 'Ava has popped out.' when Ava is elsewhere
```

The refusal, the greyed-out button and the view all show the same line, because they all go through [`stringOf`](#stringof).

## The table

Placeholders such as `{name}` are filled in when the line is said. Your line can leave a placeholder out. It can't add one the engine doesn't give, because that one would be printed as written.

### Refusals

Why a [command](/docs/reference/commands) can't be done.

| Key | English | Placeholders |
|---|---|---|
| `finishFirst` | `Finish this first.` | |
| `notSupported` | `This game does not do that.` | |
| `noSuchAction` | `There is no such thing to do.` | |
| `notEnough` | `Not enough {stat}.` | `{stat}` is the stat's label in lower case, and `{n}` the amount it costs. [`lackingLine`](/docs/reference/stats#lackingline) says it, in the game's words. |
| `noSuchScene` | `There is no such scene.` | |
| `nothingToChoose` | `There is nothing to choose.` | |
| `notOnOffer` | `That is not on offer.` | |
| `noSuchThing` | `There is no such thing.` | |
| `badArgument` | `That can’t be done: "{arg}" must be {kind}.` | A plugin command sent with an argument its [declaration](/docs/reference/plugins#declaring-calls) doesn't take that way. |

### Input

Why a value can't be entered. See [inputs](/docs/reference/inputs).

| Key | English | Placeholders |
|---|---|---|
| `noSuchInput` | `There is no such thing to fill in.` | |
| `notNow` | `Not now.` | |
| `enterSomething` | `Enter something first.` | |
| `enterNumber` | `Enter a number.` | |
| `tooLong` | `Keep it to {n} characters.` | `{n}` is the input's `maxLength` |
| `between` | `Between {min} and {max}.` | `{min}`, `{max}` |
| `atLeast` | `At least {min}.` | `{min}` |
| `atMost` | `At most {max}.` | `{max}` |
| `notAnOption` | `That is not one of the options.` | |

### Minigames

Why a [minigame](/docs/reference/minigames)'s command can't be done. While one runs, everything else is refused with `finishFirst`.

| Key | English | Placeholders |
|---|---|---|
| `noMinigame` | `Nothing is being played.` | |
| `notLive` | `That does nothing now.` | |
| `noTimer` | `Nothing is counting down.` | |
| `tickLength` | `A tick is a number of milliseconds above 0.` | |

### Panels

Why [`closePanel`](/docs/reference/commands#closepanel) can't be done.

| Key | English | Placeholders |
|---|---|---|
| `noPanel` | `Nothing is open.` | |

### Settings

Why a [setting](/docs/reference/settings) can't be changed to a value. A setting also uses `enterNumber`, `between` and `notAnOption` from the table above.

| Key | English | Placeholders |
|---|---|---|
| `noSuchSetting` | `There is no such setting.` | |
| `notAGameSetting` | `That setting does not change the game.` | |
| `noProfile` | `This game keeps no settings between plays.` | [`runner.setSetting`](/docs/reference/runner#setsetting) on a `ui` setting, in a runner with no profile |
| `onOrOff` | `Choose on or off.` | |
| `inSteps` | `In steps of {step}.` | `{step}` is the range's `step` |

### Buttons and labels

| Key | English | Where |
|---|---|---|
| `lookAround` | `Look around` | The way out of a scene the game no longer has. |
| `priceSeparator` | ` · ` | Between the parts of a [price](/docs/reference/view#price)'s `text`: its stats, then plugins' notes. |
| `minigame.up`, `minigame.down`, `minigame.left`, `minigame.right`, `minigame.space` | `Up`, `Down`, `Left`, `Right`, `Space` | A [minigame](/docs/reference/minigames#minigameview) input's `label`. Name any other input as `minigame.<input>`; one with no string is its name with a capital. |
| `momentPassed` | `The moment has passed.` | The body of a scene the game no longer has. |
| `done` | `Already done.` | A button with [`once`](/docs/reference/actions#once) once it's spent, when the `once` gives no `reason`. |
| `you` | `You` | The name the player's [spoken lines](/docs/reference/prose#speech), `@you: "Hi."`, show when [`rules.saveName`](/docs/reference/rules#savename) gives the player none. A game in another language sets its own word. |

### Saves

See [saves](/docs/reference/saves).

| Key | English | Placeholders |
|---|---|---|
| `notASave` | `That is not a save file.` | |
| `otherGame` | `That save belongs to another game ({game}).` | `{game}` is the save's game id |
| `saveTooOld` | `That save is from a version this game cannot read.` | |
| `gameNewer` | `That save was made with a newer version of this game.` | |
| `pluginNewer` | `That save was made with a newer version of {plugin}.` | `{plugin}` is the plugin's id |
| `pluginUnreadable` | `That save's {plugin} is from a version this game cannot read.` | `{plugin}` |
| `noSaves` | `This game keeps no saves.` | The runner's `save` or `load`, in a runner with no `saves` |
| `emptySlot` | `Nothing is saved there.` | The runner's `load`, on an empty slot |
| `notSaved` | `The game could not be saved.` | The runner's `save`, when the driver fails |
| `turnLabel` | `Turn {turn}` | `{turn}` is the [turn](/docs/reference/state#turn), counted from 1. It's a save's [default name](/docs/reference/saves#savemeta) when no plugin says when or where the save is. |

The engine keeps no time of day, places or people, so it has no words for them. The plugins that keep them have their own strings:

- The [calendar plugin](/docs/plugins/calendar#strings) has its periods, weekdays, `Too early.` and `That would run past dawn.`, under `calendar/...`.
- The [places plugin](/docs/plugins/places#strings) has `There is no such place.`, `You are already here.` and `You cannot get there from here.`, under `places/...`.
- The [cast](/docs/plugins/cast#strings) has `Talk`, `Ava is not here.`, `You cannot reach Ava from here.` and the rest, under `cast/...`.

## Overriding

### In the game

`Game.strings` holds the game's lines, by key:

```ts
strings?: Record<string, string>
```

Give only the lines you want to change. Every other key keeps its English.

### In your content

Your [content](/docs/reference/loader#content) can carry `strings` too. [`loadGame`](/docs/reference/loader#loadgame) gathers them from each plugin's own [`content`](/docs/reference/plugins#kinds-and-entities), then your content, then your packs. Each key is declared once across your content:

```ts
import { loadGame, type Content } from '@ifloom/engine'

const town: Content = { strings: { finishFirst: 'Not yet. Finish this first.' }, entities: people, data: { places: { locations } } /* ... */ }
const { game } = loadGame([town], base)
```

### As a translation mod

A translation is a [pack](/docs/reference/loader#pack). Its `strings` reword the engine's and plugins' lines, its [`words`](/docs/reference/words) table the words your content writes in place, and its [`prose`](/docs/reference/prose) the lines read by key (see [Translating a game](/docs/recipes/translating)). It goes over the game's content, so its lines win, and a later pack wins over an earlier one:

```ts
import { loadGame, stringOf, SCHEMA, type Pack } from '@ifloom/engine'

const dutch: Pack = {
  id: 'mod:nl',
  schema: SCHEMA,
  strings: {
    finishFirst: 'Eerst dit afmaken.',
    turnLabel: 'Beurt {turn}',
    'calendar/period.morning': 'ochtend',
    'calendar/weekday.2': 'woensdag',
    'quests/notDoing': 'Daar ben je niet mee bezig.',
  },
}
const fixes: Pack = { id: 'mod:nl-fixes', schema: SCHEMA, strings: { finishFirst: 'Maak dit eerst af.' } }

const { game } = loadGame([town], base, { packs: [dutch, fixes] })
stringOf(game, 'turnLabel', { turn: 3 }) // 'Beurt 3'
stringOf(game, 'finishFirst') // 'Maak dit eerst af.' (the later pack wins over the earlier one and the content)
```

You override a plugin's lines the same way, by the plugin's id, a `/` and the line's name, as in `'quests/notDoing'`. Each [first-party plugin](/docs/plugins) lists its keys under Strings on its page.

## STRINGS

```ts
const STRINGS: { readonly finishFirst: 'Finish this first.'; /* ... */ }
```

The engine's English, with every key in [the table](#the-table). Read it to list the keys a translation must cover:

```ts
import { STRINGS } from '@ifloom/engine'

const missing = Object.keys(STRINGS).filter((key) => !(key in dutch.strings!))
```

## StringKey and Strings

```ts
type StringKey = keyof typeof STRINGS
type Strings = Partial<Record<StringKey, string>> & Record<string, string>
```

`StringKey` is a key of the engine's own table. `Strings` is what a game, pack or plugin gives, which is any engine key plus any `plugin/name` key. Type a translation with it so your editor offers the engine's keys:

```ts
import type { Strings } from '@ifloom/engine'

const dutch: Strings = { finishFirst: 'Eerst dit afmaken.' }
```

**Gotcha.** `Strings` takes any string key, so a misspelt key isn't a type error, and the loader doesn't check keys either. A misspelt override does nothing, and the English shows.

## stringOf

```ts
function stringOf(game: Game | undefined, key: StringKey | (string & {}), vars?: Record<string, string | number>): string
```

Returns the words for a key. It looks in this order and takes the first it finds:

1. the game's `strings[key]`, from its content and its packs
2. for a `plugin/name` key, the plugin's own default, its `strings[name]`
3. the engine's `STRINGS`
4. the key itself

Each `{name}` in the line is then replaced from `vars`.

```ts
import { stringOf } from '@ifloom/engine'

stringOf(game, 'notEnough', { stat: 'coins' })  // 'Not enough coins.'
stringOf(game, 'tooLong', { n: 12 })           // 'Keep it to 12 characters.'
stringOf(undefined, 'finishFirst')             // 'Finish this first.' (no game, so the engine's English)
```

Use it in your own UI for the words it shares with the engine, and in a plugin for the plugin's own lines. Engine functions that print a refusal, such as [`lackingLine`](/docs/reference/stats#lackingline), take the game for the same reason.

**Gotchas.**
- **A missing key shows itself.** A key nobody wrote comes back as the key, such as `'kites/noWind'`, so it's easy to spot on screen.
- **A placeholder with no value stays as written.** `stringOf(game, 'notEnough')` gives `'Not enough {stat}.'`. A translation that uses a placeholder the engine doesn't give for that key prints it as written too.
- **Plain substitution only.** There are no plurals, and no way to move a word that a line builds into a different spot. For example, the calendar's `{period}` is always one word from its `calendar/period.*` keys, and `calendar/tomorrow` puts "tomorrow" next to it. Full translation into languages that need more isn't covered yet. See [API status](/docs/guide/status).

## reasonOf

```ts
function reasonOf(game: Game | undefined, reason: Reason): string
```

The words of a [`Reason`](/docs/reference/actions#reason), a refusal's: one written in place is returned as it is, and one by key, `{ string: 'shop/closed' }`, is read with `stringOf`. Use it in a plugin or a UI of your own that reads a [`Blocked`](/docs/reference/actions#blocked) entry or a [`Once`](/docs/reference/actions#once) itself; the engine's own refusals and the view already give the words.

```ts
import { reasonOf } from '@ifloom/engine'

reasonOf(game, 'Too tired.')                // 'Too tired.'
reasonOf(game, { string: 'places/notHere' })  // 'Not here.', or the game's own words for it
```

## Plugins' strings

A [plugin](/docs/reference/plugins) declares its English in `strings`, keyed without its prefix. It says them with `stringOf` and the full `id/name` key:

```ts
import { stringOf } from '@ifloom/engine'
import { definePlugin } from '@ifloom/engine/plugin'

const kites = definePlugin({
  id: 'kites',
  version: 1,
  strings: { noWind: 'There is no wind for {kite}.' },
  commands: {
    fly: {
      whyNot: (state, args, { game }) =>
        state.kv.windy ? undefined : stringOf(game, 'kites/noWind', { kite: String(args.kite) }),
      run: (state) => state,
    },
  },
})

stringOf(game, 'kites/noWind', { kite: 'the red one' }) // 'There is no wind for the red one.'
```

A game overrides it as `strings: { 'kites/noWind': 'Flat calm.' }`, in the game's content or a pack. A plugin can also say an engine key, such as `stringOf(game, 'noSuchThing')`, so its refusals match the engine's and a game's override covers both.

**Gotcha.** The plugin's defaults are only found when the game has the plugin. Without it, `stringOf(game, 'kites/noWind')` returns `'kites/noWind'`.

## See it in an example

Small Town: [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) rewords one string, `strings: { 'ui.quests': 'To do' }`.
