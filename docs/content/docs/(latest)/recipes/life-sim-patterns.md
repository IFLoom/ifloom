---
title: "Life sim patterns"
description: "Short worked examples for a life sim built from features the engine and plugins already have: new-day work, cooldowns, deferred pay, who's behind an exit, shared header lines, art placeholders and the order refusals come in."
---
A life sim asks for the same handful of things again and again: something that happens each morning, a scene that shouldn't come back too soon, wages paid on a Friday. IFLoom has no life sim mode. Each of these is a few lines on top of features you already have, and this page shows one way to write each.

The examples use Small Town's world and its plugins: the [calendar](/docs/plugins/calendar), [places](/docs/plugins/places), the [cast](/docs/plugins/cast), [jobs](/docs/plugins/jobs) and [messages](/docs/plugins/messages). Take what you need. None of them depends on another.

## New-day work

To do something once each new day, such as drawing the day's weather, use [`rules.onTurnDone`](/docs/reference/rules#onturndone). It runs at the end of every turn, after the plugins' `onTurn` hooks, so the calendar has already moved on to the new day. Keep the last day you acted on in the kv store and compare:

```ts
import type { GameRules } from '@ifloom/engine'

const WEATHER = ['drizzle', 'sun', 'wind']

const rules: GameRules = {
  onTurnDone: (state, { apply, query, roll }) => {
    // The calendar's day, or the turn in a game without one.
    const day = query('calendar/now')?.day ?? state.turn
    if (state.kv.lastNewDay === day) return state
    return apply([
      { kv: 'lastNewDay', to: day },
      { kv: 'weather', to: WEATHER[roll(WEATHER.length, 'weather')] },
      { kv: 'ateToday', to: false },
    ])
  },
}
```

With a turn of a day this runs every turn. With the calendar's `turn: 'period'` it runs on the first turn of each day, and the other turns of the day return the state untouched. The roll is seeded by the save and the turn, so an undo or a replay draws the same weather. [Each new day](/docs/reference/rules#each-new-day) on the rules page has more on the pattern.

For a value that only needs putting back each day, such as `ateToday` on its own, the content's [`resets`](/docs/reference/rules#resets) is shorter: `resets: { ateToday: false }`.

## Cooldowns

The [`since`](/docs/reference/conditions#since) condition counts whole turns since a scene was seen or a choice picked. With `last: true` it counts from the latest time rather than the first, which is what a cooldown wants. A café storylet that rests for three turns after it's drawn:

```ts
import type { DataScene } from '@ifloom/engine'

const crossword: DataScene = {
  id: 'cafe.crossword',
  drawnFrom: ['cafe'],
  when: { not: { since: 'cafe.crossword', last: true, lt: 3 } },
  body: [{ prose: 'cafe.crossword' }],
  choices: [{ id: 'leave', effects: [{ scene: null }] }],
}
```

`since` is false before the first visit, so `{ not: … }` lets a fresh scene in. For a refusal the player can see, put the same condition in a `blocked` entry instead, with a reason:

```ts
const chat = { id: 'chat', blocked: [{ when: { since: 'cafe.counter#chat', last: true, lt: 2 }, reason: 'You only just talked.' }], effects: [] }
```

A message that comes again works the same way, with the messages plugin's own record of when it last arrived: `{ not: messages.since('ava.chat.rain', { lt: 3 }) }`. See [Messages that come again](/docs/plugins/messages#messages-that-come-again).

## Deferred pay

A job pays its wage at the end of each shift. To pay wages once a week, pay the shift into a stat the player doesn't spend, and move it into coins on payday. Declare the stat unlisted, so it stays out of the stat list:

```ts
import { holds, type GameRules, type StatDef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import type { JobDef } from '@ifloom/plugin-jobs'

const stats: StatDef[] = [{ id: 'owed', label: 'Wages owed', max: 9999, listed: false }]

const office: JobDef = {
  id: 'office',
  name: 'Filing clerk',
  shift: { cost: { energy: 20 }, passes: 2 },
  // Each shift adds to what's owed, not to coins.
  ranks: [{ id: 'clerk', name: 'Filing clerk', pay: { owed: 15 } }],
}

const rules: GameRules = {
  // On Friday, pay out what's owed. Weekday 4 is Friday when the week starts on a Monday.
  onTurnDone: (state, { apply, game }) => {
    const owed = state.stats.owed ?? 0
    if (owed <= 0 || !holds(state, game, calendar.weekday(4))) return state
    return apply([
      { stat: 'coins', by: owed },
      { stat: 'owed', to: 0 },
      { notify: `Payday: ${owed} coins`, id: 'payday', tag: 'money' },
    ])
  },
}
```

The check runs at the end of every turn, so wages earned on a Friday are paid at the end of that Friday's next turn. Once `owed` is 0 the rule does nothing for the rest of the day. No price names `owed`, so the player can't spend it. To show it, read `view.statsById.owed` in your UI. The [jobs page](/docs/plugins/jobs#a-weekly-payday) has the same idea with `rules.onTurn`.

## Who's behind an exit

The places plugin knows the exits, and the cast plugin knows where each character is. Neither knows about the other, so to label an exit with who's through it, join them in your UI. Ask the cast's `cast/where` query for each person the player has met, and group them by place. This helper is plain TypeScript, for any framework:

```ts
// src/behind.ts
import { pluginQuery, type Runner, type View } from '@ifloom/engine'

/** The names of the people the player has met, by the id of the place they're in now. */
export function whoIsWhere(runner: Runner, view: View): Map<string, string[]> {
  const where = pluginQuery(runner.game, 'cast/where')
  const people = view.plugins.cast?.people ?? []
  const found = new Map<string, string[]>()
  for (const person of people) {
    const at = where?.(runner.state, { character: person.id })
    if (typeof at === 'string') found.set(at, [...(found.get(at) ?? []), person.name])
  }
  return found
}
```

An exit's `id` is the id of the place it leads to, so the map's keys line up with the exits. Then draw the exits with the names after each:

```ts tab="Plain JS" tab-group="framework"
// src/exits.ts: call it from the vanilla template's draw(view).
import type { Runner, View } from '@ifloom/engine'
import { whoIsWhere } from './behind.ts'

export function exitList(runner: Runner, view: View): HTMLElement {
  const list = document.createElement('ul')
  const people = whoIsWhere(runner, view)
  for (const exit of view.plugins.places?.exits ?? []) {
    const item = list.appendChild(document.createElement('li'))
    const button = item.appendChild(document.createElement('button'))
    button.type = 'button'
    button.textContent = exit.label
    if (exit.disabled) button.setAttribute('aria-disabled', 'true')
    else button.onclick = () => runner.apply(exit.command)
    const names = people.get(exit.id)
    if (names) item.append(` (${names.join(', ')})`)
  }
  return list
}
```

```tsx tab="React" tab-group="framework"
// src/ExitsWithPeople.tsx
import { useGame } from '@ifloom/react'
import { usePlaces } from '@ifloom/plugin-places/react'
import { whoIsWhere } from './behind.ts'

export function ExitsWithPeople() {
  const { runner, view, send } = useGame()
  const places = usePlaces()
  if (!places) return null
  const people = whoIsWhere(runner, view)
  return (
    <ul>
      {places.exits.map((exit) => (
        <li key={exit.id}>
          <button type="button" aria-disabled={exit.disabled ? true : undefined} onClick={() => !exit.disabled && send(exit.command)}>
            {exit.label}
          </button>
          {people.get(exit.id) ? ` (${people.get(exit.id)!.join(', ')})` : null}
        </li>
      ))}
    </ul>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/ExitsWithPeople.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'
import { whoIsWhere } from './behind.ts'

const exits = computed(() => view.value.plugins.places?.exits ?? [])
const people = computed(() => whoIsWhere(runner, view.value))
</script>

<template>
  <ul>
    <li v-for="exit in exits" :key="exit.id">
      <button type="button" :aria-disabled="exit.disabled ? 'true' : undefined" @click="!exit.disabled && runner.apply(exit.command)">
        {{ exit.label }}
      </button>
      <template v-if="people.get(exit.id)"> ({{ people.get(exit.id)!.join(', ') }})</template>
    </li>
  </ul>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/ExitsWithPeople.svelte -->
<script lang="ts">
  import { runner, view } from './runner.ts'
  import { whoIsWhere } from './behind.ts'

  const exits = $derived($view.plugins.places?.exits ?? [])
  const people = $derived(whoIsWhere(runner, $view))
</script>

<ul>
  {#each exits as exit (exit.id)}
    <li>
      <button type="button" aria-disabled={exit.disabled ? 'true' : undefined} onclick={() => !exit.disabled && runner.apply(exit.command)}>{exit.label}</button>
      {#if people.get(exit.id)} ({people.get(exit.id)!.join(', ')}){/if}
    </li>
  {/each}
</ul>
```

Only people the player has met are listed, so the labels don't give away a stranger. To list everyone, read [`peopleOf(runner.state, runner.game)`](/docs/plugins/cast#helpers) instead of `people`, and each one's name with [`entityName`](/docs/reference/entities#entityname). For a line in the room's prose instead of a label, use the cast's `cast.at` condition in a block (see [Who's where](/docs/plugins/places#whos-where)). In the React UI you can also put this in place of the built-in exits, as `Exits` in [`components`](/docs/react/components#components).

## Shared header lines across places

A line that belongs on every place, such as the weather or a warning that rent is due, is a block with a `when`. Write the blocks once and spread them into each place's `body`:

```ts
import type { Block } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

const header: Block[] = [
  { prose: 'header.rent-due', when: { kv: 'rentDue' } },
  { prose: 'header.rain', when: { kv: 'weather', is: 'drizzle' } },
]

// In the content's entities.
const locations = [
  places.location({ id: 'high-street', name: 'High Street', description: 'Small Town', exits: ['cafe'], body: [...header, { prose: 'place.high-street' }] }),
  places.location({ id: 'cafe', name: 'The Café', description: 'Small Town', exits: ['high-street'], body: [...header, { prose: 'place.cafe' }] }),
]
```

When the line should vary rather than repeat, make it a set of [variants](/docs/reference/prose#variantmember) and put the same `{ variants: 'street.weather' }` block at the top of each body. A room draws one member each turn, the same one each time the player looks in that turn. [Lines on every place](/docs/plugins/places#lines-on-every-place) on the places page has more.

## An art placeholder

While the art isn't drawn yet, a missing picture is easier to spot as a labelled box than as a gap. The React UI's `Picture` draws nothing for a missing file, so replace it with one that draws a placeholder. In other frameworks, do the same in whatever draws your pictures:

```css
.art-placeholder { display: grid; place-items: center; aspect-ratio: 16 / 9; border: 2px dashed #bbb; color: #888; font: 0.85rem monospace; }
```

```ts tab="Plain JS" tab-group="framework"
// src/picture.ts: use it where the vanilla template makes an <img>.
export function picture(src: string, alt = ''): HTMLElement {
  const img = document.createElement('img')
  img.src = src
  img.alt = alt
  img.onerror = () => {
    const box = document.createElement('div')
    box.className = 'art-placeholder'
    box.setAttribute('role', 'img')
    box.setAttribute('aria-label', alt)
    box.textContent = alt || src
    img.replaceWith(box)
  }
  return img
}
```

```tsx tab="React" tab-group="framework"
// src/components.tsx: pass it to mountGame or GameShell as `components`.
import { useState } from 'react'
import type { Components } from '@ifloom/react'

export const components: Components = {
  Picture: function Placeholder({ Default, ...props }) {
    const [missing, setMissing] = useState<string>()
    if (props.src && missing === props.src) {
      return (
        <div className="art-placeholder" role="img" aria-label={props.alt}>
          {props.alt || props.src}
        </div>
      )
    }
    return <Default {...props} onError={(event) => { setMissing(props.src); props.onError?.(event) }} />
  },
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Picture.vue: use it in Beat.vue in place of the <img>. -->
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ src: string; alt?: string }>()
const missing = ref<string>()
</script>

<template>
  <div v-if="missing === props.src" class="art-placeholder" role="img" :aria-label="props.alt">{{ props.alt || props.src }}</div>
  <img v-else :src="props.src" :alt="props.alt ?? ''" @error="missing = props.src" />
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Picture.svelte: use it in Beat.svelte in place of the <img>. -->
<script lang="ts">
  let { src, alt = '' }: { src: string; alt?: string } = $props()
  let missing: string | undefined = $state()
</script>

{#if missing === src}
  <div class="art-placeholder" role="img" aria-label={alt}>{alt || src}</div>
{:else}
  <img {src} {alt} onerror={() => (missing = src)} />
{/if}
```

Every picture the React UI draws is a `Picture`, so the replacement covers scenes, portraits, notices and layered pictures. Draw the built-in one through `Default`: importing `Picture` from `@ifloom/react` inside the replacement gives you the replacement again. [`ifloom check`](/docs/cli#ifloom-check) lists the missing files too, so you can see what's left to draw.

## The order refusals come in

When the player can't do something, they see one reason. [`whyNot`](/docs/reference/actions#whynot) decides which, and the reducer refuses with the same line, so a greyed-out button and the refusal always agree. It asks, in this order, and stops at the first answer:

1. **A minigame in progress.** While one runs, other commands are refused with "Finish this first."
2. **Locks.** The content's [`locks`](/docs/reference/locks), in the order they're listed.
3. **Guards.** The game's own [`rules.guard`](/docs/reference/rules#gamerules), then each plugin's hard [guard](/docs/reference/plugins#guards-prices-and-labels), such as the calendar's curfew.
4. **The command's own checks.** For an action, these are an open scene, a lock on it, its `blocked` entries in the order written, then its `cost`, one stat at a time. For a choice, see [How `choose` checks a choice](/docs/reference/scenes#how-choose-checks-a-choice). A plugin command has its own `whyNot`, such as jobs' "You've done today's shift." before "No shift today."

A command that ignores locks, such as a setting or a [cheat](/docs/plugins/cheats), skips the first three steps. After all that, a guard's soft warning, such as "That would run past dawn.", can still refuse the command, but the button stays pressable (see [guards](/docs/reference/plugins#guards)).

To put your own reason where you want it:

- **Ahead of everything** for a while, such as during a tutorial, write a lock. A lock's reason beats every `blocked` entry and every cost.
- **Ahead of the cost**, write a `blocked` entry. `blocked` is checked before `cost`, so "The café is shut." comes before "Not enough coins."
- **Ahead of another `blocked` entry**, list it first. The first entry whose `when` holds is the one the player sees.
- **After the cost**, write the cost as a `blocked` entry of its own, before the one that should come later, and leave `cost` for the spending: `{ when: { stat: 'coins', lt: 5 }, reason: 'You need 5 coins.' }`.
- **In an order no rule above gives**, write a guard in the game's `rules.guard`, which is asked before any action's own checks, and return your reasons in the order you choose.

```ts
import type { ActionDef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

const coffee: ActionDef = {
  id: 'coffee',
  label: 'Buy a coffee',
  // Shut beats tired, and tired beats the price.
  blocked: [
    { when: calendar.period('night'), reason: 'The café is shut.' },
    { when: { stat: 'energy', lt: 5 }, reason: 'You are too tired to queue.' },
  ],
  cost: { stats: { coins: 3 } },
  effects: [{ stat: 'energy', by: 10 }],
}
```

## See it in the showcase

In Small Town, Ava's small talk is a [pool of messages](/docs/plugins/messages#messages-that-come-again), drawn each day by a trigger, with a three-day rest for each line. The office's `blocked` entries show the order at work: on a Friday evening "Closed. Back on Monday." is listed first, so it wins over "Closed. Opens tomorrow morning.", which also holds. Ava's content is in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts) and the office's in [`examples/showcase/src/story/office.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/office.ts).
