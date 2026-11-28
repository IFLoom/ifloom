---
title: "@ifloom/plugin-generators"
description: "Every export of @ifloom/plugin-generators: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-generators` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`drawEntity`](#drawentity), [`generators`](#generators), [`poolsOf`](#poolsof), [`templateKind`](#templatekind), [`templatesOf`](#templatesof)
- Types: [`FieldDef`](#fielddef), [`GeneratedEntity`](#generatedentity), [`PoolDef`](#pooldef), [`PoolEntry`](#poolentry), [`TemplateDef`](#templatedef)

## drawEntity

Function. Explained in [Generators](/docs/reference/plugins/generators#drawentity).

Returns the values a template draws for the `n`th entity of its kind made in play in this save. The same save,
template and `n` always draw the same values.

The `generators/generate` effect passes the number the engine's `create` gives the next entity, so each new entity
differs and a replay makes the same ones.

```ts shape
import { drawEntity } from '@ifloom/plugin-generators'
function drawEntity(state: GameState, game: Game, template: TemplateDef, n: number): GeneratedEntity
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`TemplateDef`](#templatedef), [`GeneratedEntity`](#generatedentity).

## FieldDef

Type. Explained in [Generators](/docs/reference/plugins/generators#fielddef).

A field of a template, which gives one value of a new entity. Each form is told apart by its shape.

The forms are:

- a fixed value, as written, such as `'visitor'`, `3` or `true`
- `{ pool: 'first-names' }`, one value drawn from a pool by weight
- `{ between: [1, 5] }`, a whole number from the first to the second, both included
- `{ join: [...], with?: ' ' }`, several fields drawn and joined into one string, with a space if `with` is left out

```ts shape
import type { FieldDef } from '@ifloom/plugin-generators'
type FieldDef = KvValue | { pool: string } | { between: [ number, number ] } | { join: FieldDef[]; with?: string }
```

Uses: [`KvValue`](/docs/api/engine#kvvalue).

## GeneratedEntity

Type. Explained in [Generators](/docs/reference/plugins/generators#generatedentity).

The values a template draws for one entity, as `drawEntity` returns them. They're the fields of the engine's
`create` effect that come from pools and ranges.

```ts shape
import type { GeneratedEntity } from '@ifloom/plugin-generators'
type GeneratedEntity = {
  name?: string
  description?: string
  image?: string
  stats: Record<string, number>
  kv: Record<string, KvValue>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string` | yes |  | The drawn name, left out when the template gives none. |
| `description` | `string` | yes |  | The drawn description, left out when the template gives none. |
| `image` | `string` | yes |  | The drawn picture's path, left out when the template gives none. |
| `stats` | `Record<string, number>` |  |  | The drawn stats by id. A field that draws no finite number is left out. |
| `kv` | `Record<string,` [`KvValue`](/docs/api/engine#kvvalue)`>` |  |  | The drawn kv values by key. |

## generators

Function. Explained in [Generators](/docs/reference/plugins/generators#generators).

Returns the generators plugin, for the game's `plugins`. Content declares pools and templates in
`data.generators.pools` and `data.generators.templates`.

Its helper writes its effect, such as `generators.generate('regular')`.

```ts shape
import { generators } from '@ifloom/plugin-generators'
function generators(): DefinedPlugin<null>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin).

| Helper | Signature | Description |
|---|---|---|
| `generators.generate` | `(template: string, count?: number):` [`EffectRef`](/docs/api/engine#effectref) | Returns the `generators/generate` effect, which makes `count` new entities from the template, 1 if left out. |

## PoolDef

Type. Explained in [Generators](/docs/reference/plugins/generators#pooldef).

A pool the game declares in `data.generators.pools`, a named list of values a template picks from. At least one entry must weigh more than 0.

```ts shape
import type { PoolDef } from '@ifloom/plugin-generators'
type PoolDef = {
  id: string
  values: PoolEntry[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The pool's id, which a field's `{ pool }` names. |
| `values` | [`PoolEntry[]`](#poolentry) |  |  | The pool's entries, each picked by its weight. |

## PoolEntry

Type. Explained in [Generators](/docs/reference/plugins/generators#poolentry).

An entry of a pool, a value or a value with a weight. A bare value, or a weight left out, weighs 1.

```ts shape
import type { PoolEntry } from '@ifloom/plugin-generators'
type PoolEntry = KvValue | { value: KvValue; weight?: number }
```

Uses: [`KvValue`](/docs/api/engine#kvvalue).

## poolsOf

Function. Explained in [Generators](/docs/reference/plugins/generators#poolsof).

Returns the game's pools, `data.generators.pools` from its content and packs, in declared order.

```ts shape
import { poolsOf } from '@ifloom/plugin-generators'
function poolsOf(game: Game): PoolDef[]
```

Uses: [`Game`](/docs/api/engine#game), [`PoolDef`](#pooldef).

## TemplateDef

Type. Explained in [Generators](/docs/reference/plugins/generators#templatedef).

A template the game declares in `data.generators.templates`, which makes entities of one kind through the engine's
`create` effect. It needs an `of` or a `like`, and a `name` or a `like`.

```ts shape
import type { TemplateDef } from '@ifloom/plugin-generators'
type TemplateDef = {
  id: string
  of?: string
  like?: EntityRef
  name?: FieldDef
  description?: FieldDef
  image?: FieldDef
  tags?: string[]
  traits?: Record<string, unknown>
  effects?: EffectRef[]
  stats?: Record<string, FieldDef>
  kv?: Record<string, FieldDef>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The template's id, which `generators/generate` names. |
| `of` | `string` | yes |  | The kind of entity the template makes. The `like`'s kind if left out. |
| `like` | [`EntityRef`](/docs/api/engine#entityref) | yes |  | The entity the new ones are made like. The engine reads from it the fields the template doesn't give, such as the name, picture, traits and stats. |
| `name` | [`FieldDef`](#fielddef) | yes |  | The new entity's name. The `like`'s name if left out. |
| `description` | [`FieldDef`](#fielddef) | yes |  | The new entity's description, drawn as the name is. |
| `image` | [`FieldDef`](#fielddef) | yes |  | The new entity's picture, a path in the game's `art/` folder, drawn as the name is, such as `{ pool: 'faces' }`. |
| `tags` | `string[]` | yes |  | The new entity's tags, added after its kind's and its `like`'s. |
| `traits` | `Record<string, unknown>` | yes |  | The new entity's trait data by trait id, over its `like`'s or its kind's, such as `{ 'cast/person': { home: 'park' } }`. |
| `effects` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | The effects that run once the new entity is made, with `'$'` as it, such as `[{ receive: '$' }]` to hand it to whichever plugin keeps things. Nothing more happens if left out. |
| `stats` | `Record<string,` [`FieldDef`](#fielddef)`>` | yes |  | The new entity's stats by id, each a stat the game declares for the kind. A stat left out reads the `like`'s value, else its `start`. |
| `kv` | `Record<string,` [`FieldDef`](#fielddef)`>` | yes |  | The new entity's kv keys by name. |

## templateKind

Function. Explained in [Generators](/docs/reference/plugins/generators#templatekind).

Returns the kind a template makes, its `of`, else its `like`'s kind. It's undefined when the template has neither.

```ts shape
import { templateKind } from '@ifloom/plugin-generators'
function templateKind(template: TemplateDef): string | undefined
```

Uses: [`TemplateDef`](#templatedef).

## templatesOf

Function. Explained in [Generators](/docs/reference/plugins/generators#templatesof).

Returns the game's templates, `data.generators.templates` from its content and packs, in declared order.

```ts shape
import { templatesOf } from '@ifloom/plugin-generators'
function templatesOf(game: Game): TemplateDef[]
```

Uses: [`Game`](/docs/api/engine#game), [`TemplateDef`](#templatedef).
