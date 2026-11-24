---
title: "Cheats"
description: "The cheats plugin gives the player cheats that run their effects in any scene and through any lock, free or refused until a condition holds."
---
`@ifloom/plugin-cheats` gives the player cheats, such as "+20 coins", each a list of effects that runs when the player uses it, in any scene and through any [lock](/docs/reference/locks). A cheat is free for everyone, or refused or hidden while a condition holds, and the plugin logs every use in the save. Cheats ship in the release, where the [debug](/docs/reference/plugins/debug) plugin's commands are for you while you build the game and stay out of it. The plugin needs no other plugin, and it [cooperates](/docs/reference/plugins#cooperates) with [unlocks](/docs/reference/plugins/unlocks), whose `unlocks/has` condition a supporter's cheat names. [Add a plugin](/docs/how-to/add-a-plugin) installs it, and [Sell supporter content](/docs/how-to/sell-supporter-content) keeps cheats for supporters.

In the showcase: `examples/showcase/src/world/cheats.ts`, which has `coins`, free for everyone, and `energy`, refused until the `supporter` unlock is recorded.

```ts
import { cheats, cheatsOf, cheatOf, type CheatDef, type CheatUse, type CheatsState, type CheatsView, type CheatView } from '@ifloom/plugin-cheats'
```

## cheats

The plugin's factory, which returns the plugin with the id `cheats`. It takes no options, because the cheats are content a mod can change. A new game has used no cheats. Every field of its result is in [`cheats`](/docs/api/plugin-cheats#cheats), and its helpers are listed under [Functions](#functions).

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { cheats } from '@ifloom/plugin-cheats'
import { unlocks } from '@ifloom/plugin-unlocks'

declare const town: Content

export const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [cheats(), unlocks()] })
```

## Content

### CheatDef

A cheat the game declares in `data.cheats.cheats`, merged by id, so a pack adds a cheat or replaces one. Every field is in [`CheatDef`](/docs/api/plugin-cheats#cheatdef).

| Field | Meaning |
|---|---|
| `effects` | The [effects](/docs/reference/effects) the cheat runs, in order, plugins' effects in their short form included. A cheat needs at least one. |
| `blocked` | [`Blocked`](/docs/reference/actions#blocked) entries. The first whose `when` holds refuses the cheat with its reason, or leaves it out of the view with `hide`. |
| `group` | The heading the cheat is listed under. Cheats with no group come first. |
| `once` | A [`Once`](/docs/reference/actions#once) limit, `{ per: 'game' }` or `{ per: 'turn' }`. A spent cheat is refused with `once.reason`, or `Already used.` if left out. The cheat has no limit if left out. |

The cheats plugin asks a `blocked` condition as any `blocked` entry does, so a cheat waits for anything a condition says, such as a kv key, a finished storyline or an unlock. In a game without the unlocks plugin, `unlocks/has` is false, so a cheat refused until it holds stays refused. The showcase's two cheats:

```ts
import type { Content } from '@ifloom/engine'
import { unlocks } from '@ifloom/plugin-unlocks'

export const cheatList: Content = {
  data: {
    cheats: {
      cheats: [
        { id: 'coins', name: '+20 coins', description: 'A little help with the rent.', effects: [{ stat: 'coins', by: 20 }] },
        {
          id: 'energy',
          name: 'Full energy',
          description: 'As if you had slept.',
          group: 'Supporters',
          blocked: [{ when: { not: unlocks.has('supporter') }, reason: 'For supporters.' }],
          effects: [{ stat: 'energy', to: 100 }],
        },
      ],
    },
  },
}
```

## Conditions

The condition is a [plugin call](/docs/reference/custom#plugincall), written by the helper beside it.

### cheats/used

Holds once this save has used the cheat, or any cheat when `cheat` is left out. An achievement or an ending uses it to set apart a save that cheated.

```ts fragment
{ 'cheats/used': { cheat: 'coins' } } // cheats.used('coins')
{ 'cheats/used': {} } // cheats.used()
```

## Commands

### cheats/use

Runs the cheat's effects on the state as it is, then adds the use to the save's log with the turn it was used on.

```ts fragment
{ 'cheats/use': { id: 'coins' } } // cheats.use('coins')
```

The command sets [`ignoresLocks`](/docs/reference/plugin-api#ignoreslocks), so it works in any scene, during an intro that locks everything else, and past any plugin's guard. It costs nothing and ends no turn, unless its effects do, such as a `turn` effect. Plugins' [`onCommand`](/docs/reference/plugin-api#oncommand) hooks run after it as after any command, so an achievement whose condition a cheat meets is earned. The command log records it, and [`replay`](/docs/reference/runner#replay) plays it back.

The plugin refuses it, in this order:

1. With `There’s no such cheat.` (`cheats/unknown`) for a cheat the game doesn't have.
2. With the reason of the cheat's first `blocked` entry that holds.
3. With `once.reason`, or `Already used.` (`cheats/usedOnce`), for a `once` cheat already used in the game or this turn.

## Values

Prose prints this as a token.

| Key | Meaning |
|---|---|
| `{{cheats/used}}` | The number of times this save has used a cheat. |
| `{{cheats/used cheat=coins}}` | The number of times this save has used that cheat. |

## State

### CheatsState

The log of cheat uses a save keeps, at `state.plugins.cheats`. Every field is in [`CheatsState`](/docs/api/plugin-cheats#cheatsstate). `used` lists every use, oldest first, and the plugin reads the cheats themselves from content.

### CheatUse

One use of a cheat, an entry of `used`, with the cheat's id and the [turn](/docs/reference/state#turn) it was used on. Every field is in [`CheatUse`](/docs/api/plugin-cheats#cheatuse).

## View

### CheatsView

The cheats as the player sees them, in `view.plugins.cheats`. Every field is in [`CheatsView`](/docs/api/plugin-cheats#cheatsview). `cheats` lists the cheats in the order the game declares them, leaving out one a `hide` entry refuses, and `used` counts every use in this save.

### CheatView

One cheat as the player sees it, an entry of `cheats`. Every field is in [`CheatView`](/docs/api/plugin-cheats#cheatview).

`description` is `''` and `group` is `null` for a cheat without one. `once` is the limit's `per`, or `null` for a cheat with no limit, and `used` counts this save's uses of it. `button` is a [`RenderedChoice`](/docs/reference/view#renderedchoice) labelled with the cheat's name that sends `cheats/use`, with no price, and with the reason it's refused in `disabled`.

[Render the cheats](/docs/how-to/render/player-tools#render-the-cheats) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-cheats/react` subpath renders the cheats for a game that uses [`@ifloom/react`](/docs/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) adds it to a game.

### cheatsUi

The plugin's [`PluginUi`](/docs/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It adds the [`CheatsButton`](#cheatsbutton) to the sidebar, which opens the [`CheatPanel`](#cheatpanel). Its type is in [`cheatsUi`](/docs/api/plugin-cheats#cheatsui).

### CHEATS_WORDS

The words the cheats UI uses, by key, which a game rewords as `ui.<key>` in its strings as it does the React UI's own. Its value is in [`CHEATS_WORDS`](/docs/api/plugin-cheats#cheats_words).

| Key | Meaning |
|---|---|
| `ui.cheatUsedOnce` | `Used once`, the note on a cheat used once. |
| `ui.cheatUsedTimes` | `Used {n} times`, the note on a cheat used more than once. |
| `ui.cheats` | `Cheats`, the label of the button and the title of its dialog. |

### CheatPanel

Renders the cheats from [`CheatsView`](#cheatsview) under their groups' headings, the ones with no group first. Its props are in [`CheatPanel`](/docs/api/plugin-cheats#cheatpanel).

Each cheat is a [`ChoiceButton`](/docs/reference/react/components#choicebutton) from its `button`, disabled with its reason while it's refused, such as `For supporters.`. Under it come its description and, once used, a note saying how often. It renders nothing in a game without the plugin, or while every cheat is hidden.

A game replaces it as `CheatPanel` in [`components`](/docs/reference/react/components#components). Its parts are `cheats`, `cheats-group` (with `data-cheats-group`), `cheats-group-title`, `cheat` (with `data-cheat`, and `data-used` once used), `cheat-text`, `cheat-used` and `choice`.

### CheatsButton

Renders a **Cheats** button that opens the [`CheatPanel`](#cheatpanel) in a dialog, without sending a command. Its props are in [`CheatsButton`](/docs/api/plugin-cheats#cheatsbutton).

It renders nothing in a game without the plugin, or while the player can see no cheat, so a game whose cheats all wait hidden for an unlock shows no button until then. A game replaces it as `CheatsButton` in `components`. Its parts are `cheats-button`, and for its dialog `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

### useCheats

Returns the cheats' view from the running game with the cheats grouped and a `use` that sends `cheats/use`, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`useCheats`](/docs/api/plugin-cheats#usecheats).

::include[../../../../../snippets/react/use-cheats.tsx]

### CheatsControls

The value `useCheats` returns, a [`CheatsView`](#cheatsview) with `groups` and `use(cheat)`. Every field is in [`CheatsControls`](/docs/api/plugin-cheats#cheatscontrols). `use` returns the runner's [`Result`](/docs/reference/common#result), so a refusal comes back with its reason.

### CheatGroup

One group of `groups`, a heading and its cheats in the order the game declares them. Every field is in [`CheatGroup`](/docs/api/plugin-cheats#cheatgroup). The cheats with no group form the first, with the name `null`, and each other group follows in the order it first appears.

## Functions

The helpers are properties of `cheats` and write its calls, typed:

- **`cheats.use(cheat)`** returns the [`cheats/use`](#cheatsuse) command as a [`CommandRef`](/docs/reference/custom#commandref).
- **`cheats.used(cheat?)`** returns the [`cheats/used`](#cheatsused) condition.

An achievement that only a save without cheats earns:

```ts
import { cheats } from '@ifloom/plugin-cheats'

export const honest = {
  id: 'honest',
  name: 'By the book',
  description: 'Finish the game without a cheat.',
  when: { all: [{ seen: 'ending' }, { not: cheats.used() }] },
}
```

### cheatsOf

Returns the game's cheats, `data.cheats.cheats` from its content and packs, in the order they're declared. Its signature is in [`cheatsOf`](/docs/api/plugin-cheats#cheatsof).

### cheatOf

Returns the game's cheat with this id, or `undefined` for one it doesn't have. Its signature is in [`cheatOf`](/docs/api/plugin-cheats#cheatof).

## Checks

When the game loads, the plugin checks each cheat. A cheat's problems are pinned on the content or pack it came from, with `where` as `cheats <id>`.

| Problem | Cause |
|---|---|
| `has no name` | The cheat's `name` is missing or empty. |
| `has no effects` | The cheat's `effects` is missing or empty. |
| `a blocked entry has no reason` | A `blocked` entry has no reason, or an empty one. |
| `two cheats share this id` | Two cheats have one id, in a game built by hand. A loaded game merges cheats by id, so it never has this. |
| `unknown stat "luck"` | The cheat's effects, its `blocked` conditions or its `once.reason` name something the game doesn't have. |

A `cheats/use` command or a `cheats/used` condition that names a cheat the game doesn't have gives `unknown cheat "gold"` where it's written.

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/reference/strings#stringkey-and-strings).

| Key | Meaning |
|---|---|
| `cheats/unknown` | `There’s no such cheat.` |
| `cheats/usedOnce` | `Already used.`, the refusal of a spent `once` cheat that gives no reason of its own. |

## Caveats

- A cheat's effects still follow the game's rules, so a stat stays in its range and `rules.onStat` sees each change to the player's stats.
- A cheat that opens a scene opens it over whatever is on screen.
- A cheat refused until a condition holds isn't protected, since anyone who reads the game's code finds it. [Locked content](/docs/reference/plugins/unlocks#unlockdef) keeps content from players without a code.
