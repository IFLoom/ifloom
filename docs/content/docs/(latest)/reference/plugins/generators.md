---
title: "Generators"
description: "The generators plugin makes new entities from templates, drawing each field from a pool, a range or a fixed value, the same on every replay."
---
`@ifloom/plugin-generators` makes new [entities](/docs/reference/glossary#entity) from templates, such as visitors in a park, customers in a shop or applicants for a job. The game declares named pools of values and templates that say where each field of an entity comes from, and an effect makes as many as it asks for. The plugin knows nothing about people: a pool is any list of values, and a template fills any kind the game declares. Every draw is seeded by the save, so a replay makes the same entities and a reload can't make different ones. Generators needs no other plugin, cooperates with none and keeps no state. [The same save gives the same draws](/docs/explanation/design#the-same-save-gives-the-same-draws) explains the seeding, and [Add a plugin](/docs/how-to/add-a-plugin) installs it.

In the showcase: `examples/showcase/src/story/park.ts`, whose `data.generators` has two pools and a `visitor` template, and whose `visitors` trigger makes two a day.

```ts
import {
  generators,
  drawEntity,
  templateKind,
  poolsOf,
  templatesOf,
  type FieldDef,
  type GeneratedEntity,
  type PoolDef,
  type PoolEntry,
  type TemplateDef,
} from '@ifloom/plugin-generators'
```

## generators

The plugin's factory, which returns the plugin with the id `generators`. It takes no options. Every field of its result is in [`generators`](/docs/api/plugin-generators#generators), and its helper is listed under [Functions](#functions).

The entities it makes are ordinary entities in the game state, so the plugin keeps nothing of its own in the save.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { generators } from '@ifloom/plugin-generators'

declare const town: Content

export const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [generators()] })
```

## Content

Pools and templates go in `data.generators.pools` and `data.generators.templates`. The loader merges each list by id, so a mod adds names to a pool by replacing it, or adds a template.

### PoolDef

A pool the game declares in `data.generators.pools`, a named list of values a template picks from. Every field is in [`PoolDef`](/docs/api/plugin-generators#pooldef).

A pick is the engine's [`weighted`](/docs/reference/random#weighted), seeded as described under [`generators/generate`](#generatorsgenerate). At least one entry must weigh more than 0.

### PoolEntry

One value of a pool: a string, a number or `true`/`false` as it is, or `{ value, weight }`. Its forms are in [`PoolEntry`](/docs/api/plugin-generators#poolentry).

A bare value, or an entry with no `weight`, weighs 1. A value of weight 4 comes up four times as often as one of weight 1, and a weight of 0 never comes up. A pool holds plain values, never another pool. A template puts several picks together with `join`.

```ts
import type { PoolDef } from '@ifloom/plugin-generators'

export const pools: PoolDef[] = [
  { id: 'first-names', values: ['Ruth', 'Omar', 'Lena', 'Theo', 'Priya', 'Jonah', 'Maud', 'Kit'] },
  { id: 'company', values: [{ value: 'alone', weight: 5 }, { value: 'a dog', weight: 4 }, { value: 'a pushchair', weight: 1 }] },
]
```

### TemplateDef

A template the game declares in `data.generators.templates`, which makes entities of one kind through the engine's [`create`](/docs/reference/effects#create) effect. Every field is in [`TemplateDef`](/docs/api/plugin-generators#templatedef).

A template has the fields of `create`. `name`, `description`, `image`, `stats` and `kv` are each a [`FieldDef`](#fielddef), drawn for every new entity, and `tags`, `traits` and `effects` are written as they are. A template needs an `of` or a `like`, and a `name` or a `like`:

- **`of`** is the kind it makes, and the `like`'s kind if left out.
- **`like`** is a declared entity the new ones are made like, so a field the template doesn't give, such as the picture, traits or stats, comes from that one.
- **`stats`** names stats the game declares for the kind. A drawn stat equal to the value the entity would read anyway, its `like`'s or else the stat's `start`, isn't kept, so the save holds only what differs.
- **`traits`** is laid over the `like`'s or the kind's, so `{ 'cast/person': { home: 'park' } }` makes someone the [cast](/docs/reference/plugins/cast) can find.
- **`effects`** run once each new entity is made, with `'$'` as it, such as `[{ receive: '$' }]` to hand it to whichever [receiver](/docs/reference/glossary#receiver) the game has. Nothing runs if left out.

The showcase's park visitor draws a name from a pool and two kv keys:

```ts
import type { TemplateDef } from '@ifloom/plugin-generators'

export const visitor: TemplateDef = {
  id: 'visitor',
  of: 'visitor',
  name: { pool: 'first-names' },
  kv: { with: { pool: 'company' }, laps: { between: [1, 3] } },
}
```

### FieldDef

One field of a template, a fixed value or a draw, each form told apart by its shape. Its forms are in [`FieldDef`](/docs/api/plugin-generators#fielddef).

| Kind | Meaning |
|---|---|
| `'visitor'`, `3`, `true` | The value as written. |
| `{ pool: 'first-names' }` | One value picked from the pool by weight. |
| `{ between: [1, 3] }` | A whole number from the first to the second, both included. |
| `{ join: [{ pool: 'first-names' }, { pool: 'surnames' }], with: ' ' }` | Each part drawn, then joined into one string, with a space if `with` is left out. |

A café regular made like a pattern the game declares, with a face from a pool and a name from two:

```ts
import type { TemplateDef } from '@ifloom/plugin-generators'

export const regular: TemplateDef = {
  id: 'regular',
  like: 'character:regular',
  name: { join: [{ pool: 'first-names' }, { pool: 'surnames' }] },
  image: { pool: 'faces' },
  tags: ['regular'],
  traits: { 'cast/person': { home: 'cafe' } },
  stats: { patience: { between: [1, 5] } },
}
```

## Effects

### generators/generate

Makes `count` new entities from the template, 1 if left out, one after another. Each goes through the engine's [`create`](/docs/reference/effects#create) effect, so it gets the next free id of its kind (`visitor:#1`, `visitor:#2`), reads what it isn't given from its `like` or its kind, and goes to the template's `at`. A template the game doesn't have makes nothing. It works in any effect list, such as a trigger's or a thing's use in the [inventory](/docs/reference/plugins/inventory).

```ts fragment
{ 'generators/generate': { template: 'visitor', count: 2 } } // generators.generate('visitor', 2)
```

The plugin seeds every field from the save's [seed](/docs/reference/state#seed), the template's id, the number the new entity will get and the field's name:

- The same save makes the same entities every time, and a replay of its commands makes them again exactly.
- Each new entity draws differently, because its number is new, so making three at once gives the same three as making one three times.
- A save with a different seed gets different entities.
- A field added to a template draws under its own name, so it doesn't change what the others draw.

The showcase sends yesterday's visitors home and makes two new ones the first time each day the player reaches the park:

```ts
import type { TriggerDef } from '@ifloom/engine'
import { generators } from '@ifloom/plugin-generators'
import { places } from '@ifloom/plugin-places'

export const visitors: TriggerDef = {
  id: 'visitors',
  once: { per: 'turn' },
  when: places.at('park'),
  effects: [{ each: 'visitor', effects: [{ remove: '$' }] }, generators.generate('visitor', 2)],
}
```

## Functions

The helper is a property of `generators` and writes its call, typed:

- **`generators.generate(template, count?)`** returns the [`generators/generate`](#generatorsgenerate) effect.

### drawEntity

Returns the fields a template draws for the `n`th entity of its kind made in play, without making it. Its signature is in [`drawEntity`](/docs/api/plugin-generators#drawentity).

The same save, template and `n` always draw the same fields. The effect passes the number the engine's `create` gives the next entity. A test or a tool uses it to preview a template.

```ts given
import { drawEntity, templatesOf } from '@ifloom/plugin-generators'

const visitor = templatesOf(game).find((template) => template.id === 'visitor')!
drawEntity(state, game, visitor, 1) // a name from first-names, no stats, and kv with `with` and `laps`
```

### GeneratedEntity

The fields `drawEntity` returns for one entity, before it's made. Every field is in [`GeneratedEntity`](/docs/api/plugin-generators#generatedentity).

`name`, `description` and `image` are present only when the template has them. `stats` holds every stat the template draws, before the effect leaves out the ones equal to the value the entity would read anyway, and leaves out a field that draws no finite number. `kv` holds every kv key the template draws.

### templateKind

Returns the kind a template makes, its `of`, else its `like`'s kind, or `undefined` for a template with neither. Its signature is in [`templateKind`](/docs/api/plugin-generators#templatekind).

### poolsOf

Returns the game's pools from `data.generators.pools`, merged from its content and packs, in order. Its signature is in [`poolsOf`](/docs/api/plugin-generators#poolsof).

### templatesOf

Returns the game's templates from `data.generators.templates`, merged from its content and packs, in order. Its signature is in [`templatesOf`](/docs/api/plugin-generators#templatesof).

## Checks

When the game loads, the plugin reports problems with each pool and template against the content or pack it came from, with `where` as `pools <id>` or `templates <id>`:

| Problem | Cause |
|---|---|
| `has nothing to pick: no values, or every weight is 0` | A pool has no entry that weighs more than 0. |
| `makes nothing: give it an of or a like` | A template has neither `of` nor `like`. |
| `needs a name, or a like to read it from` | A template has no `name` and no `like`. |
| `unknown kind "visitor"` | A template's kind is one the game doesn't have. |
| `no visitor stat named "mood"` | A template's `stats` names a stat the kind doesn't have. |
| `unknown pool "surnames"` | A field names a pool the game doesn't have. |
| `stat mood: between [5, 1] runs backwards` | A `between`'s first number is bigger than its second. |
| `stat mood: between needs two numbers` | A `between` doesn't hold two numbers. |

A `like` that isn't a declared entity of the kind, an `effects` entry the engine's checker rejects, a trait no plugin declares, or an `image` path with no file gives the problem the engine's `create` gives. A call that names a template the game doesn't have gives `unknown template "…"` where it's written, and a `count` that isn't a whole number of 1 or more gives `count must be a whole number, 1 or more`.

## Caveats

- An entity the plugin makes stays in the save until something removes it. A trigger that makes visitors every day removes the old ones with [`each`](/docs/reference/effects#each) and [`remove`](/docs/reference/effects#remove), as the showcase does.
