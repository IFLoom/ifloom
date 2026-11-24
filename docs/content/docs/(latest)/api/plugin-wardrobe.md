---
title: "@ifloom/plugin-wardrobe"
description: "Every export of @ifloom/plugin-wardrobe and its /react subpath, if it has one: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-wardrobe` and `@ifloom/plugin-wardrobe/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-wardrobe

- Functions: [`slotsOf`](#slotsof), [`wardrobe`](#wardrobe), [`wearableOf`](#wearableof)
- Types: [`Closet`](#closet), [`WardrobeSlot`](#wardrobeslot), [`WardrobeState`](#wardrobestate), [`WardrobeView`](#wardrobeview), [`Wearable`](#wearable)

### Closet

Type. Explained in [Wardrobe](/docs/plugins/wardrobe#closet).

What the `wardrobe/closet` trait holds: a place where the player can
change. The place gets a button that opens the `wardrobe` panel.

```ts shape
import type { Closet } from '@ifloom/plugin-wardrobe'
type Closet = {
  label?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `label` | `string` | yes |  | The button's words. The `wardrobe/open` string (`Wardrobe`) if left out. |

### slotsOf

Function. Explained in [Wardrobe](/docs/plugins/wardrobe#slotsof).

The game's slots, in the order the UI lists them: `data.wardrobe.slots`, from its content and packs.

```ts shape
import { slotsOf } from '@ifloom/plugin-wardrobe'
function slotsOf(game: Game): WardrobeSlot[]
```

### wardrobe

Function. Explained in [Wardrobe](/docs/plugins/wardrobe#wardrobe).

The plugin, with its helpers on it: `wardrobe()` makes the plugin for the
game's `plugins`, and content is written with `wardrobe.wearable('coat')` and `wardrobe.wear('clothing:scarf')`.

```ts shape
import { wardrobe } from '@ifloom/plugin-wardrobe'
function wardrobe(): DefinedPlugin<WardrobeState, WardrobeView>
```

| Helper | Signature | Description |
|---|---|---|
| `wardrobe.wearable` | `(slot: string): { 'wardrobe/wearable': Wearable }` |  |
| `wardrobe.closet` | `(options?: Closet): { 'wardrobe/closet': Closet }` |  |
| `wardrobe.wearing` | `(entity: EntityRef, slot?: string): Condition` |  |
| `wardrobe.slotFilled` | `(slot: string): Condition` |  |
| `wardrobe.wear` | `(entity: EntityRef): CommandRef` |  |
| `wardrobe.takeOff` | `(slot: string): CommandRef` |  |

### WardrobeSlot

Type. Explained in [Wardrobe](/docs/plugins/wardrobe#wardrobeslot).

A place on the body something can be worn.

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
| `id` | `string` |  |  |  |
| `label` | `string` |  |  |  |
| `start` | `EntityRef` | yes |  | What you have on in it at the start: a wearable thing the player starts holding. Nothing if left out. |

### WardrobeState

Type. Explained in [Wardrobe](/docs/plugins/wardrobe#wardrobestate).

What the plugin keeps in a save: what each body has on, by who wears it
(`'player'`, or a protagonist such as `'character:sam'`), then by slot.

```ts shape
import type { WardrobeState } from '@ifloom/plugin-wardrobe'
type WardrobeState = {
  worn: Record<string, Record<string, EntityRef | null>>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `worn` | `Record<string, Record<string, EntityRef \| null>>` |  |  |  |

### WardrobeView

Type. Explained in [Wardrobe](/docs/plugins/wardrobe#wardrobeview).

```ts shape
import type { WardrobeView } from '@ifloom/plugin-wardrobe'
type WardrobeView = {
  slots: { id: string; label: string; entity: EntityRef | null; name: string | null; takeOff: RenderedChoice | null }[]
  spare: { entity: EntityRef; name: string; slot: string; wear: RenderedChoice }[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `slots` | `{ id: string; label: string; entity: EntityRef \| null; name: string \| null; takeOff: Rend…` |  |  | Every slot, in order, with what is in it on whoever the player is playing now, and the button that takes it off (labelled with the `wardrobe/takeOff` string, `Take off`), or null while it's empty. |
| `spare` | `{ entity: EntityRef; name: string; slot: string; wear: RenderedChoice }[]` |  |  | Wearable things you hold and aren't wearing, in the game's order of its entities, each with the button that puts it on (labelled with the `wardrobe/wear` string, `Wear {thing}`). |

### Wearable

Type. Explained in [Wardrobe](/docs/plugins/wardrobe#wearable).

What the `wardrobe/wearable` trait holds: the slot a thing is worn in.

```ts shape
import type { Wearable } from '@ifloom/plugin-wardrobe'
type Wearable = {
  slot: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `slot` | `string` |  |  | The slot it goes in, by id: `'coat'`. |

### wearableOf

Function. Explained in [Wardrobe](/docs/plugins/wardrobe#wearableof).

The slot a thing is worn in, if it can be worn: its `wardrobe/wearable` trait, read through what it was made `like`.

```ts shape
import { wearableOf } from '@ifloom/plugin-wardrobe'
function wearableOf(state: GameState, game: Game, ref: string): Wearable | undefined
```

## @ifloom/plugin-wardrobe/react

- Components: [`WardrobeSection`](#wardrobesection)
- Functions: [`useWardrobe`](#usewardrobe)
- Constants: [`WARDROBE_WORDS`](#wardrobe_words), [`WardrobeCard`](#wardrobecard), [`wardrobeUi`](#wardrobeui)
- Types: [`WardrobeControls`](#wardrobecontrols), [`WardrobeSlotControls`](#wardrobeslotcontrols)

### useWardrobe

Function. Explained in [Wardrobe](/docs/plugins/wardrobe#usewardrobe).

The wardrobe plugin's view with its buttons and commands, or null in a game without the plugin. `WardrobeCard` is drawn from it.

```ts shape
import { useWardrobe } from '@ifloom/plugin-wardrobe/react'
function useWardrobe(): WardrobeControls | null
```

### WARDROBE_WORDS

Const.

The wardrobe plugin's words, in English. A game rewords any with `ui.<key>` in its strings.

```ts shape
import { WARDROBE_WORDS } from '@ifloom/plugin-wardrobe/react'
const WARDROBE_WORDS: { readonly nothingOn: 'Nothing'; readonly wardrobe: 'Wearing'; }
```

### WardrobeCard

Const. Explained in [Wardrobe](/docs/plugins/wardrobe#wardrobecard).

What the player has on, slot by slot, with what else they could wear. Each
button is greyed out with the engine's own reason when it can't be done.
Draws nothing in a game without the wardrobe plugin. A thin default on
`useWardrobe`.

```ts shape
import { WardrobeCard } from '@ifloom/plugin-wardrobe/react'
const WardrobeCard: ComponentType<{ className?: string; title?: string | false; }>
```

### WardrobeControls

Type.

What `useWardrobe` returns: the wardrobe plugin's view, slot by slot with its buttons, and its commands.

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
| `spare` | `{ entity: EntityRef; name: string; slot: string; wear: RenderedChoice }[]` |  |  | Wearable things you hold and aren't wearing, in the game's order of its entities, each with the button that puts it on (labelled with the `wardrobe/wear` string, `Wear {thing}`). |
| `slots` | `WardrobeSlotControls[]` |  |  | Every slot, in order, with what is in it and its buttons. |
| `wear` | `(entity: EntityRef) => Result<GameState>` |  |  | Put on a thing you hold, by its reference (`'clothing:scarf'`): sends `wardrobe/wear`. |
| `takeOff` | `(slot: string) => Result<GameState>` |  |  | Empty a slot by its id: sends `wardrobe/takeOff`. |

### WardrobeSection

Component. Explained in [Wardrobe](/docs/plugins/wardrobe#wardrobesection).

A Wearing section for the side column: the `WardrobeCard`, folding in
place. `wardrobeUi` doesn't put it anywhere; place it in your layout's
`<Sidebar>` to keep what the player wears in view.

```ts shape
import { WardrobeSection } from '@ifloom/plugin-wardrobe/react'
function WardrobeSection(): JSX.Element
```

### WardrobeSlotControls

Type.

A wardrobe slot as `useWardrobe` gives it: what's in it, and the view's buttons to take it off or put something else on.

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
| `id` | `string` |  |  |  |
| `label` | `string` |  |  |  |
| `entity` | `EntityRef \| null` |  |  |  |
| `name` | `string \| null` |  |  |  |
| `takeOff` | `RenderedChoice \| null` |  |  |  |
| `wear` | `RenderedChoice[]` |  |  | The `wear` button of each spare thing for this slot, from the view's `spare`. |

### wardrobeUi

Const. Explained in [Wardrobe](/docs/plugins/wardrobe#wardrobeui).

The wardrobe plugin's React UI, for `plugins` on `mountGame` or
`GameProvider`: the `wardrobe` panel with the `WardrobeCard`, opened by a
closet place's button or any `{ panel: 'wardrobe' }`, and the wardrobe's
words. It adds nothing to the side column; a layout can place
`WardrobeSection` there.

```ts shape
import { wardrobeUi } from '@ifloom/plugin-wardrobe/react'
const wardrobeUi: PluginUi
```
