---
title: "Generators"
description: "Make new entities from templates, with each field drawn from a weighted pool, a number range or a fixed value, seeded by the save."
---
`@ifloom/plugin-generators` makes new [entities](/docs/reference/entities) from templates: visitors in a park, customers in a shop, applicants for a job. You give it named pools of values to pick from, and a template that says where each of an entity's fields comes from. An effect then makes as many as you ask for.

The plugin knows nothing about people or anything else. A pool is any list of values, and a template can fill any kind of entity your game declares. Every draw is seeded by the save, so a replay makes the same entities and a reload can't re-roll them.

```ts
import { generators, drawEntity, poolsOf, templatesOf, type PoolDef, type PoolEntry, type TemplateDef, type FieldDef, type GeneratedEntity } from '@ifloom/plugin-generators'
```

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-generators": "^0.0.0"
  }
}
```

Then add `generators()` to the game's `plugins`. [Adding one](/docs/reference/plugins#adding-one) has the details. The plugin works on its own, cooperates with no other, and keeps no state of its own. What it makes are ordinary entities in the game state.

## generators

```ts shape
function generators(): DefinedPlugin<null>
```

Builds the plugin, with the id `generators`.

## Writing pools and templates

Pools and templates are content. They go in your content's [`data`](/docs/reference/content#content) under `generators.pools` and `generators.templates`, and are merged by id, so a mod can add names to a pool by replacing it, or add a template.

These are the showcase's park visitors. Each day the player first comes to the park, yesterday's go home and two new ones arrive:

```ts
import type { Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { generators, type PoolDef, type TemplateDef } from '@ifloom/plugin-generators'

const pools: PoolDef[] = [
  { id: 'first-names', values: ['Ruth', 'Omar', 'Lena', 'Theo', 'Priya', 'Jonah', 'Maud', 'Kit'] },
  { id: 'company', values: [{ value: 'alone', weight: 5 }, { value: 'a dog', weight: 4 }, { value: 'a pushchair', weight: 1 }] },
]

const visitor: TemplateDef = {
  id: 'visitor',
  of: 'visitor',
  name: { pool: 'first-names' },
  kv: { with: { pool: 'company' }, laps: { between: [1, 3] } },
}

const town: Content = {
  kinds: [{ id: 'visitor', label: 'Visitor', plural: 'Visitors' }],
  triggers: [
    {
      id: 'visitors',
      once: { per: 'turn' },
      when: places.at('park'),
      effects: [{ each: 'visitor', effects: [{ remove: '$' }] }, generators.generate('visitor', 2)],
    },
  ],
  data: { generators: { pools, templates: [visitor] } },
}
```

### PoolDef

```ts shape
type PoolDef = { id: string; values: PoolEntry[] }
```

| Field | What it is |
|---|---|
| `id` | Unique among pools. A template names the pool by it. |
| `values` | What to pick from: strings, numbers or `true`/`false`. Write a value as it is, or as `{ value, weight }` to make it more or less likely. A value of weight 4 comes up four times as often as one of weight 1, the weight when it's left out. A weight of 0 is never picked. |

The draw is the engine's [`weighted`](/docs/reference/random#weighted).

#### PoolEntry

One value of a pool: the value as it is, or with a weight.

```ts shape
type PoolEntry = KvValue | { value: KvValue; weight?: number }
```

### TemplateDef

```ts shape
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

A template has the fields of the engine's [`create`](/docs/reference/effects#create) effect. The words and numbers are [drawn](#fielddef); the rest are written as they are.

| Field | What it is | If left out |
|---|---|---|
| `id` | Unique among templates. The `generators/generate` effect names it. | Required. |
| `of` | The [kind](/docs/reference/entities#kinddef) of entity it makes. | The `like`'s kind. One of `of` and `like` is required. |
| `like` | A declared entity it's made [like](/docs/reference/entities#things-made-like-another): what it isn't given, such as its name, picture, traits and stats, is read from that one. | Like nothing. |
| `name` | Where the entity's name comes from. | The `like`'s. Required without a `like`. |
| `description` | Where its description comes from, drawn as the name is. | The `like`'s, or none. |
| `image` | Where its picture comes from, through [`artSrc`](/docs/reference/prose#artsrc): a path, or `{ pool: 'faces' }` to pick one. | The `like`'s, or none. |
| `tags` | Words it has, after its kind's and its `like`'s. | None of its own. |
| `traits` | [Trait](/docs/reference/entities#traits) data, by trait id, laid over its `like`'s or its kind's: `{ 'cast/person': { home: 'park', talk: 'visitor.hi' } }` makes someone the [cast](/docs/reference/plugins/cast) can find. | None of its own. |
| `at` | Who [holds](/docs/reference/entities#holding-things) it once made: a holder, such as `'player'` or `'location:park'`, or how many each holds. | Nobody. |
| `stats` | Where its stats come from, by id. Each must be a stat the game declares for the kind. A drawn value that's what it would read anyway (its `like`'s, or else the stat's `start`) isn't kept, so the save holds only what differs. | Its `like`'s, else each stat's `start`, as a `create` effect's. |
| `kv` | Where the keys of its kv store come from, by name. | Its `like`'s, or none. |

A regular at the café, made like a pattern the game declares, with a face from a pool and the cast's trait so the player can talk to them:

```ts
import { type TemplateDef } from '@ifloom/plugin-generators'

const regular: TemplateDef = {
  id: 'regular',
  like: 'character:regular',            // a declared person nobody meets, with talk: 'regular.hi'
  name: { pool: 'first-names' },
  image: { pool: 'faces' },
  tags: ['regular'],
  traits: { 'cast/person': { home: 'cafe' } },
  stats: { patience: { between: [1, 5] } },
}
```

### FieldDef

```ts shape
type FieldDef = KvValue | { pool: string } | { between: [number, number] } | { join: FieldDef[]; with?: string }
```

| Written | Gives |
|---|---|
| `'visitor'`, `3`, `true` | That value, as written. |
| `{ pool: 'first-names' }` | One value picked from the pool, by weight. |
| `{ between: [1, 3] }` | A whole number from the first to the second, both included. |
| `{ join: [{ pool: 'first-names' }, { pool: 'surnames' }], with: ' ' }` | Each part drawn, then joined into one string. `with` is a space if left out. |

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ 'generators/generate': { template, count? } }` | `generators.generate(template, count?)` | Makes `count` new entities (1 if left out) from the template, one after another. |

Each is made with the engine's [`create`](/docs/reference/effects#create) effect, so it gets the next free id of its kind (`visitor:#1`, `visitor:#2` and so on), reads what it isn't given from its `like` or its kind, and goes to the template's `at`. It works in any effect list, a thing's use in the [inventory](/docs/reference/plugins/inventory) included. In a plugin's [`effectsOf`](/docs/reference/plugins#saying-what-a-command-does), which lists plain effects, write the long form, `{ 'generators/generate': { template, count } }`.

A template the game doesn't have makes nothing.

## Seeded draws

Every field is drawn from the save's [seed](/docs/reference/state#seed), the template's id, the number the new entity will get, and the field's name. A field added to a template, such as a `description`, has a name of its own, so it doesn't change what the others draw. So:

- The same save makes the same entities every time, and a replay of its commands makes them again exactly.
- Each new entity is drawn differently, because its number is new. Making three at once gives the same three as making one three times.
- A different save, with a different seed, gets different ones.

## For code

### Helpers

```ts shape
const generators: {
  (): DefinedPlugin<null>
  generate(template: string, count?: number): EffectRef
}
```

### drawEntity

```ts shape
function drawEntity(state: GameState, game: Game, template: TemplateDef, n: number): GeneratedEntity
```

What the template draws for the `n`th entity of its kind made in play, without making it: the fields that come from pools and ranges, each only when the template has it. `stats` holds every stat drawn, before the effect leaves out the ones equal to what the entity would read anyway. The effect passes the number the next one will get. Use it to preview a template, or in a test.

#### GeneratedEntity

What `drawEntity` returns: the drawn fields of one entity, before it's made.

```ts shape
type GeneratedEntity = { name?: string; description?: string; image?: string; stats: Record<string, number>; kv: Record<string, KvValue> }
```

| Field | What it is |
|---|---|
| `name`, `description`, `image` | Drawn from the template's field of the same name. Absent when the template has none. |
| `stats` | Every stat the template draws, by id. |
| `kv` | Every kv key the template draws, by key. |

### templateKind

```ts shape
function templateKind(template: TemplateDef): string | undefined
```

The kind a template makes: its `of`, else its `like`'s kind. Undefined for a template with neither, which the checks report.

### poolsOf and templatesOf

```ts shape
function poolsOf(game: Game): PoolDef[]
function templatesOf(game: Game): TemplateDef[]
```

The game's pools and templates, merged from its content and packs.

## Checks

When the game loads, the plugin reports these problems against the content or pack each pool or template came from:

- A template whose kind the game doesn't have (`templates visitor: unknown kind "…"`), or a stat the kind doesn't have (`no visitor stat named "…"`).
- A template with neither `of` nor `like` (`makes nothing: give it an of or a like`), or with no `name` and no `like` to read one from (`needs a name, or a like to read it from`).
- A `like` that isn't a declared entity of the kind, a holder in `at` that can't hold things, a trait no plugin declares, or an `image` path with no file, as the engine's `create` reports them.
- A template naming a pool the game doesn't have (`unknown pool "…"`).
- A `between` whose first number is bigger than its second (`stat mood: between [5, 1] runs backwards`).
- A pool with nothing to pick (`pools <id>: has nothing to pick: no values, or every weight is 0`).

A call that names a template the game doesn't have gives `unknown template "…"` where it's written, and a `count` that isn't a whole number of 1 or more gives `count must be a whole number, 1 or more`.

## Gotchas

- **Entities are kept until something removes them.** A trigger that makes visitors every day fills the save with them. Remove the old ones with an [`each`](/docs/reference/effects#each) and [`remove`](/docs/reference/effects#remove), as the showcase does.
- **Pools hold plain values.** A pool can't hold another pool. Use `join` to put several draws together.

## See it in an example

Small Town: `data.generators` in [`examples/showcase/src/story/park.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/park.ts) has two pools and a `visitor` template, and the park's `visitors` trigger makes two a day with `generators.generate('visitor', 2)`.
