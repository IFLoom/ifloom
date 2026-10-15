# Triggers

A trigger is a list of effects that happens by itself: the first time its condition holds after a command, its effects apply. Nobody presses anything. A note under the door the morning after the player first visits the café, a reminder when the rent comes due, a scene that interrupts the walk home.

```ts
import { fireTriggers, type TriggerDef } from '@ifloom/engine'
```

## A worked example

The day after the player first sees the café, Rosa slips a welcome note under the door: a [notice](/reference/notices) says so, and the note goes into the player's [letters](/reference/collections). And every Saturday, the first time the player steps onto the high street, a notice says the market is setting up.

```ts
import { weekday } from '@ifloom/plugin-calendar'
import { at } from '@ifloom/plugin-places'

const core: Pack = {
  id: 'core',
  schema: SCHEMA,
  triggers: [
    {
      id: 'rosa-note',
      when: { since: 'cafe.first-visit', gte: 1 },
      effects: [
        { kind: 'notify', title: 'Something under the door', tag: 'post' },
        { kind: 'collect', to: 'letters', entry: { id: 'rosa.welcome', title: 'Welcome to town', text: 'letter.rosa.welcome' } },
      ],
    },
    {
      id: 'market-day',
      once: 'turn',
      when: { all: [weekday(5), at('street')] },
      effects: [{ kind: 'notify', id: 'market', title: 'The market is setting up', tag: 'town' }],
    },
  ],
  // ...
}
```

`rosa-note` fires after the first command that runs a whole [turn](/reference/state#turn) or more — here, a night's sleep, with the [calendar](/plugins/calendar#commands) — after `cafe.first-visit` was first seen, and never again. `market-day` fires at most once a turn, so once each Saturday; the fixed notice id means a second Saturday brings the same notice back rather than adding another.

```ts
state.fired  // { 'rosa-note': 3, 'market-day': 5 } — the turn each last fired
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
| `id` | Names it in [`state.fired`](/reference/state#fired) and in the loader's problems. |
| `when` | A [condition](/reference/conditions). The trigger fires when this holds and it has not already fired. |
| `effects` | What happens: plain [effects](/reference/effects), `{ custom }` references and [short plugin calls](/reference/custom#plugincall), as in a data scene choice. |
| `once` | `'game'` (the default): fires once in the whole game. `'turn'`: fires at most once a [turn](/reference/state#turn), in every turn its condition holds after a command — once a day, in a game whose turn is a day. |

Declared in [`Game.triggers`](/reference/game#game): on the base given to [`loadGame`](/reference/loader#loadgame), or in a [pack](/reference/loader#pack)'s `triggers`, or both. They merge by id, the base's first: a later pack's trigger replaces an earlier one's with the same id.

## When triggers fire

After every command that took, inside [`apply`](/reference/commands#what-happens-in-order):

1. The command runs.
2. **The triggers are tested, in the order the game lists them**, each against the state the one before it left. A trigger that holds and is due records the current turn in `state.fired`, then its effects apply.
3. The scene left on screen is counted as [seen](/reference/state#seen) — so a scene a trigger opens counts.
4. Plugins' `after` hooks run, and see what the triggers did.

There is one pass per command. A trigger that an earlier trigger makes true fires in the same pass, because it is tested later; one that a *later* trigger makes true waits for the next command.

## fireTriggers

```ts
function fireTriggers(
  state: GameState,
  game: Game,
  apply: (state: GameState, effects: Effect[]) => GameState,
): GameState
```

Runs the pass described above on `state` and returns the result. `apply` is how a trigger's effects are applied once its `{ custom }` references are flattened with [`buildEffects`](/reference/custom#buildeffects); [`applyEffects`](/reference/effects#applyeffects) is the usual choice. The reducer calls it for you. Call it yourself only from a tool, a test, or a plugin command that has moved the state in a way triggers should see before the command ends.

```ts
const next = fireTriggers(state, game, (state, effects) => applyEffects(state, game, effects))
```

## Gotchas

- **Triggers don't fire on `start`.** A new game is built, not run, so a trigger whose condition already holds on the first frame fires after the player's first command. To open the game with something, put it in the intro scene.
- **They don't fire on a refused command,** or under [`applyEffects`](/reference/effects#applyeffects), or when a game sets the state by hand.
- **Fired is fired.** A `once: 'game'` trigger never fires again, even when its condition stops holding and holds again. Only `once: 'turn'` repeats, at most once a turn. For "every time X happens", put the effects on the choice or activity that does X.
- **A trigger is tested on every command,** including ones that take no time, such as [`dismiss`](/reference/commands#dismiss). A `once: 'turn'` trigger whose condition holds all turn fires after the first command of each turn, whatever that command is.
- **A scene effect cuts in.** A trigger with `{ kind: 'scene', id }` puts that scene on screen whether or not one was open. If it should not interrupt certain scenes, add `{ not: { scene: [...] } }` naming them to its `when`.
- `text` in a `notify` or `collect` effect is a prose key. The loader checks it.
