# Wardrobe

`@ifloom/plugin-wardrobe` keeps track of what the player has on. The game says which slots there are, such as a coat and boots, armour and a ring, or a uniform and a cap. Content says which item goes in which slot.

Clothes are ordinary [items](/reference/game#itemdef). Wearing one does not change how many the player has: the wardrobe only marks what is on. Putting something on takes off whatever was in its slot, and something the player no longer has comes off by itself.

```ts
import {
  wardrobe, wearing, slotFilled, wear, takeOff, clothes,
  type WardrobeOptions, type WardrobeSlot, type ClothingDef, type WardrobeState, type WardrobeView,
} from '@ifloom/plugin-wardrobe'
```

## Install

Add the package beside the engine, and add `wardrobe(...)` to the game's `plugins`. See [Adding one](/plugins/#adding-one).

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/plugin-wardrobe": "file:../ifloom/packages/plugin-wardrobe"
  }
}
```

## wardrobe

```ts
function wardrobe(options: WardrobeOptions): DefinedPlugin<WardrobeState>
```

The plugin, with the id `wardrobe`. Call it once, when the game is built, with the slots the game has.

```ts
const { game } = loadGame(packs, {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro.wake',
  plugins: [
    places({ start: 'house' }),
    wardrobe({
      slots: [
        { id: 'coat', label: 'Coat' },
        { id: 'feet', label: 'Feet' },
      ],
      start: { feet: 'trainers' },
    }),
  ],
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
| `start` | What the player has on in a new game: an item id by slot id. A slot left out starts empty. The player must start owning each of these items; see [Checks](#checks). |

### WardrobeSlot

```ts
type WardrobeSlot = { id: string; label: string }
```

| Field | What it is |
|---|---|
| `id` | What content and commands name the slot by. Unique among the slots. |
| `label` | What the player reads. |

The slots are code, not content: a mod cannot add one.

## Writing clothes

Clothes are content. List them in a pack's [`data`](/reference/loader#pack) under `wardrobe.clothes`. They are merged by id as scenes are, so a mod can add clothing or move a piece to another slot.

### ClothingDef

```ts
type ClothingDef = { id: string; slot: string }
```

| Field | What it is |
|---|---|
| `id` | An [item](/reference/game#itemdef) id. The item is declared as usual, in `items`. |
| `slot` | The slot it goes in. One slot per piece of clothing. |

```ts
const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  items: [
    { id: 'trainers', name: 'trainers', desc: 'Comfortable, not waterproof.', kind: 'stuff', start: 1 },
    { id: 'raincoat', name: 'raincoat', desc: 'Yellow, with a hood.', kind: 'gear' },
  ],
  data: {
    places: {
      locations: [
        // house ...
        {
          id: 'market', name: 'Market', tag: 'Market', kind: 'street', exits: ['house'], art: '',
          body: [{ text: 'market/rain' }, { text: 'market/dry', when: wearing('raincoat') }],
        },
      ],
    },
    wardrobe: {
      clothes: [
        { id: 'raincoat', slot: 'coat' },
        { id: 'trainers', slot: 'feet' },
      ],
    },
  },
}
```

## A worked example

A wet day in a small town. The player starts in trainers with a raincoat on the hook. The towpath past the market is only open to someone in wellies, and the market reads differently with the hood up.

```ts
import { SCHEMA, need, type Pack } from '@ifloom/engine'
import { onlyAt } from '@ifloom/plugin-places'
import { wearing } from '@ifloom/plugin-wardrobe'

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  // stats (coins, fitness) ...
  items: [
    { id: 'trainers', name: 'trainers', desc: 'Comfortable, not waterproof.', kind: 'stuff', start: 1 },
    { id: 'wellies', name: 'wellies', desc: 'Green, and a size too big.', kind: 'stuff' },
    { id: 'raincoat', name: 'raincoat', desc: 'Yellow, with a hood.', kind: 'gear' },
  ],
  activities: [
    { id: 'buyWellies', requires: [onlyAt(['market'])], cost: { stats: { coins: 8 } }, effects: [{ kind: 'item', id: 'wellies', by: 1 }] },
    {
      id: 'walkTowpath',
      requires: [onlyAt(['market']), need('The towpath is ankle-deep in mud.', wearing('wellies'))],
      effects: [{ kind: 'stat', key: 'fitness', by: 1 }],
    },
  ],
  prose: { 'market/rain': 'Rain drums on the awnings.', 'market/dry': 'You are dry under the hood.' /* ... */ },
  data: {
    wardrobe: {
      clothes: [
        { id: 'raincoat', slot: 'coat' },
        { id: 'trainers', slot: 'feet' },
        { id: 'wellies', slot: 'feet' },
      ],
    },
  },
}
```

With the plugin added as under [`wardrobe`](#wardrobe), it plays like this:

```ts
const closet = (state: GameState) => view(state, game).plugins.wardrobe as WardrobeView

closet(state).slots   // [{ id: 'coat', label: 'Coat', item: null, name: null },
                      //  { id: 'feet', label: 'Feet', item: 'trainers', name: 'trainers' }]
closet(state).spare   // [{ id: 'raincoat', name: 'raincoat', slot: 'coat' }]

state = apply(state, game, wear('raincoat')).state
holds(state, wearing('raincoat'), game)    // true
state.items.raincoat                       // 1: wearing it does not use it up

state = apply(state, game, go('market')).state   // go, from @ifloom/plugin-places
view(state, game).scene.body               // 'Rain drums on the awnings.\n\nYou are dry under the hood.'
whyNot(state, game, { type: 'activity', id: 'walkTowpath' })   // 'The towpath is ankle-deep in mud.'

state = apply(state, game, { type: 'activity', id: 'buyWellies' }).state
state = apply(state, game, wear('wellies')).state                // the trainers come off
closet(state).spare   // [{ id: 'trainers', name: 'trainers', slot: 'feet' }]
whyNot(state, game, { type: 'activity', id: 'walkTowpath' })   // undefined

apply(state, game, wear('wellies')).refused   // 'You are already wearing the wellies.'
state = apply(state, game, takeOff('coat')).state
holds(state, slotFilled('coat'), game)        // false
```

## Condition

| Content writes | Helper | Holds when |
|---|---|---|
| `{ custom: 'wardrobe/wearing', with: { item } }` | `wearing(item)` | The item is on, in whichever slot. |
| `{ custom: 'wardrobe/wearing', with: { item, slot } }` | `wearing(item, slot)` | That item is on in that slot. |
| `{ custom: 'wardrobe/wearing', with: { slot } }` | `slotFilled(slot)` | Something is in that slot. |

Use it anywhere a [condition](/reference/conditions) goes: a block's `when`, a choice, a requirement, a lock. Short, with the full name as the only key, `{ 'wardrobe/wearing': { item: 'wellies' } }` is the same as the first row (see [plugin calls](/reference/custom)). With neither `item` nor `slot`, it is false. An unknown item or slot is false.

To ask whether the player has an item at all, worn or not, use the engine's [`{ has }`](/reference/conditions#has).

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'wardrobe/wear', with: { item } }` | `wear(item)` | Puts the item on in its slot, in place of whatever was there. What comes off stays the player's. |
| `{ type: 'custom', name: 'wardrobe/takeOff', with: { slot } }` | `takeOff(slot)` | Empties the slot. |

`wardrobe/wear` is refused, in this order, with:

- `There is no such thing.` when no item has that id;
- `The <name> is not something you wear.` when the item is not among the clothes;
- `You are already wearing the <name>.`;
- `You have no <name>.`

`wardrobe/takeOff` is refused with `There is nothing to take off.` when the slot is empty or there is no such slot.

Each line can be reworded; see [Strings](#strings).

Both go through [locks](/reference/locks) like any command. A lock names them `wardrobe/wear` and `wardrobe/takeOff`, or both at once as `wardrobe/*`.

## Strings

The plugin's lines in the [strings table](/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key. `{item}` is the item's name.

| Key | English |
|---|---|
| `wardrobe/notClothing` | `The {item} is not something you wear.` |
| `wardrobe/alreadyWearing` | `You are already wearing the {item}.` |
| `wardrobe/nothingToTakeOff` | `There is nothing to take off.` |

`wardrobe/wear` also says two of the engine's own lines, so they read the same as everywhere else and are reworded with them: [`noSuchThing`](/reference/strings#refusals) (`There is no such thing.`) and [`haveNone`](/reference/strings#refusals) (`You have no {item}.`).

```ts
strings: { 'wardrobe/alreadyWearing': 'The {item} is already on.' }
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
| `slots` | Every slot, in the order the game declared them. `item` is the id of what is in it and `name` is that item's name, or both are `null`. |
| `spare` | Clothes the player has and is not wearing, in the order they are listed in `wardrobe.clothes`. `slot` is where each would go. |

What the player wears is also in the engine's [`view().pack`](/reference/view#the-player-s-numbers-and-things), since they still have it. A UI that wants the bag without the clothes on leaves out the ids in `slots`.

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

- clothing whose id is not an item (`clothes <id>`, `no item has this id`);
- clothing for a slot the game does not have (`clothes <id>`, `no slot called "…"`);
- a `start` slot the game does not have (`start <slot>`, `no slot by this name`);
- a `start` item that is not clothing for that slot (`start <slot>`, `"…" is not clothing for this slot`);
- a `start` item the player does not start with (`start <slot>`, `the player does not start with "…"`).

Clothing problems are pinned on the pack that brought the entry. `start` problems are pinned on `base`.

```text
mod:winter · clothes scarf · no slot called "neck"
base · start feet · the player does not start with "trainers"
```

## Gotchas

- **The player has to start owning what they start wearing.** An item in `start` needs a `start` count above 0, or `kind: 'gear'`, which starts at 1. Otherwise the load reports it.
- **Losing an item takes it off after the command.** Sold, used up or taken by an effect: once the player has none, the plugin's `after` [hook](/reference/plugins#hooks) empties its slot at the end of the command. Until then, within the same command, `wardrobe/wearing` still holds. [`applyEffects`](/reference/effects#applyeffects) runs no hooks, so a state made with it can show something on that the player no longer has.
- **`{ has }` counts worn items.** Worn clothes are still owned, so `{ has: 'raincoat' }` and `{ item: 'raincoat' }` hold while it is on. To ask whether it is on, use `wearing`.
- **Wearing does not check where the player is or what is on screen.** Both commands work with a scene open and in any location. To stop the player changing somewhere, add a lock: `{ when: at('cafe'), deny: ['wardrobe/*'], reason: 'Not in the middle of the café.' }`.
- **One of each in a slot.** The wardrobe marks an item id as on, not a count. A player with two raincoats wears one; selling one leaves it on.
- **A slot taken out of the game is ignored, not cleared.** A save made while the game had a `hat` slot keeps whatever was in it, but `wardrobe/wearing` and the view only look at the slots the game declares now. Put the slot back and the item is on again.
