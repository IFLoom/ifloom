---
title: "Write your own condition, effect or macro"
description: "Write a condition, effect, macro or value in the game's rules, and call it from content by name with game/ in front."
---
Use this when content needs something worked out in code, such as whether it's market day or what a loaf costs today. You write the function once in the game's [rules](/docs/reference/glossary#rules), and content calls it by name with `game/` in front. A [plugin](/docs/how-to/write-a-plugin) is the better home when the system needs state of its own or more than one game uses it.

## Put the rules in src/rules.ts

Write the game's code as a [`GameRules`](/docs/reference/rules#gamerules) object in `src/rules.ts`, and pass it on the base you give `loadGame`:

```ts
import { loadGame, type GameRules } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { cafe } from './story/cafe.ts'

export const rules: GameRules = {
  conditions: { marketDay: (state) => state.turn % 7 === 5 },
}

export default defineGame({
  build: ({ unlocked }) => loadGame([stats, cafe], { id: 'small-town', title: 'Small Town', rules }, { packs: unlocked }),
})
```

In a real game the rules sit in their own file, and `src/game.ts` imports them. Each step below adds a table to the same object.

## Write a condition

Add a function to `conditions` that returns true or false. It gets the state, the arguments content wrote as `args`, and a [context](/docs/reference/custom#customcontext):

```ts
import type { Block, GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  conditions: {
    visitedAtLeast: (state, args) => (state.seen['ava.hi']?.n ?? 0) >= Number(args.times ?? 1),
  },
}

const body: Block[] = [{ text: '"The usual?" Ava is already reaching for a cup.', when: { 'game/visitedAtLeast': { times: 3 } } }]
```

Content calls it anywhere a [condition](/docs/reference/conditions) goes, such as a block's `when`, a choice's `blocked` or a lock. A call that takes no arguments is written `true`, as in `{ 'game/marketDay': true }`.

## Write a macro

A [macro](/docs/reference/glossary#macro) is an effect that stands for other effects. Return the effects from the function, and the engine applies them where the macro stands:

```ts
import type { Effect, GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  macros: {
    leaveTip: (state, args) => [{ stat: 'coins', by: -Number(args.by ?? 1) }, { stat: 'charm', by: 1 }],
  },
}

const effects: Effect[] = [{ 'game/leaveTip': { by: 2 } }, { scene: null }]
```

Prefer a macro to an effect. A button's price, a plugin's guard and a lock see the effects it returns before the button is pressed, so the player sees `2c` on the tip. A macro may return a plugin's effect or another macro, and the context's `roll(max, name)` draws a seeded number for one that varies.

## Write an effect

An effect returns the next state itself. Use one when the change isn't a list of effects, such as writing the game's own state:

```ts
import type { GameRules } from '@ifloom/engine'

type Diary = { entries: string[] }

export const rules: GameRules<Diary> = {
  start: () => ({ entries: [] }),
  effects: {
    keepDiary: (_state, args, { slice, set }) => set({ entries: [...slice.entries, String(args.text ?? '')] }),
  },
}
```

Content writes `{ 'game/keepDiary': { text: 'Met Ava at the café.' } }`. Prices, guards and locks can't see inside an effect, so keep to macros where you can. [Run code at the end of a turn](/docs/how-to/run-code-at-the-end-of-a-turn#keep-state-of-your-own) has more on `start`, `slice` and `set`.

## Write a value for prose

A value is a number or a word that prose prints. Add it to `values`:

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  values: {
    breadPrice: (state) => (state.kv.marketDay ? 4 : 5),
    catName: (state) => (typeof state.kv.catName === 'string' ? state.kv.catName : 'The cat'),
  },
}
```

Prose prints it with no prefix, `A loaf is {{breadPrice}}c today.`, with any arguments as `key=value` after the name. A stat's `max` or an app's badge names it as `{ value: 'game/breadPrice' }`.

## Type the calls

Declare what each call takes beside the rules, so content written in TypeScript is checked against it. Add each to the engine's registries:

```ts
declare module '@ifloom/engine' {
  interface ConditionRegistry {
    'game/visitedAtLeast': { times?: number }
  }
  interface EffectRegistry {
    'game/leaveTip': { by?: number } | true
    'game/keepDiary': { text: string }
  }
}
```

`{ 'game/leaveTip': { bye: 2 } }` then fails to compile. A call you don't declare still works, and takes any arguments.

## Ask them from code

A test or a tool asks your functions through the engine, as content does. [`holds`](/docs/reference/conditions#holds) asks a condition, [`amountOf`](/docs/reference/amounts#amountof) a value, and [`applyEffects`](/docs/reference/effects#applyeffects) runs effects:

```ts given
import { amountOf, applyEffects, holds } from '@ifloom/engine'

holds(state, game, { 'game/visitedAtLeast': { times: 3 } }) // false on a new game
amountOf(state, game, { value: 'game/breadPrice' }) // 5
applyEffects(state, game, [{ 'game/leaveTip': { by: 2 } }]).stats.coins
```

## Check it worked

Run `npm run check`. It reports a call to a name the rules don't have, where content writes it:

```text
content · scene ava.hi · no game condition named "game/visitedAtleast"
```

A name content writes without `game/` is reported with the fix, and a name in both `effects` and `macros` is reported as both. In play, a condition nobody declares is false and an effect nobody declares does nothing, so a broken call hides content rather than crashing.

For more, see:

- [Calls by name](/docs/reference/custom), with [`conditions`](/docs/reference/custom#conditions), [`macros`](/docs/reference/custom#macros), [`effects`](/docs/reference/custom#effects) and [`values`](/docs/reference/custom#values).
- [Rules](/docs/reference/rules) and the [registries](/docs/reference/plugin-calls#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry).
- [Content and packs](/docs/explanation/content-and-packs#rules-are-the-games-code), on why the game's code stays out of content.
