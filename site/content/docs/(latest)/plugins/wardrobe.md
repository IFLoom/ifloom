---
title: "Wardrobe"
description: "Slots the game declares, clothes that go in them, what the player has on, and the condition that reads it."
---
`@ifloom/plugin-wardrobe` keeps track of what the player has on. Content says which slots there are, such as a coat and a scarf, armour and a ring, or a uniform and a cap, and which item goes in which slot.

You'd want it when what the player wears matters to the story: a dress code at the office, a raincoat that people notice, armour that opens a door. If clothes are only flavour, ordinary [items](/docs/reference/game#itemdef) are enough.

Clothes are ordinary items. Wearing one doesn't change how many the player has, because the wardrobe only marks what's on. Putting something on takes off whatever was in its slot, and something the player no longer has comes off by itself.

```ts
import {
  wardrobe, wearing, slotFilled, wear, takeOff, clothes,
  type WardrobeSlot, type ClothingDef, type WardrobeState, type WardrobeView,
} from '@ifloom/plugin-wardrobe'
```

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "0.0.0",
    "@ifloom/plugin-wardrobe": "0.0.0"
  }
}
```

Then add `wardrobe()` to the game's `plugins`, and put the slots and the clothes in a pack. [Adding one](/docs/plugins#adding-one) has the details.

## wardrobe

```ts
function wardrobe(): DefinedPlugin<WardrobeState>
```

Builds the plugin, with the id `wardrobe`. Call it once, when you build the game. It takes no options: the slots and the clothes are content, in a pack's `data.wardrobe`, so a mod can add either. This is the [showcase](/docs/guide/showcase)'s, where the player starts in a raincoat:

```ts
data: {
  wardrobe: {
    slots: [
      { id: 'coat', label: 'Coat', start: 'raincoat' },
      { id: 'neck', label: 'Neck' },
    ],
    clothes: [/* … */],
  },
}
```

### WardrobeSlot

```ts
type WardrobeSlot = { id: string; label: string; start?: string }
```

| Field | What it is |
|---|---|
| `id` | What content and commands name the slot by. Unique among the slots. |
| `label` | What the player reads. |
| `start` | What the player has on in it in a new game, an item id. Empty if left out. The player must start owning the item (see [Checks](#checks)). |

Slots are content. List them in a pack's `data.wardrobe.slots`, in the order the UI lists them. They're merged by id, so a mod can add a slot.

### slotsOf

```ts
function slotsOf(game: Game): WardrobeSlot[]
```

The game's slots, merged from its packs, in order.

## Writing clothes

Clothes are content. List them in a pack's [`data`](/docs/reference/loader#pack) under `wardrobe.clothes`. They're merged by id as scenes are, so a mod can add clothing or move a piece to another slot.

### ClothingDef

```ts
type ClothingDef = { id: string; slot: string }
```

| Field | What it is |
|---|---|
| `id` | An [item](/docs/reference/game#itemdef) id. You declare the item as usual, in `items`. |
| `slot` | The slot it goes in. Each piece of clothing has one slot. |

The showcase's clothes are a raincoat and a scarf:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  items: [
    { id: 'raincoat', name: 'raincoat', desc: 'Yellow, a size too big.', start: 1 },
    { id: 'scarf', name: 'scarf', desc: 'Knitted by someone who loved you.' },
  ],
  data: {
    wardrobe: {
      slots: [
        { id: 'coat', label: 'Coat', start: 'raincoat' },
        { id: 'neck', label: 'Neck' },
      ],
      clothes: [
        { id: 'raincoat', slot: 'coat' },
        { id: 'scarf', slot: 'neck' },
      ],
    },
  },
}
```

The raincoat has `start: 1`, so the player starts with one, which the coat slot's `start` needs.

## A worked example

A cut-down Small Town. The player starts in the raincoat, which people in the café notice. A scarf is for sale on the high street, and the bench by the river is too cold without one. The map comes from the [places](/docs/plugins/places) plugin, and there's no calendar, so the café never closes.

```ts
import { SCHEMA, need, type Pack } from '@ifloom/engine'
import { onlyAt, type LocationDef } from '@ifloom/plugin-places'
import { wearing } from '@ifloom/plugin-wardrobe'

const act = (id: string, label: string) => ({ id, label, command: { type: 'activity' as const, id } })
const place = (id: string, name: string, exits: string[]): LocationDef =>
  ({ id, name, tag: 'Small Town', art: '', exits, body: [{ text: `place.${id}` }] })

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  stats: [{ id: 'coins', label: 'Coins', start: 12, spendable: true }],
  items: [
    { id: 'raincoat', name: 'raincoat', desc: 'Yellow, a size too big.', start: 1 },
    { id: 'scarf', name: 'scarf', desc: 'Knitted by someone who loved you.' },
    { id: 'sandwich', name: 'sandwich', desc: 'Cheese and pickle.', start: 1 },
  ],
  activities: [
    { id: 'buyScarf', cost: { stats: { coins: 8 } }, blocked: [onlyAt(['high-street'])], effects: [{ kind: 'item', item: 'scarf', by: 1 }] },
    { id: 'bench', blocked: [onlyAt(['park']), need('Too cold without a scarf.', wearing('scarf'))], effects: [] },
  ],
  prose: {
    'place.high-street': 'A bakery, a launderette, a bus stop.',
    'place.cafe': 'Six tables, one of them wobbly.',
    'place.cafe.raincoat': 'Someone points at your raincoat and grins. It is very yellow.',
    'place.park': 'The river is slow and brown.',
  },
  data: {
    places: {
      locations: [
        { ...place('high-street', 'High Street', ['cafe', 'park']), actions: [act('buyScarf', 'Buy a scarf at the market')] },
        {
          ...place('cafe', 'The Corner Café', ['high-street']),
          body: [{ text: 'place.cafe' }, { text: 'place.cafe.raincoat', when: wearing('raincoat') }],
        },
        { ...place('park', 'Riverside Park', ['high-street']), actions: [act('bench', 'Sit on the bench by the river')] },
      ],
    },
    wardrobe: {
      slots: [
        { id: 'coat', label: 'Coat', start: 'raincoat' },
        { id: 'neck', label: 'Neck' },
      ],
      clothes: [
        { id: 'raincoat', slot: 'coat' },
        { id: 'scarf', slot: 'neck' },
      ],
    },
  },
}
```

Build the game and play it. `town` is the pack above:

```ts
import { apply, holds, loadGame, startingState, view, whyNot, type GameState } from '@ifloom/engine'
import { go, places } from '@ifloom/plugin-places'
import { slotFilled, takeOff, wardrobe, wear, type WardrobeView } from '@ifloom/plugin-wardrobe'

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [
    places({ start: 'high-street' }),
    wardrobe(),
  ],
})

const closet = (state: GameState) => view(state, game).plugins.wardrobe as WardrobeView
let state = startingState(game)

closet(state).slots   // [{ id: 'coat', label: 'Coat', item: 'raincoat', name: 'raincoat' }, { id: 'neck', label: 'Neck', item: null, name: null }]
closet(state).spare   // []

const cafe = apply(state, game, go('cafe')).state
view(cafe, game).scene.body   // 'Six tables, one of them wobbly.\n\nSomeone points at your raincoat and grins. It is very yellow.'

state = apply(state, game, takeOff('coat')).state
closet(state).spare                        // [{ id: 'raincoat', name: 'raincoat', slot: 'coat' }]
state.items.raincoat                       // 1: taking it off doesn't lose it
apply(state, game, takeOff('coat')).reason   // 'There is nothing to take off.'

whyNot(state, game, wear('scarf'))         // 'You have no scarf.'
whyNot(state, game, wear('sandwich'))      // 'The sandwich is not something you wear.'
state = apply(state, game, { type: 'activity', id: 'buyScarf' }).state
state = apply(state, game, wear('scarf')).state
holds(state, slotFilled('neck'), game)     // true
apply(state, game, wear('scarf')).reason  // 'You are already wearing the scarf.'

state = apply(state, game, go('park')).state
whyNot(state, game, { type: 'activity', id: 'bench' })   // undefined: the scarf is on
```

## Condition

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'wardrobe/wearing': { item } }` | `wearing(item)` | The item is on, in whichever slot. |
| `{ 'wardrobe/wearing': { item, slot } }` | `wearing(item, slot)` | That item is on in that slot. |
| `{ 'wardrobe/wearing': { slot } }` | `slotFilled(slot)` | Something is in that slot. |

You can use it anywhere a [condition](/docs/reference/conditions) goes: a block's `when`, a choice, a `blocked` entry or a lock. These are the short forms (see [plugin calls](/docs/reference/custom#plugincall)). The long form of the first row is `{ custom: 'wardrobe/wearing', with: { item: 'scarf' } }`. With neither `item` nor `slot`, it's false. An unknown item, or a slot the save has nothing in, is false.

To ask whether the player has an item at all, worn or not, use the engine's [`{ item }`](/docs/reference/conditions#item).

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ 'wardrobe/wear': { id } }` | `wear(item)` | Puts the item `id` on in its slot, in place of whatever was there. What comes off stays the player's. |
| `{ 'wardrobe/takeOff': { id } }` | `takeOff(slot)` | Empties the slot `id`. |

`wardrobe/wear` is refused, in this order, with:

- `There is no such thing.` when no item has that id.
- `The <name> is not something you wear.` when the item isn't among the clothes.
- `You are already wearing the <name>.`
- `You have no <name>.`

`wardrobe/takeOff` is refused with `There is nothing to take off.` when the save has nothing in that slot, which includes a slot the game never had.

You can reword each line (see [Strings](#strings)).

Both commands go through [locks](/docs/reference/locks) like any other. A lock names them `wardrobe/wear` and `wardrobe/takeOff`, or both at once as `wardrobe/*`.

## Strings

The plugin's lines go in the [strings table](/docs/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key. `{item}` is the item's name.

| Key | English |
|---|---|
| `wardrobe/notClothing` | `The {item} is not something you wear.` |
| `wardrobe/alreadyWearing` | `You are already wearing the {item}.` |
| `wardrobe/nothingToTakeOff` | `There is nothing to take off.` |

`wardrobe/wear` also uses two of the engine's own lines, so they read the same as everywhere else and you reword them along with the engine's: [`noSuchThing`](/docs/reference/strings#refusals) (`There is no such thing.`) and [`haveNone`](/docs/reference/strings#refusals) (`You have no {item}.`).

To reword one in your game, put it in the base's `strings`:

```ts
import { loadGame } from '@ifloom/engine'
import { wardrobe } from '@ifloom/plugin-wardrobe'
import { town } from './town.ts'

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [wardrobe()],
  strings: { 'wardrobe/alreadyWearing': 'The {item} is already on.' },
})
```

## The view

`view(state, game).plugins.wardrobe` is a `WardrobeView`.

### WardrobeView

```ts
type WardrobeView = {
  slots: { id: string; label: string; item: string | null; name: string | null }[]
  spare: { id: string; name: string; slot: string }[]
}
```

| Field | What it is |
|---|---|
| `slots` | Every slot, in the order the game declared them. `item` is the id of what's in it and `name` is that item's name. Both are `null` for an empty slot. |
| `spare` | Clothes the player has and isn't wearing, in the order `wardrobe.clothes` lists them. `slot` is where each would go. |

What the player wears is also in the engine's [`view().pack`](/docs/reference/view#the-players-numbers-and-things), since they still have it. A UI that wants the bag without the clothes leaves out the ids in `slots`.

## The state

### WardrobeState

```ts
type WardrobeState = { worn: Record<string, string | null> }
```

What the plugin keeps in a save, at `state.plugins.wardrobe`: the item in each slot, or `null`. A UI reads the view, not this.

## For code

The helpers above write the content objects for you, typed. `wearing` and `slotFilled` return a `Condition`, and `wear` and `takeOff` return a [`CommandRef`](/docs/reference/custom#commandref), in the short form.

### Helpers

```ts
const wearing: (item: string, slot?: string) => Condition
const slotFilled: (slot: string) => Condition
const wear: (item: string) => CommandRef
const takeOff: (slot: string) => CommandRef
```

### clothes

```ts
function clothes(game: Game): ClothingDef[]
```

The game's clothes, merged from its packs: `game.data.wardrobe.clothes`.

## Checks

When the game loads, the plugin reports:

- Clothing whose id isn't an item (`clothes <id>`, `unknown item "…"`).
- Clothing for a slot the game doesn't have (`clothes <id>`, `unknown slot "…"`).
- A slot's `start` that isn't clothing for that slot (`slots <slot>`, `starts with "…", which is not clothing for this slot`).
- A slot's `start` the player doesn't start with (`slots <slot>`, `starts with "…", which the player does not start with`).

Each problem is pinned on the pack that brought the entry. A `wardrobe/wearing` condition or a `wardrobe/wear` command naming an item the game doesn't have gives `unknown item "…"` where it's written.

```text
mod:winter · clothes gloves · unknown slot "hands"
town · slots coat · starts with "raincoat", which the player does not start with
```

## Gotchas

- **The player has to start owning what they start wearing.** A slot's `start` item needs a `start` count above 0, such as `start: 1`. Otherwise the load reports it.
- **Losing an item takes it off after the command.** Whether it's sold, used up or taken by an effect, once the player has none, the plugin's `onCommand` [hook](/docs/reference/plugins#hooks-and-providers) empties its slot at the end of the command. Until then, within the same command, `wardrobe/wearing` still holds. [`applyEffects`](/docs/reference/effects#applyeffects) runs no hooks, so a state made with it can show something on that the player no longer has.
- **`{ item }` counts worn items.** Worn clothes are still owned, so `{ item: 'raincoat' }` holds while it's on. To ask whether it's on, use `wearing`.
- **Wearing doesn't check where the player is or what's on screen.** Both commands work with a scene open and in any location. To stop the player changing somewhere, add a lock, such as `{ when: at('office'), deny: ['wardrobe/*'], reason: 'Not at work.' }`.
- **One of each in a slot.** The wardrobe marks an item id as on, not a count. A player with two scarves wears one, and selling one leaves it on.
- **A slot taken out of the game stays in old saves.** Say a save was made while the game had a `hat` slot. `wearing(item)` with no slot, and the view, only look at the slots the game declares now, so the hat no longer counts as worn there. But a condition that names the slot reads the save directly, so `slotFilled('hat')` and `wearing('cap', 'hat')` still hold, and `takeOff('hat')` isn't refused and empties it. Put the slot back and the item is on again everywhere.

## See it in an example

Small Town: [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) adds `wardrobe()`. The coat and neck slots, the raincoat on at the start, and the clothes are in `data.wardrobe` in [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts), and the café's body reads `wearing('raincoat')`.
