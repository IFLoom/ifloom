---
title: "Cheats"
description: "Cheats for the player: effects they can use at any time, free for everyone or refused until a condition such as a supporter unlock holds, with a log of what was used."
---
`@ifloom/plugin-cheats` gives the player a panel of cheats, such as "+20 coins" or "Skip to chapter 3". Each cheat is a list of effects that runs when the player presses it. It works in any scene and through any lock, costs nothing, and ends no turn unless its effects do.

A cheat can be free for everyone, or refused with a reason (or hidden) while a condition holds. That's how you offer some cheats only to supporters, after the game is finished, or once a kv key is set. The plugin keeps a log of every use, so a replay shows them and your content can react, for example by refusing an achievement to a save that cheated.

```ts
import {
  cheats, runCheat, cheatUsed, cheatsOf, cheatsView,
  type CheatDef, type CheatUse, type CheatsState, type CheatsView, type CheatView,
} from '@ifloom/plugin-cheats'
```

## Cheats or debug?

The [debug plugin](/docs/plugins/debug) is for you while you build the game. Its commands set any stat, scene or clock by hand, it has no words for the player, and you leave it out of release builds.

Cheats are part of the game the player gets. You write each one as content, with a label, effects and the reasons it's refused, and the plugin's React UI draws a panel for them. A game can have both: the showcase adds `cheats()` always and `debug()` only in development.

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-cheats": "^0.0.0"
  }
}
```

Then add `cheats()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details. The plugin cooperates with `unlocks` by name, so a cheat can name the `unlocks/has` condition even in a game without that plugin. It works on its own too.

## cheats

```ts
function cheats(): DefinedPlugin<CheatsState, CheatsView>
```

Builds the plugin, with the id `cheats`. A new game has used no cheats.

## Writing cheats

Cheats are content. They go in your content's [`data`](/docs/reference/loader#content) under `cheats.cheats`, and are merged by id, so a mod can add one or replace one. These are the showcase's two:

```ts
import type { Content } from '@ifloom/engine'
import type { CheatDef } from '@ifloom/plugin-cheats'

const coins: CheatDef = {
  id: 'coins',
  label: '+20 coins',
  description: 'A little help with the rent.',
  effects: [{ stat: 'coins', by: 20 }],
}

const energy: CheatDef = {
  id: 'energy',
  label: 'Full energy',
  description: 'As if you had slept.',
  group: 'Supporters',
  blocked: [{ when: { not: { 'unlocks/has': { unlock: 'supporter' } } }, reason: 'For supporters.' }],
  effects: [{ stat: 'energy', to: 100 }],
}

const town: Content = {
  data: { cheats: { cheats: [coins, energy] } },
}
```

### CheatDef

```ts
type CheatDef = {
  id: string
  label: string
  description?: string
  effects: EffectRef[]
  blocked?: Blocked[]
  group?: string
  once?: boolean
}
```

| Field | What it is |
|---|---|
| `id` | Unique among cheats. Content and the `cheats/use` command name it by this. |
| `label` | What its button says. |
| `description` | A line about it, under the button. |
| `effects` | What it does, as any [effect list](/docs/reference/effects) runs, in order. Plugins' effects in their short form work too. |
| `blocked` | Why it's refused. The first entry whose `when` holds greys the button out with its `reason`, or leaves it off the panel with `hide`. See [Supporter cheats](#supporter-cheats). |
| `group` | The heading it's listed under. Cheats with no group come first, with no heading. |
| `once` | Usable once in a save. After that its button is greyed out with `Already used.` |

`blocked` is the same [`Blocked`](/docs/reference/actions#blocked) shape choices, actions, places and jobs use, refused while `when` holds.

## Supporter cheats

A game funded by supporters often keeps some cheats for them. Put the condition that says the player isn't a supporter in the cheat's `blocked`:

```ts
import type { CheatDef } from '@ifloom/plugin-cheats'

const gold: CheatDef = {
  id: 'gold',
  label: '+500 coins',
  group: 'Supporters',
  blocked: [{ when: { not: { 'unlocks/has': { unlock: 'supporter' } } }, reason: 'For supporters.' }],
  effects: [{ stat: 'coins', by: 500 }],
}
```

`unlocks/has` is the condition of the [unlocks plugin](/docs/plugins/unlocks), which checks a code the player enters. Its helper `hasUnlock('supporter')` writes the same condition. The cheats plugin doesn't know about it. It only asks the condition, as any `blocked` entry does, so you can gate a cheat on anything: a kv key, a finished storyline, an achievement. In a game without the unlocks plugin, `unlocks/has` is false, so the cheat above stays refused.

Add `hide: true` to leave the cheat off the panel instead of greyed out. A gate like this deters casual players, but it isn't protection: anyone who reads the game's code can find the cheat. To keep content from people without the code, put it in an unlock's [locked content](/docs/plugins/unlocks#locked-content), which ships encrypted. [Supporter content and cheats](/docs/recipes/supporter-content) compares the two.

## Using a cheat

The player uses a cheat with the `cheats/use` command. Its button in the [view](#the-view) sends it, and `runCheat(id)` writes it:

```ts
import { runCheat } from '@ifloom/plugin-cheats'

runner.apply(runCheat('coins'))
```

When it takes, the cheat's effects run on the current state, then the plugin adds `{ cheat, turn }` to its log. The command:

- **ignores locks.** It sets [`ignoresLocks`](/docs/reference/plugins#commands-outside-the-story), so it works in an intro that only moves through its scenes, and no plugin guard stops it.
- **costs nothing.** Its button has no price.
- **ends no turn** unless its effects do. A cheat with `{ turn: true }` or `calendar/pass` among its effects passes time as written.
- **is refused** with `There's no such cheat.` for an id the game doesn't have, with the reason of its first `blocked` entry that holds, and with `Already used.` for a `once` cheat used before.

Plugins' `onCommand` hooks run after it as after any command, so an achievement whose condition a cheat meets is earned. A cheat is recorded in the command log like any other command, and [`replay`](/docs/reference/runner#replay) plays it back exactly.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'cheats/used': { cheat } }` | `cheatUsed(id)` | This save has used the cheat. |
| `{ 'cheats/used': {} }` | `cheatUsed()` | This save has used any cheat. |

Use it to mark a save that cheated, or to keep something back from one:

```ts
import { cheatUsed } from '@ifloom/plugin-cheats'

const honest = {
  id: 'honest',
  title: 'By the book',
  description: 'Finish the game without a cheat.',
  when: { all: [{ seen: 'ending' }, { not: cheatUsed() }] },
}
```

## Value

| Prose writes | Prints |
|---|---|
| `{{v:cheats/used}}` | How many times this save has used a cheat. |
| `{{v:cheats/used cheat=coins}}` | How many times this save has used that one. |

## Strings

| Key | English |
|---|---|
| `cheats/unknown` | `There's no such cheat.` |
| `cheats/usedOnce` | `Already used.`, on a `once` cheat after its use. |

## The view

`runner.view().plugins.cheats` is a `CheatsView`. Its [React UI](#the-react-ui) draws it with [`CheatPanel`](#cheatpanel), in a dialog opened from a Cheats button in the sidebar, and [`useCheats`](#usecheats) gives this view with no markup.

### CheatsView

```ts
type CheatsView = {
  cheats: CheatView[]
  used: number
}
```

| Field | What it is |
|---|---|
| `cheats` | The cheats the player can see, in the order the game declares them. One blocked with `hide` is left out while its `when` holds. |
| `used` | How many times this save has used a cheat. |

### CheatView

```ts
type CheatView = {
  id: string
  label: string
  description: string
  group: string | null
  once: boolean
  used: number
  button: RenderedChoice
}
```

| Field | What it is |
|---|---|
| `description` | Its description, or `''`. |
| `group` | Its group, or `null`. |
| `used` | How many times this save has used it. |
| `button` | A [`RenderedChoice`](/docs/reference/view#renderedchoice) that sends `cheats/use`. Its `disabled` is the reason it's refused now. |

### Drawing it yourself

Every framework reads the same slice. This panel lists the cheats under their groups:

```ts tab="Plain JS" tab-group="framework"
// src/cheats.ts
import type { Runner, View } from '@ifloom/engine'
import type { CheatsView } from '@ifloom/plugin-cheats'

export function cheatPanel(view: View, runner: Runner): HTMLElement | null {
  const cheats = (view.plugins.cheats as CheatsView | undefined)?.cheats ?? []
  if (!cheats.length) return null
  const panel = document.createElement('section')
  const groups = [...new Set(cheats.map((cheat) => cheat.group))]
  for (const group of groups) {
    if (group) panel.appendChild(document.createElement('h3')).textContent = group
    for (const cheat of cheats.filter((entry) => entry.group === group)) {
      const button = panel.appendChild(document.createElement('button'))
      button.textContent = cheat.used ? `${cheat.label} (used ${cheat.used})` : cheat.label
      button.disabled = Boolean(cheat.button.disabled)
      button.title = cheat.button.disabled ?? cheat.description
      button.onclick = () => runner.apply(cheat.button.command)
    }
  }
  return panel
}
```

```tsx tab="React" tab-group="framework"
// src/hud/Cheats.tsx
import { useCheats } from '@ifloom/plugin-cheats/react'

export function Cheats() {
  const cheats = useCheats()
  if (!cheats?.cheats.length) return null
  return (
    <section className="space-y-3">
      {cheats.groups.map((group) => (
        <div key={group.name ?? ''} className="space-y-1">
          {group.name ? <h3 className="font-semibold">{group.name}</h3> : null}
          {group.cheats.map((cheat) => (
            <button key={cheat.id} disabled={Boolean(cheat.button.disabled)} title={cheat.button.disabled ?? cheat.description} onClick={() => cheats.use(cheat.id)}>
              {cheat.label}
              {cheat.used ? ` (used ${cheat.used})` : ''}
            </button>
          ))}
        </div>
      ))}
    </section>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Cheats.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { CheatsView } from '@ifloom/plugin-cheats'
import { runner, view } from './runner.ts'

const cheats = computed(() => (view.value.plugins.cheats as CheatsView | undefined)?.cheats ?? [])
const groups = computed(() => [...new Set(cheats.value.map((cheat) => cheat.group))])
</script>

<template>
  <section v-if="cheats.length">
    <div v-for="group in groups" :key="group ?? ''">
      <h3 v-if="group">{{ group }}</h3>
      <button
        v-for="cheat in cheats.filter((entry) => entry.group === group)"
        :key="cheat.id"
        :disabled="Boolean(cheat.button.disabled)"
        :title="cheat.button.disabled ?? cheat.description"
        @click="runner.apply(cheat.button.command)"
      >
        {{ cheat.label }}<template v-if="cheat.used"> (used {{ cheat.used }})</template>
      </button>
    </div>
  </section>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Cheats.svelte -->
<script lang="ts">
  import type { CheatsView } from '@ifloom/plugin-cheats'
  import { runner, view } from './runner.ts'

  const cheats = $derived(($view.plugins.cheats as CheatsView | undefined)?.cheats ?? [])
  const groups = $derived([...new Set(cheats.map((cheat) => cheat.group))])
</script>

{#if cheats.length}
  <section>
    {#each groups as group (group ?? '')}
      {#if group}<h3>{group}</h3>{/if}
      {#each cheats.filter((entry) => entry.group === group) as cheat (cheat.id)}
        <button disabled={Boolean(cheat.button.disabled)} title={cheat.button.disabled ?? cheat.description} onclick={() => runner.apply(cheat.button.command)}>
          {cheat.label}{#if cheat.used} (used {cheat.used}){/if}
        </button>
      {/each}
    {/each}
  </section>
{/if}
```

[Building UI for plugins](/docs/recipes/plugin-ui) has more pieces built this way.

## The React UI

`@ifloom/plugin-cheats/react` draws the cheats, for a game drawn with [`@ifloom/react`](/docs/react). List `cheatsUi` in the game's [`plugins`](/docs/react/kit#the-plugins-option) and a [`CheatsButton`](#cheatsbutton) in the side column opens the [`CheatPanel`](#cheatpanel).

It's yours to leave out. Draw the plugin yourself from `view.plugins.cheats`, or from [`useCheats`](#usecheats) with your own markup, and nothing of ours is drawn: that's as much a way to use the plugin as ours. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads this subpath.

```tsx
import { mountGame } from '@ifloom/react'
import { cheatsUi } from '@ifloom/plugin-cheats/react'

mountGame(game, { plugins: [cheatsUi] })
```

### cheatsUi

```ts
const cheatsUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): a [`CheatsButton`](#cheatsbutton) in the side column opens the [`CheatPanel`](#cheatpanel).

Its words are in `CHEATS_WORDS`. A game rewords any of them with `ui.<key>` in its strings, as it does the React UI's own: `{ 'ui.cheatUsedOnce': '…' }`.

| Key | English |
|---|---|
| `ui.cheatUsedOnce` | `Used once` |
| `ui.cheatUsedTimes` | `Used {n} times` |
| `ui.cheats` | `Cheats` |

### CheatPanel

```tsx
function CheatPanel(props: { className?: string }): JSX.Element | null
```

The [cheats](/docs/plugins/cheats) the player can see, from [`CheatsView`](/docs/plugins/cheats#cheatsview). The ones with no `group` come first, with no heading, then each group under its name, in the order the groups first appear. Each cheat (`data-cheat`) is a [`ChoiceButton`](/docs/react/components#choicebutton) from its `button`, greyed out with its reason while it's refused, such as `For supporters.` or `Already used.` for a `once` cheat. Under it are its description and, once used, a badge saying how often (`ui.cheatUsedOnce`, `ui.cheatUsedTimes`).

It draws nothing in a game without the plugin, or while every cheat is hidden.

Replaceable as `CheatPanel` in [`components`](/docs/react/components#components). Parts: `cheats`, `cheats-group` (with `data-cheats-group`), `cheats-group-title`, `cheat` (with `data-cheat` and `data-used`), `cheat-text`, `cheat-used` and `choice`.

### CheatsButton

```tsx
function CheatsButton(props: { className?: string }): JSX.Element | null
```

What the `'cheats'` part draws: a **Cheats** button (`ui.cheats`) that opens a [`CheatPanel`](#cheatpanel) in a [`Dialog`](/docs/react/components#dialog). Opening it sends no command. It draws nothing in a game without the plugin, or while it has no cheat the player can see, so a game whose cheats all wait hidden for an unlock shows no button until then.

Replaceable as `CheatsButton` in [`components`](/docs/react/components#components). Parts: `cheats-button`, and for its dialog `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

### useCheats

```ts
function useCheats(): CheatsControls | null

type CheatsControls = CheatsView & {
  groups: CheatGroup[]
  use: (cheat: string) => Result<GameState>
}

type CheatGroup = { name: string | null; cheats: CheatView[] }
```

The cheats plugin's view ([`CheatsView`](/docs/plugins/cheats#cheatsview): `cheats` and `used`), the cheats by group as `groups`, and `use`, which sends `cheats/use`. `null` in a game without the plugin. `groups` has the cheats with no group first, as a group named `null`. [`CheatPanel`](#cheatpanel) and the button are drawn from it.

```tsx
import { useCheats } from '@ifloom/plugin-cheats/react'

function QuickCoins() {
  const cheats = useCheats()
  const coins = cheats?.cheats.find((cheat) => cheat.id === 'coins')
  if (!coins) return null
  return <button disabled={Boolean(coins.button.disabled)} onClick={() => cheats!.use('coins')}>{coins.label}</button>
}
```

## The state

### CheatsState

```ts
type CheatsState = { used: CheatUse[] }
type CheatUse = { cheat: string; turn: number }
```

What the plugin keeps in a save, at `state.plugins.cheats`: every use of a cheat, oldest first, with the [turn](/docs/reference/state#turn) it was used on. A save from before the plugin was added loads with nothing used.

## For code

### Helpers

```ts
const runCheat: (cheat: string) => CommandRef
const cheatUsed: (cheat?: string) => Condition
```

### cheatsOf and cheatOf

```ts
function cheatsOf(game: Game): CheatDef[]
function cheatOf(game: Game, id: string): CheatDef | undefined
```

The game's cheats, merged from its content and packs: `game.data.cheats.cheats`. `cheatOf` is the one with this id, or `undefined`.

### cheatsView

```ts
function cheatsView(state: GameState, context: PluginContext<CheatsState>): CheatsView
```

The plugin's view, as its `view` provider builds it. You need it only inside a plugin of your own that wraps this one. For the current game, read `runner.view()`.

## Checks

When the game loads, the plugin reports these problems against the content or pack each cheat came from, with `where` as `cheats <id>`:

- Anything a cheat's effects or `blocked` conditions name that the game doesn't have (`unknown stat "…"`).
- A cheat with an empty label (`has no label`) or no effects (`has no effects`).
- A `blocked` entry with no reason.
- Two cheats with one id, in a game built by hand. Packs merge by id, so a loaded game never has this.

A `cheats/use` command or `cheats/used` condition that names a cheat the game doesn't have gives `unknown cheat "…"` where it's written.

## Gotchas

- **A cheat's effects run in order, on the state as it is.** A cheat that opens a scene does so on top of whatever is on screen.
- **Locks don't stop it, but its effects still follow the rules.** A stat is held to its range, and `rules.onStat` runs for the player's stats, as with any `stat` effect.
- **The log is the save's.** A new game starts with nothing used, and loading an older save brings back its log.
- **A gate isn't protection.** Cheats are in the game's code, so a player who reads it can find them. Use it to thank supporters, not to lock away content.

## See it in an example

Small Town: `data.cheats` in [`examples/showcase/src/world/cheats.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/cheats.ts) has `coins`, free for everyone, and `energy`, refused until the unlock `supporter` is recorded, which the code `SMALL-TOWN-SUPPORTER` does. The sidebar's Cheats button opens them.
