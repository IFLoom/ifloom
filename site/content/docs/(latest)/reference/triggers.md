---
title: "Triggers"
---
A trigger is a list of effects that happens by itself. The first time its condition holds after a command, its effects apply, without the player pressing anything. Use one for a note under the door the first time the player steps out, a bill that comes due, or a scene that interrupts the walk home.

```ts
import { fireTriggers, type TriggerDef } from '@ifloom/engine'
```

## A worked example

These are the showcase's two triggers. The first time the player steps onto the high street, Sam's welcome note turns up: a [notice](/docs/reference/notices) says so, and the note goes into the player's [notes](/docs/reference/collections). Every Sunday from the first week on, the rent goes out.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'
import { day, weekday } from '@ifloom/plugin-calendar'
import { at } from '@ifloom/plugin-places'

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  collections: [{ id: 'notes', name: 'Notes' }],
  triggers: [
    {
      id: 'welcome',
      when: at('high-street'),
      effects: [
        { kind: 'notify', title: 'A note under your door', text: 'notice.welcome', tag: 'post' },
        { kind: 'collect', to: 'notes', entry: { id: 'welcome', title: 'Welcome note', text: 'notice.welcome' } },
      ],
    },
    {
      id: 'rent',
      once: 'turn',
      when: { all: [weekday(6), day({ gte: 6 })] },
      effects: [
        { kind: 'stat', key: 'coins', by: -30 },
        { kind: 'notify', id: 'rent', title: 'Rent paid: 30 coins', tag: 'money' },
      ],
    },
  ],
  prose: { 'notice.welcome': 'Welcome to the building! Bins go out Thursday.' },
}
```

`welcome` fires after the first command that leaves the player on the high street, and never again. `rent` fires at most once a turn. A turn is a day in the showcase, so it fires once each Sunday. Its fixed notice id means the next Sunday's notice replaces the last one instead of adding another.

```ts
state.fired  // { welcome: 1, rent: 6 }: the turn each one last fired in
```

## TriggerDef

```ts
type TriggerDef = {
  id: string
  when: Condition
  effects: EffectRef[]
  once?: 'game' | 'turn'
}
```

| Field | What it does |
|---|---|
| `id` | Names it in [`state.fired`](/docs/reference/state#fired) and in the loader's problems. |
| `when` | A [condition](/docs/reference/conditions). The trigger fires when this holds and it hasn't already fired. |
| `effects` | What happens: plain [effects](/docs/reference/effects), `{ custom }` references and [short plugin calls](/docs/reference/custom#plugincall), as in a data scene choice. |
| `once` | `'game'` (the default) fires once in the whole game. `'turn'` fires at most once a [turn](/docs/reference/state#turn), in every turn its condition holds after a command. In a game whose turn is a day, that's once a day. |

Declare triggers in [`Game.triggers`](/docs/reference/game#game), either on the base you give [`loadGame`](/docs/reference/loader#loadgame) or in a [pack](/docs/reference/loader#pack)'s `triggers`, or both. They merge by id with the base's first, so a later pack's trigger replaces an earlier one with the same id.

## When triggers fire

After every command that took, inside [`apply`](/docs/reference/commands#what-happens-in-order):

1. The command runs.
2. The triggers are tested in the order the game lists them, each against the state the one before it left. A trigger that holds and is due records the current turn in `state.fired`, then its effects apply.
3. The scene left on screen is counted as [seen](/docs/reference/state#seen), so a scene a trigger opens counts.
4. Plugins' `after` hooks run, and see what the triggers did.

There's one pass per command. A trigger that an earlier trigger makes true fires in the same pass, because it's tested later. One that a later trigger makes true waits for the next command.

## fireTriggers

```ts
function fireTriggers(
  state: GameState,
  game: Game,
  apply: (state: GameState, effects: Effect[]) => GameState,
): GameState
```

Runs the pass described above on `state` and returns the result. `apply` applies a trigger's effects once its `{ custom }` references are flattened with [`buildEffects`](/docs/reference/custom#buildeffects). [`applyEffects`](/docs/reference/effects#applyeffects) is the usual choice. The reducer calls `fireTriggers` for you. Only call it yourself from a tool, a test, or a plugin command that has moved the state in a way triggers should see before the command ends.

```ts
import { applyEffects, fireTriggers } from '@ifloom/engine'

const next = fireTriggers(state, game, (state, effects) => applyEffects(state, game, effects))
```

## Gotchas

- **Triggers don't fire on `start`.** A new game is built, not run, so a trigger whose condition already holds on the first frame fires after the player's first command. To open the game with something, put it in the intro scene.
- **They don't fire on a refused command.** Nor do they fire under [`applyEffects`](/docs/reference/effects#applyeffects), or when a game sets the state by hand.
- **Fired is fired.** A `once: 'game'` trigger never fires again, even when its condition stops holding and holds again. Only `once: 'turn'` repeats, at most once a turn. For "every time X happens", put the effects on the choice or activity that does X.
- **A trigger is tested on every command.** That includes ones that take no time, such as [`dismiss`](/docs/reference/commands#dismiss). A `once: 'turn'` trigger whose condition holds all turn fires after the first command of each turn, whatever that command is.
- **A scene effect cuts in.** A trigger with `{ kind: 'scene', id }` puts that scene on screen whether or not one was open. If it shouldn't interrupt certain scenes, add `{ not: { scene: [...] } }` naming them to its `when`.
- **`text` in a `notify` or `collect` effect is a prose key.** The [content checker](/docs/reference/checks) reports one with no prose.

## See it in an example

- Small Town: [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts) has three triggers. `visitors` runs `once: 'turn'`, `welcome` runs once, and `rent` charges 30 coins on Sundays.
- The Corner Café: [`examples/cafe/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/game.ts) watches the till and the staff with `overdrawn`, `empty` and `review`.
