---
title: "Extending the UI"
description: "Add your own panels, plugin sections and components to the React UI, or build your own layout from its parts."
---
This page is about `@ifloom/react`, the optional React UI. The engine doesn't need it. To draw a game with plain DOM, Vue, Svelte or React by hand, see [Using another framework](/docs/guide/frameworks).

The base UI draws everything the engine and the first-party plugins put in the view. It can't know about screens that are specific to your game, such as a scene with a screen of its own, an app's custom screen, or your own plugin's view. For those, you hand it components. And when you want a different arrangement altogether, you can build your own layout from the same parts.

This page is about adding screens. To change how the built-in ones look, or to replace one, see [Make it your own](/docs/react/customising).

## Panels

A panel is a screen your game draws itself, in place of the usual one. There are two places a panel can go:

- **A scene's panel** is drawn instead of the scene's choices. Think of a market stall with prices, a card game or a map. The scene names it with [`panel`](/docs/reference/scenes#sceneview).
- **An app's panel section** is drawn inside an app, such as an inbox or a radio dial. The app has a [`{ panel }` section](/docs/plugins/devices#section).

In both cases the component is a [`PanelComponent`](/docs/react/components#panelcomponent). It gets `data`, which is what the game's [custom panel](/docs/reference/custom#panels) returned, and it can read anything else it needs with [`useGame`](/docs/react/components#usegame). You pass your panels to the UI by name in the `panels` prop.

### A scene's panel

Say a market stall shows today's prices and lets the player buy a loaf. The scene names the panel and the custom panel that fills it. Its choices are still the moves the player can make:

```ts
import type { DataScene } from '@ifloom/engine'

const stall: DataScene = {
  id: 'market.stall',
  title: 'The stall',
  panel: 'StallPanel',
  panelData: 'stallPrices',
  body: [{ text: 'stall' }],
  choices: [
    { id: 'buy', effects: [{ kind: 'stat', stat: 'coins', by: -4 }, { kind: 'scene', scene: null }] },
    { id: 'leave', effects: [{ kind: 'scene', scene: null }] },
  ],
}

// on the pack or the game
custom: { panels: { stallPrices: () => ({ loaf: 4 }) } }
```

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

The key in `panels` is the scene's `panel`. The scene's title and body are drawn above the panel as usual.

### An app's panel

An app's `{ panel: 'inbox' }` section names a custom panel. The UI draws the component with the same name, passing it what that custom panel returned:

```ts
custom: { panels: { inbox: (state) => ({ unread: state.kv.newMail ? 1 : 0 }) } }
```

```tsx
import type { PanelComponent } from '@ifloom/react'

const Inbox: PanelComponent = ({ data }) => <p>{(data as { unread: number }).unread} unread</p>

const panels = { StallPanel, inbox: Inbox }
```

**Gotchas.**

- **A panel with no component is quietly left out.** A scene falls back to its choices, and an app section draws nothing.
- **The data is whatever the custom panel returned**, typed `unknown`. Cast it to the shape you wrote it with.
- **A panel's local state isn't saved.** A component can keep local state with React's `useState`, such as what's in the basket or which card is face up. That state isn't in the save, so finish with a command that is.
- **Define `panels` once**, outside any component. See [`GameProvider`](/docs/react/components#gameprovider).

## Plugin sections

An app's `{ plugin: 'loyalty' }` section asks the UI to draw a plugin's view inside the app. The UI has built-in renderers for the [messages](/docs/plugins/messages) and [feed](/docs/plugins/feed) plugins. For any other plugin, including your own, you pass one in the `sections` prop, keyed by plugin id.

The component is a [`PluginSectionComponent`](/docs/react/components#pluginsectioncomponent). It gets `data`, the plugin's whole view at [`view.plugins[id]`](/docs/reference/view#plugins), and `with`, the section's `with`, which says which part to show.

Here's the [loyalty card plugin](/docs/reference/plugins#a-worked-example) as an app on the laptop:

```ts
// In a pack, with devices() in the game's plugins.
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

To draw messages or a feed your own way, register a renderer under `messages` or `feed`. Yours replaces the built-in one, and gets the same `data` and `with` (`{ channel }` or `{ feed }`).

## A plugin's view anywhere

Plugin sections only work inside apps. To show a plugin's view anywhere else, such as the loyalty card in the sidebar, read it from the view in a component of your own and put that in the [layout](/docs/react#layouts):

```tsx
import { Badge, DEFAULT_LAYOUT, GameShell, useGame } from '@ifloom/react'

function StampCount() {
  const { view } = useGame()
  const card = view.plugins.loyalty as { stamps: number } | undefined
  return card ? <Badge variant="outline">{card.stamps} stamps</Badge> : null
}

const [title, ...rest] = DEFAULT_LAYOUT.sidebar

<GameShell runner={runner} layout={{ ...DEFAULT_LAYOUT, sidebar: [title, <StampCount key="stamps" />, ...rest] }} />
```

The UI reads the first-party plugins the same way: by the shape of their views, without importing them. If your components do the same, your UI works whether or not the game has the plugin.

## Your own layout

Most arrangements don't need any code of your own. [`GameShell`](/docs/react#gameshell)'s `layout` names the parts for the side column and the stage, in order, and your own components can go among them (see [Layouts](/docs/react#layouts)). For example, this puts the stats above the scene and drops the quest list:

```tsx
import { GameShell } from '@ifloom/react'

<GameShell runner={runner} layout={{ sidebar: ['title', 'menu', 'location', 'people', 'actions'], stage: ['stats', 'scene', 'inputs'] }} />
```

When you want a page `GameShell` can't draw, such as two columns of parts or a header bar, you have three ways to go. The side column on the right is only CSS (see [Rearrange the parts](/docs/react/customising#5-rearrange-the-parts)). A different shape of page is a replacement [`Frame`](/docs/react/customising#7-replace-the-frame). And a page that isn't a column and a stage at all is your own root, passed to `mountGame` as [`app`](/docs/react/customising#8-write-your-own-root), or written as your own shell from the exported parts, like this. Wrap it in a [`GameProvider`](/docs/react/components#gameprovider), and add a [`TooltipProvider`](/docs/react/components#tooltip) if anything in it uses tooltips. [`Parts`](/docs/react/components#parts) draws a list of parts by name, as `GameShell` does, and [`Sidebar`](/docs/react/components#sidebar) is the side column on its own:

```tsx
import { createRoot } from 'react-dom/client'
import { GameProvider, Notices, Parts, QuestLog, Sidebar, TooltipProvider } from '@ifloom/react'

function MyLayout() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-4 md:grid-cols-[1fr_16rem]">
      <main className="flex flex-col gap-4">
        <Parts parts={['scene', 'inputs', <QuestLog key="quests" title="Journal" />, 'debug']} />
      </main>
      <Sidebar className="gap-3" />
      <Notices className="fixed right-4 bottom-4 w-80" />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <GameProvider runner={runner} panels={panels} sections={sections}>
    <TooltipProvider>
      <MyLayout />
    </TooltipProvider>
  </GameProvider>,
)
```

Every part is also a component, such as [`SceneStage`](/docs/react/components#scenestage), [`StatList`](/docs/react/components#statlist), [`Title`](/docs/react/components#title) and [`Actions`](/docs/react/components#actions). Use the component when a part needs props, like the quest list's `title` above, or when you don't want a list at all.

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
