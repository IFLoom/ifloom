---
title: "Unlocks and cheats"
description: "The unlocks plugin checks the codes a player enters, opens the scenes and encrypted packs each code unlocks, and gives the player cheats."
---
`@ifloom/plugin-unlocks` does two things for the player, which a game uses together or apart.

- **Codes.** It checks codes the player enters, such as the ones a game's supporters get, and records the unlock each code opens. An unlock opens a cheat or a scene through the `unlocks/has` condition, and it can carry packs of its own, which `ifloom build` encrypts so that only the code opens them. The game holds a slow hash of each code and never the code, and the player's [profile](/docs/0.1.2/reference/profile) remembers a code that worked, so it outlives saves.
- **Cheats.** It gives the player cheats, such as "+20 coins", each a list of effects that runs when the player uses it, in any scene and through any [lock](/docs/0.1.2/reference/locks). A cheat is free for everyone, or refused or hidden while a condition holds, such as `unlocks/has`, and the save logs every use. Cheats ship in the release, where the [debug](/docs/0.1.2/reference/plugins/debug) plugin's commands are for you while you build the game and stay out of it. A game can have cheats and no codes.

The plugin needs no other plugin. [Add a plugin](/docs/0.1.2/how-to/add-a-plugin) installs it, [Sell supporter content](/docs/0.1.2/how-to/sell-supporter-content) sets it up for a release, and [What an offline game can protect](/docs/0.1.2/explanation/design#what-an-offline-game-can-protect) explains what each kind of gate protects.

In the showcase: `examples/showcase/src/world/cheats.ts`, with the `supporter` unlock and two cheats, `coins`, free for everyone, and `energy`, refused until the `supporter` unlock is recorded. The unlock's locked scene is in `examples/showcase/src/unlocks/supporter.ts`.

```ts
import {
  unlocks,
  unlocksOf,
  cheatsOf,
  cheatOf,
  unlockedPacks,
  startUnlocks,
  enterCode,
  unlockHash,
  codeFits,
  normaliseCode,
  envName,
  lockContent,
  contentScript,
  lockedContent,
  ITERATIONS,
  type CheatDef,
  type CheatUse,
  type CheatView,
  type Entered,
  type LockedContent,
  type UnlockDef,
  type UnlocksProfile,
  type UnlocksState,
  type UnlockStatus,
  type UnlocksView,
  type UnlockView,
} from '@ifloom/plugin-unlocks'
```

## unlocks

The plugin's factory, which returns the plugin with the id `unlocks`. It takes no options, because the unlocks and cheats are content a mod can change. A new game has nothing unlocked and has used no cheats. Every field of its result is in [`unlocks`](/docs/0.1.2/api/plugin-unlocks#unlocks), and its helpers are listed under [Functions](#functions).

The plugin checks codes with WebCrypto (`crypto.subtle`), which current browsers have, on a page opened from disk too, and Node 20 and later.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { unlocks } from '@ifloom/plugin-unlocks'

declare const town: Content

export const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [unlocks()] })
```

## Content

### UnlockDef

An unlock the game declares in `data.unlocks.unlocks`, holding its code's hash and never the code. Every field is in [`UnlockDef`](/docs/0.1.2/api/plugin-unlocks#unlockdef).

| Field | Meaning |
|---|---|
| `hash` | The code's hash, 64 hex digits, as [`ifloom unlock-hash`](/docs/0.1.2/reference/cli#ifloom-unlock-hash) prints it from the code in the environment variable [`envName`](#envname) names. |
| `salt` | Extra salt mixed into the hash after the game's and the unlock's ids, so a new `salt` gives a new hash for the same code. |
| `iterations` | The number of PBKDF2 rounds for this code, [`ITERATIONS`](#iterations) (600,000) if left out. Only a test sets fewer. |

The showcase's unlock:

```ts
import type { UnlockDef } from '@ifloom/plugin-unlocks'

export const supporter: UnlockDef = {
  id: 'supporter',
  name: 'Supporter edition',
  description: 'A thank-you scene in the café, and the Full energy cheat.',
  hash: '7b141ff9f5210e0e3064dd089920697c712fa1b31ff56c2e42737dcd71bbed5f',
}
```

An unlock's locked content is the default export of `src/unlocks/<id>.ts`, a [pack](/docs/0.1.2/reference/content#pack) or a list of packs. A locked pack must be data, as a [mod](/docs/0.1.2/reference/mods) is, with no functions. [`ifloom build`](/docs/0.1.2/reference/cli#ifloom-build) encrypts it under the unlock's code, puts it in the page, and refuses an import of it from the game's code. The game module's `build` receives the opened packs as `unlocked` and passes them to [`loadGame`](/docs/0.1.2/reference/content#loadgame) as `packs`, over the game's content. The game's own content can't name anything in a locked pack, so a locked scene is reached from inside its pack or behind `unlocks/has`.

### CheatDef

A cheat the game declares in `data.unlocks.cheats`, merged by id, so a pack adds a cheat or replaces one. Every field is in [`CheatDef`](/docs/0.1.2/api/plugin-unlocks#cheatdef).

| Field | Meaning |
|---|---|
| `effects` | The [effects](/docs/0.1.2/reference/effects) the cheat runs, in order, plugins' effects in their short form included. A cheat needs at least one. |
| `blocked` | [`Blocked`](/docs/0.1.2/reference/actions#blocked) entries. The first whose `when` holds refuses the cheat with its reason, or leaves it out of the view with `hide`. |
| `group` | The heading the cheat is listed under. Cheats with no group come first. |
| `once` | A [`Once`](/docs/0.1.2/reference/actions#once) limit, `{ per: 'game' }` or `{ per: 'turn' }`. A spent cheat is refused with `once.reason`, or `Already used.` if left out. The cheat has no limit if left out. |

The plugin asks a `blocked` condition as any `blocked` entry does, so a cheat waits for anything a condition says, such as a kv key, a finished storyline or an unlock. The showcase's unlock and two cheats:

```ts
import type { Content } from '@ifloom/engine'
import { unlocks } from '@ifloom/plugin-unlocks'

export const supporterEdition: Content = {
  data: {
    unlocks: {
      unlocks: [{ id: 'supporter', name: 'Supporter edition', hash: '7b141ff9f5210e0e3064dd089920697c712fa1b31ff56c2e42737dcd71bbed5f' }],
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

The condition is a [plugin call](/docs/0.1.2/reference/custom#plugincall), written by the helper beside it.

### unlocks/has

Holds once this save records the unlock. It reads the save and not the profile, so a [replay](/docs/0.1.2/reference/runner#replay) gives the same answer, and [`startUnlocks`](#startunlocks) keeps the save in step with the profile.

```ts fragment
{ 'unlocks/has': { unlock: 'supporter' } } // unlocks.has('supporter')
```

### unlocks/cheated

Holds once this save has used the cheat, or any cheat when `cheat` is left out. An achievement or an ending uses it to set apart a save that cheated.

```ts fragment
{ 'unlocks/cheated': { cheat: 'coins' } } // unlocks.cheated('coins')
{ 'unlocks/cheated': {} } // unlocks.cheated()
```

## Commands

### unlocks/record

Records the unlock in this save. `startUnlocks` sends it once a code has worked, and for each unlock the profile remembers.

```ts fragment
{ 'unlocks/record': { id: 'supporter' } } // unlocks.record('supporter')
```

The command sets [`ignoresLocks`](/docs/0.1.2/reference/plugin-api#ignoreslocks), so it works during an intro that locks everything else, and the command log records it. It checks no code, so anyone who can send commands, from the browser's console say, can record an unlock. The plugin refuses it with `There’s no such unlock.` (`unlocks/unknown`) for an unlock the game doesn't have, and with `That’s unlocked already.` (`unlocks/already`) for one this save records.

### unlocks/cheat

Runs the cheat's effects on the state as it is, then adds the use to the save's log with the turn it was used on.

```ts fragment
{ 'unlocks/cheat': { id: 'coins' } } // unlocks.cheat('coins')
```

The command sets `ignoresLocks`, so it works in any scene, during an intro that locks everything else, and past any plugin's guard. It costs nothing and ends no turn, unless its effects do, such as a `turn` effect. Plugins' [`onCommand`](/docs/0.1.2/reference/plugin-api#oncommand) hooks run after it as after any command, so an achievement whose condition a cheat meets is earned. The command log records it, and [`replay`](/docs/0.1.2/reference/runner#replay) plays it back.

The plugin refuses it, in this order:

1. With `There’s no such cheat.` (`unlocks/noCheat`) for a cheat the game doesn't have.
2. With the reason of the cheat's first `blocked` entry that holds.
3. With `once.reason`, or `Already used.` (`unlocks/usedOnce`), for a `once` cheat already used in the game or this turn.

## Values

Prose prints this as a token.

| Key | Meaning |
|---|---|
| `{{unlocks/cheated}}` | The number of times this save has used a cheat. |
| `{{unlocks/cheated cheat=coins}}` | The number of times this save has used that cheat. |

## State

### UnlocksState

The unlocks and cheat uses a save records, at `state.plugins.unlocks`. Every field is in [`UnlocksState`](/docs/0.1.2/api/plugin-unlocks#unlocksstate). `unlocked` lists the unlocks' ids in the order they were recorded, and `cheated` lists every use of a cheat, oldest first. The plugin reads the unlocks and cheats themselves from content.

### CheatUse

One use of a cheat, an entry of `cheated`, with the cheat's id and the [turn](/docs/0.1.2/reference/state#turn) it was used on. Every field is in [`CheatUse`](/docs/0.1.2/api/plugin-unlocks#cheatuse).

### UnlocksProfile

The record the plugin keeps in the player's profile, under `unlocks`. Every field is in [`UnlocksProfile`](/docs/0.1.2/api/plugin-unlocks#unlocksprofile).

`unlocked` holds a proof made from each code that worked, by unlock id, in hex. The proof can't give the code back, but it opens this release's locked content for that unlock, so the profile is the player's own.

## View

### UnlocksView

The unlocks and cheats as the player sees them, in `view.plugins.unlocks`. Every field is in [`UnlocksView`](/docs/0.1.2/api/plugin-unlocks#unlocksview). `unlocks` lists every unlock in the order the game declares them, `unlocked` counts the ones this save records, and `total` counts them all. `cheats` lists the cheats in the order the game declares them, leaving out one a `hide` entry refuses, and `cheated` counts every use of a cheat in this save.

### UnlockView

One unlock as the player sees it, an entry of `unlocks`. Every field is in [`UnlockView`](/docs/0.1.2/api/plugin-unlocks#unlockview). `description` is `''` for an unlock without one, and `unlocked` is `true` while this save records it.

### UnlockStatus

The state of code entry, which `startUnlocks` reports in the runner's [snapshot](/docs/0.1.2/reference/runner#runnersnapshot) at `helpers.unlocks`. Every field is in [`UnlockStatus`](/docs/0.1.2/api/plugin-unlocks#unlockstatus). The plugin adds `unlocks` to the engine's [`HelperRegistry`](/docs/0.1.2/reference/runner#helperregistry), so the snapshot types it.

`status` is `checking` while a code is checked, and while `startUnlocks` checks the profile's codes. It's `wrong` after a code that didn't work, with the reason in `reason`, and `unlocked` after one that did, with what it opened in `entered`. It's `idle` before any code is entered.

### Entered

The unlock a code opened, as [`enterCode`](#entercode) returns it and `entered` holds. Every field is in [`Entered`](/docs/0.1.2/api/plugin-unlocks#entered).

`already` is `true` when the save had the unlock, so the code worked and changed nothing. `restart` is `true` when the unlock has locked content the game in play doesn't have yet. Building the game again adds it, which a page does by reloading, as it does for [mods](/docs/0.1.2/reference/mods).

[Render a box for codes](/docs/0.1.2/how-to/render/player-tools#render-a-box-for-codes) renders the view and the snapshot's `helpers.unlocks` in Plain JS, React and Vue.

### CheatView

One cheat as the player sees it, an entry of `cheats`. Every field is in [`CheatView`](/docs/0.1.2/api/plugin-unlocks#cheatview).

`description` is `''` and `group` is `null` for a cheat without one. `once` is the limit's `per`, or `null` for a cheat with no limit, and `used` counts this save's uses of it. `button` is a [`RenderedChoice`](/docs/0.1.2/reference/view#renderedchoice) labelled with the cheat's name that sends `unlocks/cheat`, with no price, and with the reason it's refused in `disabled`.

[Render the cheats](/docs/0.1.2/how-to/render/player-tools#render-the-cheats) renders them in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-unlocks/react` subpath renders a code box and the cheats for a game that uses [`@ifloom/react`](/docs/0.1.2/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/0.1.2/how-to/react/show-plugin-uis) adds it to a game.

### unlocksUi

The plugin's [`PluginUi`](/docs/0.1.2/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`, the same as `unlocksUiWith()`. It starts code entry on the runner when the game renders and stops it when the game goes. It puts the [`UnlocksPanel`](#unlockspanel) on the settings page, or behind an **Enter a code** button in the menu in a game without pages, and the [`CheatsButton`](#cheatsbutton) in the sidebar, which opens the [`CheatPanel`](#cheatpanel). Each renders nothing while the game has no unlocks, or the player can see no cheat. Its type is in [`unlocksUi`](/docs/0.1.2/api/plugin-unlocks#unlocksui).

### unlocksUiWith

Returns the unlocks UI with settings, for a game that opens the player's locked content before it's built. Its signature is in [`unlocksUiWith`](/docs/0.1.2/api/plugin-unlocks#unlocksuiwith).

```tsx
import { localStorageDriver } from '@ifloom/browser'
import { profile } from '@ifloom/engine'
import { mountGame } from '@ifloom/react'
import { unlockedPacks } from '@ifloom/plugin-unlocks'
import { unlocksUiWith } from '@ifloom/plugin-unlocks/react'
import module from './game.ts'

// What the player's codes opened, from the profile, before the game is built with it.
const opened = await unlockedPacks('small-town', profile({ id: 'small-town' }, localStorageDriver()))

// A code box on the settings page; a new code builds the game again with what it opened.
const unlocks = unlocksUiWith({ problems: opened.problems, onChange: () => location.reload() })
mountGame(module.build({ unlocked: opened.packs }), { pages: true, plugins: [unlocks] })
```

### UnlocksUiOptions

Settings for `unlocksUiWith`. Every field is in [`UnlocksUiOptions`](/docs/0.1.2/api/plugin-unlocks#unlocksuioptions).

| Field | Meaning |
|---|---|
| `problems` | The `problems` from [`unlockedPacks`](#unlockedpacks), shown under the code box. None if left out. |
| `onChange` | The function that builds the game again with the content a code has just opened, such as `() => location.reload()`. The box offers no restart without it. |
| `start` | The function that starts code entry on the runner and returns the way to stop it, `startUnlocks` if left out. A test passes its own locked content here. |

### UNLOCKS_WORDS

The words the unlocks UI uses, by key, which a game rewords as `ui.<key>` in its strings as it does the React UI's own. Its value is in [`UNLOCKS_WORDS`](/docs/0.1.2/api/plugin-unlocks#unlocks_words).

| Key | Meaning |
|---|---|
| `ui.cheatUsedOnce` | `Used once`, the note on a cheat used once. |
| `ui.cheatUsedTimes` | `Used {n} times`, the note on a cheat used more than once. |
| `ui.cheats` | `Cheats`, the label of the cheats button and the title of its dialog. |
| `ui.checkingCode` | `Checking…`, the button's label while a code is checked. |
| `ui.code` | `Code`, the code box's placeholder and label. |
| `ui.enterCode` | `Enter a code`, the heading over the box and the menu button's label without pages. |
| `ui.locked` | `Locked`, the badge of an unlock the save doesn't record. |
| `ui.restartForUnlock` | `Restart to add it`, the button that calls `onChange`. |
| `ui.unlock` | `Unlock`, the button that checks the code. |
| `ui.unlocked` | `Unlocked`, the badge of an unlock the save records. |
| `ui.unlockedAlready` | `{label} was unlocked already.` |
| `ui.unlockedNow` | `Unlocked: {label}.` |

### UnlocksPanel

Renders the code box and the list of unlocks from [`UnlocksView`](#unlocksview). Its props are in [`UnlocksPanel`](/docs/0.1.2/api/plugin-unlocks#unlockspanel).

The box shows once code entry has started on the runner, and its button is disabled while a code is checked. A wrong code shows its reason as an alert, and one that works says which unlock it opened. A **Restart to add it** button calls `onChange` when the code opened content the game in play doesn't have. The `problems` follow, then each unlock with its name, a **Locked** or **Unlocked** badge and its description. It renders nothing in a game without the plugin or without unlocks.

A game replaces it as `UnlocksPanel` in [`components`](/docs/0.1.2/reference/react/components#components). Its parts are `unlocks`, `unlocks-title`, `unlock-form`, `unlock-input`, `button`, `unlocks-message`, `unlocks-entered`, `unlock-problem`, `unlocks-list`, `unlock` (with `data-unlock`, and `data-unlocked` once unlocked), `unlock-name`, `unlock-state` and `unlock-text`.

### useUnlocks

Returns the unlocks' view and the code box's state from the running game, or `null` in a game without the plugin. It re-renders when the view or the snapshot's `helpers.unlocks` changes. Its signature is in [`useUnlocks`](/docs/0.1.2/api/plugin-unlocks#useunlocks).

```tsx
import { useState } from 'react'
import { useUnlocks } from '@ifloom/plugin-unlocks/react'

export function CodeBox() {
  const unlocks = useUnlocks()
  const [code, setCode] = useState('')
  if (!unlocks?.available) return null
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void unlocks.enter(code)
      }}
    >
      <input value={code} onChange={(event) => setCode(event.target.value)} />
      <button disabled={unlocks.checking}>Unlock</button>
      {unlocks.message ?? (unlocks.entered ? `Unlocked: ${unlocks.entered.name}.` : null)}
      {unlocks.restart ? (
        <button type="button" onClick={unlocks.restart}>
          Restart
        </button>
      ) : null}
    </form>
  )
}
```

### UnlocksControls

The value `useUnlocks` returns, an [`UnlocksView`](#unlocksview) with the code box's state. Every field is in [`UnlocksControls`](/docs/0.1.2/api/plugin-unlocks#unlockscontrols).

`available` is `true` once code entry has started on the runner. `enter(code)` checks a code with `enterCode` and resolves to whether it worked, and `checking` is `true` while it runs. `entered` and `message` say what the last code opened or why it didn't work. `restart` is `onChange` while the last code needs it, and `problems` are the ones given to `unlocksUiWith`.

### CheatPanel

Renders the cheats from [`UnlocksView`](#unlocksview) under their groups' headings, the ones with no group first. Its props are in [`CheatPanel`](/docs/0.1.2/api/plugin-unlocks#cheatpanel).

Each cheat is a [`ChoiceButton`](/docs/0.1.2/reference/react/components#choicebutton) from its `button`, disabled with its reason while it's refused, such as `For supporters.`. Under it come its description and, once used, a note saying how often. It renders nothing in a game without the plugin, or while every cheat is hidden.

A game replaces it as `CheatPanel` in `components`. Its parts are `cheats`, `cheats-group` (with `data-cheats-group`), `cheats-group-title`, `cheat` (with `data-cheat`, and `data-used` once used), `cheat-text`, `cheat-used` and `choice`.

### CheatsButton

Renders a **Cheats** button that opens the [`CheatPanel`](#cheatpanel) in a dialog, without sending a command. Its props are in [`CheatsButton`](/docs/0.1.2/api/plugin-unlocks#cheatsbutton).

It renders nothing in a game without the plugin, or while the player can see no cheat, so a game whose cheats all wait hidden for an unlock shows no button until then. A game replaces it as `CheatsButton` in `components`. Its parts are `cheats-button`, and for its dialog `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

### useCheats

Returns the cheats from the running game, grouped, with a `use` that sends `unlocks/cheat`, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`useCheats`](/docs/0.1.2/api/plugin-unlocks#usecheats).

```tsx
import { useCheats } from '@ifloom/plugin-unlocks/react'

export function QuickCoins() {
  const cheats = useCheats()
  const coins = cheats?.cheats.find((cheat) => cheat.id === 'coins')
  if (!cheats || !coins) return null
  return (
    <button disabled={Boolean(coins.button.disabled)} onClick={() => cheats.use('coins')}>
      {coins.name}
    </button>
  )
}
```

### CheatsControls

The value `useCheats` returns: the view's `cheats` and `cheated`, with `groups` and `use(cheat)`. Every field is in [`CheatsControls`](/docs/0.1.2/api/plugin-unlocks#cheatscontrols). `use` returns the runner's [`Result`](/docs/0.1.2/reference/common#result), so a refusal comes back with its reason.

### CheatGroup

One group of `groups`, a heading and its cheats in the order the game declares them. Every field is in [`CheatGroup`](/docs/0.1.2/api/plugin-unlocks#cheatgroup). The cheats with no group form the first, with the name `null`, and each other group follows in the order it first appears.

## Functions

The helpers are properties of `unlocks` and write its calls, typed:

- **`unlocks.has(unlock)`** returns the [`unlocks/has`](#unlockshas) condition.
- **`unlocks.record(unlock)`** returns the [`unlocks/record`](#unlocksrecord) command as a [`CommandRef`](/docs/0.1.2/reference/custom#commandref).
- **`unlocks.cheat(cheat)`** returns the [`unlocks/cheat`](#unlockscheat) command.
- **`unlocks.cheated(cheat?)`** returns the [`unlocks/cheated`](#unlockscheated) condition.

A choice that only a supporter's save offers:

```ts
import type { Choice } from '@ifloom/engine'
import { unlocks } from '@ifloom/plugin-unlocks'

export const backRoom: Choice = { id: 'back-room', label: 'Go through to the back', when: unlocks.has('supporter'), effects: [{ scene: 'cafe.back-room' }] }
```

An achievement that only a save without cheats earns:

```ts
import { unlocks } from '@ifloom/plugin-unlocks'

export const honest = {
  id: 'honest',
  name: 'By the book',
  description: 'Finish the game without a cheat.',
  when: { all: [{ seen: 'ending' }, { not: unlocks.cheated() }] },
}
```

### unlockedPacks

Returns the locked content of every unlock the profile remembers a code for, decrypted and checked that this engine reads its schema. Its signature is in [`unlockedPacks`](/docs/0.1.2/api/plugin-unlocks#unlockedpacks).

A page calls it before it builds the game, with the game's id and the profile the runner will use, and passes its `packs` to the game module's `build` as `unlocked`. [`profile`](/docs/0.1.2/reference/profile#profile) reads only the game's id, so it opens the profile before the game exists. `content` is the page's own, from [`lockedContent`](#lockedcontent), unless a test passes it. Content that won't open is left out and listed in `problems`, such as `unlock:supporter · its code has changed since it was entered; enter the new one`. It never throws.

### startUnlocks

Starts code entry on a runner and returns the way to stop it, as [`startClock`](/docs/0.1.2/reference/browser#startclock) does. Its signature is in [`startUnlocks`](/docs/0.1.2/api/plugin-unlocks#startunlocks).

It checks each unlock the profile remembers against this release's hash, and sends `unlocks/record` for the ones that match into the game in play, every new game and every loaded save. It reports an [`UnlockStatus`](#unlockstatus) at `snapshot.helpers.unlocks` through [`runner.setHelper`](/docs/0.1.2/reference/runner#sethelper). It needs the runner's `profile`, and starts once per runner. Stopping it ends the recording, takes `helpers.unlocks` out of the snapshot, and makes `enterCode` refuse codes on that runner.

### enterCode

Returns the unlock a code opens, checked against every unlock in turn on a runner `startUnlocks` was started on, as a [`Result`](/docs/0.1.2/reference/common#result) of [`Entered`](#entered). Its signature is in [`enterCode`](/docs/0.1.2/api/plugin-unlocks#entercode).

On a match it stores the code's proof in the profile and records the unlock in the game in play. While it checks, `helpers.unlocks.status` is `checking`, then `wrong` or `unlocked`. It never throws, and it refuses, in this order:

1. With `Codes can’t be entered here.` (`unlocks/notStarted`) on a runner without `startUnlocks`.
2. With `Type a code first.` (`unlocks/empty`) for an empty code.
3. With `This game can’t remember codes here.` (`unlocks/noProfile`) on a runner with no profile.
4. With `The code worked, but it couldn’t be remembered. Try again.` (`unlocks/notSaved`) when the code matches but the profile can't store its proof.
5. With `That code doesn’t unlock anything.` (`unlocks/wrong`) for a code that matches no unlock.

### unlocksOf

Returns the game's unlocks, `data.unlocks.unlocks` from its content and packs. Its signature is in [`unlocksOf`](/docs/0.1.2/api/plugin-unlocks#unlocksof).

### cheatsOf

Returns the game's cheats, `data.unlocks.cheats` from its content and packs, in the order they're declared. Its signature is in [`cheatsOf`](/docs/0.1.2/api/plugin-unlocks#cheatsof).

### cheatOf

Returns the game's cheat with this id, or `undefined` for one it doesn't have. Its signature is in [`cheatOf`](/docs/0.1.2/api/plugin-unlocks#cheatof).

### envName

Returns the environment variable a build reads an unlock's code from, such as `IFLOOM_UNLOCK_SUPPORTER` for `supporter` and `IFLOOM_UNLOCK_EARLY_ACCESS` for `early-access`. Its signature is in [`envName`](/docs/0.1.2/api/plugin-unlocks#envname).

### normaliseCode

Returns a code in the form the plugin checks, Unicode-normalised (NFKC), without spaces or hyphens, in capitals, so `bread-2026`, `BREAD 2026` and `Bread2026` are one code. Its signature is in [`normaliseCode`](/docs/0.1.2/api/plugin-unlocks#normalisecode).

### unlockHash

Returns the hash of a code for an unlock, in hex, the value `ifloom unlock-hash` prints for the unlock's `hash`. Its signature is in [`unlockHash`](/docs/0.1.2/api/plugin-unlocks#unlockhash).

### codeFits

Returns `true` when a code is the unlock's code. Its signature is in [`codeFits`](/docs/0.1.2/api/plugin-unlocks#codefits).

### lockContent

Returns an unlock's packs encrypted under its code, as [`LockedContent`](#lockedcontent-1), which `ifloom build` does for each file in `src/unlocks/`. Its signature is in [`lockContent`](/docs/0.1.2/api/plugin-unlocks#lockcontent). It throws when the code isn't the unlock's, so a build can't ship content no code opens, and when a pack holds a function.

### contentScript

Returns the `<script>` that `ifloom build` puts in the page's head, which sets `window.__ifloomUnlocks` to the locked content by unlock. Its signature is in [`contentScript`](/docs/0.1.2/api/plugin-unlocks#contentscript).

### lockedContent

Returns the locked content that script set, by unlock, or `{}` in a page without it. Its signature is in [`lockedContent`](/docs/0.1.2/api/plugin-unlocks#lockedcontent-1).

### ITERATIONS

The number of PBKDF2 rounds for an unlock without its own `iterations`, 600,000. Its value is in [`ITERATIONS`](/docs/0.1.2/api/plugin-unlocks#iterations).

## How codes are checked

The plugin checks a code in three steps, all in WebCrypto:

1. [`normaliseCode`](#normalisecode) normalises the code.
2. PBKDF2-SHA256 stretches it into a 32-byte proof, salted with `ifloom-unlock:<game id>:<unlock id>`, then `:<salt>` when the unlock has one, for `iterations` rounds. This slow step makes guessing codes one at a time expensive.
3. HKDF-SHA256 derives two keys from the proof under different labels. One is the unlock's `hash`, and the other is the AES-GCM key for its locked content. Knowing the hash gives neither the proof nor the key.

A short code can still be guessed, since a four-letter code has few enough possibilities to try them all. A code of 12 or more random letters and digits can't be.

### LockedContent

One unlock's locked content as the page holds it. Every field is in [`LockedContent`](/docs/0.1.2/api/plugin-unlocks#lockedcontent).

The packs are JSON, encrypted with AES-256-GCM under the unlock's key with a fresh 12-byte nonce, and stored with the nonce in base64. The game's and the unlock's ids are bound to it, so content changed by a byte, or moved to another game or unlock, fails to open.

## Checks

When the game loads, the plugin checks each unlock and each cheat. An unlock's problems are pinned on the content or pack it came from, with `where` as `unlocks <id>`.

| Problem | Cause |
|---|---|
| `has no name` | The unlock's `name` is missing or empty. |
| `its hash isn’t one ifloom unlock-hash printed (64 hex digits)` | The `hash` isn't 64 hex digits, such as a code pasted in by mistake. |
| `iterations must be a whole number above 0` | `iterations` is set to something else. |
| `two unlocks share this id` | Two unlocks have one id, in a game built by hand. |

A cheat's problems are pinned the same way, with `where` as `cheats <id>`.

| Problem | Cause |
|---|---|
| `has no name` | The cheat's `name` is missing or empty. |
| `has no effects` | The cheat's `effects` is missing or empty. |
| `a blocked entry has no reason` | A `blocked` entry has no reason, or an empty one. |
| `two cheats share this id` | Two cheats have one id, in a game built by hand. A loaded game merges cheats by id, so it never has this. |
| `unknown stat "luck"` | The cheat's effects, its `blocked` conditions or its `once.reason` name something the game doesn't have. |

An `unlocks/has` condition or an `unlocks/record` command that names an unlock the game doesn't have gives `unknown unlock "early"` where it's written, and an `unlocks/cheat` command or an `unlocks/cheated` condition that names a cheat it doesn't have gives `unknown cheat "gold"`. [`ifloom check`](/docs/0.1.2/reference/cli#ifloom-check) also checks the code in the environment against each hash, and the game with its locked content.

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/0.1.2/reference/strings#stringkey-and-strings).

| Key | Meaning |
|---|---|
| `unlocks/wrong` | `That code doesn’t unlock anything.` |
| `unlocks/empty` | `Type a code first.` |
| `unlocks/noProfile` | `This game can’t remember codes here.` |
| `unlocks/notSaved` | `The code worked, but it couldn’t be remembered. Try again.` |
| `unlocks/unknown` | `There’s no such unlock.` |
| `unlocks/already` | `That’s unlocked already.` |
| `unlocks/notStarted` | `Codes can’t be entered here.` |
| `unlocks/noCheat` | `There’s no such cheat.` |
| `unlocks/usedOnce` | `Already used.`, the refusal of a spent `once` cheat that gives no reason of its own. |

## Caveats

- A new code means a new hash, so a player who entered the old code sees the unlock locked, and `unlockedPacks` lists its content in `problems` until they enter the new one.
- A save made with locked content loads in a game without it unflagged, since [`LoadedSave`](/docs/0.1.2/reference/saves#loadedsave)'s `missingPacks` lists only mods.
- The build encrypts only the packs, so a picture, a sound or a video in `public/` ships as it is, even when only locked content names it.
- Codes are checked on the player's machine, so nothing stops a code being shared, and nothing takes an unlock back.
- A cheat's effects still follow the game's rules, so a stat stays in its range and `rules.onStat` sees each change to the player's stats.
- A cheat that opens a scene opens it over whatever is on screen.
- A cheat refused until a condition holds isn't protected, since anyone who reads the game's code finds it. [Locked content](#unlockdef) keeps content from players without a code.
