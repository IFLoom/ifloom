---
title: "Entities"
description: "Kinds, entities, holders and traits, and the functions that read an entity, its traits and what each holder holds."
---
An entity is one of a kind of thing a game keeps, such as a member of staff, a dish, a person or a sandwich, and a kind names the sort (`staff`, `dish`, `character`). Your content declares the kinds in `kinds` and the entities there are at the start in `entities`, and the save keeps only what play changes. [Entities, things and traits](/docs/explanation/entities-and-traits) explains kinds, holders and traits, and [Give the player things to hold and use](/docs/how-to/give-the-player-things) adds things to a game. The [`create`](/docs/reference/effects#create), [`remove`](/docs/reference/effects#remove), [`each`](/docs/reference/effects#each), [`entity`](/docs/reference/effects#entity) and [`move`](/docs/reference/effects#move) effects change entities, and the [`entity`](/docs/reference/conditions#entity) and [`count`](/docs/reference/conditions#count) conditions ask about them.

In the showcase: `examples/showcase/src/world/things.ts`, which declares clothing as a unique kind and food and the newspaper as kinds that stack.

```ts
import { PLAYER, YOU, canHold, declaredTrait, declaredWithTrait, entitiesOf, entityDescription, entityImage, entityKv, entityName, entityOf, entityTags, give, heldBy, heldCount, holderOf, holding, isUnique, move, parseRef, protagonist, resolveHolder, take, traitOf, withTrait, writeEntity } from '@ifloom/engine'
import type { EntityDef, EntityState, Holder, KindDef, Placement, Select, TraitData, TraitRegistry, TraitSource, TraitTable } from '@ifloom/engine'
import { anyOf, bindCurrent, setTraitState, traitState } from '@ifloom/engine/plugin'
```

## KindDef

A sort of entity the game declares in `kinds`, such as `staff` or `photo`. Every field is in [`KindDef`](/docs/api/engine#kinddef).

A stat declared with [`of`](/docs/reference/stats#of) naming the kind is kept on each of its entities. `plural` is the label for more than one, the `label` if left out. `tags` come before each entity's own, and `traits` are defaults that each entity's own trait of the same id is laid over. `ui` holds [presentation hints](/docs/reference/ui-hints) for each entity, under each entity's own.

Kinds merge by id, the plugins' first, then your content's, then each pack's. A later kind replaces an earlier one, and when it replaces a plugin's kind, the fields it leaves out keep the plugin's. A game can reword the cast's `character` kind without listing every character.

```ts
import type { KindDef } from '@ifloom/engine'

export const kinds: KindDef[] = [
  { id: 'clothing', label: 'Clothing', unique: true, listed: false },
  { id: 'item', label: 'Thing', plural: 'Things', listed: false },
  { id: 'staff', label: 'Member of staff', plural: 'Staff', unique: true, flags: { senior: { stat: 'skill', of: '$', gte: 4 } } },
]
```

### unique

`true` when each entity of the kind is one particular thing, such as a person, a location or a scarf, rather than a sort of thing, such as an apple. Only a unique entity holds things, and a unique thing is held by one holder at a time, with a count of 0 or 1. Things of a kind that isn't unique stack, so the player holds 3 of `'food:apple'`. It's `false` if left out, and the view passes it on as `unique`.

### listed

Whether the view lists the kind's entities: `true`, `false`, or a [condition](/docs/reference/conditions) asked of each entity with `'$'` as that entity. A game's own kinds are listed unless they say otherwise, and a plugin's are not unless the plugin sets `listed`. `false` leaves the kind out of `view.entities` altogether. An entity's own `visible` narrows it further. The cast's `character` kind is listed with `{ 'cast/met': { character: '$' } }`, so a character appears once the player has met them.

Only the view is filtered. `each`, `count`, the `entity` condition and every function on this page see every entity, listed or not. [Entities, things and traits](/docs/explanation/entities-and-traits#the-engine-decides-what-the-view-lists) explains why the engine filters rather than the UI.

### flags

Named conditions the view asks of each listed entity, with `'$'` as that entity. Each entity in `view.entities` gets a `flags` record of the answers, such as `{ senior: true }`, so a UI can split a list without hiding anything more.

## EntityDef

One entity the game declares in `entities`, there from the start of the game until a `remove` takes it out. Every field is in [`EntityDef`](/docs/api/engine#entitydef).

The entity's `id` is unique within its kind, and content names it `'<kind>:<id>'`, an [entity reference](/docs/reference/common#entityref). An id can't be a whole number, because the engine keeps entities in order and JavaScript puts keys that look like whole numbers first. An entity [created](/docs/reference/effects#create) without an id gets the next free number with a `#` in front (`#1`, `#2`), counted per kind in [`state.created`](/docs/reference/state#created) and never given twice.

`name` and `description` are words in place, with [prose tokens](/docs/reference/prose#tokens) filled each time they're read, so `'{{partnerName}}'` shows the name the player typed. `image` goes through [`artSrc`](/docs/reference/prose#artsrc). `stats` are starting values for stats declared `of` its kind, and `kv` is its own [kv store](/docs/reference/glossary#kv) at the start. `at` says who holds it at the start, a [`Placement`](#holder-and-placement). `visible` is a condition asked with `'$'` as the entity, which narrows its kind's [`listed`](#listed).

Entities merge by kind and id, in the order your content lists them, and a pack's entity replaces one with the same kind and id whole. A [plugin](/docs/reference/plugin-views)'s `entities` adds more once the content and packs are merged, after the game's own, and the game's wins over a plugin's with the same kind and id. Only [`loadGame`](/docs/reference/content#loadgame) asks plugins for entities.

```ts
import type { EntityDef } from '@ifloom/engine'

export const staff: EntityDef[] = [
  { id: 'ana', of: 'staff', name: 'Ana', description: 'Has run the kitchen since the day you opened.', stats: { skill: 5, wage: 12 } },
  { id: 'ben', of: 'staff', name: 'Ben', visible: { kv: 'benStarted' } },
  { id: 'apple', of: 'food', name: 'Apple', at: { player: 2, 'place:larder': 6 } },
]
```

## EntityState

What play has changed about one entity, at [`state.entities`](/docs/reference/state#entities) by kind and id. Every field is in [`EntityState`](/docs/api/engine#entitystate).

A declared entity has no record until an effect changes it, and then the record holds only what changed, such as `{ stats: { morale: 52 } }`. An entity created in play has a record from the start, with the name, description, picture, tags, trait data, stats and kv it was given and the entity it was made `like`. Definitions never go into a save, so a fix to a name reaches old saves and a save stays small.

The functions on this page read each value in this order:

- **A stat** reads the record, then the `like` entity, then the declaration's `stats`, then the stat's `start`.
- **A kv key** reads the record, then the declaration's `kv`, then the `like` entity's.
- **The name, description and picture** read the record, then the `like` entity, then the declaration.
- **Tags** are the kind's, the `like` entity's, the declaration's and the record's, each once.
- **A trait's data** is the record's `traitData` laid over the `like` entity's trait, else over the kind's default.

A thing made with `create` and `like`, such as a cake that goes stale, reads whatever it wasn't given from the entity it was made like. A copy reads the pattern as it reads now, so copies that never set a stat of their own follow the pattern's.

```ts fragment
{ create: 'food', like: 'food:cake', with: { stats: { fresh: 3 } }, at: 'you' }
```

## `Holder` and `Placement`

A holder is who has things, and a placement says where a thing starts or is put. Every form is in [`Holder`](/docs/api/engine#holder) and [`Placement`](/docs/api/engine#placement).

A holder is one of three:

- **`'player'`** is the person playing the game, whoever they're playing.
- **A unique entity**, such as `'character:ava'` or `'location:larder'`, holds things while it's in the game.
- **`'you'`** is whoever the player is playing now, `'player'` until a [`you`](/docs/reference/effects#you) effect chooses a protagonist.

A placement is one holder for one of the thing, or a record of how many each holder has, such as `{ player: 2, 'location:larder': 6 }`. A unique thing starts with one holder. Nothing holds itself, however far round, so the gift box can't go into the scarf it holds.

A new game's [`state.held`](/docs/reference/state#held) is empty, and holdings read from each entity's `at` until play changes them. Once an effect writes a count, the save keeps it, 0 included. A thing that was used up stays used up, while a thing an update places for the first time reaches every save that never touched it. Removing a holder with `remove` hands what it held to whoever held it, or removes it too when nobody did.

```ts
import type { Content } from '@ifloom/engine'

export const house: Content = {
  kinds: [{ id: 'gift', label: 'Gift', unique: true }, { id: 'food', label: 'Food' }],
  entities: [
    { id: 'scarf', of: 'gift', name: 'A red scarf', at: 'player' },
    { id: 'box', of: 'gift', name: 'A gift box' },
    { id: 'apple', of: 'food', name: 'Apple', at: 'player' },
  ],
}
```

### PLAYER and YOU

The two reserved holders, `'player'` and `'you'`, as constants for code. Every value is in [`PLAYER`](/docs/api/engine#player) and [`YOU`](/docs/api/engine#you).

A game where the player plays more than one person, such as two siblings taking turns, sets [`state.you`](/docs/reference/state#you) with `{ you: 'character:sam' }` and clears it with `{ you: null }`. While Sam is played, `'you'` as a holder is Sam, and `of: 'you'` in a `stat`, `level` or `kv` condition or effect is Sam. Declare the stats that belong to a body, such as energy, `of` the protagonists' kind and read them `of: 'you'`. `'player'` stays the player, for the money the household shares. A game with one protagonist never runs a `you` effect, so `'you'` and `of: 'you'` mean the player.

## Select

Which entities a `count` condition or an `each` effect looks at, narrowed by kind, holder, tag, trait and condition. Every field is in [`Select`](/docs/api/engine#select).

Each field narrows the set. `at` takes what a holder holds, `tag` matches the kind's tags or the entity's own, and `where` is a condition asked with `'$'` as each entity. With no field, it's every entity in the game. The entities come in the game's order, declared ones as your content lists them, then those created in play. `count` counts distinct things unless it has `units: true`, which adds up how many of each a holder holds, so 2 apples and a scarf are 2 things and 3 units.

`'$'` is the entity being looked at inside an `each` effect's `where` and `effects` and a `count` condition's `where`. The view binds it in the same way for a kind's `listed` and `flags`, an entity's `visible` and the `visible` of a stat declared `of` a kind. Anywhere else `'$'` names nothing, so an effect with it does nothing and a condition with it fails. A nested `each` or `count` binds its own `'$'`, and there is no way to name the outer one. [`bindCurrent`](#bindcurrent) lists the fields where the engine replaces it.

```ts fragment
{ count: { at: 'you', tag: 'fruit' }, gte: 3 }
{ count: { of: 'food', at: 'location:larder' }, units: true, lt: 4 }
{ each: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ remove: '$' }] }
```

## TraitRegistry and TraitData

`TraitRegistry` is the interface each plugin augments with the data of the traits it declares, and `TraitData<K>` is the data trait `K` takes. Every form is in [`TraitRegistry`](/docs/api/engine#traitregistry) and [`TraitData`](/docs/api/engine#traitdata).

`TraitRegistry` is empty in the engine. A trait nobody has added, the game's own included, has `unknown` data. With the data typed, [`traitOf`](#traitof) returns that type and a typo in a field is a type error. The game types its own traits the same way:

```ts
declare module '@ifloom/engine' {
  interface TraitRegistry {
    cosy: boolean
  }
}
```

## TraitTable

Traits by trait id and then entity reference, the type of the `traits` key of [content and packs](/docs/reference/content#traits) and of `game.traits`. Every form is in [`TraitTable`](/docs/api/engine#traittable).

A trait is written on a kind as a default, on an entity, or as a row of this table. [Entities, things and traits](/docs/explanation/entities-and-traits#traits-give-entities-meaning) explains what traits are for. A row wins over the entity's own value, and either is laid over the kind's default. When the default and the value are both objects, they merge field by field. Any other value, such as `true` or a list, replaces the default whole, and a row replaces the entity's own value whole. A mod changes one trait on one entity with one row. On a loaded game, `game.traits` holds every declared entity's traits already worked out.

A trait's id names its owner. `laundry/washable` is the `laundry` plugin's, and an id with no `/`, such as `cosy`, is the game's own. The content checker asks each plugin's trait about its data on every entity that has it, and lets through a trait of a plugin the game doesn't have. A translation's [words table](/docs/reference/words) gives a trait's word fields as `entity.<ref>.traits.<trait>.<field>`, or `kind.<kind>.traits.<trait>.<field>` for a kind's default.

```ts
import type { Content } from '@ifloom/engine'

export const clothes: Content = {
  kinds: [{ id: 'clothing', label: 'Clothing', unique: true, traits: { 'laundry/washable': { temp: 40 }, cosy: true } }],
  entities: [
    { id: 'scarf', of: 'clothing', name: 'Red scarf', traits: { 'laundry/washable': { gentle: true } } },
    { id: 'hat', of: 'clothing', name: 'Bobble hat' },
  ],
  traits: { 'laundry/washable': { 'clothing:hat': { temp: 30, gentle: true } } },
}
```

With this content, `traitOf` reads the scarf's `laundry/washable` as `{ temp: 40, gentle: true }` and the hat's as `{ temp: 30, gentle: true }`.

## State

[`state.entities`](/docs/reference/state#entities) holds each changed entity's [`EntityState`](#entitystate), and [`state.held`](/docs/reference/state#held) the counts play has written, by holder. [`state.created`](/docs/reference/state#created) counts the entities made in play per kind, and [`state.you`](/docs/reference/state#you) is the protagonist. A declared entity is in the game whether or not the save has a record of it, so an entity an update or a mod adds is there the moment an old save loads. A `remove` on a declared entity records it in [`state.removed`](/docs/reference/state#removed), and it stays gone. A `create` that names a removed declared entity's id brings it back and takes it out of `removed`.

## View

`view.held` lists what you hold, the protagonist's things and then the player's, each a [`HeldView`](/docs/api/engine#heldview) with its name, description, picture and count. `view.entities` lists each [listed](#listed) kind with its entities, as [`EntitiesView`](/docs/api/engine#entitiesview), each entity with the stats the player can see and its `flags`. A kind with `listed: false` still shows in `view.held` when you hold one of it, while an entity's `visible` hides it there too. To render them, see [Render what the player holds](/docs/how-to/render/stats-and-things#render-what-the-player-holds).

## Functions

### entitiesOf

Returns every entity of a kind in the game, as references. Every parameter is in [`entitiesOf`](/docs/api/engine#entitiesof).

The declared entities come first, in the order your content lists them and leaving out any removed, then those created in play, in the order they came. It's `[]` for a kind with none, or one the game doesn't declare.

```ts
import { entitiesOf, statValue, type Game, type GameState } from '@ifloom/engine'

export function wages(state: GameState, game: Game): number {
  return entitiesOf(state, game, 'staff').reduce((sum, ref) => sum + statValue(state, game, 'wage', ref), 0)
}
```

### entityOf

Returns the record of what play changed about an entity, `{}` for a declared entity nothing has changed, or `undefined` when it isn't in the game. Every parameter is in [`entityOf`](/docs/api/engine#entityof).

It's `undefined` for an entity removed, never created or not declared, and for a string that isn't `kind:id`, `'$'` included. Use it to ask whether an entity is there, and with [`writeEntity`](#writeentity) to change its record. To read a value, use `statValue`, `entityKv` or `entityName`, which fall back to your content.

```ts given
import { entityOf } from '@ifloom/engine'

entityOf(state, game, 'staff:ana') // {} on a new game
entityOf(state, game, 'staff:cleo') // undefined
```

### entityName

Returns an entity's name as the player reads it, with its tokens filled for this save, or its id when it has no name. Every parameter is in [`entityName`](/docs/api/engine#entityname).

```ts given
import { entityName } from '@ifloom/engine'

entityName(state, game, 'staff:ana') // 'Ana'
```

### entityDescription

Returns an entity's description with its tokens filled, or `undefined` when it has none. Every parameter is in [`entityDescription`](/docs/api/engine#entitydescription). It reads the description the entity was created with, else the `like` entity's, else the declaration's.

### entityKv

Returns an entity's kv store as it reads, the `like` entity's keys and then the declaration's `kv`, with every key play has set laid over them. Every parameter is in [`entityKv`](/docs/api/engine#entitykv). It's `{}` for an entity with none.

### entityTags

Returns an entity's tags, its kind's, then the `like` entity's, then its own, each once. Every parameter is in [`entityTags`](/docs/api/engine#entitytags).

### entityImage

Returns an entity's picture as written, before [`artSrc`](/docs/reference/prose#artsrc), or `undefined`. Every parameter is in [`entityImage`](/docs/api/engine#entityimage). It reads the picture the entity was created with, else the declaration's, else the `like` entity's.

### parseRef

Returns a reference split at its first colon into `{ kind, id }`, or `undefined` when there's no colon or nothing on one side of it. Every parameter is in [`parseRef`](/docs/api/engine#parseref).

```ts
import { parseRef } from '@ifloom/engine'

parseRef('staff:#2') // { kind: 'staff', id: '#2' }
parseRef('$') // undefined
```

### writeEntity

Returns the state with an entity's record set whole, for a plugin's or the game's effect that changes an entity in a way the built-in effects can't. Every parameter is in [`writeEntity`](/docs/api/engine#writeentity).

Whatever the new record leaves out reads from your content again. A reference to no entity adds one after the rest of its kind, and a string that isn't `kind:id` leaves the state unchanged. The function checks nothing, so it doesn't hold a stat to its range. An entity it adds isn't counted in `state.created`, isn't recorded when it's later removed, and counts as one created in play unless the game declares it.

```ts given
import { entityOf, writeEntity } from '@ifloom/engine'

const ana = entityOf(state, game, 'staff:ana')!
const next = writeEntity(state, 'staff:ana', { ...ana, name: 'Ana, head cook' })
```

### traitOf

Returns one trait's data on one entity as play reads it, or `undefined` when the entity doesn't have the trait. Every parameter is in [`traitOf`](/docs/api/engine#traitof).

It works the data out as [`TraitTable`](#traittable) says. For an entity created in play, it's the trait data the `create` gave, laid over the `like` entity's trait or over the kind's default.

```ts given
import { traitOf } from '@ifloom/engine'

traitOf(state, game, 'clothing:hat', 'laundry/washable') // { temp: 30, gentle: true }
```

### declaredTrait

Returns one trait's data on one entity from content alone, for code with no state, such as a plugin's check. Every parameter is in [`declaredTrait`](/docs/api/engine#declaredtrait).

It doesn't know whether the entity is still in the game, nor what a thing created in play was given, and an entity created in play has its kind's default here. Ask [`traitOf`](#traitof) for what play reads.

### withTrait

Returns every entity in the game that has a trait as play reads it, through [`traitOf`](#traitof). Every parameter is in [`withTrait`](/docs/api/engine#withtrait). The declared entities not removed come first, in content order, then those created in play.

### declaredWithTrait

Returns every declared entity that has a trait in content, in content order, as [`declaredTrait`](#declaredtrait) reads it. Every parameter is in [`declaredWithTrait`](/docs/api/engine#declaredwithtrait).

### TraitSource

The kinds, entities and `traits` table that `declaredTrait` and `declaredWithTrait` read. Every field is in [`TraitSource`](/docs/api/engine#traitsource). A loaded [`Game`](/docs/reference/game#game) is one, and so is a [`Content`](/docs/reference/content#content) before it's loaded.

### traitState

Returns one entity's state for a trait that keeps state, such as the uses left in a torch, or where the trait's `state.start` says it begins. Every parameter is in [`traitState`](/docs/api/engine-plugin#traitstate).

It's `undefined` when the entity isn't in the game, doesn't have the trait, or the trait keeps no state. Nothing goes into the save until [`setTraitState`](#settraitstate) writes it. [Plugin views](/docs/reference/plugin-views) describes how a plugin declares a trait with state.

### setTraitState

Returns the state with one entity's state for one trait replaced, kept in its record's `traits`. Every parameter is in [`setTraitState`](/docs/api/engine-plugin#settraitstate). An entity that isn't in the game is left alone. A plugin calls it from its own effects and commands.

```ts
import type { Game, GameState } from '@ifloom/engine'
import { setTraitState, traitState } from '@ifloom/engine/plugin'

export function useTorch(state: GameState, game: Game): GameState {
  const left = traitState<{ uses: number }>(state, game, 'tool:torch', 'kit/lamp')?.uses ?? 0
  return setTraitState(state, game, 'tool:torch', 'kit/lamp', { uses: left - 1 })
}
```

### anyOf

Returns `'<kind>:*'`, a reference that stands for any one entity of a kind, for checking content written with `'$'` before it runs. Every parameter is in [`anyOf`](/docs/api/engine-plugin#anyof).

It isn't a real entity, so `entityOf` finds nothing by it. Bind `'$'` to it with [`bindCurrent`](#bindcurrent) and hand the result to the [content checker](/docs/reference/checks), which then knows whose stats a `{ stat, of: '$' }` names. A plugin's [references](/docs/reference/plugin-checks) do this for its own conditions written per entity.

```ts
import { anyOf, bindCurrent } from '@ifloom/engine/plugin'

export const when = bindCurrent({ stat: 'morale', of: '$', gte: 75 }, anyOf('staff')) // of: 'staff:*'
```

### bindCurrent

Returns a copy of a condition or of effects with every `'$'` set to an entity. Every parameter is in [`bindCurrent`](/docs/api/engine-plugin#bindcurrent).

It replaces `'$'` where it's the value of an `of`, `entity`, `at` or `like` key, the target of a `remove`, `move` or `you` effect, or a `move`'s `from` or `to`, at any depth. It also replaces every `'$'` in a call's arguments and in what a `create` is made `with`, so `{ 'game/payBonus': { of: '$' } }` is called with `args.of` set to each entity in turn. A `'$'` under any other key, such as a kv condition's `is`, stays as it is. A nested `each`'s `effects` and a nested `count`'s `where` keep their own `'$'`, so pass what's inside an `each` or a `count`, not the `each` or `count` itself.

```ts given
import { holds } from '@ifloom/engine'
import { bindCurrent } from '@ifloom/engine/plugin'

holds(state, game, bindCurrent({ stat: 'morale', of: '$', gte: 75 }, 'staff:ana'))
```

### heldCount

Returns how many of a thing a holder holds, `'you'` if the holder is left out. Every parameter is in [`heldCount`](/docs/api/engine#heldcount). It's 0 for a thing held elsewhere or not in the game, and for a holder that can't hold.

```ts given
import { heldCount } from '@ifloom/engine'

heldCount(state, game, 'food:apple') // 2
heldCount(state, game, 'food:apple', 'location:larder') // 6
```

### heldBy

Returns everything a holder holds, `'you'` if left out, with how many of each, in the game's order of its entities. Every parameter is in [`heldBy`](/docs/api/engine#heldby). Things the holder has none of aren't listed.

### holderOf

Returns who holds a thing, or `undefined` when nobody does. Every parameter is in [`holderOf`](/docs/api/engine#holderof). A unique thing has one holder at most. The engine works out a reverse index once for each state and never saves it.

### canHold

Returns whether a holder can hold things now, `'player'` always and a unique entity while it's in the game. Every parameter is in [`canHold`](/docs/api/engine#canhold). It doesn't resolve `'you'`, so pass the holder through [`resolveHolder`](#protagonist-and-resolveholder) first.

### isUnique

Returns whether an entity's kind is [`unique`](#unique). Every parameter is in [`isUnique`](/docs/api/engine#isunique). A plugin asks it to treat a person or a coat differently from a stack of apples, as the [shop plugin](/docs/reference/plugins/shop) does when it sells a unique thing only from the vendor's stock.

### protagonist and resolveHolder

`protagonist` returns who is played now, [`state.you`](/docs/reference/state#you) or `'player'`. `resolveHolder` returns that for `'you'` and any other holder as it is. Every parameter is in [`protagonist`](/docs/api/engine#protagonist) and [`resolveHolder`](/docs/api/engine#resolveholder).

### give, take, move and holding

Return the holding effects and condition, written for you. Every parameter is in [`give`](/docs/api/engine#give), [`take`](/docs/api/engine#take), [`move`](/docs/api/engine#move) and [`holding`](/docs/api/engine#holding).

`give` and `take` change what `'you'` hold by `n`, 1 if left out. `move` writes a [`move`](/docs/reference/effects#move) effect, which moves a unique thing from wherever it is. `holding` asks whether you hold at least `n`. Giving a unique thing to a holder takes it from whoever had it.

```ts
import { give, holding, move, take } from '@ifloom/engine'

export const examples = [
  give('food:apple', 2), // { entity: 'food:apple', by: 2 }
  take('food:apple'), // { entity: 'food:apple', by: -1 }
  move('food:apple', 'location:larder', { by: 1 }),
  move('gift:scarf', 'character:ava'),
  holding('food:apple', 3), // { entity: 'food:apple', at: 'you', gte: 3 }
]
```

## Checks

The [content checker](/docs/reference/checks) and [`loadGame`](/docs/reference/content#checks) report these problems with entities:

| Problem | Cause |
|---|---|
| `an entity id must not be a whole number` | A declared entity's id is a whole number, such as `'7'`. |
| A kind the game doesn't declare | An entity's `of`, a stat's `of`, a `count`, an `each` or a `create` names an undeclared kind. |
| A stat on the wrong owner | An effect or condition names a stat with an `of` whose kind doesn't keep it. |
| A holder that can't hold | An `at`, an `entity` effect or a `move` names a holder the checker can tell isn't the player, `'you'` or a unique entity ([Holders](/docs/reference/checks#checks)). |
| A trait's own problem | A plugin's trait reports its data on an entity ([Traits](/docs/reference/checks#traits)). |

## Caveats

- An effect that can't happen does nothing. Giving to a holder that isn't there, or to an entity whose kind isn't unique, changes nothing, and a `move` moves at most what's there.
- A moving `max` on a stat kept on entities is worked out against the whole state, so it is the same for every entity.
- A declaration's or a `create`'s `stats` aren't held to the range until the next effect moves them.
- An entity the game no longer declares stays in a save that has a record of it, after the declared ones, as if created in play.
