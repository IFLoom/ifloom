---
title: "Building your own HUD"
description: "Build your own HUD in the React UI from the view: a stat bar, a strip of unread counts and an objective line from the tracked quest."
---
The React UI's stat list, [`NoticeStrip`](/react/components#noticestrip) and quest log are basic on purpose. Most games want their heads-up display to look like nothing else, so this page builds three pieces of one from the [view](/reference/view):

- an energy bar that turns red as it runs low;
- a strip of unread counts for notices and texts;
- an objective line from the quest the player is tracking.

Each is a small React component that reads the view with [`useGame`](/react/components#usegame). The examples use Small Town's stats and plugins, but the pattern is the same for any game.

## A stat bar

Every stat the game lists is in `view.stats` as a [`StatView`](/reference/view#statview), with its `value`, its `min` and `max`, and its `text` as the game formats it:

```tsx
// src/hud/EnergyBar.tsx
import { useGame } from '@ifloom/react'

export function EnergyBar() {
  const { view } = useGame()
  const energy = view.stats.find((stat) => stat.key === 'energy')
  if (!energy) return null
  const range = energy.max - energy.min
  const share = range > 0 ? (energy.value - energy.min) / range : 0
  return (
    <div
      role="meter"
      aria-label={energy.label}
      aria-valuemin={energy.min}
      aria-valuemax={energy.max}
      aria-valuenow={energy.value}
      aria-valuetext={energy.text}
      className="h-3 overflow-hidden rounded-full bg-muted"
    >
      <div className="h-full transition-[width]" style={{ width: `${share * 100}%`, background: share < 0.25 ? 'crimson' : 'seagreen' }} />
    </div>
  )
}
```

`max` is the stat's ceiling right now, so a ceiling that grows during the game is already worked out. Give the bar `role="meter"` and the values, so a screen reader can say how full it is.

If a plain bar is all you need, you don't have to write one. Set [`display: 'bar'`](/reference/stats#statdef) or `'pips'` on the stat, and the built-in [`StatList`](/react/components#statlist) draws it.

## A strip of unread counts

Unseen notices are in `view.notices.unseen`. A plugin's counts are in its slice of `view.plugins`, which you read by its type from the plugin's package. The [messages](/plugins/messages) plugin keeps an `unread` count:

```tsx
// src/hud/Unread.tsx
import { useState } from 'react'
import type { MessagesView } from '@ifloom/plugin-messages'
import { DeviceDialog, Notices, useDevice, useGame } from '@ifloom/react'

export function Unread() {
  const { view } = useGame()
  const phone = useDevice()
  const [showNotices, setShowNotices] = useState(false)
  const notices = view.notices.unseen.length
  const texts = (view.plugins.messages as MessagesView | undefined)?.unread ?? 0
  return (
    <div className="flex gap-3 text-sm">
      {notices ? <button onClick={() => setShowNotices(!showNotices)}>🔔 {notices}</button> : null}
      {texts ? <button onClick={() => phone.open('phone')}>✉ {texts}</button> : null}
      {showNotices ? <Notices limit={10} /> : null}
      <DeviceDialog deviceId={phone.openId} onClose={phone.close} />
    </div>
  )
}
```

Each count opens where the unread thing is. The texts button opens the phone with [`useDevice`](/react/components#usedevice) and a [`DeviceDialog`](/react/components#devicedialog), the same pair the built-in device buttons use. A count of 0 draws nothing.

## An objective line

The [quests](/plugins/quests) plugin lists the active quests in `view.plugins.quests.active`, with the tracked one first. Each has its `title` and the `hint` for the stage the player is on:

```tsx
// src/hud/Objective.tsx
import type { QuestsView } from '@ifloom/plugin-quests'
import { useGame } from '@ifloom/react'

export function Objective() {
  const { view } = useGame()
  const quest = (view.plugins.quests as QuestsView | undefined)?.active.find((entry) => entry.tracked)
  if (!quest) return null
  return (
    <p className="text-sm">
      <strong>{quest.title}</strong>
      {quest.hint ? <span className="text-muted-foreground"> · {quest.hint}</span> : null}
    </p>
  )
}
```

The player picks which quest to track in the quest log, which sends `quests/track`. To show the newest quest when none is tracked, take `active[0]` instead.

## Putting it on screen

Your components can go in any list of the [layout](/react/#layouts), among the built-in parts. Here they make a bar across the top of the stage, and take the place of the stat list at the side:

```tsx
// src/main.tsx
import { DEFAULT_LAYOUT, mountGame } from '@ifloom/react'
import { EnergyBar } from './hud/EnergyBar.tsx'
import { Objective } from './hud/Objective.tsx'
import { Unread } from './hud/Unread.tsx'
import game from './game.ts'

const hud = (
  <div key="hud" className="flex flex-col gap-2 rounded-lg border p-3">
    <div className="flex items-center justify-between gap-4">
      <Objective />
      <Unread />
    </div>
    <EnergyBar />
  </div>
)

mountGame(game, {
  layout: {
    ...DEFAULT_LAYOUT,
    sidebar: DEFAULT_LAYOUT.sidebar.filter((part) => part !== 'stats'),
    stage: [hud, ...DEFAULT_LAYOUT.stage],
  },
})
```

Build the element once, outside any component, as here. The layout is only read when the page is drawn, and the components inside it redraw themselves as the view changes.

For a HUD in a different place altogether, such as a bar fixed across the top of the window, replace the [`Frame`](/react/customising#_7-replace-the-frame) or [write your own root](/react/customising#_8-write-your-own-root). The components above work anywhere inside the game's provider.
