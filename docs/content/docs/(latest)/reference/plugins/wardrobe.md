---
title: "Wardrobe"
description: "Reference for @ifloom/plugin-wardrobe: slots, the wearable and closet traits, what each body has on, the wearing condition, the wear and takeOff commands, state, view, React UI, helpers, checks and strings."
---
`@ifloom/plugin-wardrobe` keeps track of what the player has on. The game declares the slots, such as a coat and a scarf, and anything the player can wear is a [thing](/docs/reference/glossary#thing) with the `wardrobe/wearable` [trait](/docs/reference/glossary#trait), which names its slot. The player wears only what they hold, and wearing a thing leaves the count held as it was. The plugin keeps what's worn for each body, the player's and each protagonist's the [`you`](/docs/reference/effects#you) effect switches to. The wardrobe needs no other plugin, and it cooperates with [places](/docs/reference/plugins/places) for a location where the player changes. [Entities, things and traits](/docs/explanation/entities-and-traits#traits-give-entities-meaning) explains traits, [Add a plugin](/docs/how-to/add-a-plugin) installs it, and [Let the player get dressed](/docs/how-to/dress-the-player) builds a wardrobe with it.

In the showcase: `examples/showcase/src/world/things.ts`, which declares the raincoat, the scarf and the coat and neck slots. The flat in `examples/showcase/src/story/flat.ts` is a closet, and the café's body in `examples/showcase/src/story/cafe.ts` reads `wardrobe.wearing('clothing:raincoat')`.

```ts
import { wardrobe, slotsOf, wearableOf, type Closet, type Wearable, type WardrobeSlot, type WardrobeState, type WardrobeView } from '@ifloom/plugin-wardrobe'
```

## wardrobe

The plugin's factory, which returns the plugin with the id `wardrobe`. It takes no options, because the slots and the wearable things are content a mod can change. Every field of its result is in [`wardrobe`](/docs/api/plugin-wardrobe#wardrobe), and its helpers are listed under [Functions](#functions).

A new game dresses the player from each slot's `start`. Putting a thing on takes off whatever was in its slot, and the thing taken off stays held. After each command that goes through, the plugin's [`onCommand`](/docs/reference/plugin-api#oncommand) hook takes off each thing a body no longer holds, whether it was sold, used up, given away or taken by an effect.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { wardrobe } from '@ifloom/plugin-wardrobe'

declare const town: Content

export const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [places({ start: 'flat' }), wardrobe()] })
```

## Content

### WardrobeSlot

A slot the game declares in `data.wardrobe.slots`, a part of the body where a thing is worn. Every field is in [`WardrobeSlot`](/docs/api/plugin-wardrobe#wardrobeslot).

The loader merges slots by id, so a mod adds a slot, and the view lists them in order. `label` is the word the player reads. `start` is the thing the player wears in the slot in a new game, and the slot starts empty if it's left out. The player must start holding that thing, so it needs `at: 'player'` or a count for the player.

```ts
import type { Content } from '@ifloom/engine'
import { wardrobe } from '@ifloom/plugin-wardrobe'

export const town: Content = {
  kinds: [{ id: 'clothing', label: 'Clothing', unique: true, listed: false }],
  entities: [
    { id: 'raincoat', of: 'clothing', name: 'raincoat', description: 'Yellow, a size too big.', at: 'player', traits: { ...wardrobe.wearable('coat') } },
    { id: 'scarf', of: 'clothing', name: 'scarf', description: 'Knitted by someone who loved you.', traits: { ...wardrobe.wearable('neck') } },
  ],
  data: {
    wardrobe: {
      slots: [
        { id: 'coat', label: 'Coat', start: 'clothing:raincoat' },
        { id: 'neck', label: 'Neck' },
      ],
    },
  },
}
```

The clothing kind is [`unique`](/docs/reference/entities#unique) because each coat is one particular coat. A stackable kind works too, for three identical socks.

## Traits

### Wearable

The data of the `wardrobe/wearable` trait, which makes a thing wearable in one slot. Every field is in [`Wearable`](/docs/api/plugin-wardrobe#wearable).

`wardrobe.wearable(slot)` writes the trait, to spread into `traits` beside other plugins' traits, such as the [shop](/docs/reference/plugins/shop)'s `sellable`. The trait goes on a kind as a default, on an entity, or in content's [`traits`](/docs/reference/content#traits) table, where a mod can move a thing to another slot. A thing made in play `like` a wearable one is wearable too.

### Closet

The data of the `wardrobe/closet` trait, which makes a location somewhere the player changes clothes. Every field is in [`Closet`](/docs/api/plugin-wardrobe#closet).

While the player is at a location with the trait, the plugin's [`actions`](/docs/reference/plugin-views#actions) provider offers a button with the id `open` and the command `{ type: 'action', id: 'wardrobe/open' }`, which opens the `wardrobe` [panel](/docs/reference/panels) with `{ panel: 'wardrobe' }`. The button's label is the trait's `label`, or the `wardrobe/open` string (`Wardrobe`) if left out. Any choice or action can open the same panel with `{ panel: 'wardrobe' }`. The plugin finds the location through the `places/holder` query, so the trait does nothing in a game without places.

```ts
import { places } from '@ifloom/plugin-places'
import { wardrobe } from '@ifloom/plugin-wardrobe'

export const flat = places.location({
  id: 'flat',
  name: 'Your flat',
  description: 'Home',
  exits: ['high-street'],
  body: [{ text: 'A sofa, a radiator that knocks, and a coat rack by the door.' }],
  traits: { ...wardrobe.closet({ label: 'Open the wardrobe' }) },
})
```

## Conditions

### wardrobe/wearing

Holds while a thing is on, or while a slot has something in it. It's a [plugin call](/docs/reference/custom#plugincall), and works anywhere a condition goes, such as a block's `when`, a choice, a `blocked` entry or a lock.

| Kind | Meaning |
|---|---|
| `{ entity }` | Holds while the thing is on, in any slot the game declares. `wardrobe.wearing(entity)` writes it. |
| `{ entity, slot }` | Holds while that thing is in that slot. `wardrobe.wearing(entity, slot)` writes it. |
| `{ slot }` | Holds while something is in that slot. `wardrobe.slotFilled(slot)` writes it. |
| `{ entity, at }` | Holds while the thing is on `at`'s body, `'player'` or a protagonist such as `'character:sam'`, whoever is played. It has no helper. |

Without `at`, it asks about whoever the player is playing now, [`'you'`](/docs/reference/glossary#you). With neither `entity` nor `slot` it's false, and so is an unknown thing or a slot the save has nothing in. To ask whether the player holds a thing, worn or not, use the engine's [`holding`](/docs/reference/entities#give-take-move-and-holding).

```ts fragment
{ 'wardrobe/wearing': { entity: 'clothing:scarf' } } // wardrobe.wearing('clothing:scarf')
```

## Commands

Both commands act on whoever the player is playing now, and both go through [locks](/docs/reference/locks), which name them `wardrobe/wear` and `wardrobe/takeOff`, or both as `wardrobe/*`. Neither checks where the player is or what's on screen, so both work with a scene open and at any location.

### wardrobe/wear

Puts the thing `id` on, in its slot, in place of whatever was there. The plugin refuses it in this order:

1. With `There is no such thing.` ([`noSuchThing`](/docs/reference/strings#refusals)) when the thing isn't in the game.
2. With `The <name> is not something you wear.` (`wardrobe/notClothing`) when it has no `wardrobe/wearable` trait.
3. With `You are already wearing the <name>.` (`wardrobe/alreadyWearing`).
4. With `You have no <name>.` (`wardrobe/haveNone`) when the player doesn't hold it.

```ts fragment
{ 'wardrobe/wear': { id: 'clothing:scarf' } } // wardrobe.wear('clothing:scarf')
```

### wardrobe/takeOff

Empties the slot `id`. The plugin refuses it with `There is nothing to take off.` (`wardrobe/nothingToTakeOff`) when the save has nothing in that slot, which includes a slot the game doesn't have.

```ts fragment
{ 'wardrobe/takeOff': { id: 'coat' } } // wardrobe.takeOff('coat')
```

## State

### WardrobeState

The clothes a save keeps at `state.plugins.wardrobe`: for each body that has worn something, `'player'` or a protagonist's reference, the thing in each slot or `null`. Every field is in [`WardrobeState`](/docs/api/plugin-wardrobe#wardrobestate).

Each body keeps its own slots, and the view and `wardrobe/wearing` read the slots of whoever is played. A protagonist starts with nothing on until they put something on, whatever the slots' `start`, which is the player's. The `onCommand` hook checks every body, so giving the player's scarf to Sam takes it off the player even while Sam is played. A UI reads [`WardrobeView`](#wardrobeview) instead.

```ts
import { apply, applyEffects, holds, type Game, type GameState } from '@ifloom/engine'
import { wardrobe } from '@ifloom/plugin-wardrobe'

declare const game: Game
declare const state: GameState // the player in the raincoat, and Sam holding a scarf

const asSam = applyEffects(state, game, [{ you: 'character:sam' }])
const dressed = apply(asSam, game, wardrobe.wear('clothing:scarf')).state
holds(dressed, game, wardrobe.wearing('clothing:raincoat')) // false, because Sam isn't wearing it
const back = applyEffects(dressed, game, [{ you: 'player' }])
holds(back, game, wardrobe.wearing('clothing:raincoat')) // true
holds(back, game, { 'wardrobe/wearing': { entity: 'clothing:scarf', at: 'character:sam' } }) // true
```

## View

### WardrobeView

The wardrobe of whoever the player is playing, in `view.plugins.wardrobe`. Every field is in [`WardrobeView`](/docs/api/plugin-wardrobe#wardrobeview).

`slots` lists every slot the game declares, in order, with the thing in it and its name, both `null` for an empty slot. Each slot's `takeOff` is a [`RenderedChoice`](/docs/reference/view#renderedchoice) labelled with the `wardrobe/takeOff` string, or `null` for an empty slot. `spare` lists the wearable things the player holds and isn't wearing, in the game's order of its entities, each with its `slot` and a `wear` button labelled with the `wardrobe/wear` string. Each button carries the engine's refusal in `disabled` when it can't be pressed now, such as a lock's.

```ts fragment
{
  slots: [{ id: 'coat', label: 'Coat', entity: 'clothing:raincoat', name: 'raincoat', takeOff: { label: 'Take off', … } }, { id: 'neck', label: 'Neck', entity: null, name: null, takeOff: null }],
  spare: [{ entity: 'clothing:scarf', name: 'scarf', slot: 'neck', wear: { label: 'Wear scarf', … } }],
}
```

The things worn are in the engine's [`view.held`](/docs/reference/view#heldview) too, since the player still holds them. A UI that lists the bag without the clothes leaves out the references in `slots`.

[Render what the player wears](/docs/how-to/render/things-plugins#render-what-the-player-wears) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-wardrobe/react` subpath renders the wardrobe for a game that uses [`@ifloom/react`](/docs/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) adds it to a game.

### wardrobeUi

The plugin's [`PluginUi`](/docs/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It renders [`WardrobeCard`](#wardrobecard) as the `wardrobe` panel, in a dialog titled `ui.wardrobe`, which a closet's button or any `{ panel: 'wardrobe' }` opens. It adds nothing to the side column. Its type is in [`wardrobeUi`](/docs/api/plugin-wardrobe#wardrobeui).

### WARDROBE_WORDS

The words the wardrobe UI uses, by key, which a game rewords as `ui.<key>` in its strings as it does the React UI's own. Its value is in [`WARDROBE_WORDS`](/docs/api/plugin-wardrobe#wardrobe_words). The buttons use the plugin's own [strings](#strings).

| Key | Meaning |
|---|---|
| `ui.nothingOn` | `Nothing`, the line for an empty slot. |
| `ui.wardrobe` | `Wearing`, the title of the card, its dialog and its section. |

### WardrobeSection

Renders a folding [`Section`](/docs/reference/react/components#section) with the id `wardrobe` and the title `ui.wardrobe`, holding the `WardrobeCard`. Its type is in [`WardrobeSection`](/docs/api/plugin-wardrobe#wardrobesection).

`wardrobeUi` doesn't place it, so a layout puts it in its `Sidebar` to keep what the player wears on screen. A game with no closet location, no `{ panel: 'wardrobe' }` and no `WardrobeSection` gives the player no way to change. For a section that shows only at some locations, a layout puts its own `Section` with `when` round a `WardrobeCard`, as the showcase does.

::include[../../../../../snippets/react/wardrobe-sidebar.tsx]

### WardrobeCard

Renders `view.plugins.wardrobe`: each slot with its label and the thing in it or `ui.nothingOn`, the slot's **Take off** button while something is in it, and a **Wear …** button for each spare thing for that slot. Its props are in [`WardrobeCard`](/docs/api/plugin-wardrobe#wardrobecard).

A button that can't be pressed now is disabled, with [`whyNot`](/docs/reference/actions#whynot)'s reason in its `title`, shown on hover rather than printed. The heading is `ui.wardrobe`, or `title`, and `false` leaves it out. It renders nothing in a game without the plugin. A game replaces it as `WardrobeCard` in [`components`](/docs/reference/react/components#components). Its parts are `wardrobe`, `wardrobe-title`, `wardrobe-slot` (with `data-slot-id`, and `data-worn` holding the reference of the thing in it), `wardrobe-slot-name`, `wardrobe-worn` and `button`.

### useWardrobe

Returns the wardrobe view from the running game, slot by slot with its buttons, and a `wear` and a `takeOff` that send the commands, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`useWardrobe`](/docs/api/plugin-wardrobe#usewardrobe).

### WardrobeControls

The value `useWardrobe` returns: the view's `spare`, its `slots` as [`WardrobeSlotControls`](#wardrobeslotcontrols), and `wear(entity)` and `takeOff(slot)`. Every field is in [`WardrobeControls`](/docs/api/plugin-wardrobe#wardrobecontrols). Each function returns the runner's [`Result`](/docs/reference/common#result), so a refusal comes back with its reason.

### WardrobeSlotControls

One slot as `useWardrobe` returns it: the view's slot with `wear`, the `wear` buttons of the spare things for that slot. Every field is in [`WardrobeSlotControls`](/docs/api/plugin-wardrobe#wardrobeslotcontrols).

## Functions

The helpers are properties of `wardrobe` and write its traits and calls, typed:

- **`wardrobe.wearable(slot)`** returns the [`wardrobe/wearable`](#wearable) trait, and **`wardrobe.closet(options?)`** the [`wardrobe/closet`](#closet) trait, to spread into `traits`.
- **`wardrobe.wearing(entity, slot?)`** and **`wardrobe.slotFilled(slot)`** return the [`wardrobe/wearing`](#wardrobewearing) condition.
- **`wardrobe.wear(entity)`** and **`wardrobe.takeOff(slot)`** return the [commands](#commands) as a [`CommandRef`](/docs/reference/custom#commandref).

The bench by the river is too cold without a scarf:

```ts
import { need, type ActionDef } from '@ifloom/engine'
import { wardrobe } from '@ifloom/plugin-wardrobe'

export const bench: ActionDef = {
  id: 'bench',
  label: 'Sit on the bench by the river',
  blocked: [need('Too cold without a scarf.', wardrobe.wearing('clothing:scarf'))],
  effects: [{ stat: 'energy', by: 5 }],
}
```

### slotsOf

Returns the game's slots from `data.wardrobe.slots`, merged from its content and packs, in order. Its signature is in [`slotsOf`](/docs/api/plugin-wardrobe#slotsof).

### wearableOf

Returns the thing's `wardrobe/wearable` trait, read through the thing it was made `like`, or `undefined` for a thing that can't be worn. Its signature is in [`wearableOf`](/docs/api/plugin-wardrobe#wearableof).

```ts given
import { wearableOf } from '@ifloom/plugin-wardrobe'

wearableOf(state, game, 'clothing:scarf')?.slot // 'neck'
```

## Checks

When the game loads, the plugin reports problems with each slot and each trait against the content or pack that brought it:

| Problem | Cause |
|---|---|
| `trait wardrobe/wearable on clothing:gloves · unknown slot "hands"` | A wearable thing names a slot the game doesn't have. |
| `a wearable thing needs a slot: { slot: "coat" }` | A `wardrobe/wearable` trait has no slot. |
| `a closet’s label must be words: { label: "Wardrobe" }` | A `wardrobe/closet` trait isn't an object, or its `label` isn't a string. |
| `slots coat · unknown entity "clothing:anorak"` | A slot's `start` names a thing the game doesn't have. |
| `starts with "clothing:scarf", which is not worn in this slot` | A slot's `start` names a thing whose trait names another slot. |
| `starts with "clothing:raincoat", which the player does not start holding` | A slot's `start` names a thing without `at: 'player'` or a count for the player. |

A `wardrobe/wearing` condition or a `wardrobe/wear` command naming a thing the game doesn't have gives `unknown entity "…"` where it's written.

```text
mod:winter · trait wardrobe/wearable on clothing:gloves · unknown slot "hands"
town · slots coat · starts with "clothing:raincoat", which the player does not start holding
```

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/reference/strings#stringkey-and-strings). `{thing}` is the thing's name. `wardrobe/wear` also uses the engine's [`noSuchThing`](/docs/reference/strings#refusals).

| Key | Meaning |
|---|---|
| `wardrobe/notClothing` | `The {thing} is not something you wear.`, the refusal of a thing with no `wardrobe/wearable` trait. |
| `wardrobe/alreadyWearing` | `You are already wearing the {thing}.` |
| `wardrobe/haveNone` | `You have no {thing}.`, the refusal of a thing the player doesn't hold. |
| `wardrobe/nothingToTakeOff` | `There is nothing to take off.`, the refusal of an empty slot. |
| `wardrobe/takeOff` | `Take off`, the label of a slot's `takeOff` button. |
| `wardrobe/wear` | `Wear {thing}`, the label of a spare thing's `wear` button. |
| `wardrobe/open` | `Wardrobe`, the label of a closet's button when its trait gives none. |

## Caveats

- Within the command that loses a thing, `wardrobe/wearing` still holds, because the plugin takes the thing off after the command. [`applyEffects`](/docs/reference/effects#applyeffects) runs no hooks, so a state made with it can show something on that the player no longer holds.
- A worn thing is still held, so `holding('clothing:raincoat')` holds while the raincoat is on.
- The wardrobe marks one thing as on, never a count. A player with two of a stackable thing wears one, and selling one leaves it on.
- A save made while the game had a slot it has since dropped keeps that slot. `wardrobe.wearing(entity)` and the view read only the slots the game declares now, but `wardrobe.slotFilled` reads the save, so it still holds for the dropped slot, and `wardrobe.takeOff` empties it.
