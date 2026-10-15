# Components

Everything `@ifloom/ui` exports, from the whole shell down to a single button. Each game component reads the [view](/reference/view) through [`useGame`](#usegame), so it must be inside a [`GameProvider`](#gameprovider) (which [`GameShell`](#gameshell) is). The [shadcn/ui primitives](#shadcn-ui-primitives) at the end need none.

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
} from '@ifloom/ui'
```

Every component that takes `className` merges it over its own classes with [`cn`](#cn), so a later Tailwind class wins: `<SceneStage className="gap-8" />`.

Many elements carry a `data-` attribute naming what they show (`data-choice`, `data-exit`, `data-person`, `data-stat`, `data-kind`, `data-entity`, `data-notice`, `data-quest`, `data-device`, `data-open-app`, `data-app`, `data-thread`, `data-post`, `data-scene`, `data-input`, `data-item`, `data-slot-id`, `data-save-slot`, `data-backlog`, `data-mod`; and on whole panels `data-inventory`, `data-wardrobe`, `data-menu`, `data-saves`, `data-mods`). Style them from your stylesheet, or find them in a test.

## The game

### GameShell

```tsx
function GameShell(props: GameShellProps): JSX.Element
```

The whole UI: a [`GameProvider`](#gameprovider), a [`TooltipProvider`](#tooltip), a side column and a stage, each drawn with [`Parts`](#parts) from its `layout` ([`DEFAULT_LAYOUT`](#default-layout) if left out), with [`Notices`](#notices) in the corner. The side column is an `<aside>` carrying `data-sidebar`, and is left out when the layout has no `sidebar` or an empty one. Its props, `GameShellProps`, and layouts are on [The base UI](/ui/#gameshell).

```tsx
<GameShell runner={runner} panels={{ StallPanel }} layout={{ ...DEFAULT_LAYOUT, stage: [<WeatherBanner key="w" />, ...DEFAULT_LAYOUT.stage] }} />
```

### Layout

```ts
type Layout = { sidebar?: readonly Part[]; stage?: readonly Part[] }
type Part = PartName | ReactNode
type PartName =
  | 'title' | 'stats' | 'entities' | 'menu' | 'devices' | 'separator' | 'location' | 'people'
  | 'actions' | 'inventory' | 'wardrobe' | 'scene' | 'inputs' | 'quests' | 'debug'
```

What [`GameShell`](#gameshell)'s `layout` takes: the parts of the side column and of the stage, in order. A `PartName` is a built-in part, each drawing nothing when the game has nothing for it; anything else is drawn as it is. Which component each name draws is in the table on [The base UI](/ui/#layouts). With a layout given, a `stage` left out is `DEFAULT_LAYOUT.stage`, but a `sidebar` left out is no side column.

### DEFAULT_LAYOUT

```ts
const DEFAULT_LAYOUT: {
  sidebar: readonly ['title', 'stats', 'entities', 'menu', 'devices', 'separator', 'location', 'people', 'actions', 'inventory', 'wardrobe']
  stage: readonly ['scene', 'inputs', 'quests', 'debug']
}
```

The base UI's own layout, what a `GameShell` with no `layout` draws: everything at the side, the scene on the stage. Spread it to change one list and keep the other:

```tsx
<GameShell runner={runner} layout={{ ...DEFAULT_LAYOUT, stage: [<WeatherBanner key="w" />, ...DEFAULT_LAYOUT.stage] }} />
```

### READING_LAYOUT

```ts
const READING_LAYOUT: {
  sidebar: readonly []
  stage: readonly ['title', 'scene', 'inputs', 'actions', 'stats', 'menu']
}
```

A page to read, as a novel is: no side column, so a single narrow column, with the title over the scene, then the inputs, the buttons, the stats and the player's menu. The Letter is drawn with it: `<GameShell runner={runner} layout={READING_LAYOUT} />`.

### Parts

```tsx
function Parts(props: { parts: readonly Part[] }): JSX.Element
```

Draws `parts` in order: each [`PartName`](#layout) as its built-in component, anything else as it is. It is what `GameShell` and [`Sidebar`](#sidebar) draw their lists with, and wraps nothing around them, so a page of your own can use it inside its own element:

```tsx
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

Connects everything under it to a [runner](/reference/runner). It subscribes to the runner, works out the view again only when the state changes, and hands both down through [`useGame`](#usegame). `panels` and `sections` are as on [`GameShell`](/ui/#gameshell); the built-in renderers for `messages` and `feed` are added under `sections`, and yours win over them. `mods` turns on the [mod manager](#modmanager): see [`ModsOption`](#modsoption).

Use it on its own to build [your own layout](/ui/extending#your-own-layout).

**Gotcha.** Define `panels`, `sections` and `mods` once, outside your component, not inline as <code v-pre>panels={{ StallPanel }}</code> in a component that re-renders: a new object each render makes every component under the provider draw again. Leaving them out is fine; the defaults are the same objects every time.

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

The runner, the current [`View`](/reference/view), and `send`, which runs a command through `runner.apply` and returns what [`apply`](/reference/commands#apply) returned, so you can show a refusal. `panels` and `sections` are what the provider was given, with the built-in sections, and `mods` is the provider's `mods`, if any. Throws outside a `GameProvider`.

```tsx
function Purse() {
  const { view } = useGame()
  return <p>{view.statsById.coins.text}</p>
}

// go() is from @ifloom/plugin-places
function GoHome() {
  const { send } = useGame()
  const [said, setSaid] = useState<string>()
  return (
    <>
      <Button onClick={() => setSaid(send(go('house')).refused)}>Go home</Button>
      {said ? <p className="text-sm text-muted-foreground">{said}</p> : null}
    </>
  )
}
```

The runner is there for what the view does not cover: `runner.undo()`, `runner.save(...)`, `runner.backlog()`.

### ModsOption

```ts
type ModsOption = {
  store: Mods
  problems?: string[]
  onChange?: () => void
}
```

The game's [mods](/reference/mods), for the [mod manager](#modmanager), given as `mods` on [`GameShell`](/ui/#gameshell) or [`GameProvider`](#gameprovider):

| Field | What it is |
|---|---|
| `store` | The [`Mods`](/reference/mods#mods) store the game loaded its mods from at start-up. |
| `problems` | What the [loader](/reference/loader#the-checks) found, as [`describeProblem`](/reference/loader#problem-and-describeproblem) writes it. Each one that starts `mod:<id> ` is shown under that mod; the rest are not shown. |
| `onChange` | Builds the game again with the mods as they now are: usually `() => location.reload()`. Without it, the manager never offers to restart. |

```tsx
const store = mods('small-town', indexedDbDriver())
const { game, problems } = smallTown({ mods: await store.packs() })
// …
<GameShell runner={runner} mods={{ store, problems, onChange: () => location.reload() }} />
```

### PanelComponent

```ts
type PanelComponent = ComponentType<{ data: unknown }>
```

A game's own panel: a scene's bespoke panel, or an app's panel section. `data` is what the game's [custom panel](/reference/custom#panels) returned. See [Panels](/ui/extending#panels).

### PluginSectionComponent

```ts
type PluginSectionComponent = ComponentType<{ data: unknown; with: Record<string, unknown> }>
```

Draws a plugin's view inside an app. `data` is that plugin's slice of the view, at [`view.plugins[id]`](/reference/view#plugins), and `with` is the section's `with`. See [Plugin sections](/ui/extending#plugin-sections).

## The stage

### SceneStage

```tsx
function SceneStage(props: { className?: string }): JSX.Element
```

The main panel: the scene on screen, or, when none is open, the room: a plugin's [stage](/reference/plugins#stage), such as the [places](/plugins/places) plugin's, else the game's title and an empty body. It draws the speaker's portrait (none when [`view.scene.speaker`](/reference/view#speakerview) is `null` or its `portrait` is) and the title, the stage picture (centred, at most `max-h-80` tall, and never wider than the stage, keeping its shape), each [`Beat`](#beat) of the body, and then either the game's panel for the scene, if the scene names one and `panels` has it, or the scene's choices as a [`ChoiceList`](#choicelist). The `article` carries `data-scene` with the scene's id, or `location` for the room.

**Gotcha.** A scene that names a `panel` the game has given no component for shows its choices instead, with no warning.

### Beat

```tsx
function Beat(props: { beat: SceneBeat }): JSX.Element
```

One beat of a scene's body, by kind:

| Kind | Drawn as |
|---|---|
| `text` | A paragraph. |
| `mono` | A paragraph in a monospace font. |
| `say` | A paragraph in `--speech`, or for the player's own line in `--player-speech` and indented. |
| `image` | A [`Picture`](#picture): full width, or at most `max-w-sm` for `size: 'inline'`, tilted a little with `rotate`. |
| `mail` | A card with its headers, then the body. |
| `prop` | A dashed box, with `data-face` set to its face for a stylesheet to dress. |

```tsx
<Beat beat={{ kind: 'say', who: 'character', text: '“Morning. What can I get you?”' }} />
```

### Picture

```tsx
function Picture(props: ComponentProps<'img'>): JSX.Element | null
```

An `<img>` that draws nothing, and takes no space, when its file is missing or `src` is empty, instead of a broken-image icon. A portrait not drawn yet or art left out of a build just isn't there. It takes every `<img>` prop, and still calls your `onError`. Every picture in the UI's components is one.

```tsx
<Picture src={person.portrait} alt={person.name} className="size-8 rounded-full object-cover" />
```

A `Picture` remembers which `src` failed, not that it failed: when the same element is given a new `src`, the new file gets its own chance to load. A portrait that changes with the speaker needs no `key`.

Its `src` goes through [`assetUrl`](#asseturl), so a picture put inside the page by `ifloom build --inline-assets` is found there.

### assetUrl

```ts
function assetUrl(src: string): string
```

Where a picture really is. A build made with [`ifloom build --inline-assets`](/cli/#one-file-pictures-and-all) carries its pictures inside `index.html`, in a map from path to `data:` URL; `assetUrl` looks `src` up there, ignoring a leading `./`, and returns the data URL. Anywhere else — under `ifloom dev`, a plain build, a path not in the map — it returns `src` as it is.

```ts
assetUrl('art/place/cafe.jpg')   // 'data:image/jpeg;base64,…' in a one-file build; 'art/place/cafe.jpg' otherwise
assetUrl('./art/place/cafe.jpg') // the same
```

[`Picture`](#picture) and a device's wallpaper in [`DeviceScreen`](#devicescreen) call it, so everything the base UI draws is covered.

**Gotcha.** A component of your own that draws a picture from a path — an `<img>`, a CSS `background-image` — must call it too, or use a `Picture`: in a one-file build the `art/` folder is gone, and the bare path points at nothing.

```tsx
function Postcard({ src }: { src: string }) {
  return <div className="h-40 bg-cover" style={{ backgroundImage: `url(${assetUrl(src)})` }} />
}
```

### ChoiceButton

```tsx
function ChoiceButton(props: { choice: RenderedChoice; className?: string }): JSX.Element
```

A [`RenderedChoice`](/reference/actions#renderedchoice), whether a scene's choice, a room's action or a person's, as a full-width button that sends its `command`. On the button:

- the label;
- a warning icon, labelled with the warning itself, when it carries a `warning` — pressable, but the game would refuse it, such as the calendar's `That would run past dawn.`;
- its price, as a [`PriceTag`](#pricetag);
- its `irreversible` line, the warning that this can't be taken back, under the price in the destructive colour (`--destructive`);
- when it is greyed out, **the reason**, under those. The button is disabled;
- when it is not greyed out and carries a `warning`, the warning, under those, so the player reads why before pressing.

It carries `data-choice` with the choice's id. A choice's `tags` are not drawn; style by them in a component of your own.

### ChoiceList

```tsx
function ChoiceList(props: { choices: RenderedChoice[]; className?: string }): JSX.Element | null
```

A column of [`ChoiceButton`](#choicebutton)s. Nothing for an empty list.

```tsx
const { view } = useGame()
<ChoiceList choices={view.actions} />
```

### PriceTag

```tsx
function PriceTag(props: { price: Price; className?: string }): JSX.Element | null
```

A [`Price`](/reference/view#price) as the engine wrote it: each stat's `text`, then each of the plugins' `notes`, such as the calendar's `until afternoon`, joined with ` · `, in `--price`. Nothing for a price with neither.

## The sidebar

### Sidebar

```tsx
function Sidebar(props: SidebarProps): JSX.Element

type SidebarProps = { className?: string; parts?: readonly Part[] }
```

The side column on its own, for a page of your own: an `<aside>` carrying `data-sidebar`, with its `parts` drawn by [`Parts`](#parts). `GameShell` draws its side column with it. Left out, `parts` is [`DEFAULT_LAYOUT`](#default-layout)`.sidebar`: [`Title`](#title), [`StatList`](#statlist), [`EntityTable`](#entitytable), [`GameMenu`](#gamemenu), [`DeviceButtons`](#devicebuttons), a [`Separator`](#separator), [`LocationPanel`](#locationpanel), [`PeoplePanel`](#peoplepanel), [`Actions`](#actions), [`Inventory`](#inventory) and [`WardrobePanel`](#wardrobepanel). [`GameShell`](#gameshell) does not use it: it draws its own side column from its `layout`, which carries `data-sidebar`; this one does not.

```tsx
<Sidebar className="order-last" parts={['title', 'stats', 'menu']} />
```

### Title

```tsx
function Title(): JSX.Element
```

The game's title, `view.title`, as a heading, with the [`Clock`](#clock) under it. The `'title'` part.

### Actions

```tsx
function Actions(): JSX.Element
```

The buttons offered while no scene is open, `view.actions` — the room's, the game's own and its plugins' — as a [`ChoiceList`](#choicelist). The `'actions'` part.

### Clock

```tsx
function Clock(): JSX.Element | null
```

Where the game is in time: [`view.when`](/reference/view), as its plugins wrote it — the [calendar](/plugins/calendar#the-label)'s `Day 3 · Wednesday afternoon`. Nothing in a game where no plugin says when it is, such as one with no calendar. To reword it, change the calendar's `calendar/label` string.

### StatList

```tsx
function StatList(): JSX.Element | null
```

The stats the view lists, each label beside its value written the way the game [formats](/reference/stats) it (`5c`). A stat the game does not list, or whose `visible` does not hold, is not in the view, so not here. Nothing when there are none. Each row carries `data-stat`.

### EntityTable

```tsx
function EntityTable(props: { kinds?: string[]; className?: string }): JSX.Element | null
```

The things the game keeps several of, [`view.entities`](/reference/view#entities): a table for each [kind](/reference/entities) that has any, headed with its `plural`, with a row for each entity — its name, then its stats written the way the game [formats](/reference/stats) them. The columns are every stat any row shows, in the order they first appear; a row that does not show one (its `visible` does not hold for that entity) has a blank cell. Each section carries `data-kind` with the kind's id, and each row `data-entity` with its reference, `staff:ana`.

`kinds` draws only those kinds; left out, every kind. Nothing at all when none of them has any entities, so a game with no kinds has no empty box. The `'entities'` [part](#layout) draws it with every kind.

```tsx
// The café's menu on its own, beside the stage:
<EntityTable kinds={['dish']} className="border-t pt-4" />
```

### LocationPanel

```tsx
function LocationPanel(): JSX.Element | null
```

Where the player is, its name and tag, and an outline button for each exit, read from the [places](/plugins/places) plugin's view at [`view.plugins.places`](/plugins/places#the-view). Each button sends the exit's own [`command`](/plugins/places#exitview) and carries `data-exit`. An exit the player cannot take is greyed out. Nothing at all in a game without the places plugin, or while its `location` is `null` (the player is nowhere), so a novel's sidebar has no empty box. The UI reads the plugin's view by its shape and imports nothing from it.

**Gotcha.** An exit's reason is in the button's `title`, shown on hover, not on the button itself as a choice's is. An exit a lock hides is not in the view at all.

### PeoplePanel

```tsx
function PeoplePanel(): JSX.Element | null
```

Who is here, from the [cast plugin](/plugins/cast)'s view, `view.plugins.cast.present`, read by its shape: each person's portrait (when they have one), name and role (when they have one), with a [`ChoiceButton`](#choicebutton) for each thing the player can do with them, their **Talk** button. Each carries `data-person`. Nothing when nobody is here, and nothing at all in a game without the cast: the core has no people of its own.

### Inventory

```tsx
function Inventory(props: { className?: string }): JSX.Element | null
```

What the player carries, [`view.pack`](/reference/view#the-player-s-numbers-and-things): each item's name, `×n` when there is more than one, and its description. An item with a [`use`](/reference/game#itemdef) gets a [`ChoiceButton`](#choicebutton) labelled with its `useLabel` that sends [`use`](/reference/commands#use); when [`whyNot`](/reference/actions#whynot) says it can't be used now, the button is greyed out with that reason on it. Headed `ui.inventory`; each item carries `data-item`. Nothing when the player carries nothing.

```tsx
// In the showcase, a sandwich from the café: "Eat the sandwich" puts 25 energy back.
<Inventory className="border-t pt-4" />
```

### WardrobePanel

```tsx
function WardrobePanel(props: { className?: string }): JSX.Element | null
```

The [wardrobe plugin](/plugins/wardrobe)'s view: each slot (`data-slot-id`) with its label and what is in it, or `ui.nothingOn`; a **Take off** button (`ui.takeOff`) when something is; and a **Wear …** button (`ui.wear` and the item's name) for each spare piece of clothing that goes in that slot. The buttons send `wardrobe/takeOff` and `wardrobe/wear`. One that can't be done now is greyed out, with [`whyNot`](/reference/actions#whynot)'s reason in its `title`. Headed `ui.wardrobe`. Nothing in a game without the plugin.

**Gotcha.** As on an exit, the reason is in the `title`, shown on hover, not printed on the button.

## Inputs

### InputField

```tsx
function InputField(props: { input: InputView }): JSX.Element
```

One of the game's [inputs](/reference/inputs), an [`InputView`](/reference/view#inputview) from `view.inputs`: its label, then

- for `kind: 'text'` or `'number'`, a box (honouring `maxLength`, `min` and `max`) and an **Enter** button (`ui.enter`) that sends [`input`](/reference/commands#input) with what was typed;
- for `kind: 'choice'`, a button per option, the one already picked filled in, each sending its value.

If the engine refuses the value, its reason shows under the field — `Keep it to 8 characters.`, say — until a value takes. The box follows the input's value when something else changes it, an undo or a load, so it always shows what the game holds. Carries `data-input` with the input's id.

**Gotcha.** An empty number box sends no value at all, not `0`, so the engine refuses it with `enterSomething` (`Enter something first.`).

### InputFields

```tsx
function InputFields(props: { className?: string }): JSX.Element | null
```

An [`InputField`](#inputfield) for every input in `view.inputs` — those whose `when` holds now. Nothing when there are none. [`GameShell`](#gameshell) puts it under the scene.

```tsx
// The showcase asks for the cat's name on moving day, and only then.
inputs: [{ id: 'catName', label: 'Name your cat', kind: 'text', maxLength: 16, when: { phase: ['arrival'] } }]
```

**Gotcha.** A [lock](/reference/locks) that denies `'*'` denies `input` too. A scene that asks for a value while the rest of the game is locked needs `input` in the lock's `except`.

## The player's menu

### GameMenu

```tsx
function GameMenu(props: { className?: string }): JSX.Element | null
```

A row of buttons for what the runner offers: **Saves** (`ui.saves`) when it was made with `saves`, **Backlog** (`ui.backlog`) when [`runner.offers`](/reference/runner#the-runner-s-members)`.backlog`, **Mods** (`ui.mods`) when the provider was given [`mods`](#modsoption), and **Undo** and **Redo** when `runner.offers.undo`, greyed out while there is nothing to undo or redo. Saves, Backlog and Mods open a [`Dialog`](#dialog) holding a [`SavesMenu`](#savesmenu), a [`Backlog`](#backlog) or a [`ModManager`](#modmanager); loading a save closes it. Carries `data-menu`. Nothing when there is none of them to show.

So what the player sees is set on the runner:

```ts
const runner = createRunner(game, startingState(game), {
  history: { depth: 50 },          // Undo and Redo
  backlog: { limit: 200 },         // Backlog
  saves: saves(game, localStorageDriver()), // Saves
})
```

### SavesMenu

```tsx
function SavesMenu(props: { className?: string; onLoaded?: () => void }): JSX.Element | null
```

The save and load screen, over [`runner.saves`](/reference/runner#the-runner-s-members):

- **Save in a new slot** (`ui.saveNew`) writes the next numbered slot: one more than the highest slot named with a number, so `1`, `2`, `3`.
- **Import a save file** (`ui.importSave`) reads a `.json` file through [`importText`](/reference/saves#saves) and plays on from it with [`runner.restore`](/reference/runner#the-runner-s-members).
- Every slot, newest first (`data-save-slot`), with its name and when it was saved, and buttons to **Load** it (`ui.load`), **Save** over it (`ui.save`), **Export** it (`ui.exportSave`) as a file named `<game>-<slot>.json` (a download through a temporary link, released a second after the click), and **Delete** it (`ui.remove`). With none, `ui.noSaves`.

A save that can't be read shows why. One made with packs or plugins this game doesn't have loads, with a line naming them (`ui.missingPacks`, `ui.missingPlugins`). `onLoaded` is called after a load or an import. Carries `data-saves`. Nothing when the runner has no `saves`.

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogTitle>Saves</DialogTitle>
    <SavesMenu onLoaded={() => setOpen(false)} />
  </DialogContent>
</Dialog>
```

**Gotcha.** **Save** over a slot replaces its name with the default one: [`meta.when`](/reference/saves#savemeta), the day, period and place in the plugins' words, or `Turn N` when no plugin says.

### Backlog

```tsx
function Backlog(props: { className?: string }): JSX.Element
```

[`runner.backlog()`](/reference/runner#backlogentry), oldest first, in a [`ScrollArea`](#scrollarea): each entry's title and beats, drawn as [`Beat`](#beat)s, followed by a line **You chose: …** (`ui.chose`) when the player made a choice in it. Each entry carries `data-backlog` with its scene id. With nothing in it, `ui.backlogEmpty`. It follows the view, so it stays current while open.

**Gotcha.** It needs the runner made with `backlog`; without it the list is always empty.

### ModManager

```tsx
function ModManager(props: { className?: string }): JSX.Element | null
```

The mods screen, over the [`ModsOption`](#modsoption) given to the provider:

- **Add a mod file** (`ui.addMod`) reads a `.json` file through the store's [`add`](/reference/mods#mods). A file that can't be used shows why, in the words of [`readMod`](/reference/mods#readmod): `That mod is for another game (corner-cafe).` One with the id of a mod already there replaces it.
- Every mod added, in name order (`data-mod` with its id): its name and version, its description, and buttons to turn it **On** or **Off** (`ui.modOn`, `ui.modOff`; the button reads what the mod is now) and to **Delete** it (`ui.remove`). Under it, each of `problems` that starts `mod:<id> `. With none, `ui.noMods`.
- Once anything has changed, **Restart with these mods** (`ui.applyMods`), which calls `onChange`.

Carries `data-mods`. Nothing when the provider has no `mods`.

```tsx
<GameProvider runner={runner} mods={{ store, problems, onChange: () => location.reload() }}>
  <ModManager />
</GameProvider>
```

**Gotchas.**

- **Nothing changes until the restart.** A mod is part of the game, so turning one on or off changes the store, not the game that is running. The player keeps playing the game as it was loaded until `onChange` builds it again.
- **Problems are the ones from start-up.** A mod added since has none shown until the game is built again with it.

## Around the stage

### Notices

```tsx
function Notices(props: { className?: string; limit?: number }): JSX.Element | null
```

The first `limit` (default 3) of the view's unseen [notices](/reference/notices), each with its picture, title and text, and a button labelled `ui.dismiss` that sends [`dismiss`](/reference/commands#dismiss). The list has `role="status"`, so a screen reader announces a new one. `GameShell` fixes it in the bottom-right corner; on its own it sits where you put it.

```tsx
<Notices limit={1} className="fixed top-4 left-1/2 w-96 -translate-x-1/2" />
```

### QuestLog

```tsx
function QuestLog(props: { className?: string; title?: string }): JSX.Element | null
```

The [quests plugin](/plugins/quests)'s view: each active quest with its summary, the hint for what to do next, how far it has got (`ui.questStage`), a **New** badge when it has changed, and a button to track or untrack it (`quests/track`); then the finished ones, struck through. While anything is new, a count on the heading and a **Mark all seen** button (`quests/seen`).

`title` replaces the heading, `ui.quests`, for this one list. Nothing in a game without the plugin.

### DebugPanel

```tsx
function DebugPanel(props: { className?: string }): JSX.Element | null
```

A panel for the person testing the game, when the game has the [debug plugin](/plugins/debug). Nothing in a game without it, so a release build that [leaves the plugin out](/plugins/debug#leave-it-out-of-release-builds) shows no panel.

| Tab | What it has |
|---|---|
| **Set** | A form each for a stat, a variable, an item, an entity's stat (**Stat of**: the stat, the entity as content names it, such as `character:ava`, and the value), a location (only when the game has the [places](/plugins/places) plugin, `view.plugins.places`), a scene, the time (only when the game has the [calendar](/plugins/calendar), `view.plugins.calendar`) and the turn, sending the debug commands; and a button to close the scene (`ui.closeScene`). A refusal shows beside its form. Typed `true`, `false` and numbers are sent as themselves to a variable. |
| **Why not** | The locks that are on, with what each denies, and every greyed-out action, choice and person's button (the cast's) on screen with its reason. |
| **State** | The whole game state, as JSON. |
| **Log** | The [command log](/reference/runner), one command a line. |

Its heading shows the seed, with **Undo** and **Redo** buttons for the runner's history (greyed out while there is nothing to undo or redo; the runner keeps history only when it is made with `history`).

Its heading, buttons, tabs and the **Why not** headings go through [`useWords`](#usewords), under the `ui.` keys listed on [The base UI](/ui/#words).

**Gotchas.**
- **The form rows are English.** Each row's label (**Stat**, **Variable**, **Item**, **Stat of**, **Go**, **Scene**, **Time**, **Turn**) and its placeholders are not in the strings table.
- **A number box needs a number.** An empty box, or words that aren't a number, are refused with `debug/notANumber` rather than set to 0.

## Devices

These draw the [devices plugin](/plugins/devices)'s view, and so a [phone](/plugins/phone). In a game without it they draw nothing.

### DeviceButtons

```tsx
function DeviceButtons(): JSX.Element | null
```

A button for each device offered from the sidebar (`sidebar: true`), with its badge, opening the device in a [`DeviceDialog`](#devicedialog). Opening the dialog sends no command and costs nothing. Each button carries `data-device`.

### DeviceDialog

```tsx
function DeviceDialog(props: { deviceId: string | null; onClose: () => void }): JSX.Element
```

The device with this id in a [`Dialog`](#dialog), titled with its name and drawn as a [`DeviceScreen`](#devicescreen). Closed while `deviceId` is `null` or no device has it; `onClose` is called when the player closes it. The content carries `data-frame` with the device's frame, and a phone's is narrower.

```tsx
const [open, setOpen] = useState<string | null>(null)
<Button onClick={() => setOpen('laptop')}>Laptop</Button>
<DeviceDialog deviceId={open} onClose={() => setOpen(null)} />
```

### DeviceScreen

```tsx
function DeviceScreen(props: { device: DeviceView }): JSX.Element
```

A device, open. With no app open, its home screen: the wallpaper (through [`assetUrl`](#asseturl)), and a grid of apps, each a button with its name, a badge, and an icon square carrying `data-icon`, that sends the app's command (`devices/open`). A locked app is greyed out, with its reason only in its `title`, shown on hover; unlike a [`ChoiceButton`](#choicebutton), the icon does not print it. With an app open (`data-app`), a **Back** button (`ui.back`, sending `devices/close`), the app's name, and each of its sections as an [`AppSection`](#appsection).

`device` is one entry of [`useDevices`](#usedevices), a [`DeviceView`](/plugins/devices#deviceview).

### AppSection

```tsx
function AppSection(props: { section: SectionView }): JSX.Element | null
```

One [`SectionView`](/plugins/devices#sectionview) of an open app, by kind:

| Kind | Drawn as |
|---|---|
| `prose` | A paragraph, line breaks kept. |
| `actions` | A [`ChoiceList`](#choicelist). |
| `list` | Each entry with its picture, title, text and actions. |
| `plugin` | The renderer in `sections` for that plugin id, given the plugin's view and the section's `with`. Nothing if there is none. |
| `panel` | The component in `panels` with the panel's name, given its data. Nothing if there is none. |

### useDevices

```ts
function useDevices(): DeviceView[]
```

The devices in the view, `view.plugins.devices.devices` as [`DeviceView`](/plugins/devices#deviceview)s, or `[]` in a game without the plugin. For a device button of your own:

```tsx
function PhoneButton() {
  const phone = useDevices().find((device) => device.id === 'phone')
  if (!phone) return null
  return <Badge>{phone.badge}</Badge>
}
```

## Plugin sections

The two built-in renderers for an app's `{ plugin }` section. [`GameProvider`](#gameprovider) registers them under `messages` and `feed`; register your own under the same id to replace one.

### MessagesSection

```tsx
const MessagesSection: PluginSectionComponent
```

A [messages](/plugins/messages) channel, the one named by the section's `with.channel`: each thread under its sender's name and portrait (`data-thread`), its messages as bubbles, the reply the player sent, or the replies on offer as buttons. Opening it marks nothing read: the unread count stays until the player says otherwise. While the channel has unread messages, a **Mark all read** button (`ui.allRead`) sends `messages/read` for the channel. Nothing if the channel is not in the view.

### FeedSection

```tsx
const FeedSection: PluginSectionComponent
```

A [feed](/plugins/feed), the one named by `with.feed`: its posts, each with the poster's name and portrait, picture, text, likes (`ui.likes`) and comments (`data-post`). Opening it marks nothing seen. While it has unseen posts, a **Mark all seen** button (`ui.allSeen`) sends `feed/seen` for the feed. Nothing if the feed is not in the view.

## Words

### UI_STRINGS

```ts
const UI_STRINGS: { quests: string; questNew: string; /* ... */ }
type UiStringKey = keyof typeof UI_STRINGS
```

The UI's own words in English, by key without the `ui.` prefix. The full table is on [The base UI](/ui/#words). `UiStringKey` is one of its keys.

### uiSay

```ts
function uiSay(game: Game, key: UiStringKey, vars?: Record<string, string | number>): string
```

The game's word for a key, `game.strings['ui.' + key]`, or the English. Each <code v-pre>{name}</code> is filled from `vars`; one with no value is left as written.

```ts
uiSay(game, 'quests')                              // 'Journal', with strings: { 'ui.quests': 'Journal' }
uiSay(game, 'questStage', { stage: 1, stages: 3 }) // '1 of 3'
```

### useWords

```ts
function useWords(): (key: UiStringKey, vars?: Record<string, string | number>) => string
```

`uiSay` for the game in context, inside a [`GameProvider`](#gameprovider).

```tsx
function JournalHeading() {
  const words = useWords()
  return <h3>{words('quests')}</h3>
}
```

## shadcn/ui primitives

The building blocks the components above are made from, exported so that your own screens match. They are [shadcn/ui](https://ui.shadcn.com)'s components, styled by the same [theme variables](/ui/#theming); shadcn/ui's documentation for each applies. To add one this package does not have, see [More shadcn/ui components](/ui/extending#more-shadcn-ui-components).

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

A button. `asChild` puts its look on its one child instead, such as a link. `buttonVariants` returns the classes, for something that is not a `Button` but should look like one.

```tsx
<Button variant="outline" size="sm" onClick={() => runner.undo()}>Undo</Button>
<a className={buttonVariants({ variant: 'link' })} href="https://example.com/credits">Credits</a>
```

### Badge

```tsx
function Badge(props: BadgeProps): JSX.Element
const badgeVariants: (options?: { variant?: ... }) => string

type BadgeProps = ComponentProps<'span'> & { variant?: 'default' | 'secondary' | 'outline' | 'destructive' }
```

A small pill: a count, a status.

```tsx
<Badge variant="secondary">Open till 6</Badge>
```

### Card

```tsx
Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
```

A bordered box and its parts, each a `div` (`CardTitle` an `h3`, `CardDescription` a `p`) taking that element's props.

```tsx
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

A modal, over Radix's Dialog. `Dialog` holds `open` and `onOpenChange` (or opens from a `DialogTrigger`); `DialogContent` is the box, with an overlay and a close button; give it a `DialogTitle` for screen readers.

```tsx
<Dialog>
  <DialogTrigger asChild><Button variant="outline">Map</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Small Town</DialogTitle>
      <DialogDescription>The house, the high street, the café and the market.</DialogDescription>
    </DialogHeader>
    <DialogClose asChild><Button>Close</Button></DialogClose>
  </DialogContent>
</Dialog>
```

### ScrollArea

```tsx
function ScrollArea(props: ComponentProps<typeof ScrollAreaPrimitive.Root>): JSX.Element
```

A box that scrolls with a slim scrollbar. Give it a height.

```tsx
<ScrollArea className="h-64">{backlog}</ScrollArea>
```

### Separator

```tsx
function Separator(props: ComponentProps<typeof SeparatorPrimitive.Root>): JSX.Element
```

A thin rule, `orientation` `'horizontal'` (the default) or `'vertical'`.

### Tabs

```tsx
Tabs, TabsList, TabsTrigger, TabsContent
```

Tabs, over Radix's Tabs. Each `TabsTrigger` and `TabsContent` share a `value`.

```tsx
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

A hint on hover or focus, over Radix's Tooltip. Every tooltip needs a `TooltipProvider` above it. [`GameShell`](#gameshell) has one; in [your own layout](/ui/extending#your-own-layout), add it.

```tsx
<Tooltip>
  <TooltipTrigger asChild><Button size="icon" variant="ghost">?</Button></TooltipTrigger>
  <TooltipContent>The café's hours are on the door.</TooltipContent>
</Tooltip>
```

### cn

```ts
function cn(...inputs: ClassValue[]): string
```

Joins class names, skipping falsy ones, and lets a later Tailwind class win over an earlier one that sets the same thing: shadcn/ui's `cn`.

```ts
cn('p-4 text-sm', closed && 'opacity-50', 'p-2') // 'text-sm opacity-50 p-2' when closed
```
