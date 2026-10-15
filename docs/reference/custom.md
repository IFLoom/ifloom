# Custom functions

Content is data: conditions, effects and prose that a tool can read, a mod can ship and the [loader](/reference/loader) can check. The few things that genuinely have to be computed — is it market day, what does a loaf cost today, how much energy can you hold — are **custom functions**: named functions the game declares on `game.custom`, which content calls by name.

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
| `conditions` | `{ custom: 'marketDay' }` | Any [condition](/reference/conditions#custom) |
| `effects` | `{ custom: 'tip', with: { by: 2 } }` | A data scene choice's [effects](/reference/effects#computed-effects), an [activity](/reference/actions#activitydef)'s `effects`, a [trigger](/reference/triggers)'s `effects` |
| `values` | <code v-pre>{{v:breadPrice}}</code> | [Prose](/reference/prose#tokens), and a stat's [`max: { value }`](/reference/stats#statdef) |
| `panels` | `panelData: 'stallPrices'` | A [data scene](/reference/scenes#paneldata) |

**One spelling for named code.** A [plugin](/reference/plugins)'s conditions, effects and values are called the same way, with the plugin's id and a `/` in front: `{ custom: 'quests/done', with: { quest: 'bread' } }`, <code v-pre>{{v:quests/updates}}</code>. A plugin's condition or effect can also be written [in short](#plugincall), its name as the key: `{ 'quests/done': { quest: 'bread' } }`. A name with a `/` belongs to a plugin and is looked up there first, so keep `/` out of the game's own names. A plugin's commands are sent as [`{ type: 'custom', name }`](/reference/commands#custom).

**Each game owns its own.** There is no global registry: two games in one page, or a test next to a game, never see each other's functions. Everything that reads a custom function takes the game, and finds nothing without it.

## Custom

```ts
type Custom = {
  conditions?: Record<string, CustomCondition>
  effects?: Record<string, CustomEffect>
  values?: Record<string, CustomValue>
  panels?: Record<string, CustomPanel>
}
```

The type of `game.custom` and of a [pack](/reference/loader#pack)'s `custom`. Every kind is optional.

When packs are loaded, each kind merges by name: a later pack's `conditions.marketDay` replaces an earlier pack's, and leaves the rest alone. See [Loading and mods](/reference/loader#how-packs-merge).

## Conditions

```ts
type CustomCondition = (state: GameState, args: Record<string, unknown>) => boolean
```

A test worked out from several values rather than read from one. Content refers to it as `{ custom: name }` anywhere a [`Condition`](/reference/conditions) goes — a block's `when`, a lock, a schedule block. Its `with` arrives as `args`, `{}` when left out, so one function can serve several tests: `{ custom: 'visitedAtLeast', with: { times: 3 } }`.

```ts
custom: {
  conditions: {
    isRegular: (state) => (state.seen['cafe.counter'] ?? 0) >= 3,
    visitedAtLeast: (state, args) => (state.seen['cafe.counter'] ?? 0) >= Number(args.times ?? 1),
  },
}

// in a data scene
{ text: 'cafe.counter/regular', when: { custom: 'isRegular' } }
{ text: 'cafe.counter/usual', when: { custom: 'visitedAtLeast', with: { times: 10 } } }
```

**Gotcha.** A name the game does not declare is false, not an error, so a broken mod hides content instead of crashing. The loader reports it wherever content names one — data scenes, schedules, activity requirements, triggers, inputs, calls, the game's own actions, and plugins' content a plugin checks (the [places plugin](/plugins/places#checks)'s rooms); [`explain`](/reference/conditions#explain) shows it as `custom condition isRegular is not declared by the game`.

## Effects

```ts
type CustomEffect = (state: GameState, args: Record<string, unknown>) => EffectRef[]
type EffectRef = Effect | { custom: string; with?: Record<string, unknown> } | PluginCall
```

Effects worked out from the state when the choice is shown. A data scene choice's `effects` is a list of `EffectRef`: plain effects, and custom ones by name. The custom effect's list takes its place, in order; `with` arrives as `args`. The list can hold anything content can write: plain effects, a plugin's effect (`{ custom: 'quests/start', with: { quest: 'letter' } }`), or another of the game's own custom effects.

```ts
custom: {
  effects: {
    bumpVisits: (state, args) => {
      const now = Number(state.storylines.rosa?.flags.visits ?? 0)
      return [{ kind: 'storylineFlag', id: 'rosa', key: 'visits', value: now + Number(args.by ?? 1) }]
    },
  },
}

// a choice
effects: [{ custom: 'bumpVisits', with: { by: 1 } }, { kind: 'scene', id: null }]
```

**Gotchas.**
- The function runs when the scene renders, not when the choice is picked; it sees the state the player is looking at.
- Data scene choices, activities and [triggers](/reference/triggers) take `EffectRef`. Item uses and [`rules.turn`](/reference/rules#turn) take plain [effects](/reference/effects).
- An activity's custom effects run when the activity does, and see the state before its cost was paid.
- A [plugin's effect](/reference/plugins#effects-run-in-order) is different: it is not worked out up front, but runs in its turn on the state the effects before it left. That holds for one a game's custom effect returns, too: the custom effect is worked out up front, the plugin effect in its result runs in order.
- A custom effect that returns a game custom effect has it worked out in turn, against the same state from before the list. Nesting stops at 10 deep, so a custom effect that names itself contributes nothing past that rather than hanging.

See one in the showcase: [`postLatest`](/guide/showcase#feeds-and-an-effect-worked-out-in-code) posts the newest photo and rolls its likes.

## PluginCall

```ts
type PluginCall = { [name: `${string}/${string}`]: unknown }
```

A plugin's condition or effect in short: its full name as the only key, what it is asked as the value. These two are the same:

```ts
{ 'quests/done': { quest: 'bread' } }
{ custom: 'quests/done', with: { quest: 'bread' } }
```

It works anywhere a [condition](/reference/conditions) or an [`EffectRef`](#effects) goes, and the [loader](/reference/loader) checks the name as it checks `{ custom }`.

How the value is read:

| Written | Asked with |
|---|---|
| `{ 'quests/done': { quest: 'bread' } }` — a plain object | `with: { quest: 'bread' }` |
| `{ 'loyalty/stamp': true }` | nothing: `with` left out, so `{}` |
| `{ 'calendar/period': ['morning'] }` — an array, a string, a number, `false` | `with: { value: ['morning'] }` |

```ts
// in a data scene: Rosa thanks you once the bread quest is done
{ text: 'cafe.counter/thanks', when: { 'quests/done': { quest: 'bread' } } }
// a choice that starts it
{ id: 'offer-help', effects: [{ 'quests/start': { quest: 'bread' } }, { kind: 'scene', id: null }] }
```

**Gotchas.**
- It is read as a call only when the object has **exactly one key**, that key has a `/`, and the object has no `kind`. Add a second key — a typo, a stray `when` — and it is no longer a call: as a condition it is false, as an effect it does nothing.
- A game's own conditions and effects have no `/` in their names, so they have no short form: write `{ custom: 'marketDay' }`.
- To pass a single argument that is an object, name it: `{ 'quests/done': { quest: 'bread' } }`, not a bare value.

## Values

```ts
type CustomValue = (state: GameState) => string | number
```

A number or a word the prose needs to say out loud — a price that moves, today's special — and the ceiling of a stat that grows.

```ts
custom: {
  values: {
    breadPrice: (state) => (state.flags.marketDay ? 4 : 5),
    energyCeiling: (state) => 80 + (state.stats.fitness ?? 0),
  },
}
```

Prose writes <code v-pre>A loaf is {{v:breadPrice}} today.</code>; a stat writes `max: { value: 'energyCeiling' }`.

**Gotcha.** An unknown name in prose is left on screen as <code v-pre>{{v:breadPrice}}</code>, so you see what is missing; an unknown stat ceiling quietly gives 100. [`validatePack`](/reference/game#validatepack) reports the stat ceiling.

## Panels

```ts
type CustomPanel = (state: GameState) => unknown
```

What a scene's custom panel needs. A data scene names one with `panelData`, and the result lands on the rendered [`SceneView`](/reference/scenes#sceneview)'s `panelData`. Opaque to the engine: return whatever your panel component reads.

```ts
custom: {
  panels: { stallPrices: (state) => ({ bread: state.flags.marketDay ? 4 : 5, jam: 3 }) },
}

// DataScene: { id: 'market.stall', panel: 'StallPanel', panelData: 'stallPrices', ... }
```

**Gotcha.** An unknown name gives `panelData: undefined`, not an error, and the loader does not check panel names.

## Looking them up

```ts
function customCondition(game: Game | undefined, name: string): CustomCondition | undefined
function customEffect(game: Game | undefined, name: string): CustomEffect | undefined
function customValue(game: Game | undefined, name: string): CustomValue | undefined
function customPanel(game: Game | undefined, name: string): CustomPanel | undefined
```

The game's function of that kind and name, or `undefined`. The engine reads custom functions only through these; use them in a tool, a custom runtime, or a check of your own.

`customCondition` and `customValue` find a plugin's condition or value by its full name too (`quests/done`), ready to call with the state (and, for a condition, `with`). `customEffect` and `customPanel` look only at the game's own: a plugin's effect returns a state rather than a list of effects, so ask [`hasCustomEffect`](#hascustomeffect) whether one exists.

```ts
const price = customValue(town, 'breadPrice')?.(state) ?? '?'
```

## hasCustomEffect

```ts
function hasCustomEffect(game: Game | undefined, name: string): boolean
```

Whether the game or one of its [plugins](/reference/plugins) has an effect by this name. The loader checks effect names with it.

```ts
hasCustomEffect(town, 'tip')           // the game's own
hasCustomEffect(town, 'quests/start')  // a plugin's
```

## buildEffects

```ts
function buildEffects(state: GameState, game: Game, refs: readonly EffectRef[], depth?: number): Effect[]
```

Flattens a list of `EffectRef` into the plain effects the reducer takes: plain effects kept, each game `{ custom }` replaced by what its function returns for this state, and each plugin `{ custom }` or [short call](#plugincall) turned into a [`{ kind: 'custom', name, with }`](/reference/effects#custom) effect that runs in its turn. A name that neither the game nor its plugins declare contributes nothing.

What a game's custom effect returns is flattened the same way, recursively, all against the same `state`. `depth` (default 0) counts how deep that has gone; at 10, a game's custom effect contributes nothing. Leave it out.

```ts
buildEffects(state, town, [{ custom: 'tip', with: { by: 2 } }, { custom: 'quests/start', with: { quest: 'letter' } }])
// [{ kind: 'stat', key: 'coins', by: -2 }, { kind: 'custom', name: 'quests/start', with: { quest: 'letter' } }]
```

Data scenes, activities and triggers call it for you. You need it only in a [custom runtime](/reference/scenes#sceneruntime) or a tool.
