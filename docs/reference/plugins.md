# Writing a plugin

A plugin adds a whole system to the engine, such as a loyalty card, a quest list or a phone. It keeps its own state in the save, and brings the conditions, effects, commands, prose values, hooks and view that work on that state. Content calls these by name, the same way it calls the game's [custom functions](/reference/custom), so packs and mods can use a plugin without shipping any code.

You choose a game's plugins when you build it, in [`game.plugins`](/reference/game#game). Nothing is loaded while the game runs. The first-party plugins are separate packages, listed under [First-party plugins](/plugins/).

Do you need a plugin or a custom function? A custom function gives one computed answer, such as whether it's market day or what a sandwich costs. Write a plugin when the system needs a memory of its own: state that has to be saved, carried forward when its shape changes, and shown to the player.

## Your first plugin

This plugin keeps a loyalty card at the café. Each coffee adds a stamp, and five stamps fill the card.

```ts
// loyalty.ts
import { definePlugin } from '@ifloom/engine'

type Card = { stamps: number }

export const loyalty = definePlugin<Card>({
  id: 'loyalty',
  version: 1,
  start: () => ({ stamps: 0 }),
  effects: {
    stamp: (_state, _args, { slice, set }) => set({ stamps: slice.stamps + 1 }),
  },
  conditions: {
    full: (_state, _args, { slice }) => slice.stamps >= 5,
  },
  values: {
    stamps: (_state, { slice }) => slice.stamps,
  },
})
```

Each function gets the game state, what content passed it, and a [context](#plugincontext). `slice` is the plugin's own state, and `set` returns the game state with that state replaced.

List the plugin in the game's `plugins`, then call it from content with `loyalty/` in front of each name:

```ts
import { loadGame, SCHEMA, type Pack } from '@ifloom/engine'
import { loyalty } from './loyalty.ts'

const cafe: Pack = {
  id: 'cafe',
  schema: SCHEMA,
  stats: [{ id: 'energy', label: 'Energy', start: 50 }],
  activities: [
    // Each coffee gives energy and a stamp.
    { id: 'coffee', effects: [{ kind: 'stat', key: 'energy', by: 15 }, { custom: 'loyalty/stamp' }] },
  ],
  scenes: [
    {
      id: 'counter',
      body: [{ text: 'counter' }],
      choices: [
        // Only offered once the card is full.
        { id: 'free-coffee', when: { custom: 'loyalty/full' }, effects: [{ kind: 'scene', id: null }] },
        { id: 'leave', effects: [{ kind: 'scene', id: null }] },
      ],
    },
  ],
  prose: {
    counter: 'Your card has {{v:loyalty/stamps}} stamps.',
    'counter#free-coffee': 'Claim a free coffee',
    'counter#leave': 'Not today',
  },
}

const { game } = loadGame([cafe], {
  id: 'corner-cafe',
  title: 'The Corner Café',
  plugins: [loyalty],
  actions: [
    { id: 'coffee', label: 'Buy a coffee', command: { type: 'activity', id: 'coffee' } },
    { id: 'counter', label: 'Go to the counter', command: { type: 'scene', id: 'counter' } },
  ],
})
```

After five coffees, `loyalty.read(state, game)` is `{ stamps: 5 }`, the counter says `Your card has 5 stamps.`, and Claim a free coffee is on offer.

That's a working plugin. The engine saves its state with the game, and the [loader](/reference/loader#the-checks) reports a call to a name the plugin doesn't have, such as `cafe · activity coffee · no custom effect named "loyalty/stomp"`. The rest of this page builds on the same card: a command the player can press, a migration for when the state changes shape, and the hooks, guards and view a bigger system needs.

## A worked example

The full card also counts free coffees, and lets the player redeem one at the café. Its state gained a field, so its version goes up to 2 with a migration for saves made with version 1.

```ts
import { applyEffects, definePlugin, say } from '@ifloom/engine'

type Card = { stamps: number; free: number }

export const loyalty = definePlugin<Card>({
  id: 'loyalty',
  version: 2,
  start: () => ({ stamps: 0, free: 0 }),
  migrations: {
    // Version 1 only counted stamps.
    1: (old) => ({ stamps: (old as { stamps: number }).stamps, free: 0 }),
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
        set({ ...slice, free: slice.free - 1 }, applyEffects(state, game, [{ kind: 'stat', key: 'energy', by: 15 }])),
    },
  },
  values: {
    stamps: (_state, { slice }) => slice.stamps,
  },
  view: (_state, { slice }) => ({ stamps: slice.stamps, free: slice.free }),
})
```

A button sends the command, here as one of the café's actions in the places plugin's content:

```ts
{ id: 'redeem', label: 'Redeem a free coffee', command: { type: 'custom', name: 'loyalty/redeem' } }
```

Five coffees later:

```ts
import { apply, holds, view, whyNot } from '@ifloom/engine'

loyalty.read(state, game)                                       // { stamps: 0, free: 1 }
holds(state, { custom: 'loyalty/hasFree' }, game)               // true
whyNot(state, game, { type: 'custom', name: 'loyalty/redeem' }) // undefined: it can be done
view(state, game).plugins.loyalty                               // { stamps: 0, free: 1 }

const out = apply(state, game, { type: 'custom', name: 'loyalty/redeem' })
view(out.state, game).plugins.loyalty                           // { stamps: 0, free: 0 }
```

On a new game the same command is refused with `Your card is not full yet.`, and the view greys out its button with the same line. A game that wants different wording gives `strings: { 'loyalty/notFull': 'Five stamps first.' }`. See [Strings](/reference/strings#plugins-strings).

## Plugin

```ts
import {
  definePlugin, migratePlugins, pluginById, pluginQuery, pluginSpeaker,
  type Plugin, type DefinedPlugin, type PluginContext, type PluginArgs,
  type PluginCommand, type PluginEntry, type PluginProblem, type PluginSlice,
  type Asked, type Refusal, type StageDef, type SpeakerView, type CheckTools,
} from '@ifloom/engine'

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
  audio?: (state: GameState, context: PluginContext<S>) => Record<string, string | null> | undefined
  view?: (state: GameState, context: PluginContext<S>) => unknown
  profile?: {
    onCommand?: (state: GameState, previous: GameState, stored: unknown, context: PluginContext<S>) => unknown
  }
  check?: (game: Game, tools: CheckTools) => PluginProblem[]
  argProblems?: (kind: 'conditions' | 'effects' | 'commands', name: string, args: PluginArgs, game: Game) => string[]
}
```

`S` is the shape of the plugin's own state. Every field but `id` and `version` is optional.

| Field | What it is |
|---|---|
| `id` | Its name, and the prefix on everything it adds: `loyalty` gives `loyalty/stamp`. Letters, digits and `-` only. The loader reports any other id, and two plugins with the same one. |
| `version` | The version of its state's shape. Bump it when the shape changes, and add a step to `migrations`. Saves record it. |
| `start` | Its state in a new game. A plugin with no state leaves this out. |
| `migrations` | One step per version, keyed by the version it upgrades from. See [State and migrations](#state-and-migrations). |
| `conditions` | Tests that content can use anywhere a [condition](/reference/conditions#custom) goes, by name without the prefix. |
| `effects` | Changes that content can make in a choice's, an activity's or a trigger's effects. Each takes the game state and returns the next one. |
| `commands` | Commands a button can send. See [`PluginCommand`](#plugincommand). |
| `strings` | The plugin's player-facing lines in English, by name without the prefix, such as `{ notFull: 'Your card is not full yet.' }`. The plugin says one with [`say(game, 'loyalty/notFull')`](/reference/strings#say), and a game rewords it as `strings: { 'loyalty/notFull': '…' }`. See [Plugins' strings](/reference/strings#plugins-strings). |
| `queries` | Answers other plugins can ask for by name, with their context's `query`. See [Queries](#queries). |
| `cooperates` | Ids of plugins it works with when the game has them. Content may name their conditions, effects and commands in a game without them. See [Cooperates](#cooperates). |
| `values` | Words and numbers that prose prints with <code v-pre>{{v:loyalty/stamps}}</code>. |
| `hooks` | Code that runs at the end of each turn and after every command. See [Hooks](#hooks). |
| `guard` | Whether a command may go ahead, given the effects it would apply. Returns a refusal, a warning or `undefined`. See [Guards](#guards). |
| `price` | What a button costs that the engine can't say, in the plugin's words. See [Prices](#prices). |
| `label` | Where the game is, in a few words, for [`view.when`](/reference/view#the-clock-and-the-player). See [Labels](#labels). |
| `stage` | What the screen shows while no scene is open: a title and prose blocks. See [Stage](#stage). |
| `buttons` | Buttons offered while no scene is open, before the game's own `actions`. See [Buttons](#buttons). |
| `speaker` | Who a scene's `speaker` id is: a name, a colour and a picture. See [Speakers](#speakers). |
| `kinds` | [Kinds](/reference/entities#kinddef) of entity the plugin brings. See [Kinds and entities](#kinds-and-entities). |
| `entities` | [Entities](/reference/entities#entitydef) there at the start, made from the plugin's content when the game is loaded. See [Kinds and entities](#kinds-and-entities). |
| `audio` | What plays on background audio channels, such as a place's ambience. See [Audio](#audio). |
| `view` | What the UI needs from the plugin, at [`view.plugins[id]`](/reference/view#plugins). See [The view](#the-view). |
| `profile` | What the plugin keeps in the player's [profile](/reference/profile), which outlives saves and new games. See [The profile](#the-profile). |
| `check` | Checks the plugin's content when the game is loaded. See [Content and checks](#content-and-checks). |
| `argProblems` | What's wrong with what content passes to one of its conditions, effects or commands, checked when the game is loaded. See [Checking calls](#checking-calls). |

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

Every plugin function gets this alongside the game state:

- `game` is the game.
- `slice` is the plugin's own state, typed. If the save has none yet, it's `start(game)`, or `undefined` for a plugin with no `start`.
- `set(next, on?)` returns a game state with the plugin's state replaced by `next`. It writes onto `on`, which defaults to the state the function was handed.
- `query(name, args?)` asks another plugin's [query](#queries) by its full name, about the state the function was handed. It returns `undefined` when the game doesn't have that plugin or that query. `args` is `{}` when left out.
- `apply(effects, on?)` applies a list of [effects](/reference/effects) as content would, and returns the next state. See [Applying effects](#applying-effects).

**Gotcha.** Without `on`, `set` builds on the state the function was handed, not on one you've changed since. When a command or effect changes other parts of the game state too, make those changes first and pass the result as `on`. The `redeem` command above does this with [`applyEffects`](/reference/effects#applyeffects):

```ts
// Wrong: the flag is lost, because set builds on `state`.
const moved = { ...state, flags: { ...state.flags, stamped: true } }
return set({ ...slice, stamps: slice.stamps + 1 })

// Right.
const moved = { ...state, flags: { ...state.flags, stamped: true } }
return set({ ...slice, stamps: slice.stamps + 1 }, moved)
```

`slice` is still the plugin's state as it was in the state handed in. `on` only changes where the new state is written.

## PluginArgs

```ts
type PluginArgs = Record<string, unknown>
```

What content passes in `with`, unchecked. It's `{}` when `with` is left out. Read it defensively, for example `Number(args.atLeast ?? 1)` or `String(args.quest ?? '')`, because content is data and a mod can pass anything. To report bad arguments when the game loads, give the plugin [`argProblems`](#checking-calls).

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
| `whyNot` | Why it can't be done right now, written for the player, or `undefined` if it can. |
| `run` | Returns the next state. It's only called once nothing has refused. |
| `effectsOf` | The effects running it would apply, worked out before it runs, for [guards](#guards), [prices](#prices) and [locks by effect](/reference/locks#lock) to see. None if left out. See [Saying what a command does](#saying-what-a-command-does). |

The engine's [`whyNot`](/reference/actions#whynot) asks these in order, and the first answer wins:

1. the [locks](/reference/locks), as for every command, unless the command sets `ignoresLocks`;
2. every plugin's [guard](#guards), unless the command sets `ignoresLocks`;
3. the game's own [`rules.commands.custom`](/reference/rules#commands), if it has one. If it does, its answer is final and the next two steps never run;
4. `There is no such thing to do.` (the [`noSuchAction`](/reference/strings#refusals) string) if no plugin has a command by that name;
5. the plugin's `whyNot`.

The reducer refuses with that reason, and the view greys out the button with it. Put the line in the plugin's [`strings`](/reference/strings#plugins-strings) and return `say(game, 'loyalty/notFull')`, so a game can reword it.

**Gotchas.**
- A command without `whyNot` can always be done, apart from locks and guards.
- A [lock](/reference/locks) can stop one plugin command by its full name (`deny: ['loyalty/redeem']`), all of a plugin's commands (`deny: ['loyalty/*']`), or every plugin's (`deny: ['custom']`). `'*'` stops them too, like everything else.
- A `custom` entry in `rules.commands` takes over every plugin command, so leave it out.

### Commands outside the story

`ignoresLocks: true` takes a command out of the [locks](/reference/locks). No lock stops it, whatever its `deny` says, and the view never greys out its button for one. No plugin's [guard](#guards) is asked about it either. Everything else still applies: the game's `rules.commands.custom` is still asked, the command's own `whyNot` still refuses, and `run` goes through [`apply`](/reference/commands#apply) as usual, with triggers and every plugin's `after` hook.

It's for tools that stand outside the story and must work at any point in it. The [debug plugin](/plugins/debug), for example, sets a stat by hand in the middle of an intro that only moves through its scenes. Never use it for something the player does in the story. A lock is how a game says "not now", and a player command that slips past it breaks the game's stages.

```ts
commands: {
  // A tool for the person testing the game, not a move the player makes.
  refill: {
    ignoresLocks: true,
    run: (_state, _args, { slice, set }) => set({ ...slice, free: slice.free + 1 }),
  },
}
```

[`lockOn`](/reference/locks#lockon) and [`lockedBy`](/reference/locks#lockedby) don't look at `ignoresLocks`, so they still say which lock matches the command. Only `whyNot`, and so the reducer and the view, lets it through.

## Naming

Content calls a plugin by its full name: the plugin's id, a `/`, and the name in the plugin's table. It's the same form content uses for the game's own custom functions, so a pack author only learns one.

| Kind | Content writes |
|---|---|
| condition | `{ custom: 'loyalty/stamps', with: { atLeast: 3 } }`, or in short `{ 'loyalty/stamps': { atLeast: 3 } }` |
| effect | `{ custom: 'loyalty/stamp' }`, or in short `{ 'loyalty/stamp': true }`, in a data scene choice's, an activity's or a trigger's effects |
| command | `{ type: 'custom', name: 'loyalty/redeem', with: {...} }`, on an [`ActionDef`](/reference/actions#actiondef): a place's action, a game action or a plugin's [button](#buttons) |
| value | <code v-pre>{{v:loyalty/stamps}}</code> in prose |

The short form has the plugin's full name as its only key, and what it asks as the value. See [`PluginCall`](/reference/custom#plugincall) for how a value that isn't an object is passed.

A name with a `/` belongs to a plugin. The engine looks it up among the plugins first, and only then among the game's [custom functions](/reference/custom), so keep `/` out of the game's own names.

A plugin usually exports small typed helpers that write these objects for authors who work in code, such as the quests plugin's [`questDone`](/plugins/quests#helpers).

**Gotchas.**
- A value name in prose is letters, digits, `_` and `-` after the `/`, so <code v-pre>{{v:loyalty/stamps-left}}</code> prints. Anything else isn't a token and is left on screen as written.
- A name nobody has fails quietly in play. A condition is false, an effect does nothing, a value is left on screen, and a command is refused with `There is no such thing to do.` The [loader](/reference/loader#the-checks) reports most of them when the game loads.

## Queries

```ts
queries?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>
```

Answers another plugin can ask for by full name, without importing this one. Use a query for what a condition's yes or no can't say, such as a place, a time or a list. The asker calls its context's `query`, and the answer is worked out with this plugin's own context, so it reads its own `slice`.

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
- Content can't call a query. There's no condition, effect or prose form, so it's for plugin code only.

### pluginQuery

```ts
import { pluginQuery } from '@ifloom/engine'

function pluginQuery(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => unknown) | undefined
```

A plugin's query by its full name, for code outside any plugin, such as a tool, a test or the [CLI](/cli/). It returns a function to ask it with, which runs with the owning plugin's own context for that state. It returns `undefined` when the game lacks the plugin or the query. `args` is `{}` if left out. A plugin's own code uses its context's `query` instead.

```ts
// Is it late enough for bed? Only a game with the calendar can say.
const bedtime = pluginQuery(game, 'calendar/bedtime')?.(state) ?? false
```

**Gotcha.** The answer is `unknown`. Cast it to what the plugin documents, and check it's there first, as `?.` does above.

## Cooperates

```ts
cooperates?: string[]
```

The ids of plugins this one works with when the game has them. Content written for this plugin may then name those plugins' conditions, effects and commands, in full or [in short](/reference/custom#plugincall), even in a game without them. The loader doesn't report them, and in play the condition is false, the effect does nothing and the command is refused.

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
- It only covers plugins the game doesn't have. In a game that has the partner, a name the partner doesn't declare is reported as usual.
- A plugin nobody lists in `cooperates` is still reported, as `no custom condition named "calendar/weekend"`.
- [`validatePack`](/reference/game#validatepack) excuses a long-form `{ kind: 'custom' }` effect of an absent partner, but still reports a game action whose `custom` command belongs to one. See [What validatePack adds](/reference/loader#what-validatepack-adds).
- A value in prose from an absent partner is left on screen.

## Effects run in order

A plugin's effect is a real step in its list. [`buildEffects`](/reference/custom#buildeffects) turns `{ custom: 'loyalty/stamp', with }` into an [`Effect`](/reference/effects#custom), `{ kind: 'custom', name: 'loyalty/stamp', with }`. When the list applies, each plugin effect runs on the state the effects before it left, so two stamps in one list give two stamps.

A game's own custom effect works differently. It's worked out up front, when the list is built, from the state before any of the list applies, and returns plain effects that take its place.

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

Each plugin's state lives in [`state.plugins`](/reference/state#plugins), keyed by plugin id, along with the version of its shape. For the card, `state.plugins.loyalty` is `{ version: 2, state: { stamps: 0, free: 0 } }`. [`startingState`](/reference/commands#startingstate) fills it from each plugin's `start`. Like the rest of the [state](/reference/state), it must be plain JSON.

When the shape changes, bump `version` and add a step keyed by the version it upgrades from. The engine's own [saves](/reference/saves#migrate) follow the same rule.

```ts
version: 2,
migrations: {
  1: (old) => ({ stamps: (old as { stamps: number }).stamps, free: 0 }),
},
```

### migratePlugins

```ts
import { migratePlugins } from '@ifloom/engine'

function migratePlugins(state: GameState, game: Game): GameState | string
```

Brings every plugin's state up to the version the game has:

- a plugin added since the save was made starts fresh from `start`;
- an older state is carried forward one step at a time;
- the state of a plugin the game no longer has is kept as it is, unused.

It returns the reason as a string when it can't:

| Returns | When |
|---|---|
| `That save was made with a newer version of <id>.` | The saved version is higher than the plugin's. |
| `That save's <id> is from a version this game cannot read.` | A step on the way is missing. |

Both are the engine's [`pluginNewer` and `pluginUnreadable`](/reference/strings#saves) strings, so a game can reword them.

It returns the same object when nothing changed. [`saves().read` and `importText`](/reference/saves#saves) run it and refuse a save with its reason. [`hydrate`](/reference/commands#hydrate) runs it too, so every command does. [`apply`](/reference/commands#apply) refuses to run a command on a state `migratePlugins` gives a reason for, so a plugin never writes over a state it couldn't read.

**Gotcha.** [`hydrate`](/reference/commands#hydrate) doesn't refuse. It keeps the old plugin state as it is, and a [`view`](/reference/view) drawn from it lets the plugin read a shape it may not expect. Load saves through [`saves()`](/reference/saves#saves) or the [runner](/reference/runner), which refuse such a save. If you read a state some other way, call `migratePlugins` yourself and check for a string:

```ts
const ready = migratePlugins(state, game)
if (typeof ready === 'string') showMessage(ready)
else state = ready
```

## Hooks

| Hook | When |
|---|---|
| `turn(state, context)` | At the end of each turn, after [`rules.turn`](/reference/rules#turn)'s effects and the game's own [`rules.onTurn`](/reference/rules#onturn). A turn ends on each [`turn`](/reference/effects#turn) effect, including those the [calendar](/plugins/calendar#what-a-turn-is)'s `calendar/pass` and `sleep()` apply. See [The end of a turn](/reference/rules#the-end-of-a-turn). |
| `after(before, after, context)` | After every command that took. `before` is the state the command started from, and the context belongs to `after`. |

Those are the only two. Plugins' hooks run in the order `game.plugins` lists them, and each gets the state the one before it left. To notice the player moving, use `after` and ask `places/here`, as the example below does.

Within one command, the order is:

1. the command runs, including the end of any turn it causes (the game's `onTurn`, then each plugin's `turn`);
2. the game's [triggers](/reference/triggers) fire;
3. the scene left on screen is counted as [seen](/reference/state#seen);
4. each plugin's `after` runs, last. Triggers don't see what it changes until the next command.

A plugin that keeps a diary of the player's days might use both:

```ts
import { definePlugin } from '@ifloom/engine'

type Diary = { days: number; places: string[]; commands: number }

export const diary = definePlugin<Diary>({
  id: 'diary',
  version: 1,
  start: () => ({ days: 0, places: [], commands: 0 }),
  hooks: {
    turn: (_state, { slice, set }) => set({ ...slice, days: slice.days + 1 }),
    after: (_before, _after, { slice, set, query }) => {
      // Where the player is now, if the game has the places plugin.
      const here = query<string | null>('places/here') ?? null
      const places = here === null || slice.places.includes(here) ? slice.places : [...slice.places, here]
      return set({ ...slice, places, commands: slice.commands + 1 })
    },
  },
})
```

**Gotchas.**
- `after` only runs through [`apply`](/reference/commands#apply) and `dispatch`, and only when the command took. It doesn't run on `start`, on a refused command, or under [`applyEffects`](/reference/effects#applyeffects). A plugin whose view or conditions must be right on the first frame should work out what it needs from the state, as the [quests plugin](/plugins/quests) does, rather than rely on `after` having run.
- Return the state you were given when nothing changes. Calling `set` with an equal slice still makes a new state object.

## The profile

Some things a plugin tracks should outlive a save, such as achievements the player has earned or endings they've seen. Those go in the player's [profile](/reference/profile), in a namespace named after the plugin's id. A plugin can't write there itself, because its functions are pure and never do I/O. Instead, it declares `profile.onCommand`, and the [runner](/reference/runner#finished) calls it after every command that takes:

```ts
import { definePlugin } from '@ifloom/engine'

// Remembers every ending the player has reached, across every game they play.
export const endings = definePlugin({
  id: 'endings',
  version: 1,
  profile: {
    onCommand: (state, previous, stored) => {
      const reached = (stored as string[] | undefined) ?? []
      const scene = state.sceneId
      if (!scene?.startsWith('ending.') || scene === previous.sceneId || reached.includes(scene)) return undefined
      return [...reached, scene]
    },
  },
})
```

It's called with the state after the command, the state before it, what the plugin's namespace holds now (`undefined` if nothing), and the plugin's context. Return the new value to store, or `undefined` to leave it as it is. The runner writes each answer in order, so each call sees the value the one before it stored.

A UI reads the namespace from the runner, as in `await runner.profile?.get('endings')`.

**Gotchas.**
- Only a runner with a `profile` calls `onCommand`. [`apply`](/reference/commands#apply), `dispatch` and [`replay`](/reference/runner#replay) never do, so a replayed log doesn't award anything twice.
- The profile isn't in the context, so a plugin's conditions, effects and view can't read it. That's on purpose: a condition that read the profile could hold in one playthrough and not in a replay of it. Anything the story needs to branch on belongs in the plugin's state.

## Guards, prices and labels

Three more fields let a plugin watch every command, not just its own. A guard says whether a command may go ahead, a price adds to what a button says it costs, and a label says where the game is. A guard and a price are both handed the effects the command would apply, worked out before it runs by [`effectsOf`](/reference/actions#effectsof).

As an example, take a sink of dirty dishes in the flat. Cooking and baking add to it, and washing up takes the rest of the turn.

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
    // Empty the sink, then end the turn, so the turn's hooks see the clean sink.
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

The flat offers the buttons, as a location of the [places plugin](/plugins/places#locationdef):

```ts
import { onlyAt } from '@ifloom/plugin-places'

// in the pack
activities: [
  { id: 'cook', requires: [onlyAt(['flat'])], effects: [{ kind: 'stat', key: 'energy', by: 20 }, { 'dishes/add': { by: 2 } }] },
  { id: 'bake', requires: [onlyAt(['flat'])], effects: [{ kind: 'item', id: 'loaf', by: 1 }, { 'dishes/add': true }] },
],
// on the flat, in data.places.locations
actions: [
  { id: 'cook', label: 'Cook dinner', command: { type: 'activity', id: 'cook' } },
  { id: 'bake', label: 'Bake bread', command: { type: 'activity', id: 'bake' } },
  { id: 'wash', label: 'Wash up', command: { type: 'custom', name: 'dishes/wash' } },
],
```

With two dishes in the sink:

```ts
import { apply, view } from '@ifloom/engine'

const screen = view(state, game)
screen.when                                  // 'Your flat · 2 in the sink', with places listed before dishes
const cook = screen.actions.find((a) => a.id === 'cook')!
cook.disabled                                // undefined: it can be pressed
cook.warning                                 // 'The dishes would pile up. Wash up first.'
cook.price                                   // { notes: ['2 dishes to wash'] }
apply(state, game, { type: 'activity', id: 'cook' }).refused // 'The dishes would pile up. Wash up first.'
```

With three, Bake bread is greyed out with `Not with the sink this full.` Wash up empties the sink and ends the turn.

### Guards

```ts
guard?: (state: GameState, asked: Asked, context: PluginContext<S>) => Refusal | undefined

type Asked = { command: Command; effects: readonly Effect[] }
type Refusal = string | { reason: string; soft: true }
```

Whether a command may go ahead. `asked.command` is the [command](/reference/commands#command), and `asked.effects` is what it would apply, from [`effectsOf`](/reference/actions#effectsof). `state` and the context are the state before the command. Return one of these:

- `undefined` to let it through.
- A string to refuse it, as a [lock](/reference/locks) does. [`whyNot`](/reference/actions#whynot) returns the line, so the view greys the button out with it and the reducer refuses with it.
- `{ reason, soft: true }` for a warning. The button can still be pressed and carries `reason` as its [`warning`](/reference/view#renderedchoice), but the reducer refuses the command with `reason` all the same. The [calendar](/plugins/calendar#the-guard)'s past-dawn warning works this way: the UI shows the warning and offers something else, here washing up.

Every plugin's guard is asked about every command, in the order `game.plugins` lists them, except a plugin command that sets [`ignoresLocks`](#commands-outside-the-story). Guards are asked after the locks, and before the game's own [`rules.commands`](/reference/rules#commands) and what the command itself needs, such as an activity's `requires` and cost. A refusal from any plugin wins over a warning from any plugin, and among warnings the first wins. See [`warningOf`](/reference/actions#warningof).

**Gotchas.**
- `effects` is empty for a built-in command whose effects can't be known before it runs, such as `scene`, `leave` or `input`. Test `command` for those. A plugin command's list is what its [`effectsOf`](#saying-what-a-command-does) says. The calendar's `sleep()` gives the `calendar/pass` it makes, but not the turns that pass ends.
- Every button shows a guard's refusal and its warning. That includes the game's and plugins' buttons, scene choices (after the choice's own `disabled`), the [cast](/plugins/cast)'s Talk buttons and the [places plugin](/plugins/places#exitview)'s exits.
- An effect applied inside another effect isn't in the list. The turn `dishes/wash` ends isn't there, only `dishes/wash` itself.

### Prices

```ts
price?: (state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] | undefined
```

What a button costs that the engine can't say, in the plugin's words, such as `['2 dishes to wash']`. Every plugin's notes go in the button's [`price.notes`](/reference/view#price), in the order `game.plugins` lists them. The engine asks with the effects of each button's command, from [`effectsOf`](/reference/actions#effectsof), and of each scene choice. A button whose effects are empty isn't asked about. A button with notes but no cost gets a price of only `{ notes }`.

**Gotcha.** An activity's effects begin with its cost, as a negative `stat` effect for each stat it spends. The engine already shows those in `stats`, so a price shouldn't repeat them.

### Labels

```ts
label?: (state: GameState, context: PluginContext<S>) => string | undefined
```

Where the game is, in a few words for a header or a save, such as `'Day 3 · Wednesday morning'`. Every plugin's label, in the order `game.plugins` lists them and joined with ` · `, makes [`view.when`](/reference/view#the-clock-and-the-player). It's `null` when no plugin gives one. Return `undefined` to say nothing.

### Performance

The engine only works out a command's effects for guards and prices when some plugin in the game has a `guard` or a `price`. A game without one pays nothing for them, apart from a [lock with `effect`](/reference/locks#lock).

## Saying what a command does

```ts
effectsOf?: (state: GameState, args: PluginArgs, context: PluginContext<S>) => Effect[]
```

The engine can't see inside a [`PluginCommand`](#plugincommand)'s `run`, so the command says what it would apply. Guards, prices and [locks with `effect`](/reference/locks#lock) read this list. Without `effectsOf`, the command applies nothing they can see.

```ts
wash: {
  run: (_state, _args, { apply }) => apply([{ 'dishes/wash': true }]),
  effectsOf: () => [{ kind: 'custom', name: 'dishes/wash' }],
},
```

**Gotchas.**
- The list is plain [`Effect`](/reference/effects)s, so write a plugin's effect in the long form, `{ kind: 'custom', name, with }`, not the short form.
- Keep it in step with `run`. Nothing checks that the two agree.

## Applying effects

```ts
apply: (effects: readonly EffectRef[], on?: GameState) => GameState
```

On the [context](#plugincontext), `apply` applies a list of effects as content would and returns the next state. Anything content can write goes in the list: built-in effects, the game's [custom effects](/reference/custom#effects) and plugins' effects (this plugin's own included), in the long form or [in short](/reference/custom#plugincall). They apply in order, each on the state the one before it left. The list is built from `on`, which defaults to the state the function was handed.

This is how a plugin's effect or command ends a turn. `apply([{ kind: 'turn' }])` runs the whole [end of a turn](/reference/rules#the-end-of-a-turn), with `rules.turn`, `onTurn` and every plugin's `turn` hook.

```ts
// Empty the sink first, so the turn's hooks see it empty.
wash: (_state, _args, { set, apply }) => apply([{ kind: 'turn' }], set({ dirty: 0 })),
```

**Gotchas.**
- As with `set`, without `on` it builds on the state the function was handed, not one you've changed since. Chain them by passing the result as `on`.
- A `turn` effect applied while a turn is already ending does nothing. From a `turn` hook, or from an effect in what `rules.turn` returns, `apply([{ kind: 'turn' }])` leaves the turn as it is.
- It applies effects and nothing more. Triggers and `after` hooks run once the command is done, as they do for any command.

## The view

`view(state, context)` returns whatever the plugin's UI needs. The engine's [`view()`](/reference/view#plugins) collects each one at `plugins[id]`, and a plugin without `view` has no entry. The engine never looks inside it, so type it where you read it:

```ts
import { view } from '@ifloom/engine'

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

What the screen shows while no scene is open, such as a room's description, a shop front or a heading over a dashboard. The view asks each plugin in the order `game.plugins` lists them, and the first that returns a `StageDef` fills [`view.scene`](/reference/view#the-scene). `title` becomes the title, and `body` is rendered as a data scene's body would be (prose keys, variants, conditions and the game's prose), with `id: null`, `frame: 'stage'` and no choices. Return `undefined` to let the next plugin answer.

| Field | What it is |
|---|---|
| `title` | The heading, such as a room's name. |
| `body` | What's written there, as [blocks](/reference/scenes#block). Left out, the body is empty. |
| `id` | The id its blocks are drawn under. A [`variants`](/reference/scenes#block) block rotates per id, so a plugin that stages several places gives each its own id to keep its lines separate. The plugin's id if left out. |

With no plugin answering, the screen is the game's `title` and an empty body. The [places plugin](/plugins/places#the-stage)'s stage is the room the player is in, with its name and its `body`.

A market stall on the high street fills the screen while it's open:

```ts
import { definePlugin } from '@ifloom/engine'

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
- The first answer wins, so a plugin listed earlier in `game.plugins` hides a later one's stage. Only answer when the stage is yours. The stall's is `undefined` once it's packed up.
- A scene with no title of its own takes the stage's title, then the game's. The stall's scenes are headed The market stall while it's open.
- Only `view.scene` changes. In a game with the [places plugin](/plugins/places) listed after the stall, the stall covers the room's description, but `view.plugins.places` still says where the player is and the exits are still drawn.
- The loader doesn't see a stage's blocks, because they're worked out in play. Check the prose keys they name in [`check`](#content-and-checks) with `blockProblems`.

## Buttons

```ts
buttons?: (state: GameState, context: PluginContext<S>) => readonly ActionDef[] | undefined
```

Buttons the plugin offers while no scene is open, such as the stall's Haggle. Each is an [`ActionDef`](/reference/actions#actiondef), the same shape as the game's own actions. The view puts every plugin's buttons first, in the order `game.plugins` lists them, then the game's own [`actions`](/reference/game#game). The [places plugin](/plugins/places#the-buttons)'s buttons are the current location's `actions`. All of them are drawn alike with [`renderAction`](/reference/view#renderaction), which gives each a price, `blocked`, a [guard](#guards)'s warning and [`whyNot`](/reference/actions#whynot)'s reason.

```ts
// The stall above, with a game action to buy bread:
view(state, game).actions.map((action) => action.id) // ['haggle', 'buy']
```

**Gotchas.**
- A button whose `when` doesn't hold is left out, and so is one whose command is stopped by a [lock](/reference/locks) with `hide: true`. Any other lock greys it out with its line, like any button.
- Like the game's own actions, they aren't offered while a scene is open or while a lock that stops everything is on ([`lockedOut`](/reference/locks#lockedout)).
- The loader doesn't see them. Check what their commands name in [`check`](#content-and-checks) with `commandProblems`.

## Audio

```ts
audio?: (state: GameState, context: PluginContext<S>) => Record<string, string | null> | undefined
```

What the plugin puts on background [audio channels](/reference/audio#channels), by channel, such as `{ ambience: 'cafe.murmur' }`. Return `undefined` or `{}` to leave every channel alone. The [places plugin](/plugins/places#audio) uses it to play the location's `audio` while the player is there.

```ts
// The stall rings its bell while the market is on.
audio: (state) => (state.flags.marketOpen ? { ambience: 'market.bell' } : undefined),
```

It comes third of [four levels](/reference/audio#what-plays-on-a-background-channel). An open scene's `audio` and an [`audio` effect](/reference/effects#audio) both win over it, and it wins over the game's default. When several plugins name the same channel, the first in `game.plugins` wins. `null` silences a channel, and a channel you leave out goes to the next plugin, then the default.

**Gotchas.**
- The engine asks it on every [`view`](/reference/view) and after every command, so keep it cheap.
- The loader doesn't see the tracks it names. Check them in [`check`](#content-and-checks) with `audioProblems`.

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

Who a scene's [`speaker`](/reference/scenes#sceneview) id is, for the screen. The view asks each plugin in the order `game.plugins` lists them, and the first that returns a [`SpeakerView`](/reference/view#speakerview) becomes [`view.scene.speaker`](/reference/view#the-scene). Return `undefined` for an id that isn't yours, so the next plugin can answer.

| Field | What it is |
|---|---|
| `id` | The speaker id, as the scene named it. |
| `name` | What the player reads over their lines. |
| `hue` | A colour for their lines, as a hue from 0 to 360. `null` leaves it to the UI. |
| `portrait` | Their picture, as a path or URL. `null` for none. |

With no plugin answering, the scene has no speaker. The [cast](/plugins/cast#speakers) answers for its characters, such as Ava in the showcase. The id is never guessed from the scene's id.

A plugin that keeps the café's regulars says who's talking from its own content:

```ts
import { definePlugin } from '@ifloom/engine'

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
import { pluginSpeaker } from '@ifloom/engine'

function pluginSpeaker(game: Game, state: GameState, id: string): SpeakerView | undefined
```

What the first plugin that knows `id` says it is, or `undefined` if none does. The view calls it for every scene with a speaker. A tool or a UI drawing a speaker outside a scene, such as a list of who's in the room, can call it the same way.

```ts
pluginSpeaker(game, state, 'mo')?.name   // 'Mo'
pluginSpeaker(game, state, 'nobody')     // undefined
```

**Gotchas.**
- The first answer wins, so for an id two plugins both know, the one listed earlier in `game.plugins` decides.
- The loader doesn't check a scene's `speaker` against any plugin. An id nobody knows gives no speaker, without a problem.

## Kinds and entities

```ts
kinds?: readonly KindDef[]
entities?: (game: Game) => readonly EntityDef[]
```

A plugin can bring the [kinds](/reference/entities#kinddef) of thing it keeps, and the [entities](/reference/entities#entitydef) of those kinds there at the start. Each entity then has stats and variables that content works on with `of`, `each` and `count`, like any the game declares. The cast does this: each character is an entity of the kind `character`, which is how the showcase's `friendship` stat belongs to Ava and Sam.

- **`kinds`** are merged by the [loader](/reference/loader#loadgame) before the game's own, plugin by plugin in the order `game.plugins` lists them. A kind the game declares with the same id, on the base or in a pack, replaces the plugin's. That's how a game renames one.
- **`entities(game)`** is called once the game is loaded, with every pack's content merged, so a plugin makes its entities from its own `data`, a mod's entries included. An entity the game declares itself with the same kind and id wins, whole. The rest join [`game.entities`](/reference/game#game) and are [checked](/reference/loader#the-checks) like any declared entity, against the plugin's id.

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
- **Only through `loadGame`.** A game built by hand, without the [loader](/reference/loader#loadgame), gets neither. List the kinds in `game.kinds` and the entities in `game.entities` yourself.
- **`entities` runs before the prose is ready.** `game.prose` isn't set yet when it's called, so read only `game.data` and the other content lists.
- **A save carries them in.** A declared entity a save doesn't have, such as one a new entry in the plugin's content makes, joins the save when it loads, unless it was removed in play. See [Entities in old saves](/reference/entities#entities-in-old-saves).

## Content and checks

A plugin's content, such as quests or recipes, lives in a pack's `data`, by plugin id and then by list name. Each entry has an `id`:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  data: { loyalty: { cards: [{ id: 'cafe', stampsToFill: 5 }, { id: 'market', stampsToFill: 8 }] } },
}
```

The [loader](/reference/loader#pack) merges `data` as it merges scenes: a later pack's entry replaces an earlier one with the same id, whole. The result is at `game.data.loyalty.cards`. The base game can carry `data` too, ahead of every pack.

### PluginEntry

```ts
type PluginEntry = { id: string; [field: string]: unknown }
```

One entry in a plugin's content: an `id`, and whatever fields the plugin reads. `game.data` and a pack's `data` are `Record<string, Record<string, readonly PluginEntry[]>>`, so a pack writes entries without a cast. The engine reads only `id`. The plugin gives the other fields their types where it reads them, and checks them in `check`.

`check(game, tools)` runs once the game is loaded. It returns a [`PluginProblem`](#pluginproblem) for each fault in the plugin's content. The loader lends it [`CheckTools`](#checktools), so the plugin can check its conditions, blocks and buttons with the loader's own checks, in the same words:

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
  audioProblems: (audio: Record<string, string | null> | undefined) => string[]
  stageProblems: (stage: MediaStage | undefined) => string[]
}
```

What the loader lends a plugin's `check`. Each one returns problems worded as the loader words its own, or an empty list when there are none. They're the checks listed under [The checks](/reference/loader#the-checks).

| Tool | Checks |
|---|---|
| `conditionProblems(condition)` | A [condition](/reference/conditions), as under [In a condition](/reference/loader#in-a-condition). `undefined` has no problems. |
| `blockProblems(blocks)` | Prose keys with no prose, [`variants`](/reference/scenes#block) with no lines, each block's `when` and a `variants` block's `gate`, and a `{ media }` block's pool, tags and flags. Use it for a [stage](#stage) or any other blocks the plugin draws. |
| `commandProblems(command)` | A `scene`, `activity`, `use` or `custom` [command](/reference/commands#command), as under [In a command](/reference/loader#in-a-command). A `custom` command of an [absent partner](#cooperates) isn't reported. Other command types have no problems. Use it for [buttons](#buttons) built from the plugin's content. |
| `audioProblems(audio)` | Background audio by channel, as under [Audio](/reference/loader#audio): an unknown track or channel, a cue channel, or a sound's track on a background channel. `undefined` has no problems. Use it for what your [`audio`](#audio) hook plays. |
| `stageProblems(stage)` | A [stage](/reference/scenes#the-stage) with no scene, such as a place's, as under [Media](/reference/loader#media): its layers' pools, tags and flags, its hotspots' rects, ids, layers and commands, and the conditions on both. A hotspot can't name a `choice` here. `undefined` has no problems. Draw the stage with [`stageView`](/reference/view#stageview). |

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

What's wrong with how content calls one of this plugin's conditions, effects or commands. `kind` says which, `name` is the name without the prefix, and `args` is what the call passes in `with`. It's `{}` if nothing is passed, and a [short call](/reference/custom#plugincall)'s value that isn't an object arrives as `{ value }`. Return the problems, worded for the author, or `[]`.

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

The loader asks it about every call it checks, and reports each problem as the call's own, where the call is. That covers every condition, effect list and command in [The checks](/reference/loader#the-checks), and everything another plugin's `check` passes to `conditionProblems`, `blockProblems` or `commandProblems`. The [cast](/plugins/cast#checks), for example, passes its characters' schedule conditions in.

**Gotchas.**
- A call to a plugin the game doesn't have isn't asked about. The name is reported or let through as the [checks](/reference/loader#the-checks) say.
- A location's actions are the places plugin's content. The [places plugin](/plugins/places#checks) passes their commands to `commandProblems` itself, so a `go('lido')` on a button is reported as `action swim: unknown location "lido"`.

### PluginProblem

```ts
type PluginProblem = { list: string; id: string; what: string }
```

Which list, which entry, and what's wrong. The loader turns it into a [`Problem`](/reference/loader#problem-and-describeproblem) whose `where` is `<list> <id>`, pinned on the pack that entry came from, or on `base` if it came from no pack:

```text
mod:sunday-market · cards market · unknown storyline "sam"
```

## Saves

A save records each plugin's version in [`meta.plugins`](/reference/saves#savemeta). A save made with a plugin the game no longer has still loads, keeps that plugin's state untouched, and names the plugin in [`missingPlugins`](/reference/saves#loadedsave). A save whose plugin state can't be carried forward is refused with [`migratePlugins`](#migrateplugins)'s reason.

## definePlugin

```ts
import { definePlugin } from '@ifloom/engine'

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
const full = loyalty.write(state, { stamps: 0, free: 1 }) // a test that starts with a free coffee
```

A plugin is a plain object, so `definePlugin` is optional, but it types `S` throughout and gives you `read` and `write`. A plugin package usually exports a factory that returns one, such as [`quests()`](/plugins/quests#quests).

## pluginById

```ts
import { pluginById } from '@ifloom/engine'

function pluginById(game: Game | undefined, id: string): Plugin | undefined
```

The plugin with this id, if the game has it. Use it in a tool or a UI that needs to know whether a game has a plugin before it draws that plugin's panel.

```ts
if (pluginById(game, 'loyalty')) drawCard(view(state, game).plugins.loyalty)
```

## Gotchas

- **Plugins are chosen when the game is built.** They go on the base you pass to [`loadGame`](/reference/loader#loadgame), not in a pack. A mod can bring data for a plugin the game has, but it can't add a plugin.
- **A plugin's state is part of the save.** Keep it plain JSON. Every shape change needs a version bump and a migration step, or older saves are refused.
- **Effects can't refuse.** An effect returns a new state. To stop the player, give the command a `whyNot`, put a requirement on the activity, or have a [guard](#guards) refuse any command that would apply the effect.
- **A plain-effect list takes the long form.** Item uses and [`rules.turn`](/reference/rules#turn) take plain [effects](/reference/effects#custom), not `{ custom }` or the short form. There, write `{ kind: 'custom', name: 'loyalty/stamp', with }`, which runs the same way. [`validatePack`](/reference/game#validatepack) reports a name no plugin has, but the loader doesn't.
- **Keep names stable.** Content refers to plugin conditions, effects and commands by name, so renaming one breaks every pack that uses it.
