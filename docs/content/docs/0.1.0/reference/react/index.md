---
title: "The React UI"
description: "The optional React UI, @ifloom/react, with mountGame and its options, its two entries, its pages and its strings."
---
`@ifloom/react` is the optional React UI, so everything here is React only. To render a game in plain DOM, Vue or React by hand, see [Start your own UI](/docs/0.1.0/how-to/render/start). [Choosing a UI](/docs/0.1.0/explanation/choosing-a-ui) says when to use which.

`@ifloom/react` renders a game in the browser with React components built on [shadcn/ui](https://ui.shadcn.com). It reads the [view](/docs/0.1.0/reference/view) and sends [commands](/docs/0.1.0/reference/commands) through a [runner](/docs/0.1.0/reference/runner), as a UI of your own would, and nothing in the engine depends on it. [Set up the React UI](/docs/0.1.0/how-to/react/set-up-the-react-ui) installs it and writes the files a game needs. In the showcase: `examples/showcase/src/main.tsx`.

The package has two entries:

- **`@ifloom/react`** holds `mountGame`, `GameShell`, the layout's regions, every game component and hook, the options that restyle them, and `checkUiHints`. Its exports are in [`@ifloom/react`](/docs/0.1.0/api/react).
- **`@ifloom/react/kit`** holds what a component of your own is built from: a plugin's UI, the kit's parts, dialogs and pages like the UI's own, and the shadcn/ui primitives. Its exports are in [`@ifloom/react/kit`](/docs/0.1.0/api/react-kit).

The React UI's reference has five pages:

- **This page** documents [`mountGame`](#mountgame), [`MountOptions`](#mountoptions), [`GameShell`](#gameshell) and the UI's own [strings](#strings).
- **[Components](/docs/0.1.0/reference/react/components)** documents every component and hook of `@ifloom/react`, from the layout's regions to the pages around the game.
- **[Plugin UIs and the kit](/docs/0.1.0/reference/react/kit)** documents `PluginUi`, `pluginKit`, `usePlugin`, the kit's parts and the shadcn/ui primitives, from `@ifloom/react/kit`.
- **[Presentation hints](/docs/0.1.0/reference/react/hints)** documents the `ui` hints and inline pieces the React UI reads from content, and `checkUiHints`.
- **[React UI parts](/docs/0.1.0/reference/react/parts)** lists every `data-part` the UI renders, with the attributes each carries.

## mountGame

`mountGame` starts a game in the page and resolves to its runner once the game renders. Its signature is in [`mountGame`](/docs/0.1.0/api/react#mountgame).

It takes a `Game`, or the `{ game, problems }` a [game module](/docs/0.1.0/reference/game)'s `build()` returns, and logs any problems as warnings. It makes the runner with [`browserRunner`](/docs/0.1.0/reference/browser#browserrunner), so the game has undo, saves, an autosave and the player's stored settings. It then renders a [`GameShell`](#gameshell) inside React's `StrictMode` into `#root`, unless `root` names another element. It rejects when nothing in the page matches `root`.

`mountGame` is async because `browserRunner` reads the player's profile first, so the game starts with their settings. A game that never sends a command from outside the UI calls it without `await`.

```ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'
import { Layout } from './layout.tsx'

const runner = await mountGame(module.build(), {
  runner: { backlog: { limit: 200 } },
  layout: Layout,
})
```

[Set up the React UI](/docs/0.1.0/how-to/react/set-up-the-react-ui) mounts a new game with it.

## MountOptions

`MountOptions` is the settings for `mountGame`: every prop of [`GameShell`](#gameshell) but `runner`, with where to render and how to start. Every field is in [`MountOptions`](/docs/0.1.0/api/react#mountoptions).

| Field | Meaning |
|---|---|
| `root` | The element to render into, or a selector for it. `'#root'` if left out. |
| `start` | The state the game starts from. A new game with a random seed and the player's stored play settings if left out, so each playthrough draws its own variants. |
| `runner` | The [runner options](/docs/0.1.0/reference/runner#runneroptions), merged over `browserRunner`'s defaults: undo 50 deep, saves and the profile in `localStorage`, and an autosave each turn. |

Every other field goes to `GameShell` as a prop, such as `layout`, `pages`, `plugins` or `keys`.

## GameShell

`GameShell` renders the whole React UI for a runner, and `mountGame` renders one too. Its props are in [`GameShellProps`](/docs/0.1.0/api/react#gameshellprops).

It renders a [`GameProvider`](/docs/0.1.0/reference/react/components#gameprovider) with the game's sound, its [text size](/docs/0.1.0/reference/react/components#textsize) and, with `pages` on, the [pages](/docs/0.1.0/reference/react/components#pages), around the `layout`. Its props are the provider's, which [`GameProvider`](/docs/0.1.0/reference/react/components#gameprovider) and [`UiOptions`](/docs/0.1.0/reference/react/components#uioptions) describe, and these three:

| Field | Meaning |
|---|---|
| `layout` | The page as a component, such as your `src/layout.tsx`. [`DefaultLayout`](/docs/0.1.0/reference/react/components#defaultlayout) if left out. Any component works, since every hook and built-in component works inside it. |
| `pages` | The title screen and the pages around the game, `true` or a [`PagesOptions`](/docs/0.1.0/reference/react/components#pagesoptions). Off if left out, and the game starts at once. With pages on, the layout renders on the `game` page. |
| `audio` | The game's sound through the [audio player](/docs/0.1.0/reference/browser/audio-player). It starts when [`game.audio`](/docs/0.1.0/reference/audio) lists any tracks, and `false` turns it off. An object goes to [`startAudio`](/docs/0.1.0/reference/browser/audio-player#audiooptions) as its options. |

The shell renders again whenever the runner's snapshot changes, so an undo, a loaded save and a command sent from outside the UI all show at once. Render it yourself when you make the runner yourself, as the showcase does to load the player's mods before it builds the game:

```tsx
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

[Rearrange or replace the React UI's parts](/docs/0.1.0/how-to/react/replace-parts) writes a layout of your own.

## Strings

The React UI's own words come from the game's [strings table](/docs/0.1.0/reference/strings), under keys that start with `ui.`. A game rewords any of them in its content's `strings`, and [`useWords`](/docs/0.1.0/reference/react/components#usewords) reads one inside a component. Each plugin UI's words are reworded the same way and listed under `## React UI` on its plugin's page, such as `ui.quests` for the quests plugin's "Quests".

```ts
import type { Content } from '@ifloom/engine'

export const words: Content = {
  strings: {
    'ui.inventory': 'In your bag',
    'ui.quests': 'To do',
  },
}
```

| Key | Meaning |
|---|---|
| `ui.stats` | `Stats`, the stats section's title and the stats panel's. |
| `ui.statLevel` | `Level {level}`, after a levelled stat's label in the [`StatList`](/docs/0.1.0/reference/react/components#statlist). |
| `ui.statProgress` | `{label}: {percent}% of the way to level {next}`, the label on a levelled stat's bar. |
| `ui.allSeen` | `Mark all seen`, the button in the [`NoticeStrip`](/docs/0.1.0/reference/react/components#noticestrip)'s dialog. |
| `ui.back` | `Back`, the button on the settings, load and credits pages. |
| `ui.dismiss` | `Dismiss`, the label on each notice's dismiss button. |
| `ui.undo`, `ui.redo` | `Undo` and `Redo`, the [`GameMenu`](/docs/0.1.0/reference/react/components#gamemenu)'s buttons. |
| `ui.inventory` | `Carrying`, the [`Inventory`](/docs/0.1.0/reference/react/components#inventory)'s title and the inventory panel's. |
| `ui.heldCount` | `×{n}`, after a thing the player holds more than one of. |
| `ui.saves`, `ui.save`, `ui.saveNew`, `ui.load` | `Saves`, `Save`, `Save in a new slot` and `Load`, in the [`SavesMenu`](/docs/0.1.0/reference/react/components#savesmenu). |
| `ui.remove` | `Delete`, the button that deletes a save or removes a mod. |
| `ui.exportSave`, `ui.importSave` | `Export` and `Import a save file`, in the saves menu and on the load page. |
| `ui.noSaves`, `ui.brokenSave` | `No saves yet.` and `A save that can’t be read`, in the saves menu and on the load page. |
| `ui.missingPacks` | `This save was made with mods this game doesn’t have: {packs}.` |
| `ui.missingPlugins` | `This save was made with plugins this game doesn’t have: {plugins}.` |
| `ui.backlog`, `ui.backlogEmpty`, `ui.chose` | `Backlog`, `Nothing yet.` and `You chose: {label}`, in the [`Backlog`](/docs/0.1.0/reference/react/components#backlog). |
| `ui.enter` | `Enter`, the button on an [input](/docs/0.1.0/reference/react/components#inputfield). |
| `ui.mods`, `ui.addMod`, `ui.noMods` | `Mods`, `Add a mod file` and `No mods added.`, in the [`ModManager`](/docs/0.1.0/reference/react/components#modmanager). |
| `ui.modOn`, `ui.modOff` | `On` and `Off`, a mod's state button. |
| `ui.applyMods`, `ui.modsChanged` | `Restart with these mods` and `Changes to mods take effect when the game restarts.` |
| `ui.modsHint` | `Mods add to the game or change it. Add one from a file, and turn it on or off here.`, under the settings page's Mods heading. |
| `ui.close` | `Close`, the screen-reader label on every dialog's close button. |
| `ui.newGame`, `ui.continue`, `ui.newGamePlus` | `New game`, `Continue` and `New Game+`, on the [`TitlePage`](/docs/0.1.0/reference/react/components#titlepage). |
| `ui.settings`, `ui.noSettings` | `Settings` and `There are no settings.`, on the title screen, the menu and the settings page. |
| `ui.credits` | `Credits`, on the title screen and the credits page. |
| `ui.titlePage` | `Title screen`, the menu's button back to the title screen. |
| `ui.replayVoice` | `Hear it again`, the button after a spoken line with a voice. |
| `ui.zoom` | `Enlarge`, the button around a picture that opens the viewer, and the viewer's title when the picture has no alt text. |
| `ui.closeViewer` | `Close`, the [`MediaViewer`](/docs/0.1.0/reference/react/components#mediaviewer)'s close button. |
| `ui.menu` | `Menu`, the title of the dialog Escape opens. |
| `ui.openSidebar` | `Open the side panel`, the drawer button on a phone. |
| `ui.changes` | `What changed`, the screen-reader label on [`Changes`](/docs/0.1.0/reference/react/components#changes). |
| `ui.timeLeft` | `Time left`, the label on a minigame's countdown bar. |
| `ui.timerLeft` | `{seconds}s`, the seconds left on a [`Countdown`](/docs/0.1.0/reference/react/components#countdown). |
| `ui.diceNeeds` | `needs {against}`, a roll's target on a [`DiceRoll`](/docs/0.1.0/reference/react/components#diceroll). |
| `ui.dicePassed`, `ui.diceFailed` | `Passed` and `Failed`, a roll's outcome. |
| `ui.diceCriticalMax`, `ui.diceCriticalMin` | `Critical!` and `Fumble`, a critical roll. |
| `ui.diceRolled` | `Rolled {dice}: {faces}, total {total}.`, what a screen reader hears for a roll. |
| `ui.diceRolledPassed`, `ui.diceRolledFailed` | `Needed {against}: passed.` and `Needed {against}: failed.`, after it. |
| `ui.diceDismiss` | `Dismiss the roll`, the [`DiceOverlay`](/docs/0.1.0/reference/react/components#diceoverlay)'s close button. |
| `ui.notices`, `ui.unread` | `Notices` and `Unread`, the notice strip's count and its screen-reader label. |
| `ui.noticesMore`, `ui.noticesFewer` | `+{n} more` and `Show fewer`, the button that shows or hides older notices on a phone. |

The clock prints [`view.when`](/docs/0.1.0/reference/view#view), which a plugin writes, so the calendar's own [strings](/docs/0.1.0/reference/plugins/calendar#strings) reword it. Titles, prose, labels, reasons and price notes come from the game's content, the engine's strings and the plugins' strings. [`UiStringKey`](/docs/0.1.0/reference/react/components#uistringkey-words-and-say) is one of this table's keys without the `ui.` prefix.

## Caveats

- `mountGame` and `GameShell` play the game's sound themselves, so a [`useAudio`](/docs/0.1.0/reference/react/components#useaudio) beside them takes over from theirs rather than playing twice.
- A new `plugins`, `panels` or `components` object on each render renders every component under the provider again, so define them once outside a component.
