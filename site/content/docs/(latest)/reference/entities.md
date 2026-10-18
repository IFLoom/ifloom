---
title: "Entities"
description: "Kinds and entities: several of a thing, such as staff or dishes, each with its own stats and kv store, created and removed in play."
---
Use entities when your game keeps several of a thing, each with numbers of its own. A café might have staff, each with a skill and a wage, and dishes on its menu, each with a price. A kind names such a thing (`staff`, `dish`) and an entity is one of them (Ana, the soup). A [stat](/docs/reference/stats) declared with `of: 'staff'` is kept on every member of staff rather than on the player.

The game declares its kinds and the entities that exist at the start. In play, you can:

- [`create`](/docs/reference/effects#create) more entities and [`remove`](/docs/reference/effects#remove) them with effects
- run the same effects over every entity of a kind with [`each`](/docs/reference/effects#each)
- ask how many there are, or whether one is there, with the [`{ count }`](/docs/reference/conditions#count) and [`{ entity }`](/docs/reference/conditions#entity) conditions

The [view](/docs/reference/view#entities) hands every kind to the UI, with the stats the player can see on each. For a whole game built on entities, see the management game in [Shapes of game](/docs/guide/shapes#a-management-game-the-corner-café).

```ts
import { anyOf, bindCurrent, entitiesOf, entityOf, kindById, parseRef, writeEntity, type EntityDef, type EntityRef, type EntityState, type KindDef } from '@ifloom/engine'
```

## A worked example

The Corner Café (`examples/cafe` in the IFLoom repository) keeps staff and dishes. The player has coins and a reputation. Each member of staff has a skill, a morale and a wage, and each dish has a price and a quality.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const corner: Pack = {
  id: 'corner',
  schema: SCHEMA,
  kinds: [{ id: 'staff', label: 'Member of staff', plural: 'Staff' }, { id: 'dish', label: 'Dish', plural: 'Menu' }],
  stats: [
    { id: 'coins', label: 'Coins', start: 120, min: -9999, max: 99999, format: '£{n}', spendable: true },
    { id: 'reputation', label: 'Reputation', start: 20 },
    { id: 'skill', label: 'Skill', of: 'staff', start: 1, min: 1, max: 10 },
    { id: 'morale', label: 'Morale', of: 'staff', start: 60 },
    { id: 'wage', label: 'Wage', of: 'staff', start: 10, max: 50, format: '£{n}' },
    { id: 'price', label: 'Price', of: 'dish', start: 4, min: 1, max: 20, format: '£{n}' },
    { id: 'quality', label: 'Quality', of: 'dish', start: 2, min: 1, max: 5 },
  ],
  entities: [
    { id: 'ana', of: 'staff', name: 'Ana', stats: { skill: 5, wage: 12 } },
    { id: 'toast', of: 'dish', name: 'Cheese on toast', stats: { price: 4, quality: 2 } },
    { id: 'soup', of: 'dish', name: 'Soup of the day', stats: { price: 6, quality: 3 } },
  ],
  // ...
}
```

A new game has the player's stats in `state.stats`, and each entity with its own stats in `state.entities`:

```ts
import { startingState } from '@ifloom/engine'

const state = startingState(game)
state.stats                  // { coins: 120, reputation: 20 }
state.entities.staff.ana     // { name: 'Ana', stats: { skill: 5, morale: 60, wage: 12 }, kv: {} }
state.entities.dish.soup     // { name: 'Soup of the day', stats: { price: 6, quality: 3 }, kv: {} }
```

Ana's morale is the stat's `start`, 60. Her skill and wage come from her declaration. Content names her `'staff:ana'`:

```ts
{ kind: 'stat', stat: 'quality', by: 1, of: 'dish:soup' }          // better ingredients
{ stat: 'quality', of: 'dish:soup', lt: 5 }                         // there is still room to improve it
{ kind: 'each', of: 'staff', effects: [{ kind: 'stat', stat: 'morale', by: -8, of: '$' }] }   // a long week for everyone
{ count: 'staff', where: { stat: 'morale', of: '$', gte: 75 }, gte: 2 }                   // two of them are happy
```

## KindDef

```ts
type KindDef = {
  id: string
  label: string
  plural?: string
}
```

| Field | Default | What it does |
|---|---|---|
| `id` | | The name stats, entities, effects and conditions use for the kind, as in `of: 'staff'` or `{ count: 'staff' }`. |
| `label` | | What the player reads for one, such as "Member of staff". |
| `plural` | `label` | What the player reads for more than one, such as "Staff". The [React UI](/docs/react/components#entitytable) heads each kind's table with it. |

Kinds go in [`Game.kinds`](/docs/reference/game#game). You can declare them on the base you give [`loadGame`](/docs/reference/loader#loadgame), in a [pack](/docs/reference/loader#pack)'s `kinds`, or both, and a [plugin](/docs/reference/plugins#kinds-and-entities) can bring its own `kinds`. They merge by id, the plugins' first, then the base's, then each pack's. A later kind replaces an earlier one with the same id, so a game can redeclare a plugin's kind to reword it.

## EntityDef

```ts
type EntityDef = {
  id: string
  of: string
  name: string
  stats?: Record<string, number>
  kv?: Record<string, KvValue>
}
```

One entity that exists from the start of the game.

| Field | What it does |
|---|---|
| `id` | Unique within its kind. Two kinds may each have an entity with the same id. It can't be a whole number, so the loader refuses `'7'` (see [Ids](#ids)). |
| `of` | Its kind's id. |
| `name` | What the player reads, such as "Ana". |
| `stats` | Starting values for any of its stats that differ from each stat's `start`. Only stats declared `of` its kind. |
| `kv` | Its own [kv store](/docs/reference/state#kv) at the start. Read a key with `{ kv, of }` and set it with the `kv` effect's `of`. |

Entities go in [`Game.entities`](/docs/reference/game#game), on the base or in packs. They merge by kind and id (`'staff:ana'`), the base's first. A later pack's entity replaces an earlier one with the same kind and id, whole.

A [plugin](/docs/reference/plugins#kinds-and-entities)'s `entities` adds more, made from its content once the packs are merged. If the game declares one itself with the same kind and id, the game's wins, whole. The rest come after the game's own, and the loader checks them like any declared entity. Only [`loadGame`](/docs/reference/loader#loadgame) asks plugins for entities, so a game built by hand lists them in `game.entities` itself.

## EntityState

```ts
type EntityState = {
  name: string
  stats: Stats
  kv: Record<string, KvValue>
}
```

One entity as the state keeps it, at [`state.entities[kind][id]`](/docs/reference/state#entities). `stats` has every stat declared `of` its kind, at that stat's `start` unless its declaration or its `create` effect gave another value. `kv` is `{}` when none were given.

## EntityRef

```ts
type EntityRef = string
```

Names an entity in content, as its kind, a colon and its id: `'staff:ana'` or `'staff:#2'`.

**`'$'` is the current one.** Inside an [`each`](/docs/reference/effects#each) effect's `where` and `effects`, and inside a [`{ count }`](/docs/reference/conditions#count) condition's `where`, `of: '$'` means the entity being looked at, one after another. The same goes for the `visible` of a stat declared `of` a kind, which the [view](/docs/reference/view#entitiesview-and-entityview) tests for each entity. Anywhere else, `'$'` names nothing, so an effect with it does nothing and a `{ stat }` condition with it fails.

```ts
{ kind: 'each', of: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ kind: 'remove', entity: '$' }] }
```

A nested `each` or `count` binds its own `'$'`. Inside it, `'$'` is the inner one, and there's no way to name the outer one:

```ts
// For each member of staff: is anyone at all skilled enough to learn from? The inner $ is the inner one.
{
  kind: 'each',
  of: 'staff',
  where: { count: 'staff', where: { stat: 'skill', of: '$', gte: 4 } },
  effects: [{ kind: 'kv', key: 'learning', to: true, of: '$' }],
}
```

**Gotcha.** `'$'` is only replaced where it's the value of an `of` or an `entity` key, but that's at any depth. So an `of: '$'` inside a custom effect's or condition's `with` is replaced too, which is how a custom function learns which entity it's working on. `{ custom: 'payBonus', with: { of: '$' } }` is called with `args.of` set to `'staff:ana'`, then `'staff:#1'`, and so on. A `'$'` under any other key is left as it is.

## Ids

An entity the game declares has the id you give it. One [created](/docs/reference/effects#create) without an id gets the next free number with a `#` in front (`#1`, `#2`), counted per kind in [`state.created`](/docs/reference/state#created). A number is never given twice, even after the entity that had it is removed, so a reference saved in a kv key never comes to mean someone else.

**Why the `#`.** Entities keep the order they arrived in, declared ones first and then created ones. They're kept in an object, and JavaScript always puts keys that look like whole numbers first, in numeric order. The `#` avoids that, and it's also why the loader reports `an entity id must not be a whole number` for a declared one.

## Entities in old saves

A save made before the game declared an entity doesn't have it. That happens when an update writes Ben into the café, or when the player turns on a mod that adds staff. When the save loads, [`loadState`](/docs/reference/saves#loadstate) adds every declared entity it lacks, set up as a new game would have it. A game that declares a [`version`](/docs/reference/saves#filling-new-content) adds them in its own migration step instead, with `tools.fill()`.

The exception is an entity that left in play. A [`remove`](/docs/reference/effects#remove) effect on a declared entity records it in [`state.removed`](/docs/reference/state#removed), and loading skips those. If Ben quit, he doesn't come back on the next load. An entity created in play isn't recorded, since nothing would bring it back.

```ts
import { applyEffects, loadState, type GameState } from '@ifloom/engine'

// loadState fails for a save it refuses; these two load.
const staff = (state: GameState) => Object.keys((loadState(state, game).value as GameState).entities.staff)

const older = { ...save, entities: { ...save.entities, staff: { ana: save.entities.staff.ana } } }
staff(older)    // ['ana', 'ben']: Ben joins

const left = applyEffects(save, game, [{ kind: 'remove', entity: 'staff:ben' }])
left.removed    // ['staff:ben']
staff(left)     // ['ana']: he stays gone
```

**Gotchas.**
- **When it happens.** Only when a state loads. A save read back from the [store](/docs/reference/saves) or the [runner](/docs/reference/runner) loads through `loadState`. A state you parsed yourself gets the missing entities once you pass it to `loadState`. Commands don't add them.
- **Taken on again.** A `create` that names a removed declared entity's id brings it back and takes it out of `removed`. Removing it again records it once.
- **Saves from before version 7 recorded no removals.** Their `removed` starts empty, so a declared entity removed in such a save is put back at its start. See the [6 → 7 step](/docs/reference/saves#the-engines-steps).
- **A dropped declaration isn't taken out.** An entity the game no longer declares stays in a save that has it, until an effect removes it.

## Functions

The effects, conditions and view use these. A [custom function](/docs/reference/custom) or a [plugin](/docs/reference/plugins) can call them directly.

### entitiesOf

```ts
function entitiesOf(state: GameState, kind: string): EntityRef[]
```

Every entity of a kind, as references, in the order they arrived. It's `[]` for a kind with none, or a kind the state has never heard of.

```ts
import { entitiesOf } from '@ifloom/engine'

entitiesOf(state, 'staff')   // ['staff:ana', 'staff:#1']
```

The café's custom effects use it to add up a stat over a kind:

```ts
import { entitiesOf, entityOf, type GameState } from '@ifloom/engine'

function total(state: GameState, kind: string, stat: string): number {
  return entitiesOf(state, kind).reduce((sum, ref) => sum + (entityOf(state, ref)?.stats[stat] ?? 0), 0)
}

// goes on the game as custom.effects
wages: (state) => [{ kind: 'stat', stat: 'coins', by: -total(state, 'staff', 'wage') }],
```

### entityOf

```ts
function entityOf(state: GameState, ref: EntityRef): EntityState | undefined
```

The entity a reference names. It's `undefined` if the entity isn't there (removed or never created), or if `ref` isn't `kind:id` at all, `'$'` included.

```ts
import { entityOf } from '@ifloom/engine'

entityOf(state, 'staff:ana')?.stats.morale   // 60
```

### kindById

```ts
function kindById(game: Game, id: string): KindDef | undefined
```

The declaration of a kind, or `undefined` if the game declares none by that id.

### parseRef

```ts
function parseRef(ref: EntityRef): { kind: string; id: string } | undefined
```

Splits a reference at its first colon. It returns `undefined` if there's no colon, or nothing on one side of it.

```ts
import { parseRef } from '@ifloom/engine'

parseRef('staff:#2')   // { kind: 'staff', id: '#2' }
parseRef('$')          // undefined
```

### writeEntity

```ts
function writeEntity(state: GameState, ref: EntityRef, next: EntityState): GameState
```

Returns the state with the entity `ref` names set to `next`, whole, including its name, stats and kv store. If the entity isn't there, it's added after the rest of its kind. If `ref` isn't `kind:id`, the state comes back unchanged. Use it in a plugin effect or a custom effect that changes an entity in a way the built-in effects can't.

```ts
import { entityOf, writeEntity } from '@ifloom/engine'

const ana = entityOf(state, 'staff:ana')!
writeEntity(state, 'staff:ana', { ...ana, name: 'Ana, head cook' })
```

**Gotcha.** Nothing is checked, so a stat isn't held to its range. An entity added this way isn't counted in [`state.created`](/docs/reference/state#created), and isn't recorded when it's later removed. It counts as one created in play unless the game declares it.

### anyOf

```ts
function anyOf(kind: string): EntityRef
```

Returns `'<kind>:*'`, a reference that stands for any one of a kind. It isn't a real entity, so `entityOf` finds nothing by it. Use it to check content written with `'$'` before it runs. Bind `'$'` to it with [`bindCurrent`](#bindcurrent) and hand the result to the [content checker](/docs/reference/checks), which then knows whose stats a `{ stat, of: '$' }` names. A plugin's [`references`](/docs/reference/plugins#references) do this for its own conditions written per entity:

```ts
import { anyOf, bindCurrent, type Condition } from '@ifloom/engine'

// in definePlugin({ ... })
references: {
  content: (game) =>
    ((game.data?.regulars?.people ?? []) as readonly { id: string; when?: Condition }[]).map((person) => ({
      list: 'people',
      id: person.id,
      refs: [{ when: bindCurrent(person.when, anyOf('regular')) }],
    })),
},
```

### bindCurrent

```ts
function bindCurrent<T extends Condition | EffectRef | readonly EffectRef[] | undefined>(value: T, ref: EntityRef): T
```

Returns a copy of a condition or of effects, with every `of: '$'` and every `entity: '$'` set to `ref`, at any depth. This is how `each` and `count` run their `where` and `effects` for each entity. A plugin or custom function can use it to run content written for "this one" on a particular entity:

```ts
import { bindCurrent, holds } from '@ifloom/engine'

holds(state, bindCurrent({ stat: 'morale', of: '$', gte: 75 }, 'staff:ana'), game)   // is Ana happy?
```

Anything else is copied as it is, `undefined` included. A nested `each`'s `effects` and a nested `count`'s `where` are left alone, since their `'$'` is their own.

**Gotcha.** Hand it what's inside an `each` or a `count`, not the `each` or `count` itself. On one of those, its own `effects` or `where` is the part that's left alone.

## Gotchas

- **Stat ids are shared.** A stat's id is unique across the whole game, counting the player's stats and every kind's. The café can't have both a player's `skill` and a staff `skill`. A `stat` effect or a `{ stat }` condition finds its range, format and levels by id alone.
- **A stat named on the wrong owner does nothing useful.** At run time, `{ kind: 'stat', stat: 'coins', by: 5, of: 'staff:ana' }` gives Ana a `coins` of her own, which no view shows. The [content checker](/docs/reference/checks) reports it, and a kind the game doesn't declare.
- **A stat with a moving ceiling** (`max: { value }`) is worked out against the whole state. It's the same for every entity, not worked out for the one it's on.
- **What a declaration or a `create` gives isn't held to range.** `stats: { skill: 20 }` on a stat with `max: 10` starts at 20, and the next effect that moves it brings it back to 10.

## See it in an example

- The Corner Café: [`examples/cafe/src/world/staff.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/staff.ts) and [`examples/cafe/src/world/menu.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/menu.ts) declare the kinds `staff` and `dish` and start with Ana, cheese on toast and soup as entities. [`examples/cafe/src/rules.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/rules.ts) adds up a stat over a kind with `entitiesOf` and `entityOf` in its `total` helper. The `improveSoup` activity names one entity as `'dish:soup'`.
- Small Town: the park's visitors in [`examples/showcase/src/story/park.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/park.ts) are entities of the kind `visitor`, made by the generators plugin and cleared each day with `each` and `remove`.
