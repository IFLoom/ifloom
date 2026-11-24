---
title: "Let the player get dressed"
description: "Give the player clothes with the wardrobe plugin, start them dressed, give them somewhere to change and make the story notice what they wear."
---
Use this when what the player wears matters to the story, such as a raincoat people notice or a bench that's too cold without a scarf. You need the [wardrobe plugin](/docs/reference/plugins/wardrobe) (see [Add a plugin](/docs/how-to/add-a-plugin)). The player wears only what they hold, so the clothes are [things](/docs/how-to/give-the-player-things), and the wardrobe only marks which of them are on.

## Declare the slots and the clothes

List the slots in `data.wardrobe.slots`, in the order the UI lists them. Give each piece of clothing the `wardrobe/wearable` trait with `wardrobe.wearable(slot)`. The showcase's player starts in a raincoat:

```ts
import type { Content } from '@ifloom/engine'
import { wardrobe } from '@ifloom/plugin-wardrobe'

export const things: Content = {
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

A slot's `start` is what the player has on in a new game, and the player must start holding it, here with the raincoat's `at: 'player'`. The clothing kind is `unique` because each coat is one particular coat. A kind that stacks works too, and the player then wears one of what they hold.

## Give the player clothes

Clothes reach the player as any thing does. The showcase's market sells a scarf from a high street action:

```ts
import { give, holding, type ActionDef } from '@ifloom/engine'

export const buyScarf: ActionDef = {
  id: 'scarf',
  label: 'Buy a scarf at the market',
  cost: { stats: { coins: 8 } },
  blocked: [{ when: holding('clothing:scarf'), reason: 'You have one.' }],
  effects: [give('clothing:scarf')],
}
```

A vendor of the [shop plugin](/docs/reference/plugins/shop) sells it the same way when the scarf is among its goods. A thing the player gives away, sells or drops comes off by itself.

## Give the player a place to change

Give a location the `wardrobe/closet` trait. While the player is there, the room offers a button that opens the `wardrobe` panel, where they put things on and take them off:

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

Without a `label` the button reads `Wardrobe`. The closet needs the [places plugin](/docs/reference/plugins/places). Any choice or action opens the same panel with `{ panel: 'wardrobe' }`, as [Open a shop, a job board or another panel](/docs/how-to/open-a-panel) describes. A button of your own can also send `wardrobe.wear('clothing:scarf')` or `wardrobe.takeOff('coat')`.

## Make the story notice

Read what the player has on with `wardrobe.wearing(thing)`, anywhere a condition goes. People in the café notice the raincoat, and the bench by the river is too cold without a scarf:

```ts
import { need, type ActionDef, type Block } from '@ifloom/engine'
import { wardrobe } from '@ifloom/plugin-wardrobe'

export const noticed: Block = { text: 'Someone points at your raincoat and grins. It is very yellow.', when: wardrobe.wearing('clothing:raincoat') }

export const bench: ActionDef = {
  id: 'bench',
  label: 'Sit on the bench by the river',
  blocked: [need('Too cold without a scarf.', wardrobe.wearing('clothing:scarf'))],
  effects: [{ stat: 'energy', by: 5 }],
}
```

`wardrobe.wearing('clothing:scarf', 'neck')` asks for one slot, and `wardrobe.slotFilled('coat')` holds while anything is in it. A thing that's worn is still held, so `holding('clothing:raincoat')` holds while the raincoat is on.

## Dress each protagonist

In a game where the player switches between people with the [`you`](/docs/reference/effects#you) effect, the wardrobe keeps what each one has on. Switching to Sam shows Sam's clothes, and switching back shows the player's as they were left. `wardrobe.wearing()` reads whoever the player is playing now.

## Check it worked

Run `npm run check`. It reports a wearable thing whose slot the game doesn't have, and a slot's `start` that the player doesn't start holding:

```text
content · slots coat · starts with "clothing:raincoat", which the player does not start holding
```

Then play in `npm run dev`. The café's line about the raincoat shows, the bench is greyed out with `Too cold without a scarf.`, and once you buy the scarf and put it on at the flat, the bench opens. To render the wardrobe in a UI of your own, see [Render what the player wears](/docs/how-to/render/things-plugins#render-what-the-player-wears).

In the showcase, Small Town, the clothes and slots are in [`examples/showcase/src/world/things.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/things.ts) and the closet in `src/story/flat.ts`. For more, see:

- [Wardrobe](/docs/reference/plugins/wardrobe), with [`WardrobeSlot`](/docs/reference/plugins/wardrobe#wardrobeslot), the [`Wearable`](/docs/reference/plugins/wardrobe#wearable) and [`Closet`](/docs/reference/plugins/wardrobe#closet) traits, and the [`wardrobe/wearing`](/docs/reference/plugins/wardrobe#wardrobewearing) condition.
- [Give the player things to hold and use](/docs/how-to/give-the-player-things).
- [Traits give entities meaning](/docs/explanation/entities-and-traits#traits-give-entities-meaning).
