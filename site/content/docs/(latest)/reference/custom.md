---
title: "Custom functions"
description: "Custom conditions, effects, values and panels: code a game declares by name and content calls, and what they're given."
---
Most content is data, such as conditions, effects and prose, which a tool can read, a mod can ship and the [content checker](/docs/reference/checks) can check. When something has to be worked out in code, such as whether it's market day or what a loaf costs today, you declare a custom function on `game.custom` and content calls it by name.

```ts
import type { Game } from '@ifloom/engine'

const town: Game = {
  // ...
  custom: {
    conditions: { marketDay: (state) => state.turn % 7 === 5 },
    effects: { tip: (state, args) => [{ kind: 'stat', stat: 'coins', by: -Number(args.by ?? 1) }] },
    values: { breadPrice: (state) => (state.kv.marketDay ? 4 : 5) },
    panels: { stallPrices: (state) => ({ bread: state.kv.marketDay ? 4 : 5, jam: 3 }) },
  },
}
```

| Kind | Content writes | Where |
|---|---|---|
| `conditions` | `{ custom: 'marketDay' }` | Any [condition](/docs/reference/conditions#custom) |
| `effects` | `{ custom: 'tip', with: { by: 2 } }` | A data scene choice's [effects](/docs/reference/effects#computed-effects), an [activity](/docs/reference/actions#activitydef)'s `effects`, a [trigger](/docs/reference/triggers)'s `effects`, an [`each`](/docs/reference/effects#each)'s `effects`, what another custom effect returns, and a plugin's [`context.apply`](/docs/reference/plugins#applying-effects) |
| `values` | `{{v:breadPrice}}`, or `{ value: 'breadPrice' }` | [Prose](/docs/reference/prose#tokens), a stat's [`max`](/docs/reference/stats#statdef), an app's badge |
| `panels` | `panelData: 'stallPrices'` | A [data scene](/docs/reference/scenes#paneldata) |

A [plugin](/docs/reference/plugins)'s conditions, effects and values are called the same way, with the plugin's id and a `/` in front, as in `{ custom: 'quests/done', with: { quest: 'bread' } }` or `{{v:quests/updates}}`. You can also write a plugin's condition, effect or command [in short](#plugincall), with its name as the key: `{ 'quests/done': { quest: 'bread' } }`. A name with a `/` is looked up among the plugins first, so keep `/` out of your game's own names.

There's no global registry. Each game owns its own functions, so two games on one page, or a test next to a game, never see each other's. Everything that reads a custom function takes the game, and finds nothing without it.

## What a custom function is given

Every custom function gets the state and a [`CustomContext`](#customcontext). A condition, an effect and a value also get their `with` as `args`, or `{}` when it's left out. A plugin's functions get the same context and more, so a custom function can do what a plugin's condition can: ask a plugin's [query](/docs/reference/plugins#queries), read a plugin's value, and draw a seeded number.

```ts
import type { CustomEffect } from '@ifloom/engine'

// Tips are better in the evening, by the calendar plugin's clock.
const tips: CustomEffect = (state, args, { query }) => {
  const evening = query<{ period: string }>('calendar/now')?.period === 'evening'
  return [{ kind: 'stat', stat: 'coins', by: evening ? 4 : 2 }]
}
```

## CustomContext

```ts
type CustomContext = {
  game: Game
  query: <T = unknown>(name: string, args?: PluginArgs) => T | undefined
  value: (name: string, args?: PluginArgs) => string | number | undefined
  roll: (max: number, name: string) => number
}
```

- `game` is the game the function was called for, so it can call [`holds`](/docs/reference/conditions#holds) or [`statValue`](/docs/reference/stats#statvalue) with it.
- `query` asks a plugin's [query](/docs/reference/plugins#queries) by its full name, and gives `undefined` when the game doesn't have that plugin.
- `value` reads a [value](#values) by name, a plugin's (`messages/unread`) or the game's own, asked with `args`. It's `undefined` when nobody has one by that name.
- `roll(max, name)` draws a whole number from 0 to `max - 1`, from the save's seed, the turn and `name`. The same save on the same turn always draws the same number, so a replay plays the same. Use a different `name` for each draw.

A [plugin's context](/docs/reference/plugins#plugincontext) has all of these too.

## Custom

```ts
type Custom = {
  conditions?: Record<string, CustomCondition>
  effects?: Record<string, CustomEffect>
  values?: Record<string, CustomValue>
  panels?: Record<string, CustomPanel>
}
```

The type of `game.custom` and of a [pack](/docs/reference/loader#pack)'s `custom`. Every kind is optional.

When packs are loaded, each kind merges by name. A later pack's `conditions.marketDay` replaces an earlier pack's and leaves the rest alone. See [How packs merge](/docs/reference/loader#how-packs-merge).

## Conditions

```ts
type CustomCondition = (state: GameState, args: PluginArgs, context: CustomContext) => boolean
```

A test worked out from several values rather than read from one. Content calls it as `{ custom: name }` anywhere a [`Condition`](/docs/reference/conditions) goes, such as a block's `when`, a lock or a schedule entry. Its `with` arrives as `args`, or `{}` when left out, so one function can serve several tests.

```ts
custom: {
  conditions: {
    isRegular: (state) => (state.seen['ava.hi'] ?? 0) >= 3,
    visitedAtLeast: (state, args) => (state.seen['ava.hi'] ?? 0) >= Number(args.times ?? 1),
  },
}

// in a data scene
{ text: 'ava.hi.regular', when: { custom: 'isRegular' } }
{ text: 'ava.hi.usual', when: { custom: 'visitedAtLeast', with: { times: 10 } } }
```

**Gotcha.** A name the game doesn't declare is false rather than an error, so a broken mod hides content instead of crashing. The [content checker](/docs/reference/checks) reports it, and [`explain`](/docs/reference/conditions#explain) shows it as `custom condition isRegular is not declared by the game`.

## Effects

```ts
type CustomEffect = (state: GameState, args: PluginArgs, context: CustomContext) => EffectRef[]
type EffectRef = Effect | { custom: string; with?: Record<string, unknown> } | PluginCall
```

Effects worked out from the state. A data scene choice's `effects` is a list of `EffectRef`, which mixes plain effects with custom ones by name. A custom effect runs in its turn: when the effects before it in the list have applied, its function is called with the state they left, and the effects it returns apply there and then. Its `with` arrives as `args`. The list it returns can hold anything content can write: plain effects, a plugin's effect such as `{ 'quests/start': { quest: 'letter' } }`, or another of the game's own custom effects.

```ts
custom: {
  effects: {
    bumpVisits: (state, args) => {
      const now = Number(state.storylines.ava?.kv.visits ?? 0)
      return [{ kind: 'storylineKv', storyline: 'ava', key: 'visits', to: now + Number(args.by ?? 1) }]
    },
  },
}

// a choice
effects: [{ custom: 'bumpVisits', with: { by: 1 } }, { kind: 'scene', scene: null }]
```

Because each one sees the effects before it, two in a row compose. Here the second `double` doubles what the first left:

```ts
custom: {
  effects: { double: (state) => [{ kind: 'stat', stat: 'coins', by: state.stats.coins }] },
}

effects: [{ kind: 'stat', stat: 'coins', by: 4 }, { custom: 'double' }, { custom: 'double' }]
```

**Gotchas.**
- A button's price, and what a plugin's [guard](/docs/reference/plugins#guards-prices-and-labels) or a [lock](/docs/reference/locks) sees, is worked out before the button is pressed. For those, a custom effect is called with the state on screen, as [`previewEffects`](#previeweffects) does. When the effects run, it's called again in its turn, so it can return something different if the effects before it changed what it reads.
- Item uses take plain [effects](/docs/reference/effects), not `EffectRef`. Write the long form there, `{ kind: 'custom', name: 'tip', with: { by: 2 } }`, which runs the same way.
- Inside an [`each`](/docs/reference/effects#each), the function runs once per entity, on the state the entities before it left.
- A custom effect that returns another of the game's custom effects runs that one in its turn too. This stops at 10 deep, so a custom effect that names itself does nothing past that rather than hanging.

The showcase has one: [`postLatest`](/docs/guide/showcase#feeds-and-an-effect-worked-out-in-code) posts the newest photo and rolls its likes.

## PluginCall

```ts
type PluginCall = { [name: `${string}/${string}`]: PluginArgs | true }
```

A plugin's condition, effect or command in short, with its full name as the only key and its arguments as the value. These two are the same:

```ts
{ 'quests/done': { quest: 'bread' } }
{ custom: 'quests/done', with: { quest: 'bread' } }
```

It works anywhere a [condition](/docs/reference/conditions), an [`EffectRef`](#effects) or a [`CommandRef`](#commandref) goes, and the [content checker](/docs/reference/checks) checks the name as it checks `{ custom }`. Plugins' helpers, such as `questDone('bread')`, write this form.

The value is always the arguments as an object, named as the [content naming rule](/docs/reference/effects#effect) names them. A call that takes none is written `true`:

| Written | Asked with |
|---|---|
| `{ 'quests/done': { quest: 'bread' } }` | `with: { quest: 'bread' }` |
| `{ 'places/at': { location: ['cafe', 'park'] } }` | `with: { location: ['cafe', 'park'] }` |
| `{ 'calendar/weekend': true }` | no `with`, so `{}` |

```ts
// in a data scene: Ava thanks you once the bread quest is done
{ text: 'ava.hi.thanks', when: { 'quests/done': { quest: 'bread' } } }
// a choice that starts it
{ id: 'offer-help', effects: [{ 'quests/start': { quest: 'bread' } }, { kind: 'scene', scene: null }] }
```

**Gotchas.**
- Anything else as the value, such as a list, a string, a number or `false`, is a problem the [content checker](/docs/reference/checks) reports as `"places/at" takes its arguments as an object, …`. The call is still made, with no arguments.
- It's read as a call only when the object has exactly one key, that key has a `/`, and the object has no `kind`, `type` or `custom`. If you add a second key, such as a typo or a stray `when`, it's no longer a call. As a condition it's false, and as an effect it does nothing.
- Your game's own conditions and effects have no `/` in their names, so they have no short form. Write `{ custom: 'marketDay' }`.
- Packs written before schema 7 passed a bare value, as in `{ 'places/at': ['cafe'] }`. The [content migration](/docs/reference/loader#upgradepack) names it for the first-party plugins' calls when the pack loads.

## CommandRef

```ts
type CommandRef = Command | PluginCall
```

A command as content and code write it: any [command](/docs/reference/commands), or a plugin's in short. `{ 'places/go': { id: 'cafe' } }` is `{ type: 'custom', name: 'places/go', with: { id: 'cafe' } }`. An [action](/docs/reference/actions#actiondef)'s and a choice's `command` take one, and so do [`apply`](/docs/reference/commands#apply), [`whyNot`](/docs/reference/actions#whynot), [`effectsOf`](/docs/reference/actions#effectsof) and the runner's `apply`. The [view](/docs/reference/view) always shows the long form, so a UI that reads `command.type` still can.

## commandOf

```ts
function commandOf(ref: CommandRef): Command
```

A command in the long form: a plugin's short call becomes `{ type: 'custom', name, with }`, and anything else comes back as it is. Use it when your own code reads `type` on a command that content wrote.

```ts
import { commandOf } from '@ifloom/engine'

commandOf({ 'places/go': { id: 'cafe' } })
// { type: 'custom', name: 'places/go', with: { id: 'cafe' } }
```

## Values

```ts
type CustomValue = (state: GameState, args: PluginArgs, context: CustomContext) => string | number
type ValueRef = { value: string; with?: PluginArgs }
```

A number or a word the prose needs to print, such as a price that moves or today's special. A value can also be the ceiling of a stat that grows, an app's [badge](/docs/plugins/devices#appdef) or an achievement's [progress](/docs/plugins/achievements). Like a condition, it's asked with arguments.

```ts
custom: {
  values: {
    breadPrice: (state) => (state.kv.marketDay ? 4 : 5),
    energyCeiling: (state, args) => 80 + (state.stats.fitness ?? 0) * Number(args.per ?? 1),
  },
}
```

Prose writes `A loaf is {{v:breadPrice}} today.`, with any arguments after the name as `key=value`: `{{v:messages/unread channel=texts}}`. Anywhere else, a value is a `ValueRef`, its name and its `with`: a stat writes `max: { value: 'energyCeiling', with: { per: 2 } }`.

**Gotcha.** An unknown name in prose is left on screen as `{{v:breadPrice}}`, so you can see what's missing. An unknown stat ceiling quietly gives 100, but the [content checker](/docs/reference/checks) reports it as `no custom value named "…"`.

## Panels

```ts
type CustomPanel = (state: GameState, context: CustomContext) => unknown
```

What a scene's custom panel needs. A data scene names one with `panelData`, and the result lands on the rendered [`SceneView`](/docs/reference/scenes#sceneview)'s `panelData`. The engine doesn't look inside, so return whatever your panel component reads.

```ts
custom: {
  panels: { stallPrices: (state) => ({ bread: state.kv.marketDay ? 4 : 5, jam: 3 }) },
}

// DataScene: { id: 'market.stall', panel: 'StallPanel', panelData: 'stallPrices', ... }
```

**Gotcha.** An unknown name gives `panelData: undefined` rather than an error. The [content checker](/docs/reference/checks) reports a data scene's unknown one as `no custom panel named "…"`.

## Looking them up

```ts
function customCondition(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => boolean) | undefined
function customEffect(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => EffectRef[]) | undefined
function customValue(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => string | number) | undefined
function customPanel(game: Game | undefined, name: string): ((state: GameState) => unknown) | undefined
```

Each returns the function of that kind and name, ready to call with the state and its arguments (`{}` if left out), or `undefined`. The context is filled in for you. The engine reads custom functions only through these. Use them in a tool, a custom runtime or a check of your own.

`customCondition` and `customValue` also find a plugin's condition or value by its full name (`quests/done`). `customEffect` and `customPanel` only look at the game's own. A plugin's effect returns a state rather than a list of effects, so ask [`hasCustomEffect`](#hascustomeffect) whether one exists.

```ts
import { customValue } from '@ifloom/engine'

const price = customValue(town, 'breadPrice')?.(state) ?? '?'
const unread = customValue(town, 'messages/unread')?.(state, { channel: 'texts' }) ?? 0
```

## hasCustomEffect

```ts
function hasCustomEffect(game: Game | undefined, name: string): boolean
```

Whether the game or one of its [plugins](/docs/reference/plugins) has an effect by this name. The loader checks effect names with it.

```ts
import { hasCustomEffect } from '@ifloom/engine'

hasCustomEffect(town, 'tip')           // the game's own
hasCustomEffect(town, 'quests/start')  // a plugin's
```

## buildEffects

```ts
function buildEffects(state: GameState, game: Game, refs: readonly EffectRef[]): Effect[]
```

Turns a list of `EffectRef` into the plain effects the reducer takes:

- A plain effect is kept as it is.
- A `{ custom }` or [short call](#plugincall), the game's own or a plugin's, becomes a [`{ kind: 'custom', name, with }`](/docs/reference/effects#custom) effect that runs in its turn.
- A name that neither the game nor its plugins declare adds nothing.

Nothing is worked out yet, so `state` is only there for symmetry with the rest of the API.

```ts
import { buildEffects } from '@ifloom/engine'

buildEffects(state, town, [{ custom: 'tip', with: { by: 2 } }, { 'quests/start': { quest: 'letter' } }])
// [{ kind: 'custom', name: 'tip', with: { by: 2 } }, { kind: 'custom', name: 'quests/start', with: { quest: 'letter' } }]
```

Data scenes, activities, triggers, `each` and a plugin's `context.apply` call it for you. You only need it in a [custom runtime](/docs/reference/scenes#sceneruntime) or a tool.

## previewEffects

```ts
function previewEffects(state: GameState, game: Game, effects: readonly Effect[]): Effect[]
```

The effects with each of the game's own custom effects replaced by what it returns for `state`, all the way down (10 deep at most). A plugin's effect stays as it is. This is what a button would do as it looks before it's pressed, and it's what prices, guards and locks are shown: [`effectsOf`](/docs/reference/actions#effectsof) and the view call it for you. It reads every custom effect against the same `state`, so when the effects run for real, a custom effect after a change can return something else.

```ts
import { previewEffects } from '@ifloom/engine'

previewEffects(state, town, [{ kind: 'custom', name: 'tip', with: { by: 2 } }])
// [{ kind: 'stat', stat: 'coins', by: -2 }]
```

## See it in an example

- Small Town: [`examples/showcase/src/content/custom.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/custom.ts) has a value, `catName`, that the flat's prose prints as `{{v:catName}}`, and an effect, `postLatest`, which the `post` activity in [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts) runs as `{ custom: 'postLatest' }`.
- The Corner Café: `custom` in [`examples/cafe/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/game.ts) works out the week's `takings` and `wages` as effects, and `payroll` as a value the hiring scene prints.
