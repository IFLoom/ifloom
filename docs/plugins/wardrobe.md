# Wardrobe

`@ifloom/plugin-wardrobe` keeps track of what the player has on. Your game says which slots there are, such as a coat and a scarf, armour and a ring, or a uniform and a cap. Content says which item goes in which slot.

You'd want it when what the player wears matters to the story: a dress code at the office, a raincoat that people notice, armour that opens a door. If clothes are only flavour, ordinary [items](/reference/game#itemdef) are enough.

Clothes are ordinary items. Wearing one doesn't change how many the player has, because the wardrobe only marks what's on. Putting something on takes off whatever was in its slot, and something the player no longer has comes off by itself.

```ts
import {
  wardrobe, wearing, slotFilled, wear, takeOff, clothes,
  type WardrobeOptions, type WardrobeSlot, type ClothingDef, type WardrobeState, type WardrobeView,
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

Then add `wardrobe(...)` to the game's `plugins`, with the slots your game has. [Adding one](/plugins/#adding-one) has the details.

## wardrobe

```ts
function wardrobe(options: WardrobeOptions): DefinedPlugin<WardrobeState>
```

Builds the plugin, with the id `wardrobe`. Call it once, when you build the game, with the slots the game has. This is the [showcase](/guide/showcase)'s wardrobe, where the player starts in a raincoat:

```ts
import { wardrobe } from '@ifloom/plugin-wardrobe'

const clothing = wardrobe({
  slots: [
    { id: 'coat', label: 'Coat' },
    { id: 'neck', label: 'Neck' },
  ],
  start: { coat: 'raincoat' },
})
```

### WardrobeOptions

```ts
type WardrobeOptions = {
  slots: WardrobeSlot[]
  start?: Record<string, string>
}
```

| Field | What it is |
|---|---|
| `slots` | Every slot, in the order the UI lists them. |
| `start` | What the player has on in a new game, as an item id by slot id. A slot left out starts empty. The player must start owning each of these items (see [Checks](#checks)). |

### WardrobeSlot

```ts
type WardrobeSlot = { id: string; label: string }
```

| Field | What it is |
|---|---|
| `id` | What content and commands name the slot by. Unique among the slots. |
| `label` | What the player reads. |

The slots are code, not content, so a mod can't add one.

## Writing clothes

Clothes are content. List them in a pack's [`data`](/reference/loader#pack) under `wardrobe.clothes`. They're merged by id as scenes are, so a mod can add clothing or move a piece to another slot.

### ClothingDef

```ts
type ClothingDef = { id: string; slot: string }
```

| Field | What it is |
|---|---|
| `id` | An [item](/reference/game#itemdef) id. You declare the item as usual, in `items`. |
| `slot` | The slot it goes in. Each piece of clothing has one slot. |

The showcase's clothes are a raincoat and a scarf:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  items: [
    { id: 'raincoat', name: 'raincoat', desc: 'Yellow, a size too big.', kind: 'gear' },
    { id: 'scarf', name: 'scarf', desc: 'Knitted by someone who loved you.', kind: 'stuff' },
  ],
  data: {
    wardrobe: {
      clothes: [
        { id: 'raincoat', slot: 'coat' },
        { id: 'scarf', slot: 'neck' },
      ],
    },
  },
}
```

The raincoat is `kind: 'gear'`, so the player starts with one, which `start: { coat: 'raincoat' }` needs.

## A worked example

A cut-down Small Town. The player starts in the raincoat, which people in the café notice. A scarf is for sale on the high street, and the bench by the river is too cold without one. The map comes from the [places](/plugins/places) plugin, and there's no calendar, so the café never closes.

```ts
import { SCHEMA, need, type Pack } from '@ifloom/engine'
import { onlyAt, type LocationDef } from '@ifloom/plugin-places'
import { wearing } from '@ifloom/plugin-wardrobe'

const act = (id: string, label: string) => ({ id, label, command: { type: 'activity' as const, id } })
const place = (id: string, name: string, exits: string[]): LocationDef =>
  ({ id, name, tag: 'Small Town', kind: 'street', art: '', exits, body: [{ text: `place.${id}` }] })

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  stats: [{ id: 'coins', label: 'Coins', start: 12, spendable: true }],
  items: [
    { id: 'raincoat', name: 'raincoat', desc: 'Yellow, a size too big.', kind: 'gear' },
    { id: 'scarf', name: 'scarf', desc: 'Knitted by someone who loved you.', kind: 'stuff' },
    { id: 'sandwich', name: 'sandwich', desc: 'Cheese and pickle.', kind: 'stuff', start: 1 },
  ],
  activities: [
    { id: 'buyScarf', cost: { stats: { coins: 8 } }, requires: [onlyAt(['high-street'])], effects: [{ kind: 'item', id: 'scarf', by: 1 }] },
    { id: 'bench', requires: [onlyAt(['park']), need('Too cold without a scarf.', wearing('scarf'))], effects: [] },
  ],
  prose: {
    'place.high-street': 'A bakery, a launderette, a bus stop.',
    'place.cafe': 'Six tables, one of them wobbly.',
    'place.cafe/raincoat': 'Someone points at your raincoat and grins. It is very yellow.',
    'place.park': 'The river is slow and brown.',
  },
  data: {
    places: {
      locations: [
        { ...place('high-street', 'High Street', ['cafe', 'park']), actions: [act('buyScarf', 'Buy a scarf at the market')] },
        {
          ...place('cafe', 'The Corner Café', ['high-street']),
          body: [{ text: 'place.cafe' }, { text: 'place.cafe/raincoat', when: wearing('raincoat') }],
        },
        { ...place('park', 'Riverside Park', ['high-street']), actions: [act('bench', 'Sit on the bench by the river')] },
      ],
    },
    wardrobe: {
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
    wardrobe({ slots: [{ id: 'coat', label: 'Coat' }, { id: 'neck', label: 'Neck' }], start: { coat: 'raincoat' } }),
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
apply(state, game, takeOff('coat')).refused   // 'There is nothing to take off.'

whyNot(state, game, wear('scarf'))         // 'You have no scarf.'
whyNot(state, game, wear('sandwich'))      // 'The sandwich is not something you wear.'
state = apply(state, game, { type: 'activity', id: 'buyScarf' }).state
state = apply(state, game, wear('scarf')).state
holds(state, slotFilled('neck'), game)     // true
apply(state, game, wear('scarf')).refused  // 'You are already wearing the scarf.'

state = apply(state, game, go('park')).state
whyNot(state, game, { type: 'activity', id: 'bench' })   // undefined: the scarf is on
```

## Condition

| Content writes | Helper | Holds when |
|---|---|---|
| `{ custom: 'wardrobe/wearing', with: { item } }` | `wearing(item)` | The item is on, in whichever slot. |
| `{ custom: 'wardrobe/wearing', with: { item, slot } }` | `wearing(item, slot)` | That item is on in that slot. |
| `{ custom: 'wardrobe/wearing', with: { slot } }` | `slotFilled(slot)` | Something is in that slot. |

You can use it anywhere a [condition](/reference/conditions) goes: a block's `when`, a choice, a requirement or a lock. In the short form, with the full name as the only key, `{ 'wardrobe/wearing': { item: 'scarf' } }` is the same as the first row (see [plugin calls](/reference/custom#plugincall)). With neither `item` nor `slot`, it's false. An unknown item, or a slot the save has nothing in, is false.

To ask whether the player has an item at all, worn or not, use the engine's [`{ has }`](/reference/conditions#has).

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'wardrobe/wear', with: { item } }` | `wear(item)` | Puts the item on in its slot, in place of whatever was there. What comes off stays the player's. |
| `{ type: 'custom', name: 'wardrobe/takeOff', with: { slot } }` | `takeOff(slot)` | Empties the slot. |

`wardrobe/wear` is refused, in this order, with:

- `There is no such thing.` when no item has that id.
- `The <name> is not something you wear.` when the item isn't among the clothes.
- `You are already wearing the <name>.`
- `You have no <name>.`

`wardrobe/takeOff` is refused with `There is nothing to take off.` when the save has nothing in that slot, which includes a slot the game never had.

You can reword each line (see [Strings](#strings)).

Both commands go through [locks](/reference/locks) like any other. A lock names them `wardrobe/wear` and `wardrobe/takeOff`, or both at once as `wardrobe/*`.

## Strings

The plugin's lines go in the [strings table](/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key. `{item}` is the item's name.

| Key | English |
|---|---|
| `wardrobe/notClothing` | `The {item} is not something you wear.` |
| `wardrobe/alreadyWearing` | `You are already wearing the {item}.` |
| `wardrobe/nothingToTakeOff` | `There is nothing to take off.` |

`wardrobe/wear` also uses two of the engine's own lines, so they read the same as everywhere else and you reword them along with the engine's: [`noSuchThing`](/reference/strings#refusals) (`There is no such thing.`) and [`haveNone`](/reference/strings#refusals) (`You have no {item}.`).

To reword one in your game, put it in the base's `strings`:

```ts
import { loadGame } from '@ifloom/engine'
import { wardrobe } from '@ifloom/plugin-wardrobe'
import { town } from './town.ts'

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [wardrobe({ slots: [{ id: 'coat', label: 'Coat' }] })],
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

What the player wears is also in the engine's [`view().pack`](/reference/view#the-player-s-numbers-and-things), since they still have it. A UI that wants the bag without the clothes leaves out the ids in `slots`.

## The state

### WardrobeState

```ts
type WardrobeState = { worn: Record<string, string | null> }
```

What the plugin keeps in a save, at `state.plugins.wardrobe`: the item in each slot, or `null`. A UI reads the view, not this.

## For code

The helpers above write the content objects for you, typed. `wearing` and `slotFilled` return a `Condition`, and `wear` and `takeOff` return a `Command`.

### Helpers

```ts
const wearing: (item: string, slot?: string) => Condition
const slotFilled: (slot: string) => Condition
const wear: (item: string) => Command
const takeOff: (slot: string) => Command
```

### clothes

```ts
function clothes(game: Game): ClothingDef[]
```

The game's clothes, merged from its packs: `game.data.wardrobe.clothes`.

## Checks

When the game loads, the plugin reports:

- Clothing whose id isn't an item (`clothes <id>`, `no item has this id`).
- Clothing for a slot the game doesn't have (`clothes <id>`, `no slot called "…"`).
- A `start` slot the game doesn't have (`start <slot>`, `no slot by this name`).
- A `start` item that isn't clothing for that slot (`start <slot>`, `"…" is not clothing for this slot`).
- A `start` item the player doesn't start with (`start <slot>`, `the player does not start with "…"`).

Clothing problems are pinned on the pack that brought the entry. `start` problems are pinned on `base`.

```text
mod:winter · clothes gloves · no slot called "hands"
base · start coat · the player does not start with "raincoat"
```

## Gotchas

- **The player has to start owning what they start wearing.** An item in `start` needs a `start` count above 0, or `kind: 'gear'`, which starts at 1. Otherwise the load reports it.
- **Losing an item takes it off after the command.** Whether it's sold, used up or taken by an effect, once the player has none, the plugin's `after` [hook](/reference/plugins#hooks) empties its slot at the end of the command. Until then, within the same command, `wardrobe/wearing` still holds. [`applyEffects`](/reference/effects#applyeffects) runs no hooks, so a state made with it can show something on that the player no longer has.
- **`{ has }` counts worn items.** Worn clothes are still owned, so `{ has: 'raincoat' }` and `{ item: 'raincoat' }` hold while it's on. To ask whether it's on, use `wearing`.
- **Wearing doesn't check where the player is or what's on screen.** Both commands work with a scene open and in any location. To stop the player changing somewhere, add a lock, such as `{ when: at('office'), deny: ['wardrobe/*'], reason: 'Not at work.' }`.
- **One of each in a slot.** The wardrobe marks an item id as on, not a count. A player with two scarves wears one, and selling one leaves it on.
- **A slot taken out of the game stays in old saves.** Say a save was made while the game had a `hat` slot. `wearing(item)` with no slot, and the view, only look at the slots the game declares now, so the hat no longer counts as worn there. But a condition that names the slot reads the save directly, so `slotFilled('hat')` and `wearing('cap', 'hat')` still hold, and `takeOff('hat')` isn't refused and empties it. Put the slot back and the item is on again everywhere.
