---
title: "The React UI"
---
`@ifloom/react` draws an IFLoom game in the browser with React. It's the ready-made UI, but not the only way: the engine has no framework of its own, and [Using another framework](/docs/guide/frameworks) shows a game drawn with Vue, Svelte or plain DOM. This package is a set of React components built on [shadcn/ui](https://ui.shadcn.com) ([Radix](https://www.radix-ui.com) primitives styled with [Tailwind CSS](https://tailwindcss.com) v4). You can use it as it is, restyle it, or take it apart.

```ts
import { mountGame } from '@ifloom/react'
import game from './game.ts'

mountGame(game)
```

[`mountGame`](#mountgame) starts the game and draws it into the page. Underneath, [`GameShell`](#gameshell) is the whole UI in one component. Every part it's made of is exported too, as are the shadcn/ui primitives it's built from, so you can:

- **Use it as it is**, with your own words. That's this page.
- **Give it a look of its own**, from a theme preset and a few CSS variables up to replacing any component. See [Make it your own](/docs/react/customising).
- **Add your own screens**, such as a scene's bespoke panel, an app's screen or a plugin's view. See [Extending](/docs/react/extending).
- **Lay it out your own way**, by naming the parts for the side column and the stage ([Layouts](#layouts)), or build a different page from the same parts ([Your own layout](/docs/react/extending#your-own-layout)).

Every component is listed, with its props, under [Components](/docs/react/components).

The engine doesn't need this package. The UI only reads the [view](/docs/reference/view) and sends [commands](/docs/reference/commands) through a [runner](/docs/reference/runner), as a UI of your own would. A game that wants Vue, Svelte or a terminal leaves it out (see [Using another framework](/docs/guide/frameworks)).

## What it shows

- **The stage.** The scene on screen, or the room when no scene is open (a plugin's [stage](/docs/reference/plugins#stage), such as the [places](/docs/plugins/places) plugin's). It draws the pictures, the spoken lines and the choices.
- **The sidebar.** The game's title and the clock, when a plugin such as the [calendar](/docs/plugins/calendar) says what time it is. Then the stats, the player's menu, the device buttons, where the player is and the exits (with the [places](/docs/plugins/places) plugin), who is here and what you can do with them, the room's and the game's actions, what the player carries, and what they're wearing.
- **Inputs**, under the scene, when the game asks for one: a name to type, a number, or options to pick from.
- **Notices**, in the bottom corner (the layout's overlay), each with a button to dismiss it. On a phone only the newest shows, with a button for the rest.
- **A title screen**, if you turn on [`pages`](#pages): the title, New game, Continue, Load, Settings and Credits, before the game itself.
- **Saves, the backlog and mods**, each in a dialog opened from the player's menu. The saves dialog lists every slot to load, overwrite, export or delete. The backlog shows every scene so far with the choice made in it. The mods dialog lists the player's [mods](/docs/reference/mods), each on, off or removed, with a button to restart the game with the change.
- **Quests**, under the stage, when the game has the [quests plugin](/docs/plugins/quests).
- **Devices**, in a dialog, when the game has the [devices plugin](/docs/plugins/devices) or the [phone](/docs/plugins/phone). This covers the home screen and each app's sections, including [messages](/docs/plugins/messages) and [feeds](/docs/plugins/feed).
- **A debug panel**, under the stage, when the game has the [debug plugin](/docs/plugins/debug).
- **The wardrobe**, at the foot of the sidebar, when the game has the [wardrobe plugin](/docs/plugins/wardrobe).

That's where [`DEFAULT_LAYOUT`](#layouts) puts each one. A [layout](#layouts) of your own can move any of them, or drop the side column.

When a choice or action is greyed out, the button shows the reason under its label, so the player doesn't have to hover to find out. Its price is on the button too.

The UI reads each plugin's view by its shape and imports no plugin package. If the game doesn't have a plugin, there's no panel for it.

## Install

[Installation](/docs/guide/installation) covers the two ways to depend on IFLoom while it's pre-release: as a workspace inside a clone of the repository, or from a separate folder with `file:` dependencies. Add `@ifloom/react` the same way you add the engine.

On top of the engine, the UI needs React 19 and react-dom, and Tailwind CSS v4 with its Vite plugin. The [CLI's Vite preset](/docs/cli#the-vite-preset) wires up React and Tailwind for you. Like the engine, the UI ships TypeScript and TSX source with no build step, which Vite handles out of the box. Add the plugins your game uses beside it, such as `@ifloom/plugin-quests` (see [Adding one](/docs/plugins#adding-one)).

Your `tsconfig.json` needs the engine's settings from [Installation](/docs/guide/installation), plus JSX, the DOM and Vite's client types:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "types": ["@ifloom/cli/client"]
  }
}
```

`@ifloom/cli/client` is Vite's browser types, which let TypeScript accept `import './styles.css'` and `import.meta.env`. React's types come with `@ifloom/react`. [Installation](/docs/guide/installation) shows the full file.

## Set it up

The quickest start is `ifloom new`, which writes all of this for you (see [Installation](/docs/guide/installation)). By hand, you need four files: the Vite config, a stylesheet, the entry and an `index.html`.

```ts
// vite.config.ts
import { ifloom } from '@ifloom/cli/vite'

export default ifloom()
```

The [CLI's preset](/docs/cli#the-vite-preset) adds React and Tailwind when your game depends on `@ifloom/react`, and builds one HTML file that opens from disk. Run the game with `ifloom dev` and build it with `ifloom build`. Without the CLI, use `react()` and `tailwindcss()` as your Vite plugins, and see [Shipping a game](/docs/guide/shipping#without-the-cli) for the rest.

```css
/* src/styles.css */
@import "@ifloom/react/styles.css";
@import "@ifloom/react/themes/paper.css";
```

The UI's stylesheet imports Tailwind itself and tells it to scan the UI's components, so the first line is all the UI needs. Don't `@import "tailwindcss"` a second time. Tailwind also finds the classes in your own files, so you can use its utilities in your own components. The second line is optional and picks a theme preset. See [Make it your own](/docs/react/customising) for the presets and everything else you can change.

```ts
// src/main.ts
import { READING_LAYOUT, mountGame } from '@ifloom/react'
import game from './game.ts'
import './styles.css'

mountGame(game, { layout: READING_LAYOUT })
```

Here `src/game.ts` exports what [`loadGame`](/docs/reference/loader#loadgame) returned, `{ game, problems }`. `mountGame` logs any problems as warnings.

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

```ts
function mountGame(game: Game | { game: Game; problems?: readonly unknown[] }, options?: MountOptions): Runner

type MountOptions = Omit<GameShellProps, 'runner'> & {
  root?: string | Element
  start?: GameState
  runner?: RunnerOptions
  app?: ComponentType
  audio?: false | AudioOptions
}
```

`mountGame` makes a runner for the game with the engine's [`browserRunner`](/docs/reference/runner#browserrunner) and draws [`GameShell`](#gameshell) into the page, or your own `app`, inside React's `StrictMode`. It returns the runner, so your own code can still send commands or read the state.

It sets up what most games want:

| Option | Default |
|---|---|
| `root` | `'#root'`. An element, or a selector for one. It throws if nothing matches. |
| `start` | A new game, `startingState(game, { seed })`, with a random seed so each playthrough draws its own variants. |
| `runner` | `browserRunner`'s defaults: `{ history: { depth: 50 }, saves: saves(game, localStorageDriver()), profile: profile(game, localStorageDriver()), autosave: { every: 'turn' } }`. Whatever you pass is merged over these. |
| `pages` | Off, so the game starts straight away. `true`, or [`PagesOptions`](/docs/react/components#pagesoptions), opens on a title screen. See [Pages](#pages). |
| `app` | None, so `GameShell` is drawn. Your own root component, drawn inside a [`GameProvider`](/docs/react/components#gameprovider) instead. `useGame`, the hooks and every built-in component work in it. With `pages` on, it's drawn on the `game` page. See [Write your own root](/docs/react/customising#8-write-your-own-root). |
| `components` | None. Your own components in place of built-in ones, by name. See [Replace a component](/docs/react/customising#6-replace-a-component). |
| `classes` | None. Tailwind classes for any part, by its `data-part` name. See [Change the built-in classes](/docs/react/customising#4-change-the-built-in-classes). |
| `unstyled` | `false`. `true` drops every built-in class. |
| `viewer` | `true`. Clicking a picture or a clip in the story opens it large in the [`MediaViewer`](/docs/react/components#mediaviewer). `false` turns that off. See [Pictures and video](#pictures-and-video). |
| `keys` | Off. `true` turns on the keyboard shortcuts: 1 to 9 for the choices on screen, each showing its number, and Escape for the menu. [`KeyOptions`](/docs/react/components#keyoptions) adds keys of your own with `map`. A minigame's own keys work either way. |
| `audio` | On when the game lists any tracks in [`game.audio`](/docs/reference/audio). `false` turns sound off, and an object is passed to [`startAudio`](/docs/reference/audio-player#startaudio) as its [options](/docs/reference/audio-player#audiooptions). See [Sound](#sound). |

Any other option goes to `GameShell` as a prop, such as `layout`, `panels` or `mods`. With `app`, `layout` and `className` are ignored, and the rest go to the provider.

```ts
import { mountGame } from '@ifloom/react'
import game from './game.ts'

const runner = mountGame(game, {
  runner: { backlog: { limit: 200 } },
  layout: { sidebar: ['title', 'stats', 'menu'], stage: ['scene', 'entities', 'actions'] },
})
```

When you need more control, build the runner yourself (with [`browserRunner`](/docs/reference/runner#browserrunner) or [`createRunner`](/docs/reference/runner#createrunner)) and render `GameShell` with React. [The Corner Café](/docs/guide/shapes) uses `mountGame`; [Small Town](/docs/guide/showcase#the-files)'s `src/main.tsx` does it by hand, because it loads the player's mods from IndexedDB before it makes the game:

```tsx
// src/main.tsx
import { createRoot } from 'react-dom/client'
import { createRunner, localStorageDriver, profile, saves, startingState } from '@ifloom/engine'
import { GameShell } from '@ifloom/react'
import loaded from './game.ts'
import './styles.css'

const { game } = loaded
const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  saves: saves(game, localStorageDriver()),
  profile: profile(game, localStorageDriver()),
  history: { depth: 50 },
  autosave: { every: 'turn' },
})

createRoot(document.getElementById('root')!).render(<GameShell runner={runner} pages />)
```

The shell redraws whenever the runner's state changes, so undo, loading a save and a command sent from anywhere else all show at once.

## GameShell

```tsx
function GameShell(props: GameShellProps): JSX.Element

type GameShellProps = {
  runner: Runner
  panels?: Record<string, PanelComponent>
  sections?: Record<string, PluginSectionComponent>
  mods?: ModsOption
  components?: Components
  classes?: Classes
  unstyled?: boolean
  viewer?: boolean
  keys?: boolean | KeyOptions
  className?: string
  layout?: Layout
  pages?: boolean | PagesOptions
}
```

| Prop | What it is |
|---|---|
| `runner` | The game's [runner](/docs/reference/runner). |
| `panels` | The game's own panels, by name: a scene's bespoke panel, or an app's panel section. See [Panels](/docs/react/extending#panels). |
| `sections` | Renderers for plugin sections in apps, by plugin id. Messages and feeds are built in. See [Plugin sections](/docs/react/extending#plugin-sections). |
| `mods` | The player's [mods](/docs/reference/mods): the store, the loader's problems, and how to restart. It turns on **Mods** in the player's menu. See [`ModsOption`](/docs/react/components#modsoption). |
| `components`, `classes`, `unstyled` | How the UI looks, below the theme. See [Make it your own](/docs/react/customising). |
| `viewer` | Whether clicking a picture in the story opens it large. On if you leave it out. |
| `keys` | Keyboard shortcuts for choices and the menu. Off if you leave it out. See [`KeyOptions`](/docs/react/components#keyoptions). |
| `className` | Classes on the page, merged over its own. |
| `layout` | Which parts go in the side column, on the stage and in the overlay, in order. If you leave it out, you get [`DEFAULT_LAYOUT`](/docs/react/components#default_layout). See [Layouts](#layouts). |
| `pages` | The title screen and the pages around the game. Off if you leave it out. See [Pages](#pages). |

The page is drawn by a [`Frame`](/docs/react/components#frame). With a side column, it's a two-column grid on wide screens, with the column on the left (`--width-sidebar` wide) and the stage on the right, up to `--width-page` in all. It stacks on narrow screens. Without a side column, the page is a single column, up to `--width-reading` wide, holding the stage. The overlay, with the notices, comes after everything else and sticks to the bottom right of the window (across its width on a phone). It floats over the page while you scroll, and at the end of the page it sits after the content, so nothing is left under it.

### Layouts

A layout names the parts of the screen, in order, for the side column, the stage and the overlay that floats at the bottom of the window:

```ts
type Layout = { sidebar?: readonly Part[]; stage?: readonly Part[]; overlay?: readonly Part[] }
type Part = PartName | ReactNode
type PartName =
  | 'title' | 'stats' | 'entities' | 'menu' | 'devices' | 'separator' | 'location' | 'people'
  | 'actions' | 'inventory' | 'wardrobe' | 'scene' | 'inputs' | 'quests' | 'debug' | 'notices'
  | 'notice-strip'
```

| Part | What it draws |
|---|---|
| `'title'` | The game's title and the [`Clock`](/docs/react/components#clock): [`Title`](/docs/react/components#title). |
| `'stats'` | [`StatList`](/docs/react/components#statlist). |
| `'entities'` | [`EntityTable`](/docs/react/components#entitytable), every kind. |
| `'menu'` | The player's menu, [`GameMenu`](/docs/react/components#gamemenu). |
| `'devices'` | [`DeviceButtons`](/docs/react/components#devicebuttons). |
| `'separator'` | A [`Separator`](/docs/react/components#separator) line. |
| `'location'` | [`LocationPanel`](/docs/react/components#locationpanel): where the player is and the exits. |
| `'people'` | [`PeoplePanel`](/docs/react/components#peoplepanel). |
| `'actions'` | The room's and the game's buttons, [`Actions`](/docs/react/components#actions). |
| `'inventory'` | [`Inventory`](/docs/react/components#inventory). |
| `'wardrobe'` | [`WardrobePanel`](/docs/react/components#wardrobepanel). |
| `'scene'` | [`SceneStage`](/docs/react/components#scenestage). |
| `'inputs'` | [`InputFields`](/docs/react/components#inputfields). |
| `'quests'` | [`QuestLog`](/docs/react/components#questlog). |
| `'debug'` | [`DebugPanel`](/docs/react/components#debugpanel). |
| `'notices'` | [`Notices`](/docs/react/components#notices), the unseen notices. |
| `'notice-strip'` | [`NoticeStrip`](/docs/react/components#noticestrip), a row of unread counts. No built-in layout includes it. |

Each built-in part draws nothing when the game has nothing for it. A game without a calendar shows no clock, and one without the cast shows no people. So a layout can safely list parts a game doesn't use. Two layouts are exported:

```ts
const DEFAULT_LAYOUT = {
  sidebar: ['title', 'stats', 'entities', 'menu', 'devices', 'separator', 'location', 'people', 'actions', 'inventory', 'wardrobe'],
  stage: ['scene', 'inputs', 'quests', 'debug'],
  overlay: ['notices'],
}

const READING_LAYOUT = {
  sidebar: [],
  stage: ['title', 'scene', 'inputs', 'actions', 'stats', 'menu'],
  overlay: ['notices'],
}
```

`DEFAULT_LAYOUT` is what a `GameShell` with no `layout` draws. Everything goes at the side and the scene goes on the stage, which suits a game with a map and people. `READING_LAYOUT` is a page to read, for a novel. It has no side column, puts the title over the scene, and puts the buttons and the stats under it. Both put the notices in the overlay.

A management game puts what it manages on the stage, where the eye goes. The Corner Café puts its tables of staff and dishes under the scene, above the week's buttons:

```tsx
import { GameShell, READING_LAYOUT } from '@ifloom/react'

<GameShell runner={runner} layout={READING_LAYOUT} />

<GameShell runner={runner} layout={{ sidebar: ['title', 'stats', 'menu'], stage: ['scene', 'entities', 'actions', 'inputs'] }} />
```

See each shape's layout in [Shapes of game](/docs/guide/shapes).

#### Parts of your own

Anything in the list that isn't a part's name is drawn as it is, in its place, so your own components can sit among the built-in ones. They're inside the shell's [`GameProvider`](/docs/react/components#gameprovider), so they can read the view and send commands with [`useGame`](/docs/react/components#usegame). To keep the default layout and add something, spread `DEFAULT_LAYOUT` and change one list:

```tsx
import { Button, DEFAULT_LAYOUT, GameShell, useGame } from '@ifloom/react'

function SaveButton() {
  const { runner } = useGame()
  return <Button variant="outline" onClick={() => runner.save('1', 'Quick save')}>Save</Button>
}

function Purse() {
  const { view } = useGame()
  return <p className="text-sm">In your pocket: {view.statsById.coins.text}</p>
}

const [title, ...rest] = DEFAULT_LAYOUT.sidebar

<GameShell runner={runner} layout={{ ...DEFAULT_LAYOUT, sidebar: [title, <Purse key="purse" />, ...rest, <SaveButton key="save" />] }} />
```

**Gotchas.**

- **A layout replaces each list whole.** If your layout leaves out `stage` or `overlay`, you get the default one. If it leaves out `sidebar`, you get no side column at all, not the default one. So `layout={{ stage: ['scene'] }}` is a single column with the scene, and the notices in the bottom corner. Spread `DEFAULT_LAYOUT` to keep its side column.
- **Move the notices, don't copy them.** To put `'notices'` on the stage, also set `overlay: []`, or they're drawn in both places. An empty overlay draws nothing over the page.
- **Give your own nodes a `key`.** They're drawn from a list, so React asks for one.
- **Leave out `'inputs'` only if the game has no [inputs](/docs/reference/inputs).** Nothing else sends `input`, so without it the player can't give the value. The same goes for `'actions'` in a game whose buttons are its only way forward, as the café's are.

## Pages

Turn on `pages` and the game opens on a title screen, with the game's title and the buttons New game, Continue, Load, Settings and Credits:

```ts
import { READING_LAYOUT, mountGame } from '@ifloom/react'
import game from './game.ts'

mountGame(game, {
  layout: READING_LAYOUT,
  pages: {
    subtitle: 'A novel in three chapters',
    credits: ['Written by you', { label: 'Made with IFLoom', href: 'https://ifloom.github.io/ifloom/' }],
  },
})
```

`pages: true` gives the title screen with nothing extra. With `pages` off or left out, the game starts straight away, as before.

The runner exists from the start, whichever page is showing. New game replaces its state with [`runner.newGame`](/docs/reference/runner#newgame), and Continue and Load load a save into it. The player's [game menu](/docs/react/components#gamemenu) gains **Settings** and **Title screen**.

Each button shows only when it has something to do. Continue needs a save, Settings needs a [setting](/docs/reference/settings), Credits needs `credits`, and New Game+ needs a game that has been [finished](/docs/reference/state#new-game) and declares `carryOver`. You can also add pages of your own, and a notice the player confirms once before the title screen. [The title screen and settings](/docs/guide/title-screen) walks through it all, and [Pages](/docs/react/components#pages) lists every option and component.

## Sound

When the game lists any tracks in [`game.audio`](/docs/reference/audio), `mountGame` starts the [audio player](/docs/reference/audio-player) for you. Music starts on the player's first click or key press, and each sound plays once. You don't need to add anything to the page, and the settings page already draws the game's volume and mute settings.

To see what it's doing, pass it a log:

```ts
mountGame(game, { audio: { log: console.debug } })
```

`audio: false` leaves sound off, for a game that plays it some other way.

A spoken line with a voice, `Ava: "Morning!" [[voice:ava.morning]]`, gets a small button after its words that plays the line again. The button is the part `voice-replay`, labelled with `ui.replayVoice`. It only shows while the player is running, so a game with `audio: false` doesn't get it. A sound beat, `[[sound:knock]]`, draws nothing.

### useAudio

```ts
function useAudio(options?: AudioOptions & { runner?: Runner }): AudioPlayer | null
```

If you draw [`GameShell`](#gameshell) yourself rather than with `mountGame`, start the player with `useAudio`. It starts when the component mounts and stops when it unmounts. Inside a [`GameProvider`](/docs/react/components#gameprovider) it plays that game. Outside one, pass the `runner`. The other options go to [`startAudio`](/docs/reference/audio-player#audiooptions), and are read once, when the player starts.

```tsx
import { useAudio, GameShell } from '@ifloom/react'

function App() {
  useAudio({ runner })
  return <GameShell runner={runner} />
}
```

It returns the [player](/docs/reference/audio-player#audioplayer) once it has started, and `null` before then. Use one or the other: `mountGame` with `useAudio` inside it would play every sound twice.

## Pictures and video

The UI draws every picture and clip the engine puts in the view, with no setup:

- `image` and `video` [beats](/docs/reference/prose#images) in a scene, a message or a post, through [`Beat`](/docs/react/components#beat);
- a scene's or a place's [stage](/docs/reference/media#the-stage), a layered picture with hotspots, through [`Stage`](/docs/react/components#stage);
- a post's `video`, through [`Video`](/docs/react/components#video).

Clips play like GIFs unless their flags say otherwise. They load and start only when they scroll into view, and pause when they scroll out. A clip with sound follows the game's mute and volume settings, as the [`Video`](/docs/react/components#video) entry explains. Pictures load lazily too.

Clicking a picture or a clip in the story opens it large in the [`MediaViewer`](/docs/react/components#mediaviewer). Escape or the close button closes it. To turn that off:

```ts
mountGame(game, { viewer: false })
```

`GameShell` and `GameProvider` take the same `viewer` prop.

## Theming

The look comes from a theme preset, CSS variables for the fonts, sizes and colours, and a `data-part` attribute on every element for your own CSS. Below that you can change the built-in Tailwind classes, replace any component, or replace the page's frame. [Make it your own](/docs/react/customising) covers all of it, from the smallest change to the biggest.

```css
@import "@ifloom/react/styles.css";
@import "@ifloom/react/themes/storybook.css";

:root {
  --primary: oklch(0.55 0.12 230);
}
```

**Devices.** Each device dialog carries `data-frame` with the device's frame (`phone`, `laptop`, or a name of the game's own), and each app icon carries `data-icon`. Your stylesheet can use them to draw a phone's bezel or map an icon name to a picture.

## Words

The UI's own words, such as **Quests**, **Track** and **Mark all seen**, come from the same [strings table](/docs/reference/strings) as the engine's, under keys that start with `ui.`. To reword any of them, set it in `game.strings`:

```ts
import { loadGame } from '@ifloom/engine'
import { town } from './content/town.ts'

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro',
  strings: {
    'ui.quests': 'To do',
  },
})
```

The clock in the sidebar doesn't use the UI's words. It prints [`view.when`](/docs/reference/view#the-clock-and-the-player), which a plugin writes. In a game with the [calendar](/docs/plugins/calendar), reword it with the calendar's own string, such as `'calendar/label': '{weekday} {period}, day {day}'`. See the calendar's [strings](/docs/plugins/calendar#strings).

| Key | English | Fills |
|---|---|---|
| `ui.quests` | `Quests` | |
| `ui.statLevel` | `Level {level}` | `level` |
| `ui.statProgress` | `{label}: {percent}% of the way to level {next}` | `label`, `percent`, `next` |
| `ui.questNew` | `New` | |
| `ui.questStage` | `{stage} of {stages}` | `stage`, `stages` |
| `ui.track` | `Track` | |
| `ui.untrack` | `Untrack` | |
| `ui.allSeen` | `Mark all seen` | |
| `ui.allRead` | `Mark all read` | |
| `ui.back` | `Back` | |
| `ui.dismiss` | `Dismiss` | |
| `ui.likes` | `♥ {n}` | `n` |
| `ui.debug` | `Debug` | |
| `ui.seed` | `seed {seed}` | `seed` |
| `ui.undo` | `Undo` | |
| `ui.redo` | `Redo` | |
| `ui.set` | `Set` | |
| `ui.debugSet` | `Set` | |
| `ui.debugWhy` | `Why not` | |
| `ui.debugState` | `State` | |
| `ui.debugLog` | `Log` | |
| `ui.locksOn` | `Locks on` | |
| `ui.greyedOut` | `Greyed out` | |
| `ui.noneOn` | `None.` | |
| `ui.nothingGreyed` | `Nothing.` | |
| `ui.closeScene` | `Close the scene` | |
| `ui.wardrobe` | `Wearing` | |
| `ui.inventory` | `Carrying` | |
| `ui.takeOff` | `Take off` | |
| `ui.wear` | `Wear` | |
| `ui.nothingOn` | `Nothing` | |
| `ui.saves` | `Saves` | |
| `ui.save` | `Save` | |
| `ui.saveNew` | `Save in a new slot` | |
| `ui.load` | `Load` | |
| `ui.remove` | `Delete` | |
| `ui.exportSave` | `Export` | |
| `ui.importSave` | `Import a save file` | |
| `ui.noSaves` | `No saves yet.` | |
| `ui.missingPacks` | `This save was made with packs this game doesn’t have: {packs}.` | `packs` |
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
| `ui.close` | `Close` | |
| `ui.priceSeparator` | ` · ` | |
| `ui.itemCount` | `×{n}` | `n` |
| `ui.wearItem` | `Wear {item}` | `item` |
| `ui.mailHeader` | `{key}: {value}` | `key`, `value` |
| `ui.debugStat` | `Stat` | |
| `ui.debugVariable` | `Variable` | |
| `ui.debugItem` | `Item` | |
| `ui.debugStatOf` | `Stat of` | |
| `ui.debugGo` | `Go` | |
| `ui.debugScene` | `Scene` | |
| `ui.debugTime` | `Time` | |
| `ui.debugTurn` | `Turn` | |
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
| `ui.minigameUp` | `Up` | |
| `ui.minigameDown` | `Down` | |
| `ui.minigameLeft` | `Left` | |
| `ui.minigameRight` | `Right` | |
| `ui.minigameSpace` | `Space` | |
| `ui.notices` | `Notices` | |
| `ui.noticesMore` | `+{n} more` | `n`: the notices hidden on a phone |
| `ui.noticesFewer` | `Show fewer` | |
| `ui.unread` | `Unread` | |

Which component uses which keys:

- **[Debug panel](/docs/react/components#debugpanel)**: `ui.debug` to `ui.closeScene`, and `ui.debugStat` to `ui.debugTurn` for its form rows. `ui.set` is the button on each of its forms and `ui.debugSet` is the tab they're on. `ui.noneOn` and `ui.nothingGreyed` are what the **Why not** tab says when no lock is on or nothing is greyed out.
- **[Game menu](/docs/react/components#gamemenu)**: `ui.undo` and `ui.redo` (shared with the debug panel), `ui.saves`, `ui.backlog`, `ui.mods`, `ui.settings` and `ui.titlePage`, and `ui.menu` as the title of the dialog Escape opens. `ui.close` is the screen-reader label on its dialog's close button, and on a device's.
- **[Wardrobe panel](/docs/react/components#wardrobepanel)**: `ui.wardrobe`, `ui.takeOff` and `ui.nothingOn`, and `ui.wearItem` for each wear button. `ui.wear` is no longer drawn.
- **[Stat list](/docs/react/components#statlist)**: `ui.statLevel` after a levelled stat's label, and `ui.statProgress` as the label on its bar.
- **[Inventory](/docs/react/components#inventory)**: `ui.inventory`, and `ui.itemCount` after an item there's more than one of.
- **[Price tag](/docs/react/components#pricetag)**: `ui.priceSeparator`, between the parts of a price.
- **[Beat](/docs/react/components#beat)**: `ui.mailHeader`, for each header line of a letter, `ui.replayVoice`, the label on a spoken line's replay button, and `ui.zoom`, the label on the button around a picture or a clip that opens the viewer.
- **[Media viewer](/docs/react/components#mediaviewer)**: `ui.closeViewer`, the label on its close button, and `ui.zoom` as its title when the picture has no alt text.
- **[Notices](/docs/react/components#notices)**: `ui.dismiss`, the label on each notice's dismiss button, and `ui.noticesMore` and `ui.noticesFewer` on the button that shows or hides the older notices on a phone.
- **[Notice strip](/docs/react/components#noticestrip)**: `ui.notices` on its notices count and its dialog, `ui.unread` as its label for screen readers, and `ui.allSeen` on the dialog's button.
- **[Minigame panel](/docs/react/components#minigamepanel)**: `ui.timeLeft`, the label on its countdown bar, and `ui.minigameUp` to `ui.minigameSpace` on the buttons for those inputs. Any other input's button takes the game's `ui.minigame.<input>` string.
- **[Devices](/docs/react/components#devicescreen)**: `ui.back`, the label on an open app's back button.
- **[Saves menu](/docs/react/components#savesmenu)**: `ui.saves` to `ui.missingPlugins`.
- **[Backlog](/docs/react/components#backlog)**: `ui.backlog` to `ui.chose`.
- **[Input fields](/docs/react/components#inputfield)**: `ui.enter`.
- **[Mod manager](/docs/react/components#modmanager)**: `ui.mods` to `ui.applyMods`, plus `ui.remove` from the saves menu for its **Delete** button.
- **[Title screen](/docs/react/components#titlepage)**: `ui.continue`, `ui.newGame`, `ui.newGamePlus`, `ui.load`, `ui.settings` and `ui.credits`.
- **[Settings](/docs/react/components#settingspage), [load](/docs/react/components#loadpage) and [credits](/docs/react/components#creditspage) pages**: their headings `ui.settings`, `ui.load` and `ui.credits`, `ui.back` on their Back button, and `ui.noSettings`. The load page also uses `ui.noSaves` and `ui.importSave`.

Everything else on screen comes from the view, in the game's own words: titles, prose, labels, the reasons on greyed-out buttons, warnings, price notes and the clock. Those come from the game, the engine's [strings](/docs/reference/strings) and its plugins' strings.

In code, [`UI_STRINGS`](/docs/react/components#ui_strings) is this table in English, [`uiSay`](/docs/react/components#uisay) reads a word for a game, and [`useWords`](/docs/react/components#usewords) does the same inside a component.

**Gotcha.** The debug panel's placeholders (`stat`, `value` and the rest) are always in English and aren't in the table. The panel is a tool for the person building the game, not for the player.

## Next

- [Make it your own](/docs/react/customising): presets, tokens, parts, classes and replacing components.
- [Components](/docs/react/components): every export, with its props.
- [Extending](/docs/react/extending): your own panels, plugin sections, your own layout, and more shadcn/ui components.
