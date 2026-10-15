# Entities

Some games keep several of a thing, each with numbers of its own: the staff of a café, each with a skill and a wage; the dishes on its menu, each with a price. A **kind** names such a thing; an **entity** is one of them. A [stat](/reference/stats) declared with `of: 'staff'` belongs to every member of staff rather than to the player.

The game declares its kinds and the entities there at the start. Effects [`create`](/reference/effects#create) more in play, [`remove`](/reference/effects#remove) them, and run the same effects over all of them with [`each`](/reference/effects#each); the [`{ count }`](/reference/conditions#count) and [`{ entity }`](/reference/conditions#entity) conditions ask how many there are and whether one is there; the [view](/reference/view#entities) hands every kind to the UI with the stats the player can see on each. For a whole game built on them, see the management shape in [Shapes of game](/guide/shapes#a-management-game-the-corner-cafe).

```ts
import { anyOf, bindCurrent, entitiesOf, entityOf, kindById, parseRef, writeEntity, type EntityDef, type EntityRef, type EntityState, type KindDef } from '@ifloom/engine'
```

## A worked example

The Corner Café (`examples/cafe/src/game.ts` in the IFLoom repository) keeps staff and dishes. The player has coins and a reputation; each member of staff has a skill, a morale and a wage; each dish has a price and a quality.

```ts
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

A new game has the player's stats in `state.stats` and each entity, with its own, in `state.entities`:

```ts
const state = startingState(game)
state.stats                  // { coins: 120, reputation: 20 }
state.entities.staff.ana     // { name: 'Ana', stats: { skill: 5, morale: 60, wage: 12 }, flags: {} }
state.entities.dish.soup     // { name: 'Soup of the day', stats: { price: 6, quality: 3 }, flags: {} }
```

Ana's morale is the stat's `start`, 60; her skill and wage are what her declaration gives. Content names her `'staff:ana'`:

```ts
{ kind: 'stat', key: 'quality', by: 1, of: 'dish:soup' }          // better ingredients
{ stat: 'quality', of: 'dish:soup', lt: 5 }                         // there is still room to improve it
{ kind: 'each', of: 'staff', effects: [{ kind: 'stat', key: 'morale', by: -8, of: '$' }] }   // a long week for everyone
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
| `id` | — | What stats, entities, effects and conditions name the kind by: `of: 'staff'`, `{ count: 'staff' }`. |
| `label` | — | What the player reads for one: "Member of staff". |
| `plural` | `label` | What the player reads for more than one: "Staff". The [base UI](/ui/components#entitytable) heads each kind's table with it. |

Declared in [`Game.kinds`](/reference/game#game): on the base given to [`loadGame`](/reference/loader#loadgame), in a [pack](/reference/loader#pack)'s `kinds`, or both, or brought by a [plugin](/reference/plugins#kinds-and-entities)'s `kinds`. They merge by id, the plugins' first, then the base's, then each pack's: a later kind replaces an earlier one with the same id, so a game can redeclare a plugin's kind to reword it.

## EntityDef

```ts
type EntityDef = {
  id: string
  of: string
  name: string
  stats?: Record<string, number>
  flags?: Record<string, FlagValue>
}
```

One entity there from the start of the game.

| Field | What it does |
|---|---|
| `id` | Unique within its kind. Two kinds may each have an entity with the same id. **Not a whole number**: the loader refuses `'7'` (see [ids](#ids)). |
| `of` | Its kind's id. |
| `name` | What the player reads: "Ana". |
| `stats` | Where its stats start, where they differ from each stat's `start`. Only stats declared `of` its kind. |
| `flags` | Its [variables](/reference/state#flags) at the start, read with `{ flag, of }` and set with the `flag` effect's `of`. |

Declared in [`Game.entities`](/reference/game#game), on the base or in packs. They merge by kind and id (`'staff:ana'`), the base's first: a later pack's entity replaces an earlier one's with the same kind and id, whole.

A [plugin](/reference/plugins#kinds-and-entities)'s `entities` adds more, made from its content once the packs are merged. One the game declares itself with the same kind and id wins, whole; the rest come after the game's own, and the loader checks them like any declared entity. Only [`loadGame`](/reference/loader#loadgame) asks plugins: a game built by hand lists them in `game.entities` itself.

## EntityState

```ts
type EntityState = {
  name: string
  stats: Stats
  flags: Record<string, FlagValue>
}
```

One entity as the state keeps it, at [`state.entities[kind][id]`](/reference/state#entities). `stats` has every stat declared `of` its kind, at that stat's `start`, overridden by what its declaration or its `create` effect gave; `flags` is `{}` when none were given.

## EntityRef

```ts
type EntityRef = string
```

Which entity, as content names it: its kind, a colon, its id. `'staff:ana'`, `'staff:#2'`.

**`'$'` is the current one.** Inside an [`each`](/reference/effects#each) effect's `where` and `effects`, and inside a [`{ count }`](/reference/conditions#count) condition's `where`, an `of: '$'` is the entity being looked at, one after another. So it is in the `visible` of a stat declared `of` a kind, which the [view](/reference/view#entitiesview-and-entityview) tests for each entity. Anywhere else, `'$'` names nothing: an effect with it does nothing and a `{ stat }` condition with it fails.

```ts
{ kind: 'each', of: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ kind: 'remove', of: '$' }] }
```

A nested `each` or `count` binds its own `'$'`. Inside it, `'$'` is the inner one, and the outer one cannot be named:

```ts
// For each member of staff: is anyone at all skilled enough to learn from? The inner $ is the inner one.
{
  kind: 'each',
  of: 'staff',
  where: { count: 'staff', where: { stat: 'skill', of: '$', gte: 4 } },
  effects: [{ kind: 'flag', key: 'learning', value: true, of: '$' }],
}
```

**Gotcha.** Only an `of` and an [`{ entity }`](/reference/conditions#entity) are replaced. An `of: '$'` inside a custom effect's or condition's `with` is replaced too, which is how one learns which entity it is working on: `{ custom: 'payBonus', with: { of: '$' } }` is called with `args.of` set to `'staff:ana'`, then `'staff:#1'`, and so on.

## Ids

An entity declared by the game has the id it is given. One [created](/reference/effects#create) without an id gets the next free number with a `#` in front, `#1`, `#2`, counted per kind in [`state.created`](/reference/state#created). A number is never given twice, even after the one that had it is removed, so a reference saved in a variable never comes to mean someone else.

**Why the `#`.** Entities keep the order they came in: declared ones first, in declaration order, then created ones as they arrive. They are kept in an object, and an object's keys that look like whole numbers always come before the rest, in numeric order. Hence the `#`, and hence the loader's `an entity id must not be a whole number` for a declared one.

## Entities in old saves

A save made before the game declared an entity — before an update wrote Ben into the café, or before a mod that adds staff was turned on — does not have it. [`hydrate`](/reference/commands#hydrate), which [`apply`](/reference/commands#apply) runs before every command, adds every declared entity a save lacks, at its start, as a new game would have it.

Except one that left in play. A [`remove`](/reference/effects#remove) effect on a declared entity records it in [`state.removed`](/reference/state#removed), and `hydrate` leaves those out: if Ben quit, he does not come back on the next load. An entity created in play is not recorded, since nothing would bring it back.

```ts
const older = { ...save, entities: { ...save.entities, staff: { ana: save.entities.staff.ana } } }
Object.keys(hydrate(older, game).entities.staff)    // ['ana', 'ben']: Ben joins

const left = applyEffects(save, game, [{ kind: 'remove', of: 'staff:ben' }])
left.removed                                        // ['staff:ben']
Object.keys(hydrate(left, game).entities.staff)     // ['ana']: he stays gone
```

**Gotchas.**
- **When it happens.** A save read back from the [store](/reference/saves) is hydrated as it is read, and every command hydrates the state it runs on. A state from anywhere else — a save's text you parsed yourself — has them once you call `hydrate`, or after its first command.
- **Taken on again.** A `create` that names a removed declared entity's id brings it back, and takes it out of `removed`; removing it again records it once.
- **Saves from before version 7 recorded no removals.** Their `removed` starts empty, so a declared entity removed in such a save is put back at its start. See the [6 → 7 step](/reference/saves#migrate).
- **A dropped declaration is not taken out.** An entity the game no longer declares stays in a save that has it, until an effect removes it.

## Functions

The effects, conditions and view use these; a [custom function](/reference/custom) or a [plugin](/reference/plugins) can call them directly.

### entitiesOf

```ts
function entitiesOf(state: GameState, kind: string): EntityRef[]
```

Every entity of a kind, as references, in the order they came. `[]` for a kind with none, or one the state has never heard of.

```ts
entitiesOf(state, 'staff')   // ['staff:ana', 'staff:#1']
```

The café's custom effects add up a stat over a kind with it:

```ts
function total(state: GameState, kind: string, stat: string): number {
  return entitiesOf(state, kind).reduce((sum, ref) => sum + (entityOf(state, ref)?.stats[stat] ?? 0), 0)
}

// goes on the game as custom.effects
wages: (state) => [{ kind: 'stat', key: 'coins', by: -total(state, 'staff', 'wage') }],
```

### entityOf

```ts
function entityOf(state: GameState, ref: EntityRef): EntityState | undefined
```

The entity a reference names, or `undefined` if it is not there — removed, never created, or `ref` is not `kind:id` at all (`'$'` included).

```ts
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

Splits a reference at its first colon. `undefined` if there is none, or nothing on one side of it.

```ts
parseRef('staff:#2')   // { kind: 'staff', id: '#2' }
parseRef('$')          // undefined
```

### writeEntity

```ts
function writeEntity(state: GameState, ref: EntityRef, next: EntityState): GameState
```

The state with the entity `ref` names set to `next`, whole: its name, stats and variables. Adds it if it is not there, after the rest of its kind. Returns the state unchanged if `ref` is not `kind:id`. For a plugin effect or a custom effect that changes an entity in a way the built-in effects do not.

```ts
const ana = entityOf(state, 'staff:ana')!
writeEntity(state, 'staff:ana', { ...ana, name: 'Ana, head cook' })
```

**Gotcha.** Nothing is checked: a stat is not held to its range, and an entity added this way is neither counted in [`state.created`](/reference/state#created) nor recorded when later removed — it counts as one created in play unless the game declares it.

### anyOf

```ts
function anyOf(kind: string): EntityRef
```

`'<kind>:*'`: a reference standing for any one of a kind. Not an entity — `entityOf` finds nothing by it. It is for checking content written with `'$'` before it runs: bind `'$'` to it with [`bindCurrent`](#bindcurrent) and hand the result to the loader's checks, which then know whose stats a `{ stat, of: '$' }` names. A plugin's [`check`](/reference/plugins#content-and-checks) does this for its own conditions written per entity:

```ts
check: (game, { conditionProblems }) =>
  ((game.data?.regulars?.people ?? []) as readonly { id: string; when?: Condition }[]).flatMap((person) =>
    conditionProblems(bindCurrent(person.when, anyOf('regular'))).map((what) => ({ list: 'people', id: person.id, what })),
  ),
```

### bindCurrent

```ts
function bindCurrent<T extends Condition | EffectRef | readonly EffectRef[] | undefined>(value: T, ref: EntityRef): T
```

A copy of a condition or of effects with every `of: '$'` and every `entity: '$'` set to `ref`. It is how `each` and `count` run their `where` and `effects` for each entity, and a plugin or custom function uses it to run content written for "this one" on a particular one:

```ts
holds(state, bindCurrent({ stat: 'morale', of: '$', gte: 75 }, 'staff:ana'), game)   // is Ana happy?
```

Anything else is copied as it is, `undefined` included. A nested `each`'s `effects` and a nested `count`'s `where` are left alone, since their `'$'` is their own.

**Gotcha.** Hand it what is *inside* an `each` or a `count`, not the `each` or `count` itself: on one of those, its own `effects` or `where` is the part left alone.

## Gotchas

- **Stat ids are shared.** A stat's id is unique across the whole game, the player's and every kind's: the café cannot have a player's `skill` and a staff `skill`. A `stat` effect or a `{ stat }` condition finds its range, format and bands by id alone.
- **Effects are not checked against the kind.** `{ kind: 'stat', key: 'coins', by: 5, of: 'staff:ana' }` gives Ana a `coins` of her own, which no view shows. The [loader](/reference/loader#the-checks) checks the kind a reference names — in conditions everywhere, in effects only a trigger's — and an entity declaration's `stats`, but not which stats an effect or condition with `of` names.
- **A stat with a moving ceiling** (`max: { value }`) is worked out against the whole state, the same for every entity, not against the one it is on.
- **What a declaration or a `create` gives is not held to range.** `stats: { skill: 20 }` on a stat with `max: 10` starts at 20; the next effect that moves it brings it back to 10.
