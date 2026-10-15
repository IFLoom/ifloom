# Strings

Every word the engine says to the player on its own — a refusal, a button label, a save's name — comes from one table, by key. The table is in English. A game replaces any line with its own, a pack can replace them too, and so a translation can ship as a [mod](/reference/loader).

```ts
import { STRINGS, say, type StringKey, type Strings } from '@ifloom/engine'
```

Lines the game wrote itself are not in the table: a [lock](/reference/locks)'s `reason`, an [activity requirement](/reference/actions#requirement)'s `reason`, a cost's `reasons`, a stat's [`lacking`](/reference/stats#lackingline), a [place](/plugins/places#locationdef)'s `locked` `reason`, a [cast](/plugins/cast#calls) character's `call.busy`, a [talk option](/plugins/cast#talkoption)'s `label`. Those are already the game's words, and the engine prints them as written.

## A worked example

The café's owner wants the town to sound like her:

```ts
import { go } from '@ifloom/plugin-places'
import { talk } from '@ifloom/plugin-cast'

const game: Game = {
  // ...
  strings: {
    finishFirst: 'Not yet, love.',
    'cast/talk': 'Chat',
    'cast/notHere': '{name} has popped out.',
  },
}

whyNot(busy, game, { type: 'activity', id: 'coffee' })   // 'Not yet, love.'
apply(busy, game, go('high-street')).refused              // 'Not yet, love.': the places plugin says it too
whyNot(busy, game, talk('rosa'))                          // 'Not yet, love.': and the cast
whyNot(state, game, talk('rosa'))                         // 'Rosa has popped out.' when Rosa is elsewhere
```

The refusal, the greyed-out button and the view all read the same line, because they all go through [`say`](#say).

## The table

`{name}` and its like are filled in when the line is said. A line may leave a placeholder out; it may not add one the engine does not give, since that one stays as written.

### Refusals

Why a [command](/reference/commands) can't be done.

| Key | English | Placeholders |
|---|---|---|
| `finishFirst` | `Finish this first.` | |
| `notSupported` | `This game does not do that.` | |
| `noSuchAction` | `There is no such thing to do.` | |
| `notEnough` | `Not enough {stat}.` | `{stat}`: the stat's label, lower case; `{n}`: the amount it costs |
| `noSuchScene` | `There is no such scene.` | |
| `nothingToChoose` | `There is nothing to choose.` | |
| `notOnOffer` | `That is not on offer.` | |
| `noSuchThing` | `There is no such thing.` | |
| `doesNothing` | `The {item} does not do anything.` | `{item}`: the item's name |
| `haveNone` | `You have no {item}.` | `{item}` |

### Input

Why a value can't be entered. See [inputs](/reference/inputs).

| Key | English | Placeholders |
|---|---|---|
| `noSuchInput` | `There is no such thing to fill in.` | |
| `notNow` | `Not now.` | |
| `enterSomething` | `Enter something first.` | |
| `enterNumber` | `Enter a number.` | |
| `tooLong` | `Keep it to {n} characters.` | `{n}`: the input's `maxLength` |
| `between` | `Between {min} and {max}.` | `{min}`, `{max}` |
| `atLeast` | `At least {min}.` | `{min}` |
| `atMost` | `At most {max}.` | `{max}` |
| `notAnOption` | `That is not one of the options.` | |

### Buttons and labels

| Key | English | Where |
|---|---|---|
| `lookAround` | `Look around` | The way out of a scene the game no longer has. |
| `momentPassed` | `The moment has passed.` | The body of a scene the game no longer has. |

### Saves

See [saves](/reference/saves).

| Key | English | Placeholders |
|---|---|---|
| `notASave` | `That is not a save file.` | |
| `otherGame` | `That save belongs to another game ({game}).` | `{game}`: the save's game id |
| `saveTooOld` | `That save is from a version this game cannot read.` | |
| `pluginNewer` | `That save was made with a newer version of {plugin}.` | `{plugin}`: the plugin's id |
| `pluginUnreadable` | `That save's {plugin} is from a version this game cannot read.` | `{plugin}` |
| `turnLabel` | `Turn {turn}` | `{turn}`: the [turn](/reference/state#turn), counted from 1. A save's [default name](/reference/saves#savemeta) when no plugin says when or where it is. |

The engine has no words for time of day: it keeps none. The [calendar plugin](/plugins/calendar)'s periods, weekdays, `Too early.` and `That would run past dawn.` are its own strings, `calendar/...`; see [its strings](/plugins/calendar#strings).

Nor has it words for places: it keeps none. `There is no such place.`, `You are already here.` and `You cannot get there from here.` are the [places plugin](/plugins/places)'s, `places/...`; see [its strings](/plugins/places#strings).

Nor for people. **Talk**, `Rosa is not here.`, `You cannot reach Rosa from here.` and the rest are the [cast](/plugins/cast)'s, `cast/...`; see [its strings](/plugins/cast#strings).

## Overriding

### In the game

`Game.strings` holds the game's lines, by key:

```ts
strings?: Record<string, string>
```

Give only the lines you want to change. Every other key keeps its English.

### In a pack

A [`Pack`](/reference/loader#pack) can carry `strings` too. [`loadGame`](/reference/loader#loadgame) starts from the base's `strings`, then lays each pack's over them in order, so a later pack's line wins:

```ts
const core: Pack = { id: 'core', schema: SCHEMA, data: { places: { locations }, cast: { characters } }, /* ... */ }
const { game } = loadGame([core], { ...base, strings: { finishFirst: 'Not yet — finish this.' } })
```

### As a translation mod

A translation is a pack with nothing in it but `strings` (and, for the story itself, [`prose`](/reference/prose)). Put it after the game's packs:

```ts
const dutch: Pack = {
  id: 'nl',
  schema: SCHEMA,
  strings: {
    finishFirst: 'Eerst dit afmaken.',
    turnLabel: 'Beurt {turn}',
    'calendar/period.morning': 'ochtend',
    'calendar/weekday.2': 'woensdag',
    'quests/notDoing': 'Daar ben je niet mee bezig.',
  },
}
const fixes: Pack = { id: 'nl-fixes', schema: SCHEMA, strings: { 'calendar/tooEarly': 'Nog te vroeg.' } }

const { game } = loadGame([core, dutch, fixes], base)
say(game, 'finishFirst') // 'Eerst dit afmaken.'
say(game, 'calendar/tooEarly')  // 'Nog te vroeg.' — the later pack wins over the earlier one and the base
```

A plugin's lines are overridden the same way, by the plugin's id, a `/`, and the line's name: `'quests/notDoing'`. Each [first-party plugin](/plugins/) lists its keys under **Strings** on its page.

## STRINGS

```ts
const STRINGS: { readonly finishFirst: 'Finish this first.'; /* ... */ }
```

The engine's English, every key in [the table](#the-table). Read it to list the keys a translation must cover:

```ts
const missing = Object.keys(STRINGS).filter((key) => !(key in dutch.strings!))
```

## StringKey and Strings

```ts
type StringKey = keyof typeof STRINGS
type Strings = Partial<Record<StringKey, string>> & Record<string, string>
```

`StringKey` is a key of the engine's own table. `Strings` is what a game, pack or plugin gives: any engine key, plus any `plugin/name` key. Type a translation with it so your editor offers the engine's keys:

```ts
const dutch: Strings = { finishFirst: 'Eerst dit afmaken.' }
```

**Gotcha:** `Strings` takes any string key, so a misspelt key is not a type error, and the loader does not check keys either. A misspelt override does nothing, and the English shows.

## say

```ts
function say(game: Game | undefined, key: StringKey | string, vars?: Record<string, string | number>): string
```

The words for a key, in this order:

1. the game's `strings[key]`, from the base and its packs;
2. for a `plugin/name` key, the plugin's own default, its `strings[name]`;
3. the engine's `STRINGS`;
4. the key itself.

Each `{name}` in the line is then replaced from `vars`.

```ts
say(game, 'notEnough', { stat: 'coins' })  // 'Not enough coins.'
say(game, 'tooLong', { n: 12 })           // 'Keep it to 12 characters.'
say(undefined, 'finishFirst')             // 'Finish this first.' — no game, the engine's English
```

Use it in your own UI for the words it shares with the engine, and in a plugin for the plugin's own lines.

**Gotchas.**
- **A missing key shows itself.** A key nobody wrote comes back as the key, `'kites/noWind'`, so it is easy to spot on screen rather than blank.
- **A placeholder with no value stays as written.** `say(game, 'notEnough')` gives `'Not enough {stat}.'`. A translation that uses a placeholder the engine doesn't give for that key prints it as written too.
- **Plain substitution only.** There are no plurals and no way to move a word a line builds into a different spot: the calendar's `{period}` is always one word from its `calendar/period.*` keys, and `calendar/tomorrow` puts "tomorrow" next to it. Full translation into languages that need more is not covered yet; see [API status](/guide/status).

## Plugins' strings

A [plugin](/reference/plugins) declares its English in `strings`, keyed **without** its prefix, and says them with `say` and the full `id/name` key:

```ts
const kites = definePlugin({
  id: 'kites',
  version: 1,
  strings: { noWind: 'There is no wind for {kite}.' },
  commands: {
    fly: {
      whyNot: (state, args, { game }) =>
        state.flags.windy ? undefined : say(game, 'kites/noWind', { kite: String(args.kite) }),
      run: (state) => state,
    },
  },
})

say(game, 'kites/noWind', { kite: 'the red one' }) // 'There is no wind for the red one.'
```

A game overrides it as `strings: { 'kites/noWind': 'Flat calm.' }`, in the game or a pack. A plugin may also say an engine key, such as `say(game, 'haveNone', { item })`, so its refusals match the engine's and are overridden with them.

**Gotcha:** the plugin's defaults are only found when the game has the plugin. Without it, `say(game, 'kites/noWind')` returns `'kites/noWind'`.

## The functions that take a game

These print refusals, and speak the game's words when given the game. Without it they speak the engine's English.

| Function | Reference |
|---|---|
| `lackingLine(def, id, amount, game?)` | [Stats](/reference/stats#lackingline) |
