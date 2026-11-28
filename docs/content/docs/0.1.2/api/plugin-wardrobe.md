---
title: "@ifloom/plugin-wardrobe"
description: "Every export of @ifloom/plugin-wardrobe and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-wardrobe` and `@ifloom/plugin-wardrobe/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-wardrobe

- Functions: [`ownedHere`](#ownedhere), [`slotsOf`](#slotsof), [`wardrobe`](#wardrobe), [`wearableOf`](#wearableof)
- Types: [`Closet`](#closet), [`Owners`](#owners), [`WardrobeOptions`](#wardrobeoptions), [`WardrobeSlot`](#wardrobeslot), [`WardrobeState`](#wardrobestate), [`WardrobeView`](#wardrobeview), [`Wearable`](#wearable)

### Closet

Type. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#closet).

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

### ownedHere

Function. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#ownedhere).

Returns how many of a thing a body (`'you'` if left out) has in its wardrobe, its starts read from `wardrobe/owned`.

```ts shape
import { ownedHere } from '@ifloom/plugin-wardrobe'
function ownedHere(state: GameState, game: Game, ref: string, at?: string): number
```

Uses: [`GameState`](/docs/0.1.2/api/engine#gamestate), [`Game`](/docs/0.1.2/api/engine#game).

### Owners

Type. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#owners).

The bodies that own a thing at the start, one body for one of it or a count for each body (`{ player: 1, 'character:sam': 1 }`).

```ts shape
import type { Owners } from '@ifloom/plugin-wardrobe'
type Owners = EntityRef | typeof PLAYER | Partial<Record<EntityRef | typeof PLAYER, number>>
```

Uses: [`EntityRef`](/docs/0.1.2/api/engine#entityref).

### slotsOf

Function. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#slotsof).

Returns the game's slots in order, from `data.wardrobe.slots` in its content and packs.

```ts shape
import { slotsOf } from '@ifloom/plugin-wardrobe'
function slotsOf(game: Game): WardrobeSlot[]
```

Uses: [`Game`](/docs/0.1.2/api/engine#game), [`WardrobeSlot`](#wardrobeslot).

### wardrobe

Function. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#wardrobe).

The wardrobe plugin's factory, with its helpers as properties. `wardrobe()` returns the plugin for the game's
`plugins`, and content calls helpers such as `wardrobe.wearable('coat')` and `wardrobe.wear('clothing:scarf')`.

```ts shape
import { wardrobe } from '@ifloom/plugin-wardrobe'
function wardrobe(options?: WardrobeOptions): DefinedPlugin<WardrobeState, WardrobeView>
```

Uses: [`WardrobeOptions`](#wardrobeoptions), [`DefinedPlugin`](/docs/0.1.2/api/engine-plugin#definedplugin), [`WardrobeState`](#wardrobestate), [`WardrobeView`](#wardrobeview).

| Helper | Signature | Description |
|---|---|---|
| `wardrobe.wearable` | `(slot: string, hooks?: { onWear?:` [`EffectRef[]`](/docs/0.1.2/api/engine#effectref)`; onTakeOff?:` [`EffectRef[]`](/docs/0.1.2/api/engine#effectref) `}): { 'wardrobe/wearable':` [`Wearable`](#wearable) `}` | Returns the `wardrobe/wearable` trait for a slot, with its `onWear` and `onTakeOff` effects, to spread into `traits`. |
| `wardrobe.owned` | `(owners:` [`Owners`](#owners)`): { 'wardrobe/owned':` [`Owners`](#owners) `}` | Returns the `wardrobe/owned` trait, to spread into an entity's `traits`, naming whose wardrobe it starts in. |
| `wardrobe.closet` | `(options?:` [`Closet`](#closet)`): { 'wardrobe/closet':` [`Closet`](#closet) `}` | Returns the `wardrobe/closet` trait, to spread into a location's `traits`, which offers a button that opens the `wardrobe` panel. |
| `wardrobe.wearing` | `(entity:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`, slot?: string):` [`Condition`](/docs/0.1.2/api/engine#condition) | Returns the `wardrobe/wearing` condition, which holds while whoever the player is playing wears the thing, in `slot` if given. |
| `wardrobe.slotFilled` | `(slot: string):` [`Condition`](/docs/0.1.2/api/engine#condition) | Returns the `wardrobe/wearing` condition for a slot, which holds while whoever the player is playing has something in it. |
| `wardrobe.wear` | `(entity:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`):` [`CommandRef`](/docs/0.1.2/api/engine#commandref) | Returns the `wardrobe/wear` command, which puts on a thing the player owns. |
| `wardrobe.takeOff` | `(slot: string):` [`CommandRef`](/docs/0.1.2/api/engine#commandref) | Returns the `wardrobe/takeOff` command, which takes off whatever is in the slot. |
| `wardrobe.store` | `(entity:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`, options?: { at?:` [`Someone`](/docs/0.1.2/api/engine#someone)`; by?: number; via?: string }):` [`EffectRef`](/docs/0.1.2/api/engine#effectref) | Returns the `wardrobe/store` effect, which puts a thing someone carries away in their wardrobe. |
| `wardrobe.takeOut` | `(entity:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`, options?: { at?:` [`Someone`](/docs/0.1.2/api/engine#someone)`; by?: number; via?: string }):` [`EffectRef`](/docs/0.1.2/api/engine#effectref) | Returns the `wardrobe/takeOut` effect, which takes a thing out of someone's wardrobe into the next receiver. |

### WardrobeOptions

Type. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#wardrobeoptions).

The wardrobe plugin's settings, which the game passes to `wardrobe()`.

```ts shape
import type { WardrobeOptions } from '@ifloom/plugin-wardrobe'
type WardrobeOptions = {
  claims?: boolean
  onWear?: EffectRef[]
  onTakeOff?: EffectRef[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `claims` | `boolean` | yes |  | False for a game where clothes are carried before they're put away. True if left out. With it false, the wardrobe claims nothing a `receive` gives, so wearables go to the next receiver, and `wardrobe/store` puts them away by name. |
| `onWear` | [`EffectRef[]`](/docs/0.1.2/api/engine#effectref) | yes |  | Effects that run when a body puts on anything, after the thing's own `onWear`. |
| `onTakeOff` | [`EffectRef[]`](/docs/0.1.2/api/engine#effectref) | yes |  | Effects that run when a body takes off anything, after the thing's own `onTakeOff`. |

### WardrobeSlot

Type. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#wardrobeslot).

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
| `start` | [`EntityRef`](/docs/0.1.2/api/engine#entityref) | yes |  | The wearable thing in the slot at the start, one the player owns at the start. The slot starts empty if left out. |

### WardrobeState

Type. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#wardrobestate).

The clothes a save keeps for each body. The plugin reads slots and wearable things from content.

```ts shape
import type { WardrobeState } from '@ifloom/plugin-wardrobe'
type WardrobeState = {
  worn: Record<string, Record<string, EntityRef | null>>
  owned: Record<string, Record<string, number>>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `worn` | `Record<string, Record<string,` [`EntityRef`](/docs/0.1.2/api/engine#entityref) `\| null>>` |  |  | The thing worn in each slot, by body (`'player'` or a protagonist such as `'character:sam'`) and then by slot id. |
| `owned` | `Record<string, Record<string, number>>` |  |  | The counts of clothes in each body's wardrobe that play changed, by body and then thing. A count written once is kept, 0 included. For the rest, the plugin reads each thing's `wardrobe/owned` trait. |

### WardrobeView

Type. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#wardrobeview).

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
| `slots` | `{ id: string; label: string; entity:` [`EntityRef`](/docs/0.1.2/api/engine#entityref) `\| null; name: string \| null; takeOff:…` |  |  | The game's slots in order, each with the thing in it. |
| `spare` | `{ entity:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`; name: string; slot: string; wear:` [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice) `}[]` |  |  | The wearable things whoever is played owns and isn't wearing, in the order of the game's entities. Each has its slot and the button that puts it on, labelled with the `wardrobe/wear` string (`Wear {thing}`). |

### Wearable

Type. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#wearable).

The data of the `wardrobe/wearable` trait, which makes a thing wearable in one slot.

```ts shape
import type { Wearable } from '@ifloom/plugin-wardrobe'
type Wearable = {
  slot: string
  onWear?: EffectRef[]
  onTakeOff?: EffectRef[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `slot` | `string` |  |  | The id of the slot the thing goes in, such as `'coat'`. |
| `onWear` | [`EffectRef[]`](/docs/0.1.2/api/engine#effectref) | yes |  | Effects that run when a body puts the thing on, such as `[{ kv: 'onDuty', to: true }]`, before the game-wide ones. |
| `onTakeOff` | [`EffectRef[]`](/docs/0.1.2/api/engine#effectref) | yes |  | Effects that run when a body takes the thing off, or it comes off by itself, before the game-wide ones. |

### wearableOf

Function. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#wearableof).

Returns a thing's `wardrobe/wearable` trait, read through the entity it was made `like`. Returns undefined for a thing that can't be worn.

```ts shape
import { wearableOf } from '@ifloom/plugin-wardrobe'
function wearableOf(state: GameState, game: Game, ref: string): Wearable | undefined
```

Uses: [`GameState`](/docs/0.1.2/api/engine#gamestate), [`Game`](/docs/0.1.2/api/engine#game), [`Wearable`](#wearable).

## @ifloom/plugin-wardrobe/react

- Components: [`WardrobeSection`](#wardrobesection)
- Functions: [`useWardrobe`](#usewardrobe)
- Constants: [`WARDROBE_WORDS`](#wardrobe_words), [`WardrobeCard`](#wardrobecard), [`wardrobeUi`](#wardrobeui)
- Types: [`WardrobeControls`](#wardrobecontrols), [`WardrobeSlotControls`](#wardrobeslotcontrols)

### useWardrobe

Function. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#usewardrobe).

Returns the wardrobe plugin's view and commands from the running game, or null in a game without the plugin. It re-renders when the view changes.

```ts shape
import { useWardrobe } from '@ifloom/plugin-wardrobe/react'
function useWardrobe(): WardrobeControls | null
```

Uses: [`WardrobeControls`](#wardrobecontrols).

### WARDROBE_WORDS

Const. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#wardrobe_words).

The wardrobe plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings.

```ts shape
import { WARDROBE_WORDS } from '@ifloom/plugin-wardrobe/react'
const WARDROBE_WORDS: { readonly nothingOn: 'Nothing'; readonly wardrobe: 'Wearing'; }
```

### WardrobeCard

Const. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#wardrobecard).

Renders what the player has on from `view.plugins.wardrobe`, slot by slot, with the other things they could wear.
It renders nothing without the plugin.

A button that can't be used now is disabled with the engine's reason.

A preset can style the parts `wardrobe`, `wardrobe-title`, `wardrobe-slot`, `wardrobe-slot-name` and `wardrobe-worn`.

```ts shape
import { WardrobeCard } from '@ifloom/plugin-wardrobe/react'
const WardrobeCard: ComponentType<{ className?: string; title?: string | false; }>
```

### WardrobeControls

Type. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#wardrobecontrols).

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
| `spare` | `{ entity:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`; name: string; slot: string; wear:` [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice) `}[]` |  |  | The wearable things whoever is played owns and isn't wearing, in the order of the game's entities. Each has its slot and the button that puts it on, labelled with the `wardrobe/wear` string (`Wear {thing}`). |
| `slots` | [`WardrobeSlotControls[]`](#wardrobeslotcontrols) |  |  | The game's slots in order, each with the thing in it and its buttons. |
| `wear` | `(entity:` [`EntityRef`](/docs/0.1.2/api/engine#entityref)`) =>` [`Result`](/docs/0.1.2/api/engine#result)`<`[`GameState`](/docs/0.1.2/api/engine#gamestate)`>` |  |  | Sends `wardrobe/wear` for a thing the player holds, by its reference, such as `'clothing:scarf'`. |
| `takeOff` | `(slot: string) =>` [`Result`](/docs/0.1.2/api/engine#result)`<`[`GameState`](/docs/0.1.2/api/engine#gamestate)`>` |  |  | Sends `wardrobe/takeOff`, which empties the slot with this id. |

### WardrobeSection

Component. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#wardrobesection).

Renders a Wearing section that folds, holding the `WardrobeCard`. `wardrobeUi` doesn't place it, so put it in your
layout's `<Sidebar>` to keep what the player wears on screen.

```ts shape
import { WardrobeSection } from '@ifloom/plugin-wardrobe/react'
function WardrobeSection(): JSX.Element
```

### WardrobeSlotControls

Type. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#wardrobeslotcontrols).

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
| `entity` | [`EntityRef`](/docs/0.1.2/api/engine#entityref) `\| null` |  |  | The thing in the slot, or null while the slot is empty. |
| `name` | `string \| null` |  |  | The name of the thing in the slot, or null while the slot is empty. |
| `takeOff` | [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice) `\| null` |  |  | The button that takes the thing off, labelled with the `wardrobe/takeOff` string, or null while the slot is empty. |
| `wear` | [`RenderedChoice[]`](/docs/0.1.2/api/engine#renderedchoice) |  |  | The `wear` buttons of the spare things for this slot, from the view's `spare`. |

### wardrobeUi

Const. Explained in [Wardrobe](/docs/0.1.2/reference/plugins/wardrobe#wardrobeui).

The wardrobe plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders the `wardrobe` panel,
which a closet's button or any `{ panel: 'wardrobe' }` opens, as a `WardrobeCard`, and adds the plugin's words.

It adds nothing to the sidebar, where a layout can place `WardrobeSection`.

```ts shape
import { wardrobeUi } from '@ifloom/plugin-wardrobe/react'
const wardrobeUi: PluginUi
```

Uses: [`PluginUi`](/docs/0.1.2/api/react-kit#pluginui).
