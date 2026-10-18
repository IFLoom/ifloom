---
title: "Rules and hooks"
description: "game.rules: the end of a turn and a day's rollover (onTurn, onTurnDone), resets, locks, the game's own command handlers, and onStat."
---
`game.rules` is where your game supplies its own logic: what the end of a turn does, what's locked, how a stat may change, and which commands it handles itself. The engine calls these functions instead of knowing about your game. Every field is optional. Leave one out and the engine does the plain thing listed under it.

```ts
import type { GameRules } from '@ifloom/engine'

const rules: GameRules = {
  resets: { hadCoffee: false, postedToday: false },
  onTurn: (state, { apply }) => apply([{ kind: 'stat', stat: 'energy', to: 100 }]),
}
```

The hooks are named as a [plugin's](/docs/reference/plugins#hooks-and-providers) are: `on` and the event they run at, and each returns the next state. Hooks are plain functions of the state. Don't mutate the state you're given. Return a new object instead.

## GameRules

```ts
type GameRules = {
  locks?: readonly Lock[]
  resets?: Record<string, KvValue>
  onTurn?: (state: GameState, context: TurnContext) => GameState
  onTurnDone?: (state: GameState, context: TurnContext) => GameState
  commands?: Partial<Record<Command['type'], (state: GameState, command: Command) => GameState | string>>
  onStat?: (before: GameState, after: GameState, key: StatKey, by: number) => GameState
}
```

## The end of a turn

A turn is the engine's one clock, [`state.turn`](/docs/reference/state#turn). A turn ends each time a [`turn`](/docs/reference/effects#turn) effect applies, whether a choice, an activity or a plugin applies it. The [calendar](/docs/plugins/calendar#what-a-turn-is), for example, ends one each time passing time crosses into a new day (or a new period or week, if you set it up that way). Each time a turn ends, these steps run in order:

1. The turn counter goes up by one, and [`resets`](#resets) are written into the kv store.
2. [`onTurn`](#onturn) runs, with that state and the state the turn ended on as `before`. When the player goes to bed with the calendar, `before` is the state as they went to bed, with the clock still at night and the `resets` keys still holding what they held that day.
3. Each [plugin](/docs/reference/plugins#hooks-and-providers)'s `onTurn` hook runs, in the order `game.plugins` lists them. This is where the [calendar](/docs/plugins/calendar) moves its clock on.
4. [`onTurnDone`](#onturndone) runs, with the state the plugins left and the same `before`.

Use `onTurn` for what should happen before the plugins move on, and `onTurnDone` for what depends on what they did, such as the new day.

### onTurn

```ts
onTurn?: (state: GameState, context: TurnContext) => GameState

type TurnContext = CustomContext & {
  before: GameState
  apply: (effects: readonly EffectRef[], on?: GameState) => GameState
}
```

**When:** at the end of each turn, once the counter has moved on and [`resets`](#resets) are written. `state.turn` is the turn that's beginning. Each plugin's `onTurn` hook runs after it, and then [`onTurnDone`](#onturndone).

**Does:** returns the next state. `context.apply` applies effects as content would, in order, each on the state the one before it left, and returns the state they leave. It takes any [`EffectRef`](/docs/reference/custom#effects), so a plugin's effect in [short](/docs/reference/custom#plugincall) or one of your game's [custom effects](/docs/reference/custom#effects) works too. `context.before` is the state the turn ended on, from before the counter moved on and before `resets` were written, so it can still read a once-a-day key such as `before.kv.hadCoffee` that `resets` has just put back. The rest of the context is a [custom function's](/docs/reference/custom#customcontext): the game, `query`, `value` and a seeded `roll`.

Ending a turn doesn't touch any stat by itself, so a game whose energy fills up overnight says so here with a [`stat`](/docs/reference/effects#setting-a-stat) effect that sets it `to` a value. It can also change what isn't an effect, such as a stage of the story ending, by returning a changed state.

**Without it:** nothing, and every stat stays as it was.

```ts
onTurn: (state, { apply, before }) => {
  const rested = apply([
    // A late coffee costs a fifth of the night's rest.
    { kind: 'stat', stat: 'energy', to: before.kv.lateCoffee ? 80 : 100 },
    { kind: 'kv', key: 'lateCoffee', to: false },
    // In this game a turn is a day, and market day comes every seventh.
    { kind: 'kv', key: 'marketOpen', to: state.turn % 7 === 5 },
  ])
  // Moving-in week ends on the second day.
  return rested.phase === 'arrival' && rested.turn > 1 ? { ...rested, phase: 'open' } : rested
}
```

**Gotchas.**
- A [`turn`](/docs/reference/effects#turn) effect applied here does nothing. A turn's own rules can't end another turn.
- `apply` with no `on` applies to the state the hook was handed. When you've changed the state yourself first, pass it as `on`, or apply to the result of the last `apply`, as a plugin's [`set`](/docs/reference/plugins#plugincontext) does.
- The end of a turn doesn't deliver messages. Those come from the [messages](/docs/plugins/messages) and [feed](/docs/plugins/feed) plugins, which deliver by condition after any command.
- It's a function, so the [content checker](/docs/reference/checks) can't look inside it. A stat, scene or plugin effect it names with a typo isn't reported. Test it with the real [`sleep()`](/docs/plugins/calendar#commands) or a `turn` effect.

### onTurnDone

```ts
onTurnDone?: (state: GameState, context: TurnContext) => GameState
```

**When:** at the end of each turn, after every plugin's `onTurn` hook. It's the last step, so the state it's handed has the calendar's new day, a [status](/docs/plugins/statuses) that has just worn off, and anything else the plugins did as the turn ended.

**Does:** the same as [`onTurn`](#onturn). It gets the same `TurnContext`: `before` is still the state the turn ended on, `apply` applies effects in order, and `query` asks a plugin about the state it was handed.

**Without it:** nothing.

**Gotchas.**
- A `turn` effect applied here does nothing, as in `onTurn`.
- Like `onTurn`, it's a function the [content checker](/docs/reference/checks) can't look inside.

### Each new day

The engine has no idea of a day. A turn is whatever your game makes it, and with the [calendar](/docs/plugins/calendar) set to `turn: 'period'` a turn ends five times a day. To do something once each new day, ask the calendar for the day in `onTurnDone` and compare it with the last day you acted on, kept in the kv store:

```ts
import type { GameRules } from '@ifloom/engine'

const rules: GameRules = {
  onTurnDone: (state, { apply, query }) => {
    const day = query<{ day: number }>('calendar/now')?.day ?? 0
    // Day 0 is the one the game opens on, so it counts as done.
    if ((state.kv.lastNewDay ?? 0) === day) return state
    return apply([
      { kind: 'kv', key: 'lastNewDay', to: day },
      // The market restocks and the rent goes up a little.
      { kind: 'kv', key: 'marketStocked', to: true },
      { kind: 'stat', stat: 'rent', by: 1 },
    ])
  },
}
```

- **It works for any length of turn.** With `turn: 'day'` the check passes every turn. With `turn: 'period'` it passes on the first turn of each day. With a `calendar/pass` that skips several days, it runs once for each turn the pass ends.
- **The kv key is your own.** The engine doesn't keep `lastNewDay`, so name it what you like. A game that opens on another day reads that day in place of the `0`.
- **It doesn't need the calendar.** A game with its own clock can read a stat or a kv key the same way. The hook only promises to run after the plugins.

### A day's end, step by step

Twine life sims often run one long widget when the player goes to bed: pay the wages on Friday, take the rent on Sunday, check whether a friendship has soured, then pick which scene the morning opens with. In IFLoom that's `rules.onTurn`.

With the [calendar](/docs/plugins/calendar)'s default `turn: 'day'`, a game that starts on day 0 and only ends turns by going to bed has one turn per day, so `state.turn` is the number of the day that's starting. The calendar's clock hasn't moved yet when the game's `onTurn` runs (see [What the game's turn rules see](/docs/plugins/calendar#what-the-games-turn-rules-see)), so this example works the new weekday out from `state.turn` rather than from the clock. To read the clock instead, write the same steps in [`onTurnDone`](#onturndone). In a seven-day week starting on Monday, `state.turn % 7` is 0 on a Monday and 6 on a Sunday.

Each `apply` runs on the state the one before it left, so a later step sees an earlier one: the rent comes out of the money the wages just paid in.

```ts
import type { GameRules } from '@ifloom/engine'

const RENT = 30

const rules: GameRules = {
  resets: { calledAva: false, hadCoffee: false },
  onTurn: (state, { apply, before, roll }) => {
    const weekday = state.turn % 7
    let next = state

    // Friday night: the week's wages, kept in a stat that each shift adds to.
    if ((state.turn - 1) % 7 === 4) {
      next = apply([{ kind: 'stat', stat: 'coins', by: next.stats.owed ?? 0 }, { kind: 'stat', stat: 'owed', to: 0 }, { kind: 'notify', id: 'payday', title: 'Payday', tag: 'money' }], next)
    }
    // Sunday morning: the rent, out of what the wages left.
    const evicted = weekday === 6 && (next.stats.coins ?? 0) < RENT
    if (weekday === 6 && !evicted) next = apply([{ kind: 'stat', stat: 'coins', by: -RENT }], next)

    // Exactly one morning scene, by priority.
    if (evicted) next = apply([{ kind: 'phase', to: 'over' }, { kind: 'scene', scene: 'ending.evicted' }], next)
    else if (!before.kv.calledAva && roll(3, 'ava.sulk') === 0) next = apply([{ kind: 'scene', scene: 'ava.sulk' }], next)
    else next = apply([{ kind: 'scene', from: 'morning', otherwise: 'morning.plain' }], next)

    return apply([{ kind: 'stat', stat: 'energy', to: 9999 }], next)
  },
}
```

- **It reads the day's keys from `before`.** `before.kv.calledAva` is what it was that day, even though `calledAva` is in `resets` and `state.kv.calledAva` is already back to `false`.
- **The order is yours.** The steps run top to bottom, as a Twine widget's would, and a scene effect at the end decides what's on screen in the morning. A `{ kind: 'scene', from }` storylet draw works here like anywhere else.
- **Draws are seeded.** `roll(3, 'ava.sulk')` draws from the save's seed, the turn and the name, so a replay draws the same.
- **Count days, not the clock.** If something else can end a turn (a `turn` effect on a choice, or a calendar with `turn: 'period'`), turns and days drift apart. Then move the steps to [`onTurnDone`](#onturndone) and read the day from the calendar, as [Each new day](#each-new-day) does.
- **Testing it.** The [debug plugin](/docs/plugins/debug)'s `debug/time` moves the clock but not the turn, so set both (`debug/time` and `debug/turn`) before going to bed in a test that relies on `state.turn`.

### resets

```ts
resets?: Record<string, KvValue>
```

**When:** at the end of each turn, as the counter moves on and before [`onTurn`](#onturn).

**Does:** writes each of these values into `state.kv`. Use it for the kv keys that count "once this turn".

**Without it:** nothing is put back.

```ts
resets: { hadCoffee: false, postedToday: false }
```

See it in the showcase: [Small Town](/docs/guide/showcase#resets-each-turn) resets a coffee and a post a day.

A curfew isn't a rule here, because the engine keeps no time of day. It's the [calendar plugin](/docs/plugins/calendar#the-guard)'s `curfew` option.

## Locks and commands

### locks

```ts
locks?: readonly Lock[]
```

What the player can't do for now, and why. They're checked in order before every command. See [Locks](/docs/reference/locks).

**Without it:** nothing is locked.

What happens when the player arrives somewhere is a place's [`arrive`](/docs/plugins/places#arrival), in the [places plugin](/docs/plugins/places)'s content, not a rule.

### commands

```ts
commands?: Partial<Record<Command['type'], (state: GameState, command: Command) => GameState | string>>
```

**When:** for a command of that type, instead of the built-in handler. [Locks](/docs/reference/locks) and plugins' hard [guards](/docs/reference/plugins#guards) refuse first, and a guard's warning refuses before your handler's result is used.

**Does:** returns the next state, or a string to refuse with that reason. Everything around the handler still happens: [triggers](/docs/reference/triggers) fire, the scene left on screen counts as [seen](/docs/reference/state#seen), and each plugin's `onCommand` hook runs.

**Without it:** the built-in handler.

```ts
import type { GameRules } from '@ifloom/engine'

const rules: GameRules = {
  commands: {
    // Ava doesn't let the player walk off mid-order.
    leave: (state) =>
      state.sceneId === 'ava.hi' && !state.kv.paid ? 'Ava is still making your coffee.' : { ...state, sceneId: null },
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

A hook, named as the others are: it runs at an event and returns the next state.

**When:** after every [`stat`](/docs/reference/effects#stat) effect on one of the player's stats, with the state before and after it. `after` is already held to the stat's declared range. For an effect with `by`, `by` is the effect's own `by`, even when the range cut it short. For one with `to`, `by` is the change it made. It isn't called for an [entity's stat](/docs/reference/stats#entity-stats) (an effect with `of`), or when an activity's cost is paid.

**Does:** return `before` to veto the change, `after` to let it stand, or `after` with more changes of your own.

**Without it:** the change stands.

```ts
onStat: (before, after, key) =>
  key === 'charm' && (before.stats.energy ?? 0) < 10 ? before : after
```

What the player is called, and what they're like, isn't a rule either. Keep it in [stats](/docs/reference/stats) and the [kv store](/docs/reference/state#kv), and print it in prose.

The core has no characters, so it has no hooks for them. Which scene talking to someone opens is the [cast](/docs/plugins/cast#talkoption)'s `talk` option.

## See it in an example

Small Town: `rules` in [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) has `resets` for the coffee and the post, an `onTurn` that puts energy back to 100, and two `locks`.
