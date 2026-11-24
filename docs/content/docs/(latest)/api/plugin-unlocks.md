---
title: "@ifloom/plugin-unlocks"
description: "Every export of @ifloom/plugin-unlocks and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-unlocks` and `@ifloom/plugin-unlocks/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-unlocks

- Functions: [`codeFits`](#codefits), [`contentScript`](#contentscript), [`enterCode`](#entercode), [`envName`](#envname), [`lockContent`](#lockcontent), [`lockedContent`](#lockedcontent-1), [`normaliseCode`](#normalisecode), [`startUnlocks`](#startunlocks), [`unlockedPacks`](#unlockedpacks), [`unlockHash`](#unlockhash), [`unlocks`](#unlocks), [`unlocksOf`](#unlocksof)
- Constants: [`ITERATIONS`](#iterations)
- Types: [`Entered`](#entered), [`LockedContent`](#lockedcontent), [`UnlockDef`](#unlockdef), [`UnlocksProfile`](#unlocksprofile), [`UnlocksState`](#unlocksstate), [`UnlockStatus`](#unlockstatus), [`UnlocksView`](#unlocksview), [`UnlockView`](#unlockview)

### codeFits

Function. Explained in [Unlocks](/docs/plugins/unlocks#the-functions-behind-it).

Whether this is the unlock's code.

```ts shape
import { codeFits } from '@ifloom/plugin-unlocks'
function codeFits(code: string, game: string, def: UnlockDef): Promise<boolean>
```

### contentScript

Function. Explained in [Unlocks](/docs/plugins/unlocks#the-functions-behind-it).

The script `ifloom build` puts in the page's head: the encrypted content, by unlock.

```ts shape
import { contentScript } from '@ifloom/plugin-unlocks'
function contentScript(locked: readonly LockedContent[]): string
```

### enterCode

Function. Explained in [Unlocks](/docs/plugins/unlocks#entercode).

Try a code against every unlock, on a runner `startUnlocks` was started on:
what it unlocked, or why not. One that works is remembered in the profile
and recorded in the game in play. While it is checked, and after, the
runner's snapshot says so at `helpers.unlocks`. Never throws.

```ts shape
import { enterCode } from '@ifloom/plugin-unlocks'
function enterCode(runner: Runner, code: string): Promise<Result<Entered>>
```

### Entered

Type. Explained in [Unlocks](/docs/plugins/unlocks#entered).

What a code that worked unlocked.

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
| `name` | `string` |  |  | Its name. |
| `already` | `boolean` |  |  | It was unlocked already: the code worked, and nothing changed. |
| `restart` | `boolean` |  |  | It has content the game in play doesn't have yet: build the game again (reload the page) to add it. |

### envName

Function. Explained in [Unlocks](/docs/plugins/unlocks#the-functions-behind-it).

The environment variable `ifloom build` reads an unlock's code from: `IFLOOM_UNLOCK_SUPPORTER` for `supporter`.

```ts shape
import { envName } from '@ifloom/plugin-unlocks'
function envName(unlock: string): string
```

### ITERATIONS

Const.

PBKDF2's rounds when an unlock doesn't say: slow enough that guessing codes one by one takes a long time.

```ts shape
import { ITERATIONS } from '@ifloom/plugin-unlocks'
const ITERATIONS: 600000
```

### lockContent

Function. Explained in [Unlocks](/docs/plugins/unlocks#the-functions-behind-it).

Encrypt an unlock's packs under its code, for the page: what `ifloom build`
does with each file in `src/unlocks/`. The packs must be data, as a mod's
are. Throws if the code isn't the unlock's, so a build can't ship content
no code opens.

```ts shape
import { lockContent } from '@ifloom/plugin-unlocks'
function lockContent(code: string, game: string, def: UnlockDef, packs: readonly Pack[]): Promise<LockedContent>
```

### LockedContent

Type. Explained in [Unlocks](/docs/plugins/unlocks#lockedcontent).

An unlock's content, encrypted, as `ifloom build` writes it into the page.

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
| `ifloomUnlock` | `1` |  |  | The format of this file: 1. |
| `game` | `string` |  |  | The game's id. |
| `unlock` | `string` |  |  | The unlock's id. |
| `iv` | `string` |  |  | AES-GCM's nonce, in base64. |
| `data` | `string` |  |  | The packs as JSON, encrypted, in base64. |

### lockedContent

Function. Explained in [Unlocks](/docs/plugins/unlocks#the-functions-behind-it).

The encrypted content the page holds, by unlock: what `ifloom build` put there. Empty in a page without any.

```ts shape
import { lockedContent } from '@ifloom/plugin-unlocks'
function lockedContent(): Readonly<Record<string, LockedContent>>
```

### normaliseCode

Function.

A code as it is checked: Unicode-normalised, with spaces and hyphens taken
out, in capitals. So `bread-2026`, `BREAD 2026` and `Bread2026` are one code.

```ts shape
import { normaliseCode } from '@ifloom/plugin-unlocks'
function normaliseCode(code: string): string
```

### startUnlocks

Function. Explained in [Unlocks](/docs/plugins/unlocks#startunlocks).

Codes in a running game, shaped like `startClock`: one call that returns
the way to stop. From then on it records every unlock the profile
remembers into the game in play and into each new game and loaded save, so
a supporter enters a code once, and `enterCode` checks the codes the player
enters. Where it stands is in the runner's snapshot, as an `UnlockStatus`
at `snapshot.helpers.unlocks`. Needs the runner's `profile`. Pass `content`
only in tests: the page's own is read otherwise. Start it once per runner.

```ts shape
import { startUnlocks } from '@ifloom/plugin-unlocks'
function startUnlocks(runner: Runner, options?: { content?: Readonly<Record<string, LockedContent>> }): () => void
```

### UnlockDef

Type. Explained in [Unlocks](/docs/plugins/unlocks#unlockdef).

An unlock, as content declares it in a pack's `data.unlocks.unlocks`.

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
| `id` | `string` |  |  |  |
| `name` | `string` |  |  | Its name for the player: "Supporter edition". |
| `description` | `string` | yes |  | What it opens, for the list of unlocks. |
| `hash` | `string` |  |  | The code's hash, in hex, as `ifloom unlock-hash` prints it. Never the code. |
| `salt` | `string` | yes |  | Extra salt for the hash, mixed in after the game's and the unlock's ids. Change it to change the hash without changing the code. |
| `iterations` | `number` | yes |  | PBKDF2's rounds for this code. 600,000 if left out; fewer only in tests. |

### unlockedPacks

Function. Explained in [Unlocks](/docs/plugins/unlocks#unlockedpacks).

The content of every unlock the profile remembers, decrypted and checked
that this engine can read it, to load over the game's content (which
upgrades it). Call it before
building the game: `loadGame(content, base, { packs: unlocked.packs })`. An
unlock whose code has changed since (a new release with new codes) can't be
opened, and is listed in `problems`; the player enters the new code.

```ts shape
import { unlockedPacks } from '@ifloom/plugin-unlocks'
function unlockedPacks(game: string, profile: Profile, content?: Readonly<Record<string, LockedContent>>): Promise<{ packs: Pack[]; problems: string[] }>
```

### unlockHash

Function. Explained in [Unlocks](/docs/plugins/unlocks#the-functions-behind-it).

The hash of a code for an unlock, in hex: what goes in the unlock's `hash`.
`ifloom unlock-hash` prints it, so you never write the code into the game.

```ts shape
import { unlockHash } from '@ifloom/plugin-unlocks'
function unlockHash(code: string, game: string, def: Pick<UnlockDef, 'id' | 'salt' | 'iterations'>): Promise<string>
```

### unlocks

Function. Explained in [Unlocks](/docs/plugins/unlocks#unlocks).

The plugin, with its helpers on it: `unlocks()` makes the plugin for the
game's `plugins`, and content is written with `unlocks.has('supporter')`.

```ts shape
import { unlocks } from '@ifloom/plugin-unlocks'
function unlocks(): DefinedPlugin<UnlocksState, UnlocksView>
```

| Helper | Signature | Description |
|---|---|---|
| `unlocks.has` | `(unlock: string): Condition` |  |
| `unlocks.record` | `(unlock: string): CommandRef` |  |

### unlocksOf

Function. Explained in [Unlocks](/docs/plugins/unlocks#the-functions-behind-it).

The game's unlocks: `data.unlocks.unlocks`, from its packs.

```ts shape
import { unlocksOf } from '@ifloom/plugin-unlocks'
function unlocksOf(game: Game): UnlockDef[]
```

### UnlocksProfile

Type. Explained in [Unlocks](/docs/plugins/unlocks#unlocksprofile).

What the plugin keeps in the player's profile, under `unlocks`: a proof made from each code that worked, in hex. Never the code.

```ts shape
import type { UnlocksProfile } from '@ifloom/plugin-unlocks'
type UnlocksProfile = {
  unlocked: Record<string, { proof: string }>
}
```

### UnlocksState

Type. Explained in [Unlocks](/docs/plugins/unlocks#unlocksstate).

What the plugin keeps in a save: the unlocks recorded in it, in the order they were.

```ts shape
import type { UnlocksState } from '@ifloom/plugin-unlocks'
type UnlocksState = {
  unlocked: string[]
}
```

### UnlockStatus

Type. Explained in [Unlocks](/docs/plugins/unlocks#unlockstatus).

Where entering codes stands, as `startUnlocks` reports it in the runner's
snapshot, at `snapshot.helpers.unlocks`, so every UI reads it the same way.

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
| `status` | `'idle' \| 'checking' \| 'wrong' \| 'unlocked'` |  |  | `checking` while a code is checked (which takes a moment on purpose) and while the codes the profile remembers are, as codes start; `wrong` when the last code didn't work; `unlocked` when it did; `idle` otherwise. |
| `reason` | `string \| null` |  |  | Why the last code didn't work, while `status` is `wrong`; null otherwise. |
| `entered` | `Entered \| null` |  |  | What the last code unlocked, while `status` is `unlocked`; null otherwise. |

### UnlocksView

Type. Explained in [Unlocks](/docs/plugins/unlocks#unlocksview).

What the UI reads at `view.plugins.unlocks`.

```ts shape
import type { UnlocksView } from '@ifloom/plugin-unlocks'
type UnlocksView = {
  unlocks: UnlockView[]
  unlocked: number
  total: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `unlocks` | `UnlockView[]` |  |  | Every unlock, in the order the game declares them. |
| `unlocked` | `number` |  |  | How many are unlocked. |
| `total` | `number` |  |  | How many unlocks the game declares. |

### UnlockView

Type. Explained in [Unlocks](/docs/plugins/unlocks#unlockview).

An unlock as the UI shows it.

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
| `id` | `string` |  |  |  |
| `name` | `string` |  |  |  |
| `description` | `string` |  |  | What it opens, as the player reads it; `''` with none. |
| `unlocked` | `boolean` |  |  | Recorded in this save. |

## @ifloom/plugin-unlocks/react

- Functions: [`unlocksUiWith`](#unlocksuiwith), [`useUnlocks`](#useunlocks)
- Constants: [`UNLOCKS_WORDS`](#unlocks_words), [`UnlocksPanel`](#unlockspanel), [`unlocksUi`](#unlocksui)
- Types: [`UnlocksControls`](#unlockscontrols), [`UnlocksUiOptions`](#unlocksuioptions)

### UNLOCKS_WORDS

Const.

The unlocks plugin's words, in English. A game rewords any with `ui.<key>` in its strings.

```ts shape
import { UNLOCKS_WORDS } from '@ifloom/plugin-unlocks/react'
const UNLOCKS_WORDS: {
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

### UnlocksControls

Type.

What `useUnlocks` returns: the unlocks plugin's view, and entering a code.

```ts shape
import type { UnlocksControls } from '@ifloom/plugin-unlocks/react'
type UnlocksControls = {
  unlocks: UnlockView[]
  unlocked: number
  total: number
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
| `unlocks` | `UnlockView[]` |  |  | Every unlock, in the order the game declares them. |
| `unlocked` | `number` |  |  | How many are unlocked. |
| `total` | `number` |  |  | How many unlocks the game declares. |
| `available` | `boolean` |  |  | Whether codes can be entered: codes have started on the runner (the unlocks UI starts them). |
| `enter` | `(code: string) => Promise<boolean>` |  |  | Try a code with `enterCode`. True if it unlocked something; `entered` says what, or `message` why not. |
| `checking` | `boolean` |  |  | True while a code is being checked, which takes a moment on purpose: the snapshot's `helpers.unlocks.status`. |
| `entered` | `Entered \| null` |  |  | What the last code unlocked, or null. |
| `message` | `string \| null` |  |  | Why the last code didn't work, or null. |
| `restart` | `(() => void) \| undefined` |  |  | Build the game again with what a code just opened: `onChange` from `unlocksUiWith`, when the last code needs it. Undefined otherwise. |
| `problems` | `string[]` |  |  | What couldn't be opened of the content the profile remembers (a code that has changed since). |

### UnlocksPanel

Const. Explained in [Unlocks](/docs/plugins/unlocks#unlockspanel).

Entering a code, and the game's unlocks with which are unlocked: a box and
a button, what the code unlocked or why it didn't, a button to restart
when the code opened content the game in play doesn't have yet, and the
list. On the settings page, and in the menu without pages, when the game
lists the unlocks UI. A thin default on `useUnlocks`.

```ts shape
import { UnlocksPanel } from '@ifloom/plugin-unlocks/react'
const UnlocksPanel: ComponentType<{ className?: string; }>
```

### unlocksUi

Const. Explained in [Unlocks](/docs/plugins/unlocks#unlocksui).

The unlocks plugin's React UI, for `plugins` on `mountGame` or
`GameProvider`: codes start on the runner, and the `UnlocksPanel` is on
the settings page (with pages on) or behind an Enter a code button in the
menu. `unlocksUiWith` takes the problems and a restart.

```ts shape
import { unlocksUi } from '@ifloom/plugin-unlocks/react'
const unlocksUi: PluginUi
```

### UnlocksUiOptions

Type. Explained in [Unlocks](/docs/plugins/unlocks#unlocksuioptions).

What `unlocksUiWith` takes: what went wrong opening remembered content, and how to start over with new content.

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
| `problems` | `string[]` | yes |  | What `unlockedPacks` said it couldn't open, shown under the code box. |
| `onChange` | `() => void` | yes |  | Build the game again with the content a code has just opened: usually `() => location.reload()`. |
| `start` | `(runner: Runner) => () => void` | yes |  | How codes start on the runner: `startUnlocks` if left out. Returns the way to stop them. |

### unlocksUiWith

Function. Explained in [Unlocks](/docs/plugins/unlocks#unlocksuiwith).

The unlocks plugin's React UI with options: what `unlockedPacks` couldn't
open, shown under the code box, and `onChange`, which a Restart button
calls once a code has opened content the game in play doesn't have yet.

```ts shape
import { unlocksUiWith } from '@ifloom/plugin-unlocks/react'
function unlocksUiWith(options?: UnlocksUiOptions): PluginUi
```

### useUnlocks

Function. Explained in [Unlocks](/docs/plugins/unlocks#useunlocks).

The unlocks plugin's view and the code box's state, or null in a game
without the plugin. Where entering stands comes from the runner's
snapshot (`helpers.unlocks`, which `startUnlocks` reports), so it reads the
same in every component. Without codes started on the runner (the unlocks
UI starts them), `available` is false and the list still shows.
`UnlocksPanel` is drawn from it.

```ts shape
import { useUnlocks } from '@ifloom/plugin-unlocks/react'
function useUnlocks(): UnlocksControls | null
```
