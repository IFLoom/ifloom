---
title: "7. Buy something"
description: "Step 7 of the town tutorial. Adds a coffee to the café as an action with a price in coins, which the game refuses while the café is shut, with the reason on its button."
---
By the end of this step the café sells a coffee for 4 coins that gives back 20 energy, and the button says why when the player can't buy one.

## Sell a coffee at the café

A button that a location offers outside a scene is an action. It has the fields a choice has, an `id`, a `label` and `effects`, and the room shows it while no scene is open. Replace `src/story/cafe.ts` with this, which adds the café's `actions`:

::include[../../../../../snippets/tutorial/town/story/cafe.ts]

The coffee's `cost` is its price, 4 coins. The engine charges it before the effects run, and only a stat you marked `spendable` in step 3 can be spent this way. The button shows the price, `4c`, written with the stat's `format`. When the player has fewer than 4 coins, the engine refuses the action with the stat's `lacking` line, "Not enough on you."

## Refuse it while the café is shut

The coffee's `blocked` works like the café's own. While its condition holds, the engine refuses the action and the button shows the `reason`. The café keeps the player out after the afternoon, but a player already inside stays, so the counter needs its own hours too.

The page renders actions already, in every template, so there's nothing to add to the UI. [Actions](/docs/reference/actions#actiondef) lists every field an action has, and [State, commands and the view](/docs/explanation/state-and-commands#locks-and-blocked-reasons) explains refusals.

:::tip[Checkpoint]
Start a new game and walk to the café. **Buy a coffee** shows its price, 4c. Buy two, and your coins drop to 2c while your energy climbs. The button then greys out with "Not enough on you." Press **Wait a while** twice, and the reason on the button changes to "The café is closed."
:::
