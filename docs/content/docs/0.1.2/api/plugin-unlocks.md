---
title: "@ifloom/plugin-unlocks"
description: "Every export of @ifloom/plugin-unlocks and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-unlocks` and `@ifloom/plugin-unlocks/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-unlocks

- Functions: [`cheatOf`](#cheatof), [`cheatsOf`](#cheatsof), [`codeFits`](#codefits), [`contentScript`](#contentscript), [`enterCode`](#entercode), [`envName`](#envname), [`lockContent`](#lockcontent), [`lockedContent`](#lockedcontent-1), [`normaliseCode`](#normalisecode), [`startUnlocks`](#startunlocks), [`unlockedPacks`](#unlockedpacks), [`unlockHash`](#unlockhash), [`unlocks`](#unlocks), [`unlocksOf`](#unlocksof)
- Constants: [`ITERATIONS`](#iterations)
- Types: [`CheatDef`](#cheatdef), [`CheatUse`](#cheatuse), [`CheatView`](#cheatview), [`Entered`](#entered), [`LockedContent`](#lockedcontent), [`UnlockDef`](#unlockdef), [`UnlocksProfile`](#unlocksprofile), [`UnlocksState`](#unlocksstate), [`UnlockStatus`](#unlockstatus), [`UnlocksView`](#unlocksview), [`UnlockView`](#unlockview)

### CheatDef

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#cheatdef).

A cheat the game declares in `data.unlocks.cheats`. Using it runs its effects at once, in any scene and through any
lock, and ends no turn unless its effects do.

```ts shape
import type { CheatDef } from '@ifloom/plugin-unlocks'
type CheatDef = {
  id: string
  name: string
  description?: string
  effects: EffectRef[]
  blocked?: Blocked[]
  group?: string
  once?: Once
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The cheat's id, unique among the game's cheats. |
| `name` | `string` |  |  | The cheat's name, which its button shows, such as "+20 coins". |
| `description` | `string` | yes |  | The cheat's line in the cheats panel. |
| `effects` | [`EffectRef[]`](/docs/0.1.2/api/engine#effectref) |  |  | The cheat's effects, run in order. It must have at least one. |
| `blocked` | [`Blocked[]`](/docs/0.1.2/api/engine#blocked) | yes |  | The cheat's refusals. The first entry whose `when` holds refuses the button with its reason, or leaves the cheat out of the view with `hide`. A supporter-only cheat is `{ when: { not: { 'unlocks/has': { unlock: 'supporter' } } }, reason: 'For supporters' }`. |
| `group` | `string` | yes |  | The heading the cheat is listed under in the panel. Cheats with none come first. |
| `once` | [`Once`](/docs/0.1.2/api/engine#once) | yes |  | The cheat's limit, once in a save (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`), as a choice's `once` is. `reason` is the refusal once it's used. The `unlocks/usedOnce` string, "Already used.", if left out. |

### cheatOf

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#cheatof).

Returns the game's cheat with the id `id`, or undefined when there is none.

```ts shape
import { cheatOf } from '@ifloom/plugin-unlocks'
function cheatOf(game: Game, id: string): CheatDef | undefined
```

Uses: [`Game`](/docs/0.1.2/api/engine#game), [`CheatDef`](#cheatdef).

### cheatsOf

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#cheatsof).

Returns the game's cheats, `data.unlocks.cheats` from its content and packs, in declared order.

```ts shape
import { cheatsOf } from '@ifloom/plugin-unlocks'
function cheatsOf(game: Game): CheatDef[]
```

Uses: [`Game`](/docs/0.1.2/api/engine#game), [`CheatDef`](#cheatdef).

### CheatUse

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#cheatuse).

A use of a cheat, one entry of `UnlocksState.cheated`.

```ts shape
import type { CheatUse } from '@ifloom/plugin-unlocks'
type CheatUse = {
  cheat: string
  turn: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `cheat` | `string` |  |  | The id of the cheat used. |
| `turn` | `number` |  |  | The turn the cheat was used on. |

### CheatView

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#cheatview).

A cheat as the player sees it, in `view.plugins.unlocks.cheats`.

```ts shape
import type { CheatView } from '@ifloom/plugin-unlocks'
type CheatView = {
  id: string
  name: string
  description: string
  group: string | null
  once: 'game' | 'turn' | null
  used: number
  button: RenderedChoice
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The cheat's id. |
| `name` | `string` |  |  | The cheat's name. |
| `description` | `string` |  |  | The cheat's description, or `''` when it has none. |
| `group` | `string \| null` |  |  | The heading the cheat goes under, or null when it has none. |
| `once` | `'game' \| 'turn' \| null` |  |  | The cheat's `once` limit, `'game'` or `'turn'`, or null when it can be used any number of times. |
| `used` | `number` |  |  | The number of times this save has used the cheat. |
| `button` | [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice) |  |  | The cheat's button. It's refused with its reason while a `blocked` entry holds, or once a `once` cheat is used. |

### codeFits

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#codefits).

Returns true when the code is the unlock's code.

```ts shape
import { codeFits } from '@ifloom/plugin-unlocks'
function codeFits(code: string, game: string, def: UnlockDef): Promise<boolean>
```

Uses: [`UnlockDef`](#unlockdef).

### contentScript

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#contentscript).

Returns the script `ifloom build` puts in the page's head, which holds the encrypted content by unlock.

```ts shape
import { contentScript } from '@ifloom/plugin-unlocks'
function contentScript(locked: readonly LockedContent[]): string
```

Uses: [`LockedContent`](#lockedcontent).

### enterCode

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#entercode).

Returns the unlock a code opens, checked against every unlock on a runner `startUnlocks` was started on, or the
reason it opens none. It never throws.

The profile remembers a code that works, and the game in play records its unlock. The runner's snapshot reports the
check at `helpers.unlocks` while it runs and after.

```ts shape
import { enterCode } from '@ifloom/plugin-unlocks'
function enterCode(runner: Runner, code: string): Promise<Result<Entered>>
```

Uses: [`Runner`](/docs/0.1.2/api/engine#runner), [`Result`](/docs/0.1.2/api/engine#result), [`Entered`](#entered).

### Entered

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#entered).

The unlock a code opened, as `enterCode` returns it.

```ts shape
import type { Entered } from '@ifloom/plugin-unlocks'
type Entered = {
  unlock: string
  name: string
  already: boolean
  restart: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `unlock` | `string` |  |  | The unlock's id. |
| `name` | `string` |  |  | The unlock's name. |
| `already` | `boolean` |  |  | True when the unlock was open already, so the code worked and changed nothing. |
| `restart` | `boolean` |  |  | True when the unlock has packs the game in play doesn't have yet. Reloading the page builds the game again with them. |

### envName

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#envname).

Returns the name of the environment variable `ifloom build` reads an unlock's code from, such as `IFLOOM_UNLOCK_SUPPORTER` for `supporter`.

```ts shape
import { envName } from '@ifloom/plugin-unlocks'
function envName(unlock: string): string
```

### ITERATIONS

Const. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#iterations).

The number of PBKDF2 rounds for an unlock without its own `iterations`. It makes guessing codes one by one take a long time.

```ts shape
import { ITERATIONS } from '@ifloom/plugin-unlocks'
const ITERATIONS: 600000
```

### lockContent

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#lockcontent).

Returns an unlock's packs encrypted under its code, for the page, as `ifloom build` does with each file in
`src/unlocks/`. The packs must be data, as a mod's are.

It throws when the code isn't the unlock's, so a build can't ship content no code opens, and when a pack holds a
function.

```ts shape
import { lockContent } from '@ifloom/plugin-unlocks'
function lockContent(code: string, game: string, def: UnlockDef, packs: readonly Pack[]): Promise<LockedContent>
```

Uses: [`UnlockDef`](#unlockdef), [`Pack`](/docs/0.1.2/api/engine#pack), [`LockedContent`](#lockedcontent).

### LockedContent

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#lockedcontent-1).

An unlock's encrypted packs as `ifloom build` writes them into the page.

```ts shape
import type { LockedContent } from '@ifloom/plugin-unlocks'
type LockedContent = {
  ifloomUnlock: 1
  game: string
  unlock: string
  iv: string
  data: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `ifloomUnlock` | `1` |  |  | The format of this record, 1. |
| `game` | `string` |  |  | The game's id. |
| `unlock` | `string` |  |  | The unlock's id. |
| `iv` | `string` |  |  | The AES-GCM nonce, in base64. |
| `data` | `string` |  |  | The packs as JSON, encrypted, in base64. |

### lockedContent

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#lockedcontent).

Returns the encrypted content `ifloom build` put in the page, by unlock. Returns an empty record in a page without any.

```ts shape
import { lockedContent } from '@ifloom/plugin-unlocks'
function lockedContent(): Readonly<Record<string, LockedContent>>
```

Uses: [`LockedContent`](#lockedcontent).

### normaliseCode

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#normalisecode).

Returns a code in the form the plugin checks, Unicode-normalised, without spaces or hyphens, in capitals. So
`bread-2026`, `BREAD 2026` and `Bread2026` are one code.

```ts shape
import { normaliseCode } from '@ifloom/plugin-unlocks'
function normaliseCode(code: string): string
```

### startUnlocks

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#startunlocks).

Starts code entry on a runner and returns the function that stops it. Start it once per runner, which needs a
`profile`.

It records every unlock the profile remembers into the game in play, each new game and each loaded save, so a
supporter enters a code once, and `enterCode` checks the codes the player enters. It reports an
`UnlockStatus` at `snapshot.helpers.unlocks`. Pass `content` only in tests, since it reads the page's own
otherwise.

```ts shape
import { startUnlocks } from '@ifloom/plugin-unlocks'
function startUnlocks(runner: Runner, options?: { content?: Readonly<Record<string, LockedContent>> }): () => void
```

Uses: [`Runner`](/docs/0.1.2/api/engine#runner), [`LockedContent`](#lockedcontent).

### UnlockDef

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlockdef).

An unlock the game declares in `data.unlocks.unlocks`. It holds the code's hash, never the code.

```ts shape
import type { UnlockDef } from '@ifloom/plugin-unlocks'
type UnlockDef = {
  id: string
  name: string
  description?: string
  hash: string
  salt?: string
  iterations?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The unlock's id. |
| `name` | `string` |  |  | The unlock's name, such as "Supporter edition". |
| `description` | `string` | yes |  | The unlock's description, a line for the list of unlocks. |
| `hash` | `string` |  |  | The code's hash in hex, as `ifloom unlock-hash` prints it. |
| `salt` | `string` | yes |  | The unlock's extra salt, mixed in after the game's and the unlock's ids. Changing it changes the hash without changing the code. |
| `iterations` | `number` | yes |  | The number of PBKDF2 rounds for this code. 600,000 if left out, and fewer only in tests. |

### unlockedPacks

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlockedpacks).

Returns the packs of every unlock the profile remembers, decrypted and checked that this engine can read them. Call
it before building the game, and pass them as `loadGame(content, base, { packs: unlocked.packs })`.

An unlock whose code has changed since it was entered, as in a new release with new codes, can't be opened and is
listed in `problems`. The player then enters the new code.

```ts shape
import { unlockedPacks } from '@ifloom/plugin-unlocks'
function unlockedPacks(game: string, profile: Profile, content?: Readonly<Record<string, LockedContent>>): Promise<{ packs: Pack[]; problems: string[] }>
```

Uses: [`Profile`](/docs/0.1.2/api/engine#profile), [`LockedContent`](#lockedcontent), [`Pack`](/docs/0.1.2/api/engine#pack).

### unlockHash

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlockhash).

Returns the hash of a code for an unlock, in hex, the value for the unlock's `hash`. `ifloom unlock-hash` prints
it, so you never write the code into the game.

```ts shape
import { unlockHash } from '@ifloom/plugin-unlocks'
function unlockHash(code: string, game: string, def: Pick<UnlockDef, 'id' | 'salt' | 'iterations'>): Promise<string>
```

Uses: [`UnlockDef`](#unlockdef).

### unlocks

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlocks).

The unlocks plugin's factory, with its helpers as properties. `unlocks()` returns the plugin for the game's
`plugins`, and content calls helpers such as `unlocks.has('supporter')` and `unlocks.cheat('rich')`.

```ts shape
import { unlocks } from '@ifloom/plugin-unlocks'
function unlocks(): DefinedPlugin<UnlocksState, UnlocksView>
```

Uses: [`DefinedPlugin`](/docs/0.1.2/api/engine-plugin#definedplugin), [`UnlocksState`](#unlocksstate), [`UnlocksView`](#unlocksview).

| Helper | Signature | Description |
|---|---|---|
| `unlocks.has` | `(unlock: string):` [`Condition`](/docs/0.1.2/api/engine#condition) | Returns the `unlocks/has` condition, which holds once this save records the unlock. |
| `unlocks.record` | `(unlock: string):` [`CommandRef`](/docs/0.1.2/api/engine#commandref) | Returns the `unlocks/record` command, which records the unlock in this save. `startUnlocks` sends it. |
| `unlocks.cheat` | `(cheat: string):` [`CommandRef`](/docs/0.1.2/api/engine#commandref) | Returns the `unlocks/cheat` command, which runs the cheat's effects through any lock and logs the use. |
| `unlocks.cheated` | `(cheat?: string):` [`Condition`](/docs/0.1.2/api/engine#condition) | Returns the `unlocks/cheated` condition, which holds once this save has used the cheat, or any cheat when none is named. |

### unlocksOf

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlocksof).

Returns the game's unlocks, from `data.unlocks.unlocks` in its content and packs.

```ts shape
import { unlocksOf } from '@ifloom/plugin-unlocks'
function unlocksOf(game: Game): UnlockDef[]
```

Uses: [`Game`](/docs/0.1.2/api/engine#game), [`UnlockDef`](#unlockdef).

### UnlocksProfile

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlocksprofile).

The record the plugin keeps in the player's profile, under `unlocks`. It never holds a code.

```ts shape
import type { UnlocksProfile } from '@ifloom/plugin-unlocks'
type UnlocksProfile = {
  unlocked: Record<string, { proof: string }>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `unlocked` | `Record<string, { proof: string }>` |  |  | The proof made from each code that worked, in hex, by unlock id. |

### UnlocksState

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlocksstate).

The unlocks and cheat uses a save keeps. The plugin reads the unlocks and cheats themselves from content.

```ts shape
import type { UnlocksState } from '@ifloom/plugin-unlocks'
type UnlocksState = {
  unlocked: string[]
  cheated: CheatUse[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `unlocked` | `string[]` |  |  | The ids of the unlocks recorded in this save, in the order they were recorded. |
| `cheated` | [`CheatUse[]`](#cheatuse) |  |  | The save's uses of cheats, oldest first. |

### UnlockStatus

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlockstatus).

The state of code entry that `startUnlocks` reports in the runner's snapshot, at `snapshot.helpers.unlocks`.

```ts shape
import type { UnlockStatus } from '@ifloom/plugin-unlocks'
type UnlockStatus = {
  status: 'idle' | 'checking' | 'wrong' | 'unlocked'
  reason: string | null
  entered: Entered | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `status` | `'idle' \| 'checking' \| 'wrong' \| 'unlocked'` |  |  | The state of code entry, `checking`, `wrong`, `unlocked` or `idle`. It's `wrong` when the last code didn't work and `unlocked` when it did. It's `checking` while a code is checked, slowly on purpose, and while the profile's remembered codes are checked at start. |
| `reason` | `string \| null` |  |  | The reason the last code didn't work while `status` is `wrong`, else null. |
| `entered` | [`Entered`](#entered) `\| null` |  |  | The unlock the last code opened while `status` is `unlocked`, else null. |

### UnlocksView

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlocksview).

The unlocks and cheats as the player sees them, in `view.plugins.unlocks`.

```ts shape
import type { UnlocksView } from '@ifloom/plugin-unlocks'
type UnlocksView = {
  unlocks: UnlockView[]
  unlocked: number
  total: number
  cheats: CheatView[]
  cheated: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `unlocks` | [`UnlockView[]`](#unlockview) |  |  | The game's unlocks, in the order the game declares them. |
| `unlocked` | `number` |  |  | The number of unlocks this save records. |
| `total` | `number` |  |  | The number of unlocks the game declares. |
| `cheats` | [`CheatView[]`](#cheatview) |  |  | The cheats the player can see, in the order the game declares them. A cheat refused by an entry with `hide` is left out. |
| `cheated` | `number` |  |  | The number of cheat uses in this save, counting every cheat. |

### UnlockView

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlockview).

An unlock as the player sees it, in `view.plugins.unlocks.unlocks`.

```ts shape
import type { UnlockView } from '@ifloom/plugin-unlocks'
type UnlockView = {
  id: string
  name: string
  description: string
  unlocked: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The unlock's id. |
| `name` | `string` |  |  | The unlock's name. |
| `description` | `string` |  |  | The unlock's description, or `''` when it has none. |
| `unlocked` | `boolean` |  |  | True when this save records the unlock. |

## @ifloom/plugin-unlocks/react

- Functions: [`unlocksUiWith`](#unlocksuiwith), [`useCheats`](#usecheats), [`useUnlocks`](#useunlocks)
- Constants: [`CheatPanel`](#cheatpanel), [`CheatsButton`](#cheatsbutton), [`UNLOCKS_WORDS`](#unlocks_words), [`UnlocksPanel`](#unlockspanel), [`unlocksUi`](#unlocksui)
- Types: [`CheatGroup`](#cheatgroup), [`CheatsControls`](#cheatscontrols), [`UnlocksControls`](#unlockscontrols), [`UnlocksUiOptions`](#unlocksuioptions)

### CheatGroup

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#cheatgroup).

A group of the cheats panel, a heading and the cheats under it. The cheats with no group form one with a null name.

```ts shape
import type { CheatGroup } from '@ifloom/plugin-unlocks/react'
type CheatGroup = {
  name: string | null
  cheats: CheatView[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string \| null` |  |  | The group's heading, or null for the cheats with no group. |
| `cheats` | [`CheatView[]`](#cheatview) |  |  | The group's cheats, in the order the game declares them. |

### CheatPanel

Const. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#cheatpanel).

Renders the cheats from `view.plugins.unlocks.cheats` under their groups' headings, each with its button, its
description and its use count. A preset styles its `cheats`, `cheats-group`, `cheats-group-title`, `cheat`,
`cheat-text` and `cheat-used` parts.

A refused cheat's button is disabled with its reason, such as a supporter cheat before the unlock or a `once`
cheat after its use. It renders nothing while the player can see no cheat.

```ts shape
import { CheatPanel } from '@ifloom/plugin-unlocks/react'
const CheatPanel: ComponentType<{ className?: string; }>
```

### CheatsButton

Const. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#cheatsbutton).

Renders the button that opens the `CheatPanel` in a dialog. A preset styles its `cheats-button` part.

It renders nothing in a game without the plugin, or while the player can see no cheat.

```ts shape
import { CheatsButton } from '@ifloom/plugin-unlocks/react'
const CheatsButton: ComponentType<{ className?: string; }>
```

### CheatsControls

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#cheatscontrols).

The cheats from the unlocks plugin's view, grouped, with a way to use one, as `useCheats` returns them.

```ts shape
import type { CheatsControls } from '@ifloom/plugin-unlocks/react'
type CheatsControls = {
  cheats: CheatView[]
  cheated: number
  groups: CheatGroup[]
  use: (cheat: string) => Result<GameState>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `cheats` | [`CheatView[]`](#cheatview) |  |  | The cheats the player can see, in the order the game declares them. |
| `cheated` | `number` |  |  | The number of cheat uses in this save, counting every cheat. |
| `groups` | [`CheatGroup[]`](#cheatgroup) |  |  | The cheats grouped by their `group`, the ungrouped ones first, then each group in the order it first appears. |
| `use` | `(cheat: string) =>` [`Result`](/docs/0.1.2/api/engine#result)`<`[`GameState`](/docs/0.1.2/api/engine#gamestate)`>` |  |  | Sends the `unlocks/cheat` command for the cheat. A refused use returns the reason its button gives. |

### UNLOCKS_WORDS

Const. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlocks_words).

The unlocks plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings.

```ts shape
import { UNLOCKS_WORDS } from '@ifloom/plugin-unlocks/react'
const UNLOCKS_WORDS: {
  cheatUsedOnce: 'Used once'
  cheatUsedTimes: 'Used {n} times'
  cheats: 'Cheats'
  checkingCode: 'Checking…'
  code: 'Code'
  enterCode: 'Enter a code'
  locked: 'Locked'
  restartForUnlock: 'Restart to add it'
  unlock: 'Unlock'
  unlocked: 'Unlocked'
  unlockedAlready: '{label} was unlocked already.'
  unlockedNow: 'Unlocked: {label}.'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `cheatUsedOnce` | `'Used once'` |  |  | The note on a cheat the player has used once. |
| `cheatUsedTimes` | `'Used {n} times'` |  |  | The note on a cheat the player has used more than once, with `{n}` uses. |
| `cheats` | `'Cheats'` |  |  | The label of the cheats button and the title of its dialog. |
| `checkingCode` | `'Checking…'` |  |  | The label of the unlock button while a code is checked. |
| `code` | `'Code'` |  |  | The placeholder and the screen readers' label of the code box. |
| `enterCode` | `'Enter a code'` |  |  | The heading over the code box, and the label of the menu button that opens it without pages. |
| `locked` | `'Locked'` |  |  | The state of an unlock the player hasn't opened. |
| `restartForUnlock` | `'Restart to add it'` |  |  | The label of the button that restarts the game to add the packs a code opened. |
| `unlock` | `'Unlock'` |  |  | The label of the button that checks the code. |
| `unlocked` | `'Unlocked'` |  |  | The state of an unlock the player has opened. |
| `unlockedAlready` | `'{label} was unlocked already.'` |  |  | The message for a code that opened an unlock the player had already, with its `{label}`. |
| `unlockedNow` | `'Unlocked: {label}.'` |  |  | The message for a code that has just opened an unlock, with its `{label}`. |

### UnlocksControls

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlockscontrols).

The unlocks plugin's view with the code box's state and a function that enters a code, as `useUnlocks` returns it.

```ts shape
import type { UnlocksControls } from '@ifloom/plugin-unlocks/react'
type UnlocksControls = {
  unlocks: UnlockView[]
  unlocked: number
  total: number
  cheats: CheatView[]
  cheated: number
  available: boolean
  enter: (code: string) => Promise<boolean>
  checking: boolean
  entered: Entered | null
  message: string | null
  restart: (() => void) | undefined
  problems: string[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `unlocks` | [`UnlockView[]`](#unlockview) |  |  | The game's unlocks, in the order the game declares them. |
| `unlocked` | `number` |  |  | The number of unlocks this save records. |
| `total` | `number` |  |  | The number of unlocks the game declares. |
| `cheats` | [`CheatView[]`](#cheatview) |  |  | The cheats the player can see, in the order the game declares them. A cheat refused by an entry with `hide` is left out. |
| `cheated` | `number` |  |  | The number of cheat uses in this save, counting every cheat. |
| `available` | `boolean` |  |  | True when code entry has started on the runner, which the unlocks UI does. |
| `enter` | `(code: string) => Promise<boolean>` |  |  | Checks a code with `enterCode` and resolves true when it opened an unlock. `entered` then names it, or `message` gives the reason it didn't. |
| `checking` | `boolean` |  |  | True while a code is checked, slowly on purpose, from the snapshot's `helpers.unlocks.status`. |
| `entered` | [`Entered`](#entered) `\| null` |  |  | The unlock the last code opened, or null. |
| `message` | `string \| null` |  |  | The reason the last code didn't work, or null. |
| `restart` | `(() => void) \| undefined` |  |  | The function that builds the game again with the packs a code just opened, `onChange` from `unlocksUiWith`. It is undefined unless the last code needs it. |
| `problems` | `string[]` |  |  | The problems opening the packs the profile remembers, such as a code that has changed since. |

### UnlocksPanel

Const. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlockspanel).

Renders the code box and the list of unlocks from `view.plugins.unlocks`. It shows the unlock a code opened, or why
the code failed.

A restart button shows when the code opened packs the game in play doesn't have yet.

The unlocks UI puts it on the settings page, or in the menu without pages. A preset can style the parts `unlocks`,
`unlocks-title`, `unlock-form`, `unlock-input`, `unlocks-message`, `unlocks-entered`, `unlock-problem`,
`unlocks-list`, `unlock`, `unlock-name`, `unlock-state` and `unlock-text`.

```ts shape
import { UnlocksPanel } from '@ifloom/plugin-unlocks/react'
const UnlocksPanel: ComponentType<{ className?: string; }>
```

### unlocksUi

Const. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlocksui).

The unlocks plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It puts the `UnlocksPanel` on the
settings page, and the `CheatsButton` in the sidebar.

Without pages, the `UnlocksPanel` is behind a menu button. The `CheatsButton` opens the `CheatPanel`. Each renders
nothing while the game has no unlocks, or the player can see no cheat. It also starts code entry on the runner.

`unlocksUiWith` returns the same UI with problems and a restart.

```ts shape
import { unlocksUi } from '@ifloom/plugin-unlocks/react'
const unlocksUi: PluginUi
```

Uses: [`PluginUi`](/docs/0.1.2/api/react-kit#pluginui).

### UnlocksUiOptions

Type. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlocksuioptions).

Settings for `unlocksUiWith`. Without them, the UI shows no problems and offers no restart.

```ts shape
import type { UnlocksUiOptions } from '@ifloom/plugin-unlocks/react'
type UnlocksUiOptions = {
  problems?: string[]
  onChange?: () => void
  start?: (runner: Runner) => () => void
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `problems` | `string[]` | yes |  | The `problems` from `unlockedPacks`, shown under the code box. |
| `onChange` | `() => void` | yes |  | The function that builds the game again with the packs a code has just opened, such as `() => location.reload()`. |
| `start` | `(runner:` [`Runner`](/docs/0.1.2/api/engine#runner)`) => () => void` | yes |  | The function that starts code entry on the runner and returns the function that stops it. `startUnlocks` if left out. |

### unlocksUiWith

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#unlocksuiwith).

Returns the unlocks plugin's React UI with settings. It shows the `problems` from `unlockedPacks` under the code box.

Its restart button calls `onChange` once a code has opened packs the game in play doesn't have yet.

```ts shape
import { unlocksUiWith } from '@ifloom/plugin-unlocks/react'
function unlocksUiWith(options?: UnlocksUiOptions): PluginUi
```

Uses: [`UnlocksUiOptions`](#unlocksuioptions), [`PluginUi`](/docs/0.1.2/api/react-kit#pluginui).

### useCheats

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#usecheats).

Returns the cheats from the unlocks plugin's view, their groups and their command from the running game, or null in
a game without the plugin. It re-renders when the view changes. `CheatPanel` renders from it.

```ts shape
import { useCheats } from '@ifloom/plugin-unlocks/react'
function useCheats(): CheatsControls | null
```

Uses: [`CheatsControls`](#cheatscontrols).

### useUnlocks

Function. Explained in [Unlocks and cheats](/docs/0.1.2/reference/plugins/unlocks#useunlocks).

Returns the unlocks plugin's view and the code box's state from the running game, or null in a game without the
plugin. It re-renders when the view or the snapshot's `helpers.unlocks` changes.

Before code entry has started on the runner, `available` is false and the list of unlocks still shows.

```ts shape
import { useUnlocks } from '@ifloom/plugin-unlocks/react'
function useUnlocks(): UnlocksControls | null
```

Uses: [`UnlocksControls`](#unlockscontrols).
