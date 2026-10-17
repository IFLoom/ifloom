---
title: "Building UI for plugins"
description: "Draw the achievements, shop and jobs plugins from the view: an achievements page, a shop counter and a job board, in plain DOM, React, Vue or Svelte."
---
The [achievements](/docs/plugins/achievements), [shop](/docs/plugins/shop) and [jobs](/docs/plugins/jobs) plugins ship no UI. Each puts what a UI needs in its slice of the [view](/docs/reference/view#plugins), at `view.plugins.<id>`, and you draw it however your game looks. This page builds three pieces:

- an achievements page, with secret ones and progress bars;
- a shop counter beside the room, with prices, discounts and greyed-out buttons;
- a job board with each job's rank, pay and next shift.

A plugin's slice is plain data, so each piece reads the same fields in every framework. Each code block has a tab for plain DOM, React, Vue and Svelte:

- **Plain JS** pieces are functions that return an element, called from the `draw` function in the [`vanilla` template](/docs/guide/frameworks)'s `src/main.ts`, which passes its `runner`.
- **React** pieces are components of the [React UI](/docs/react) that read the view with [`useGame`](/docs/react/components#usegame) and send commands with its `send`.
- **Vue** and **Svelte** pieces are components that read the view from the [`vue` or `svelte` template](/docs/guide/frameworks)'s `src/runner.ts` and send commands with `runner.apply`.

Add each plugin's package to the game's `package.json` for its types. The examples use [Small Town](/docs/guide/showcase)'s content, but the pattern is the same for any game.

## An achievements page

The plugin's view lists every achievement, and shows as earned each one the player has earned in any save. It reads that from the player's [profile](/docs/reference/profile), which the runner hands it, so the page only reads the view:

```ts tab="Plain JS" tab-group="framework"
// src/achievements.ts
import type { View } from '@ifloom/engine'
import type { AchievementsView } from '@ifloom/plugin-achievements'

export function achievements(view: View): HTMLElement | null {
  const all = view.plugins.achievements as AchievementsView | undefined
  if (!all) return null
  const page = document.createElement('section')
  page.appendChild(document.createElement('h1')).textContent = `Achievements · ${all.earned} of ${all.total}`
  const list = page.appendChild(document.createElement('ul'))
  for (const entry of all.achievements) {
    const item = list.appendChild(document.createElement('li'))
    if (!entry.earned) item.className = 'unearned'
    item.appendChild(document.createElement('strong')).textContent = `${entry.earned ? '★ ' : ''}${entry.title}`
    if (entry.description) item.appendChild(document.createElement('p')).textContent = entry.description
    if (entry.progress) Object.assign(item.appendChild(document.createElement('progress')), { max: entry.progress.target, value: entry.progress.value })
  }
  return page
}
```

```tsx tab="React" tab-group="framework"
// src/pages/Achievements.tsx
import { useGame, usePage } from '@ifloom/react'
import type { AchievementsView } from '@ifloom/plugin-achievements'

export function Achievements() {
  const { view } = useGame()
  const { back } = usePage()
  const all = view.plugins.achievements as AchievementsView | undefined
  if (!all) return null
  return (
    <section className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">
        Achievements <span className="text-muted-foreground">{all.earned} of {all.total}</span>
      </h1>
      <ul className="space-y-3">
        {all.achievements.map((entry) => (
          <li key={entry.id} className={entry.earned ? '' : 'opacity-60'}>
            <strong>{entry.earned ? '★ ' : ''}{entry.title}</strong>
            {entry.description ? <p className="text-sm">{entry.description}</p> : null}
            {entry.progress ? (
              <progress className="w-full" value={entry.progress.value} max={entry.progress.target}>
                {entry.progress.value} of {entry.progress.target}
              </progress>
            ) : null}
          </li>
        ))}
      </ul>
      <button onClick={back}>Back</button>
    </section>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Achievements.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { AchievementsView } from '@ifloom/plugin-achievements'
import { view } from './runner.ts'

const all = computed(() => view.value.plugins.achievements as AchievementsView | undefined)
</script>

<template>
  <section v-if="all">
    <h1>Achievements · {{ all.earned }} of {{ all.total }}</h1>
    <ul>
      <li v-for="entry in all.achievements" :key="entry.id" :class="{ unearned: !entry.earned }">
        <strong>{{ entry.earned ? '★ ' : '' }}{{ entry.title }}</strong>
        <p v-if="entry.description">{{ entry.description }}</p>
        <progress v-if="entry.progress" :value="entry.progress.value" :max="entry.progress.target" />
      </li>
    </ul>
  </section>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Achievements.svelte -->
<script lang="ts">
  import type { AchievementsView } from '@ifloom/plugin-achievements'
  import { view } from './runner.ts'

  const all = $derived($view.plugins.achievements as AchievementsView | undefined)
</script>

{#if all}
  <section>
    <h1>Achievements · {all.earned} of {all.total}</h1>
    <ul>
      {#each all.achievements as entry (entry.id)}
        <li class:unearned={!entry.earned}>
          <strong>{entry.earned ? '★ ' : ''}{entry.title}</strong>
          {#if entry.description}<p>{entry.description}</p>{/if}
          {#if entry.progress}<progress value={entry.progress.value} max={entry.progress.target}></progress>{/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}
```

A secret achievement the player hasn't earned already reads `???`, with no description or progress, so the page doesn't need to hide anything itself. Once it's earned in any save, the view shows it in full. When the runner writes a newly earned one to the profile, it builds a new view and tells its listeners, so the page redraws. A view you build yourself with `view(state, game)` has no profile and shows only the current save's achievements.

The plugin also raises a [notice](/docs/reference/notices) tagged `achievements` when one is earned, so a list of `view.notices.unseen` shows it too.

## A shop counter

The shop's view lists every vendor, with `here` and `open` already worked out from the [places](/docs/plugins/places) map and the [calendar](/docs/plugins/calendar). Each good carries a ready-made `buy` button, a [`RenderedChoice`](/docs/reference/view#renderedchoice) built by the engine as any button is. Its `price` is today's, discount included, and its `disabled` is the reason buying is refused, such as `Sold out.` or `You need 4 coins.`:

```ts tab="Plain JS" tab-group="framework"
// src/counter.ts
import type { Price, RenderedChoice, Runner, View } from '@ifloom/engine'
import type { ShopView } from '@ifloom/plugin-shop'

const priceText = (price: Price | null | undefined) => price?.stats?.map((stat) => stat.text).join(', ') ?? 'free'

/** A button for a RenderedChoice: greyed out with its reason, sending its command. */
function press(runner: Runner, choice: RenderedChoice, label: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.textContent = label
  button.disabled = Boolean(choice.disabled)
  button.title = choice.disabled ?? ''
  button.onclick = () => runner.apply(choice.command)
  return button
}

export function counter(view: View, runner: Runner): HTMLElement | null {
  const vendor = (view.plugins.shop as ShopView | undefined)?.vendors.find((entry) => entry.here)
  if (!vendor) return null
  if (vendor.closed) return Object.assign(document.createElement('p'), { textContent: `${vendor.name}: ${vendor.closed}` })
  const section = document.createElement('section')
  section.appendChild(document.createElement('h2')).textContent = vendor.name
  const list = section.appendChild(document.createElement('ul'))
  for (const good of vendor.goods) {
    const item = list.appendChild(document.createElement('li'))
    item.append(good.name)
    if (good.stock !== null) item.appendChild(document.createElement('small')).textContent = ` · ${good.stock} left`
    if (good.fullPrice) item.appendChild(document.createElement('s')).textContent = priceText(good.fullPrice)
    item.append(press(runner, good.buy, `Buy · ${priceText(good.buy.price)}`))
    if (good.sell && good.owned > 0) item.append(press(runner, good.sell, `Sell · ${priceText(good.sellFor)}`))
  }
  return section
}
```

```tsx tab="React" tab-group="framework"
// src/hud/Counter.tsx
import { useGame } from '@ifloom/react'
import type { Price } from '@ifloom/engine'
import type { ShopView } from '@ifloom/plugin-shop'

const priceText = (price: Price | null | undefined) => price?.stats?.map((stat) => stat.text).join(', ') ?? 'free'

export function Counter() {
  const { view, send } = useGame()
  const shop = view.plugins.shop as ShopView | undefined
  const vendor = shop?.vendors.find((entry) => entry.here)
  if (!vendor) return null
  if (vendor.closed) return <p className="text-sm text-muted-foreground">{vendor.name}: {vendor.closed}</p>
  return (
    <section className="rounded-lg border p-3">
      <h2 className="font-semibold">{vendor.name}</h2>
      <ul className="divide-y">
        {vendor.goods.map((good) => (
          <li key={good.item} className="flex items-center gap-3 py-2">
            <span className="flex-1">
              {good.name}
              {good.stock !== null ? <small className="text-muted-foreground"> · {good.stock} left</small> : null}
            </span>
            {good.fullPrice ? <s className="text-muted-foreground">{priceText(good.fullPrice)}</s> : null}
            <button disabled={Boolean(good.buy.disabled)} title={good.buy.disabled} onClick={() => send(good.buy.command)}>
              Buy · {priceText(good.buy.price)}
            </button>
            {good.sell && good.owned > 0 ? (
              <button disabled={Boolean(good.sell.disabled)} title={good.sell.disabled} onClick={() => send(good.sell!.command)}>
                Sell · {priceText(good.sellFor)}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Counter.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { Price } from '@ifloom/engine'
import type { ShopView } from '@ifloom/plugin-shop'
import { runner, view } from './runner.ts'

const priceText = (price: Price | null | undefined) => price?.stats?.map((stat) => stat.text).join(', ') ?? 'free'
const vendor = computed(() => (view.value.plugins.shop as ShopView | undefined)?.vendors.find((entry) => entry.here))
</script>

<template>
  <p v-if="vendor?.closed">{{ vendor.name }}: {{ vendor.closed }}</p>
  <section v-else-if="vendor">
    <h2>{{ vendor.name }}</h2>
    <ul>
      <li v-for="good in vendor.goods" :key="good.item">
        {{ good.name }}
        <small v-if="good.stock !== null">· {{ good.stock }} left</small>
        <s v-if="good.fullPrice">{{ priceText(good.fullPrice) }}</s>
        <button :disabled="Boolean(good.buy.disabled)" :title="good.buy.disabled" @click="runner.apply(good.buy.command)">
          Buy · {{ priceText(good.buy.price) }}
        </button>
        <button
          v-if="good.sell && good.owned > 0"
          :disabled="Boolean(good.sell.disabled)"
          :title="good.sell.disabled"
          @click="runner.apply(good.sell.command)"
        >
          Sell · {{ priceText(good.sellFor) }}
        </button>
      </li>
    </ul>
  </section>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Counter.svelte -->
<script lang="ts">
  import type { Price } from '@ifloom/engine'
  import type { ShopView } from '@ifloom/plugin-shop'
  import { runner, view } from './runner.ts'

  const priceText = (price: Price | null | undefined) => price?.stats?.map((stat) => stat.text).join(', ') ?? 'free'
  const vendor = $derived(($view.plugins.shop as ShopView | undefined)?.vendors.find((entry) => entry.here))
</script>

{#if vendor?.closed}
  <p>{vendor.name}: {vendor.closed}</p>
{:else if vendor}
  <section>
    <h2>{vendor.name}</h2>
    <ul>
      {#each vendor.goods as good (good.item)}
        <li>
          {good.name}
          {#if good.stock !== null}<small>· {good.stock} left</small>{/if}
          {#if good.fullPrice}<s>{priceText(good.fullPrice)}</s>{/if}
          <button disabled={Boolean(good.buy.disabled)} title={good.buy.disabled} onclick={() => runner.apply(good.buy.command)}>
            Buy · {priceText(good.buy.price)}
          </button>
          {#if good.sell && good.owned > 0}
            {@const sell = good.sell}
            <button disabled={Boolean(sell.disabled)} title={sell.disabled} onclick={() => runner.apply(sell.command)}>
              Sell · {priceText(good.sellFor)}
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}
```

`fullPrice` is only there on the day a good is marked down, so the struck-out price shows only then. A greyed-out button keeps its reason in `title`, so the player can see why.

You don't need a counter for a simple shop. A location's actions can send [`buy`](/docs/plugins/shop#helpers) directly, and they come in `view.actions` with the price and the greyed-out reason like any button. That's what Small Town's café does.

## A job board

The jobs view lists every job, held or not. A job not held has an `apply` button, whose `disabled` is the reason of the job's first `blocked` entry that holds. A job held has a `work` button, with the shift's cost as its `price` and the reason it can't be worked now as its `disabled`:

```ts tab="Plain JS" tab-group="framework"
// src/jobs.ts
import type { Price, RenderedChoice, Runner, View } from '@ifloom/engine'
import type { JobView, JobsView } from '@ifloom/plugin-jobs'

const payText = (pay: Price | null) => pay?.stats?.map((stat) => stat.text).join(', ') ?? 'nothing'

function press(runner: Runner, choice: RenderedChoice, label: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.textContent = label
  button.disabled = Boolean(choice.disabled)
  button.title = choice.disabled ?? ''
  button.onclick = () => runner.apply(choice.command)
  return button
}

function line(parent: HTMLElement, text: string): void {
  parent.appendChild(document.createElement('p')).textContent = text
}

function jobCard(runner: Runner, job: JobView): HTMLElement {
  const article = document.createElement('article')
  article.appendChild(document.createElement('h3')).textContent = job.rank ? `${job.title} · ${job.rank.title}` : job.title
  line(article, job.description)
  const shift = job.nextShift ? ` · next shift ${job.nextShift.inDays === 0 ? 'today' : `in ${job.nextShift.inDays} days`}` : ''
  line(article, `Pays ${payText(job.pay)} a shift${shift}`)
  if (job.next) line(article, `${job.next.title} after ${job.next.shiftsToGo} more shifts`)
  if (job.firedOn !== null) line(article, 'You were let go.')
  if (job.apply) article.append(press(runner, job.apply, 'Apply'))
  if (job.work) article.append(press(runner, job.work, 'Work a shift'))
  return article
}

export function jobBoard(view: View, runner: Runner): HTMLElement | null {
  const board = view.plugins.jobs as JobsView | undefined
  if (!board?.jobs.length) return null
  const section = document.createElement('section')
  section.appendChild(document.createElement('h2')).textContent = 'Jobs'
  for (const job of board.jobs) section.append(jobCard(runner, job))
  return section
}
```

```tsx tab="React" tab-group="framework"
// src/hud/JobBoard.tsx
import { useGame } from '@ifloom/react'
import type { RenderedChoice } from '@ifloom/engine'
import type { JobsView } from '@ifloom/plugin-jobs'

function Press({ choice, label }: { choice: RenderedChoice; label: string }) {
  const { send } = useGame()
  return (
    <button disabled={Boolean(choice.disabled)} title={choice.disabled} onClick={() => send(choice.command)}>
      {label}
    </button>
  )
}

export function JobBoard() {
  const { view } = useGame()
  const board = view.plugins.jobs as JobsView | undefined
  if (!board?.jobs.length) return null
  return (
    <section className="space-y-3 rounded-lg border p-3">
      <h2 className="font-semibold">Jobs</h2>
      {board.jobs.map((job) => (
        <article key={job.id} className="space-y-1">
          <h3 className="font-medium">
            {job.title}
            {job.rank ? <small className="text-muted-foreground"> · {job.rank.title}</small> : null}
          </h3>
          <p className="text-sm">{job.description}</p>
          <p className="text-sm">
            Pays {job.pay?.stats?.map((stat) => stat.text).join(', ') ?? 'nothing'} a shift
            {job.nextShift ? ` · next shift ${job.nextShift.inDays === 0 ? 'today' : `in ${job.nextShift.inDays} days`}` : ''}
          </p>
          {job.next ? (
            <p className="text-sm text-muted-foreground">
              {job.next.title} after {job.next.shiftsToGo} more shifts
            </p>
          ) : null}
          {job.firedOn !== null ? <p className="text-sm">You were let go.</p> : null}
          {job.apply ? <Press choice={job.apply} label="Apply" /> : null}
          {job.work ? <Press choice={job.work} label="Work a shift" /> : null}
        </article>
      ))}
    </section>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/JobBoard.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { Price } from '@ifloom/engine'
import type { JobsView } from '@ifloom/plugin-jobs'
import { runner, view } from './runner.ts'

const payText = (pay: Price | null) => pay?.stats?.map((stat) => stat.text).join(', ') ?? 'nothing'
const jobs = computed(() => (view.value.plugins.jobs as JobsView | undefined)?.jobs ?? [])
</script>

<template>
  <section v-if="jobs.length">
    <h2>Jobs</h2>
    <article v-for="job in jobs" :key="job.id">
      <h3>{{ job.title }}<small v-if="job.rank"> · {{ job.rank.title }}</small></h3>
      <p>{{ job.description }}</p>
      <p>
        Pays {{ payText(job.pay) }} a shift
        <template v-if="job.nextShift">· next shift {{ job.nextShift.inDays === 0 ? 'today' : `in ${job.nextShift.inDays} days` }}</template>
      </p>
      <p v-if="job.next">{{ job.next.title }} after {{ job.next.shiftsToGo }} more shifts</p>
      <p v-if="job.firedOn !== null">You were let go.</p>
      <button v-if="job.apply" :disabled="Boolean(job.apply.disabled)" :title="job.apply.disabled" @click="runner.apply(job.apply.command)">
        Apply
      </button>
      <button v-if="job.work" :disabled="Boolean(job.work.disabled)" :title="job.work.disabled" @click="runner.apply(job.work.command)">
        Work a shift
      </button>
    </article>
  </section>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/JobBoard.svelte -->
<script lang="ts">
  import type { Price, RenderedChoice } from '@ifloom/engine'
  import type { JobsView } from '@ifloom/plugin-jobs'
  import { runner, view } from './runner.ts'

  const payText = (pay: Price | null) => pay?.stats?.map((stat) => stat.text).join(', ') ?? 'nothing'
  const jobs = $derived(($view.plugins.jobs as JobsView | undefined)?.jobs ?? [])
</script>

{#snippet press(choice: RenderedChoice, label: string)}
  <button disabled={Boolean(choice.disabled)} title={choice.disabled} onclick={() => runner.apply(choice.command)}>{label}</button>
{/snippet}

{#if jobs.length}
  <section>
    <h2>Jobs</h2>
    {#each jobs as job (job.id)}
      <article>
        <h3>{job.title}{#if job.rank}<small> · {job.rank.title}</small>{/if}</h3>
        <p>{job.description}</p>
        <p>
          Pays {payText(job.pay)} a shift
          {#if job.nextShift}· next shift {job.nextShift.inDays === 0 ? 'today' : `in ${job.nextShift.inDays} days`}{/if}
        </p>
        {#if job.next}<p>{job.next.title} after {job.next.shiftsToGo} more shifts</p>{/if}
        {#if job.firedOn !== null}<p>You were let go.</p>{/if}
        {#if job.apply}{@render press(job.apply, 'Apply')}{/if}
        {#if job.work}{@render press(job.work, 'Work a shift')}{/if}
      </article>
    {/each}
  </section>
{/if}
```

`nextShift.day` is the calendar's day, or the turn without a calendar. `inDays` is how far off it is, which is usually what a board wants to say. Promotions and firing raise notices tagged `jobs`.

## Putting them on screen

Each piece goes wherever your game draws it. Here the counter goes under the scene, the job board after it, and the achievements page opens from a button:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts, in the vanilla template
import { achievements } from './achievements.ts'
import { counter } from './counter.ts'
import { jobBoard } from './jobs.ts'

let showAchievements = false

function draw(view: View): void {
  root.replaceChildren()
  const toggle = add(root, 'button', showAchievements ? 'Back' : 'Achievements')
  toggle.onclick = () => {
    showAchievements = !showAchievements
    draw(runner.view())
  }
  if (showAchievements) {
    const page = achievements(view)
    if (page) root.append(page)
    return
  }
  // …the title, the scene and its choices, as before, then:
  for (const part of [counter(view, runner), jobBoard(view, runner)]) if (part) root.append(part)
}
```

```tsx tab="React" tab-group="framework"
// src/main.tsx
import { DEFAULT_LAYOUT, mountGame } from '@ifloom/react'
import { Achievements } from './pages/Achievements.tsx'
import { Counter } from './hud/Counter.tsx'
import { JobBoard } from './hud/JobBoard.tsx'
import game from './game.ts'

mountGame(game, {
  layout: {
    ...DEFAULT_LAYOUT,
    stage: [...DEFAULT_LAYOUT.stage, <Counter key="counter" />],
    sidebar: [...DEFAULT_LAYOUT.sidebar, <JobBoard key="jobs" />],
  },
  // The title screen gets an Achievements button.
  pages: { pages: { achievements: { label: 'Achievements', component: Achievements } } },
})
```

```vue tab="Vue" tab-group="framework"
<!-- src/App.vue, in the vue template -->
<script setup lang="ts">
import { ref } from 'vue'
import Achievements from './Achievements.vue'
import Counter from './Counter.vue'
import JobBoard from './JobBoard.vue'

const showAchievements = ref(false)
</script>

<template>
  <button @click="showAchievements = !showAchievements">{{ showAchievements ? 'Back' : 'Achievements' }}</button>
  <Achievements v-if="showAchievements" />
  <template v-else>
    <!-- …the title, the scene and its choices, as before, then: -->
    <Counter />
    <JobBoard />
  </template>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/App.svelte, in the svelte template -->
<script lang="ts">
  import Achievements from './Achievements.svelte'
  import Counter from './Counter.svelte'
  import JobBoard from './JobBoard.svelte'

  let showAchievements = $state(false)
</script>

<button onclick={() => (showAchievements = !showAchievements)}>{showAchievements ? 'Back' : 'Achievements'}</button>
{#if showAchievements}
  <Achievements />
{:else}
  <!-- …the title, the scene and its choices, as before, then: -->
  <Counter />
  <JobBoard />
{/if}
```

In the React UI, the counter and the board go in lists of the [layout](/docs/react#layouts), and the achievements page is one of the [pages](/docs/guide/title-screen#pages-of-your-own), so the title screen gets an Achievements button. On the title screen, the progress counts come from whatever state the runner holds at the time. To open the page during the game too, send the player there with `usePage().go('achievements')`. The board could also go in a phone app.

## The same for any plugin

Every first-party plugin works this way. Read its slice of `view.plugins` by the type its package exports, draw it, and send the commands it gives you. Where a slice offers a [`RenderedChoice`](/docs/reference/view#renderedchoice), use its `disabled` and `price` rather than working them out again, so your buttons say what the engine will do. The [HUD guide](/docs/guide/hud) builds an objective line from the quests plugin the same way, and [Statuses](/docs/plugins/statuses#the-view) has a view to list active statuses beside the stats.
