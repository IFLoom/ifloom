---
title: "Strings"
description: "The engine's and plugins' own lines by key, such as refusals and labels, and how a game or a translation rewords them."
---
Strings are the engine's and plugins' own lines for the player, such as a refusal, a button's label or a save's name, kept in one table by key. The table is in English, and a game rewords any line in its content's `strings`, as a translation does in a pack's. [Translate your game](/docs/0.1.0/how-to/translate-your-game) rewords them with the rest of a game's words.

In the showcase: `examples/showcase/src/world/strings.ts`, which rewords the React UI's heading for the quest log.

```ts
import { reasonOf, stringOf, STRINGS, type StringKey, type Strings } from '@ifloom/engine'
```

## STRINGS

The engine's own lines in English, by key. Every key is in [`STRINGS`](/docs/0.1.0/api/engine#strings).

The engine fills each `{name}` placeholder from the values it has when it says the line. A game's line can leave a placeholder out, and one the engine doesn't give prints as written. The game's own words, such as a lock's `reason`, a `blocked` entry's `reason`, a cost's `reasons` and a stat's `lacking`, aren't in the table, since the engine prints them as written.

```ts fragment
STRINGS.finishFirst // 'Finish this first.'
```

### Refusals

The lines that say why a [command](/docs/0.1.0/reference/commands) can't be done.

| Key | Meaning |
|---|---|
| `finishFirst` | `Finish this first.` refuses a command that can't run while a scene or a minigame is open. |
| `notSupported` | `This game does not do that.` refuses a command no feature, plugin or rule handles. |
| `noSuchAction` | `There is no such thing to do.` refuses an action or a game command the game doesn't declare. |
| `notEnough` | `Not enough {stat}.` refuses a choice or action the player can't pay for, with the stat's label in lower case and `{n}` the amount. A stat's [`lackingLine`](/docs/0.1.0/reference/stats#lackingline) says it. |
| `noSuchScene` | `There is no such scene.` refuses entering a scene the game doesn't declare. |
| `nothingToChoose` | `There is nothing to choose.` refuses a choice while no scene is open. |
| `notOnOffer` | `That is not on offer.` refuses a choice or action that isn't offered now. |
| `noSuchThing` | `There is no such thing.` refuses a command that names an entity the game doesn't have. |
| `badArgument` | `That can’t be done: "{arg}" must be {kind}.` refuses a plugin command with an argument its [declaration](/docs/0.1.0/reference/plugin-calls) doesn't take that way. |

### Input

The lines that say why an [input](/docs/0.1.0/reference/inputs) or a [setting](/docs/0.1.0/reference/settings) can't take a value.

| Key | Meaning |
|---|---|
| `noSuchInput` | `There is no such thing to fill in.` refuses an input the game doesn't declare. |
| `notNow` | `Not now.` refuses an input while its `when` doesn't hold. |
| `enterSomething` | `Enter something first.` refuses an empty text. |
| `enterNumber` | `Enter a number.` refuses a value that isn't a number for a number input or setting. |
| `tooLong` | `Keep it to {n} characters.` refuses a text longer than the input's `maxLength`. |
| `between` | `Between {min} and {max}.` refuses a number outside an input's or a range setting's bounds. |
| `atLeast` | `At least {min}.` refuses a number below the input's `min`. |
| `atMost` | `At most {max}.` refuses a number above the input's `max`. |
| `notAnOption` | `That is not one of the options.` refuses a value that isn't one of an input's or a setting's options. |

### Minigames and panels

The lines that say why a [minigame](/docs/0.1.0/reference/minigames)'s command, a `tick` or [`closePanel`](/docs/0.1.0/reference/commands#closepanel) can't be done.

| Key | Meaning |
|---|---|
| `noMinigame` | `Nothing is being played.` refuses a minigame command while no minigame runs. |
| `notLive` | `That does nothing now.` refuses a minigame input that does nothing in the minigame's current state. |
| `noTimer` | `Nothing is counting down.` refuses a `tick` while no timer or minigame clock runs. |
| `tickLength` | `A tick is a number of milliseconds above 0.` refuses a `tick` whose `ms` isn't above 0. |
| `noPanel` | `Nothing is open.` refuses `closePanel` while no panel is open. |

### Settings

The lines that say why a [setting](/docs/0.1.0/reference/settings) can't change, beside `enterNumber`, `between` and `notAnOption`.

| Key | Meaning |
|---|---|
| `noSuchSetting` | `There is no such setting.` refuses a setting the game doesn't declare. |
| `notAGameSetting` | `That setting does not change the game.` refuses a `ui` setting sent as a command. |
| `noProfile` | `This game keeps no settings between plays.` refuses [`runner.setSetting`](/docs/0.1.0/reference/runner#setsetting) in a runner with no profile. |
| `onOrOff` | `Choose on or off.` refuses a toggle's value other than true or false. |
| `inSteps` | `In steps of {step}.` refuses a range setting's value that isn't a whole number of steps. |

### Buttons and labels

The words the engine puts on buttons and in the view.

| Key | Meaning |
|---|---|
| `lookAround` | `Look around` labels the button that leaves a scene the game no longer declares. |
| `momentPassed` | `The moment has passed.` is the body of a scene the game no longer declares. |
| `priceSeparator` | ` · ` stands between the parts of a [price](/docs/0.1.0/api/engine#price)'s `text`. |
| `minigame.up` | `Up` labels a minigame input's button, and so do `minigame.down`, `minigame.left`, `minigame.right` and `minigame.space`. An input with no line shows its name with a capital. |
| `done` | `Already done.` refuses a spent [`once`](/docs/0.1.0/reference/actions#once) that gives no `reason`. |
| `you` | `You` is the name over the player's [spoken lines](/docs/0.1.0/reference/prose#speech) when [`rules.saveName`](/docs/0.1.0/reference/rules#savename) gives none. |

### Saves

The lines that say why a [save](/docs/0.1.0/reference/saves) can't be made, read or listed, and a save's default name.

| Key | Meaning |
|---|---|
| `notASave` | `That is not a save file.` refuses an imported file or state that isn't a save. |
| `otherGame` | `That save belongs to another game ({game}).` refuses a save made by another game. |
| `saveTooOld` | `That save is from a version this game cannot read.` refuses a save too old for the engine to carry forward. |
| `gameNewer` | `That save was made with a newer version of this game.` refuses a save from a newer game. |
| `pluginNewer` | `That save was made with a newer version of {plugin}.` refuses a save from a newer plugin. |
| `pluginUnreadable` | `That save's {plugin} is from a version this game cannot read.` refuses a save whose plugin state its migrations can't carry forward. |
| `noSaves` | `This game keeps no saves.` refuses a save or load in a runner with no saves. |
| `emptySlot` | `Nothing is saved there.` refuses loading an empty slot. |
| `notSaved` | `The game could not be saved.` says the driver failed to write. |
| `notLoaded` | `The game could not be loaded.` says the driver failed to read. |
| `notListed` | `The saves could not be read.` says the driver failed to list. |
| `notRemoved` | `The save could not be deleted.` says the driver failed to delete. |
| `notExported` | `The save could not be exported.` says the driver failed to export. |
| `turnLabel` | `Turn {turn}` names a save when no plugin's `saveName` gives one, with the turn counted from 1. |

The engine keeps no time of day, locations or people, so it has no words for them. The plugins that keep them list their own strings on their pages, such as the [calendar](/docs/0.1.0/reference/plugins/calendar)'s periods and weekdays under `calendar/…`.

## StringKey and Strings

`StringKey` is a key of the engine's own table, and `Strings` is a table a game, pack or plugin gives, any engine key or any `<plugin>/<name>` key. Every form is in [`StringKey`](/docs/0.1.0/api/engine#stringkey) and [`Strings`](/docs/0.1.0/api/engine#strings-1).

Content's `strings` and a pack's hold a game's lines. [`loadGame`](/docs/0.1.0/reference/content#loadgame) gathers each plugin's own content's strings, then your content's, then your packs', and a later pack's line wins over an earlier one's. Each key is declared once across your content. A plugin's line is keyed by the plugin's id, a `/` and the line's name, such as `'quests/notDoing'`.

```ts
import { SCHEMA, type Pack, type Strings } from '@ifloom/engine'

const dutch: Strings = {
  finishFirst: 'Eerst dit afmaken.',
  turnLabel: 'Beurt {turn}',
  'calendar/period.morning': 'ochtend',
}

export const nl: Pack = { id: 'mod:nl', schema: SCHEMA, strings: dutch }
```

A plugin declares its English in its own `strings`, keyed without its id, and says each line with `stringOf` and the full key. A game rewords it by the full key, `strings: { 'kites/noWind': 'Flat calm.' }`, in its content or a pack.

## Functions

### stringOf

Returns the line for a key with each `{name}` placeholder filled from `vars`. Its signature is in [`stringOf`](/docs/0.1.0/api/engine#stringof).

The engine looks for the key in this order and takes the first it finds:

1. The game's `strings`, from its content and packs.
2. For a `<plugin>/<name>` key, the plugin's own default, when the game has the plugin.
3. The engine's `STRINGS`.
4. The key itself.

The refusal, the greyed-out button and the view all go through it, so all three say the same line. A plugin says an engine key, such as `stringOf(game, 'noSuchThing')`, so its refusals match the engine's and a game's rewording covers both.

```ts given
import { stringOf } from '@ifloom/engine'

stringOf(game, 'notEnough', { stat: 'coins' }) // 'Not enough coins.'
stringOf(game, 'tooLong', { n: 12 }) // 'Keep it to 12 characters.'
stringOf(undefined, 'finishFirst') // 'Finish this first.'
```

### reasonOf

Returns a refusal's words for a [`Reason`](/docs/0.1.0/reference/actions#reason), as written or read by key. Its signature is in [`reasonOf`](/docs/0.1.0/api/engine#reasonof).

A reason written in place comes back as it is, and `{ string: 'shop/closed' }` goes through `stringOf`. A plugin or a UI that reads a [`Blocked`](/docs/0.1.0/reference/actions#blocked) entry or a `Once` itself calls it, and the engine's refusals and the view already give the words.

```ts given
import { reasonOf } from '@ifloom/engine'

reasonOf(game, 'Too tired.') // 'Too tired.'
reasonOf(game, { string: 'places/notHere' }) // the places plugin's line, or the game's own words for it
```

## Caveats

- `Strings` takes any key, and the loader checks no keys, so a misspelt key does nothing and the English shows.
- A key no table has comes back as the key, such as `'kites/noWind'`, which shows on screen. `stringOf` finds a plugin's defaults only when the game has the plugin.
- A placeholder with no value stays as written, so `stringOf(game, 'notEnough')` gives `'Not enough {stat}.'`.
- The engine substitutes words and nothing more. It has no plurals and can't move a word a line builds, so a language that needs either can't be fully translated yet (see [Stability and planned renames](/docs/0.1.0/upgrading/status)).
