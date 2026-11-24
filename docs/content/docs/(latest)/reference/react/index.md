---
title: "The React UI"
description: "The optional React UI: mountGame, GameShell, the layout in layout.tsx, pages such as the title screen, sound, pictures, theming and its words."
---
`@ifloom/react` is the optional React UI: a set of React components that draw an IFLoom game in the browser, built on [shadcn/ui](https://ui.shadcn.com) ([Radix](https://www.radix-ui.com) primitives styled with [Tailwind CSS](https://tailwindcss.com) v4). You can use it as it is, restyle it, or take it apart. It's one ready-made UI among others. The engine has no framework of its own, and [Your own UI in any framework](/docs/guide/frameworks) shows a game drawn with Vue, Svelte or plain DOM instead.

```ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'

mountGame(module.build())
```

[`mountGame`](#mountgame) starts the game and draws it into the page. Underneath, [`GameShell`](#gameshell) is the whole UI in one component. Every part it's made of is exported too, as are the shadcn/ui primitives it's built from, so you can:

- **Use it as it is**, with your own words. That's this page.
- **Give it a look of its own**, from a theme preset and a few CSS variables up to replacing any component. See [Make it your own](/docs/reference/react/customising).
- **Add your own screens**, such as a scene's bespoke panel, an app's screen or a plugin's view. See [Extending](/docs/reference/react/extending).
- **Lay it out your own way** in a `layout.tsx`: the side column, the story and its sections, written as JSX ([Layouts](#layouts)), or a different page altogether from the same parts ([Your own layout](/docs/reference/react/extending#your-own-layout)).

Every component is listed, with its props, under [Components](/docs/reference/react/components).

Nothing in the engine depends on this package. The UI only reads the [view](/docs/reference/view) and sends [commands](/docs/reference/commands) through a [runner](/docs/reference/runner), as a UI of your own would, so a game that wants Vue, Svelte or a terminal leaves it out.

## The two entries

`@ifloom/react` has two entries.

| Import | For | What's in it |
|---|---|---|
| `@ifloom/react` | Using the UI in a game | [`mountGame`](#mountgame), [`GameShell`](#gameshell) and [`GameProvider`](/docs/reference/react/components#gameprovider), the layout's regions (`Game`, `Sidebar`, `Story`, `Overlay`, `Section`), every component and the hooks they read (`useGame`, `useScene`, `useWords`, ...), the options that restyle and replace them (`UiOptions`, `Components`, `Classes`, `usePart`), the pages, and [`checkUiHints`](/docs/reference/react/hints#checkuihints). |
| `@ifloom/react/kit` | Building components of your own | What a [plugin's UI](/docs/reference/react/kit) is made of (`PluginUi`, `pluginKit`, `usePlugin`, the kit's parts and `overridable`), dialogs and pages that look like the UI's own (`PartDialog`, `PageHeading`), `Icon`, and the [shadcn/ui primitives](/docs/reference/react/components#shadcnui-primitives) with `cn`. A game's own screens use it too. |

A game that only mounts the UI and restyles it never imports the kit. A plugin's UI imports from both.

## What it shows

The default layout, [`DefaultLayout`](#layouts), puts these on the page. A section shows only when the game has something for it. What comes from a plugin shows when the game lists that plugin's UI in [`plugins`](#plugins).

- **The story.** The main column. The scene on screen, or the room when no scene is open (a plugin's [room scene](/docs/reference/plugins#scene), such as the [places](/docs/reference/plugins/places) plugin's), with its pictures, spoken lines and choices. The prose, choices and the rest of the text keep to a readable measure (`--width-prose`), centred on a wide screen.
- **The bottom of the story.** With the [places](/docs/reference/plugins/places) plugin, where the player is and the exits. Then the room's and the game's actions, and who is here with what you can do with them (the [cast](/docs/reference/plugins/cast)).
- **Inputs**, when the game asks for one: a name to type, a number, or options to pick from. While a scene is open they come after its words and before its choices. Otherwise they're under the room.
- **The side column.** The game's title and the clock, when a plugin such as the [calendar](/docs/reference/plugins/calendar) says what time it is, then the player's menu. Under them come its sections:
  - **Stats**, which folds, with the active statuses (the [statuses plugin](/docs/reference/plugins/statuses)) and the turns each has left.
  - **Quests**, a button that opens the [quest](/docs/reference/plugins/quests) log in a dialog, with a count of quests with news.
  - **People**, a button that opens everyone the player has met (the [cast](/docs/reference/plugins/cast)), with the stats the game keeps on each of them, such as friendship.
  - **Carrying**, which folds, with the things the player holds.
  - Buttons for the [achievements](/docs/reference/plugins/achievements), the [cheats](/docs/reference/plugins/cheats) and the [devices](/docs/reference/plugins/devices).
- **On a phone**, the side column becomes a drawer. A slim bar across the top holds the title, the clock and a button that slides the column in.
- **Notices**, in the bottom corner (the layout's overlay), each with a button to dismiss it. On a phone only the newest shows, with a button for the rest.
- **Panels**, in a dialog, when content opens one with the [`panel` effect](/docs/reference/panels), such as a shop's counter from a place or the job board from a newspaper.
- **A title screen**, if you turn on [`pages`](#pages): the title, New game, Continue, Load, Settings and Credits, before the game itself.
- **Saves, the backlog and mods**, each in a dialog opened from the player's menu. The saves dialog lists every slot to load, overwrite, export or delete. The backlog shows every scene so far with the choice made in it. The mods dialog lists the player's [mods](/docs/reference/mods), each on, off or removed, with a button to restart the game with the change.
- **Devices**, in a dialog, when the game has the [devices plugin](/docs/reference/plugins/devices), such as a [phone](/docs/recipes/phone). This covers the home screen and each app's sections, including [messages](/docs/reference/plugins/messages) and [feeds](/docs/reference/plugins/feed).
- **A debug card**, at the foot of the story, when the game has the [debug plugin](/docs/reference/plugins/debug).
- **Achievements**: a page with `pages` on, otherwise a dialog. Earned ones are marked, secret ones show as `???`, and counts have a progress bar.
- **A code box**, on the settings page (or in the menu without pages), when the game has the [unlocks plugin](/docs/reference/plugins/unlocks). It lists the unlocks, and a code that opens new content offers to restart.
- **Cheats**, in a dialog with each cheat as a button, under its group's heading, greyed out with its reason while it's refused.

Everything from a plugin (the shop, the devices, the debug card, the achievements, the code box, the cheats, the quests and the rest) comes from that plugin's own React UI, which you list in [`plugins`](#plugins). A [layout](#layouts) of your own can move, fold or drop any of them, or show one only in some rooms.

When a choice or action is greyed out, the button shows the reason under its label, so the player doesn't have to hover to find out. Its price is on the button too.

## Plugins

`@ifloom/react` names no plugin. Each plugin with something for the player ships its own React UI, in a subpath of its package, and you list the ones you want:

```ts
import { mountGame } from '@ifloom/react'
import { placesUi } from '@ifloom/plugin-places/react'
import { questsUi } from '@ifloom/plugin-quests/react'
import { shopUi } from '@ifloom/plugin-shop/react'
import module from './game.ts'

mountGame(module.build(), { plugins: [placesUi, questsUi, shopUi] })
```

Each brings its panels, its words, a page or settings if it has them, and the parts the default layout places, in the order of the list. One for a plugin the game doesn't have does nothing. A plugin you leave out of the list draws nothing of ours, so you can draw it yourself: from `view.plugins.<id>`, or from the hook its UI exports, such as [`useShop`](/docs/reference/plugins/shop#useshop), which gives the same data and actions with no markup. That's as much a way to use a plugin as ours. [Plugin UIs and the kit](/docs/reference/react/kit) has the whole of it, and each plugin's page has its React UI under **Drawing it**, beside the same thing drawn in plain JS and Vue. So does every engine page for something the player sees, such as [stats](/docs/reference/stats#drawing-it) and [notices](/docs/reference/notices#drawing-it).

## Install

A game made with `npm create ifloom` from the `react` template has it already. To add it to a project of your own, install it beside the engine:

```sh tab="npm" tab-group="package-manager"
npm install @ifloom/react
```

```sh tab="pnpm" tab-group="package-manager"
pnpm add @ifloom/react
```

```sh tab="yarn" tab-group="package-manager"
yarn add @ifloom/react
```

```sh tab="bun" tab-group="package-manager"
bun add @ifloom/react
```

On top of the engine, the UI needs React 19 and react-dom, and Tailwind CSS v4 with its Vite plugin, unless you use the [prebuilt stylesheet](/docs/reference/react/customising#without-tailwind). The `react` template's `vite.config.ts` adds React's and Tailwind's Vite plugins beside the [CLI's preset](/docs/cli#the-vite-preset). Like the engine, the UI is compiled JavaScript with type declarations. Add the plugins your game uses beside it, such as `@ifloom/plugin-quests` (see [Adding one](/docs/reference/plugins#adding-one)).

Your `tsconfig.json` needs JSX, the DOM and Vite's client types, beside the settings the [`react` template](/docs/guide/installation#whats-in-the-new-game) starts with:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "types": ["@ifloom/cli/client"]
  }
}
```

`@ifloom/cli/client` is Vite's browser types, which let TypeScript accept `import './styles.css'` and `import.meta.env`. React's types are a peer dependency of `@ifloom/react`. List `@types/react` and `@types/react-dom` in your dev dependencies, as the templates do, since your own `.tsx` files use them too.

## Set it up

The quickest start is `npm create ifloom`, which writes all of this for you (see [Installation](/docs/guide/installation)). By hand, you need four files: the Vite config, a stylesheet, the entry and an `index.html`.

```ts
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { ifloom } from '@ifloom/cli/vite'

export default ifloom({ vite: { plugins: [react(), tailwindcss()], resolve: { dedupe: ['react', 'react-dom'] } } })
```

The [CLI's preset](/docs/cli#the-vite-preset) builds one HTML file that opens from disk. The React UI needs React's Vite plugin, and Tailwind's for its stylesheet, so list `@vitejs/plugin-react`, `@tailwindcss/vite` and `tailwindcss` in your `devDependencies`. `dedupe` keeps one React when `@ifloom/react` is linked from a checkout. Run the game with `ifloom dev` and build it with `ifloom build`. Without the CLI, see [Shipping a game](/docs/guide/shipping#without-the-cli).

```css
/* src/styles.css */
@import "@ifloom/react/styles.css";
@import "@ifloom/react/themes/paper.css";
```

The UI's stylesheet imports Tailwind itself and tells it to scan the UI's components, so the first line is all the UI needs. Don't `@import "tailwindcss"` a second time. Tailwind also finds the classes in your own files, so you can use its utilities in your own components. The second line is optional and picks a theme preset. A game without Tailwind imports the prebuilt `@ifloom/react/styles.min.css` instead (see [Without Tailwind](/docs/reference/react/customising#without-tailwind)). See [Make it your own](/docs/reference/react/customising) for the presets and everything else you can change.

```ts
// src/main.ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

mountGame(module.build(), { layout: Layout })
```

Here `src/layout.tsx` is the page, a copy of [the default layout](#layouts) to change as you like (leave `layout` out to use the default as it is), and `src/game.ts` default-exports the [game module](/docs/cli#the-game-module). Its `build()` returns what [`loadGame`](/docs/reference/content#loadgame) returns, `{ game, problems }`, which is what `mountGame` takes. `mountGame` logs any problems as warnings.

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>My Game</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.ts"></script>
  </body>
</html>
```

## mountGame

```ts shape
import type { Game } from '@ifloom/engine'

function mountGame(game: Game | { game: Game; problems?: readonly unknown[] }, options?: MountOptions): Promise<Runner>
```

`mountGame` makes a runner for the game with `@ifloom/browser`'s [`browserRunner`](/docs/browser#browserrunner) and draws [`GameShell`](#gameshell) into the page, inside React's `StrictMode`. It's async because `browserRunner` reads the player's profile first, so the game starts with their settings. It resolves to the runner, so your own code can still send commands or read the state. Most games don't need it and call `mountGame` without waiting. `options` is a [`MountOptions`](#mountoptions), and every one has a default that suits most games.

```ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'
import { Layout } from './layout.tsx'

const runner = await mountGame(module.build(), {
  runner: { backlog: { limit: 200 } },
  layout: Layout,
})
```

When you need more control, build the runner yourself (with [`browserRunner`](/docs/browser#browserrunner) or [`createRunner`](/docs/reference/runner#createrunner)) and render `GameShell` with React. [The Corner Café](/docs/guide/shapes) uses `mountGame`. [Small Town](/docs/guide/showcase#the-files)'s `src/main.tsx` does it by hand, because it loads the player's mods from IndexedDB before it makes the game:

```tsx
// src/main.tsx
import { createRoot } from 'react-dom/client'
import { localStorageDriver } from '@ifloom/browser'
import { createRunner, profile, saves, startingState } from '@ifloom/engine'
import { GameShell } from '@ifloom/react'
import module from './game.ts'
import './styles.css'

const { game } = module.build()
const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  saves: saves(game, localStorageDriver()),
  profile: profile(game, localStorageDriver()),
  history: { depth: 50 },
  autosave: { every: 'turn' },
})

createRoot(document.getElementById('root')!).render(<GameShell runner={runner} pages />)
```

The shell redraws whenever the runner's state changes, so undo, loading a save and a command sent from anywhere else all show at once.

### MountOptions

What [`mountGame`](#mountgame) takes: every prop of [`GameShell`](#gameshellprops) but the runner, and how to make the runner.

```ts shape
type MountOptions = Omit<GameShellProps, 'runner'> & {
  root?: string | Element
  start?: GameState
  runner?: RunnerOptions
}
```

| Option | Default and what it is |
|---|---|
| `root` | `'#root'`. An element, or a selector for one. It rejects if nothing matches. |
| `start` | A new game, `startingState(game, { seed, settings })`, with a random seed so each playthrough draws its own variants, and the player's stored play settings. |
| `runner` | `browserRunner`'s defaults: `{ history: { depth: 50 }, saves: saves(game, localStorageDriver()), profile: profile(game, localStorageDriver()), autosave: { every: 'turn' } }`. Whatever you pass is merged over these. |
| `pages` | Off, so the game starts straight away. `true`, or [`PagesOptions`](/docs/reference/react/components#pagesoptions), opens on a title screen. See [Pages](#pages). |
| `components` | None. Your own components in place of built-in ones, by name. See [Replace a component](/docs/reference/react/customising#6-replace-a-component). |
| `classes` | None. Tailwind classes for any part, by its `data-part` name. See [Change the built-in classes](/docs/reference/react/customising#4-change-the-built-in-classes). |
| `unstyled` | `false`. `true` drops every built-in class. |
| `viewer` | `true`. Clicking a picture or a clip in the story opens it large in the [`MediaViewer`](/docs/reference/react/components#mediaviewer). `false` turns that off. See [Pictures and video](#pictures-and-video). |
| `keys` | Off. `true` turns on the keyboard shortcuts: 1 to 9 for the choices on screen, each showing its number, and Escape for the menu. [`KeyOptions`](/docs/reference/react/components#keyoptions) adds keys of your own with `map`. A minigame's own keys work either way. |
| `motion` | `true`. Scene transitions and prose reveals play. `false` shows every scene and every line at once. A player whose system asks for reduced motion gets them at once either way. |
| `audio` | On when the game lists any tracks in [`game.audio`](/docs/reference/audio). `false` turns sound off, and an object is passed to [`startAudio`](/docs/browser/audio-player#startaudio) as its [options](/docs/browser/audio-player#audiooptions). See [Sound](#sound). |

Any other option goes to `GameShell` as a prop, such as `layout`, `panels` or `mods`. `layout` takes any component, so a page that isn't a side column and a story at all is a layout too. See [Write your own root](/docs/reference/react/customising#8-write-your-own-root).

## GameShell

```tsx shape
function GameShell(props: GameShellProps): JSX.Element
```

The whole game: a [`GameProvider`](/docs/reference/react/components#gameprovider) for the runner, the [pages](#pages) when they're on, the sound, and the layout. `mountGame` draws it for you. Render it yourself when you make the runner yourself.

### GameShellProps

All fields: [`GameShellProps` in the API](/docs/api/react#gameshellprops).

The props of `GameShell`: the runner, what the game adds to the UI, and how it looks and behaves.

```ts shape
type GameShellProps = {
  runner: Runner
  panels?: Record<string, PanelComponent>
  inline?: InlineComponents
  plugins?: readonly PluginUi[]
  sections?: Record<string, PluginSectionComponent>
  mods?: ModsOption
  components?: Components
  classes?: Classes
  unstyled?: boolean
  viewer?: boolean
  keys?: boolean | KeyOptions
  motion?: boolean
  layout?: ComponentType
  pages?: boolean | PagesOptions
  audio?: false | AudioOptions
}
```

| Prop | Default | What it is |
|---|---|---|
| `runner` | | The game's [runner](/docs/reference/runner). |
| `panels` | none | The game's own panels, by name: a scene's bespoke panel, or an app's panel section. See [Panels](/docs/reference/react/extending#panels). |
| `inline` | `modal`, `image`, `mail`, `prop` and `mono` | The game's own components for [UI pieces](/docs/reference/prose#ui-pieces) in its prose, `[[ui:name\|words]]`, by name, over the built-in ones. See [Inline pieces](/docs/reference/react/hints#inline-pieces). |
| `plugins` | none | The plugin UIs to draw, each from a plugin's `/react` subpath, in the order the layout places them. See [Plugins](#plugins). |
| `sections` | the plugin UIs' | Renderers for plugin sections in apps, by plugin id, over the plugin UIs' (the messages and feed UIs draw theirs). See [Plugin sections](/docs/reference/react/extending#plugin-sections). |
| `mods` | none | The player's [mods](/docs/reference/mods): the store, the loader's problems, and how to restart. It turns on Mods in the player's menu. See [`ModsOption`](/docs/reference/react/components#modsoption). |
| `components`, `classes`, `unstyled` | none, none, `false` | How the UI looks, below the theme. See [Make it your own](/docs/reference/react/customising). |
| `viewer` | `true` | Whether clicking a picture in the story opens it large. |
| `keys` | `false` | Keyboard shortcuts for choices and the menu. See [`KeyOptions`](/docs/reference/react/components#keyoptions). |
| `motion` | `true` | Whether scene transitions and prose reveals play. See [`UiOptions`](/docs/reference/react/components#uioptions). |
| `layout` | [`DefaultLayout`](/docs/reference/react/components#defaultlayout) | The page, as a component: your `layout.tsx`, or any component of your own. See [Layouts](#layouts). |
| `pages` | `false` | The title screen and the pages around the game. The layout is drawn on the `game` page. See [Pages](#pages). |
| `audio` | on when the game lists any tracks in [`game.audio`](/docs/reference/audio) | `false` turns sound off, and an object is passed to [`startAudio`](/docs/browser/audio-player#startaudio) as its options. See [Sound](#sound). |

### Layouts

The layout is the page, written as JSX: what goes in the side column, what goes in the story, and what floats over them. The react and next templates give you a copy of the default one in `src/layout.tsx`, passed to `mountGame` (or `GameShell`) as `layout`:

```tsx
// src/layout.tsx
import { Clock, Game, GameMenu, InputFields, Inventory, Notices, Overlay, PanelHost, Plugins, RoomActions, Scene, Section, Sidebar, StatList, Story, Title, useWords } from '@ifloom/react'

export function Layout() {
  const words = useWords()
  return (
    <Game>
      <Sidebar>
        <Title />
        <Clock />
        <GameMenu />
        <Section id="stats" title={words('stats')} collapsible open>
          <StatList />
          <Plugins at="stats" />
        </Section>
        <Section id="inventory" title={words('inventory')} collapsible>
          <Inventory title={false} />
        </Section>
        <Plugins at="sidebar" />
      </Sidebar>
      <Story>
        <Scene />
        <InputFields />
        <Plugins at="room" />
        <RoomActions />
        <Plugins at="story" />
      </Story>
      <PanelHost />
      <Overlay>
        <Notices />
      </Overlay>
    </Game>
  )
}
```

```ts
// src/main.ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'
import { Layout } from './layout.tsx'

mountGame(module.build(), { layout: Layout, pages: true, plugins: [] })
```

Each [`Plugins`](/docs/reference/react/kit#plugins) is where the plugin UIs in `plugins` put what they bring: the quests' section and the cast's People in the side column, where you are and the way out before the room's actions. Replace one with the plugin's own components, in any order, to place them yourself.

The regions are components:

- [`Game`](/docs/reference/react/components#game) is the page. With a `Sidebar` in it, it's a grid: the side column `--width-sidebar` wide and the story filling the rest of the window, however wide. Without one it's a single column, up to `--width-reading` wide, centred.
- [`Sidebar`](/docs/reference/react/components#sidebar) is the side column. Below 48rem it becomes a drawer behind a slim top bar.
- [`Story`](/docs/reference/react/components#story) is the main column.
- [`Overlay`](/docs/reference/react/components#overlay) comes after everything else and sticks to the bottom right of the window (across its width on a phone). It floats over the page while you scroll, and at the end of the page it sits after the content, so nothing is left under it.
- [`Section`](/docs/reference/react/components#section) is a titled part that folds (`collapsible`) or opens in a dialog (`dialog`), and shows only while its `when` condition holds.
- [`PanelHost`](/docs/reference/react/components#panelhost) draws the [panel](/docs/reference/panels) content opened, such as a shop's counter, in a dialog. Keep one in any layout whose content opens panels.

Each built-in part draws nothing when the game has nothing for it, and a `Section` with nothing in it hides itself. So a game without a calendar shows no clock, and one without the cast has no People button. The same layout suits a novel and a town.

The layout is a React component inside the game's [`GameProvider`](/docs/reference/react/components#gameprovider), so it can use [`useGame`](/docs/reference/react/components#usegame) and every hook, and hold components of your own beside the built-in ones. [Layouts: sections, drawers and showing things in some rooms](/docs/recipes/layouts) shows the common changes. Each example's layout is in [Shapes of game](/docs/guide/shapes).

**Gotchas.**

- **Keep `InputFields`** unless the game has no [inputs](/docs/reference/inputs). Nothing else sends `input`, so without it the player can't give the value. The same goes for `RoomActions` in a game whose buttons are its only way forward, as the café's are.
- **Keep a `PanelHost`** if any content opens a panel. Without one, a `panel` effect opens nothing on screen.
- **Put a part in one place.** Two `Notices` draw every notice twice.
- **A `Section`'s `id` is how the player's folding is remembered**, in the profile's `ui:sections`. Give each section its own.

## Pages

Turn on `pages` and the game opens on a title screen, with the game's title and the buttons New game, Continue, Load, Settings and Credits:

```ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'
import { Layout } from './layout.tsx'

mountGame(module.build(), {
  layout: Layout,
  pages: {
    subtitle: 'A novel in three chapters',
    credits: ['Written by you', { label: 'Made with IFLoom', href: 'https://ifloom.dev/' }],
  },
})
```

`pages: true` gives the title screen with nothing extra. With `pages` off or left out, the game starts straight away, as before.

A plugin UI can add a page of its own: with `achievementsUi` listed, the title screen also has an Achievements button, which goes to a page listing them. List `{ ...achievementsUi, pages: undefined }` instead to leave it out, and the achievements open in a dialog.

The runner exists from the start, whichever page is showing. New game replaces its state with [`runner.newGame`](/docs/reference/runner#newgame), and Continue and Load load a save into it. The player's [game menu](/docs/reference/react/components#gamemenu) gains Settings and Title screen buttons.

Each button shows only when it has something to do. Continue needs a save, Settings needs a [setting](/docs/reference/settings), Credits needs `credits`, and New Game+ needs a game that has been [finished](/docs/how-to/offer-new-game-plus) and declares `carryOver`. You can also add pages of your own, and a notice the player confirms once before the title screen. [The title screen and settings](/docs/recipes/title-screen) walks through it all, and [Pages](/docs/reference/react/components#pages) lists every option and component.

## Sound

When the game lists any tracks in [`game.audio`](/docs/reference/audio), `GameShell` (and so `mountGame`) starts the [audio player](/docs/browser/audio-player) for you. Music starts on the player's first click or key press, and each sound plays once. You don't need to add anything to the page, and the settings page already draws the game's volume and mute settings.

To see what it's doing, pass it a log:

```ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'

mountGame(module.build(), { audio: { log: console.debug } })
```

`audio: false` leaves sound off, for a game that plays it some other way.

A spoken line with a voice, `@ava: "Morning!" [[voice:ava.morning]]`, gets a small button after its words that plays the line again. The button is the part `voice-replay`, labelled with `ui.replayVoice`. It only shows while the player is running, so a game with `audio: false` doesn't get it. A sound beat, `[[sound:knock]]`, draws nothing.

### useAudio

```ts shape
function useAudio(options?: AudioOptions & { runner?: Runner }): AudioPlayer | null
```

`GameShell` and `mountGame` play the sound themselves, so you need `useAudio` only for a page built on a [`GameProvider`](/docs/reference/react/components#gameprovider) of your own. It starts when the component mounts and stops when it unmounts. Inside a `GameProvider` it plays that game. Outside one, pass the `runner`. The other options go to [`startAudio`](/docs/browser/audio-player#audiooptions), and are read once, when the player starts.

```tsx given
import { GameProvider, useAudio } from '@ifloom/react'
import { MyPage } from './my-page.tsx'

function Sound() {
  useAudio()
  return null
}

export const App = () => (
  <GameProvider runner={runner}>
    <Sound />
    <MyPage />
  </GameProvider>
)
```

It returns the [player](/docs/browser/audio-player#audioplayer) once it has started, and `null` before then. A runner has one player at a time: a `useAudio` inside `GameShell` or `mountGame` takes over from theirs, with its own options, so no sound plays twice.

## Pictures and video

The UI draws every picture and clip the engine puts in the view, with no setup:

- `image` and `video` [beats](/docs/reference/prose#images) in a scene, a message or a post, through [`Beat`](/docs/reference/react/components#beat)
- a scene's or a place's [layered picture](/docs/reference/media#layered-pictures) with hotspots, through [`LayeredPicture`](/docs/reference/react/components#layeredpicture)
- a post's `video`, through [`Video`](/docs/reference/react/components#video)

Clips play like GIFs unless their flags say otherwise. They load and start only when they scroll into view, and pause when they scroll out. A clip with sound follows the game's mute and volume settings, as the [`Video`](/docs/reference/react/components#video) entry explains. Pictures load lazily too.

Clicking a picture or a clip in the story opens it large in the [`MediaViewer`](/docs/reference/react/components#mediaviewer). Escape or the close button closes it. To turn that off:

```ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'

mountGame(module.build(), { viewer: false })
```

`GameShell` and `GameProvider` take the same `viewer` prop.

## Theming

The look comes from a theme preset, CSS variables for the fonts, sizes and colours, and a `data-part` attribute on every element for your own CSS. Below that you can change the built-in Tailwind classes, replace any component, or replace the page's frame. [Make it your own](/docs/reference/react/customising) covers all of it, from the smallest change to the biggest.

```css
@import "@ifloom/react/styles.css";
@import "@ifloom/react/themes/storybook.css";

:root {
  --primary: oklch(0.55 0.12 230);
}
```

**Devices.** Each device dialog carries `data-frame` with the device's frame (`phone`, `laptop`, or a name of the game's own), and each app icon carries `data-icon`. Your stylesheet can use them to draw a phone's bezel or map an icon name to a picture.

## Words

The UI's own words, such as "Stats", "Saves" and "Mark all seen", come from the same [strings table](/docs/reference/strings) as the engine's, under keys that start with `ui.`. A plugin's UI has words of its own, listed on that plugin's page under **Drawing it**, reworded the same way, such as `ui.quests` for the quests plugin's "Quests". To reword any of them, set it in your content's `strings`:

```ts
import type { Content } from '@ifloom/engine'

export const words: Content = {
  strings: {
    'ui.quests': 'To do',
  },
}
```

The clock in the sidebar doesn't use the UI's words. It prints [`view.when`](/docs/reference/view#the-clock-and-the-player), which a plugin writes. In a game with the [calendar](/docs/reference/plugins/calendar), reword it with the calendar's own string, such as `'calendar/label': '{weekday} {period}, day {day}'`. See the calendar's [strings](/docs/reference/plugins/calendar#strings).

| Key | English | Fills |
|---|---|---|
| `ui.stats` | `Stats` | |
| `ui.statLevel` | `Level {level}` | `level` |
| `ui.statProgress` | `{label}: {percent}% of the way to level {next}` | `label`, `percent`, `next` |
| `ui.allSeen` | `Mark all seen` | |
| `ui.back` | `Back` | |
| `ui.dismiss` | `Dismiss` | |
| `ui.undo` | `Undo` | |
| `ui.redo` | `Redo` | |
| `ui.inventory` | `Carrying` | |
| `ui.saves` | `Saves` | |
| `ui.save` | `Save` | |
| `ui.saveNew` | `Save in a new slot` | |
| `ui.load` | `Load` | |
| `ui.remove` | `Delete` | |
| `ui.exportSave` | `Export` | |
| `ui.importSave` | `Import a save file` | |
| `ui.noSaves` | `No saves yet.` | |
| `ui.brokenSave` | `A save that can’t be read` | |
| `ui.missingPacks` | `This save was made with mods this game doesn’t have: {packs}.` | `packs` |
| `ui.missingPlugins` | `This save was made with plugins this game doesn’t have: {plugins}.` | `plugins` |
| `ui.backlog` | `Backlog` | |
| `ui.backlogEmpty` | `Nothing yet.` | |
| `ui.chose` | `You chose: {label}` | `label` |
| `ui.enter` | `Enter` | |
| `ui.mods` | `Mods` | |
| `ui.addMod` | `Add a mod file` | |
| `ui.noMods` | `No mods added.` | |
| `ui.modOn` | `On` | |
| `ui.modOff` | `Off` | |
| `ui.applyMods` | `Restart with these mods` | |
| `ui.modsHint` | `Mods add to the game or change it. Add one from a file, and turn it on or off here.` | |
| `ui.modsChanged` | `Changes to mods take effect when the game restarts.` | |
| `ui.close` | `Close` | |
| `ui.heldCount` | `×{n}` | `n` |
| `ui.newGame` | `New game` | |
| `ui.continue` | `Continue` | |
| `ui.newGamePlus` | `New Game+` | |
| `ui.settings` | `Settings` | |
| `ui.noSettings` | `There are no settings.` | |
| `ui.credits` | `Credits` | |
| `ui.titlePage` | `Title screen` | |
| `ui.replayVoice` | `Hear it again` | |
| `ui.zoom` | `Enlarge` | |
| `ui.closeViewer` | `Close` | |
| `ui.menu` | `Menu` | |
| `ui.timeLeft` | `Time left` | |
| `ui.timerLeft` | `{seconds}s` | The seconds left on a [`Countdown`](/docs/reference/react/components#countdown). |
| `ui.diceNeeds` | `needs {against}` | `against`: the roll's target |
| `ui.dicePassed` | `Passed` | |
| `ui.diceFailed` | `Failed` | |
| `ui.diceCriticalMax` | `Critical!` | |
| `ui.diceCriticalMin` | `Fumble` | |
| `ui.diceRolled` | `Rolled {dice}: {faces}, total {total}.` | `dice`, `faces`, `total` |
| `ui.diceRolledPassed` | `Needed {against}: passed.` | `against` |
| `ui.diceRolledFailed` | `Needed {against}: failed.` | `against` |
| `ui.diceDismiss` | `Dismiss the roll` | |
| `ui.notices` | `Notices` | |
| `ui.noticesMore` | `+{n} more` | `n`: the notices hidden on a phone |
| `ui.noticesFewer` | `Show fewer` | |
| `ui.unread` | `Unread` | |

Which component uses which keys:

- **[Game menu](/docs/reference/react/components#gamemenu)**: `ui.undo` and `ui.redo`, `ui.saves`, `ui.backlog`, `ui.mods`, `ui.settings` and `ui.titlePage`, and `ui.menu` as the title of the dialog Escape opens. `ui.close` is the screen-reader label on its dialog's close button, and on every dialog's.
- **[Stat list](/docs/reference/react/components#statlist)**: `ui.statLevel` after a levelled stat's label, and `ui.statProgress` as the label on its bar.
- **[Inventory](/docs/reference/react/components#inventory)**: `ui.inventory`, and `ui.heldCount` after a thing there's more than one of.
- **[Price tag](/docs/reference/react/components#pricetag)**: a price's own `text`, joined by the engine's `priceSeparator` [string](/docs/reference/strings#buttons-and-labels).
- **[Beat](/docs/reference/react/components#beat)**: `ui.replayVoice`, the label on a spoken line's replay button, and `ui.zoom`, the label on the button around a picture or a clip that opens the viewer.
- **[Media viewer](/docs/reference/react/components#mediaviewer)**: `ui.closeViewer`, the label on its close button, and `ui.zoom` as its title when the picture has no alt text.
- **[Notices](/docs/reference/react/components#notices)**: `ui.dismiss`, the label on each notice's dismiss button, and `ui.noticesMore` and `ui.noticesFewer` on the button that shows or hides the older notices on a phone.
- **[Notice strip](/docs/reference/react/components#noticestrip)**: `ui.notices` on its notices count and its dialog, `ui.unread` as its label for screen readers, and `ui.allSeen` on the dialog's button.
- **[Minigame card](/docs/reference/react/components#minigamecard)**: `ui.timeLeft`, the label on its countdown bar. Each input's button says its `label` from the view, the engine's `minigame.<input>` [string](/docs/reference/strings#buttons-and-labels).
- **[Dice](/docs/reference/react/components#diceroll)**: `ui.dicePassed`, `ui.diceFailed` and `ui.diceNeeds` on a roll's outcome, `ui.diceCriticalMax` and `ui.diceCriticalMin` on a critical, `ui.diceRolled`, `ui.diceRolledPassed` and `ui.diceRolledFailed` in what a screen reader hears, and `ui.diceDismiss` on the overlay's close button.
- **[Saves menu](/docs/reference/react/components#savesmenu)**: `ui.saves` to `ui.missingPlugins`.
- **[Backlog](/docs/reference/react/components#backlog)**: `ui.backlog` to `ui.chose`.
- **[Input fields](/docs/reference/react/components#inputfield)**: `ui.enter`.
- **[Mod manager](/docs/reference/react/components#modmanager)**: `ui.mods` to `ui.modsChanged`, plus `ui.remove` from the saves menu for its Delete button. On the settings page, `ui.mods` heads its section and `ui.modsHint` is the line under it.
- **[Title screen](/docs/reference/react/components#titlepage)**: `ui.continue`, `ui.newGame`, `ui.newGamePlus`, `ui.load`, `ui.settings` and `ui.credits`. A page a plugin UI adds has its button labelled by its own word, such as `ui.achievements`.
- **[Panels](/docs/reference/react/components#panelhost)**: the built-in panels' dialogs are titled `ui.inventory` and `ui.stats`. A plugin UI's panel is titled by its own word, such as `ui.jobs`, and the shop's by the vendor's name.
- **[Settings](/docs/reference/react/components#settingspage), [load](/docs/reference/react/components#loadpage) and [credits](/docs/reference/react/components#creditspage) pages**: their headings `ui.settings`, `ui.load` and `ui.credits`, `ui.back` on their Back button, and `ui.noSettings`. The load page also uses `ui.noSaves`, `ui.brokenSave`, `ui.remove` and `ui.importSave`.

Everything else on screen comes from the view, in the game's own words: titles, prose, labels, the reasons on greyed-out buttons, warnings, price notes and the clock. Those come from the game, the engine's [strings](/docs/reference/strings) and its plugins' strings.

Each plugin UI's words are on its plugin's page, and in a table it exports, such as the debug card's `DEBUG_WORDS` on the [debug plugin](/docs/reference/plugins/debug#debugui)'s page.

In code, [`UiStringKey`](/docs/reference/react/components#uistringkey-words-and-say) is one of this table's keys, and [`useWords`](/docs/reference/react/components#usewords) reads a word for the game inside a component.

## Next

- [Make it your own](/docs/reference/react/customising): presets, tokens, parts, classes and replacing components.
- [Components](/docs/reference/react/components): every export, with its props.
- [Extending](/docs/reference/react/extending): your own panels, plugin sections, your own layout, and more shadcn/ui components.
