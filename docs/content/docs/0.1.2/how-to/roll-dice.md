---
title: "Roll dice for a check"
description: "Roll dice against a target from a link in the prose, with a line for each outcome and a stat added to the roll."
---
Use this for a check, a roll against a target, such as two dice for skimming a stone or a d20 plus strength for climbing a wall. The steps build the showcase park's skimming stones. The player clicks a link in the line, the dice land, and the next line says how it went.

## Roll the dice

Give an action the [`roll` effect](/docs/0.1.2/reference/rolls#roll), with the dice and the target. Here a location's action rolls `2d6` against 8:

```ts
import type { ActionDef } from '@ifloom/engine'

export const skim: ActionDef = {
  id: 'skim',
  label: 'Skim a stone',
  effects: [
    { kv: 'skimmed', to: true },
    { roll: 'skim', dice: '2d6', against: 8 },
  ],
}
```

The engine keeps the total in the [kv store](/docs/0.1.2/reference/glossary#kv) under `skim` and records the roll, which passes on 8 or more. Each try rolls afresh, and a replay of the save rolls the same dice. The `skimmed` key marks the day of the throw, for the next step.

## Write a line for each outcome

Give each outcome a block whose `when` reads the roll with the [`roll` condition](/docs/0.1.2/reference/conditions#roll). Add `ui: { dice: 'skim' }` to show the dice directly above that line in the React UI, which holds the line back until they settle:

```ts
import { text, type Block, type Condition } from '@ifloom/engine'

const skimmed = (when: Condition, words: string): Block => text(words, { when: { all: [{ kv: 'skimmed' }, when] }, ui: { dice: 'skim' } })

export const outcomes: Block[] = [
  skimmed({ roll: 'skim', critical: 'max' }, 'Skip after skip, clean to the far bank.'),
  skimmed({ roll: 'skim', passed: true, critical: false }, 'The stone skips once, twice, again, and sinks most of the way across.'),
  skimmed({ roll: 'skim', passed: false }, 'Plop. It goes straight in, and the ducks look delighted.'),
]
```

`critical: 'max'` holds when every die showed its top face, a double six here. The engine keeps the latest roll under each key until the next one, so the `skimmed` key keeps these lines to the day of the throw. List it in your content's [`resets`](/docs/0.1.2/reference/rules#resets) as `{ skimmed: false }`, and it goes back each day.

## Put the link in the line

Link the action from the location's text with `[[act:skim|…]]`, so the player rolls from the sentence:

```ts
import { text } from '@ifloom/engine'

export const stones = text('Flat stones lie along the water’s edge. [[act:skim|Try to skim a stone]].')
```

Put the outcomes after this line in the location's `body`. [Put a choice inside a line of text](/docs/0.1.2/how-to/put-a-choice-in-a-line) has the markup.

## Add a stat to the roll

Give `plus` an [amount](/docs/0.1.2/reference/glossary#amount), such as the player's stat with its modifiers:

```ts fragment
{ roll: 'climb', dice: '1d20', plus: { stat: 'strength' }, against: 12 }
```

Notation can carry its own number too, `'2d6+1'`, and `plus` adds to it. A roll with no `against` is a number with no outcome, so branch on the total with `{ kv: 'climb', gte: 15 }`, and print it in a line with `{{climb}}`.

## Roll without a click

Any effect list can roll, so the game can roll by itself. The showcase counts the ducks as you arrive at the park, with a [trigger](/docs/0.1.2/reference/triggers):

```ts
import type { TriggerDef } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const ducks: TriggerDef = { id: 'ducks', once: { per: 'turn' }, when: places.at('park'), effects: [{ roll: 'ducks', dice: '1d6+2' }] }
```

A line `{{ducks}} of them paddle over at once.` with `when: { roll: 'ducks' }` prints the count. No block has a `dice` hint for `ducks`, so the React UI shows those dice for a moment over the scene, in its [`DiceOverlay`](/docs/0.1.2/reference/react/components#diceoverlay).

## Check it worked

Run `npm run check`, which reports dice notation the engine can't read and a `plus` or `against` that names an unknown stat. Then click the link in `npm run dev`. The dice tumble above the line, settle on the faces rolled with the total and Passed or Failed, and the line for the outcome appears. Each preset draws the dice its own way, such as `[4] [6] = 10` in Terminal.

To render rolls in a UI of your own, see [Render dice rolls](/docs/0.1.2/how-to/render/stats-and-things#render-dice-rolls).

In the showcase, Small Town, the stones and the ducks are in [`examples/showcase/src/story/park.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/park.ts), and its tests play the check. For more, see:

- [Dice rolls](/docs/0.1.2/reference/rolls), with `Dice`, `Roll` and the checks.
- The [`roll` condition](/docs/0.1.2/reference/conditions#roll) and the React UI's [`dice` hint](/docs/0.1.2/reference/react/hints#dice).
- [The same save gives the same draws](/docs/0.1.2/explanation/design#the-same-save-gives-the-same-draws).
