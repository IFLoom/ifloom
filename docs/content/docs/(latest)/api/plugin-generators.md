---
title: "@ifloom/plugin-generators"
description: "Every export of @ifloom/plugin-generators: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-generators` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`drawEntity`](#drawentity), [`generators`](#generators), [`poolsOf`](#poolsof), [`templateKind`](#templatekind), [`templatesOf`](#templatesof)
- Types: [`FieldDef`](#fielddef), [`GeneratedEntity`](#generatedentity), [`PoolDef`](#pooldef), [`PoolEntry`](#poolentry), [`TemplateDef`](#templatedef)

## drawEntity

Function. Explained in [Generators](/docs/plugins/generators#drawentity).

What a template draws for the `n`th entity of its kind made in play, in
this save. The plugin's effect passes the number the next one will get, so
each is different and the same on every replay.

```ts shape
import { drawEntity } from '@ifloom/plugin-generators'
function drawEntity(state: GameState, game: Game, template: TemplateDef, n: number): GeneratedEntity
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`TemplateDef`](#templatedef), [`GeneratedEntity`](#generatedentity).

## FieldDef

Type. Explained in [Generators](/docs/plugins/generators#fielddef).

Where one field of a new entity comes from:

- a fixed value, as written: `'visitor'`, `3`, `true`;
- `{ pool: 'first-names' }`, one value picked from a pool by weight;
- `{ between: [1, 5] }`, a whole number from the first to the second, both included;
- `{ join: [...], with?: ' ' }`, several fields drawn and joined into one string.

```ts shape
import type { FieldDef } from '@ifloom/plugin-generators'
type FieldDef = KvValue | { pool: string } | { between: [ number, number ] } | { join: FieldDef[]; with?: string }
```

Uses: [`KvValue`](/docs/api/engine#kvvalue).

## GeneratedEntity

Type. Explained in [Generators](/docs/plugins/generators#generatedentity).

What a template draws for one entity: the fields of the engine's `create` effect that come from pools and ranges.

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

## generators

Function. Explained in [Generators](/docs/plugins/generators#generators).

The plugin, with its helpers on it: `generators()` makes the plugin for the
game's `plugins`, and content is written with `generators.generate('regular')`.

```ts shape
import { generators } from '@ifloom/plugin-generators'
function generators(): DefinedPlugin<null>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin).

| Helper | Signature | Description |
|---|---|---|
| `generators.generate` | `(template: string, count?: number):` [`EffectRef`](/docs/api/engine#effectref) |  |

## PoolDef

Type. Explained in [Generators](/docs/plugins/generators#pooldef).

A named list of values to pick from.

```ts shape
import type { PoolDef } from '@ifloom/plugin-generators'
type PoolDef = {
  id: string
  values: PoolEntry[]
}
```

## PoolEntry

Type. Explained in [Generators](/docs/plugins/generators#poolentry).

One value in a pool: the value, or the value with a weight (1 if left out).

```ts shape
import type { PoolEntry } from '@ifloom/plugin-generators'
type PoolEntry = KvValue | { value: KvValue; weight?: number }
```

Uses: [`KvValue`](/docs/api/engine#kvvalue).

## poolsOf

Function. Explained in [Generators](/docs/plugins/generators#poolsof-and-templatesof).

The game's pools: `data.generators.pools`, from its content and packs.

```ts shape
import { poolsOf } from '@ifloom/plugin-generators'
function poolsOf(game: Game): PoolDef[]
```

Uses: [`Game`](/docs/api/engine#game), [`PoolDef`](#pooldef).

## TemplateDef

Type. Explained in [Generators](/docs/plugins/generators#templatedef).

How to make one entity of a kind, as the engine's `create` effect makes it.

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
  at?: Placement
  stats?: Record<string, FieldDef>
  kv?: Record<string, FieldDef>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `of` | `string` | yes |  | The kind of entity it makes. The `like`'s kind if left out. |
| `like` | [`EntityRef`](/docs/api/engine#entityref) | yes |  | An entity it is made like: what it isn't given (name, picture, traits, stats) is read from that one. |
| `name` | [`FieldDef`](#fielddef) | yes |  | Its name. The `like`'s if left out. |
| `description` | [`FieldDef`](#fielddef) | yes |  | A line or two about it, drawn as the name is. |
| `image` | [`FieldDef`](#fielddef) | yes |  | Its picture, through `artSrc`, drawn as the name is: `{ pool: 'faces' }`. |
| `tags` | `string[]` | yes |  | Words it has, after its kind's and its `like`'s. |
| `traits` | `Record<string, unknown>` | yes |  | Trait data, by trait id, over its `like`'s or its kind's: `{ 'cast/person': { home: 'park' } }`. |
| `at` | [`Placement`](/docs/api/engine#placement) | yes |  | Who holds it once made: a holder, or how many each holds. Nobody if left out. |
| `stats` | `Record<string,` [`FieldDef`](#fielddef)`>` | yes |  | Its stats, by id: stats the game declares for the kind. Left out, a stat reads its `like`'s, else its `start`. |
| `kv` | `Record<string,` [`FieldDef`](#fielddef)`>` | yes |  | Its kv keys, by name. |

## templateKind

Function. Explained in [Generators](/docs/plugins/generators#templatekind).

The kind a template makes: its `of`, else its `like`'s.

```ts shape
import { templateKind } from '@ifloom/plugin-generators'
function templateKind(template: TemplateDef): string | undefined
```

Uses: [`TemplateDef`](#templatedef).

## templatesOf

Function. Explained in [Generators](/docs/plugins/generators#poolsof-and-templatesof).

The game's templates: `data.generators.templates`, from its content and packs.

```ts shape
import { templatesOf } from '@ifloom/plugin-generators'
function templatesOf(game: Game): TemplateDef[]
```

Uses: [`Game`](/docs/api/engine#game), [`TemplateDef`](#templatedef).
