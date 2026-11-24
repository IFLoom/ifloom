---
title: "7. Buy something"
description: "Sell a coffee at the café for coins, refused with a reason on its button while the café is shut."
---
By the end of this step the café sells a coffee for 4 coins that gives back 20 energy, and the button says why when the player can't buy one.

## Sell a coffee at the café

A button that a location offers outside a scene is an action. It has the fields a choice has, an `id`, a `label` and `effects`, and the room shows it while no scene is open. Replace `src/story/cafe.ts` with this, which adds the café's `actions`:

```ts
// src/story/cafe.ts
import { text, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'

export const cafe: Content = {
  entities: [
    places.location({
      id: 'cafe',
      name: 'The corner café',
      description: 'Café',
      exits: ['high-street'],
      blocked: [{ when: { not: calendar.period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
      body: [
        text('Steam on the windows.'),
        text('Ruth is behind the counter, flour to the elbows.', { when: cast.here('ruth') }),
        text('The counter is empty.', { when: { not: cast.here('ruth') } }),
      ],
      actions: [
        {
          id: 'coffee',
          label: 'Buy a coffee',
          cost: { stats: { coins: 4 } },
          blocked: [{ when: { not: calendar.period('morning', 'afternoon') }, reason: 'The café is closed.' }],
          effects: [{ stat: 'energy', by: 20 }],
        },
      ],
    }),
  ],
  scenes: [
    {
      id: 'ruth.talk',
      speaker: 'ruth',
      body: [
        text('"Hello, love. What can I get you?"'),
        text('She is already reaching for your usual cup.', { when: { stat: 'friendship', of: cast.character('ruth'), gte: 5 } }),
      ],
      choices: [
        {
          id: 'chat',
          label: 'Ask how the bread is going',
          once: { per: 'turn', reason: 'She has a queue.' },
          effects: [{ stat: 'friendship', by: 5, of: cast.character('ruth') }, { scene: null }],
        },
        { id: 'bye', label: 'Just looking, thanks', effects: [{ scene: null }] },
      ],
    },
  ],
}
```

The coffee's `cost` is its price, 4 coins. The engine charges it before the effects run, and only a stat you marked `spendable` in step 3 can be spent this way. The button shows the price, `4c`, written with the stat's `format`. When the player has fewer than 4 coins, the engine refuses the action with the stat's `lacking` line, "Not enough on you."

## Refuse it while the café is shut

The coffee's `blocked` works like the café's own. While its condition holds, the engine refuses the action and the button shows the `reason`. The café keeps the player out after the afternoon, but a player already inside stays, so the counter needs its own hours too.

The page renders actions already, in every template, so there's nothing to add to the UI. [Actions](/docs/0.1.0/reference/actions#actiondef) lists every field an action has, and [State, commands and the view](/docs/0.1.0/explanation/state-and-commands#locks-and-blocked-reasons) explains refusals.

:::tip[Checkpoint]
Start a new game and walk to the café. **Buy a coffee** shows its price, 4c. Buy two, and your coins drop to 2c while your energy climbs. The button then greys out with "Not enough on you." Press **Wait a while** twice, and the reason on the button changes to "The café is closed."
:::
