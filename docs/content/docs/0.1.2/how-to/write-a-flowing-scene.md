---
title: "Write a flowing scene"
description: "Write a scene that reads on as the player chooses, with decisions partway through, jumps, a minigame in place and parts that fold away."
---
Write a scene as a [flow](/docs/0.1.2/reference/glossary#flow) when it should carry on after each choice, such as a conversation or a chapter whose text builds as the player decides. Each choice the player makes stays on the page where it was made, followed by the words it brings. You need a game with at least one scene, as [Create a game](/docs/0.1.2/how-to/create-a-game) makes.

## Write the words in place

Build the scene's `body` with the builders `@ifloom/engine` exports. `text()` takes a page of words and removes the indentation its lines share, and a blank line starts a new paragraph:

```ts
import type { DataScene } from '@ifloom/engine'
import { text } from '@ifloom/engine'

export const river: DataScene = {
  id: 'ava.river',
  title: 'By the river',
  speaker: 'ava',
  body: [
    text(`
      Ava is on the bench with her shoes off, feeding the ducks the crusts of the day.

      "I told you it was the only quiet in town." She shuffles up to make room.
    `),
  ],
  choices: [{ id: 'home', label: 'Say goodnight', effects: [{ scene: null }] }],
}
```

A `{ prose: 'ava.river' }` block still works beside the builders, so you can move a scene over one block at a time.

## Stop for a decision

Put a `decide()` where the flow should wait for the player to choose. The chosen choice's `then` comes next, then the blocks after the decision:

```ts
import { choice, decide, say, text, type Block } from '@ifloom/engine'

export const evening: Block[] = [
  text(`Ava is on the bench with her shoes off, feeding the ducks.`),
  decide('evening', [
    choice('ducks', 'Ask about the ducks', { then: [say('ava', 'They know my name. I never asked theirs.')] }),
    choice('stay', 'Sit with her until the light goes', {
      effects: [{ stat: 'friendship', by: 5, of: 'character:ava' }],
      then: [text(`The water goes orange, then grey.`)],
    }),
  ]),
  text(`You walk back along the river together, as far as the bridge.`),
]
```

Either choice ends with the walk back, then the scene's own `choices`. To leave instead of rejoining, give the choice a `{ scene: null }` or `{ scene: 'park.dusk' }` effect and no `then`.

## Come back to a question

Let the player ask several questions in any order before moving on:

1. Put a `point()` before the decision.
2. Give each question a `jump()` back to it in its `effects`.
3. Hide each question once it's asked, with a `blocked` entry that has `hide: true`.
4. Keep one choice that moves on.

```ts
import { choice, decide, jump, point, say, text, type Blocked } from '@ifloom/engine'

const asked = (id: string): Blocked[] => [{ when: { chose: `ava.river#${id}` }, reason: 'You asked.', hide: true }]

export const questions = [
  text(`Ava is on the bench with her shoes off, feeding the ducks.`),
  point('bench'),
  decide('evening', [
    choice('ducks', 'Ask about the ducks', { blocked: asked('ducks'), then: [say('ava', 'They know my name.')], effects: [jump('bench')] }),
    choice('bridge', 'Ask about the bridge', { blocked: asked('bridge'), then: [say('ava', 'Older than the town.')], effects: [jump('bench')] }),
    choice('stay', 'Sit with her until the light goes'),
  ]),
  text(`You walk back along the river together.`),
]
```

A jump is only ever a choice's effect, so the flow goes round again only when the player chooses. The checker reports a decision whose every choice hides once chosen, because the flow would stop there with nothing left.

## Skip ahead

Put a `point()` inside a choice's `then` or a section, and jump to it from another choice. The flow goes straight there and reads on:

```ts
import { choice, decide, jump, point, text } from '@ifloom/engine'

export const walk = [
  decide('way', [
    choice('hill', 'Over the hill', { then: [text(`It's steep. Your legs complain.`), point('gate'), text(`The gate is open.`)] }),
    choice('lane', 'Down the lane', { then: [text(`The lane is muddy but flat.`)], effects: [jump('gate')] }),
  ]),
  text(`The farmhouse is ahead.`),
]
```

Taking the lane reads "The lane is muddy but flat.", then "The gate is open.", then "The farmhouse is ahead."

## Play a minigame or open a panel where it stands

Put `minigame('skim')` in the body to start a [minigame](/docs/0.1.2/reference/minigames) when the flow gets there. The flow waits until it ends, then reads on. `panel('prices', { stall: 'bread' })` opens a [panel](/docs/0.1.2/reference/panels) the same way and waits until the player closes it:

```ts
import { minigame, say, text, when } from '@ifloom/engine'

export const stones = [
  text(`Ava finds a flat stone and holds it out.`),
  minigame('skim'),
  when({ kv: 'skips', gte: 4 }, [say('ava', 'Show-off.')]),
  text(`The ripples reach the far bank.`),
]
```

## Fold a part away

Wrap blocks in `fold()` for a part the player opens and shuts, such as a letter they might not want to read again. A fold keeps no state:

```ts
import { fold, text } from '@ifloom/engine'

export const postcard = fold('Read the postcard', [text(`Wish you were here. The sea is cold and the chips are good. J.`)])
```

Make reading it a choice instead when it matters to the story, so the save keeps it and a replay repeats it.

## Check it worked

Run `npm run check`. It prints `No problems.` when every jump lands on a point and every decision lets the flow move on. Then play the scene with `npm run dev`. Each choice you make stays on the page where you made it, and the words it brings follow it.

The React UI renders all of this with no code from you. To render a flowing scene in a UI of your own, see [Render a flowing scene](/docs/0.1.2/how-to/render/scene#render-a-flowing-scene).

In the showcase, Small Town, the evening by the river (`ava.river` in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts)) lets you pocket a shell and ask about the ducks before you sit with Ava. For more, see:

- [Flows](/docs/0.1.2/reference/flows), with every builder and the checks.
- [Scenes](/docs/0.1.2/reference/scenes) and [blocked](/docs/0.1.2/reference/actions#blocked).
- [A scene and the room](/docs/0.1.2/explanation/turns-and-time#a-scene-and-the-room).
