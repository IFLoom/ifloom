---
title: "Rules and hooks"
description: "rules: the game's own code. The end of a turn and a day's rollover (onTurn, onTurnDone), onStat, the game's commands and providers, migrations and saveName."
---
`rules` is the game's own code: what the end of a turn does, how a stat may change, the commands and functions content calls by name, and the save's name and migrations. You pass it on the base you give [`loadGame`](/docs/reference/loader#loadgame), beside the plugins. The engine calls these functions instead of knowing about your game. Every member is optional. Leave one out and the engine does the plain thing listed under it.

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  onTurn: (state, { apply }) => apply([{ stat: 'energy', to: 100 }]),
  values: { catName: (state) => (typeof state.kv.catName === 'string' ? state.kv.catName : 'The cat') },
}
```

`rules` is a plain object with no helper to write it. It has what a [plugin](/docs/reference/plugins) can have, for the game itself, and its hooks are named as a plugin's are: `on` and the event they run at, each returning the next state. Hooks are plain functions of the state. Don't mutate the state you're given. Return a new object instead.

What is data stays out of `rules`, so a mod can reach it: what's locked is content's [`locks`](/docs/reference/locks), and what goes back each turn is content's [`resets`](#resets).

## GameRules

```ts
type GameRules = {
  migrations?: Record<number, (state: GameState, tools: MigrationTools) => GameState>
  saveName?: (state: GameState) => string | null
  onTurn?: (state: GameState, context: TurnContext) => GameState
  onTurnDone?: (state: GameState, context: TurnContext) => GameState
  onStat?: (before: GameState, after: GameState, stat: StatKey, by: number, context: RulesContext) => GameState
  onCommand?: (before: GameState, after: GameState, context: RulesContext) => GameState
  conditions?: Record<string, CustomCondition>
  effects?: Record<string, CustomEffect>
  values?: Record<string, CustomValue>
  queries?: Record<string, (state: GameState, args: PluginArgs, context: CustomContext) => unknown>
  commands?: Record<string, RulesCommand>
  guard?: (state: GameState, asked: Asked, context: RulesContext) => Refusal | undefined
  price?: (state: GameState, effects: readonly Effect[], context: RulesContext) => string[] | undefined
  label?: (state: GameState, context: RulesContext) => string | undefined
  stage?: (state: GameState, context: RulesContext) => StageDef | undefined
  buttons?: (state: GameState, context: RulesContext) => readonly ActionDef[] | undefined
  action?: (state: GameState, id: string, context: RulesContext) => ActionDef | undefined
  statModifiers?: (state: GameState, context: RulesContext) => readonly StatModifier[] | undefined
  audio?: (state: GameState, context: RulesContext) => Record<string, string | null> | undefined
  view?: (state: GameState, context: RulesContext) => unknown
  profile?: (state: GameState, previous: GameState, stored: unknown, context: RulesContext) => unknown
}
```

| Member | What it is |
|---|---|
| `migrations` | Steps that carry an old save to the game's current `version`. See [The game's own migrations](/docs/reference/saves#the-games-own-migrations). |
| `saveName` | The name a save is listed under. See [`saveName`](#savename). |
| `onTurn`, `onTurnDone` | Hooks at the end of each turn. See [The end of a turn](#the-end-of-a-turn). |
| `onStat` | A hook on every change to one of the player's stats. See [`onStat`](#onstat). |
| `onCommand` | A hook after every command that took, as a plugin's [`onCommand`](/docs/reference/plugins#hooks-and-providers). |
| `conditions`, `effects`, `values` | Functions content calls by name with `game/` in front: `{ 'game/tired': true }`, `{ 'game/payRent': {} }`, `{{v:game/catName}}`. See [Calls by name](/docs/reference/custom). |
| `queries` | Answers code can ask with `context.query('game/name')`, as a plugin's [queries](/docs/reference/plugins#queries). |
| `commands` | Commands of the game's own, sent as `{ 'game/rest': true }`. See [`commands`](#commands). |
| `guard`, `price`, `label` | As a plugin's: whether a command may go ahead, what a button costs in the game's words, and where the game is in a few words. See [Guards, prices and labels](/docs/reference/plugins#guards-prices-and-labels). |
| `stage` | What the screen shows while no scene is open. See [Stage](/docs/reference/plugins#stage). |
| `buttons`, `action` | Buttons offered while no scene is open, and an action that isn't in content, by id, done with `{ type: 'action', id: 'game/<id>' }`. See [Buttons](/docs/reference/plugins#buttons). |
| `statModifiers` | Changes to what the player's stats read right now. See [Stat modifiers](/docs/reference/plugins#stat-modifiers). |
| `audio` | What plays on background channels. See [Audio](/docs/reference/plugins#audio). |
| `view` | What the UI needs from the game's own code, at `view.plugins.game`. See [The view](/docs/reference/plugins#the-view). |
| `profile` | What the game keeps in the player's [profile](/docs/reference/profile), under `game`. See [The profile](/docs/reference/plugins#the-profile). |

The engine runs the game's code as a plugin whose id is `game`, which is why no plugin can have that id. It comes first, before every plugin, so its providers answer before theirs and its hooks run before theirs.

## RulesContext

```ts
type RulesContext = CustomContext & {
  apply: (effects: readonly EffectRef[], on?: GameState) => GameState
  picks?: Record<string, string>
  profile?: unknown
}
```

What the game's hooks, commands and providers are handed besides the state: a [called function's](/docs/reference/custom#customcontext) context (`game`, `query`, `value` and a seeded `roll`) and `apply`, which applies effects as content would. In `view`, `picks` and `profile` are what a plugin's view gets.

## commands

```ts
commands?: Record<string, RulesCommand>

type RulesCommand = {
  ignoresLocks?: boolean
  whyNot?: (state: GameState, args: PluginArgs, context: RulesContext) => string | undefined
  run: (state: GameState, args: PluginArgs, context: RulesContext) => GameState
  effectsOf?: (state: GameState, args: PluginArgs, context: RulesContext) => Effect[]
  spends?: (state: GameState, args: PluginArgs, context: RulesContext) => Record<string, number> | undefined
}
```

A command of the game's own, by name, written as a plugin's [`PluginCommand`](/docs/reference/plugins#plugincommand) is. A button or a choice sends it as `{ 'game/rest': true }`, and the runner's log keeps it as `{ type: 'custom', name: 'game/rest' }`.

- `run` returns the next state.
- `whyNot` says why it can't be done now, in the player's words, or `undefined` if it can. The view greys out a button that sends it with that reason.
- `effectsOf` gives the effects it would apply, so [guards](/docs/reference/plugins#guards), [prices](/docs/reference/plugins#prices) and [locks](/docs/reference/locks) can see what it does. `spends` gives the stats it spends, for its button's price.
- `ignoresLocks` runs it through any lock. Keep it for tools outside the story.

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  commands: {
    // A nap: refused once you're rested, else an hour's rest.
    nap: {
      whyNot: (state) => ((state.stats.energy ?? 0) >= 80 ? 'You are not tired.' : undefined),
      effectsOf: () => [{ stat: 'energy', by: 20 }],
      run: (state, _args, { apply }) => apply([{ stat: 'energy', by: 20 }]),
    },
  },
}

// An action that sends it
{ id: 'nap', label: 'Take a nap', command: { 'game/nap': true } }
```

**Gotchas.**
- `run` and `whyNot` must be pure. The engine calls them more than once for one command: to see whether it refuses, to run it, and each time a button that sends it is drawn.
- A command of your own can't take over one of the engine's, such as `leave`. To refuse those, use a [lock](/docs/reference/locks) or a [`guard`](/docs/reference/plugins#guards).

## The end of a turn

A turn is the engine's one clock, [`state.turn`](/docs/reference/state#turn). A turn ends each time a [`turn`](/docs/reference/effects#turn) effect applies, whether a choice, an action or a plugin applies it. The [calendar](/docs/plugins/calendar#what-a-turn-is), for example, ends one each time passing time crosses into a new day (or a new period or week, if you set it up that way). Each time a turn ends, these steps run in order:

1. The turn counter goes up by one, and the content's [`resets`](#resets) are written into the kv store.
2. [`onTurn`](#onturn) runs, with that state and the state the turn ended on as `before`. When the player goes to bed with the calendar, `before` is the state as they went to bed, with the clock still at night and the `resets` keys still holding what they held that day.
3. Each [plugin](/docs/reference/plugins#hooks-and-providers)'s `onTurn` hook runs, in the order `game.plugins` lists them. This is where the [calendar](/docs/plugins/calendar) moves its clock on.
4. [`onTurnDone`](#onturndone) runs, with the state the plugins left and the same `before`.
5. Each plugin's `onTurnDone` hook runs, in the same order.

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

**Does:** returns the next state. `context.apply` applies effects as content would, in order, each on the state the one before it left, and returns the state they leave. It takes any [`EffectRef`](/docs/reference/custom#effects), so a plugin's effect in [short](/docs/reference/custom#plugincall) or one of the game's own, `{ 'game/payRent': {} }`, works too. `context.before` is the state the turn ended on, from before the counter moved on and before `resets` were written, so it can still read a once-a-day key such as `before.kv.hadCoffee` that `resets` has just put back. The rest of the context is a [called function's](/docs/reference/custom#customcontext): the game, `query`, `value` and a seeded `roll`.

Ending a turn doesn't touch any stat by itself, so a game whose energy fills up overnight says so here with a [`stat`](/docs/reference/effects#setting-a-stat) effect that sets it `to` a value. It can also change what isn't an effect, such as a stage of the story ending, by returning a changed state.

**Without it:** nothing, and every stat stays as it was.

```ts
onTurn: (state, { apply, before }) => {
  const rested = apply([
    // A late coffee costs a fifth of the night's rest.
    { stat: 'energy', to: before.kv.lateCoffee ? 80 : 100 },
    { kv: 'lateCoffee', to: false },
    // In this game a turn is a day, and market day comes every seventh.
    { kv: 'marketOpen', to: state.turn % 7 === 5 },
  ])
  // Moving-in week ends on the second day.
  return rested.kv.phase === 'arrival' && rested.turn > 1 ? apply([{ kv: 'phase', to: 'open' }], rested) : rested
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

**When:** at the end of each turn, after every plugin's `onTurn` hook and before any plugin's `onTurnDone`, so the state it's handed has the calendar's new day, a [status](/docs/plugins/statuses) that has just worn off, and anything else the plugins did as the turn ended.

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
      { kv: 'lastNewDay', to: day },
      // The market restocks and the rent goes up a little.
      { kv: 'marketStocked', to: true },
      { stat: 'rent', by: 1 },
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
      next = apply([{ stat: 'coins', by: next.stats.owed ?? 0 }, { stat: 'owed', to: 0 }, { notify: 'Payday', id: 'payday', tag: 'money' }], next)
    }
    // Sunday morning: the rent, out of what the wages left.
    const evicted = weekday === 6 && (next.stats.coins ?? 0) < RENT
    if (weekday === 6 && !evicted) next = apply([{ stat: 'coins', by: -RENT }], next)

    // Exactly one morning scene, by priority.
    if (evicted) next = apply([{ kv: 'phase', to: 'over' }, { scene: 'ending.evicted' }], next)
    else if (!before.kv.calledAva && roll(3, 'ava.sulk') === 0) next = apply([{ scene: 'ava.sulk' }], next)
    else next = apply([{ scene: { from: 'morning', otherwise: 'morning.plain' } }], next)

    return apply([{ stat: 'energy', to: 9999 }], next)
  },
}
```

- **It reads the day's keys from `before`.** `before.kv.calledAva` is what it was that day, even though `calledAva` is in `resets` and `state.kv.calledAva` is already back to `false`.
- **The order is yours.** The steps run top to bottom, as a Twine widget's would, and a scene effect at the end decides what's on screen in the morning. A `{ scene: { from } }` storylet draw works here like anywhere else.
- **Draws are seeded.** `roll(3, 'ava.sulk')` draws from the save's seed, the turn and the name, so a replay draws the same.
- **Count days, not the clock.** If something else can end a turn (a `turn` effect on a choice, or a calendar with `turn: 'period'`), turns and days drift apart. Then move the steps to [`onTurnDone`](#onturndone) and read the day from the calendar, as [Each new day](#each-new-day) does.
- **Testing it.** The [debug plugin](/docs/plugins/debug)'s `debug/time` moves the clock but not the turn, so set both (`debug/time` and `debug/turn`) before going to bed in a test that relies on `state.turn`.

### resets

```ts
// in content
resets?: Record<string, KvValue>
```

`resets` is content, not a member of `rules`, so a mod can add a key of its own. A pack's keys replace the content's key by key.

**When:** at the end of each turn, as the counter moves on and before [`onTurn`](#onturn).

**Does:** writes each of these values into `state.kv`. Use it for the kv keys that count "once this turn".

**Without it:** nothing is put back.

```ts
import type { Content } from '@ifloom/engine'

export const actions: Content = {
  resets: { hadCoffee: false, postedToday: false },
}
```

See it in the showcase: [Small Town](/docs/guide/showcase#resets-each-turn) resets a post a day.

A curfew isn't a rule here, because the engine keeps no time of day. It's the [calendar plugin](/docs/plugins/calendar#the-guard)'s `curfew` option. What the player can't do for now is content's [`locks`](/docs/reference/locks), and what happens when the player arrives somewhere is a place's [`arrive`](/docs/plugins/places#arrival).

## The player

A stat's ceiling is part of its declaration, not a rule. A ceiling that moves is a stat whose [`max`](/docs/reference/stats#statmax) names a value of the game's own, `{ value: 'game/ceiling' }`.

### onStat

```ts
onStat?: (before: GameState, after: GameState, stat: StatKey, by: number, context: RulesContext) => GameState
```

A hook, named as the others are: it runs at an event and returns the next state.

**When:** after every [`stat`](/docs/reference/effects#stat) effect on one of the player's stats, with the state before and after it. `after` is already held to the stat's declared range. For an effect with `by`, `by` is the effect's own `by`, even when the range cut it short. For one with `to`, `by` is the change it made. It isn't called for an [entity's stat](/docs/reference/stats#entity-stats) (an effect with `of`), or when an action's `cost` is paid.

**Does:** return `before` to veto the change, `after` to let it stand, or `after` with more changes of your own (`context.apply` applies effects to it). Each plugin's `onStat` runs after it, on what it returned.

**Without it:** the change stands.

```ts
onStat: (before, after, stat) =>
  stat === 'charm' && (before.stats.energy ?? 0) < 10 ? before : after
```

What the player is called, and what they're like, isn't a rule either. Keep it in [stats](/docs/reference/stats) and the [kv store](/docs/reference/state#kv), and print it in prose.

The core has no characters, so it has no hooks for them. Which scene talking to someone opens is the [cast](/docs/plugins/cast#talkoption)'s `talk` option.

## The save

### saveName

```ts
saveName?: (state: GameState) => string | null
```

The name a save is listed under, usually the name the player typed. Each save records what it returns as [`SaveMeta.playerName`](/docs/reference/saves#savemeta), so a load screen can show whose save it is. Return `null` for no name. Leave `saveName` out and every save's `playerName` is `null`. A spoken line under `@you` or `@player` shows this name too, or the string `you` when it returns `null` (see [Speech](/docs/reference/prose#speech)).

```ts
export const rules: GameRules = {
  saveName: (state) => (typeof state.kv.playerName === 'string' ? state.kv.playerName : null),
}
```

The engine doesn't keep a player name of its own. The usual place is a `playerName` key in the [kv store](/docs/reference/state#kv), written by an [input](/docs/reference/inputs), and The Letter reads it from there. A name kept anywhere else works too, because `saveName` can read any part of the state.

### migrations

```ts
migrations?: Record<number, (state: GameState, tools: MigrationTools) => GameState>
```

Steps that carry a save from one version of the game to the next, keyed by the version each upgrades from: step 1 takes a version-1 save to version 2. The version is the base's `version`. They run when an older save loads, after the engine's and the plugins' own steps. See [The game's own migrations](/docs/reference/saves#the-games-own-migrations).

## See it in an example

- Small Town: [`examples/showcase/src/rules.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/rules.ts) has an `onTurn` that puts energy back to 100, a value, `catName`, and an effect, `postLatest`. Its `resets` are in [`world/actions.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/actions.ts) and its lock in [`story/moving-day.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/moving-day.ts).
- The Letter: [`examples/novel/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/game.ts) has `saveName` and `migrations`.
