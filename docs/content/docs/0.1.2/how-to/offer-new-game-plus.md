---
title: "Offer New Game+"
description: "Let a player who finished the game start again with some of their stats, kv keys and things, and write lines only a second run shows."
---
Use this to let a player who has finished your game start again with a little of what they had, such as their coins or a memory of the first read. You need an ending first, as [End the game](/docs/0.1.2/how-to/end-the-game) shows.

## Say when the game is finished

Give your content a `finished` condition. After each command the runner tests it, and the first time it holds, the runner records the time in the player's [profile](/docs/0.1.2/reference/profile) under `core:finished`. The record outlives every save. The Letter, the novel example, counts either of its two endings:

```ts
import type { Content } from '@ifloom/engine'

export const endings: Content = {
  finished: { scene: ['end.kept', 'end.posted'] },
}
```

## Choose what carries over

List player stats and kv keys in your content's `carryOver`, a [`CarryOver`](/docs/0.1.2/reference/state#carryover):

```ts
import type { Content } from '@ifloom/engine'

export const nextRun: Content = {
  carryOver: { stats: ['coins'], kv: ['readBefore'] },
}
```

Things the player has belong to the plugin that keeps them, and each plugin carries its own with its [`carry`](/docs/0.1.2/reference/plugin-api#carry). The inventory takes a `carryOver` option, the things to keep or `'all'`:

```ts fragment
plugins: [inventory({ carryOver: ['clothing:umbrella'] })]
```

A game that keeps things in kv keys lists those keys in `carryOver.kv` instead.

A New Game+ starts like any new game, then copies these from the finished game's state:

- **Each stat** in `stats`, held to its range.
- **Each kv key** in `kv` that is set.
- **What each plugin carries**, such as the things the inventory's `carryOver` lists. A thing made in play, such as a photo, comes with its record.

Nothing else comes across. The turn, the scenes seen, the storylines, the entities and the state of every plugin that carries nothing all start fresh.

## Write lines for a second run

Set a kv key as the player reaches an ending, carry it over, and read it where the story should know. The Letter sets `readBefore` on each ending's choice, and its first chapter has a line only a second reader sees:

```ts fragment
{ id: 'post', label: 'Post it back', effects: [{ kv: 'readBefore', to: true }, { scene: 'end.posted' }] }

body: [
  { text: 'The flat still smells of someone else’s cooking.' },
  { text: 'You have the oddest feeling you have stood here before.', when: { kv: 'readBefore' } },
],
```

## Offer it to the player

The React UI's title screen shows a New Game+ button once `core:finished` is in the profile and the game has a `carryOver`. Turn the title screen on with `pages`, as [Add a title screen](/docs/0.1.2/how-to/add-a-title-screen) shows. The button carries over from the newest save, or from the game in play if there's no save.

On a title screen of your own, offer it once the profile has `core:finished`, and start it with [`runner.newGame({ carry })`](/docs/0.1.2/reference/runner#newgame), where `carry` is the state to carry over from:

```ts given
const finished = await runner.profile?.get<{ at: number }>('core:finished')
if (finished) {
  const listed = await runner.saves?.list()
  const newest = listed?.ok ? listed.value.find((save) => !('broken' in save)) : undefined
  const save = newest ? await runner.saves?.read(newest.slot) : undefined
  await runner.newGame({ carry: save?.ok && save.value ? save.value.state : runner.state })
}
```

Carry from the state the player finished on. The profile records only when the game was finished, not the state, so after a reload, read it from the newest save as above.

## Check it worked

Run `npm run check`. It reports a stat in `carryOver` the game doesn't declare or that belongs to a kind:

```text
content · carryOver · unknown stat "gold"
```

Then play in `npm run dev` to an ending, go back to the title screen, and press New Game+. The line for a second reader shows in the first scene.

For more, see:

- [`CarryOver`](/docs/0.1.2/reference/state#carryover) and [`newGame`](/docs/0.1.2/reference/runner#newgame).
- [Profile](/docs/0.1.2/reference/profile), with its `core:finished` key.
- [End the game](/docs/0.1.2/how-to/end-the-game#know-what-a-new-game-keeps), for what a plain new game keeps.
