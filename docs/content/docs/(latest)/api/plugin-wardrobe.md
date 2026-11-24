---
title: "@ifloom/plugin-wardrobe"
description: "Every export of @ifloom/plugin-wardrobe and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-wardrobe` and `@ifloom/plugin-wardrobe/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-wardrobe

- Functions: [`slotsOf`](#slotsof), [`wardrobe`](#wardrobe), [`wearableOf`](#wearableof)
- Types: [`Closet`](#closet), [`WardrobeSlot`](#wardrobeslot), [`WardrobeState`](#wardrobestate), [`WardrobeView`](#wardrobeview), [`Wearable`](#wearable)

### Closet

Type. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#closet).

The data of the `wardrobe/closet` trait, which makes a location somewhere the player can change clothes. While the
player is there, the room offers a button that opens the `wardrobe` panel.

The button needs the places plugin, which says where the player is.

```ts shape
import type { Closet } from '@ifloom/plugin-wardrobe'
type Closet = {
  label?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `label` | `string` | yes |  | The label of the button that opens the `wardrobe` panel. The `wardrobe/open` string (`Wardrobe`) if left out. |

### slotsOf

Function. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#slotsof).

Returns the game's slots in order, from `data.wardrobe.slots` in its content and packs.

```ts shape
import { slotsOf } from '@ifloom/plugin-wardrobe'
function slotsOf(game: Game): WardrobeSlot[]
```

Uses: [`Game`](/docs/api/engine#game), [`WardrobeSlot`](#wardrobeslot).

### wardrobe

Function. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#wardrobe).

The wardrobe plugin's factory, with its helpers as properties. `wardrobe()` returns the plugin for the game's
`plugins`, and content calls helpers such as `wardrobe.wearable('coat')` and `wardrobe.wear('clothing:scarf')`.

```ts shape
import { wardrobe } from '@ifloom/plugin-wardrobe'
function wardrobe(): DefinedPlugin<WardrobeState, WardrobeView>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`WardrobeState`](#wardrobestate), [`WardrobeView`](#wardrobeview).

| Helper | Signature | Description |
|---|---|---|
| `wardrobe.wearable` | `(slot: string): { 'wardrobe/wearable':` [`Wearable`](#wearable) `}` | Returns the `wardrobe/wearable` trait for a slot, to spread into an entity's or a kind's `traits`. |
| `wardrobe.closet` | `(options?:` [`Closet`](#closet)`): { 'wardrobe/closet':` [`Closet`](#closet) `}` | Returns the `wardrobe/closet` trait, to spread into a location's `traits`, which offers a button that opens the `wardrobe` panel. |
| `wardrobe.wearing` | `(entity:` [`EntityRef`](/docs/api/engine#entityref)`, slot?: string):` [`Condition`](/docs/api/engine#condition) | Returns the `wardrobe/wearing` condition, which holds while whoever the player is playing wears the thing, in `slot` if given. |
| `wardrobe.slotFilled` | `(slot: string):` [`Condition`](/docs/api/engine#condition) | Returns the `wardrobe/wearing` condition for a slot, which holds while whoever the player is playing has something in it. |
| `wardrobe.wear` | `(entity:` [`EntityRef`](/docs/api/engine#entityref)`):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `wardrobe/wear` command, which puts on a thing the player holds. |
| `wardrobe.takeOff` | `(slot: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `wardrobe/takeOff` command, which takes off whatever is in the slot. |

### WardrobeSlot

Type. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#wardrobeslot).

A slot the game declares in `data.wardrobe.slots`, a part of the body where a thing can be worn.

```ts shape
import type { WardrobeSlot } from '@ifloom/plugin-wardrobe'
type WardrobeSlot = {
  id: string
  label: string
  start?: EntityRef
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The slot's id, which a wearable thing's `slot` names. |
| `label` | `string` |  |  | The slot's label. |
| `start` | [`EntityRef`](/docs/api/engine#entityref) | yes |  | The wearable thing in the slot at the start, one the player starts holding. The slot starts empty if left out. |

### WardrobeState

Type. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#wardrobestate).

The clothes a save keeps for each body. Slots and wearable things are read from content.

```ts shape
import type { WardrobeState } from '@ifloom/plugin-wardrobe'
type WardrobeState = {
  worn: Record<string, Record<string, EntityRef | null>>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `worn` | `Record<string, Record<string,` [`EntityRef`](/docs/api/engine#entityref) `\| null>>` |  |  | The thing worn in each slot, by body (`'player'` or a protagonist such as `'character:sam'`) and then by slot id. |

### WardrobeView

Type. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#wardrobeview).

The wardrobe of whoever the player is playing as the player sees it, in `view.plugins.wardrobe`.

```ts shape
import type { WardrobeView } from '@ifloom/plugin-wardrobe'
type WardrobeView = {
  slots: { id: string; label: string; entity: EntityRef | null; name: string | null; takeOff: RenderedChoice | null }[]
  spare: { entity: EntityRef; name: string; slot: string; wear: RenderedChoice }[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `slots` | `{ id: string; label: string; entity:` [`EntityRef`](/docs/api/engine#entityref) `\| null; name: string \| null; takeOff:…` |  |  | The game's slots in order, each with the thing in it. |
| `spare` | `{ entity:` [`EntityRef`](/docs/api/engine#entityref)`; name: string; slot: string; wear:` [`RenderedChoice`](/docs/api/engine#renderedchoice) `}[]` |  |  | The wearable things the player holds and isn't wearing, in the order of the game's entities. Each has its slot and the button that puts it on, labelled with the `wardrobe/wear` string (`Wear {thing}`). |

### Wearable

Type. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#wearable).

The data of the `wardrobe/wearable` trait, which makes a thing wearable in one slot.

```ts shape
import type { Wearable } from '@ifloom/plugin-wardrobe'
type Wearable = {
  slot: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `slot` | `string` |  |  | The id of the slot the thing goes in, such as `'coat'`. |

### wearableOf

Function. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#wearableof).

Returns a thing's `wardrobe/wearable` trait, read through the entity it was made `like`. Returns undefined for a thing that can't be worn.

```ts shape
import { wearableOf } from '@ifloom/plugin-wardrobe'
function wearableOf(state: GameState, game: Game, ref: string): Wearable | undefined
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`Wearable`](#wearable).

## @ifloom/plugin-wardrobe/react

- Components: [`WardrobeSection`](#wardrobesection)
- Functions: [`useWardrobe`](#usewardrobe)
- Constants: [`WARDROBE_WORDS`](#wardrobe_words), [`WardrobeCard`](#wardrobecard), [`wardrobeUi`](#wardrobeui)
- Types: [`WardrobeControls`](#wardrobecontrols), [`WardrobeSlotControls`](#wardrobeslotcontrols)

### useWardrobe

Function. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#usewardrobe).

Returns the wardrobe plugin's view and commands from the running game, or null in a game without the plugin. It re-renders when the view changes.

```ts shape
import { useWardrobe } from '@ifloom/plugin-wardrobe/react'
function useWardrobe(): WardrobeControls | null
```

Uses: [`WardrobeControls`](#wardrobecontrols).

### WARDROBE_WORDS

Const. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#wardrobe_words).

The wardrobe plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings.

```ts shape
import { WARDROBE_WORDS } from '@ifloom/plugin-wardrobe/react'
const WARDROBE_WORDS: { readonly nothingOn: 'Nothing'; readonly wardrobe: 'Wearing'; }
```

### WardrobeCard

Const. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#wardrobecard).

Renders what the player has on from `view.plugins.wardrobe`, slot by slot, with the other things they could wear.
It renders nothing without the plugin.

A button that can't be used now is disabled with the engine's reason.

A preset can style the parts `wardrobe`, `wardrobe-title`, `wardrobe-slot`, `wardrobe-slot-name` and `wardrobe-worn`.

```ts shape
import { WardrobeCard } from '@ifloom/plugin-wardrobe/react'
const WardrobeCard: ComponentType<{ className?: string; title?: string | false; }>
```

### WardrobeControls

Type. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#wardrobecontrols).

The wardrobe plugin's view, slot by slot with its buttons, and functions that send its commands, as `useWardrobe` returns it.

```ts shape
import type { WardrobeControls } from '@ifloom/plugin-wardrobe/react'
type WardrobeControls = {
  spare: { entity: EntityRef; name: string; slot: string; wear: RenderedChoice }[]
  slots: WardrobeSlotControls[]
  wear: (entity: EntityRef) => Result<GameState>
  takeOff: (slot: string) => Result<GameState>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `spare` | `{ entity:` [`EntityRef`](/docs/api/engine#entityref)`; name: string; slot: string; wear:` [`RenderedChoice`](/docs/api/engine#renderedchoice) `}[]` |  |  | The wearable things the player holds and isn't wearing, in the order of the game's entities. Each has its slot and the button that puts it on, labelled with the `wardrobe/wear` string (`Wear {thing}`). |
| `slots` | [`WardrobeSlotControls[]`](#wardrobeslotcontrols) |  |  | The game's slots in order, each with the thing in it and its buttons. |
| `wear` | `(entity:` [`EntityRef`](/docs/api/engine#entityref)`) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends `wardrobe/wear` for a thing the player holds, by its reference, such as `'clothing:scarf'`. |
| `takeOff` | `(slot: string) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends `wardrobe/takeOff`, which empties the slot with this id. |

### WardrobeSection

Component. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#wardrobesection).

Renders a Wearing section that folds, holding the `WardrobeCard`. `wardrobeUi` doesn't place it, so put it in your
layout's `<Sidebar>` to keep what the player wears on screen.

```ts shape
import { WardrobeSection } from '@ifloom/plugin-wardrobe/react'
function WardrobeSection(): JSX.Element
```

### WardrobeSlotControls

Type. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#wardrobeslotcontrols).

A slot as `useWardrobe` returns it, with the thing in it and the buttons that take it off or put another thing on.

```ts shape
import type { WardrobeSlotControls } from '@ifloom/plugin-wardrobe/react'
type WardrobeSlotControls = {
  id: string
  label: string
  entity: EntityRef | null
  name: string | null
  takeOff: RenderedChoice | null
  wear: RenderedChoice[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The slot's id. |
| `label` | `string` |  |  | The slot's label. |
| `entity` | [`EntityRef`](/docs/api/engine#entityref) `\| null` |  |  | The thing in the slot, or null while the slot is empty. |
| `name` | `string \| null` |  |  | The name of the thing in the slot, or null while the slot is empty. |
| `takeOff` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that takes the thing off, labelled with the `wardrobe/takeOff` string, or null while the slot is empty. |
| `wear` | [`RenderedChoice[]`](/docs/api/engine#renderedchoice) |  |  | The `wear` buttons of the spare things for this slot, from the view's `spare`. |

### wardrobeUi

Const. Explained in [Wardrobe](/docs/reference/plugins/wardrobe#wardrobeui).

The wardrobe plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders the `wardrobe` panel,
which a closet's button or any `{ panel: 'wardrobe' }` opens, as a `WardrobeCard`, and adds the plugin's words.

It adds nothing to the sidebar, where a layout can place `WardrobeSection`.

```ts shape
import { wardrobeUi } from '@ifloom/plugin-wardrobe/react'
const wardrobeUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).
