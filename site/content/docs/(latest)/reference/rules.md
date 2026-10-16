---
title: "Rules and hooks"
---
`game.rules` is where your game supplies its own logic: what the end of a turn does, what's locked, how a stat may change, and which commands it handles itself. The engine calls these functions instead of knowing about your game. Every field is optional. Leave one out and the engine does the plain thing listed under it.

```ts
import type { GameRules } from '@ifloom/engine'

const rules: GameRules = {
  resets: { hadCoffee: false, postedToday: false },
  turn: () => ({ effects: [{ kind: 'setStat', key: 'energy', to: 100 }] }),
}
```

Hooks are plain functions of the state. Don't mutate the state you're given. Return a new object instead.

## GameRules

```ts
type GameRules = {
  turn?: (state: GameState, nextTurn: number) => { effects: Effect[] }
  locks?: readonly Lock[]
  resets?: Record<string, FlagValue>
  onTurn?: (state: GameState) => GameState
  commands?: Partial<Record<Command['type'], (state: GameState, command: Command) => GameState | string>>
  onStat?: (before: GameState, after: GameState, key: StatKey, by: number) => GameState
}
```

## The end of a turn

A turn is the engine's one clock, [`state.turn`](/docs/reference/state#turn). A turn ends each time a [`turn`](/docs/reference/effects#turn) effect applies, whether a choice, an activity or a plugin applies it. The [calendar](/docs/plugins/calendar#what-a-turn-is), for example, ends one each time passing time crosses into a new day (or a new period or week, if you set it up that way). Each time a turn ends, these steps run in order:

1. The turn counter goes up by one, and [`resets`](#resets) are written into the variables.
2. [`turn`](#turn)'s effects apply, in order. It's asked about the state the turn ended on, as the effect found it. When the player goes to bed with the calendar, that's the state as they went to bed, with the clock still at night.
3. [`onTurn`](#onturn) runs.
4. Each [plugin](/docs/reference/plugins#hooks)'s `turn` hook runs, in the order `game.plugins` lists them.

### turn

```ts
turn?: (state: GameState, nextTurn: number) => { effects: Effect[] }
```

**When:** at the end of each turn, with the state the turn ended on and the number of the turn about to begin.

**Does:** its `effects` run in order, after the counter has moved on and [`resets`](#resets) are written. Ending a turn doesn't touch any stat by itself, so a game whose energy fills up overnight says so here with a [`setStat`](/docs/reference/effects#setstat) effect.

**Without it:** no effects, and every stat stays as it was.

```ts
turn: (state, nextTurn) => ({
  effects: [
    // A late coffee costs a fifth of the night's rest.
    { kind: 'setStat', key: 'energy', to: state.flags.lateCoffee ? 80 : 100 },
    { kind: 'flag', key: 'lateCoffee', value: false },
    // In this game a turn is a day, and market day comes every seventh.
    { kind: 'flag', key: 'marketOpen', value: nextTurn % 7 === 5 },
  ],
})
```

**Gotchas.**
- It takes plain [effects](/docs/reference/effects), so no `{ custom }` and no [short calls](/docs/reference/custom#plugincall). Write a plugin's effect in its long form, such as `{ kind: 'custom', name: 'quests/start', with: { quest: 'settle' } }`.
- A [`turn`](/docs/reference/effects#turn) effect in the list does nothing. A turn's own rules can't end another turn.
- The end of a turn doesn't deliver messages. Those come from the [messages](/docs/plugins/messages) and [feed](/docs/plugins/feed) plugins, which deliver by condition after any command.

### resets

```ts
resets?: Record<string, FlagValue>
```

**When:** at the end of each turn, as the counter moves on and before [`turn`](#turn)'s effects.

**Does:** writes each of these values into `state.flags`. Use it for the variables that count "once this turn".

**Without it:** nothing is put back.

```ts
resets: { hadCoffee: false, postedToday: false }
```

See it in the showcase: [Small Town](/docs/guide/showcase#resets-each-turn) resets a coffee and a post a day.

### onTurn

```ts
onTurn?: (state: GameState) => GameState
```

**When:** at the end of each turn, after [`turn`](#turn)'s effects. Each [plugin](/docs/reference/plugins#hooks)'s `turn` hook runs after it.

**Does:** anything the new turn changes that isn't an effect, such as a stage of the story ending or rent coming due.

**Without it:** nothing.

```ts
onTurn: (state) =>
  state.phase === 'arrival' && state.turn > 1 ? { ...state, phase: 'open' } : state
```

A curfew isn't a rule here, because the engine keeps no time of day. It's the [calendar plugin](/docs/plugins/calendar#the-guard)'s `curfew` option.

## Locks and commands

### locks

```ts
locks?: readonly Lock[]
```

What the player can't do for now, and why. They're checked in order before every command. See [Locks](/docs/reference/locks).

**Without it:** nothing is locked.

What happens when the player arrives somewhere is the [places plugin](/docs/plugins/places)'s [`arrive`](/docs/plugins/places#placesoptions) option, not a rule.

### commands

```ts
commands?: Partial<Record<Command['type'], (state: GameState, command: Command) => GameState | string>>
```

**When:** for a command of that type, instead of the built-in handler. [Locks](/docs/reference/locks) and plugins' hard [guards](/docs/reference/plugins#guards) refuse first, and a guard's warning refuses before your handler's result is used.

**Does:** returns the next state, or a string to refuse with that reason. Everything around the handler still happens: [triggers](/docs/reference/triggers) fire, the scene left on screen counts as [seen](/docs/reference/state#seen), and each plugin's `after` hook runs.

**Without it:** the built-in handler.

```ts
import type { GameRules } from '@ifloom/engine'

const rules: GameRules = {
  commands: {
    // Ava doesn't let the player walk off mid-order.
    leave: (state) =>
      state.sceneId === 'ava.hi' && !state.flags.paid ? 'Ava is still making your coffee.' : { ...state, sceneId: null },
  },
}
```

**Gotchas.**
- Your handler must be pure. The engine calls it more than once for one command: first to see whether it refuses, then again to run it. It's also called each time a button with that command is drawn, so the view can grey the button out with the same reason.
- The built-in handler doesn't run at all, so its refusals (a scene already open, an unknown id) are yours to write.
- `start` can't be taken over.
- A `custom` entry takes over every [plugin](/docs/reference/plugins)'s commands at once, including the "no such action" refusal and each plugin command's own `whyNot`. Leave it out.

## The player

A stat's ceiling is part of its declaration, not a rule. A ceiling that moves is a stat whose [`max`](/docs/reference/stats#statmax) names a custom value.

### onStat

```ts
onStat?: (before: GameState, after: GameState, key: StatKey, by: number) => GameState
```

**When:** after every [`stat`](/docs/reference/effects#stat) and [`setStat`](/docs/reference/effects#setstat) effect on one of the player's stats, with the state before and after it. `after` is already held to the stat's declared range. For `stat`, `by` is the effect's own `by`, even when the range cut it short. For `setStat`, `by` is the change it made. It isn't called for an [entity's stat](/docs/reference/stats#entity-stats) (an effect with `of`), or when an activity's cost is paid.

**Does:** return `before` to veto the change, `after` to let it stand, or `after` with more changes of your own.

**Without it:** the change stands.

```ts
onStat: (before, after, key) =>
  key === 'charm' && (before.stats.energy ?? 0) < 10 ? before : after
```

What the player is called, and what they're like, isn't a rule either. Keep it in [stats](/docs/reference/stats) and [variables](/docs/reference/state#flags), and print it in prose.

The core has no characters, so it has no hooks for them. Which scene talking to someone opens is the [cast](/docs/plugins/cast#talkoption)'s `talk` option.

## See it in an example

Small Town: `rules` in [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) has `resets` for the coffee and the post, a `turn` hook that puts energy back to 100, and two `locks`.
