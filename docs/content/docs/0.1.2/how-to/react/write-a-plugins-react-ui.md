---
title: "Write a plugin's React UI"
description: "Give a plugin a React UI in its /react subpath, with components a game can replace and parts it can style, and test it."
---
This how-to is for `@ifloom/react`, the optional React UI. To render a game in plain DOM, Vue or React by hand, see [Start your own UI](/docs/0.1.2/how-to/render/start).

Use this to ship a React UI with a plugin of your own, so a game lists it in `plugins` as it lists the first-party ones. The UI is optional: a game drawn another way never loads it. You need the plugin's engine side first, as [Write a plugin](/docs/0.1.2/how-to/write-a-plugin) writes. This page builds the UI for a weather plugin that shows the next few days and lets the player mark one as rainy.

## Lay out the package

The `plugin` template starts the package with its `/react` subpath and a test that renders it, as [Write a plugin](/docs/0.1.2/how-to/write-a-plugin#start-a-package) shows. By hand, give the package these:

1. Put the UI in `src/react/index.tsx`, built to `dist/react/`, and export it as `./react` beside `.` in `package.json`.
2. Make `react`, `react-dom` and `@ifloom/react` optional peers, so a game that renders the plugin another way installs none of them for it. List `@ifloom/react` as a dev dependency too, for your own build and tests.
3. Import only the engine, React, `@ifloom/react`, `@ifloom/react/kit` and your own files. A path inside `@ifloom/react` may move, and another plugin may be missing.

```json fragment
"exports": {
  ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
  "./react": { "types": "./dist/react/index.d.ts", "default": "./dist/react/index.js" }
},
"peerDependenciesMeta": {
  "@ifloom/react": { "optional": true },
  "react": { "optional": true },
  "react-dom": { "optional": true }
}
```

## Declare the view the UI reads

The engine side, `src/index.ts`, declares the plugin's view in [`ViewRegistry`](/docs/0.1.2/reference/plugin-calls#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry), so the UI reads it typed with no cast:

```ts
declare module '@ifloom/engine' {
  interface ViewRegistry {
    weather: { days: { day: number; label: string; rain: boolean }[] }
  }
}
```

## Declare the UI once

Call [`pluginKit`](/docs/0.1.2/reference/react/kit#pluginkit) with the plugin's id and its words in English. Each component reads the plugin through this one declaration, and the `<id>Ui` spreads it, so the id and the words are written in one place. Prefix the word keys with something of your plugin's, since every plugin UI's keys share the `ui.` namespace a game rewords them in. Then add your components and parts to the React UI's interfaces, so a game's `components` and `classes` take them typed:

```tsx
// src/react/index.tsx
import type { ComponentProps } from 'react'
import { usePart } from '@ifloom/react'
import { overridable, pluginKit, useKitPart, usePlugin, type Override, type PluginUi } from '@ifloom/react/kit'
import { weather } from '../index.ts'

export const WEATHER_WORDS = { weatherTitle: 'Weather', weatherRain: 'Rain later', weatherMark: 'Mark rain' } as const

const WEATHER = pluginKit('weather', WEATHER_WORDS)

declare module '@ifloom/react' {
  interface OverridableComponents {
    Forecast: Override<ComponentProps<typeof Forecast>>
  }
  interface PartNames {
    forecast: true
    'forecast-day': true
  }
}
```

## Write the components

Read the plugin with [`usePlugin`](/docs/0.1.2/reference/react/kit#useplugin), which gives its view, its words with the game's rewording over them, and a `send` that takes the commands the plugin's helpers write. Make each component with [`overridable`](/docs/0.1.2/reference/react/components#overridable), so a game can replace it by name:

```tsx continues
function ForecastImpl({ className }: { className?: string }) {
  const { view, words, send } = usePlugin(WEATHER)
  const list = usePart('forecast', 'flex flex-col gap-2 text-sm', className)
  const day = useKitPart('card', 'forecast-day')
  if (!view) return null
  return (
    <ul {...list}>
      {view.days.map((entry) => (
        <li key={entry.day} {...day}>
          {entry.label}
          {entry.rain ? ` · ${words('weatherRain')}` : <button onClick={() => send(weather.markRain(entry.day))}>{words('weatherMark')}</button>}
        </li>
      ))}
    </ul>
  )
}

export const Forecast = overridable('Forecast', ForecastImpl)
```

`view` is `undefined` in a game without the plugin, so the component renders nothing there. `weather.markRain` is one of the plugin's helpers, so no command is written by hand. For buttons the view already offers as a `RenderedChoice`, send its `command`, or render it with [`ChoiceButton`](/docs/0.1.2/reference/react/components#choicebutton), so the button greys out with the engine's reason.

## Export the plugin UI

Export the `<id>Ui`, a [`PluginUi`](/docs/0.1.2/reference/react/kit#pluginui), with the declaration spread into it and the [spot](/docs/0.1.2/reference/react/kit#pluginspot) each part goes in. Export a hook beside it that gives the view and the plugin's commands with no markup, for a game that renders the plugin its own way:

```tsx continues
export function useWeather() {
  const { view, send } = usePlugin(WEATHER)
  if (!view) return null
  return { ...view, markRain: (day: number) => send(weather.markRain(day)) }
}

export const weatherUi: PluginUi = { ...WEATHER, layout: { sidebar: [Forecast] } }
```

A plugin UI can bring more than layout: `panels` by name, `pages` among the pages around the game, `settings`, renderers for an app's `sections`, `inline` pieces, the `hints` its components read, built-in `components` it replaces, and a `provider` for state it keeps beside the runner. [`PluginUi`](/docs/0.1.2/reference/react/kit#pluginui) describes each field.

## Style it with the kit's parts

The presets style the [kit's parts](/docs/0.1.2/reference/react/kit#kit-parts) and the tokens, never a plugin's own parts by name. A plugin UI looks right in every preset as long as it marks what its parts are like:

- **Mark each part with what it's like**, with [`useKitPart`](/docs/0.1.2/reference/react/kit#usekitpart). A vendor's good, a job and an achievement are each a `card`, their names a `title`, a line about them a `note`. Each kit part brings its own look, so `useKitPart('card', 'forecast-day')` is boxed like every other plugin's card with no preset loaded.
- **Add only layout.** Put where the part sits over its look, such as `useKitPart('card', 'good', 'sm:flex-row sm:items-start')` for buttons beside the words on a wider screen. Use only the classes in [`KIT_LAYOUT`](/docs/0.1.2/reference/react/kit#kit_layout), with `buttonVariants`, `badgeVariants`, [`PROSE`](/docs/0.1.2/reference/react/kit#prose) and [`useDialogParts`](/docs/0.1.2/reference/react/kit#usedialogparts).
- **Use no class of your own.** The prebuilt `styles.min.css` holds only the classes `@ifloom/react`'s own source uses, and a game's Tailwind scans `@ifloom/react` but not your plugin. A class only your plugin uses is missing, and the part renders unstyled.

## Ship a stylesheet when it needs more

If your UI needs classes or rules of its own, publish a stylesheet beside `/react`, as `@ifloom/react` publishes `styles.css` and `styles.min.css`. Ship its Tailwind source with an `@source` line pointing at your `dist/react/`, for a game with Tailwind, and a prebuilt copy for a game without. Say in your README that a game imports yours after the React UI's:

```css
/* A game with Tailwind */
@import "@ifloom/react/styles.css";
@import "ifloom-plugin-weather/react.css";

/* A game without */
@import "@ifloom/react/styles.min.css";
@import "ifloom-plugin-weather/react.min.css";
```

## Test it

Render the UI inside a [`GameProvider`](/docs/0.1.2/reference/react/components#gameprovider) with a runner of a small game that has the plugin, as the template's `tests/react.test.tsx` does. `renderToString` from `react-dom/server` needs no browser:

```tsx
import { renderToString } from 'react-dom/server'
import { expect, it } from 'vitest'
import { createRunner, loadGame } from '@ifloom/engine'
import { freshState } from '@ifloom/engine/testing'
import { GameProvider } from '@ifloom/react'
import { weather } from '../src/index.ts'
import { Forecast, weatherUi } from '../src/react/index.tsx'

it('lists the days', () => {
  const { game } = loadGame([], { id: 'weather-town', title: 'Weather town', plugins: [weather()] })
  const html = renderToString(
    <GameProvider runner={createRunner(game, freshState(game))} plugins={[weatherUi]}>
      <Forecast />
    </GameProvider>,
  )
  expect(html).toContain('Mark rain')
})
```

## Check it worked

Run the tests, then list `weatherUi` in a game's `plugins` and run `npm run dev`. The forecast shows in the side column, boxed like the other plugins' cards, and takes the preset's look when you change it.

For more, see:

- [Plugin UIs and the kit](/docs/0.1.2/reference/react/kit), for `pluginKit`, `usePlugin`, `PluginUi` and the kit's parts.
- [`OverridableComponents` and `PartNames`](/docs/0.1.2/reference/react/components#overridablecomponents-and-partnames).
- [Show plugins in the React UI](/docs/0.1.2/how-to/react/show-plugin-uis), for how a game lists and places your UI.
- [Plugins](/docs/0.1.2/explanation/plugins), for why a plugin's UI ships with the plugin.
