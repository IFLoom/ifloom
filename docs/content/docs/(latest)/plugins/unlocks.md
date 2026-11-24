---
title: "Unlocks"
description: "Codes the player enters to unlock cheats, scenes and whole packs of content, with the content encrypted in the build so it can't be read without the code."
---
`@ifloom/plugin-unlocks` lets the player enter a code, such as the one a game's supporters get, to unlock things. An unlock can open a cheat or a scene through the `unlocks/has` condition. It can also carry content of its own: packs that `ifloom build` encrypts with a key only the code can make, so the shipped game can't be read or patched open without it.

The game never contains a code. It has a slow hash of each one, which can check a code but can't give it back. A code that works is remembered in the player's [profile](/docs/reference/profile), so it outlives saves and new games, and is entered once.

```ts
import { unlocks, startUnlocks, enterCode, unlockedPacks, unlocksOf, unlockHash, codeFits, normaliseCode, envName, lockContent, contentScript, lockedContent, ITERATIONS, type UnlockDef, type UnlocksState, type UnlocksProfile, type UnlocksView, type UnlockView, type UnlockStatus, type Entered, type LockedContent } from '@ifloom/plugin-unlocks'
```

[Supporter content and cheats](/docs/recipes/supporter-content) puts it together for a game funded by supporters, and says what each kind of gate protects.

## What it protects

- **Locked content is protected.** A pack in `src/unlocks/` ships only encrypted (AES-GCM, under a key derived from the code). Without the code, nobody can read it or switch it on by editing the game.
- **A condition gate only deters.** `unlocks/has` reads the save. A cheat or a choice behind it is in the game's code, so anyone who edits the code or the save can open it.
- **A code can be shared.** Nothing checks who enters it, and there's no server. Give each release new codes, as [the recipe](/docs/recipes/supporter-content#a-release) shows.

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-unlocks": "^0.0.0"
  }
}
```

Then add `unlocks()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details. It needs no other plugin. The [cheats plugin](/docs/plugins/cheats#supporter-cheats) cooperates with it by name.

Codes are checked with WebCrypto (`crypto.subtle`), which every current browser has, on a page opened from disk too, and Node 20 and later.

## unlocks

```ts shape
function unlocks(): DefinedPlugin<UnlocksState, UnlocksView>
```

Builds the plugin, with the id `unlocks`. A new game has nothing unlocked.

## Writing unlocks

Unlocks are content. They go in your content's [`data`](/docs/reference/loader#content) under `unlocks.unlocks` (the plugin's id, then [its list](/docs/reference/loader#plugin-data) of unlocks). This is the showcase's one:

```ts
import type { Content } from '@ifloom/engine'
import type { UnlockDef } from '@ifloom/plugin-unlocks'

const supporter: UnlockDef = {
  id: 'supporter',
  name: 'Supporter edition',
  description: 'A thank-you scene in the café, and the Full energy cheat.',
  // From `ifloom unlock-hash supporter`. The code itself is in .env, never here.
  hash: '7b141ff9f5210e0e3064dd089920697c712fa1b31ff56c2e42737dcd71bbed5f',
}

const town: Content = { data: { unlocks: { unlocks: [supporter] } } }
```

### UnlockDef

```ts shape
type UnlockDef = {
  id: string
  name: string
  description?: string
  hash: string
  salt?: string
  iterations?: number
}
```

| Field | What it is |
|---|---|
| `id` | Unique among unlocks. `unlocks/has` names it by this, and its locked content is `src/unlocks/<id>.ts`. |
| `name` | Its name for the player, in the list of unlocks. |
| `description` | What it opens, under the name. |
| `hash` | The code's hash, 64 hex digits, as [`ifloom unlock-hash`](/docs/cli#ifloom-unlock-hash) prints it. |
| `salt` | Extra salt for the hash. Change it to get a new hash for the same code. |
| `iterations` | PBKDF2's rounds for this code. `600000` if left out. Use fewer only in tests. |

### Making the hash

Put the code in an environment variable named after the unlock, then ask the CLI for its hash:

```sh
# .env.local, which git leaves out
IFLOOM_UNLOCK_SUPPORTER=BREAD-2026-OVEN
```

```sh
ifloom unlock-hash supporter
```

Paste the `hash` it prints into the unlock. The hash is salted with the game's id and the unlock's id (and `salt`), so the same code gives a different hash in another game or another unlock. `envName(id)` gives the variable's name.

### Locked content

Content that only an unlock opens goes in `src/unlocks/<id>.ts`, one file per unlock, exporting a [pack](/docs/reference/loader#pack) (or a list of packs) as `default`. It's a pack rather than content because it's laid over the game, like a mod: it has an `id`, which saves record, and the `schema` it was written for. It must be data, as a [mod](/docs/reference/mods) is: scenes, prose, plugin content, no functions. `ifloom build` encrypts it under the unlock's code and puts it in the page, and refuses any import of it from your code. [The CLI](/docs/cli#locked-content) has the details.

```ts
// src/unlocks/supporter.ts
import { SCHEMA, type Pack } from '@ifloom/engine'
import { unlocks } from '@ifloom/plugin-unlocks'

const supporter: Pack = {
  id: 'supporter',
  schema: SCHEMA,
  scenes: [
    {
      id: 'cafe.back-room',
      title: 'The back room',
      drawnFrom: ['cafe'],
      weight: 5,
      when: { all: [unlocks.has('supporter'), { not: { seen: 'cafe.back-room' } }] },
      body: [{ prose: 'cafe.back-room' }],
      choices: [{ id: 'leave', label: 'Thank her and head back out', effects: [{ scene: null }] }],
    },
  ],
  prose: {
    'cafe.back-room': 'Ava lifts the counter flap and waves you through to the back room…',
  },
}

export default supporter
```

The game's own content can't point into a locked pack without a problem when the pack isn't there. Reach locked content from inside it, as this storylet does by joining a deck the base game draws from, or only behind `unlocks/has`. `ifloom check` [lists](/docs/cli#locked-content-in-a-check) any reference into locked content it finds.

Your [game module](/docs/cli#the-game-module)'s `build` takes the packs as `unlocked`, and passes them to `loadGame` as `packs`, over its content:

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { unlocks } from '@ifloom/plugin-unlocks'
import { town } from './town.ts'

export default defineGame({
  build: ({ unlocked }) => loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [unlocks()] }, { packs: unlocked }),
})
```

## Entering codes

A game with unlocks does two things at start-up. Before it builds the game, it opens the content of every unlock the player has entered a code for, with [`unlockedPacks`](#unlockedpacks). After it makes the runner, it starts taking codes with [`startUnlocks`](#startunlocks), and sends each code the player enters to [`enterCode`](#entercode). Where entering stands is in the runner's [snapshot](/docs/reference/runner#runnersnapshot), at `helpers.unlocks`, so every UI draws it the same way.

```mermaid
sequenceDiagram
  participant Page
  participant Profile
  participant Runner
  Page->>Profile: unlockedPacks(id, profile)
  Profile-->>Page: proofs of codes entered before
  Page->>Page: decrypt the page's locked content, loadGame(content, base, { packs: unlocked })
  Page->>Runner: startUnlocks(runner)
  Note over Runner: records each remembered unlock in the game in play
  Page->>Runner: enterCode(runner, code)
  Note over Runner: snapshot.helpers.unlocks is checking
  Runner->>Profile: remember the proof
  Runner->>Runner: apply unlocks/record
  Runner-->>Page: { unlock, restart }
  Note over Page: restart: reload, so the new content is loaded
```

```ts tab="Plain JS" tab-group="framework"
// src/main.ts
import { browserRunner, localStorageDriver } from '@ifloom/browser'
import { profile } from '@ifloom/engine'
import { enterCode, startUnlocks, unlockedPacks } from '@ifloom/plugin-unlocks'
import module from './game.ts'

// The profile browserRunner uses, opened before the game is built.
const opened = await unlockedPacks('small-town', profile({ id: 'small-town' }, localStorageDriver()))
const { game } = module.build({ unlocked: opened.packs })
const runner = await browserRunner(game)
startUnlocks(runner)

const form = document.body.appendChild(document.createElement('form'))
const input = form.appendChild(document.createElement('input'))
input.placeholder = 'Code'
const button = form.appendChild(document.createElement('button'))
button.textContent = 'Unlock'
const said = form.appendChild(document.createElement('p'))
form.onsubmit = async (event) => {
  event.preventDefault()
  const result = await enterCode(runner, input.value)
  if (result.ok && result.value.restart) location.reload()
}
// Where entering stands, from each snapshot: checking, wrong or unlocked.
runner.subscribe(({ helpers }) => {
  const codes = helpers.unlocks
  button.disabled = codes?.status === 'checking'
  said.textContent = codes?.status === 'wrong' ? (codes.reason ?? '') : codes?.status === 'unlocked' ? `Unlocked: ${codes.entered?.name}.` : ''
})
```

```tsx tab="React" tab-group="framework"
// src/main.tsx
import { localStorageDriver } from '@ifloom/browser'
import { createRunner, profile, saves, startingState } from '@ifloom/engine'
import { GameShell } from '@ifloom/react'
import { unlockedPacks } from '@ifloom/plugin-unlocks'
import { unlocksUiWith } from '@ifloom/plugin-unlocks/react'
import { createRoot } from 'react-dom/client'
import module from './game.ts'

const driver = localStorageDriver()
const stored = profile({ id: 'small-town' }, driver)
const opened = await unlockedPacks('small-town', stored)
const { game } = module.build({ unlocked: opened.packs })
const runner = createRunner(game, startingState(game), { saves: saves(game, driver), profile: stored })

// A code box on the settings page, and in the menu without pages.
const plugins = [unlocksUiWith({ problems: opened.problems, onChange: () => location.reload() })]
createRoot(document.getElementById('root')!).render(<GameShell runner={runner} pages={{}} plugins={plugins} />)
```

```vue tab="Vue" tab-group="framework"
<!-- src/CodeBox.vue. In src/runner.ts, build the game with unlockedPacks first, as the Plain JS tab does,
     then add startUnlocks(runner) beside startClock(runner). -->
<script setup lang="ts">
import { ref } from 'vue'
import { enterCode } from '@ifloom/plugin-unlocks'
import { runner, snapshot } from './runner.ts'

const code = ref('')
async function enter() {
  const result = await enterCode(runner, code.value)
  if (result.ok && result.value.restart) location.reload()
}
</script>

<template>
  <form v-if="snapshot.helpers.unlocks" @submit.prevent="enter">
    <input v-model="code" placeholder="Code" />
    <button :disabled="snapshot.helpers.unlocks.status === 'checking'">Unlock</button>
    <p v-if="snapshot.helpers.unlocks.status === 'wrong'">{{ snapshot.helpers.unlocks.reason }}</p>
    <p v-if="snapshot.helpers.unlocks.status === 'unlocked'">Unlocked: {{ snapshot.helpers.unlocks.entered?.name }}.</p>
  </form>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/CodeBox.svelte. In src/runner.ts, build the game with unlockedPacks first, as the Plain JS tab does,
     then add startUnlocks(runner) beside startClock(runner). -->
<script lang="ts">
  import { enterCode } from '@ifloom/plugin-unlocks'
  import { runner, snapshot } from './runner.ts'

  let code = $state('')
  const codes = $derived($snapshot.helpers.unlocks)
  async function enter(event: SubmitEvent) {
    event.preventDefault()
    const result = await enterCode(runner, code)
    if (result.ok && result.value.restart) location.reload()
  }
</script>

{#if codes}
  <form onsubmit={enter}>
    <input bind:value={code} placeholder="Code" />
    <button disabled={codes.status === 'checking'}>Unlock</button>
    {#if codes.status === 'wrong'}<p>{codes.reason}</p>{/if}
    {#if codes.status === 'unlocked'}<p>Unlocked: {codes.entered?.name}.</p>{/if}
  </form>
{/if}
```

The plugin's [React UI](#drawing-it) draws the code box for you with [`UnlocksPanel`](#unlockspanel) when the game lists `unlocksUi`, or `unlocksUiWith(...)` as above, in `plugins` on `GameShell`, `GameProvider` or `mountGame`.

### unlockedPacks

```ts shape
function unlockedPacks(
  game: string,
  profile: Profile,
  content?: Readonly<Record<string, LockedContent>>,
): Promise<{ packs: Pack[]; problems: string[] }>
```

The content of every unlock the profile remembers a code for, decrypted and checked that this engine can read its schema, ready to pass to `loadGame` as `packs`, over the game's content. `loadGame` upgrades it with [`upgradePack`](/docs/reference/loader#upgradepack), with the game's plugins. `content` is the page's, from [`lockedContent`](#lockedcontent), unless you pass it (in a test, say).

Call it before you build the game, with the game's id and its profile. [`profile`](/docs/reference/profile#profile) reads only the id, so `profile({ id: 'small-town' }, driver)` opens it before the game exists. Use the same driver the runner will use.

Content that won't open is left out and listed in `problems` as `unlock:<id> · its code has changed since it was entered; enter the new one`. That happens after a release with new codes, or to a page someone has tampered with. It never throws.

### startUnlocks

```ts shape
function startUnlocks(runner: Runner, options?: { content?: Readonly<Record<string, LockedContent>> }): () => void
```

Starts taking codes on a runner, and returns the way to stop, as [`startClock`](/docs/browser#startclock) does. It reads the profile, checks each remembered unlock against this release's hash, and records the ones that match in the game in play with `unlocks/record`. From then on it records them into every new game and loaded save as well, so `unlocks/has` holds wherever the player has the code. It reports where it stands in the runner's snapshot as an [`UnlockStatus`](#unlockstatus), at `snapshot.helpers.unlocks`, through [`runner.setHelper`](/docs/reference/runner#sethelper). Needs the runner's `profile`. Start it once per runner.

Stopping it ends the recording into new games and loaded saves, takes `helpers.unlocks` out of the snapshot, and makes `enterCode` refuse codes on that runner.

### enterCode

```ts shape
function enterCode(runner: Runner, code: string): Promise<Result<Entered>>
```

Tries a code against every unlock in turn, on a runner `startUnlocks` was started on. On a match it stores a proof made from the code in the profile, records the unlock in the game in play, and says what it unlocked as [`Entered`](#entered). It never throws. While it checks, the snapshot's `helpers.unlocks.status` is `checking`, and after, `wrong` or `unlocked`.

It refuses an empty code with `Type a code first.`, a code that matches nothing with `That code doesn't unlock anything.`, a runner with no profile with `This game can't remember codes here.`, and a runner with no codes started with `Codes can't be entered here.`. Checking takes a moment on purpose: a fraction of a second per unlock on a phone.

### UnlockStatus

```ts shape
type UnlockStatus = {
  status: 'idle' | 'checking' | 'wrong' | 'unlocked'
  reason: string | null
  entered: Entered | null
}
```

Where entering codes stands, at `snapshot.helpers.unlocks` while codes are started. The plugin adds `unlocks` to the engine's [`HelperRegistry`](/docs/reference/runner#sethelper), so it's typed.

| Field | What it is |
|---|---|
| `status` | `checking` while a code is checked, and while the remembered codes are as codes start. `wrong` when the last code didn't work, `unlocked` when it did, and `idle` before any code is entered. |
| `reason` | Why the last code didn't work, while `status` is `wrong`. Otherwise `null`. |
| `entered` | What the last code unlocked, while `status` is `unlocked`. Otherwise `null`. |

### Entered

```ts shape
type Entered = { unlock: string; name: string; already: boolean; restart: boolean }
```

| Field | What it is |
|---|---|
| `unlock`, `name` | The unlock the code opened. |
| `already` | It was unlocked already. The code worked and nothing changed. |
| `restart` | It has locked content that the game in play doesn't have yet. Build the game again to add it, usually by reloading the page, as for [mods](/docs/reference/mods). |

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'unlocks/has': { unlock } }` | `unlocks.has(id)` | The unlock is recorded in this save. |

Use it anywhere a condition goes: a [cheat's](/docs/plugins/cheats#supporter-cheats) `blocked`, a choice's `when`, a storylet's `when`.

```ts
import { unlocks } from '@ifloom/plugin-unlocks'

const choice = { id: 'back-room', when: unlocks.has('supporter'), effects: [{ scene: 'cafe.back-room' }] }
```

It reads the save, not the profile. Conditions must give the same answer when a save is [replayed](/docs/reference/runner#replay), and the profile is outside the save. So the save keeps its own record, which `startUnlocks` keeps in step with the profile.

## The command

| Content writes | Helper | Does |
|---|---|---|
| `{ 'unlocks/record': { id } }` | `unlocks.record(id)` | Records the unlock in this save. |

`startUnlocks` sends it once a code has worked. It ignores locks, so it works during an intro that locks everything else, and it's in the command log, so a replay plays it. It's refused with `There's no such unlock.` for an id the game doesn't have, and `That's unlocked already.` for one already recorded.

It checks no code. Anyone who can run commands, from the browser's console say, can send it. That's why a condition gate only deters, and why content you want kept from people without the code belongs in a locked pack.

## Strings

| Key | English |
|---|---|
| `unlocks/wrong` | `That code doesn't unlock anything.` |
| `unlocks/empty` | `Type a code first.` |
| `unlocks/noProfile` | `This game can't remember codes here.` |
| `unlocks/notSaved` | `The code worked, but it couldn't be remembered. Try again.` |
| `unlocks/unknown` | `There's no such unlock.` |
| `unlocks/already` | `That's unlocked already.` |
| `unlocks/notStarted` | `Codes can't be entered here.` |

## The view

`runner.view().plugins.unlocks` is an `UnlocksView`. Its [React UI](#drawing-it) draws it with [`UnlocksPanel`](#unlockspanel), and [`useUnlocks`](#useunlocks) gives it with no markup.

### UnlocksView

```ts shape
type UnlocksView = {
  unlocks: UnlockView[]
  unlocked: number
  total: number
}
```

| Field | What it is |
|---|---|
| `unlocks` | Every unlock, in the order the game declares them. |
| `unlocked` | How many are unlocked. |
| `total` | How many there are. |

### UnlockView

One unlock as the player sees it.

```ts shape
type UnlockView = { id: string; name: string; description: string; unlocked: boolean }
```

| Field | What it is |
|---|---|
| `id`, `name` | The unlock's id and name. |
| `description` | Its description, or `''` without one. |
| `unlocked` | Whether this save has it recorded. |

## Drawing it

`view.plugins.unlocks` is an [`UnlocksView`](#unlocksview): every unlock, with which the player has. Entering a code isn't a command, since a code is checked against a slow hash: start codes once with [`startUnlocks`](#startunlocks), send each one with [`enterCode`](#entercode), and draw where it stands from the snapshot's `helpers.unlocks`, an [`UnlockStatus`](#unlockstatus). See [Entering codes](#entering-codes).

`@ifloom/plugin-unlocks/react` draws the code box, for a game drawn with [`@ifloom/react`](/docs/react). List `unlocksUi` in the game's [`plugins`](/docs/react/kit#the-plugins-option) and codes start on the runner, and the [`UnlocksPanel`](#unlockspanel) is on the settings page with pages on, or behind an **Enter a code** button in the menu without them. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/unlocks.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/mount-unlocks.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Unlocks.vue]{meta='tab="Vue" tab-group="framework"'}

```svelte tab="Svelte" tab-group="framework"
<script lang="ts">
  import { view } from './runner.ts'

  const shown = $derived($view.plugins.unlocks)
</script>

{#if shown?.total}
  <ul>
    {#each shown.unlocks as unlock (unlock.id)}
      <li>{unlock.name}: {unlock.unlocked ? 'unlocked' : 'locked'}</li>
    {/each}
  </ul>
{/if}
```

The React UI is yours to leave out. Draw the plugin yourself from `view.plugins.unlocks`, or from [`useUnlocks`](#useunlocks) with your own markup, and nothing of ours is drawn: that's as much a way to use the plugin as ours. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads this subpath.

### unlocksUi

```ts shape
const unlocksUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): codes start on the runner, and the [`UnlocksPanel`](#unlockspanel) is on the settings page with pages on, or behind an **Enter a code** button in the menu without them.

Its words are in `UNLOCKS_WORDS`. A game rewords any of them with `ui.<key>` in its strings, as it does the React UI's own: `{ 'ui.checkingCode': '…' }`.

| Key | English |
|---|---|
| `ui.checkingCode` | `Checking…` |
| `ui.code` | `Code` |
| `ui.enterCode` | `Enter a code` |
| `ui.locked` | `Locked` |
| `ui.restartForUnlock` | `Restart to add it` |
| `ui.unlock` | `Unlock` |
| `ui.unlocked` | `Unlocked` |
| `ui.unlockedAlready` | `{label} was unlocked already.` |
| `ui.unlockedNow` | `Unlocked: {label}.` |

### unlocksUiWith

```ts shape
function unlocksUiWith(options?: UnlocksUiOptions): PluginUi

type UnlocksUiOptions = {
  problems?: string[]
  onChange?: () => void
  start?: (runner: Runner) => () => void
}
```

`unlocksUi` with what the code box shows and does, for a game that opens what the player unlocked before it's built. `unlocksUi` is `unlocksUiWith()`.

| Field | What it is |
|---|---|
| `problems` | What [`unlockedPacks`](#unlockedpacks) couldn't open, shown under the code box. |
| `onChange` | Builds the game again with the content a code has just opened, usually `() => location.reload()`. Without it, the box never offers to restart. |
| `start` | How codes start on the runner. [`startUnlocks`](#startunlocks) if left out. A test passes its own locked content here. |

::include[../../../../snippets/react/mount-unlocks-with.tsx]

The codes start when the game is drawn, and stop when it goes.

### UnlocksUiOptions

What [`unlocksUiWith`](#unlocksuiwith) takes, above.

### UnlocksPanel

```tsx shape
function UnlocksPanel(props: { className?: string }): JSX.Element | null
```

Entering a code, and the game's [unlocks](/docs/plugins/unlocks). Under an **Enter a code** heading (`ui.enterCode`) are a text box (`ui.code`) and an **Unlock** button (`ui.unlock`), which says **Checking…** (`ui.checkingCode`) while the code is checked. A wrong code shows the plugin's reason as an alert. One that works says **Unlocked: Supporter edition.** (`ui.unlockedNow`, or `ui.unlockedAlready`), and when it opened content the game in play doesn't have, a **Restart to add it** button (`ui.restartForUnlock`) calls `onChange` from [`unlocksUiWith`](#unlocksuiwith). The `problems` it was given follow, then each unlock (`data-unlock`, and `data-unlocked` once it's unlocked) with its label, a **Locked** or **Unlocked** badge (`ui.locked`, `ui.unlocked`) and its description.

The box shows only when the game lists the unlocks UI and its codes have started. Without it the list still shows. It draws nothing in a game without the plugin, or with no unlocks. The settings page and the menu draw it for you.

Replaceable as `UnlocksPanel` in [`components`](/docs/react/components#components). Parts: `unlocks`, `unlocks-title`, `unlock-form`, `unlock-input`, `button`, `unlocks-message`, `unlocks-entered`, `unlock-problem`, `unlocks-list`, `unlock` (with `data-unlock` and `data-unlocked`), `unlock-name`, `unlock-state` and `unlock-text`.

### useUnlocks

```ts shape
function useUnlocks(): UnlocksControls | null

type UnlocksControls = UnlocksView & {
  available: boolean
  enter: (code: string) => Promise<boolean>
  checking: boolean
  entered: Entered | null
  message: string | null
  restart: (() => void) | undefined
  problems: string[]
}
```

The unlocks plugin's view ([`UnlocksView`](/docs/plugins/unlocks#unlocksview): `unlocks`, `unlocked` and `total`) and the code box's state, or `null` in a game without the plugin.

| Field | What it is |
|---|---|
| `available` | Whether codes can be entered: codes have started on the runner, which the unlocks UI does. |
| `enter` | Tries a code with [`enterCode`](/docs/plugins/unlocks#entercode). Resolves to whether it worked. |
| `checking` | True while a code is being checked: the snapshot's `helpers.unlocks.status` is `checking`. |
| `entered` | What the last code that worked unlocked, as [`Entered`](/docs/plugins/unlocks#entered), or `null`. |
| `message` | Why the last code didn't work, or `null`. |
| `restart` | `onChange` from `unlocksUiWith`, when the last code opened content that needs it. Otherwise undefined. |
| `problems` | The `problems` given to `unlocksUiWith`. |

::include[../../../../snippets/react/use-unlocks.tsx]

## The state and the profile

### UnlocksState

```ts shape
type UnlocksState = { unlocked: string[] }
```

What the plugin keeps in a save, at `state.plugins.unlocks`: the unlocks recorded in it, in the order they were. A save from before the plugin was added loads with none.

### UnlocksProfile

```ts shape
type UnlocksProfile = { unlocked: Record<string, { proof: string }> }
```

What the plugin keeps in the player's profile, under `unlocks`: for each code that worked, a proof made from it, in hex. The profile never holds the code. The proof can't give the code back, but it opens this release's content for that unlock, so treat a profile as the player's own.

## How codes are checked

A code goes through these steps, all in WebCrypto:

1. **Normalised** with `normaliseCode`: Unicode-normalised (NFKC), spaces and hyphens taken out, in capitals. `bread-2026`, `BREAD 2026` and `Bread2026` are one code.
2. **Stretched** with PBKDF2-SHA256, salted with `ifloom-unlock:<game id>:<unlock id>` (and `:<salt>`), for `iterations` rounds (`ITERATIONS`, 600,000, unless the unlock says). That gives a 32-byte proof. This is the slow step, which makes guessing codes one at a time expensive.
3. **Split** with HKDF-SHA256 into two keys with different labels. One is the unlock's `hash`. The other is the AES-GCM key for its locked content. Knowing the hash gives neither the proof nor the key.

Locked content is the packs as JSON, encrypted with AES-256-GCM under that key, with a fresh 12-byte nonce, and the game's and unlock's ids bound to it. Changing a byte of it, or moving it to another game or unlock, makes it fail to open.

Even so, a short code can be guessed. Every guess costs the same slow step, but a four-letter code has few enough possibilities to try them all. Use codes of 12 characters or more, letters and digits, picked at random.

### The functions behind it

These are what the CLI and `startUnlocks` use. A game rarely calls them itself.

```ts shape
const ITERATIONS: 600000
function normaliseCode(code: string): string
function envName(unlock: string): string
function unlockHash(code: string, game: string, def: Pick<UnlockDef, 'id' | 'salt' | 'iterations'>): Promise<string>
function codeFits(code: string, game: string, def: UnlockDef): Promise<boolean>
function lockContent(code: string, game: string, def: UnlockDef, packs: readonly Pack[]): Promise<LockedContent>
function contentScript(locked: readonly LockedContent[]): string
function lockedContent(): Readonly<Record<string, LockedContent>>
function unlocksOf(game: Game): UnlockDef[]
```

| Function | What it does |
|---|---|
| `envName` | The variable a build reads an unlock's code from: `IFLOOM_UNLOCK_SUPPORTER` for `supporter`, `IFLOOM_UNLOCK_EARLY_ACCESS` for `early-access`. |
| `unlockHash` | The hash of a code, as `ifloom unlock-hash` prints it. |
| `codeFits` | Whether a code is the unlock's. |
| `lockContent` | Encrypts packs under a code. Throws if the code isn't the unlock's, or a pack has a function in it. |
| `contentScript` | The `<script>` the build puts in the page's head, setting `window.__ifloomUnlocks`. |
| `lockedContent` | What that script set, by unlock, or `{}` in a page without it. |
| `unlocksOf` | The game's unlocks, merged from its content and packs: `game.data.unlocks.unlocks`. |

### LockedContent

```ts shape
type LockedContent = { ifloomUnlock: 1; game: string; unlock: string; iv: string; data: string }
```

One unlock's content as the page holds it: the game's and unlock's ids, the nonce and the encrypted packs, both in base64.

## Checks

When the game loads, the plugin reports these against the content or pack each unlock came from, with `where` as `unlocks <id>`:

- An unlock with an empty name (`has no name`).
- A hash that isn't 64 hex digits (`its hash isn't one ifloom unlock-hash printed (64 hex digits)`), such as a code pasted in by mistake.
- `iterations` that isn't a whole number above 0.
- Two unlocks with one id, in a game built by hand.

An `unlocks/has` condition or `unlocks/record` command that names an unlock the game doesn't have gives `unknown unlock "…"` where it's written. [`ifloom check`](/docs/cli#locked-content-in-a-check) checks the code in the environment against the hash, and the game with its locked content.

## Gotchas

- **New codes, new hashes.** Change a code and the old proof no longer matches. A player who entered the old code sees the unlock as locked, and its content is listed in `unlockedPacks`'s problems until they enter the new one.
- **A save made with locked content** loads in a game without it, and isn't flagged: [`missingPacks`](/docs/reference/saves#loadedsave) lists only mods. If the save sits in a locked scene, check `unlocks/has` in your own load handling and say so.
- **Pictures, sound and video aren't encrypted.** Only the packs are. A file in `public/` ships as it is, even if only locked content names it.
- **No server.** Codes are checked on the player's machine, so nothing stops a code being shared, and nothing can take an unlock back.

## See it in an example

Small Town: the unlock `supporter` in `data.unlocks` in [`examples/showcase/src/world/cheats.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/cheats.ts), its locked scene in [`src/unlocks/supporter.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/unlocks/supporter.ts), and the code, public for the example, in `examples/showcase/.env`: `SMALL-TOWN-SUPPORTER`. `src/main.tsx` opens the content with `unlockedPacks` before it builds the game, and gives `startUnlocks` to `GameShell`. Enter the code on the settings page and the "Full energy" cheat opens at once. After the restart, "Sit a while" at the café can draw the back room.
