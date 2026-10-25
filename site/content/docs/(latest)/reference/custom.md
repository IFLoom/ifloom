---
title: "Calls by name"
description: "Conditions, effects and values worked out in code, the game's own in rules or a plugin's, that content calls by name, and what they're given."
---
Most content is data, such as conditions, effects and prose, which a tool can read, a mod can ship and the [content checker](/docs/reference/checks) can check. When something has to be worked out in code, such as whether it's market day or what a loaf costs today, you declare a function in the game's [`rules`](/docs/reference/rules) and content calls it by name, with `game/` in front.

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  conditions: { marketDay: (state) => state.turn % 7 === 5 },
  effects: { tip: (state, args) => [{ stat: 'coins', by: -Number(args.by ?? 1) }] },
  values: { breadPrice: (state) => (state.kv.marketDay ? 4 : 5) },
}
```

| In `rules` | Content writes | Where |
|---|---|---|
| `conditions` | `{ 'game/marketDay': true }` | Any [condition](/docs/reference/conditions#calls) |
| `effects` | `{ 'game/tip': { by: 2 } }` | Any list of [effects](/docs/reference/effects#computed-effects): a choice's, an [action](/docs/reference/actions#actiondef)'s, a [trigger](/docs/reference/triggers)'s, an [`each`](/docs/reference/effects#each)'s, a thing's use in the [inventory](/docs/plugins/inventory), what another of the game's effects returns, and a plugin's [`context.apply`](/docs/reference/plugins#applying-effects) |
| `values` | `{{v:game/breadPrice}}`, or `{ value: 'game/breadPrice' }` | [Prose](/docs/reference/prose#tokens), a stat's [`max`](/docs/reference/stats#statdef), an app's badge |

A [plugin](/docs/reference/plugins)'s conditions, effects and values are called the same way, with the plugin's id and a `/` in front, as in `{ 'quests/done': { quest: 'bread' } }` or `{{v:quests/updates}}`. The game's own code is called as if it were a plugin whose id is `game`, which is why no plugin can have that id.

There's no global registry. Each game owns its own functions, so two games on one page, or a test next to a game, never see each other's. Everything that reads one takes the game, and finds nothing without it.

## What a function is given

Every one of the game's functions gets the state and a [`CustomContext`](#customcontext). A condition, an effect and a value also get their arguments as `args`, or `{}` for `true`. A plugin's functions get the same context and more, so the game's own can do what a plugin's condition can: ask a plugin's [query](/docs/reference/plugins#queries), read a plugin's value, and draw a seeded number.

```ts
import type { CustomEffect } from '@ifloom/engine'

// Tips are better in the evening, by the calendar plugin's clock.
const tips: CustomEffect = (state, args, { query }) => {
  const evening = query<{ period: string }>('calendar/now')?.period === 'evening'
  return [{ stat: 'coins', by: evening ? 4 : 2 }]
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
- `value` reads a [value](#values) by its full name, a plugin's (`messages/unread`) or the game's own (`game/breadPrice`), asked with `args`. It's `undefined` when nobody has one by that name.
- `roll(max, name)` draws a whole number from 0 to `max - 1`, from the save's seed, the turn and `name`. The same save on the same turn always draws the same number, so a replay plays the same. Use a different `name` for each draw.

A [plugin's context](/docs/reference/plugins#plugincontext) has all of these too, and the game's hooks get a [`RulesContext`](/docs/reference/rules#rulescontext), which adds `apply`.

## Conditions

```ts
type CustomCondition = (state: GameState, args: PluginArgs, context: CustomContext) => boolean
```

A test worked out from several values rather than read from one. Content calls it as `{ 'game/name': true }` anywhere a [`Condition`](/docs/reference/conditions) goes, such as a block's `when`, a lock or a schedule entry. Its arguments arrive as `args`, so one function can serve several tests.

```ts
export const rules: GameRules = {
  conditions: {
    isRegular: (state) => (state.seen['ava.hi']?.n ?? 0) >= 3,
    visitedAtLeast: (state, args) => (state.seen['ava.hi']?.n ?? 0) >= Number(args.times ?? 1),
  },
}

// in a data scene
{ text: 'ava.hi.regular', when: { 'game/isRegular': true } }
{ text: 'ava.hi.usual', when: { 'game/visitedAtLeast': { times: 10 } } }
```

**Gotcha.** A name the game doesn't declare is false rather than an error, so a broken mod hides content instead of crashing. The [content checker](/docs/reference/checks) reports it.

## Effects

```ts
type CustomEffect = (state: GameState, args: PluginArgs, context: CustomContext) => EffectRef[]
type EffectRef = Effect
```

Effects worked out from the state. One runs in its turn: when the effects before it in the list have applied, its function is called with the state they left, and the effects it returns apply there and then. The list it returns can hold anything content can write: plain effects, a plugin's effect such as `{ 'quests/start': { quest: 'letter' } }`, or another of the game's own. `EffectRef` is another name for [`Effect`](/docs/reference/effects#effect), kept for code written when the two differed.

```ts
export const rules: GameRules = {
  effects: {
    bumpVisits: (state, args) => {
      const now = Number(state.storylines.ava?.kv.visits ?? 0)
      return [{ kv: 'visits', of: 'storyline:ava', to: now + Number(args.by ?? 1) }]
    },
  },
}

// a choice
effects: [{ 'game/bumpVisits': { by: 1 } }, { scene: null }]
```

Because each one sees the effects before it, two in a row compose. Here the second `double` doubles what the first left:

```ts
export const rules: GameRules = {
  effects: { double: (state) => [{ stat: 'coins', by: state.stats.coins }] },
}

effects: [{ stat: 'coins', by: 4 }, { 'game/double': true }, { 'game/double': true }]
```

**Gotchas.**
- A button's price, and what a plugin's [guard](/docs/reference/plugins#guards-prices-and-labels) or a [lock](/docs/reference/locks) sees, is worked out before the button is pressed. For those, the game's effect is called with the state on screen, as [`previewEffects`](#previeweffects) does. When the effects run, it's called again in its turn, so it can return something different if the effects before it changed what it reads.
- Inside an [`each`](/docs/reference/effects#each), the function runs once per entity, on the state the entities before it left.
- One of the game's effects that returns another runs that one in its turn too. This stops at 10 deep, so an effect that names itself does nothing past that rather than hanging.

The showcase has one: [`postLatest`](/docs/guide/showcase#feeds-and-an-effect-worked-out-in-code) posts the newest photo and rolls its likes.

## PluginCall

```ts
type PluginCall = { [name: `${string}/${string}`]: PluginArgs | true }
```

A call by name: a plugin's condition, effect or command, or the game's own, with its full name as the only key and its arguments as the value. It works anywhere a [condition](/docs/reference/conditions), an [effect](/docs/reference/effects) or a [`CommandRef`](#commandref) goes, and the [content checker](/docs/reference/checks) checks the name. Plugins' helpers, such as `questDone('bread')`, write this form.

The value is always the arguments as an object, named as the [content naming rule](/docs/reference/effects#effect) names them. A call that takes none is written `true`:

| Written | Asked with |
|---|---|
| `{ 'quests/done': { quest: 'bread' } }` | `with: { quest: 'bread' }` |
| `{ 'places/at': { location: ['cafe', 'park'] } }` | `with: { location: ['cafe', 'park'] }` |
| `{ 'calendar/weekend': true }` | no `with`, so `{}` |
| `{ 'game/marketDay': true }` | the game's own, no `with` |

```ts
// in a data scene: Ava thanks you once the bread quest is done
{ text: 'ava.hi.thanks', when: { 'quests/done': { quest: 'bread' } } }
// a choice that starts it
{ id: 'offer-help', effects: [{ 'quests/start': { quest: 'bread' } }, { scene: null }] }
```

**Gotchas.**
- Anything else as the value, such as a list, a string, a number or `false`, is a problem the [content checker](/docs/reference/checks) reports as `"places/at" takes its arguments as an object, …`. The call is still made, with no arguments.
- It's read as a call only when the object has exactly one key and that key has a `/`. If you add a second key, such as a typo or a stray `when`, it's no longer a call. As a condition it's false, and as an effect it does nothing.
- A name with no `/` isn't a call. The checker reports one and says to write it with `game/` in front.
- Packs written before schema 7 passed a bare value, as in `{ 'places/at': ['cafe'] }`. The [content migration](/docs/reference/loader#upgradepack) names it for the first-party plugins' calls when the pack loads.

## callOf

```ts
function callOf(entry: object): { name: string; with: Record<string, unknown> } | undefined
```

The name and arguments of a call, or `undefined` for one of the engine's own effects or conditions. See [`callOf`](/docs/reference/plugins#callof) on the plugins page.

## CommandRef

```ts
type CommandRef = Command | PluginCall
```

A command as content and code write it: any [command](/docs/reference/commands), or a call by name. `{ 'places/go': { id: 'cafe' } }` is `{ type: 'custom', name: 'places/go', with: { id: 'cafe' } }`. An [action](/docs/reference/actions#actiondef)'s and a choice's `command` take one, and so do [`apply`](/docs/reference/commands#apply), [`whyNot`](/docs/reference/actions#whynot), [`effectsOf`](/docs/reference/actions#effectsof) and the runner's `apply`. The [view](/docs/reference/view) always shows the long form, so a UI that reads `command.type` still can.

## commandOf

```ts
function commandOf(ref: CommandRef): Command
```

A command in the long form: a short call becomes `{ type: 'custom', name, with }`, and anything else comes back as it is. Use it when your own code reads `type` on a command that content wrote.

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
export const rules: GameRules = {
  values: {
    breadPrice: (state) => (state.kv.marketDay ? 4 : 5),
    energyCeiling: (state, args) => 80 + (state.stats.fitness ?? 0) * Number(args.per ?? 1),
  },
}
```

Prose writes `A loaf is {{v:game/breadPrice}} today.`, with any arguments after the name as `key=value`: `{{v:messages/unread channel=texts}}`. Anywhere else, a value is a `ValueRef`, its name and its `with`: a stat writes `max: { value: 'game/energyCeiling', with: { per: 2 } }`.

**Gotcha.** An unknown name in prose is left on screen as `{{v:game/breadPrice}}`, so you can see what's missing. An unknown stat ceiling quietly gives 100, but the [content checker](/docs/reference/checks) reports it as `no custom value named "…"`.

## Looking them up

```ts
function customCondition(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => boolean) | undefined
function customEffect(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => EffectRef[]) | undefined
function customValue(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => string | number) | undefined
```

Each returns the function by its full name, ready to call with the state and its arguments (`{}` if left out), or `undefined`. The context is filled in for you. Use them in a tool, a custom runtime or a check of your own.

`customCondition` and `customValue` find the game's own (`game/marketDay`) and a plugin's (`quests/done`). `customEffect` only finds the game's own. A plugin's effect returns a state rather than a list of effects, so ask [`hasCustomEffect`](#hascustomeffect) whether one exists.

```ts
import { customValue } from '@ifloom/engine'

const price = customValue(town, 'game/breadPrice')?.(state) ?? '?'
const unread = customValue(town, 'messages/unread')?.(state, { channel: 'texts' }) ?? 0
```

## hasCustomEffect

```ts
function hasCustomEffect(game: Game | undefined, name: string): boolean
```

Whether the game or one of its [plugins](/docs/reference/plugins) has an effect by this full name. The loader checks effect names with it.

```ts
import { hasCustomEffect } from '@ifloom/engine'

hasCustomEffect(town, 'game/tip')      // the game's own
hasCustomEffect(town, 'quests/start')  // a plugin's
```

## buildEffects

```ts
function buildEffects(state: GameState, game: Game, refs: readonly EffectRef[]): Effect[]
```

The effects the reducer would run: a call to an effect that neither the game nor its plugins declare is left out, since it would do nothing, and everything else is kept as written. Nothing is worked out yet, so `state` is only there for symmetry with the rest of the API.

```ts
import { buildEffects } from '@ifloom/engine'

buildEffects(state, town, [{ 'game/tip': { by: 2 } }, { 'game/typo': true }])
// [{ 'game/tip': { by: 2 } }]
```

## previewEffects

```ts
function previewEffects(state: GameState, game: Game, effects: readonly Effect[]): Effect[]
```

The effects with each of the game's own replaced by what it returns for `state`, all the way down (10 deep at most). A plugin's effect stays as it is. This is what a button would do as it looks before it's pressed, and it's what prices, guards and locks are shown: [`effectsOf`](/docs/reference/actions#effectsof) and the view call it for you. It reads every effect against the same `state`, so when the effects run for real, one after a change can return something else.

```ts
import { previewEffects } from '@ifloom/engine'

previewEffects(state, town, [{ 'game/tip': { by: 2 } }])
// [{ stat: 'coins', by: -2 }]
```

## See it in an example

- Small Town: [`examples/showcase/src/rules.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/rules.ts) has a value, `catName`, that the flat's prose prints as `{{v:game/catName}}`, and an effect, `postLatest`, which the phone's camera app in [`examples/showcase/src/world/phone.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/phone.ts) runs as `{ 'game/postLatest': true }`.
- The Corner Café: [`examples/cafe/src/rules.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/rules.ts) works out the week's `takings` and `wages` as effects, and `payroll` as a value the hiring scene prints.
