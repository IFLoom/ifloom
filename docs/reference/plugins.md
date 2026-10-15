# Plugins

A **plugin** adds a whole system to the engine: a loyalty card, a quest list, a phone. It has its own state in the save, and the conditions, effects, commands, prose values, hooks and view slice that work on that state. Content calls these by name, as it calls the game's [custom functions](/reference/custom), so packs and mods use a plugin without shipping any code.

```ts
import {
  definePlugin, migratePlugins, pluginById,
  type Plugin, type DefinedPlugin, type PluginContext, type PluginArgs,
  type PluginCommand, type PluginEntry, type PluginProblem, type PluginSlice,
  type Asked, type Refusal, type StageDef, type SpeakerView, type CheckTools,
  pluginSpeaker,
} from '@ifloom/engine'
```

Plugins are chosen when the game is built, in [`game.plugins`](/reference/game#game). They are never loaded while the game runs. The first-party ones are separate packages; see [First-party plugins](/plugins/).

**A custom function or a plugin?** A custom function is one computed answer: is it market day, what does a loaf cost. A plugin is for a system with a memory of its own, meaning state that has to be saved, carried forward when its shape changes, and shown to the player.

## A worked example

A loyalty card at the café gives one stamp for every coffee. Five stamps fill the card and earn a free coffee.

```ts
import { applyEffects, definePlugin, say } from '@ifloom/engine'

type Card = { stamps: number; free: number }

export const loyalty = definePlugin<Card>({
  id: 'loyalty',
  version: 2,
  start: () => ({ stamps: 0, free: 0 }),
  migrations: {
    // Version 1 only counted stamps.
    1: (old) => ({ stamps: (old as { count: number }).count, free: 0 }),
  },
  conditions: {
    stamps: (_state, args, { slice }) => slice.stamps >= Number(args.atLeast ?? 1),
    hasFree: (_state, _args, { slice }) => slice.free > 0,
  },
  effects: {
    stamp: (_state, _args, { slice, set }) =>
      slice.stamps === 4 ? set({ stamps: 0, free: slice.free + 1 }) : set({ ...slice, stamps: slice.stamps + 1 }),
  },
  strings: {
    notFull: 'Your card is not full yet.',
    onlyAtCafe: 'Only at the café.',
  },
  commands: {
    redeem: {
      whyNot: (_state, _args, { slice, game, query }) => {
        if (slice.free === 0) return say(game, 'loyalty/notFull')
        // Where the player is, asked of the places plugin by name.
        if (query('places/here') !== 'cafe') return say(game, 'loyalty/onlyAtCafe')
        return undefined
      },
      run: (state, _args, { slice, set, game }) =>
        set({ ...slice, free: slice.free - 1 }, applyEffects(state, game, [{ kind: 'item', id: 'coffee', by: 1 }])),
    },
  },
  values: {
    stamps: (_state, { slice }) => slice.stamps,
  },
  view: (_state, { slice }) => ({ stamps: slice.stamps, free: slice.free }),
})
```

The game lists the plugin, and the content calls it by name with `loyalty/` in front. The café is a place of the [places plugin](/plugins/places):

```ts
import { onlyAt, places } from '@ifloom/plugin-places'

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  data: { places: { locations: [/* house, cafe */] } },
  items: [{ id: 'coffee', name: 'Coffee', desc: 'Still hot.', kind: 'stuff' }],
  activities: [
    { id: 'coffee', requires: [onlyAt(['cafe'])], effects: [{ kind: 'item', id: 'coffee', by: 1 }, { custom: 'loyalty/stamp' }] },
  ],
  prose: { 'place.cafe': 'Cups clink. Your card has {{v:loyalty/stamps}} stamps.' },
}

const { game } = loadGame([town], {
  id: 'corner-cafe',
  title: 'The Corner Café',
  introScene: 'arrival',
  plugins: [places({ start: 'cafe' }), loyalty],
})
```

Five coffees later:

```ts
loyalty.read(state, game)                                  // { stamps: 0, free: 1 }
holds(state, { custom: 'loyalty/hasFree' }, game)          // true
whyNot(state, game, { type: 'custom', name: 'loyalty/redeem' }) // undefined: it can be done
view(state, game).plugins.loyalty                          // { stamps: 0, free: 1 }

const out = apply(state, game, { type: 'custom', name: 'loyalty/redeem' })
out.state.items.coffee                                     // one more coffee
view(out.state, game).plugins.loyalty                      // { stamps: 0, free: 0 }
```

On a new game the same command is refused with `Your card is not full yet.`, and the view greys out its button with the same line. A game that wants it said differently gives `strings: { 'loyalty/notFull': 'Five stamps first.' }`; see [Strings](/reference/strings#plugins-strings).

## Plugin

```ts
type Plugin<S = any> = {
  id: string
  version: number
  start?: (game: Game) => S
  migrations?: Record<number, (state: unknown) => unknown>
  conditions?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => boolean>
  effects?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameState>
  commands?: Record<string, PluginCommand<S>>
  strings?: Record<string, string>
  queries?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>
  cooperates?: string[]
  values?: Record<string, (state: GameState, context: PluginContext<S>) => string | number>
  hooks?: {
    turn?: (state: GameState, context: PluginContext<S>) => GameState
    after?: (before: GameState, after: GameState, context: PluginContext<S>) => GameState
  }
  guard?: (state: GameState, asked: Asked, context: PluginContext<S>) => Refusal | undefined
  price?: (state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] | undefined
  label?: (state: GameState, context: PluginContext<S>) => string | undefined
  stage?: (state: GameState, context: PluginContext<S>) => StageDef | undefined
  buttons?: (state: GameState, context: PluginContext<S>) => readonly ActionDef[] | undefined
  speaker?: (id: string, state: GameState, context: PluginContext<S>) => SpeakerView | undefined
  kinds?: readonly KindDef[]
  entities?: (game: Game) => readonly EntityDef[]
  view?: (state: GameState, context: PluginContext<S>) => unknown
  check?: (game: Game, tools: CheckTools) => PluginProblem[]
  argProblems?: (kind: 'conditions' | 'effects' | 'commands', name: string, args: PluginArgs, game: Game) => string[]
}
```

`S` is the shape of the plugin's own state. Every field but `id` and `version` is optional.

| Field | What it is |
|---|---|
| `id` | Its name, and the prefix on everything it adds: `loyalty` gives `loyalty/stamp`. Letters, digits and `-`. The loader reports any other id, and two plugins with the same one. |
| `version` | The version of its state's shape. Bump it when the shape changes, and add a step to `migrations`. Saves record it. |
| `start` | Its state in a new game. A plugin with no state leaves this out. |
| `migrations` | One step per version, keyed by the version it upgrades **from**. See [State and migrations](#state-and-migrations). |
| `conditions` | Tests that content can use anywhere a [condition](/reference/conditions#custom) goes, by name and without the prefix. |
| `effects` | Changes that content can make in a choice's or an activity's effects. Each takes the game state and returns the next one. |
| `commands` | Commands a button can send. [`PluginCommand`](#plugincommand). |
| `strings` | The plugin's player-facing lines in English, by name **without** the prefix: `{ notFull: 'Your card is not full yet.' }`. The plugin says one with [`say(game, 'loyalty/notFull')`](/reference/strings#say); a game rewords it as `strings: { 'loyalty/notFull': '…' }`. See [Plugins' strings](/reference/strings#plugins-strings). |
| `queries` | Answers other plugins can ask for by name, with their context's `query`. See [Queries](#queries). |
| `cooperates` | Ids of plugins it works with when the game has them. Content may name their conditions and effects in a game without them. See [Cooperating plugins](#cooperates). |
| `values` | Words and numbers prose prints with <code v-pre>{{v:loyalty/stamps}}</code>. |
| `hooks` | Code that runs at fixed points: at the start of each turn, on arriving somewhere, and after every command. See [Hooks](#hooks). |
| `guard` | Whether a command may go ahead, given the effects it would apply: a refusal, a warning, or `undefined`. See [Guards](#guards). |
| `price` | What a button costs that the engine cannot say, in the plugin's words. See [Prices](#prices). |
| `label` | Where the game is, in a few words, for [`view.when`](/reference/view#the-clock-and-the-player). See [Labels](#labels). |
| `stage` | What the screen shows while no scene is open: a title and prose blocks. See [Stage](#stage). |
| `buttons` | Buttons offered while no scene is open, before the room's and the game's own. See [Buttons](#buttons). |
| `speaker` | Who a scene's `speaker` id is: a name, a colour and a picture. See [Speakers](#speakers). |
| `kinds` | [Kinds](/reference/entities#kinddef) of entity the plugin brings. See [Kinds and entities](#kinds-and-entities). |
| `entities` | [Entities](/reference/entities#entitydef) there at the start, made from the plugin's content when the game is loaded. See [Kinds and entities](#kinds-and-entities). |
| `view` | What the UI needs from the plugin, at [`view.plugins[id]`](/reference/view#plugins). |
| `check` | Checks the plugin's content when the game is loaded. See [Content and checks](#content-and-checks). |
| `argProblems` | What is wrong with what content passes to one of its conditions, effects or commands, checked when the game is loaded. See [Checking calls](#checking-calls). |

## PluginContext

```ts
type PluginContext<S> = {
  game: Game
  slice: S
  set: (next: S, on?: GameState) => GameState
  query: <T = unknown>(name: string, args?: PluginArgs) => T | undefined
  apply: (effects: readonly EffectRef[], on?: GameState) => GameState
}
```

What every plugin function gets besides the game state:

- `game` is the game.
- `slice` is the plugin's own state, typed. If the save has none yet, it is `start(game)` (or `undefined` for a plugin with no `start`).
- `set(next, on?)` returns a game state with the plugin's state replaced by `next`. It writes onto `on`, which defaults to the state the function was handed.
- `query(name, args?)` asks another plugin's [query](#queries) by its full name, about the state the function was handed, and returns its answer — or `undefined` when the game does not have that plugin or that query. `args` is `{}` when left out.
- `apply(effects, on?)` applies a list of [effects](/reference/effects) as content would, and returns the next state. See [Applying effects](#applying-effects).

```ts
stamp: (_state, _args, { slice, set }) => set({ ...slice, stamps: slice.stamps + 1 })
```

**Gotcha.** Without `on`, `set` builds on the state the function was handed, not on one you have changed since. When a command or effect also changes other parts of the game state, make those changes first and pass the result as `on`. This is what `redeem` does above with [`applyEffects`](/reference/effects#applyeffects):

```ts
// Wrong: the flag is lost, because set builds on `state`.
const moved = { ...state, flags: { ...state.flags, stamped: true } }
return set({ ...slice, stamps: slice.stamps + 1 })

// Right.
const moved = { ...state, flags: { ...state.flags, stamped: true } }
return set({ ...slice, stamps: slice.stamps + 1 }, moved)
```

`slice` is still the plugin's state as it was in the state handed in. `on` changes only where the new state is written.

## PluginArgs

```ts
type PluginArgs = Record<string, unknown>
```

What content passes in `with`, unchecked. It is `{}` when `with` is left out. Read it defensively, for example `Number(args.atLeast ?? 1)` or `String(args.quest ?? '')`. Content is data, and a mod can pass anything.

## PluginCommand

```ts
type PluginCommand<S = any> = {
  ignoresLocks?: boolean
  whyNot?: (state: GameState, args: PluginArgs, context: PluginContext<S>) => string | undefined
  run: (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameState
  effectsOf?: (state: GameState, args: PluginArgs, context: PluginContext<S>) => Effect[]
}
```

A command a button can send as `{ type: 'custom', name: 'loyalty/redeem', with: {...} }`.

| Field | What it is |
|---|---|
| `ignoresLocks` | Run even while a [lock](/reference/locks) would stop it. Off by default. See [Commands outside the story](#commands-outside-the-story). |
| `whyNot` | Why it cannot be done right now, or `undefined` if it can. |
| `run` | Returns the next state. |
| `effectsOf` | The effects running it would apply, worked out before it runs, for [guards](#guards), [prices](#prices) and [locks by effect](/reference/locks#lock) to see. Left out: none. See [Saying what a command does](#saying-what-a-command-does). |

`whyNot` returns the reason it cannot be done right now, written for the player, or `undefined` if it can. [`whyNot`](/reference/actions#whynot) asks in this order:

1. [locks](/reference/locks), as for every command, unless the command sets `ignoresLocks`;
2. every plugin's [guard](#guards), unless the command sets `ignoresLocks`;
3. the game's own [`rules.commands.custom`](/reference/rules#commands), if it has one;
4. `There is no such thing to do.` (the [`noSuchAction`](/reference/strings#refusals) string) if no plugin has a command by that name;
5. the plugin's `whyNot`.

The reducer refuses with that reason, and the view greys out the button with it. Put the line in the plugin's [`strings`](/reference/strings#plugins-strings) and return `say(game, 'loyalty/notFull')`, so a game can reword it. `run` is only called once nothing has refused, and it returns the next state.

**Gotchas.**
- A command without `whyNot` can always be done, apart from locks.
- A [lock](/reference/locks) can stop one plugin command by its full name (`deny: ['loyalty/redeem']`), all of a plugin's commands (`deny: ['loyalty/*']`), or every plugin's (`deny: ['custom']`). `'*'` stops them too, like everything else.
- A `custom` entry in `rules.commands` takes over every plugin command. Leave it out.

### Commands outside the story

`ignoresLocks: true` takes a command out of the [locks](/reference/locks): no lock stops it, whatever its `deny` says, and the view never greys out its button for one. No plugin's [guard](#guards) is asked about it either, so it is never refused or warned against by one. Everything else still applies. The game's `rules.commands.custom` is still asked, the command's own `whyNot` still refuses, and `run` goes through [`apply`](/reference/commands#apply) as usual, with triggers and every plugin's `after` hook.

It is for tools that stand outside the story and must work in any stretch of it, such as the [debug plugin](/plugins/debug), which sets a stat by hand in the middle of an intro that only moves through its scenes. **Never use it for something the player does in the story.** A lock is how a game says "not now", and a player command that slips past it breaks that game's stages.

```ts
commands: {
  // A tool for the person testing the game, not a move the player makes.
  refill: {
    ignoresLocks: true,
    run: (_state, _args, { slice, set }) => set({ ...slice, free: slice.free + 1 }),
  },
}
```

[`lockOn`](/reference/locks#lockon) and [`lockedBy`](/reference/locks#lockedby) do not look at `ignoresLocks`: they still say which lock matches the command. Only `whyNot`, and so the reducer and the view, lets it through.

## Naming

Content calls a plugin by its full name: the plugin's id, a `/`, and the name in the table. This is the same way it calls the game's own custom functions, so a pack author learns only one form.

| Kind | Content writes |
|---|---|
| condition | `{ custom: 'loyalty/stamps', with: { atLeast: 3 } }`, or in short `{ 'loyalty/stamps': { atLeast: 3 } }` |
| effect | `{ custom: 'loyalty/stamp' }`, or in short `{ 'loyalty/stamp': true }`, in a data scene choice's, an activity's or a trigger's effects |
| command | `{ type: 'custom', name: 'loyalty/redeem', with: {...} }`, on an [`ActionDef`](/reference/game#actiondef): a room's action, a game action or a plugin's [button](#buttons) |
| value | <code v-pre>{{v:loyalty/stamps}}</code> in prose |

The short form is the plugin's full name as the only key, with what it is asked as the value; see [`PluginCall`](/reference/custom#plugincall) for how a value that is not an object is passed.

A name with a `/` belongs to a plugin. The engine looks it up there first, and only then among the game's [custom functions](/reference/custom). Keep `/` out of the game's own names.

A plugin usually exports small typed helpers that write these objects for authors who work in code. See [`questDone`](/plugins/quests#helpers), for example.

**Gotchas.**
- A value name in prose is letters, digits, `_` and `-` after the `/`: <code v-pre>{{v:loyalty/stamps-left}}</code> prints. Anything else is not a token and is left on screen as written.
- A name nobody has fails quietly. A condition is false, an effect does nothing, a value is left on screen, and a command is refused with `There is no such thing to do.` The [loader](/reference/loader#the-checks) and [`validatePack`](/reference/game#validatepack) report them, except a condition or effect of a plugin the game lacks that one of its plugins [cooperates with](#cooperates).

## Queries

```ts
queries?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>
```

Answers another plugin can ask for, by full name, without importing this one: a place, a time, a list — what a condition's yes or no cannot say. The asker calls its context's `query`; the answer is worked out with this plugin's own context, so it reads its own `slice`.

```ts
// The loyalty plugin answers how many stamps are left to fill the card.
queries: {
  stampsLeft: (_state, _args, { slice }) => 5 - slice.stamps,
},

// A café-menu plugin asks, and does without when the game has no loyalty card.
view: (_state, { query }) => ({
  footer: query<number>('loyalty/stampsLeft') ?? null,
}),
```

**Gotchas.**
- `query` returns `undefined` when the game lacks the plugin or the query, so always give a fallback. Name the partner in [`cooperates`](#cooperates) if content should be able to call its conditions and effects too.
- Content cannot call a query: there is no condition, effect or prose form. It is for plugin code only.

### pluginQuery

```ts
function pluginQuery(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => unknown) | undefined
```

A plugin's query by its full name, from outside any plugin: a tool, a test, the [CLI](/cli/). It returns a function to ask it with, run with the owning plugin's own context for that state, or `undefined` when the game lacks the plugin or the query. `args` is `{}` if left out. A plugin's own code uses its context's `query` instead, which is this asked on the context's state.

```ts
// Is it late enough for bed? Only a game with the calendar can say.
const bedtime = pluginQuery(game, 'calendar/bedtime')?.(state) ?? false
```

**Gotcha.** The answer is `unknown`: cast it to what the plugin documents, and check it is there first, as `?.` does above.

## Cooperates

```ts
cooperates?: string[]
```

The ids of plugins this one works with when the game has them. Content written for this plugin may then name those plugins' conditions and effects — in full or [in short](/reference/custom#plugincall) — even in a game without them:

- the [loader](/reference/loader#the-checks) and [`validatePack`](/reference/game#validatepack) do not report them;
- the condition is false, and the effect does nothing.

```ts
export const loyalty = definePlugin<Card>({
  id: 'loyalty',
  version: 2,
  // Works with a calendar when there is one: a pack can gate double stamps on `calendar/weekend`.
  cooperates: ['calendar'],
  // ...
})
```

**Gotchas.**
- It covers only plugins the game does **not** have. In a game that has the partner, a name the partner does not declare is reported as usual.
- A plugin nobody lists in `cooperates` is still reported: `no custom condition named "calendar/weekend"`.
- It covers conditions and effects. A command for an absent plugin is still refused, and a value in prose is still left on screen.

## Effects run in order

A plugin's effect is a real step in its list. [`buildEffects`](/reference/custom#buildeffects) turns `{ custom: 'loyalty/stamp', with }` into an [`Effect`](/reference/effects#custom) `{ kind: 'custom', name: 'loyalty/stamp', with }`. When the list applies, each plugin effect runs on the state the effects before it left. Two stamps in one list give two stamps.

A **game's** custom effect works differently. It is worked out up front, when the list is built, from the state before any of the list applies. It returns plain effects that take its place.

```ts
effects: [
  { custom: 'loyalty/stamp' },
  { custom: 'countStamps' }, // the game's own: sees the card as it was before the stamp
]
```

Inside an activity, the effects are worked out before the cost is paid, but a plugin effect runs after the cost and after every effect before it.

## State and migrations

```ts
type PluginSlice = { version: number; state: unknown }
```

Each plugin's state lives in [`state.plugins`](/reference/state#plugins), keyed by plugin id, with the version of its shape: `state.plugins.loyalty` is `{ version: 2, state: { stamps: 0, free: 0 } }`. [`startingState`](/reference/commands#startingstate) fills it from each plugin's `start`. Like the rest of the [state](/reference/state), it must be plain JSON.

When the shape changes, bump `version` and add a step keyed by the version it upgrades **from**. This is the same rule the engine follows for its own [saves](/reference/saves#migrate):

```ts
version: 2,
migrations: {
  1: (old) => ({ stamps: (old as { count: number }).count, free: 0 }),
},
```

### migratePlugins

```ts
function migratePlugins(state: GameState, game: Game): GameState | string
```

Brings every plugin's state up to the version the game has:

- a plugin added since the save was made starts fresh from `start`;
- an older state is carried forward one step at a time;
- the state of a plugin the game no longer has is kept as it is, unused.

It returns a reason, as a string, when it cannot:

| Returns | When |
|---|---|
| `That save was made with a newer version of <id>.` | The saved version is higher than the plugin's. |
| `That save's <id> is from a version this game cannot read.` | A step on the way is missing. |

Both are the engine's English, the [`pluginNewer` and `pluginUnreadable`](/reference/strings#saves) strings; given a game with its own, they read the game's way.

It returns the same object when nothing changed. [`saves().read` and `importText`](/reference/saves#saves) run it and refuse a save with its reason. [`hydrate`](/reference/commands#hydrate) runs it too, so every command does.

[`apply`](/reference/commands#apply) refuses to run a command on a state `migratePlugins` gives a reason for, with that reason, so a plugin never writes over a state it could not read.

**Gotcha.** [`hydrate`](/reference/commands#hydrate) does not refuse: it keeps the old plugin state as it is, and a [`view`](/reference/view) drawn from it lets the plugin read a shape it may not expect. Load saves through [`saves()`](/reference/saves#saves) or the [runner](/reference/runner), which refuse such a save. If you read a state some other way, call `migratePlugins` yourself and check for a string:

```ts
const ready = migratePlugins(state, game)
if (typeof ready === 'string') showMessage(ready)
else state = ready
```

## Hooks

| Hook | When |
|---|---|
| `turn(state, context)` | At the end of each turn — on each [`turn`](/reference/effects#turn) effect, including the turns the [calendar](/plugins/calendar#what-a-turn-is)'s `calendar/pass` and `sleep()` end — after [`rules.turn`](/reference/rules#turn)'s effects and the game's own [`rules.onTurn`](/reference/rules#onturn). See [The end of a turn](/reference/rules#the-end-of-a-turn). |
| `after(before, after, context)` | After every command that took. `before` is the state the command started from, and the context belongs to `after`. |

Plugins' hooks run in the order `game.plugins` lists them, and each gets the state the one before it left.

There is no hook for arriving somewhere: the engine keeps no places. The [places plugin](/plugins/places) has its own [`arrive`](/plugins/places#placesoptions) option for the game; another plugin notices a move in `after`, by asking `places/here`.

Within one command, the order is:

1. the command runs, including the game's `onTurn` hook and then each plugin's `turn`;
2. the game's [triggers](/reference/triggers) fire;
3. the scene left on screen is counted as [seen](/reference/state#seen);
4. each plugin's `after` runs, last. What it changes is not seen by triggers until the next command.

A plugin that keeps a diary of the player's days might use both:

```ts
type Diary = { days: number; places: string[]; commands: number }

hooks: {
  turn: (state, { slice, set }) => set({ ...slice, days: slice.days + 1 }),
  after: (_before, _after, { slice, set, query }) => {
    // Where the player is now, if the game has the places plugin.
    const here = query<string | null>('places/here') ?? null
    const places = here === null || slice.places.includes(here) ? slice.places : [...slice.places, here]
    return set({ ...slice, places, commands: slice.commands + 1 })
  },
}
```

**Gotchas.**
- `after` runs only through [`apply`](/reference/commands#apply) and `dispatch`, and only when the command took. It does not run on `start`, on a refused command, or under [`applyEffects`](/reference/effects#applyeffects). A plugin whose view or conditions must be right on the first frame should work out what it needs from the state, as the [quests plugin](/plugins/quests) does, and not rely on `after` having run.
- Return the state you were given when nothing changes. Calling `set` with an equal slice still makes a new state object.

## Guards, prices and labels

Three more fields let a plugin watch every command, not just its own: a **guard** says whether a command may go ahead, a **price** adds to what a button says it costs, and a **label** says where the game is. A guard and a price are both handed the effects the command would apply, worked out before it runs by [`effectsOf`](/reference/actions#effectsof).

A sink of dirty dishes at the house: cooking and baking add to it, and washing up takes the rest of the turn.

```ts
import { definePlugin, say, type Effect } from '@ifloom/engine'

type Sink = { dirty: number }

// How many dishes these effects would add.
const added = (effects: readonly Effect[]) =>
  effects.reduce((n, effect) => (effect.kind === 'custom' && effect.name === 'dishes/add' ? n + Number(effect.with?.by ?? 1) : n), 0)

export const dishes = definePlugin<Sink>({
  id: 'dishes',
  version: 1,
  start: () => ({ dirty: 0 }),
  strings: {
    full: 'Not with the sink this full.',
    piling: 'The dishes would pile up. Wash up first.',
  },
  effects: {
    add: (_state, args, { slice, set }) => set({ dirty: slice.dirty + Number(args.by ?? 1) }),
    // Empty the sink, then end the turn: the turn's hooks see the clean sink.
    wash: (_state, _args, { set, apply }) => apply([{ kind: 'turn' }], set({ dirty: 0 })),
  },
  commands: {
    wash: {
      run: (_state, _args, { apply }) => apply([{ 'dishes/wash': true }]),
      effectsOf: () => [{ kind: 'custom', name: 'dishes/wash' }],
    },
  },
  guard: (_state, { command, effects }, { slice, game }) => {
    if (command.type === 'activity' && command.id === 'bake' && slice.dirty >= 3) return say(game, 'dishes/full')
    if (slice.dirty + added(effects) > 3) return { reason: say(game, 'dishes/piling'), soft: true }
    return undefined
  },
  price: (_state, effects) => {
    const n = added(effects)
    return n ? [n === 1 ? 'a dish to wash' : `${n} dishes to wash`] : undefined
  },
  label: (_state, { slice }) => (slice.dirty ? `${slice.dirty} in the sink` : undefined),
})
```

The house offers the buttons, as a room of the [places plugin](/plugins/places#locationdef):

```ts
// onlyAt from '@ifloom/plugin-places'
activities: [
  { id: 'cook', requires: [onlyAt(['house'])], effects: [{ kind: 'stat', key: 'energy', by: 20 }, { 'dishes/add': { by: 2 } }] },
  { id: 'bake', requires: [onlyAt(['house'])], effects: [{ kind: 'item', id: 'loaf', by: 1 }, { 'dishes/add': true }] },
],
// on the house, in data.places.locations
actions: [
  { id: 'cook', label: 'Cook dinner', command: { type: 'activity', id: 'cook' } },
  { id: 'bake', label: 'Bake bread', command: { type: 'activity', id: 'bake' } },
  { id: 'wash', label: 'Wash up', command: { type: 'custom', name: 'dishes/wash' } },
],
```

With two dishes in the sink:

```ts
const screen = view(state, game)
screen.when                                  // 'House · 2 in the sink', with places listed before dishes
const cook = screen.actions.find((a) => a.id === 'cook')!
cook.disabled                                // undefined: it can be pressed
cook.warning                                 // 'The dishes would pile up. Wash up first.'
cook.price                                   // { notes: ['2 dishes to wash'] }
apply(state, game, { type: 'activity', id: 'cook' }).refused // 'The dishes would pile up. Wash up first.'
```

With three, **Bake bread** is greyed out with `Not with the sink this full.` **Wash up** empties the sink and ends the turn.

### Guards

```ts
guard?: (state: GameState, asked: Asked, context: PluginContext<S>) => Refusal | undefined

type Asked = { command: Command; effects: readonly Effect[] }
type Refusal = string | { reason: string; soft: true }
```

Whether a command may go ahead. `asked.command` is the [command](/reference/commands#command); `asked.effects` is what it would apply, from [`effectsOf`](/reference/actions#effectsof). `state` and the context are the state before the command. Return:

- `undefined` to let it through;
- a **string** to refuse it, as a [lock](/reference/locks) does: [`whyNot`](/reference/actions#whynot) returns the line, so the view greys the button out with it and the reducer refuses with it;
- `{ reason, soft: true }` for a **warning**: the button can still be pressed and carries `reason` as its [`warning`](/reference/view#renderedchoice), and the reducer refuses the command with `reason` all the same. It is how the [calendar](/plugins/calendar#the-guard)'s past-dawn warning works: the UI shows the warning and offers something else — here, washing up.

Every plugin's guard is asked about every command, in the order `game.plugins` lists them, except a plugin command that sets [`ignoresLocks`](#commands-outside-the-story). A guard is asked after the locks and before the game's own [`rules.commands`](/reference/rules#commands) and before what the command itself needs, such as an activity's `requires` and cost. A refusal from any plugin wins over a warning from any plugin; among warnings, the first wins. See [`warningOf`](/reference/actions#warningof).

**Gotchas.**
- `effects` is empty for a built-in command whose effects cannot be known before it runs: `talk`, `scene` and the rest. Test `command` for those. A plugin command's list is what its [`effectsOf`](#saying-what-a-command-does) says: the calendar's `sleep()` gives the `calendar/pass` it makes, but not the turns that pass ends.
- Every button shows a guard's refusal and its warning: game and plugin buttons, scene choices (after the choice's own `disabled`), the **Talk** button, and the [places plugin](/plugins/places#exitview)'s exits.
- An effect applied inside another effect is not in the list: the turn `dishes/wash` ends is not, only `dishes/wash` itself.

### Prices

```ts
price?: (state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] | undefined
```

What a button costs that the engine cannot say, in the plugin's words: `['2 dishes to wash']`. Every plugin's notes, in the order `game.plugins` lists them, go in the button's [`price.notes`](/reference/view#price). It is asked with the effects of each room action's command, from [`effectsOf`](/reference/actions#effectsof), and of each scene choice. A button whose effects are empty is not asked about. A button with notes but no cost gets a price of only `{ notes }`.

**Gotcha.** An activity's effects begin with its cost: a negative `stat` effect for each stat it spends. The engine already shows those in `stats`, so a price should not repeat them.

### Labels

```ts
label?: (state: GameState, context: PluginContext<S>) => string | undefined
```

Where the game is, in a few words for a header or a save: `'Day 3 · Wednesday morning'`. Every plugin's label, in the order `game.plugins` lists them, joined with ` · `, is [`view.when`](/reference/view#the-clock-and-the-player); `null` when no plugin gives one. Return `undefined` to say nothing.

### Performance

The engine works out a command's effects for guards and prices only when some plugin in the game has a `guard` or a `price`. A game without one pays nothing for them, apart from a [lock with `effect`](/reference/locks#lock).

## Saying what a command does

```ts
effectsOf?: (state: GameState, args: PluginArgs, context: PluginContext<S>) => Effect[]
```

The engine cannot see inside a [`PluginCommand`](#plugincommand)'s `run`, so the command says what it would apply. Guards, prices and [locks with `effect`](/reference/locks#lock) read this list. Without `effectsOf`, the command applies nothing they can see.

```ts
wash: {
  run: (_state, _args, { apply }) => apply([{ 'dishes/wash': true }]),
  effectsOf: () => [{ kind: 'custom', name: 'dishes/wash' }],
},
```

**Gotchas.**
- The list is plain [`Effect`](/reference/effects)s: a plugin's effect in the long form, `{ kind: 'custom', name, with }`, not the short form.
- Keep it in step with `run`. Nothing checks that the two agree.

## Applying effects

```ts
apply: (effects: readonly EffectRef[], on?: GameState) => GameState
```

On the [context](#plugincontext): applies a list of effects as content would and returns the next state. Anything content can write goes in the list: built-in effects, the game's [custom effects](/reference/custom#effects) and plugins' effects, this plugin's own included, in the long form or [in short](/reference/custom#plugincall). They apply in order, each on the state the one before it left. The list is built from `on`, which defaults to the state the function was handed.

It is how a plugin's effect or command ends a turn: `apply([{ kind: 'turn' }])` runs the whole [end of a turn](/reference/rules#the-end-of-a-turn), with `rules.turn`, `onTurn` and every plugin's `turn` hook.

```ts
// Empty the sink first, so the turn's hooks see it empty.
wash: (_state, _args, { set, apply }) => apply([{ kind: 'turn' }], set({ dirty: 0 })),
```

**Gotchas.**
- As with `set`, without `on` it builds on the state the function was handed, not one you have changed since. Chain them by passing the result as `on`.
- A `turn` effect applied while a turn is already ending does nothing: from a `turn` hook, or from an effect in what `rules.turn` returns, `apply([{ kind: 'turn' }])` leaves the turn as it is.
- It applies effects and nothing more. Triggers and `after` hooks run once the command is done, as they do for any command.

## The view

`view(state, context)` returns whatever the plugin's UI needs. [`view()`](/reference/view#plugins) collects each one at `plugins[id]`. A plugin without `view` has no entry. The engine never looks inside it, so type it at the point where you read it:

```ts
const card = view(state, game).plugins.loyalty as { stamps: number; free: number } | undefined
```

## Stage

```ts
stage?: (state: GameState, context: PluginContext<S>) => StageDef | undefined

type StageDef = {
  title: string
  body?: readonly Block[]
  id?: string
}
```

What the screen shows while no scene is open: a room's description, a shop front, a heading over a dashboard. The view asks each plugin in the order `game.plugins` lists them, and the first that returns a `StageDef` fills [`view.scene`](/reference/view#the-scene): `title` is the title, and `body` is rendered as a data scene's body would be — prose keys, variants, conditions, the game's prose — with `id: null`, `frame: 'stage'` and no choices. Return `undefined` to let the next plugin answer.

| Field | What it is |
|---|---|
| `title` | The heading: a room's name. |
| `body` | What is written there, as [blocks](/reference/scenes#block). Left out, the body is empty. |
| `id` | The id its blocks are drawn under. A [`variants`](/reference/scenes#block) block rotates per id, so a plugin that stages several places gives each its own id to keep its lines its own. The plugin's id if left out. |

With no plugin answering, the screen is the game's `title` and an empty body. The [places plugin](/plugins/places#the-stage)'s stage is the room the player is in: its name and its `body`.

A stall on market day fills the screen while it is open:

```ts
const stall = definePlugin<{ open: boolean }>({
  id: 'stall',
  version: 1,
  start: () => ({ open: true }),
  commands: { haggle: { run: (state) => state } },
  stage: (_state, { slice }) =>
    slice.open
      ? { id: 'market', title: 'The market stall', body: [{ text: 'stall.open' }, { variants: 'stall.cries' }] }
      : undefined,
  buttons: () => [{ id: 'haggle', label: 'Haggle', command: { type: 'custom', name: 'stall/haggle' } }],
})

// in a pack
prose: { 'stall.open': 'Crates of eggs and a heap of loaves.', 'stall.cries/1': '“Fresh bread!”', 'stall.cries/2': '“Eggs, a dozen!”' },
variants: { 'stall.cries': ['stall.cries/1', 'stall.cries/2'] },
```

```ts
view(state, game).scene
// { id: null, title: 'The market stall', frame: 'stage',
//   body: 'Crates of eggs and a heap of loaves.\n\n“Fresh bread!”', choices: [], ... }

view(stall.write(state, { open: false }), game).scene.title // the next plugin's stage title, or the game's title
```

**Gotchas.**
- The first answer wins, so a plugin listed earlier in `game.plugins` hides a later one's stage. Answer only when the stage is yours: the stall's is `undefined` once it is packed up.
- A scene with no title of its own takes the stage's title, then the game's: the stall's scenes are headed **The market stall** while it is open.
- Only `view.scene` changes. In a game with the [places plugin](/plugins/places) listed after the stall, the stall covers the room's description, but `view.plugins.places` still says where the player is and the exits are still drawn.
- The loader does not see a stage's blocks, because they are worked out in play. Check the prose keys they name in [`check`](#content-and-checks) with `blockProblems`.

## Buttons

```ts
buttons?: (state: GameState, context: PluginContext<S>) => readonly ActionDef[] | undefined
```

Buttons the plugin offers while no scene is open: a stall's **Haggle**, a room's things to do. Each is an [`ActionDef`](/reference/game#actiondef), the same shape as the game's own actions. The view puts every plugin's buttons first, in the order `game.plugins` lists them (the [places plugin](/plugins/places#the-buttons)'s are the room's `actions`), then the game's own [`actions`](/reference/game#game), and draws them all alike with [`renderAction`](/reference/view#renderaction): a price, `blocked`, a [guard](#guards)'s warning, and [`whyNot`](/reference/actions#whynot)'s reason.

```ts
// The stall above, with a game action to buy bread:
view(state, game).actions.map((action) => action.id) // ['haggle', 'buy']
```

**Gotchas.**
- A button whose `when` does not hold is left out, and so is one whose command is stopped by a [lock](/reference/locks) with `hide: true`. Another lock greys it out with its line, like any button.
- Like the game's own actions, they are not offered while a scene is open or while a lock that stops everything is on ([`lockedOut`](/reference/locks#lockedout)).
- The loader does not see them. Check what their commands name in [`check`](#content-and-checks) with `commandProblems`.

## Speakers

```ts
speaker?: (id: string, state: GameState, context: PluginContext<S>) => SpeakerView | undefined

type SpeakerView = {
  id: string
  name: string
  hue: number | null
  portrait: string | null
}
```

Who a scene's [`speaker`](/reference/scenes#sceneview) id is, for the screen. The view asks each plugin in the order `game.plugins` lists them, and the first that returns a [`SpeakerView`](/reference/view#speakerview) is [`view.scene.speaker`](/reference/view#the-scene). Return `undefined` for an id that is not yours, to let the next plugin answer.

| Field | What it is |
|---|---|
| `id` | The speaker id, as the scene named it. |
| `name` | What the player reads over their lines. |
| `hue` | A colour for their lines, as a hue from 0 to 360; `null` leaves it to the UI. |
| `portrait` | Their picture, a path or URL; `null` for none. |

With no plugin answering, the scene has no speaker: the engine keeps no characters of its own. The [cast](/plugins/cast#speakers) answers for its characters. The id is never guessed from the scene's id.

A plugin that keeps the café's regulars says who is talking from its own content:

```ts
type Regular = { id: string; name: string; hue?: number; portrait?: string }

const regulars = definePlugin<null>({
  id: 'regulars',
  version: 1,
  speaker: (id, _state, { game }) => {
    const regular = (game.data?.regulars?.people as readonly Regular[] | undefined)?.find((entry) => entry.id === id)
    return regular ? { id, name: regular.name, hue: regular.hue ?? null, portrait: regular.portrait ?? null } : undefined
  },
})

// in a pack
data: { regulars: { people: [{ id: 'mo', name: 'Mo', hue: 200 }] } },
scenes: [{ id: 'counter', speaker: 'mo', body: [{ text: 'counter' }], choices: [] }],
```

```ts
view(state, game).scene.speaker   // { id: 'mo', name: 'Mo', hue: 200, portrait: null }
```

### pluginSpeaker

```ts
function pluginSpeaker(game: Game, state: GameState, id: string): SpeakerView | undefined
```

What the first plugin that knows `id` says it is, or `undefined` if none does. The view calls it for every scene with a speaker; a tool or a UI drawing a speaker outside a scene, such as a list of who is in the room, calls it the same way.

```ts
pluginSpeaker(game, state, 'mo')?.name   // 'Mo'
pluginSpeaker(game, state, 'nobody')     // undefined
```

**Gotchas.**
- The first answer wins, so a plugin listed earlier in `game.plugins` decides for an id two plugins both know, and a plugin that answers wins over a game character with the same id.
- The loader does not check a scene's `speaker` against any plugin: an id nobody knows gives no speaker, silently.

## Kinds and entities

```ts
kinds?: readonly KindDef[]
entities?: (game: Game) => readonly EntityDef[]
```

A plugin can bring the [kinds](/reference/entities#kinddef) of thing it keeps, and the [entities](/reference/entities#entitydef) of them there at the start, so each has stats and variables that content works on with `of`, `each` and `count`, like any the game declares.

- **`kinds`** are merged by the [loader](/reference/loader#loadgame) before the game's own, plugin by plugin in the order `game.plugins` lists them. A kind the game declares with the same id, on the base or in a pack, replaces the plugin's: that is how a game renames one.
- **`entities(game)`** is called once the game is loaded, with every pack's content merged, so a plugin makes its entities from its own `data`, a mod's entries included. An entity the game declares itself with the same kind and id wins, whole. The rest join [`game.entities`](/reference/game#game) and are checked like any declared entity: an unknown kind, a whole-number id, or a stat not declared `of` its kind is reported against the plugin's id.

The regulars above, each also an entity with a stat of their own:

```ts
const regulars = definePlugin<null>({
  id: 'regulars',
  version: 1,
  kinds: [{ id: 'regular', label: 'Regular', plural: 'Regulars' }],
  entities: (game) =>
    ((game.data?.regulars?.people ?? []) as readonly Regular[]).map((person) => ({ id: person.id, of: 'regular', name: person.name })),
  // speaker as above
})

// in a pack
stats: [{ id: 'fondness', label: 'Fondness', of: 'regular', start: 3 }],
entities: [{ id: 'mo', of: 'regular', name: 'Mo from next door', stats: { fondness: 8 } }],
data: { regulars: { people: [{ id: 'mo', name: 'Mo' }, { id: 'sal', name: 'Sal' }] } },
```

```ts
startingState(game).entities.regular
// { mo: { name: 'Mo from next door', stats: { fondness: 8 }, flags: {} },
//   sal: { name: 'Sal', stats: { fondness: 3 }, flags: {} } }
```

The pack's own Mo wins over the plugin's. Sal comes from the plugin, after the declared ones.

**Gotchas.**
- **Only through `loadGame`.** A game built by hand, without the [loader](/reference/loader#loadgame), gets neither: list the kinds in `game.kinds` and the entities in `game.entities` yourself.
- **`entities` runs before the prose is ready.** `game.prose` is not yet set when it is called; read only `game.data` and the other content lists.
- **A save carries them in.** A declared entity a save does not have, such as one a new entry in the plugin's content makes, joins the save when it loads, unless it was removed in play. See [Entities in old saves](/reference/entities#entities-in-old-saves).

## Content and checks

A plugin's content, such as quests or recipes, lives in a pack's `data`, by plugin id and then by list name. Each entry has an `id`:

```ts
const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  data: { loyalty: { cards: [{ id: 'cafe', stampsToFill: 5 }, { id: 'bakery', stampsToFill: 8 }] } },
}
```

### PluginEntry

```ts
type PluginEntry = { id: string; [field: string]: unknown }
```

One entry in a plugin's content: an `id`, and whatever fields the plugin reads. `game.data` and a pack's `data` are `Record<string, Record<string, readonly PluginEntry[]>>`, so a pack writes entries without a cast. The engine reads only `id`. The plugin gives the other fields their types where it reads them, and checks them in `check`.

The [loader](/reference/loader#pack) merges `data` as it merges scenes. A later pack's entry replaces an earlier one with the same id, whole, and the result is at `game.data.loyalty.cards`. The base game can carry `data` too, ahead of every pack. A pack's data for a plugin the game does not have is skipped, and reported as `the game has no plugin named "<id>"`.

`check(game, tools)` runs once the game is loaded. It returns a [`PluginProblem`](#pluginproblem) for each fault in the plugin's content. The loader lends it [`CheckTools`](#checktools), so a plugin checks its conditions, blocks and buttons exactly as scenes and the game's own actions are checked, in the same words:

```ts
check: (game, { conditionProblems }) =>
  (game.data?.loyalty?.cards ?? []).flatMap((card) =>
    conditionProblems((card as { id: string; when?: Condition }).when).map((what) => ({ list: 'cards', id: card.id, what })),
  ),
```

### CheckTools

```ts
type CheckTools = {
  conditionProblems: (condition: Condition | undefined) => string[]
  blockProblems: (blocks: readonly Block[]) => string[]
  commandProblems: (command: Command) => string[]
}
```

What the loader lends a plugin's `check`. Each returns the problems as the loader words its own, and an empty list when there are none.

| Tool | Reports |
|---|---|
| `conditionProblems(condition)` | Everything a [condition](/reference/conditions) names that the game does not have: `unknown storyline "tides"`, `no custom condition named "…"`, and what a plugin's [`argProblems`](#checking-calls) says about a call to it. `undefined` has none. |
| `blockProblems(blocks)` | Prose keys with no prose (`no prose for "stall.sign"`), [`variants`](/reference/scenes#block) with no lines (`variants "stall.cries" has no lines`), and the conditions on the blocks: each `when` and a `variants` block's `gate`. For a [stage](#stage) or any other blocks the plugin draws. |
| `commandProblems(command)` | What a button's [command](/reference/commands#command) names that the game does not have: `opens unknown scene "…"`, `unknown activity "…"`, `unknown item "…"` (`use`), `unknown character "…"` (`talk`, `call`), and `no plugin command named "…"` — unless it belongs to an [absent partner](#cooperates) — then what that plugin's `argProblems` says. Other commands have none. For [buttons](#buttons) built from the plugin's content. |

The stall checks the sign it hangs and the scene its closing button opens, both from its own content:

```ts
check: (game, { blockProblems, commandProblems }) =>
  (game.data?.stall?.signs ?? []).flatMap((sign) => {
    const { text, closing } = sign as { id: string; text: string; closing: string }
    return [...blockProblems([{ text }]), ...commandProblems({ type: 'scene', id: closing })]
      .map((what) => ({ list: 'signs', id: sign.id, what }))
  }),
// mod:sunday-market · signs early · no prose for "stall.sign"
// mod:sunday-market · signs early · opens unknown scene "stall.closing"
```

### Checking calls

```ts
argProblems?: (kind: 'conditions' | 'effects' | 'commands', name: string, args: PluginArgs, game: Game) => string[]
```

What is wrong with how content calls one of this plugin's conditions, effects or commands. `kind` says which, `name` is the name **without** the prefix, and `args` is what the call passes in `with` (`{}` if nothing; a [short call](/reference/custom#plugincall)'s value that is not an object arrives as `{ value }`). Return the problems, worded for the author, or `[]`. It lets a plugin check the names content passes it, as the engine checks its own:

```ts
argProblems: (kind, name, args) =>
  kind === 'conditions' && name === 'sells' && !['bread', 'eggs', 'cheese'].includes(String(args.value))
    ? [`nobody sells "${String(args.value)}"`]
    : [],
```

```ts
activities: [{ id: 'ask', requires: [{ when: { 'stall/sells': 'fish' }, reason: 'Not today.' }] }]
// town · activity ask · nobody sells "fish"
```

The loader asks it of each call, and each problem is reported as the call's own, where the call is:

- **conditions**: every condition the [loader checks](/reference/loader#the-checks) — data scenes, schedules, activity requirements, triggers, inputs, calls and the game's own actions — and every condition a plugin's `check` passes to `conditionProblems` or `blockProblems`;
- **effects**: every effect list the loader checks — a data scene choice's, an activity's, a trigger's, and those inside an `each`;
- **commands**: the game's own `actions`, and every command a plugin's `check` passes to `commandProblems`.

**Gotchas.**
- A call to a plugin the game does not have is not asked about; the name is reported or let through as the [checks](/reference/loader#the-checks) say.
- A place's room actions are a plugin's content: the [places plugin](/plugins/places#checks) passes their commands to `commandProblems` itself, so a `go('lido')` on a button is reported as `action swim: unknown location "lido"`.

### PluginProblem

```ts
type PluginProblem = { list: string; id: string; what: string }
```

Which list, which entry, and what is wrong. The loader turns it into a [`Problem`](/reference/loader#problem-and-describeproblem) whose `where` is `<list> <id>`. The problem is pinned on the pack that entry came from, or on `base` if it came from no pack:

```text
mod:sunday-market · cards bakery · unknown storyline "baker"
```

## Saves

A save records each plugin's version in [`meta.plugins`](/reference/saves#savemeta). A save made with a plugin the game no longer has still loads, keeps that plugin's state untouched, and names the plugin in [`missingPlugins`](/reference/saves#loadedsave). A save whose plugin state cannot be carried forward is refused with [`migratePlugins`](#migrateplugins)'s reason.

## definePlugin

```ts
function definePlugin<S>(plugin: Plugin<S>): DefinedPlugin<S>

type DefinedPlugin<S> = Plugin<S> & {
  read(state: GameState, game: Game): S
  write(state: GameState, next: S): GameState
}
```

Declares a plugin, and returns it with typed `read` and `write` for its own state. These are for code outside the plugin, such as tests or a UI. Inside the plugin, use the context's `slice` and `set`.

`read` returns the plugin's state, or its starting state if the save has none yet. `write` returns the game state with the plugin's state replaced, labelled with the plugin's current version.

```ts
loyalty.read(state, game).stamps
const full = loyalty.write(state, { stamps: 0, free: 1 }) // a test that starts with a full card
```

A plugin is a plain object, so `definePlugin` is optional, but it types `S` throughout and gives you `read` and `write`. A plugin package usually exports a factory that returns one, such as [`quests()`](/plugins/quests#quests).

## pluginById

```ts
function pluginById(game: Game | undefined, id: string): Plugin | undefined
```

The plugin with this id, if the game has it. For a tool or a UI that wants to know whether a game has a plugin before it draws that plugin's panel.

```ts
if (pluginById(game, 'loyalty')) drawCard(view(state, game).plugins.loyalty)
```

## Gotchas

- **Plugins are chosen when the game is built.** They go on the base you pass to [`loadGame`](/reference/loader#loadgame), not in a pack. A mod can bring data for a plugin the game has, but it cannot add a plugin.
- **A plugin's state is part of the save.** Keep it plain JSON, and every shape change needs a version bump and a migration step, or older saves are refused.
- **Effects that return a new state cannot refuse.** To stop the player, give the command a `whyNot`, put a requirement on the activity, or have a [guard](#guards) refuse any command that would apply the effect.
- **A plain-effect list takes the long form.** Item uses and [`rules.turn`](/reference/rules#turn) take plain [effects](/reference/effects#custom), not `{ custom }` or the short form. There, write `{ kind: 'custom', name: 'loyalty/stamp', with }`. It runs the same way. [`validatePack`](/reference/game#validatepack) reports a name no plugin has; the loader does not.
- **Keep names stable.** Content refers to plugin conditions, effects and commands by name. Renaming one breaks every pack that uses it.
