# Rules and hooks

`game.rules` is where a game supplies its own logic: what the end of a turn does, what is locked, how a stat may change, which commands it handles itself. The engine calls these instead of knowing the game. **Every field is optional**; leave one out and the engine does the plain thing listed under it.

```ts
import type { GameRules } from '@ifloom/engine'

const rules: GameRules = {
  resets: { coffees: 0 },
  locks: [],
}
```

Hooks are plain functions of the state. They must not mutate it: return a new object.

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

A turn is the engine's one clock: [`state.turn`](/reference/state#turn). A turn ends on each [`turn`](/reference/effects#turn) effect, whoever applies it: a choice, an activity, or a plugin — the [calendar](/plugins/calendar#what-a-turn-is) ends one at each day its `pass` and `sleep` cross. Each time, the same steps run, in this order:

1. The turn counter goes up by one, and [`resets`](#resets) are written into the variables.
2. [`turn`](#turn)'s effects apply, in order. It is asked with the state the turn ended on: the state as the effect found it. Going to bed with the calendar, that is the state as the player went to bed, the clock still at night.
3. [`onTurn`](#onturn) runs.
4. Each [plugin](/reference/plugins#hooks)'s `turn` hook runs, in the order `game.plugins` lists them.

### turn

```ts
turn?: (state: GameState, nextTurn: number) => { effects: Effect[] }
```

**When:** at the end of each turn, with the state the turn ended on and the number of the turn about to begin.

**Does:** `effects` run in order, after the counter has moved on and [`resets`](#resets) are written. Ending a turn touches no stat by itself: a game whose energy fills back up overnight says so here, with a [`setStat`](/reference/effects#setstat) effect.

**Without it:** no effects, every stat as it was.

The end of a turn brings no messages: the engine has no phone. Messages and feeds are plugins, [messages](/plugins/messages) and [feed](/plugins/feed), and they arrive by condition after any command, going to bed included.

```ts
turn: (state, nextTurn) => ({
  effects: [
    // A late coffee costs a fifth of the night's rest.
    { kind: 'setStat', key: 'energy', to: state.flags.lateCoffee ? 80 : 100 },
    { kind: 'flag', key: 'lateCoffee', value: false },
    // Market day is every seventh day: in this game a turn is a day.
    { kind: 'flag', key: 'marketOpen', value: nextTurn % 7 === 5 },
  ],
})
```

**Gotchas.**
- It takes plain [effects](/reference/effects): no `{ custom }` and no [short calls](/reference/custom#plugincall). Write a plugin's effect in its long form, `{ kind: 'custom', name: 'quests/start', with: { quest: 'bread' } }`.
- A [`turn`](/reference/effects#turn) effect in the list does nothing: a turn's own rules cannot end another turn.

### resets

```ts
resets?: Record<string, FlagValue>
```

**When:** at the end of each turn, as the counter moves on, before [`turn`](#turn)'s effects.

**Does:** writes each of these into `state.flags`: the variables "once this turn" was counting.

**Without it:** nothing is put back.

```ts
resets: { coffees: 0, browsedMarket: false }
```

See it in the showcase: [Small Town](/guide/showcase#resets-each-turn) resets a coffee and a post a day.

### onTurn

```ts
onTurn?: (state: GameState) => GameState
```

**When:** at the end of each turn, after [`turn`](#turn)'s effects. Each [plugin](/reference/plugins#hooks)'s `turn` hook runs after it.

**Does:** anything the new turn changes that is not an effect — a stage ending, a rent coming due.

**Without it:** nothing.

```ts
onTurn: (state) =>
  state.phase === 'first-night' ? { ...state, phase: 'first-day' } : state
```

The engine keeps no time of day, so there is no curfew rule here: a curfew is the [calendar plugin](/plugins/calendar#the-guard)'s, given as its `curfew` option.

## Locks and commands

### locks

```ts
locks?: readonly Lock[]
```

What the player cannot do for now, and why, checked in order before every command. See [Locks](/reference/locks).

**Without it:** nothing is locked.

There is no `arrive` rule: the engine keeps no places. What happens on the doorstep is the [places plugin](/plugins/places)'s [`arrive`](/plugins/places#placesoptions) option, which runs after each walk by exit.

### commands

```ts
commands?: Partial<Record<Command['type'], (state: GameState, command: Command) => GameState | string>>
```

**When:** for a command of that type, after [locks](/reference/locks) and instead of the built-in handler.

**Does:** returns the next state, or a string to refuse with that reason. The engine still counts the scene left on screen as seen, and runs each plugin's `after` hook.

**Without it:** the built-in handler.

```ts
commands: {
  // Rosa does not let the player walk off with the loaf half-wrapped.
  leave: (state) =>
    state.sceneId === 'rosa.order' ? 'Rosa is still wrapping your loaf.' : { ...state, sceneId: null },
}
```

**Gotchas.** The built-in handler does not run at all, so its own refusals (scene open, unknown ids) are yours to write. `start` cannot be taken over. A `custom` entry takes over every [plugin](/reference/plugins)'s commands at once; leave it out.

## The player

A stat's ceiling is part of its declaration, not a rule: a ceiling that moves is a stat whose [`max`](/reference/stats#statmax) names a custom value.

### onStat

```ts
onStat?: (before: GameState, after: GameState, key: StatKey, by: number) => GameState
```

**When:** after every [`stat`](/reference/effects#stat) and [`setStat`](/reference/effects#setstat) effect, with the state before and after it (`after` already held to the stat's declared range). For `setStat`, `by` is the change it made. Not on an activity cost.

**Does:** return `before` to veto the change, `after` to let it stand, or `after` with more besides.

**Without it:** the change stands.

```ts
onStat: (before, after, key) =>
  key === 'fitness' && (before.stats.energy ?? 0) < 10 ? before : after
```

What the player is called, what they are like, how others see them: none of it is a rule. Keep it in [stats](/reference/stats) and [variables](/reference/state#flags), and print it in prose.

## Characters

The core has no characters, so it has no hooks for them. Which scene talking to someone opens, and its button's label, is the [cast](/plugins/cast#talkoption)'s `talk` options; what the game keeps about a person is a [stat](/reference/stats#entity-stats) declared on the cast's `character` kind.
