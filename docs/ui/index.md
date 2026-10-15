# The base UI

`@ifloom/ui` draws an IFLoom game in the browser: the scene and its choices, the clock and the stats, where the player is and who is there, what they carry and wear, inputs, notices, quests, devices, saves, a backlog, undo, the player's mods and a debug panel. It is a set of React components built on [shadcn/ui](https://ui.shadcn.com) ([Radix](https://www.radix-ui.com) primitives styled with [Tailwind CSS](https://tailwindcss.com) v4), for you to use as it is, restyle, or take apart.

```tsx
import { GameShell } from '@ifloom/ui'

<GameShell runner={runner} />
```

`GameShell` is the whole UI in one component. Everything it is made of is exported too, as are the shadcn/ui primitives it is built from, so a game can:

- **use it as it is**, with its own words and colours (this page);
- **add its own screens** to it: a scene's bespoke panel, an app's screen, a plugin's view ([Extending](/ui/extending));
- **lay it out its own way**, by naming the parts for the side column and the stage ([Layouts](#layouts)), or build another page entirely from the same parts ([Extending](/ui/extending#your-own-layout)).

Every component is listed, with its props, under [Components](/ui/components).

The engine does not need it. The UI only reads the [view](/reference/view) and sends [commands](/reference/commands) through a [runner](/reference/runner), the same as a UI of your own would, so a game that wants Svelte or a terminal leaves this package out.

## What it shows

- **The stage**: the scene on screen, or, when none is open, the room (a plugin's [stage](/reference/plugins#stage), such as the [places](/plugins/places) plugin's), with its pictures, its spoken lines and its choices.
- **The sidebar**: the game's title and the clock (when a plugin such as the [calendar](/plugins/calendar) says when it is), the stats, the player's menu (saves, the backlog, mods, undo and redo, whichever the game turned on), the device buttons, where the player is and the exits (when the game has the [places](/plugins/places) plugin), who is here with what can be done with them, the room's and game's actions, what the player carries, and what they are wearing.
- **Inputs**, under the scene, when the game asks for one: a name to type, a number, or options to pick from.
- **Notices**, in the corner, each with a button to dismiss it.
- **Saves, the backlog and mods**, each in a dialog from the player's menu: every save slot to load, overwrite, export or delete, a new slot, a file to import; every scene shown so far with the choice made in it; and the player's [mods](/reference/mods), each on, off or removed, a mod file to add, and a button to restart with the change.
- **Quests**, under the stage, when the game has the [quests plugin](/plugins/quests).
- **Devices**, in a dialog, when the game has the [devices plugin](/plugins/devices) or the [phone](/plugins/phone): the home screen, and each app's sections, including [messages](/plugins/messages) and [feeds](/plugins/feed).
- **A debug panel**, under the stage, when the game has the [debug plugin](/plugins/debug).
- **The wardrobe**, at the foot of the sidebar, when the game has the [wardrobe plugin](/plugins/wardrobe).

That is where [`DEFAULT_LAYOUT`](#layouts) puts each; a game moves any of them, or leaves the side column out, with a [layout](#layouts).

A greyed-out choice or action shows **why** on the button itself, under its label, so the player never has to hover to find out. Its price is on the button too.

The UI reads each plugin's view by its shape and imports no plugin package. A game without a plugin simply has no panel for it.

## Install

The UI is pre-release, like the engine; point at a local checkout as in [Installation](/guide/installation). It needs React 19, and Tailwind CSS v4 with its Vite plugin.

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/ui": "file:../ifloom/packages/ui",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@ifloom/cli": "file:../ifloom/packages/cli",
    "@tailwindcss/vite": "^4.0.0",
    "@vitejs/plugin-react": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "vite": "^8.0.0",
    "vite-plugin-singlefile": "^2.0.0"
  }
}
```

Add the plugins your game uses beside it, such as `@ifloom/plugin-quests`; see [Adding one](/plugins/#adding-one). Like the engine, the UI ships TypeScript and TSX source with no build step, which Vite handles out of the box.

Your `tsconfig.json` needs the [engine's settings](/guide/installation#requirements), plus JSX and the DOM:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2023", "DOM", "DOM.Iterable"]
  }
}
```

## Set it up

Three files: the Vite config, a stylesheet, and the entry that renders the shell.

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { ifloom } from '@ifloom/cli/vite'

export default defineConfig(ifloom())
```

The [CLI's preset](/cli/#the-vite-preset) brings React and Tailwind, and builds one HTML file that opens from disk; run the game with `ifloom dev` and build it with `ifloom build`. Without the CLI, use `react()` and `tailwindcss()` as your plugins, and see [Shipping a game](/guide/shipping#without-the-cli) for the rest.

```css
/* src/styles.css */
@import "@ifloom/ui/styles.css";
```

The UI's stylesheet imports Tailwind itself and tells it to scan the UI's components, so this one line is enough; do not `@import "tailwindcss"` a second time. Tailwind also finds the classes in your own files, so you can use its utilities in your own components.

```tsx
// src/main.tsx
import { createRoot } from 'react-dom/client'
import { createRunner, localStorageDriver, saves, startingState } from '@ifloom/engine'
import { GameShell } from '@ifloom/ui'
import { game } from './game.ts'
import './styles.css'

// A fresh seed per new game, so each playthrough deals its own variants.
const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  saves: saves(game, localStorageDriver()),
  history: { stopAtNewTurn: true },
  autosave: { every: 'scene' },
})

createRoot(document.getElementById('app')!).render(<GameShell runner={runner} />)
```

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Small Town</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

The shell redraws whenever the runner's state changes, so undo, loading a save and a command sent from anywhere else all show at once. What the runner does (undo, saves, autosave) is set up on the runner; see [The runner](/reference/runner).

See it in the showcase: [Small Town](/guide/showcase#the-files)'s `src/main.tsx` and `src/styles.css` are these files, with undo and a warmer accent.

## GameShell

```tsx
function GameShell(props: GameShellProps): JSX.Element

type GameShellProps = {
  runner: Runner
  panels?: Record<string, PanelComponent>
  sections?: Record<string, PluginSectionComponent>
  mods?: ModsOption
  className?: string
  layout?: Layout
}
```

| Prop | What it is |
|---|---|
| `runner` | The game's [runner](/reference/runner). |
| `panels` | The game's own panels, by name: a scene's bespoke panel, an app's panel section. See [Panels](/ui/extending#panels). |
| `sections` | Renderers for plugin sections in apps, by plugin id. Messages and feeds are built in. See [Plugin sections](/ui/extending#plugin-sections). |
| `mods` | The player's [mods](/reference/mods): the store, the loader's problems, and how to restart. Turns on **Mods** in the player's menu. See [`ModsOption`](/ui/components#modsoption). |
| `className` | Classes on the outer grid, merged over its own. |
| `layout` | Which parts go in the side column and which on the stage, in order. Left out, [`DEFAULT_LAYOUT`](/ui/components#default-layout). See [Layouts](#layouts). |

With a side column, the page is a two-column grid on wide screens, the column on the left and the stage on the right, that stacks on narrow ones. With none, it is a single narrow column (`max-w-2xl`), the stage alone. Notices sit fixed in the bottom-right corner either way.

### Layouts

A layout names the parts of the screen, in order, for the side column and for the stage:

```ts
type Layout = { sidebar?: readonly Part[]; stage?: readonly Part[] }
type Part = PartName | ReactNode
type PartName =
  | 'title' | 'stats' | 'entities' | 'menu' | 'devices' | 'separator' | 'location' | 'people'
  | 'actions' | 'inventory' | 'wardrobe' | 'scene' | 'inputs' | 'quests' | 'debug'
```

| Part | What it draws |
|---|---|
| `'title'` | The game's title and the [`Clock`](/ui/components#clock): [`Title`](/ui/components#title). |
| `'stats'` | [`StatList`](/ui/components#statlist). |
| `'entities'` | [`EntityTable`](/ui/components#entitytable), every kind. |
| `'menu'` | The player's menu, [`GameMenu`](/ui/components#gamemenu). |
| `'devices'` | [`DeviceButtons`](/ui/components#devicebuttons). |
| `'separator'` | A [`Separator`](/ui/components#separator) line. |
| `'location'` | [`LocationPanel`](/ui/components#locationpanel): where the player is and the exits. |
| `'people'` | [`PeoplePanel`](/ui/components#peoplepanel). |
| `'actions'` | The room's and the game's buttons, [`Actions`](/ui/components#actions). |
| `'inventory'` | [`Inventory`](/ui/components#inventory). |
| `'wardrobe'` | [`WardrobePanel`](/ui/components#wardrobepanel). |
| `'scene'` | [`SceneStage`](/ui/components#scenestage). |
| `'inputs'` | [`InputFields`](/ui/components#inputfields). |
| `'quests'` | [`QuestLog`](/ui/components#questlog). |
| `'debug'` | [`DebugPanel`](/ui/components#debugpanel). |

Each built-in part draws nothing when the game has nothing for it — no calendar, no clock; no cast, no people; no kinds, no tables — so a layout can list parts a game does not use. Two layouts are exported:

```ts
const DEFAULT_LAYOUT = {
  sidebar: ['title', 'stats', 'entities', 'menu', 'devices', 'separator', 'location', 'people', 'actions', 'inventory', 'wardrobe'],
  stage: ['scene', 'inputs', 'quests', 'debug'],
}

const READING_LAYOUT = {
  sidebar: [],
  stage: ['title', 'scene', 'inputs', 'actions', 'stats', 'menu'],
}
```

`DEFAULT_LAYOUT` is what a `GameShell` with no `layout` draws: everything at the side, the scene on the stage, for a game with a map and people. `READING_LAYOUT` is a page to read, for a novel: no side column, the title over the scene, the buttons and the stats under it. A management game puts what it manages on the stage, where the eye goes. The Corner Café's tables of staff and dishes sit under the scene, over the week's buttons:

```tsx
import { GameShell, READING_LAYOUT } from '@ifloom/ui'

<GameShell runner={runner} layout={READING_LAYOUT} />

<GameShell runner={runner} layout={{ sidebar: ['title', 'stats', 'menu'], stage: ['scene', 'entities', 'actions', 'inputs'] }} />
```

See each shape's layout in [Shapes of game](/guide/shapes).

#### Parts of your own

Anything that is not a part's name is drawn as it is, in its place in the list, so a game's own components go in among the built-in ones. They are inside the shell's [`GameProvider`](/ui/components#gameprovider), so a component in a layout can read the view and send commands with [`useGame`](/ui/components#usegame). To keep the base UI's layout with something added, spread `DEFAULT_LAYOUT` and change one list:

```tsx
import { Button, DEFAULT_LAYOUT, GameShell, useGame } from '@ifloom/ui'

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

- **A layout replaces the default whole, per list.** `stage` left out of a layout is the default stage; `sidebar` left out is no side column at all, not the default one. <code v-pre>layout={{ stage: ['scene'] }}</code> is a single column with the scene and nothing else. Spread `DEFAULT_LAYOUT` to keep its side column.
- **Give your own nodes a `key`.** They are drawn from a list, so React asks for one, as in any list.
- **Leave out `'inputs'` only if the game has no [inputs](/reference/inputs).** Nothing else sends `input`, so without it the player has no way to give the value. The same goes for `'actions'` in a game whose buttons are its only way forward, as the café's are.

## Theming

The look comes from CSS variables, the ones every shadcn/ui component uses, plus three of the UI's own. To restyle the game, override the variables in your stylesheet after the import. No component needs editing.

```css
@import "@ifloom/ui/styles.css";

:root {
  --primary: oklch(0.45 0.12 30);
  --radius: 0.25rem;
  --speech: oklch(0.4 0.1 300);
}

.dark {
  --primary: oklch(0.8 0.1 30);
}
```

| Variables | What they colour |
|---|---|
| `--background`, `--foreground` | The page and its text. |
| `--card`, `--card-foreground` | Cards, notices, letters in a scene. |
| `--popover`, `--popover-foreground` | Tooltips and popovers. |
| `--primary`, `--primary-foreground` | Primary buttons, badges, the player's side of a message thread. |
| `--secondary`, `--secondary-foreground` | Choice buttons, the other side of a message thread. |
| `--muted`, `--muted-foreground` | Quiet text: tags, stat labels, the reason a button is greyed out. |
| `--accent`, `--accent-foreground` | Hovered buttons and app icons. |
| `--destructive`, `--destructive-foreground` | App badges, errors, and a choice's `irreversible` line. |
| `--border`, `--input`, `--ring` | Borders, inputs, the focus ring. |
| `--radius` | Corner rounding; the smaller and larger radii are worked out from it. |
| `--speech` | A character's spoken line. |
| `--player-speech` | The player's spoken line. |
| `--price` | A price on a button. |

Each is also a Tailwind colour, so `text-speech`, `bg-primary` and `border-border` work in your own components.

**Dark mode.** The stylesheet has a light and a dark set. The dark one applies inside an element with the class `dark`, as shadcn/ui does: put `class="dark"` on `<html>` to turn it on, and toggle it from a settings screen if you offer both.

**Fonts.** Set them as usual, on `body` or with Tailwind's `--font-sans` in an `@theme` block of your own.

**Devices** carry `data-frame` with the device's frame (`phone`, `laptop`, or a name of the game's own) and each app icon carries `data-icon`, for a stylesheet to draw a phone's bezel or map an icon name to a picture.

## Words

The UI's own words, such as **Quests**, **Track** and **Mark all seen**, come from the same [strings table](/reference/strings) as the engine's, under keys that start with `ui.`. A game rewords any of them in `game.strings`:

```ts
const { game } = loadGame(packs, {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro.wake',
  strings: {
    'ui.quests': 'Journal',
  },
})
```

The clock in the sidebar is not the UI's: it prints [`view.when`](/reference/view), which a plugin writes. In a game with the [calendar](/plugins/calendar), reword it with the calendar's own string, `'calendar/label': '{weekday} {period}, day {day}'`; see the calendar's [strings](/plugins/calendar#strings).

| Key | English | Fills |
|---|---|---|
| `ui.quests` | `Quests` | |
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

The keys from `ui.debug` to `ui.closeScene` are the [debug panel](/ui/components#debugpanel)'s, except `ui.undo` and `ui.redo`, which the [game menu](/ui/components#gamemenu) uses too: `ui.set` is the button on each of its forms, `ui.debugSet` the tab they are on, and `ui.noneOn` and `ui.nothingGreyed` what its **Why not** tab says when no lock is on or nothing is greyed out.

The rest belong to the [wardrobe panel](/ui/components#wardrobepanel) (`ui.wardrobe` to `ui.nothingOn`; a wear button reads `Wear` and the item's name), the [inventory](/ui/components#inventory) (`ui.inventory`), the [saves menu](/ui/components#savesmenu) (`ui.saves` to `ui.missingPlugins`), the [backlog](/ui/components#backlog) (`ui.backlog` to `ui.chose`), the [input fields](/ui/components#inputfield) (`ui.enter`) and the [mod manager](/ui/components#modmanager) (`ui.mods` to `ui.applyMods`, and `ui.remove` from the saves menu for its **Delete**).

Everything else on screen is already the game's: titles, prose, labels, the reasons on greyed-out buttons, the warnings, the price notes and the clock all come from the view, worded by the game, the engine's own [strings](/reference/strings) and its plugins'.

In code, [`UI_STRINGS`](/ui/components#ui-strings) is this table in English, [`uiSay`](/ui/components#uisay) reads a word for a game, and [`useWords`](/ui/components#usewords) does the same inside a component.

**Gotcha.** The debug panel's form rows (**Stat**, **Variable** and the rest) and their placeholders are still English and not in the table. It is a tool for the person building the game, not for the player.

## Next

- [Components](/ui/components): every export, with its props.
- [Extending](/ui/extending): the game's own panels, plugin sections, your own layout, and more shadcn/ui components.
