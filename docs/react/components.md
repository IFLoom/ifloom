# Components

This page lists everything `@ifloom/react` exports, from the whole shell down to a single button. Each game component reads the [view](/reference/view) through [`useGame`](#usegame), so it has to sit inside a [`GameProvider`](#gameprovider). [`GameShell`](#gameshell) is one. The [shadcn/ui primitives](#shadcn-ui-primitives) at the end don't need a provider.

```ts
import {
  // the game
  GameShell, GameProvider, useGame,
  DEFAULT_LAYOUT, READING_LAYOUT, Parts, Title, Actions,
  SceneStage, Beat, Picture, assetUrl, ChoiceButton, ChoiceList, PriceTag,
  Sidebar, Clock, StatList, EntityTable, LocationPanel, PeoplePanel, Inventory, WardrobePanel,
  InputField, InputFields,
  GameMenu, SavesMenu, Backlog, ModManager,
  Notices, QuestLog,
  DeviceButtons, DeviceDialog, DeviceScreen, AppSection, useDevices,
  MessagesSection, FeedSection, DebugPanel,
  UI_STRINGS, uiSay, useWords,
  type GameShellProps, type Layout, type Part, type PartName, type GameProviderProps, type GameContextValue, type ModsOption,
  type PanelComponent, type PluginSectionComponent, type SidebarProps, type UiStringKey,
  // shadcn/ui
  Button, buttonVariants, Badge, badgeVariants,
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
  ScrollArea, Separator, Tabs, TabsList, TabsTrigger, TabsContent,
  Tooltip, TooltipProvider, TooltipTrigger, TooltipContent, cn,
  type ButtonProps, type BadgeProps,
} from '@ifloom/react'
```

Every component that takes `className` merges it over its own classes with [`cn`](#cn), so a later Tailwind class wins: `<SceneStage className="gap-8" />`.

Many elements carry a `data-` attribute naming what they show. You can style them from your stylesheet or find them in a test.

| Attribute | On |
|---|---|
| `data-sidebar` | The side column ([`Sidebar`](#sidebar)). |
| `data-scene` | The stage ([`SceneStage`](#scenestage)). |
| `data-choice` | Each choice or action button. |
| `data-exit`, `data-person` | Each exit and each person in the sidebar. |
| `data-stat`, `data-kind`, `data-entity` | Each stat row, entity table and entity row. |
| `data-item`, `data-slot-id` | Each item carried and each wardrobe slot. |
| `data-input` | Each input field. |
| `data-notice`, `data-quest` | Each notice and each active quest. |
| `data-device`, `data-open-app`, `data-app`, `data-entry` | Each device button, each app icon, an open app, and each entry in an app's list. |
| `data-frame`, `data-icon`, `data-face` | A device's frame, an app's icon name, and a `prop` beat's face, for a stylesheet to dress. |
| `data-channel`, `data-thread`, `data-post`, `data-feed` | Messages and feeds. |
| `data-save-slot`, `data-backlog`, `data-mod` | Each save slot, backlog entry and mod. |
| `data-inventory`, `data-wardrobe`, `data-menu`, `data-saves`, `data-mods`, `data-quests`, `data-debug` | Whole panels. |

## The game

### GameShell

```tsx
function GameShell(props: GameShellProps): JSX.Element
```

The whole UI. It's a [`GameProvider`](#gameprovider) and a [`TooltipProvider`](#tooltip) around a side column and a stage, with [`Notices`](#notices) fixed in the corner. The side column is a [`Sidebar`](#sidebar), and the stage is a `<main>` drawn with [`Parts`](#parts). Both come from `layout`, or from [`DEFAULT_LAYOUT`](#default-layout) if you leave it out. There's no side column when the layout has no `sidebar` or an empty one. The props, `GameShellProps`, and the layouts are described on [The base UI](/react/#gameshell).

```tsx
import { DEFAULT_LAYOUT, GameShell } from '@ifloom/react'

<GameShell runner={runner} panels={panels} layout={{ ...DEFAULT_LAYOUT, stage: [<WeatherBanner key="w" />, ...DEFAULT_LAYOUT.stage] }} />
```

### Layout

```ts
type Layout = { sidebar?: readonly Part[]; stage?: readonly Part[] }
type Part = PartName | ReactNode
type PartName =
  | 'title' | 'stats' | 'entities' | 'menu' | 'devices' | 'separator' | 'location' | 'people'
  | 'actions' | 'inventory' | 'wardrobe' | 'scene' | 'inputs' | 'quests' | 'debug'
```

What [`GameShell`](#gameshell)'s `layout` takes: the parts of the side column and of the stage, in order. A `PartName` is a built-in part, and each draws nothing when the game has nothing for it. Anything else is drawn as it is. The table of which component each name draws is on [The base UI](/react/#layouts).

When you give a layout, a missing `stage` means `DEFAULT_LAYOUT.stage`, but a missing `sidebar` means no side column.

### DEFAULT_LAYOUT

```ts
const DEFAULT_LAYOUT: {
  sidebar: readonly ['title', 'stats', 'entities', 'menu', 'devices', 'separator', 'location', 'people', 'actions', 'inventory', 'wardrobe']
  stage: readonly ['scene', 'inputs', 'quests', 'debug']
}
```

The base UI's own layout, which a `GameShell` with no `layout` draws. Everything goes at the side and the scene goes on the stage. Spread it to change one list and keep the other:

```tsx
import { DEFAULT_LAYOUT, GameShell } from '@ifloom/react'

<GameShell runner={runner} layout={{ ...DEFAULT_LAYOUT, stage: [<WeatherBanner key="w" />, ...DEFAULT_LAYOUT.stage] }} />
```

### READING_LAYOUT

```ts
const READING_LAYOUT: {
  sidebar: readonly []
  stage: readonly ['title', 'scene', 'inputs', 'actions', 'stats', 'menu']
}
```

A page to read, for a novel. With no side column, the page is a single narrow column: the title over the scene, then the inputs, the buttons, the stats and the player's menu. The Letter uses it: `<GameShell runner={runner} layout={READING_LAYOUT} />`.

### Parts

```tsx
function Parts(props: { parts: readonly Part[] }): JSX.Element
```

Draws `parts` in order. Each [`PartName`](#layout) becomes its built-in component, and anything else is drawn as it is. `GameShell` and [`Sidebar`](#sidebar) draw their lists with it. It doesn't wrap anything around them, so you can use it inside an element of your own:

```tsx
import { Parts } from '@ifloom/react'

<section className="flex flex-col gap-3">
  <Parts parts={['stats', 'entities', <Purse key="purse" />]} />
</section>
```

### GameProvider

```tsx
function GameProvider(props: GameProviderProps): JSX.Element

type GameProviderProps = {
  runner: Runner
  panels?: Record<string, PanelComponent>
  sections?: Record<string, PluginSectionComponent>
  mods?: ModsOption
  children: ReactNode
}
```

Connects everything under it to a [runner](/reference/runner). It subscribes to the runner, works out the view again only when the state changes, and hands both down through [`useGame`](#usegame).

`panels` and `sections` are the same as on [`GameShell`](/react/#gameshell). The built-in renderers for `messages` and `feed` are added to `sections`, and yours win over them. `mods` turns on the [mod manager](#modmanager). See [`ModsOption`](#modsoption).

Use it on its own to build [your own layout](/react/extending#your-own-layout).

**Gotcha.** Define `panels`, `sections` and `mods` once, outside your component. Don't write them inline, as in <code v-pre>panels={{ StallPanel }}</code>, in a component that re-renders. A new object on each render makes every component under the provider draw again. Leaving them out is fine, because the defaults are the same objects every time.

### useGame

```ts
function useGame(): GameContextValue

type GameContextValue = {
  runner: Runner
  mods?: ModsOption
  view: View
  send: (command: Command) => Applied
  panels: Record<string, PanelComponent>
  sections: Record<string, PluginSectionComponent>
}
```

Returns the runner, the current [`View`](/reference/view) and `send`. `send` runs a command through `runner.apply` and returns what [`apply`](/reference/commands#apply) returned, so you can show a refusal. `panels` and `sections` are what the provider was given, with the built-in sections added. `mods` is the provider's `mods`, if any. It throws outside a `GameProvider`.

```tsx
import { useState } from 'react'
import { go } from '@ifloom/plugin-places'
import { Button, useGame } from '@ifloom/react'

function Purse() {
  const { view } = useGame()
  return <p>{view.statsById.coins.text}</p>
}

function GoHome() {
  const { send } = useGame()
  const [said, setSaid] = useState<string>()
  return (
    <>
      <Button onClick={() => setSaid(send(go('flat')).refused)}>Go home</Button>
      {said ? <p className="text-sm text-muted-foreground">{said}</p> : null}
    </>
  )
}
```

Use the runner for what the view doesn't cover, such as `runner.undo()`, `runner.save(...)` and `runner.backlog()`.

### ModsOption

```ts
type ModsOption = {
  store: Mods
  problems?: string[]
  onChange?: () => void
}
```

The game's [mods](/reference/mods), for the [mod manager](#modmanager). Pass it as `mods` on [`GameShell`](/react/#gameshell) or [`GameProvider`](#gameprovider).

| Field | What it is |
|---|---|
| `store` | The [`Mods`](/reference/mods#mods) store the game loaded its mods from at start-up. |
| `problems` | What the [loader](/reference/loader#the-checks) found, as [`describeProblem`](/reference/loader#problem-and-describeproblem) writes it. Each problem that starts `mod:<id> ` is shown under that mod. The rest aren't shown. |
| `onChange` | Builds the game again with the mods as they now are, usually `() => location.reload()`. Without it, the manager never offers to restart. |

```tsx
import { indexedDbDriver, mods } from '@ifloom/engine'
import { GameShell } from '@ifloom/react'
import { smallTown } from './game.ts'

const store = mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))
const { game, problems } = smallTown({ mods: await store.packs() })
// … make the runner …
<GameShell runner={runner} mods={{ store, problems, onChange: () => location.reload() }} />
```

### PanelComponent

```ts
type PanelComponent = ComponentType<{ data: unknown }>
```

A game's own panel: a scene's bespoke panel, or an app's panel section. `data` is what the game's [custom panel](/reference/custom#panels) returned. See [Panels](/react/extending#panels).

### PluginSectionComponent

```ts
type PluginSectionComponent = ComponentType<{ data: unknown; with: Record<string, unknown> }>
```

Draws a plugin's view inside an app. `data` is that plugin's slice of the view, at [`view.plugins[id]`](/reference/view#plugins), and `with` is the section's `with`. See [Plugin sections](/react/extending#plugin-sections).

## The stage

### SceneStage

```tsx
function SceneStage(props: { className?: string }): JSX.Element
```

The main panel. It shows the scene on screen, or the room when no scene is open. The room is a plugin's [stage](/reference/plugins#stage), such as the [places](/plugins/places) plugin's. Without one, the room is the game's title and an empty body.

From top to bottom, it draws:

- the speaker's portrait, unless [`view.scene.speaker`](/reference/view#speakerview) or its `portrait` is `null`;
- the title;
- the stage picture, centred, at most `max-h-80` tall and never wider than the stage, keeping its shape;
- each [`Beat`](#beat) of the body;
- the game's panel for the scene, if the scene names one and `panels` has it, or else the scene's choices as a [`ChoiceList`](#choicelist).

The `<article>` carries `data-scene` with the scene's id, or `stage` when no scene is open.

**Gotcha.** If a scene names a `panel` that the game has no component for, it shows its choices instead, with no warning.

### Beat

```tsx
function Beat(props: { beat: SceneBeat }): JSX.Element
```

One beat of a scene's body, drawn by kind:

| Kind | Drawn as |
|---|---|
| `text` | A paragraph. |
| `mono` | A paragraph in a monospace font. |
| `say` | A paragraph in `--speech`. The player's own line is in `--player-speech` and indented. |
| `image` | A [`Picture`](#picture). It's full width, or at most `max-w-sm` for `size: 'inline'`, and tilted a little with `rotate`. |
| `mail` | A card with its headers, then the body. |
| `prop` | A dashed box, with `data-face` set to its face for a stylesheet to dress. |

```tsx
import { Beat } from '@ifloom/react'

<Beat beat={{ kind: 'say', who: 'character', text: '“Morning. What can I get you?”' }} />
```

### Picture

```tsx
function Picture(props: ComponentProps<'img'>): JSX.Element | null
```

An `<img>` that draws nothing, and takes no space, when its file is missing or `src` is empty. You get no broken-image icon for a portrait that isn't drawn yet or art left out of a build. It takes every `<img>` prop, and still calls your `onError`. Every picture in the UI's components is a `Picture`.

```tsx
import { Picture } from '@ifloom/react'

<Picture src={person.portrait} alt={person.name} className="size-8 rounded-full object-cover" />
```

A `Picture` remembers which `src` failed. When the same element gets a new `src`, the new file gets its own chance to load, so a portrait that changes with the speaker doesn't need a `key`.

Its `src` goes through [`assetUrl`](#asseturl), so it finds a picture that `ifloom build --inline-assets` put inside the page.

### assetUrl

```ts
function assetUrl(src: string): string
```

Returns where a picture really is. A build made with [`ifloom build --inline-assets`](/cli/#one-file-pictures-and-all) carries its pictures inside `index.html`, in a map from path to `data:` URL. `assetUrl` looks `src` up in that map, ignoring a leading `./`, and returns the data URL. Anywhere else, it returns `src` unchanged. That covers `ifloom dev`, a plain build, and a path that isn't in the map.

```ts
import { assetUrl } from '@ifloom/react'

assetUrl('art/place/cafe.jpg')   // 'data:image/jpeg;base64,…' in a one-file build; 'art/place/cafe.jpg' otherwise
assetUrl('./art/place/cafe.jpg') // the same
```

[`Picture`](#picture) calls it, and so does [`DeviceScreen`](#devicescreen) for a device's wallpaper, so everything the base UI draws is covered.

**Gotcha.** A component of your own that draws a picture from a path, with an `<img>` or a CSS `background-image`, must call `assetUrl` too or use a `Picture`. In a one-file build the `art/` folder is gone, so the bare path points at nothing.

```tsx
import { assetUrl } from '@ifloom/react'

function Postcard({ src }: { src: string }) {
  return <div className="h-40 bg-cover" style={{ backgroundImage: `url(${assetUrl(src)})` }} />
}
```

### ChoiceButton

```tsx
function ChoiceButton(props: { choice: RenderedChoice; className?: string }): JSX.Element
```

Draws a [`RenderedChoice`](/reference/view#renderedchoice) as a full-width button that sends its `command`. It's used for a scene's choices, a room's actions and a person's buttons. The button shows:

- the label;
- a warning icon when the choice carries a `warning`, labelled with the warning for screen readers. A warning means the button can be pressed but the game would refuse it, as with the calendar's `That would run past dawn.`;
- its price, as a [`PriceTag`](#pricetag);
- its `irreversible` line, the warning that this can't be undone, in the destructive colour (`--destructive`);
- the reason it's greyed out, when it is. The button is then disabled;
- the warning text, when it isn't greyed out and carries a `warning`, so the player reads it before pressing.

The button carries `data-choice` with the choice's id. A choice's `tags` aren't drawn. To style by them, write a component of your own.

### ChoiceList

```tsx
function ChoiceList(props: { choices: RenderedChoice[]; className?: string }): JSX.Element | null
```

A column of [`ChoiceButton`](#choicebutton)s. It draws nothing for an empty list.

```tsx
import { ChoiceList, useGame } from '@ifloom/react'

function RoomButtons() {
  const { view } = useGame()
  return <ChoiceList choices={view.actions} />
}
```

### PriceTag

```tsx
function PriceTag(props: { price: Price; className?: string }): JSX.Element | null
```

A [`Price`](/reference/view#price) as the engine wrote it, in `--price`. It shows each stat's `text`, then each of the plugins' `notes` (such as the calendar's `until afternoon`), joined with ` · `. It draws nothing for a price with neither.

## The sidebar

### Sidebar

```tsx
function Sidebar(props: SidebarProps): JSX.Element

type SidebarProps = { className?: string; parts?: readonly Part[] }
```

The side column: an `<aside>` carrying `data-sidebar`, with its `parts` drawn by [`Parts`](#parts). [`GameShell`](#gameshell) draws its side column with it, passing the layout's `sidebar` list. Use it on its own in a page of your own.

If you leave out `parts`, you get [`DEFAULT_LAYOUT`](#default-layout)`.sidebar`: [`Title`](#title), [`StatList`](#statlist), [`EntityTable`](#entitytable), [`GameMenu`](#gamemenu), [`DeviceButtons`](#devicebuttons), a [`Separator`](#separator), [`LocationPanel`](#locationpanel), [`PeoplePanel`](#peoplepanel), [`Actions`](#actions), [`Inventory`](#inventory) and [`WardrobePanel`](#wardrobepanel).

```tsx
import { Sidebar } from '@ifloom/react'

<Sidebar className="order-last" parts={['title', 'stats', 'menu']} />
```

### Title

```tsx
function Title(): JSX.Element
```

The game's title, `view.title`, as a heading, with the [`Clock`](#clock) under it. This is the `'title'` part.

### Actions

```tsx
function Actions(): JSX.Element
```

The buttons offered while no scene is open, `view.actions`, as a [`ChoiceList`](#choicelist). They include the room's buttons, the game's own and its plugins'. This is the `'actions'` part.

### Clock

```tsx
function Clock(): JSX.Element | null
```

Where the game is in time: [`view.when`](/reference/view#the-clock-and-the-player), as its plugins wrote it, such as the [calendar](/plugins/calendar#the-label)'s `Day 3 · Wednesday afternoon`. It draws nothing when no plugin says what time it is, as in a game without a calendar. To reword it, change the calendar's `calendar/label` string.

### StatList

```tsx
function StatList(): JSX.Element | null
```

The stats the view lists, each label beside its value written the way the game [formats](/reference/stats) it (`12 coins`). A stat the game doesn't list, or whose `visible` doesn't hold, isn't in the view, so it isn't here either. It draws nothing when there are no stats. Each row carries `data-stat`.

### EntityTable

```tsx
function EntityTable(props: { kinds?: string[]; className?: string }): JSX.Element | null
```

The things the game keeps several of, from [`view.entities`](/reference/view#entities). It draws a table for each [kind](/reference/entities) that has any entities, headed with the kind's `plural`. Each row is one entity: its name, then its stats written the way the game [formats](/reference/stats) them.

The columns are every stat any row shows, in the order they first appear. A row that doesn't show a stat (because its `visible` doesn't hold for that entity) has a blank cell. Each section carries `data-kind` with the kind's id, and each row carries `data-entity` with its reference, such as `staff:ana`.

`kinds` limits it to those kinds. Without it, every kind is drawn. It draws nothing when none of the kinds has any entities, so a game with no kinds gets no empty box. The `'entities'` [part](#layout) draws it with every kind.

```tsx
import { EntityTable } from '@ifloom/react'

// The café's menu on its own, beside the stage:
<EntityTable kinds={['dish']} className="border-t pt-4" />
```

### LocationPanel

```tsx
function LocationPanel(): JSX.Element | null
```

Where the player is, with its name and tag, and an outline button for each exit. It reads the [places](/plugins/places) plugin's view at [`view.plugins.places`](/plugins/places#the-view), by its shape, without importing the plugin. Each button sends the exit's own [`command`](/plugins/places#exitview) and carries `data-exit`. An exit the player can't take is greyed out.

It draws nothing in a game without the places plugin, or while the plugin's `location` is `null` (the player is nowhere). So a novel's sidebar has no empty box.

**Gotcha.** An exit's reason, or its warning, is in the button's `title` and shows on hover. It isn't printed on the button as a choice's is. An exit that a lock hides isn't in the view at all.

### PeoplePanel

```tsx
function PeoplePanel(): JSX.Element | null
```

Who is here, read by its shape from the [cast plugin](/plugins/cast)'s view at `view.plugins.cast.present`. For each person it shows their portrait and role (when they have them) and their name, with a [`ChoiceButton`](#choicebutton) for each thing the player can do with them, such as **Talk**. Each person carries `data-person`. It draws nothing when nobody is here, and nothing in a game without the cast, since the engine has no people of its own.

### Inventory

```tsx
function Inventory(props: { className?: string }): JSX.Element | null
```

What the player carries, from [`view.pack`](/reference/view#the-player-s-numbers-and-things). Each item shows its name, `×n` when there's more than one, and its description. An item with a [`use`](/reference/game#itemdef) gets a [`ChoiceButton`](#choicebutton) labelled with its `useLabel` that sends [`use`](/reference/commands#use). When [`whyNot`](/reference/actions#whynot) says it can't be used now, the button is greyed out with that reason on it.

The heading is `ui.inventory`, and each item carries `data-item`. It draws nothing when the player carries nothing.

```tsx
import { Inventory } from '@ifloom/react'

// In the showcase, a sandwich from the café: "Eat the sandwich" puts 25 energy back.
<Inventory className="border-t pt-4" />
```

### WardrobePanel

```tsx
function WardrobePanel(props: { className?: string }): JSX.Element | null
```

The [wardrobe plugin](/plugins/wardrobe)'s view. Each slot (`data-slot-id`) shows its label and what's in it, or `ui.nothingOn`. When something is in a slot, it has a **Take off** button (`ui.takeOff`). Each spare piece of clothing for that slot gets a **Wear …** button (`ui.wear` and the item's name). The buttons send `wardrobe/takeOff` and `wardrobe/wear`.

A button that can't be used now is greyed out, with [`whyNot`](/reference/actions#whynot)'s reason in its `title`. The heading is `ui.wardrobe`. It draws nothing in a game without the plugin.

**Gotcha.** As with an exit, the reason is in the `title` and shows on hover. It isn't printed on the button.

## Inputs

### InputField

```tsx
function InputField(props: { input: InputView }): JSX.Element
```

One of the game's [inputs](/reference/inputs), an [`InputView`](/reference/view#inputview) from `view.inputs`. It shows the input's label, then:

- for `kind: 'text'` or `'number'`, a box and an **Enter** button (`ui.enter`) that sends [`input`](/reference/commands#input) with what was typed. The box honours `maxLength`, `min` and `max`;
- for `kind: 'choice'`, a button for each option, with the one already picked filled in. Each sends its value.

If the engine refuses the value, its reason shows under the field (`Keep it to 8 characters.`, say) until a value is accepted. The box follows the input's value when something else changes it, such as an undo or a load, so it always shows what the game holds. It carries `data-input` with the input's id.

**Gotcha.** An empty number box sends no value at all, not `0`, so the engine refuses it with `enterSomething` (`Enter something first.`).

### InputFields

```tsx
function InputFields(props: { className?: string }): JSX.Element | null
```

An [`InputField`](#inputfield) for every input in `view.inputs`, which holds the inputs whose `when` holds now. It draws nothing when there are none. [`GameShell`](#gameshell) puts it under the scene.

```ts
// The showcase asks for the cat's name on moving day, and only then.
inputs: [{ id: 'catName', label: 'Name your cat', kind: 'text', maxLength: 16, when: { phase: ['arrival'] } }]
```

**Gotcha.** A [lock](/reference/locks) that denies `'*'` denies `input` too. If a scene asks for a value while the rest of the game is locked, put `input` in the lock's `except`.

## The player's menu

### GameMenu

```tsx
function GameMenu(props: { className?: string }): JSX.Element | null
```

A row of buttons for what the runner offers:

- **Saves** (`ui.saves`) when the runner was made with `saves`;
- **Backlog** (`ui.backlog`) when [`runner.offers`](/reference/runner#the-runner-s-members)`.backlog` is on;
- **Mods** (`ui.mods`) when the provider was given [`mods`](#modsoption);
- **Undo** and **Redo** when `runner.offers.undo` is on. They're greyed out while there's nothing to undo or redo.

Saves, Backlog and Mods each open a [`Dialog`](#dialog) holding a [`SavesMenu`](#savesmenu), a [`Backlog`](#backlog) or a [`ModManager`](#modmanager). Loading a save closes the dialog. The row carries `data-menu`. It draws nothing when there are no buttons to show.

So you choose what the player sees when you make the runner:

```ts
import { createRunner, localStorageDriver, saves, startingState } from '@ifloom/engine'

const runner = createRunner(game, startingState(game), {
  history: { depth: 50 },                    // Undo and Redo
  backlog: { limit: 200 },                   // Backlog
  saves: saves(game, localStorageDriver()),  // Saves
})
```

### SavesMenu

```tsx
function SavesMenu(props: { className?: string; onLoaded?: () => void }): JSX.Element | null
```

The save and load screen, over [`runner.saves`](/reference/runner#the-runner-s-members):

- **Save in a new slot** (`ui.saveNew`) writes the next numbered slot. That's one more than the highest slot named with a number, so `1`, `2`, `3`.
- **Import a save file** (`ui.importSave`) reads a `.json` file through [`importText`](/reference/saves#saves) and plays on from it with [`runner.restore`](/reference/runner#the-runner-s-members).
- Every slot is listed newest first (`data-save-slot`), with its name and when it was saved. Each has buttons to **Load** it (`ui.load`), **Save** over it (`ui.save`), **Export** it (`ui.exportSave`) and **Delete** it (`ui.remove`). Export downloads a file named `<game>-<slot>.json`. With no slots, it shows `ui.noSaves`.

If a save can't be read, the menu shows why. A save made with packs or plugins this game doesn't have still loads, with a line naming them (`ui.missingPacks`, `ui.missingPlugins`). `onLoaded` is called after a load or an import. The menu carries `data-saves`. It draws nothing when the runner has no `saves`.

```tsx
import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, SavesMenu } from '@ifloom/react'

function SavesDialog() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>Saves</DialogTitle>
        <SavesMenu onLoaded={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
```

**Gotcha.** Saving over a slot replaces its name with the default one. That's [`meta.when`](/reference/saves#savemeta) (the day, period and place in the plugins' words), or `Turn N` when no plugin says.

### Backlog

```tsx
function Backlog(props: { className?: string }): JSX.Element
```

[`runner.backlog()`](/reference/runner#backlogentry), oldest first, in a [`ScrollArea`](#scrollarea). Each entry shows its title and its beats, drawn as [`Beat`](#beat)s. When the player made a choice in it, a line **You chose: …** (`ui.chose`) follows. Each entry carries `data-backlog` with its scene id. With nothing in it, it shows `ui.backlogEmpty`. It follows the view, so it stays current while open.

**Gotcha.** The runner has to be made with `backlog`. Without it, the list is always empty.

### ModManager

```tsx
function ModManager(props: { className?: string }): JSX.Element | null
```

The mods screen, over the [`ModsOption`](#modsoption) given to the provider:

- **Add a mod file** (`ui.addMod`) reads a `.json` file through the store's [`add`](/reference/mods#mods). If the file can't be used, it shows why in the words of [`readMod`](/reference/mods#readmod), such as `That mod is for another game (corner-cafe).` A mod with the same id as one already there replaces it.
- Every mod added is listed in name order (`data-mod` with its id), with its name, version and description. Each has a button to turn it **On** or **Off** (`ui.modOn`, `ui.modOff`), which reads what the mod is now, and a button to **Delete** it (`ui.remove`). Under it are the `problems` that start `mod:<id> `. With no mods, it shows `ui.noMods`.
- Once anything has changed, **Restart with these mods** (`ui.applyMods`) appears and calls `onChange`.

The screen carries `data-mods`. It draws nothing when the provider has no `mods`.

```tsx
import { GameProvider, ModManager } from '@ifloom/react'

<GameProvider runner={runner} mods={{ store, problems, onChange: () => location.reload() }}>
  <ModManager />
</GameProvider>
```

**Gotchas.**

- **Nothing changes until the restart.** A mod is part of the game, so turning one on or off changes the store, not the game that's running. The player keeps playing the game as it was loaded until `onChange` builds it again.
- **The problems are the ones from start-up.** A mod added since then shows no problems until the game is built again with it.

## Around the stage

### Notices

```tsx
function Notices(props: { className?: string; limit?: number }): JSX.Element | null
```

The first `limit` (default 3) of the view's unseen [notices](/reference/notices). Each shows its picture, title and text, and a button labelled `ui.dismiss` that sends [`dismiss`](/reference/commands#dismiss). Each notice carries `data-notice`. The list has `role="status"`, so a screen reader announces a new one. `GameShell` fixes it in the bottom-right corner. On its own it sits wherever you put it.

```tsx
import { Notices } from '@ifloom/react'

<Notices limit={1} className="fixed top-4 left-1/2 w-96 -translate-x-1/2" />
```

### QuestLog

```tsx
function QuestLog(props: { className?: string; title?: string }): JSX.Element | null
```

The [quests plugin](/plugins/quests)'s view. Each active quest (`data-quest`) shows its summary, the hint for what to do next, and how far it has got (`ui.questStage`). It has a **New** badge when it has changed, and a button to track or untrack it, which sends `quests/track`. The finished quests follow, struck through. While anything is new, the heading shows a count and a **Mark all seen** button (`ui.allSeen`) sends `quests/seen`.

`title` replaces the heading, `ui.quests`, for this one list. It draws nothing in a game without the plugin.

### DebugPanel

```tsx
function DebugPanel(props: { className?: string }): JSX.Element | null
```

A panel for the person testing the game, when the game has the [debug plugin](/plugins/debug). It draws nothing in a game without the plugin, so a release build that [leaves the plugin out](/plugins/debug#leave-it-out-of-release-builds) shows no panel.

| Tab | What it has |
|---|---|
| **Set** | A form each for a stat, a variable, an item, an entity's stat, a location, a scene, the time and the turn, each sending a debug command. The entity's stat form (**Stat of**) takes the stat, the entity as content names it (such as `character:ava`) and the value. The location form appears only when the game has the [places](/plugins/places) plugin, and the time form only when it has the [calendar](/plugins/calendar). There's also a button to close the scene (`ui.closeScene`). A refusal shows beside its form. Typing `true`, `false` or a number into the variable form sends that value as itself. |
| **Why not** | The locks that are on, with what each denies, and every greyed-out action, choice and person's button on screen with its reason. |
| **State** | The whole game state, as JSON. |
| **Log** | The [command log](/reference/runner#commandlog), one command a line. |

The heading shows the seed, with **Undo** and **Redo** buttons for the runner's history. They're greyed out while there's nothing to undo or redo, and the runner only keeps history when it's made with `history`.

The heading, buttons, tabs and **Why not** headings go through [`useWords`](#usewords), under the `ui.` keys listed on [The base UI](/react/#words).

**Gotchas.**

- **The form rows are in English.** Each row's label (**Stat**, **Variable**, **Item**, **Stat of**, **Go**, **Scene**, **Time**, **Turn**) and its placeholders aren't in the strings table.
- **A number box needs a number.** An empty box, or words that aren't a number, are refused with `debug/notANumber` rather than set to 0.

## Devices

These components draw the [devices plugin](/plugins/devices)'s view, and so a [phone](/plugins/phone). In a game without the plugin they draw nothing.

### DeviceButtons

```tsx
function DeviceButtons(): JSX.Element | null
```

A button for each device offered from the sidebar (`sidebar: true`), with its badge. Each button opens the device in a [`DeviceDialog`](#devicedialog) and carries `data-device`. Opening the dialog sends no command and costs nothing.

### DeviceDialog

```tsx
function DeviceDialog(props: { deviceId: string | null; onClose: () => void }): JSX.Element
```

The device with this id in a [`Dialog`](#dialog), titled with its name and drawn as a [`DeviceScreen`](#devicescreen). It's closed while `deviceId` is `null` or matches no device. `onClose` is called when the player closes it. The content carries `data-frame` with the device's frame, and a phone's dialog is narrower.

```tsx
import { useState } from 'react'
import { Button, DeviceDialog } from '@ifloom/react'

function LaptopButton() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <>
      <Button onClick={() => setOpen('laptop')}>Laptop</Button>
      <DeviceDialog deviceId={open} onClose={() => setOpen(null)} />
    </>
  )
}
```

### DeviceScreen

```tsx
function DeviceScreen(props: { device: DeviceView }): JSX.Element
```

A device, open. With no app open, it shows the home screen: the wallpaper (through [`assetUrl`](#asseturl)) and a grid of apps. Each app is a button with its name, a badge and an icon square carrying `data-icon`, and it sends the app's command (`devices/open`). A locked app is greyed out, with its reason only in its `title`, shown on hover. Unlike a [`ChoiceButton`](#choicebutton), the icon doesn't print the reason.

With an app open (`data-app`), it shows a **Back** button (`ui.back`, sending `devices/close`), the app's name, and each of the app's sections as an [`AppSection`](#appsection).

`device` is one entry of [`useDevices`](#usedevices), a [`DeviceView`](/plugins/devices#deviceview).

### AppSection

```tsx
function AppSection(props: { section: SectionView }): JSX.Element | null
```

One [`SectionView`](/plugins/devices#sectionview) of an open app, drawn by kind:

| Kind | Drawn as |
|---|---|
| `prose` | A paragraph, with line breaks kept. |
| `actions` | A [`ChoiceList`](#choicelist). |
| `list` | Each entry (`data-entry`) with its picture, title, text and actions. |
| `plugin` | The renderer in `sections` for that plugin id, given the plugin's view and the section's `with`. Nothing if there's no renderer. |
| `panel` | The component in `panels` with the panel's name, given its data. Nothing if there's no component. |

### useDevices

```ts
function useDevices(): DeviceView[]
```

The devices in the view, `view.plugins.devices.devices`, as [`DeviceView`](/plugins/devices#deviceview)s. It returns `[]` in a game without the plugin. Use it for a device button of your own:

```tsx
import { Badge, useDevices } from '@ifloom/react'

function PhoneBadge() {
  const phone = useDevices().find((device) => device.id === 'phone')
  if (!phone) return null
  return <Badge>{phone.badge}</Badge>
}
```

## Plugin sections

These are the two built-in renderers for an app's `{ plugin }` section. [`GameProvider`](#gameprovider) registers them under `messages` and `feed`. Register your own under the same id to replace one.

### MessagesSection

```tsx
const MessagesSection: PluginSectionComponent
```

A [messages](/plugins/messages) channel, the one named by the section's `with.channel` (`data-channel`). Each thread (`data-thread`) shows under its sender's name and portrait, with its messages as bubbles. Under each message is the reply the player sent, or the replies on offer as buttons.

Opening the channel marks nothing read, so the unread count stays until the player clears it. While the channel has unread messages, a **Mark all read** button (`ui.allRead`) sends `messages/read` for the channel. It draws nothing if the channel isn't in the view.

### FeedSection

```tsx
const FeedSection: PluginSectionComponent
```

A [feed](/plugins/feed), the one named by `with.feed` (`data-feed`). Each post (`data-post`) shows the poster's name and portrait, its picture and text, its likes (`ui.likes`) and its comments.

Opening the feed marks nothing seen. While it has unseen posts, a **Mark all seen** button (`ui.allSeen`) sends `feed/seen` for the feed. It draws nothing if the feed isn't in the view.

## Words

### UI_STRINGS

```ts
const UI_STRINGS: { quests: string; questNew: string; /* ... */ }
type UiStringKey = keyof typeof UI_STRINGS
```

The UI's own words in English, by key without the `ui.` prefix. The full table is on [The base UI](/react/#words). `UiStringKey` is one of its keys.

### uiSay

```ts
function uiSay(game: Game, key: UiStringKey, vars?: Record<string, string | number>): string
```

Returns the game's word for a key, `game.strings['ui.' + key]`, or the English if the game doesn't set it. Each <code v-pre>{name}</code> is filled from `vars`. One with no value is left as written.

```ts
import { uiSay } from '@ifloom/react'

uiSay(game, 'quests')                              // 'To do' in the showcase, which sets strings: { 'ui.quests': 'To do' }
uiSay(game, 'questStage', { stage: 1, stages: 3 }) // '1 of 3'
```

### useWords

```ts
function useWords(): (key: UiStringKey, vars?: Record<string, string | number>) => string
```

`uiSay` for the game in context, inside a [`GameProvider`](#gameprovider).

```tsx
import { useWords } from '@ifloom/react'

function JournalHeading() {
  const words = useWords()
  return <h3>{words('quests')}</h3>
}
```

## shadcn/ui primitives

These are the building blocks the components above are made from, exported so your own screens match. They're [shadcn/ui](https://ui.shadcn.com)'s components, styled by the same [theme variables](/react/#theming), and shadcn/ui's documentation for each applies. To add one this package doesn't have, see [More shadcn/ui components](/react/extending#more-shadcn-ui-components).

### Button

```tsx
function Button(props: ButtonProps): JSX.Element
const buttonVariants: (options?: { variant?: ...; size?: ... }) => string

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}
```

A button. `asChild` puts the button's look on its one child instead, such as a link. `buttonVariants` returns the classes, for something that isn't a `Button` but should look like one.

```tsx
import { Button, buttonVariants } from '@ifloom/react'

<Button variant="outline" size="sm" onClick={() => runner.undo()}>Undo</Button>
<a className={buttonVariants({ variant: 'link' })} href="https://example.com/credits">Credits</a>
```

### Badge

```tsx
function Badge(props: BadgeProps): JSX.Element
const badgeVariants: (options?: { variant?: ... }) => string

type BadgeProps = ComponentProps<'span'> & { variant?: 'default' | 'secondary' | 'outline' | 'destructive' }
```

A small pill, for a count or a status.

```tsx
import { Badge } from '@ifloom/react'

<Badge variant="secondary">Open till 6</Badge>
```

### Card

```tsx
Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
```

A bordered box and its parts. Each is a `div` taking a `div`'s props, except `CardTitle`, which is an `h3`, and `CardDescription`, which is a `p`.

```tsx
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@ifloom/react'

<Card>
  <CardHeader>
    <CardTitle>The bakery</CardTitle>
    <CardDescription>Fresh at seven.</CardDescription>
  </CardHeader>
  <CardContent>Two loaves left.</CardContent>
  <CardFooter><Button size="sm">Buy one</Button></CardFooter>
</Card>
```

### Dialog

```tsx
Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose
```

A modal, built on Radix's Dialog. `Dialog` takes `open` and `onOpenChange`, or opens from a `DialogTrigger`. `DialogContent` is the box, with an overlay and a close button. Give it a `DialogTitle` for screen readers.

```tsx
import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@ifloom/react'

<Dialog>
  <DialogTrigger asChild><Button variant="outline">Map</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Small Town</DialogTitle>
      <DialogDescription>Your flat, the high street, the café, the park and the office.</DialogDescription>
    </DialogHeader>
    <DialogClose asChild><Button>Close</Button></DialogClose>
  </DialogContent>
</Dialog>
```

### ScrollArea

```tsx
function ScrollArea(props: ComponentProps<typeof ScrollAreaPrimitive.Root>): JSX.Element
```

A box that scrolls, with a slim scrollbar. Give it a height.

```tsx
import { ScrollArea } from '@ifloom/react'

<ScrollArea className="h-64">{backlog}</ScrollArea>
```

### Separator

```tsx
function Separator(props: ComponentProps<typeof SeparatorPrimitive.Root>): JSX.Element
```

A thin rule. Its `orientation` is `'horizontal'` (the default) or `'vertical'`.

### Tabs

```tsx
Tabs, TabsList, TabsTrigger, TabsContent
```

Tabs, built on Radix's Tabs. Each `TabsTrigger` shares a `value` with its `TabsContent`.

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ifloom/react'

<Tabs defaultValue="today">
  <TabsList>
    <TabsTrigger value="today">Today</TabsTrigger>
    <TabsTrigger value="week">This week</TabsTrigger>
  </TabsList>
  <TabsContent value="today">Market day.</TabsContent>
  <TabsContent value="week">The café shuts early on Sunday.</TabsContent>
</Tabs>
```

### Tooltip

```tsx
Tooltip, TooltipProvider, TooltipTrigger, TooltipContent
```

A hint on hover or focus, built on Radix's Tooltip. Every tooltip needs a `TooltipProvider` above it. [`GameShell`](#gameshell) has one. In [your own layout](/react/extending#your-own-layout), add it yourself.

```tsx
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@ifloom/react'

<Tooltip>
  <TooltipTrigger asChild><Button size="icon" variant="ghost">?</Button></TooltipTrigger>
  <TooltipContent>The café's hours are on the door.</TooltipContent>
</Tooltip>
```

### cn

```ts
function cn(...inputs: ClassValue[]): string
```

Joins class names, skipping falsy ones, and lets a later Tailwind class win over an earlier one that sets the same thing. It's shadcn/ui's `cn`.

```ts
import { cn } from '@ifloom/react'

cn('p-4 text-sm', closed && 'opacity-50', 'p-2') // 'text-sm opacity-50 p-2' when closed
```
