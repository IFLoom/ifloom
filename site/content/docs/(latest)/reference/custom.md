---
title: "Custom functions"
---
Most content is data, such as conditions, effects and prose, which a tool can read, a mod can ship and the [content checker](/docs/reference/checks) can check. When something has to be worked out in code, such as whether it's market day or what a loaf costs today, you declare a custom function on `game.custom` and content calls it by name.

```ts
import type { Game } from '@ifloom/engine'

const town: Game = {
  // ...
  custom: {
    conditions: { marketDay: (state) => state.turn % 7 === 5 },
    effects: { tip: (state, args) => [{ kind: 'stat', key: 'coins', by: -Number(args.by ?? 1) }] },
    values: { breadPrice: (state) => (state.flags.marketDay ? 4 : 5) },
    panels: { stallPrices: (state) => ({ bread: state.flags.marketDay ? 4 : 5, jam: 3 }) },
  },
}
```

| Kind | Content writes | Where |
|---|---|---|
| `conditions` | `{ custom: 'marketDay' }` | Any [condition](/docs/reference/conditions#custom) |
| `effects` | `{ custom: 'tip', with: { by: 2 } }` | A data scene choice's [effects](/docs/reference/effects#computed-effects), an [activity](/docs/reference/actions#activitydef)'s `effects`, a [trigger](/docs/reference/triggers)'s `effects`, an [`each`](/docs/reference/effects#each)'s `effects`, what another custom effect returns, and a plugin's [`context.apply`](/docs/reference/plugins#applying-effects) |
| `values` | `{{v:breadPrice}}` | [Prose](/docs/reference/prose#tokens), and a stat's [`max: { value }`](/docs/reference/stats#statdef) |
| `panels` | `panelData: 'stallPrices'` | A [data scene](/docs/reference/scenes#paneldata) |

A [plugin](/docs/reference/plugins)'s conditions, effects and values are called the same way, with the plugin's id and a `/` in front, as in `{ custom: 'quests/done', with: { quest: 'bread' } }` or `{{v:quests/updates}}`. You can also write a plugin's condition or effect [in short](#plugincall), with its name as the key: `{ 'quests/done': { quest: 'bread' } }`. A name with a `/` is looked up among the plugins first, so keep `/` out of your game's own names. A plugin's commands are sent as [`{ type: 'custom', name }`](/docs/reference/commands#custom).

There's no global registry. Each game owns its own functions, so two games on one page, or a test next to a game, never see each other's. Everything that reads a custom function takes the game, and finds nothing without it.

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
type CustomCondition = (state: GameState, args: Record<string, unknown>) => boolean
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
{ text: 'ava.hi/regular', when: { custom: 'isRegular' } }
{ text: 'ava.hi/usual', when: { custom: 'visitedAtLeast', with: { times: 10 } } }
```

**Gotcha.** A name the game doesn't declare is false rather than an error, so a broken mod hides content instead of crashing. The [content checker](/docs/reference/checks) reports it, and [`explain`](/docs/reference/conditions#explain) shows it as `custom condition isRegular is not declared by the game`.

## Effects

```ts
type CustomEffect = (state: GameState, args: Record<string, unknown>) => EffectRef[]
type EffectRef = Effect | { custom: string; with?: Record<string, unknown> } | PluginCall
```

Effects worked out from the state. A data scene choice's `effects` is a list of `EffectRef`, which mixes plain effects with custom ones by name. The custom effect's list takes its place, in order, and its `with` arrives as `args`. The list it returns can hold anything content can write: plain effects, a plugin's effect such as `{ custom: 'quests/start', with: { quest: 'letter' } }`, or another of the game's own custom effects.

```ts
custom: {
  effects: {
    bumpVisits: (state, args) => {
      const now = Number(state.storylines.ava?.flags.visits ?? 0)
      return [{ kind: 'storylineFlag', id: 'ava', key: 'visits', value: now + Number(args.by ?? 1) }]
    },
  },
}

// a choice
effects: [{ custom: 'bumpVisits', with: { by: 1 } }, { kind: 'scene', id: null }]
```

**Gotchas.**
- In a data scene, the function runs when the scene renders, not when the choice is picked. It sees the state the player is looking at.
- Item uses and [`rules.turn`](/docs/reference/rules#turn) take plain [effects](/docs/reference/effects), not `EffectRef`.
- An activity's custom effects are worked out when the activity runs, against the state before its cost was paid.
- Inside an [`each`](/docs/reference/effects#each), the function runs once per entity, on the state the entities before it left.
- A [plugin's effect](/docs/reference/plugins#effects-run-in-order) isn't worked out up front. It runs in its turn, on the state the effects before it left. That's true even when a game's custom effect returns it: the custom effect is worked out up front, and the plugin effect in its result runs in order.
- A custom effect that returns another of the game's custom effects has it worked out too, against the same state. This stops at 10 deep, so a custom effect that names itself adds nothing past that rather than hanging.

The showcase has one: [`postLatest`](/docs/guide/showcase#feeds-and-an-effect-worked-out-in-code) posts the newest photo and rolls its likes.

## PluginCall

```ts
type PluginCall = { [name: `${string}/${string}`]: unknown }
```

A plugin's condition or effect in short, with its full name as the only key and what it's asked as the value. These two are the same:

```ts
{ 'quests/done': { quest: 'bread' } }
{ custom: 'quests/done', with: { quest: 'bread' } }
```

It works anywhere a [condition](/docs/reference/conditions) or an [`EffectRef`](#effects) goes, and the [content checker](/docs/reference/checks) checks the name as it checks `{ custom }`.

How the value is read:

| Written | Asked with |
|---|---|
| `{ 'quests/done': { quest: 'bread' } }`, a plain object | `with: { quest: 'bread' }` |
| `{ 'loyalty/stamp': true }` | no `with`, so `{}` |
| `{ 'calendar/period': ['morning'] }`, or a string, a number or `false` | `with: { value: ['morning'] }` |

```ts
// in a data scene: Ava thanks you once the bread quest is done
{ text: 'ava.hi/thanks', when: { 'quests/done': { quest: 'bread' } } }
// a choice that starts it
{ id: 'offer-help', effects: [{ 'quests/start': { quest: 'bread' } }, { kind: 'scene', id: null }] }
```

**Gotchas.**
- It's read as a call only when the object has exactly one key, that key has a `/`, and the object has no `kind`. If you add a second key, such as a typo or a stray `when`, it's no longer a call. As a condition it's false, and as an effect it does nothing.
- Your game's own conditions and effects have no `/` in their names, so they have no short form. Write `{ custom: 'marketDay' }`.
- To pass a single argument that's an object, give it a name, as in `{ 'quests/done': { quest: 'bread' } }`.

## Values

```ts
type CustomValue = (state: GameState) => string | number
```

A number or a word the prose needs to print, such as a price that moves or today's special. A value can also be the ceiling of a stat that grows.

```ts
custom: {
  values: {
    breadPrice: (state) => (state.flags.marketDay ? 4 : 5),
    energyCeiling: (state) => 80 + (state.stats.fitness ?? 0),
  },
}
```

Prose writes `A loaf is {{v:breadPrice}} today.`, and a stat writes `max: { value: 'energyCeiling' }`.

**Gotcha.** An unknown name in prose is left on screen as `{{v:breadPrice}}`, so you can see what's missing. An unknown stat ceiling quietly gives 100, but the [content checker](/docs/reference/checks) reports it as `no custom value named "…"`.

## Panels

```ts
type CustomPanel = (state: GameState) => unknown
```

What a scene's custom panel needs. A data scene names one with `panelData`, and the result lands on the rendered [`SceneView`](/docs/reference/scenes#sceneview)'s `panelData`. The engine doesn't look inside, so return whatever your panel component reads.

```ts
custom: {
  panels: { stallPrices: (state) => ({ bread: state.flags.marketDay ? 4 : 5, jam: 3 }) },
}

// DataScene: { id: 'market.stall', panel: 'StallPanel', panelData: 'stallPrices', ... }
```

**Gotcha.** An unknown name gives `panelData: undefined` rather than an error. The [content checker](/docs/reference/checks) reports a data scene's unknown one as `no custom panel named "…"`.

## Looking them up

```ts
function customCondition(game: Game | undefined, name: string): CustomCondition | undefined
function customEffect(game: Game | undefined, name: string): CustomEffect | undefined
function customValue(game: Game | undefined, name: string): CustomValue | undefined
function customPanel(game: Game | undefined, name: string): CustomPanel | undefined
```

Each returns the game's function of that kind and name, or `undefined`. The engine reads custom functions only through these. Use them in a tool, a custom runtime or a check of your own.

`customCondition` and `customValue` also find a plugin's condition or value by its full name (`quests/done`), ready to call with the state (and `with`, for a condition). `customEffect` and `customPanel` only look at the game's own. A plugin's effect returns a state rather than a list of effects, so ask [`hasCustomEffect`](#hascustomeffect) whether one exists.

```ts
import { customValue } from '@ifloom/engine'

const price = customValue(town, 'breadPrice')?.(state) ?? '?'
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
function buildEffects(state: GameState, game: Game, refs: readonly EffectRef[], depth?: number): Effect[]
```

Flattens a list of `EffectRef` into the plain effects the reducer takes:

- A plain effect is kept as it is.
- A game's `{ custom }` is replaced by what its function returns for this state.
- A plugin's `{ custom }` or [short call](#plugincall) becomes a [`{ kind: 'custom', name, with }`](/docs/reference/effects#custom) effect that runs in its turn.
- A name that neither the game nor its plugins declare adds nothing.

What a game's custom effect returns is flattened the same way, all against the same `state`. `depth` (default 0) counts how deep that has gone, and at 10 a game's custom effect adds nothing. Leave it out.

```ts
import { buildEffects } from '@ifloom/engine'

buildEffects(state, town, [{ custom: 'tip', with: { by: 2 } }, { custom: 'quests/start', with: { quest: 'letter' } }])
// [{ kind: 'stat', key: 'coins', by: -2 }, { kind: 'custom', name: 'quests/start', with: { quest: 'letter' } }]
```

Data scenes, activities, triggers, `each` and a plugin's `context.apply` call it for you. You only need it in a [custom runtime](/docs/reference/scenes#sceneruntime) or a tool.
