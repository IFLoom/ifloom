---
title: "Wardrobe"
description: "Slots the game declares, things that go in them by their wearable trait, what you have on, and the condition that reads it."
---
`@ifloom/plugin-wardrobe` keeps track of what you have on. Content says which slots there are, such as a coat and a scarf, armour and a ring, or a uniform and a cap. Anything you can wear is an [entity](/docs/reference/entities) with the `wardrobe/wearable` [trait](/docs/reference/entities#traits), which names its slot.

You'd want it when what the player wears matters to the story: a dress code at the office, a raincoat that people notice, armour that opens a door. If clothes are only flavour, holding them is enough.

You wear only what you [hold](/docs/reference/entities#holding-things). Wearing something doesn't change how many you hold, because the wardrobe only marks what's on. Putting something on takes off whatever was in its slot, and something you no longer hold comes off by itself.

What's worn is kept for each body: the player's, and each [protagonist](/docs/reference/entities#protagonists-you-and-player)'s the game plays with the `you` effect. Switching to Sam shows what Sam has on, and switching back shows the player's clothes again, as they were left. See [Who wears what](#who-wears-what).

```ts
import { wardrobe, slotsOf, wearableOf, type Closet, type Wearable, type WardrobeSlot, type WardrobeState, type WardrobeView } from '@ifloom/plugin-wardrobe'
```

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-wardrobe": "^0.0.0"
  }
}
```

Then add `wardrobe()` to the game's `plugins`, put the slots in your content, and give the things that can be worn the `wearable` trait. [Adding one](/docs/plugins#adding-one) has the details.

It needs no other plugin. Things can come from the [shop](/docs/plugins/shop), or from any effect that gives them, and be given away with the [inventory](/docs/plugins/inventory); the wardrobe only reads what you hold.

## wardrobe

```ts shape
function wardrobe(): DefinedPlugin<WardrobeState, WardrobeView>
```

Builds the plugin, with the id `wardrobe`. Call it once, when you build the game. It takes no options: the slots and the wearable things are content, so a mod can add either.

## Writing clothes

A wardrobe on its own: two kinds of thing, the slots, and nothing else. This is the [showcase](/docs/guide/showcase)'s, where the player starts in a raincoat:

```ts
import type { Content } from '@ifloom/engine'
import { wardrobe } from '@ifloom/plugin-wardrobe'

const town: Content = {
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

The raincoat has `at: 'player'`, so the player starts holding it, which the coat slot's `start` needs. The clothing kind is `unique` because each coat is one particular coat. A stackable kind works too, for a game with three identical socks.

### The wearable trait

```ts shape
const wardrobe: {
  wearable(slot: string): { 'wardrobe/wearable': Wearable }
}
```

#### Wearable

```ts shape
type Wearable = { slot: string }
```

The slot a thing is worn in. It's a [trait](/docs/reference/entities#traits), so you can write it on a kind (every uniform goes on the body), on an entity, or in content's `traits` table, where a mod can move a piece to another slot. `wearable` writes it, to spread into `traits` beside others, such as the shop's [`sellable`](/docs/plugins/shop#the-sellable-trait). A thing made in play [`like`](/docs/reference/effects#create) a wearable one is wearable too.

### A place to change

```ts shape
const wardrobe: {
  closet(options?: Closet): { 'wardrobe/closet': Closet }
}
```

#### Closet

What the `wardrobe/closet` trait holds: `label`, the words on its button (the `wardrobe/open` string if left out).

```ts shape
type Closet = { label?: string }
```

Give a place the `wardrobe/closet` trait and, while the player is there, it offers a button that opens the `wardrobe` [panel](/docs/reference/panels). The bedroom is the usual one:

```ts
import { places } from '@ifloom/plugin-places'
import { wardrobe } from '@ifloom/plugin-wardrobe'

places.location({
  id: 'flat',
  name: 'Your flat',
  description: 'Home',
  exits: ['high-street'],
  body: [{ text: 'A sofa, a radiator that knocks, and a coat rack by the door.' }],
  traits: { ...wardrobe.closet() },
})
```

The button is among the room's actions, with the id `open` and the command `{ type: 'action', id: 'wardrobe/open' }`. It's labelled with the `wardrobe/open` string (`Wardrobe`), or the trait's own `label`, such as `wardrobe.closet({ label: 'Coat rack' })`. Its effect is `{ panel: 'wardrobe' }`, which you can also write on any choice or action to open the same panel from anywhere.

Where the player is comes from the [places](/docs/plugins/places) plugin, so a closet needs it. In a game without places the trait does nothing.

### WardrobeSlot

```ts shape
type WardrobeSlot = { id: string; label: string; start?: EntityRef }
```

| Field | What it is |
|---|---|
| `id` | What content and commands name the slot by. Unique among the slots. |
| `label` | What the player reads. |
| `start` | What you have on in it in a new game, such as `'clothing:raincoat'`. Empty if left out. The player must start holding it (see [Checks](#checks)). |

Slots are content. List them in your content's `data.wardrobe.slots`, in the order the UI lists them. They're merged by id, so a mod can add a slot.

## A worked example

A cut-down Small Town. The player starts in the raincoat, which people in the café notice. A scarf is for sale on the high street, and the bench by the river is too cold without one. The map comes from the [places](/docs/plugins/places) plugin, and there's no calendar, so the café never closes.

```ts
import { give, need, type Content } from '@ifloom/engine'
import { places, type PlaceDef } from '@ifloom/plugin-places'
import { wardrobe } from '@ifloom/plugin-wardrobe'

const place = (id: string, name: string, exits: string[]): PlaceDef =>
  ({ id, name, description: 'Small Town', exits, body: [{ prose: `place.${id}` }] })

const map = [
  {
    ...place('high-street', 'High Street', ['cafe', 'park']),
    actions: [{ id: 'buyScarf', label: 'Buy a scarf at the market', cost: { stats: { coins: 8 } }, effects: [give('clothing:scarf')] }],
  },
  {
    ...place('cafe', 'The Corner Café', ['high-street']),
    body: [{ prose: 'place.cafe' }, { prose: 'place.cafe.raincoat', when: wardrobe.wearing('clothing:raincoat') }],
  },
  {
    ...place('park', 'Riverside Park', ['high-street']),
    actions: [{ id: 'bench', label: 'Sit on the bench by the river', blocked: [need('Too cold without a scarf.', wardrobe.wearing('clothing:scarf'))], effects: [] }],
  },
].map(places.location)

const town: Content = {
  stats: [{ id: 'coins', label: 'Coins', start: 12, spendable: true }],
  kinds: [
    { id: 'clothing', label: 'Clothing', unique: true, listed: false },
    { id: 'food', label: 'Food', listed: false },
  ],
  entities: [
    { id: 'raincoat', of: 'clothing', name: 'raincoat', at: 'player', traits: { ...wardrobe.wearable('coat') } },
    { id: 'scarf', of: 'clothing', name: 'scarf', traits: { ...wardrobe.wearable('neck') } },
    { id: 'sandwich', of: 'food', name: 'sandwich', at: 'player' },
    ...map,
  ],
  prose: {
    'place.high-street': 'A bakery, a launderette, a bus stop.',
    'place.cafe': 'Six tables, one of them wobbly.',
    'place.cafe.raincoat': 'Someone points at your raincoat and grins. It is very yellow.',
    'place.park': 'The river is slow and brown.',
  },
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

Build the game and play it. `town` is the content above:

```ts
import { apply, heldCount, holds, loadGame, startingState, view, whyNot, type GameState } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { wardrobe, type WardrobeView } from '@ifloom/plugin-wardrobe'
import { town } from './town.ts'   // the content above

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [
    places({ start: 'high-street' }),
    wardrobe(),
  ],
})

const closet = (state: GameState) => view(state, game).plugins.wardrobe!
let state = startingState(game)

closet(state).slots   // [{ id: 'coat', label: 'Coat', entity: 'clothing:raincoat', name: 'raincoat' }, { id: 'neck', label: 'Neck', entity: null, name: null }]
closet(state).spare   // []

const cafe = apply(state, game, places.go('cafe')).state
view(cafe, game).scene.body   // 'Six tables, one of them wobbly.\n\nSomeone points at your raincoat and grins. It is very yellow.'

state = apply(state, game, wardrobe.takeOff('coat')).state
closet(state).spare                              // [{ entity: 'clothing:raincoat', name: 'raincoat', slot: 'coat' }]
heldCount(state, game, 'clothing:raincoat')      // 1: taking it off doesn't lose it
apply(state, game, wardrobe.takeOff('coat')).reason       // 'There is nothing to take off.'

whyNot(state, game, wardrobe.wear('clothing:scarf'))      // 'You have no scarf.'
whyNot(state, game, wardrobe.wear('food:sandwich'))       // 'The sandwich is not something you wear.'
state = apply(state, game, { type: 'action', id: 'places/buyScarf' }).state
state = apply(state, game, wardrobe.wear('clothing:scarf')).state
holds(state, game, wardrobe.slotFilled('neck'))           // true
apply(state, game, wardrobe.wear('clothing:scarf')).reason  // 'You are already wearing the scarf.'

state = apply(state, game, places.go('park')).state
whyNot(state, game, { type: 'action', id: 'places/bench' })   // undefined: the scarf is on
```

## Condition

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'wardrobe/wearing': { entity } }` | `wardrobe.wearing(entity)` | The thing is on, in whichever slot. |
| `{ 'wardrobe/wearing': { entity, slot } }` | `wardrobe.wearing(entity, slot)` | That thing is on in that slot. |
| `{ 'wardrobe/wearing': { slot } }` | `wardrobe.slotFilled(slot)` | Something is in that slot. |
| `{ 'wardrobe/wearing': { entity, at } }` | | The thing is on `at`'s body: `'player'` or a protagonist, such as `'character:sam'`, whoever is played. |

Without `at`, it asks about whoever the player is playing now ([`'you'`](/docs/reference/entities#protagonists-you-and-player)). You can use it anywhere a [condition](/docs/reference/conditions) goes: a block's `when`, a choice, a `blocked` entry or a lock. Each is a call by name (see [plugin calls](/docs/reference/custom#plugincall)). With neither `entity` nor `slot`, it's false. An unknown thing, or a slot the save has nothing in, is false.

To ask whether you hold a thing at all, worn or not, use the engine's [`holding`](/docs/reference/entities#give-take-move-and-holding), or [`{ entity, at }`](/docs/reference/conditions#entity).

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ 'wardrobe/wear': { id } }` | `wardrobe.wear(entity)` | Puts the thing `id` on whoever the player is playing, in its slot, in place of whatever was there. What comes off is still theirs. |
| `{ 'wardrobe/takeOff': { id } }` | `wardrobe.takeOff(slot)` | Empties the slot `id` on whoever the player is playing. |

`wardrobe/wear` is refused, in this order, with:

- `There is no such thing.` when the thing isn't in the game.
- `The <name> is not something you wear.` when it has no `wardrobe/wearable` trait.
- `You are already wearing the <name>.`
- `You have no <name>.` when you don't hold it.

`wardrobe/takeOff` is refused with `There is nothing to take off.` when the save has nothing in that slot, which includes a slot the game never had.

You can reword each line (see [Strings](#strings)).

Both commands go through [locks](/docs/reference/locks) like any other. A lock names them `wardrobe/wear` and `wardrobe/takeOff`, or both at once as `wardrobe/*`.

## Strings

The plugin's lines go in the [strings table](/docs/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key. `{thing}` is the thing's name.

| Key | English |
|---|---|
| `wardrobe/notClothing` | `The {thing} is not something you wear.` |
| `wardrobe/alreadyWearing` | `You are already wearing the {thing}.` |
| `wardrobe/haveNone` | `You have no {thing}.` |
| `wardrobe/nothingToTakeOff` | `There is nothing to take off.` |
| `wardrobe/takeOff` | `Take off`, a slot's [`takeOff`](#wardrobeview) button. |
| `wardrobe/wear` | `Wear {thing}`, a spare thing's [`wear`](#wardrobeview) button. |
| `wardrobe/open` | `Wardrobe`, the button a [closet](#a-place-to-change) place offers. |

`wardrobe/wear` also uses the engine's [`noSuchThing`](/docs/reference/strings#refusals) (`There is no such thing.`), so it reads the same as everywhere else.

To reword one in your game, put it in your content's `strings`:

```ts
import type { Content } from '@ifloom/engine'

export const words: Content = {
  strings: { 'wardrobe/alreadyWearing': 'The {thing} is already on.' },
}
```

## The view

`view(state, game).plugins.wardrobe` is a `WardrobeView`.

Its [React UI](#drawing-it) draws it with [`WardrobeCard`](#wardrobecard), and [`useWardrobe`](#usewardrobe) gives the same data with a button for each thing the player can do, with no markup.

### WardrobeView

```ts shape
type WardrobeView = {
  slots: { id: string; label: string; entity: EntityRef | null; name: string | null; takeOff: RenderedChoice | null }[]
  spare: { entity: EntityRef; name: string; slot: string; wear: RenderedChoice }[]
}
```

| Field | What it is |
|---|---|
| `slots` | Every slot, in the order the game declared them, on whoever the player is playing now. `entity` is what's in it and `name` is its name. Both are `null` for an empty slot. `takeOff` is the button that takes it off, a [`RenderedChoice`](/docs/reference/view#renderedchoice) labelled with the `wardrobe/takeOff` string, or `null` for an empty slot. |
| `spare` | Wearable things they hold and aren't wearing, in the game's order of its entities. `slot` is where each would go, and `wear` is the button that puts it on, labelled with the `wardrobe/wear` string. |

Each button is greyed out in advance with the engine's reason when it can't be done now, such as a lock's.

What you wear is also in the engine's [`view.held`](/docs/reference/view#held), since you still hold it. A UI that wants the bag without the clothes leaves out the refs in `slots`.

## Drawing it

`view.plugins.wardrobe` is a [`WardrobeView`](#wardrobeview): each slot with what's in it, and the `spare` things you could wear. Each slot's `takeOff` and each spare thing's `wear` is a ready button: draw it as any other, and send its `command`.

`@ifloom/plugin-wardrobe/react` draws what the player wears, for a game drawn with [`@ifloom/react`](/docs/react). List `wardrobeUi` in the game's [`plugins`](/docs/react/kit#the-plugins-option) and the `wardrobe` panel draws the [`WardrobeCard`](#wardrobecard), in a dialog titled `ui.wardrobe` (`Wearing`). A [closet](#a-place-to-change) place's button opens it, and so does any `{ panel: 'wardrobe' }`. It adds nothing to the side column. To keep what the player wears in view there, place [`WardrobeSection`](#wardrobesection) in your layout's `Sidebar`. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/wardrobe.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/mount-wardrobe.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Wardrobe.vue]{meta='tab="Vue" tab-group="framework"'}

The React UI is yours to leave out. Draw the plugin yourself from `view.plugins.wardrobe`, or from [`useWardrobe`](#usewardrobe) with your own markup, and nothing of ours is drawn: that's as much a way to use the plugin as ours. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads this subpath.

### wardrobeUi

```ts shape
const wardrobeUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): the `wardrobe` panel, which draws the [`WardrobeCard`](#wardrobecard) under the title `ui.wardrobe`. It puts nothing in the side column.

Its words are in `WARDROBE_WORDS`. A game rewords any of them with `ui.<key>` in its strings, as it does the React UI's own: `{ 'ui.nothingOn': '…' }`.

| Key | English |
|---|---|
| `ui.nothingOn` | `Nothing` |
| `ui.wardrobe` | `Wearing` |

The buttons say what the view's buttons say, the plugin's [strings](#strings) `wardrobe/takeOff` and `wardrobe/wear`.

### WardrobeSection

```tsx shape
function WardrobeSection(): JSX.Element
```

A folding [`Section`](/docs/react/components#section) with the id `wardrobe`, titled `ui.wardrobe`, holding the `WardrobeCard`. `wardrobeUi` doesn't place it, so put it in your layout's `Sidebar` to show what the player wears all the time:

::include[../../../../snippets/react/wardrobe-sidebar.tsx]

For one that shows only in some rooms, draw your own `Section` with `when` round a `WardrobeCard`, as the showcase does.

### WardrobeCard

```tsx shape
function WardrobeCard(props: { className?: string; title?: string | false }): JSX.Element | null
```

The [wardrobe plugin](/docs/plugins/wardrobe)'s view. Each slot (`data-slot-id`, with `data-worn` holding the reference of what's in it) shows its label and what's in it, or `ui.nothingOn`. When something is in a slot, it has the slot's **Take off** button. Each spare wearable thing for that slot gets its **Wear …** button. Both are the view's, with its words and its refusals.

A button that can't be used now is greyed out, with [`whyNot`](/docs/reference/actions#whynot)'s reason in its `title`. The heading is `ui.wardrobe`, or `title`, and `false` leaves it out. It draws nothing in a game without the plugin.

**Gotcha.** As with an exit, the reason is in the `title` and shows on hover. It isn't printed on the button.

Replaceable as `WardrobeCard` in [`components`](/docs/react/components#components). Parts: `wardrobe`, `wardrobe-title`, `wardrobe-slot` (with `data-slot-id`), `wardrobe-slot-name`, `wardrobe-worn` and `button`.

### useWardrobe

```ts shape
function useWardrobe(): WardrobeControls | null

type WardrobeControls = Omit<WardrobeView, 'slots'> & {
  slots: WardrobeSlotControls[]
  wear: (entity: EntityRef) => Result<GameState>
  takeOff: (slot: string) => Result<GameState>
}
type WardrobeSlotControls = WardrobeView['slots'][number] & {
  wear: RenderedChoice[]
}
```

The [wardrobe](/docs/plugins/wardrobe) plugin's view, with a button for each thing the player can do, or `null` in a game without the plugin. Each slot has the view's `takeOff` (`null` when it's empty), and `wear`, the view's `wear` button of each spare wearable thing for that slot. Each is greyed out with the engine's reason when it can't be done now. `wardrobe.wear(entity)` (a reference, `'clothing:scarf'`) and `wardrobe.takeOff(slot)` send the commands directly. [`WardrobeCard`](#wardrobecard) is drawn from it.

## The state

### WardrobeState

```ts shape
type WardrobeState = { worn: Record<Holder, Record<string, EntityRef | null>> }
```

What the plugin keeps in a save, at `state.plugins.wardrobe`: for each body that has worn something (`'player'`, or a protagonist's reference), the thing in each slot, or `null`. A new game has the player's slots, from each slot's `start`. A UI reads the view, not this.

Older saves are carried forward. The plugin's first version kept item ids: each becomes the wearable entity with that id, or `null` when there isn't one. Its second kept one set of slots for whoever was played: they become that one's, the player's or the protagonist's the save was playing.

### Who wears what

Each body keeps its own slots. Wearing and taking off change the slots of whoever is played now, and the view and `wearing` read them. A protagonist starts with nothing on until they put something on, whatever the slots' `start`, which is the player's. After every command, whatever a body no longer holds comes off it, so giving the player's scarf to Sam takes it off the player even while Sam is played.

```ts
import { apply, applyEffects, holds, type Game, type GameState } from '@ifloom/engine'
import { wardrobe } from '@ifloom/plugin-wardrobe'

declare const game: Game
declare const state: GameState   // the player in the raincoat; Sam holds a scarf

const asSam = applyEffects(state, game, [{ you: 'character:sam' }])
const dressed = apply(asSam, game, wardrobe.wear('clothing:scarf')).state
holds(dressed, game, wardrobe.wearing('clothing:raincoat'))   // false: Sam isn't wearing it
const back = applyEffects(dressed, game, [{ you: 'player' }])
holds(back, game, wardrobe.wearing('clothing:raincoat'))      // true: the player still is
holds(back, game, { 'wardrobe/wearing': { entity: 'clothing:scarf', at: 'character:sam' } })   // true
```

## For code

The helpers above are properties of `wardrobe`, the plugin's factory, and write the content objects for you, typed. `wardrobe.wearing` and `wardrobe.slotFilled` return a `Condition`, `wardrobe.wear` and `wardrobe.takeOff` return a [`CommandRef`](/docs/reference/custom#commandref), and `wardrobe.wearable` and `wardrobe.closet` return their traits.

### Helpers

```ts shape
const wardrobe: {
  (): DefinedPlugin<WardrobeState, WardrobeView>
  wearable(slot: string): { 'wardrobe/wearable': Wearable }
  closet(options?: Closet): { 'wardrobe/closet': Closet }
  wearing(entity: EntityRef, slot?: string): Condition
  slotFilled(slot: string): Condition
  wear(entity: EntityRef): CommandRef
  takeOff(slot: string): CommandRef
}
```

### slotsOf

```ts shape
function slotsOf(game: Game): WardrobeSlot[]
```

The game's slots, merged from its content and packs, in order.

### wearableOf

```ts shape
function wearableOf(state: GameState, game: Game, ref: EntityRef): Wearable | undefined
```

The thing's `wardrobe/wearable` trait, read through the thing it was made `like`, or undefined when it can't be worn.

## Checks

When the game loads, the plugin reports:

- A wearable thing for a slot the game doesn't have (`trait wardrobe/wearable on <ref>`, `unknown slot "…"`).
- A slot's `start` that isn't an entity (`slots <slot>`, `unknown entity "…"`), isn't worn in that slot (`starts with "…", which is not worn in this slot`), or that the player doesn't start holding (`starts with "…", which the player does not start holding`).
- A `data.wardrobe.clothes` list, as content from before clothes were things: give each thing `wearable` instead.

Each problem is pinned on the content or pack that brought the entry. A `wardrobe/wearing` condition or a `wardrobe/wear` command naming a thing the game doesn't have gives `unknown entity "…"` where it's written.

```text
mod:winter · trait wardrobe/wearable on clothing:gloves · unknown slot "hands"
town · slots coat · starts with "clothing:raincoat", which the player does not start holding
```

## Gotchas

- **The player has to start holding what they start wearing.** A slot's `start` needs `at: 'player'` (or a count for the player) on the thing. Otherwise the load reports it.
- **Losing a thing takes it off after the command.** Whether it's sold, used up, given away or taken by an effect, once you hold none, the plugin's `onCommand` [hook](/docs/reference/plugins#hooks-and-providers) empties its slot at the end of the command. Until then, within the same command, `wardrobe/wearing` still holds. [`applyEffects`](/docs/reference/effects#applyeffects) runs no hooks, so a state made with it can show something on that you no longer hold.
- **Worn things are still held.** `holding('clothing:raincoat')` holds while it's on. To ask whether it's on, use `wearing`.
- **"You" is whoever the player is playing.** Switch to a [protagonist](/docs/reference/entities#protagonists-you-and-player) with the `you` effect and the wardrobe shows their clothes, not the player's. The slots are the same for everyone you play, but each body fills its own.
- **Nothing in the side column by default.** `wardrobeUi` gives the panel only. A game with no closet place and no `{ panel: 'wardrobe' }` anywhere has no way to change, unless its layout places `WardrobeSection`.
- **Wearing doesn't check where you are or what's on screen.** Both commands work with a scene open and in any location. To stop the player changing somewhere, add a lock, such as `{ when: places.at('office'), deny: ['wardrobe/*'], reason: 'Not at work.' }`.
- **One of each in a slot.** The wardrobe marks a thing as on, not a count. A player with two of a stackable thing wears one, and selling one leaves it on.
- **A slot taken out of the game stays in old saves.** Say a save was made while the game had a `hat` slot. `wardrobe.wearing(entity)` with no slot, and the view, only look at the slots the game declares now, so the hat no longer counts as worn there. But a condition that names the slot reads the save directly, so `wardrobe.slotFilled('hat')` still holds, and `wardrobe.takeOff('hat')` isn't refused and empties it.

## See it in an example

Small Town: [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) adds `wardrobe()`. The raincoat and the scarf, their `wearable` traits, and the coat and neck slots are in [`examples/showcase/src/world/things.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/things.ts), and the café's body reads `wardrobe.wearing('clothing:raincoat')`.
