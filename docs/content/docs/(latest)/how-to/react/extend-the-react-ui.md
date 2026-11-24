---
title: "Add panels, sections, components and hints"
description: "How-to for adding your game's own screens to the React UI: a scene's panel, an app's panel, a plugin's section in an app, a plugin's view anywhere, components that join usePart and overridable, a ui hint and an inline piece of your own, and more shadcn/ui components."
---
This how-to is for `@ifloom/react`, the optional React UI. To render a game in plain DOM, Vue or React by hand, see [Start your own UI](/docs/how-to/render/start).

Use this when your game has a screen the React UI can't know about, such as a market stall with prices, an app's own screen, your own plugin's view or a hint of your own. You hand the UI a component by name, and it renders it in the right place. To change how a built-in part looks or replace it, see [Rearrange or replace the React UI's parts](/docs/how-to/react/replace-parts).

## Give a scene a panel of its own

A scene's [panel](/docs/reference/panels#scenepanel) renders in place of its choices, for a stall with prices, a card game or a map. Name the panel in the scene, with what to render it with in `with`:

```ts
import type { DataScene } from '@ifloom/engine'

export const stall: DataScene = {
  id: 'market.stall',
  title: 'The bread stall',
  panel: { panel: 'prices', with: { loaf: 4 } },
  body: [{ text: 'Loaves stacked high, and a chalkboard of prices.' }],
  choices: [
    { id: 'buy', label: 'Buy a loaf', effects: [{ stat: 'coins', by: -4 }, { scene: null }] },
    { id: 'leave', label: 'Walk on', effects: [{ scene: null }] },
  ],
}
```

Write the panel as a [`PanelComponent`](/docs/reference/react/components#panelcomponent), and pass it in `panels` under the same name. It gets the panel's `with` as `data`, and sends the scene's own choices, so what happens stays content the engine checks:

```tsx given
import { GameShell, useGame, type PanelComponent } from '@ifloom/react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@ifloom/react/kit'

const Prices: PanelComponent = ({ data }) => {
  const { send } = useGame()
  const prices = data as { loaf: number }
  return (
    <Card>
      <CardHeader><CardTitle>Today's bread</CardTitle></CardHeader>
      <CardContent className="flex gap-2">
        <Button onClick={() => send({ type: 'choose', id: 'buy' })}>A loaf, {prices.loaf} coins</Button>
        <Button variant="ghost" onClick={() => send({ type: 'choose', id: 'leave' })}>Not today</Button>
      </CardContent>
    </Card>
  )
}

const panels = { prices: Prices }

export const App = () => <GameShell runner={runner} panels={panels} />
```

The scene's title and body render above the panel as usual. A price that changes in play is better read in the component, from the view or a [value](/docs/reference/custom#values), than written into `with`. The same `panels` render a panel content opens with the [`panel` effect](/docs/reference/effects#panel), in [`PanelHost`](/docs/reference/react/components#panelhost)'s dialog, and yours replace a [built-in panel](/docs/reference/react/components#built-in-panels) or a plugin UI's of the same name.

Keep these in mind for every panel:

- **A panel with no component is left out**, with no warning. A scene shows its choices instead, and an app's section renders nothing.
- **`data` is typed `unknown`.** Cast it to the shape you wrote in `with`.
- **The component's own state isn't saved.** `useState` can keep what's in a basket, but finish with a command, which is.
- **Define `panels` once**, outside any component.

## Render a panel in an app

An app's `{ panel }` [section](/docs/reference/plugins/devices#section) renders the component of that name inside the app, with the section's `with` as `data`. Add it to the same `panels`:

```ts fragment
sections: [{ panel: 'inbox', with: { unread: 1 } }]
```

```tsx
import type { PanelComponent } from '@ifloom/react'

const Inbox: PanelComponent = ({ data }) => <p>{(data as { unread: number }).unread} unread</p>

export const panels = { inbox: Inbox }
```

## Render a plugin's section in an app

An app's `{ plugin }` section asks the UI to render that plugin's view inside the app. The messages and feed UIs bring renderers for their own. For any other plugin, pass a [`PluginSectionComponent`](/docs/reference/react/components#pluginsectioncomponent) in `sections`, keyed by the plugin's id. It gets the plugin's slice of the view as `data`, and the section's `with`. This puts the loyalty card from [Write a plugin](/docs/how-to/write-a-plugin) in an app on the laptop:

```ts fragment
// In your content, with devices() in the game's plugins
data: {
  devices: {
    devices: [{ id: 'laptop', name: 'Laptop', frame: 'laptop', sidebar: true }],
    apps: [{ id: 'card', name: 'Card', icon: 'card', on: 'laptop', sections: [{ plugin: 'loyalty' }] }],
  },
}
```

```tsx given
import { GameShell, type PluginSectionComponent } from '@ifloom/react'

const LoyaltyCard: PluginSectionComponent = ({ data }) => {
  const card = data as { stamps: number } | undefined
  if (!card) return null
  return <p>{card.stamps} of 5 stamps</p>
}

const sections = { loyalty: LoyaltyCard }

export const App = () => <GameShell runner={runner} sections={sections} />
```

Return nothing when `data` is `undefined`, as it is in a game without the plugin. To render messages or a feed your own way, register yours under `messages` or `feed`, and it replaces the plugin UI's.

## Show a plugin's view anywhere

A plugin's section works only inside an app. To show a plugin's view anywhere else, such as the loyalty card in the side column, read it in a component of your own and put that in your layout. The loyalty plugin declares its view in [`ViewRegistry`](/docs/reference/plugin-calls#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry), so `view.plugins.loyalty` comes typed:

```tsx
import { Sidebar, Title, useGame } from '@ifloom/react'
import { Badge } from '@ifloom/react/kit'

function StampCount() {
  const { view } = useGame()
  const card = view.plugins.loyalty
  return card ? <Badge variant="outline">{card.stamps} stamps</Badge> : null
}

export function Side() {
  return (
    <Sidebar>
      <Title />
      <StampCount />
    </Sidebar>
  )
}
```

The component renders nothing in a game without the plugin, so the same layout works in both.

## Make your components part of the system

Give your own elements their parts with [`usePart`](/docs/reference/react/components#usepart), so a game's `classes`, `unstyled` and stylesheet reach them as they reach the built-in ones. Your classes are the defaults, and the game's apply over them:

```tsx
import { useGame, usePart } from '@ifloom/react'

export function Purse() {
  const { view } = useGame()
  const row = usePart('stat', 'flex justify-between text-sm')
  const value = usePart('stat-value', 'font-medium tabular-nums')
  return (
    <p {...row} data-stat="coins">
      In your pocket <span {...value}>{view.statsById.coins.text}</span>
    </p>
  )
}
```

The name has to be a [`PartKey`](/docs/reference/react/components#partkey), so pick the built-in part your element is most like. For a kind of element the UI doesn't have, set `data-part` yourself, such as `<div data-part="weather">`, and style it with CSS.

To let a game replace your component by name, make it with [`overridable`](/docs/reference/react/components#overridable). It takes a built-in name, so use it for a component that stands in for a built-in one, such as a one-line stats bar you share between games:

```tsx
import { useGame, usePart } from '@ifloom/react'
import { overridable } from '@ifloom/react/kit'

function StatsBarImpl() {
  const { view } = useGame()
  const list = usePart('stats', 'flex flex-wrap gap-4 text-sm')
  const value = usePart('stat-value', 'font-medium tabular-nums')
  return (
    <p {...list}>
      {view.stats.map((stat) => (
        <span key={stat.key} {...value} data-stat={stat.key}>
          {stat.label} {stat.text}
        </span>
      ))}
    </p>
  )
}

export const StatsBar = overridable('StatList', StatsBarImpl)
```

A game that sets `components.StatList` gets its own component wherever `StatsBar` renders too, with `StatsBarImpl` as its `Default` there. A plugin UI adds names of its own instead, as [Write a plugin's React UI](/docs/how-to/react/write-a-plugins-react-ui) shows.

## Style a section with a hint of your own

`Scene` renders the beats of a section with any ui hint in one `group` part, and copies each hint that's a string, a number or `true`/`false` onto it as a `data-*` attribute. A hint of your own is enough to style a whole section as a card. Declare it, so content that uses it is typed:

```ts
// src/rules.ts, or any file the game imports
declare module '@ifloom/engine' {
  interface BlockUi {
    /** Renders the section as a card of this kind. */
    card?: 'result' | 'nudge'
  }
}
```

Write it on a section, here the end of a shift at the café:

```ts
import { text, type Block } from '@ifloom/engine'

export const shiftEnd: Block[] = [
  text('The lunch rush comes and goes.'),
  { blocks: [text('You made 30 coins.'), text('Ava says thanks.')], ui: { card: 'result' } },
]
```

`Scene` renders the section as `<div data-part="group" data-card="result">` around both beats. Style it in your stylesheet:

```css
[data-part="group"][data-card="result"] {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--card);
  padding: 1rem;
}
```

Tell [`checkUiHints`](/docs/reference/react/hints#checkuihints) about the hint with `allow`, so it doesn't report a hint the React UI doesn't read:

```ts given
import { checkUiHints } from '@ifloom/react'
import { expect } from 'vitest'

expect(checkUiHints(game, { allow: ['card'] })).toEqual([])
```

A hint on a single block makes no group, since its beat is one element already. Wrap the block in `{ blocks: [...] }` to give it one. A hint that's an object or a list isn't copied. To render such a section with markup of your own, replace [`BeatGroup`](/docs/reference/react/components#beatgroup) in `components`, which gets the section's hints as `section`.

## Add an inline piece of your own

An inline piece is a [UI piece](/docs/reference/prose#ui-pieces) in prose, `[[ui:name|words|arg]]`, which the React UI renders with the component of that name. Declare the name's arguments in `InlineUi`, write the component, and pass it in `inline`. One with a built-in name, such as `modal`, replaces it:

```tsx
// src/main.tsx
import { useState } from 'react'
import { InlineTrigger, mountGame, type InlineComponents, type InlineProps } from '@ifloom/react'
import { PartDialog } from '@ifloom/react/kit'
import module from './game.ts'

declare module '@ifloom/engine' {
  interface InlineUi {
    /** `[[ui:map|words|location]]` opens the town map with the location marked. */
    map: [location: string]
  }
}

function TownMap({ text, args: [location] }: InlineProps<'map'>) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <InlineTrigger name="map" open={open} onOpen={() => setOpen(true)}>{text}</InlineTrigger>
      <PartDialog open={open} onClose={() => setOpen(false)} title="Small Town">
        <img src={`art/map/${location}.svg`} alt={`The town map, with ${location} marked`} />
      </PartDialog>
    </>
  )
}

const inline: InlineComponents = { map: TownMap }

mountGame(module.build(), { inline })
```

A line such as `'A sign by the gate shows [[ui:map|where you are|park]].'` now opens the map. A name nothing declares still works, with `args` as text. A name that neither `inline` nor the built-ins have shows its words as plain text.

The engine never sees a piece open, so nothing about it goes in a save or the log, and the backlog and a screen reader keep its words. Anything a piece sends with `send` is a command like any other, so write a piece that changes the game as an [inline action](/docs/how-to/put-a-choice-in-a-line) instead. `ifloom build` doesn't check a file that a piece's argument names, so open each piece once in the game.

## Add more shadcn/ui components

The kit exports the [shadcn/ui primitives](/docs/reference/react/kit#shadcnui-primitives) the UI uses. For anything else shadcn/ui has, such as a slider or a select, add it to your project with shadcn/ui's CLI. Set the CLI up as its [Vite guide](https://ui.shadcn.com/docs/installation/vite) says, with the `@/` path alias and your stylesheet, then run:

```sh
npx shadcn@latest add slider
```

This writes `src/components/ui/slider.tsx` and installs the Radix package it needs. It matches the UI with no more work, since `@ifloom/react/styles.css` defines the same CSS variables and maps them to Tailwind colours. Tidy what the CLI writes:

- **Delete the variables it adds.** `shadcn init` writes `:root` and `.dark` variables and an `@theme` block into your stylesheet, which the UI's stylesheet already has. Keep only the ones you mean to override, after the import.
- **Remove a second `@import "tailwindcss"`.** The UI's stylesheet imports Tailwind already. To keep your own import, use `@ifloom/react/theme.css` in place of `styles.css`, as [Theme the React UI](/docs/how-to/react/theme-the-react-ui#bring-your-own-tailwindcss) shows.
- **Use either `cn`.** The CLI's `lib/utils.ts` writes the same function as the kit's [`cn`](/docs/reference/react/kit#cn).

## Check it worked

Run `npm run dev`. Open the bread stall, and the prices card renders in place of the choices. Finish a shift at the café, and the takings show in your result card. Choose the map's words in the park's line, and the map opens in a dialog.

For more, see:

- [Panels](/docs/reference/panels) and [`PanelHost`](/docs/reference/react/components#panelhost).
- [Presentation hints](/docs/reference/react/hints) and [`InlineUi`](/docs/reference/react/hints#inlineui).
- [Components](/docs/reference/react/components#customising), for `usePart`, `overridable` and `UiProvider`.
- [Show a popup](/docs/how-to/show-a-popup), for a modal piece or a panel opened from a line.
