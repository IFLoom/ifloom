---
title: "Show plugins in the React UI"
description: "How-to for rendering plugins with the React UI: listing their UIs in plugins, where the default layout puts them, placing them in a layout of your own, leaving out one thing a plugin UI brings, and rendering a plugin yourself from its hook."
---
This how-to is for `@ifloom/react`, the optional React UI. To render a game in plain DOM, Vue or React by hand, see [Start your own UI](/docs/how-to/render/start).

Use this to put your game's plugins on screen in the React UI. The UI names no plugin. Each first-party plugin with something for the player ships its React UI in its own `/react` subpath, such as `@ifloom/plugin-shop/react`, and you list the ones you want. You need the plugins in the game first, as [Add a plugin](/docs/how-to/add-a-plugin) shows.

## List the plugin UIs

Import each plugin's `<id>Ui` from its `/react` subpath and pass them to `mountGame` as `plugins`:

```ts
// src/main.ts
import { mountGame } from '@ifloom/react'
import { placesUi } from '@ifloom/plugin-places/react'
import { questsUi } from '@ifloom/plugin-quests/react'
import { shopUi } from '@ifloom/plugin-shop/react'
import module from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

mountGame(module.build(), { layout: Layout, plugins: [placesUi, questsUi, shopUi] })
```

Each [plugin UI](/docs/reference/react/kit#pluginui) brings its panels, its words, a page or settings if it has them, and the parts the layout places, in the order of the list. [`GameShell`](/docs/reference/react#gameshell) and [`GameProvider`](/docs/reference/react/components#gameprovider) take the same `plugins`. Follow these rules for the list:

- **List every plugin UI you want.** The UI finds none by itself, so a plugin UI you leave out never renders.
- **List one for a plugin the game lacks if you like.** It renders nothing, so the debug plugin's `debugUi` can stay in the list of a release built without the plugin.
- **Define the list once**, outside any component, so it's the same list on every render.

Your own `panels`, `sections`, `inline` and `components` win over what a plugin UI brings under the same name.

## Know where the default layout puts them

A plugin UI's `layout` names the [spot](/docs/reference/react/kit#pluginspot) each of its parts goes in. [`DefaultLayout`](/docs/reference/react/components#defaultlayout), and the `src/layout.tsx` the templates copy from it, has a [`Plugins`](/docs/reference/react/kit#plugins) at each spot, which renders the listed plugin UIs' parts for it in the order of the list. The quests UI's log goes in the `sidebar` spot, the places UI's exits in `room`, and the cast UI's people here in `story`.

A panel, a page, a section in an app and a plugin's settings need no spot. [`PanelHost`](/docs/reference/react/components#panelhost), the pages, the devices' apps and the menu render them by name.

## Place them in a layout of your own

Put a `Plugins` wherever your layout wants a spot's parts, or render a plugin's components yourself, in any order. This side column has the quest log in a section of its own, then the other plugins' side-column parts:

```tsx
// src/layout.tsx
import { Game, Plugins, Scene, Section, Sidebar, StatList, Story, Title } from '@ifloom/react'
import { QuestLog } from '@ifloom/plugin-quests/react'

export function Layout() {
  return (
    <Game>
      <Sidebar>
        <Title />
        <StatList />
        <Section id="journal" title="Journal" collapsible>
          <QuestLog title={false} />
        </Section>
        <Plugins at="sidebar" />
      </Sidebar>
      <Story>
        <Scene />
        <Plugins at="room" />
        <Plugins at="story" />
      </Story>
    </Game>
  )
}
```

A component you place by hand still renders once a `Plugins` renders it too, so here the quests UI renders its log twice. List the quests UI without its layout to stop that, as the next step does. The showcase's `examples/showcase/src/layout.tsx` places every plugin's parts by hand.

## Leave out one thing a plugin UI brings

A plugin UI is a plain object, so spread it without the field you don't want. This keeps the quests UI's words and panel, with its log only where the layout above puts it:

```ts
import { questsUi } from '@ifloom/plugin-quests/react'

export const plugins = [{ ...questsUi, layout: undefined }]
```

The same works for `pages`, `panels` or `settings`, such as `{ ...achievementsUi, pages: undefined }` to keep the achievements in a dialog with pages on. [`PluginUi`](/docs/reference/react/kit#pluginui) lists every field.

## Render a plugin yourself

Leave a plugin's UI out of `plugins`, and the React UI renders nothing for it, so a component of yours can. Each plugin's `/react` exports a hook that gives the plugin's view and its commands with no markup, such as [`useQuests`](/docs/reference/plugins/quests#usequests) and [`useShop`](/docs/reference/plugins/shop#useshop). This line shows the quest the player tracks:

```tsx
import { useQuests } from '@ifloom/plugin-quests/react'

export function Objective() {
  const quests = useQuests()
  const quest = quests?.active[0]
  if (!quest?.tracked) return null
  return (
    <p className="text-sm">
      <strong>{quest.name}</strong> {quest.hint}
    </p>
  )
}
```

Put the component in your layout as any other. The hook returns `null` in a game without the plugin, so the component renders nothing there. A component can read `useGame().view.plugins.<id>` instead, typed by the plugin's [`ViewRegistry`](/docs/reference/plugin-calls#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry) entry once the game imports the plugin. Send the `command` of each `RenderedChoice` the view offers, so your button and the engine agree on what's refused. [Build a HUD](/docs/how-to/build-a-hud) builds more pieces this way.

## Style them with the theme

The presets style the kit's parts that every plugin UI marks its own with, so a plugin UI looks right in every preset with no work from you. To restyle one, write CSS on its `data-part` names, listed under [the plugins' parts](/docs/reference/react/parts#the-plugins-parts), or on `data-kit` to change every plugin's cards at once. Importing a plugin's `/react` adds its parts to `classes` and its components to `components`, typed. [Theme the React UI](/docs/how-to/react/theme-the-react-ui#style-parts-with-css) shows both.

## Check it worked

Run `npm run dev`. The quest log is in the Journal section of the side column, the exits are under the scene, and opening the café's counter shows the shop's dialog.

For more, see:

- [Plugin UIs and the kit](/docs/reference/react/kit), with [`Plugins`](/docs/reference/react/kit#plugins), [`PluginSpot`](/docs/reference/react/kit#pluginspot) and [`PluginUi`](/docs/reference/react/kit#pluginui).
- Each plugin's page under [Plugins](/docs/reference/plugins), whose `## React UI` lists its components and hook.
- [Write a plugin's React UI](/docs/how-to/react/write-a-plugins-react-ui), for a plugin of your own.
- The [Render it yourself](/docs/how-to/render/start) pages, for every plugin's view in any framework.
