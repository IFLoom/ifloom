---
title: "Building UI for plugins"
description: "Draw the achievements, shop and jobs plugins in the React UI: an achievements page, a shop counter and a job board, each read from the view with useGame()."
---
The [achievements](/docs/plugins/achievements), [shop](/docs/plugins/shop) and [jobs](/docs/plugins/jobs) plugins ship no UI. Each puts what a UI needs in its slice of the [view](/docs/reference/view#plugins), at `view.plugins.<id>`, and you draw it however your game looks. This page builds three pieces in the React UI:

- an achievements page on the title screen, with secret ones and progress bars;
- a shop counter beside the room, with prices, discounts and greyed-out buttons;
- a job board with each job's rank, pay and next shift.

Each is a small React component that reads the view with [`useGame`](/docs/react/components#usegame) and sends commands with its `send`. The examples use [Small Town](/docs/guide/showcase)'s content, but the pattern is the same for any game. If you don't use React, the same view is there for any framework (see [Using another framework](/docs/guide/frameworks)).

## An achievements page

The plugin's view lists every achievement with what this save has earned. What the player has earned in any save is in their [profile](/docs/reference/profile), under `achievements`. Read it with [`useProfile`](/docs/react/components#useprofile), which keeps it up to date, and add it to the view with [`withProfile`](/docs/plugins/achievements#withprofile):

```tsx
// src/pages/Achievements.tsx
import { useGame, usePage, useProfile } from '@ifloom/react'
import { withProfile, type AchievementsView } from '@ifloom/plugin-achievements'

export function Achievements() {
  const { runner, view } = useGame()
  const { back } = usePage()
  const stored = useProfile('achievements')
  const shown = view.plugins.achievements as AchievementsView | undefined
  if (!shown) return null
  const all = withProfile(shown, stored, runner.state, runner.game)
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

A secret achievement the player hasn't earned already reads `???`, with no description or progress, so the page doesn't need to hide anything itself. Once it's earned in any save, `withProfile` shows it in full.

Add it to the [pages](/docs/guide/title-screen#pages-of-your-own), and the title screen gets an Achievements button:

```tsx
// src/main.tsx
import { mountGame } from '@ifloom/react'
import { Achievements } from './pages/Achievements.tsx'
import game from './game.ts'

mountGame(game, {
  pages: { pages: { achievements: { label: 'Achievements', component: Achievements } } },
})
```

On the title screen, the progress counts come from whatever state the runner holds at the time. To open the page during the game too, send the player there with `usePage().go('achievements')`.

The plugin also raises a [notice](/docs/reference/notices) tagged `achievements` when one is earned, which the built-in notices already show.

## A shop counter

The shop's view lists every vendor, with `here` and `open` already worked out from the [places](/docs/plugins/places) map and the [calendar](/docs/plugins/calendar). Each good carries a ready-made `buy` button, a [`RenderedChoice`](/docs/reference/view#renderedchoice) built by the engine as any button is. Its `price` is today's, discount included, and its `disabled` is the reason buying is refused, such as `Sold out.` or `You need 4 coins.`:

```tsx
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
  if (!vendor.open) return <p className="text-sm text-muted-foreground">{vendor.name}: {vendor.closed}</p>
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

`fullPrice` is only there on the day a good is marked down, so the struck-out price shows only then. A greyed-out button keeps its reason in `title`, so the player can see why. Put the counter beside the room with the [layout](/docs/react#layouts):

```tsx
// src/main.tsx
import { DEFAULT_LAYOUT, mountGame } from '@ifloom/react'
import { Counter } from './hud/Counter.tsx'
import game from './game.ts'

mountGame(game, {
  layout: { ...DEFAULT_LAYOUT, stage: [...DEFAULT_LAYOUT.stage, <Counter key="counter" />] },
})
```

You don't need a component for a simple shop. A location's actions can send [`buy`](/docs/plugins/shop#helpers) directly, and the built-in buttons show the price and the greyed-out reason the same way. That's what Small Town's café does.

## A job board

The jobs view lists every job, held or not. A job not held has an `apply` button, whose `disabled` is the first hiring requirement the player doesn't meet. A job held has a `work` button, with the shift's cost as its `price` and the reason it can't be worked now as its `disabled`:

```tsx
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

`nextShift.day` is the calendar's day, or the turn without a calendar. `inDays` is how far off it is, which is usually what a board wants to say. Promotions and firing raise notices tagged `jobs`, which the built-in notices show.

The board can go in the sidebar, or in a phone app, or on a page of its own as the achievements did. In the sidebar:

```tsx
// src/main.tsx
import { DEFAULT_LAYOUT, mountGame } from '@ifloom/react'
import { JobBoard } from './hud/JobBoard.tsx'
import game from './game.ts'

mountGame(game, {
  layout: { ...DEFAULT_LAYOUT, sidebar: [...DEFAULT_LAYOUT.sidebar, <JobBoard key="jobs" />] },
})
```

## The same for any plugin

Every first-party plugin works this way. Read its slice of `view.plugins` by the type its package exports, draw it, and send the commands it gives you. Where a slice offers a [`RenderedChoice`](/docs/reference/view#renderedchoice), use its `disabled` and `price` rather than working them out again, so your buttons say what the engine will do. The [HUD guide](/docs/guide/hud) builds an objective line from the quests plugin the same way, and [Effects](/docs/plugins/effects#the-view) has a view to list active effects beside the stats.
