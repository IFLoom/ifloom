---
title: "Extending the UI"
description: "Add your own panels, plugin sections and components to the React UI, or build your own layout from its parts."
---
This page is about `@ifloom/react`, the optional React UI. The engine doesn't need it. To draw a game with plain DOM, Vue, Svelte or React by hand, see [Your own UI in any framework](/docs/guide/frameworks).

The base UI draws everything the engine and the first-party plugins put in the view. It can't know about screens that are specific to your game, such as a scene with a screen of its own, an app's custom screen, or your own plugin's view. For those, you hand it components. When you want a different arrangement altogether, you can build your own layout from the same parts.

To change how the built-in screens look, or to replace one, see [Make it your own](/docs/react/customising).

## Panels

A panel is a screen your game draws itself, in place of the usual one. There are three places a panel can go:

- **A scene's panel** is drawn instead of the scene's choices, for a market stall with prices, a card game or a map. The scene names it with [`panel`](/docs/reference/panels#a-scenes-panel).
- **An app's panel section** is drawn inside an app, such as an inbox or a radio dial. The app has a [`{ panel }` section](/docs/plugins/devices#section).
- **An open panel** is drawn in a dialog over the story when content opens it with the [`panel` effect](/docs/reference/effects#panel). [`PanelHost`](/docs/react/components#panelhost) draws it, and has [built-in ones](/docs/react/components#built_in_panels) such as `shop` and `jobs` that yours replace by name. See [Panels](/docs/reference/panels).

In each case the component is a [`PanelComponent`](/docs/react/components#panelcomponent). It gets `data`, which is what the panel was given in `with`, and it can read anything else it needs with [`useGame`](/docs/react/components#usegame). You pass your panels to the UI by name in the `panels` prop.

### A scene's panel

Say a market stall shows today's prices and lets the player buy a loaf. The scene names the panel, and what to draw it with in `with`. Its choices are still the moves the player can make:

```ts
import type { DataScene } from '@ifloom/engine'

const stall: DataScene = {
  id: 'market.stall',
  title: 'The stall',
  panel: { panel: 'StallPanel', with: { loaf: 4 } },
  body: [{ prose: 'stall' }],
  choices: [
    { id: 'buy', effects: [{ stat: 'coins', by: -4 }, { scene: null }] },
    { id: 'leave', effects: [{ scene: null }] },
  ],
}
```

The engine shows the scene's panel as [`view.panel`](/docs/reference/panels#a-scenes-panel) while the scene is open. A price that changes in play is better read in the component itself, from the view or a [value](/docs/reference/custom#values), than written into `with`.

The component draws the prices its own way, then sends one of the scene's own choices. That way what happens is still content, and the engine still checks it:

```tsx
import { Button, Card, CardContent, CardHeader, CardTitle, GameShell, useGame, type PanelComponent } from '@ifloom/react'

const StallPanel: PanelComponent = ({ data }) => {
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

const panels = { StallPanel }

<GameShell runner={runner} panels={panels} />
```

The key in `panels` is the name in the scene's `panel`. The scene's title and body are drawn above the panel as usual.

### An app's panel

An app's `{ panel: 'inbox', with }` section names a panel. The UI draws the component with the same name, passing it the section's `with`:

```ts
sections: [{ panel: 'inbox', with: { unread: 1 } }]
```

```tsx
import type { PanelComponent } from '@ifloom/react'

const Inbox: PanelComponent = ({ data }) => <p>{(data as { unread: number }).unread} unread</p>

const panels = { StallPanel, inbox: Inbox }
```

**Gotchas.**

- **A panel with no component is quietly left out.** A scene falls back to its choices, and an app section draws nothing.
- **The data is the panel's `with`**, typed `unknown`. Cast it to the shape you wrote it with.
- **A panel's local state isn't saved.** A component can keep local state with React's `useState`, such as what's in the basket or which card is face up. That state isn't in the save, so finish with a command that is.
- **Define `panels` once**, outside any component. See [`GameProvider`](/docs/react/components#gameprovider).

## Plugin sections

An app's `{ plugin: 'loyalty' }` section asks the UI to draw a plugin's view inside the app. The [messages](/docs/plugins/messages) and [feed](/docs/plugins/feed) plugins' UIs bring renderers for theirs, when the game lists `messagesUi` and `feedUi` in `plugins`. For any other plugin, including your own, you pass one in the `sections` prop, keyed by plugin id, or your plugin's UI brings it in its [`sections`](/docs/react/kit#pluginui).

The component is a [`PluginSectionComponent`](/docs/react/components#pluginsectioncomponent). It gets `data`, the plugin's whole view at [`view.plugins[id]`](/docs/reference/view#plugins), and `with`, the section's `with`, which says which part to show.

This puts the [loyalty card plugin](/docs/reference/plugins#a-worked-example) in an app on the laptop:

```ts
// In your content, with devices() in the game's plugins.
data: {
  devices: {
    devices: [{ id: 'laptop', name: 'Laptop', frame: 'laptop', sidebar: true }],
    apps: [{ id: 'card', name: 'Card', icon: 'card', on: 'laptop', sections: [{ plugin: 'loyalty' }] }],
  },
}
```

```tsx
import { GameShell, type PluginSectionComponent } from '@ifloom/react'

const LoyaltyCard: PluginSectionComponent = ({ data }) => {
  const card = data as { stamps: number; free: number } | undefined
  if (!card) return null
  return <p>{card.stamps} of 5 stamps</p>
}

const sections = { loyalty: LoyaltyCard }

<GameShell runner={runner} sections={sections} />
```

Return nothing when `data` is `undefined`. That happens in a game without the plugin.

To draw messages or a feed your own way, register a renderer under `messages` or `feed`. Yours replaces the plugin UI's, and gets the same `data` and `with` (`{ channel }` or `{ feed }`).

## A plugin's view anywhere

Plugin sections only work inside apps. To show a plugin's view anywhere else, such as the loyalty card in the sidebar, read it from the view in a component of your own and put that in the [layout](/docs/react#layouts). The loyalty plugin declares its view in [`ViewRegistry`](/docs/reference/plugins#typed-calls-queries-and-views), so `view.plugins.loyalty` comes typed:

```tsx
import { Badge, Sidebar, Title, useGame } from '@ifloom/react'

function StampCount() {
  const { view } = useGame()
  const card = view.plugins.loyalty
  return card ? <Badge variant="outline">{card.stamps} stamps</Badge> : null
}

// In src/layout.tsx, under the title:
<Sidebar>
  <Title />
  <StampCount />
  {/* …the rest of the side column */}
</Sidebar>
```

The UI reads the first-party plugins the same way: by the shape of their views, without importing them. If your components do the same, your UI works whether or not the game has the plugin.

## Your own layout

The layout is a component of yours, `src/layout.tsx` in the react and next templates. It starts as a copy of [`DefaultLayout`](/docs/react/components#defaultlayout), and you pass it to `mountGame` or `GameShell` as `layout` (see [Layouts](/docs/react#layouts)). This one puts the stats above the scene, keeps the quests in the story in a section that folds, and drops the side column:

```tsx
// src/layout.tsx
import { Game, InputFields, Notices, Overlay, PanelHost, RoomActions, Scene, Section, StatList, Story, Title } from '@ifloom/react'
import { QuestLog } from '@ifloom/plugin-quests/react'

export function Layout() {
  return (
    <Game>
      <Story>
        <Title />
        <StatList />
        <Scene />
        <InputFields />
        <RoomActions />
        <Section id="quests" title="Journal" collapsible open={false}>
          <QuestLog title={false} />
        </Section>
      </Story>
      <PanelHost />
      <Overlay>
        <Notices />
      </Overlay>
    </Game>
  )
}
```

A layout is a React component inside the game's provider, so it can hold anything: your own components, hooks, JSX conditionals. The side column on the right is only CSS (see [Rearrange the parts in layout.tsx](/docs/react/customising#5-rearrange-the-parts-in-layouttsx)), and a header bar or another shape of page is plain markup between the regions (see [Change the shape of the page](/docs/react/customising#7-change-the-shape-of-the-page)).

You don't have to use the regions at all. Without `GameShell`, wrap your page in a [`GameProvider`](/docs/react/components#gameprovider), and add a [`TooltipProvider`](/docs/react/components#tooltip) if anything in it uses tooltips:

```tsx
import { createRoot } from 'react-dom/client'
import { GameProvider, InputFields, Notices, Scene, StatList, TooltipProvider } from '@ifloom/react'
import { QuestLog } from '@ifloom/plugin-quests/react'

function MyPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-4 md:grid-cols-[1fr_16rem]">
      <main className="flex flex-col gap-4">
        <Scene />
        <InputFields />
        <QuestLog title="Journal" />
      </main>
      <aside className="flex flex-col gap-3">
        <StatList />
      </aside>
      <Notices className="fixed right-4 bottom-4 w-80" />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <GameProvider runner={runner} panels={panels} sections={sections}>
    <TooltipProvider>
      <MyPage />
    </TooltipProvider>
  </GameProvider>,
)
```

Every part is also a component, such as [`Scene`](/docs/react/components#scene), [`StatList`](/docs/react/components#statlist), [`Title`](/docs/react/components#title) and [`RoomActions`](/docs/react/components#roomactions). Most take a `className`, and a card takes `title`, like the quest list's above.

Each part reads the view itself, so you can leave any part out or use one twice. A part that belongs to a plugin draws nothing without that plugin. A part with nothing to show also draws nothing. For example, `InputFields` draws nothing when no input is on offer, `Inventory` when the player carries nothing, and `GameMenu` when the runner has no saves, undo or backlog and the provider has no `mods`.

**Gotcha.** Leave out `InputFields` only if the game has no [inputs](/docs/reference/inputs). Nothing else in the UI sends `input`, so without it the player can't give the value.

To replace one part, write your own in its place, or replace the built-in one everywhere with [`components`](/docs/react/customising#6-replace-a-component). A component that draws a list of buttons from the view only needs [`useGame`](/docs/react/components#usegame), a [`ChoiceButton`](/docs/react/components#choicebutton) for each button, and [`useWords`](/docs/react/components#usewords) for any of the UI's words. When a component sends commands, it should send what the view's buttons carry (`choice.command`) rather than commands it builds itself. That way a greyed-out button and a refusal never disagree.

## Your own components in the system

A game's own components can take part in the same styling as the built-in ones, so a game that uses them (yours, or someone else's using your parts) can restyle them the same way.

[`usePart`](/docs/react/components#usepart) gives an element its `data-part` and its classes. Your built-in classes are the defaults, and the game's [`classes`](/docs/react/customising#4-change-the-built-in-classes) and `unstyled` apply over them:

```tsx
import { usePart, useGame } from '@ifloom/react'

function Purse() {
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

The name has to be one of [`PART_KEYS`](/docs/react/components#part_keys), so pick the built-in part your element is most like. Here the purse is styled like any other stat. For a kind of element the UI doesn't have, set `data-part` yourself (`<div data-part="weather">`) and style it with CSS.

[`overridable`](/docs/react/components#overridable) makes a component replaceable by name in [`components`](/docs/react/components#components). It takes one of the built-in names, so it's for a component that stands in for a built-in one. Say you share a one-line stats bar between your games:

```tsx
import { overridable, useGame, usePart } from '@ifloom/react'

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

A game that sets `components.StatList` gets its own component wherever `StatsBar` is drawn too, with `Default` set to `StatsBarImpl` there.

## More shadcn/ui components

The UI exports the primitives it uses: [`Button`](/docs/react/components#button), [`Badge`](/docs/react/components#badge), [`Card`](/docs/react/components#card), [`Dialog`](/docs/react/components#dialog), [`ScrollArea`](/docs/react/components#scrollarea), [`Separator`](/docs/react/components#separator), [`Tabs`](/docs/react/components#tabs) and [`Tooltip`](/docs/react/components#tooltip). For anything else shadcn/ui has, such as a slider, a select or a sheet, add it to your own project the shadcn/ui way, with its CLI or by copying the component in.

It'll match the UI without extra work. shadcn/ui components are styled by the same CSS variables, and [`@ifloom/react/styles.css`](/docs/react/customising#2-set-tokens-and-colours) already defines them all and maps them to Tailwind colours.

Set up the shadcn/ui CLI as its [Vite guide](https://ui.shadcn.com/docs/installation/vite) says, with the `@/` path alias, and point it at your stylesheet. Then run:

```sh
npx shadcn@latest add slider
```

This writes `src/components/ui/slider.tsx` and installs the Radix package it needs.

**Gotchas.**

- **Keep your stylesheet's variables.** `shadcn init` writes its own `:root` and `.dark` variables and an `@theme` block into the stylesheet you point it at. `@ifloom/react/styles.css` already has them, so delete the ones it wrote, or keep only those you mean to override, after the import.
- **Either `cn` will do.** The CLI writes its own `lib/utils.ts` with `cn`. It's the same function as the UI's [`cn`](/docs/react/components#cn), so use either.
- **Import Tailwind once.** If the CLI adds `@import "tailwindcss"` to your stylesheet, remove it. The UI's stylesheet already imports it. If you'd rather keep your own import, use `@ifloom/react/theme.css` in place of `styles.css` (see [Bringing your own Tailwind](/docs/react/customising#bringing-your-own-tailwind)).
