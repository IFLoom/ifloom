---
title: "Entities"
description: "Kinds, entities, traits and receivers, and the functions that read an entity, its traits and what someone owns."
---
An entity is one of a kind of thing a game keeps, such as a member of staff, a dish, a person or a sandwich, and a kind names the sort (`staff`, `dish`, `character`). Your content declares the kinds in `kinds` and the entities there are at the start in `entities`, and the save keeps only what play changes. [Entities, things and traits](/docs/explanation/entities-and-traits) explains kinds, traits and receivers, and [Give the player things to hold and use](/docs/how-to/give-the-player-things) adds things to a game.

The engine keeps no record of who has what. A plugin that keeps things, such as the [inventory](/docs/reference/plugins/inventory) or the [wardrobe](/docs/reference/plugins/wardrobe), is a [receiver](#receivers), and content gives and takes things through it with [`receive`](/docs/reference/effects#receive), [`release`](/docs/reference/effects#release) and [`owned`](/docs/reference/conditions#owned). A game with no such plugin keeps what the player has in [kv keys](/docs/how-to/hand-roll-an-inventory), as a Twine game does.

In the showcase: `examples/showcase/src/world/things.ts`, which declares clothing as a unique kind and food and the newspaper as kinds that stack.

```ts
import { PLAYER, YOU, declaredTrait, declaredWithTrait, entitiesOf, entityDescription, entityImage, entityKv, entityName, entityOf, entityTags, isUnique, ownedCount, parseRef, protagonist, receiversOf, receiveThing, releaseThing, resolveYou, traitOf, withTrait, writeEntity } from '@ifloom/engine'
import type { EntityDef, EntityState, KindDef, Played, Select, Someone, TraitData, TraitRegistry, TraitSource, TraitTable } from '@ifloom/engine'
import { anyOf, bindCurrent, everyEntity, hasEntity, setTraitState, traitState } from '@ifloom/engine/plugin'
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

`true` when each entity of the kind is one particular thing, such as a person, a location or a scarf, rather than a sort of thing, such as an apple. Only a unique entity can be [someone](#someone-and-played): a protagonist the player plays, or who a `receive` gives a thing to. The inventory keeps a unique thing with one holder at a time, with a count of 0 or 1, while things of a kind that isn't unique stack, so the player has 3 of `'food:apple'`. It's `false` if left out, and the view passes it on as `unique`.

### listed

Whether the view lists the kind's entities: `true`, `false`, or a [condition](/docs/reference/conditions) asked of each entity with `'$'` as that entity. A game's own kinds are listed unless they say otherwise, and a plugin's are not unless the plugin sets `listed`. `false` leaves the kind out of `view.entities` altogether. An entity's own `visible` narrows it further. The cast's `character` kind is listed with `{ 'cast/met': { character: '$' } }`, so a character appears once the player has met them.

Only the view is filtered. `each`, `count`, the `entity` condition and every function on this page see every entity, listed or not. [Entities, things and traits](/docs/explanation/entities-and-traits#the-engine-decides-what-the-view-lists) explains why the engine filters rather than the UI.

### flags

Named conditions the view asks of each listed entity, with `'$'` as that entity. Each entity in `view.entities` gets a `flags` record of the answers, such as `{ senior: true }`, so a UI can split a list without hiding anything more.

## EntityDef

One entity the game declares in `entities`, there from the start of the game until a `remove` takes it out. Every field is in [`EntityDef`](/docs/api/engine#entitydef).

The entity's `id` is unique within its kind, and content names it `'<kind>:<id>'`, an [entity reference](/docs/reference/common#entityref). An id can't be a whole number, because the engine keeps entities in order and JavaScript puts keys that look like whole numbers first. An entity [created](/docs/reference/effects#create) without an id gets the next free number with a `#` in front (`#1`, `#2`), counted per kind in [`state.created`](/docs/reference/state#created) and never given twice.

`name` and `description` are words in place, with [prose tokens](/docs/reference/prose#tokens) filled each time they're read, so `'{{partnerName}}'` shows the name the player typed. `image` goes through [`artSrc`](/docs/reference/prose#artsrc). `stats` are starting values for stats declared `of` its kind, and `kv` is its own [kv store](/docs/reference/glossary#kv) at the start. Who has it at the start is a plugin's trait, such as the inventory's `inventory/at`. `visible` is a condition asked with `'$'` as the entity, which narrows its kind's [`listed`](#listed).

Entities merge by kind and id, in the order your content lists them, and a pack's entity replaces one with the same kind and id whole. A [plugin](/docs/reference/plugin-views)'s `entities` adds more once the content and packs are merged, after the game's own, and the game's wins over a plugin's with the same kind and id. Only [`loadGame`](/docs/reference/content#loadgame) asks plugins for entities.

```ts
import type { EntityDef } from '@ifloom/engine'

export const staff: EntityDef[] = [
  { id: 'ana', of: 'staff', name: 'Ana', description: 'Has run the kitchen since the day you opened.', stats: { skill: 5, wage: 12 } },
  { id: 'ben', of: 'staff', name: 'Ben', visible: { kv: 'benStarted' } },
  { id: 'apple', of: 'food', name: 'Apple', traits: { 'inventory/at': { player: 2, 'location:larder': 6 } } },
]
```

## EntityState

What play has changed about one entity, at [`state.entities`](/docs/reference/state#entities) by kind and id. Every field is in [`EntityState`](/docs/api/engine#entitystate).

A declared entity has no record until an effect changes it, and then the record holds only what changed, such as `{ stats: { morale: 52 } }`. An entity created in play has a record from the start, with the name, description, picture, tags, trait data, stats and kv it was given and the entity it was made `like`. Definitions never go into a save, so a fix to a name reaches old saves and a save stays small.

The functions on this page read each value in this order:

- **A stat** reads the record, then the declaration's `stats`, then the `like` entity, then the stat's `start`.
- **A kv key** reads the record, then the declaration's `kv`, then the `like` entity's.
- **The name, description and picture** read the record, then the declaration, then the `like` entity.
- **Tags** are the kind's, the `like` entity's, the declaration's and the record's, each once.
- **A trait's data** is the record's `traitData` laid over the `like` entity's trait, else over the kind's default.

A thing made with `create` and `like`, such as a cake that goes stale, reads whatever it wasn't given from the entity it was made like. A copy reads the pattern as it reads now, so copies that never set a stat of their own follow the pattern's.

```ts fragment
{ create: 'food', like: 'food:cake', with: { stats: { fresh: 3 } }, effects: [{ receive: '$' }] }
```

## `Someone` and `Played`

Someone is a person content names: who a `receive` gives a thing to, who a `release` takes it from, whose things `owned` counts, and whom the player plays. Every form is in [`Someone`](/docs/api/engine#someone) and [`Played`](/docs/api/engine#played).

Someone is one of three:

- **`'player'`** is the person playing the game, whoever they're playing.
- **A unique entity**, such as `'character:ava'`, while it's in the game.
- **`'you'`** is whoever the player is playing now, `'player'` until a [`you`](/docs/reference/effects#you) effect chooses a protagonist.

`Played` is whom the player plays, a protagonist or `'player'`, never `'you'`. The content checker reports a name that can't be someone ([Someone](/docs/reference/checks#someone)).

### PLAYER and YOU

The two reserved names, `'player'` and `'you'`, as constants for code. Every value is in [`PLAYER`](/docs/api/engine#player) and [`YOU`](/docs/api/engine#you).

A game where the player plays more than one person, such as two siblings taking turns, sets [`state.you`](/docs/reference/state#you) with `{ you: 'character:sam' }` and clears it with `{ you: null }`. While Sam is played, `'you'` is Sam, and `of: 'you'` in a `stat`, `level` or `kv` condition or effect is Sam. A receiver gives a thing to the protagonist being played when content leaves out `to`. Declare the stats that belong to a body, such as energy, `of` the protagonists' kind and read them `of: 'you'`. `'player'` stays the player, for the money the household shares. A game with one protagonist never runs a `you` effect, so `'you'` and `of: 'you'` mean the player.

## Receivers

A receiver is a plugin that keeps things, as the [`receive`](/docs/reference/effects#receive) and [`release`](/docs/reference/effects#release) effects and the [`owned`](/docs/reference/conditions#owned) condition ask it. The engine keeps nothing itself: it hands each call to the game's receivers. Every field a plugin gives is in [`Receiver`](/docs/reference/plugin-api#receiver).

- **`receive`** goes to the first receiver that claims the thing, in the order of the game's [`receivers`](/docs/reference/content#gamebase), else of its `plugins`. `via` names one receiver and skips the rest, whether it claims the thing or not. When none claims it, nothing happens beyond the content's own effects.
- **`release`** asks the receivers in the same order until the count is taken, and never takes more than there is.
- **`owned`** is the total across every receiver, so content asks "do they have it" once, whichever plugin keeps the thing.

`to`, `from` and `of` name [someone](#someone-and-played). The engine passes them on without reading them, and each receiver chooses its own default when content leaves one out: the first-party ones use the protagonist being played, else the player. A game with no receiver can still use the effects, but they do nothing, and the checker reports them so a writer who expected an inventory isn't left guessing.

```ts
import type { Content } from '@ifloom/engine'

export const errand: Content = {
  kinds: [{ id: 'food', label: 'Food' }, { id: 'clothing', label: 'Clothing' }],
  entities: [
    { id: 'coffee', of: 'food', name: 'Coffee' },
    { id: 'shirt', of: 'clothing', name: 'A shirt' },
  ],
  scenes: [
    {
      id: 'counter',
      title: 'The counter',
      body: [{ text: 'The barista slides a cup across.' }],
      choices: [
        { id: 'take', label: 'Take the coffee', effects: [{ receive: 'food:coffee' }] },
        { id: 'drink', label: 'Drink it', when: { owned: 'food:coffee' }, effects: [{ release: 'food:coffee' }, { stat: 'energy', by: 10 }] },
      ],
    },
  ],
}
```

## Select

Which entities a `count` condition or an `each` effect looks at, narrowed by kind, tag, trait and condition. Every field is in [`Select`](/docs/api/engine#select).

Each field narrows the set. `tag` matches the kind's tags or the entity's own, and `where` is a condition asked with `'$'` as each entity, so `where: { owned: '$' }` picks the things someone has. With no field, it's every entity in the game. The entities come in the game's order, declared ones as your content lists them, then those created in play. `count` counts distinct things, so 2 apples and a scarf are 2 things. How many of each someone has is [`owned`](/docs/reference/conditions#owned), or a receiver's own value, such as `inventory/count`.

`'$'` is the entity being looked at inside an `each` effect's `where` and `effects` and a `count` condition's `where`. The view binds it in the same way for a kind's `listed` and `flags`, an entity's `visible` and the `visible` of a stat declared `of` a kind. Anywhere else `'$'` names nothing, so an effect with it does nothing and a condition with it fails. A nested `each` or `count` binds its own `'$'`, and there is no way to name the outer one. [`bindCurrent`](#bindcurrent) lists the fields where the engine replaces it.

```ts fragment
{ count: { tag: 'fruit', where: { owned: '$' } }, gte: 3 }
{ count: { of: 'food', where: { owned: '$', of: 'character:ava' } }, lt: 4 }
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

[`state.entities`](/docs/reference/state#entities) holds each changed entity's [`EntityState`](#entitystate). Who has what is in each receiver's own state, under [`state.plugins`](/docs/reference/state#plugins). [`state.created`](/docs/reference/state#created) counts the entities made in play per kind, and [`state.you`](/docs/reference/state#you) is the protagonist. A declared entity is in the game whether or not the save has a record of it, so an entity an update or a mod adds is there the moment an old save loads. A `remove` on a declared entity records it in [`state.removed`](/docs/reference/state#removed), and it stays gone. A `create` that names a removed declared entity's id brings it back and takes it out of `removed`.

## View

`view.entities` lists each [listed](#listed) kind with its entities, as [`EntitiesView`](/docs/api/engine#entitiesview), each entity with the stats the player can see and its `flags`. What the player has is each receiver's own view, such as `view.plugins.inventory`, and a kind with `listed: false` still shows there. To render them, see [Render what the player holds](/docs/how-to/render/stats-and-things#render-what-the-player-holds).

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

It replaces `'$'` where it's the value of an `of`, `entity` or `like` key, the target of a `remove`, `you`, `receive`, `release` or `owned`, or a `receive`'s `to` or a `release`'s `from`, at any depth. It also replaces every `'$'` in a call's arguments and in what a `create` is made `with`, so `{ 'game/payBonus': { of: '$' } }` is called with `args.of` set to each entity in turn. A `'$'` under any other key, such as a kv condition's `is`, stays as it is. A nested `each`'s `effects`, a nested `count`'s `where` and a nested `create`'s `effects` keep their own `'$'`, so pass what's inside them, not the `each`, `count` or `create` itself.

```ts given
import { holds } from '@ifloom/engine'
import { bindCurrent } from '@ifloom/engine/plugin'

holds(state, game, bindCurrent({ stat: 'morale', of: '$', gte: 75 }, 'staff:ana'))
```

### everyEntity and hasEntity

`everyEntity` returns every entity in the game, declared ones in content order and then those made in play. `hasEntity` returns whether one is in the game now. Every parameter is in [`everyEntity`](/docs/api/engine-plugin#everyentity) and [`hasEntity`](/docs/api/engine-plugin#hasentity). A plugin that keeps things asks them to forget things removed in play.

### isUnique

Returns whether an entity's kind is [`unique`](#unique). Every parameter is in [`isUnique`](/docs/api/engine#isunique). A plugin asks it to treat a person or a coat differently from a stack of apples, as the inventory does when it keeps a unique thing with one holder.

### protagonist and resolveYou

`protagonist` returns who is played now, [`state.you`](/docs/reference/state#you) or `'player'`. `resolveYou` returns that for `'you'` and any other name as it is. Every parameter is in [`protagonist`](/docs/api/engine#protagonist) and [`resolveYou`](/docs/api/engine#resolveyou).

### receiveThing, releaseThing and ownedCount

Do what the [`receive`](/docs/reference/effects#receive) and [`release`](/docs/reference/effects#release) effects and the [`owned`](/docs/reference/conditions#owned) condition do, for code. `receiversOf` returns the game's receivers in the order `receive` asks them. Every parameter is in [`receiveThing`](/docs/api/engine#receivething), [`releaseThing`](/docs/api/engine#releasething), [`ownedCount`](/docs/api/engine#ownedcount) and [`receiversOf`](/docs/api/engine#receiversof).

A plugin that moves things between receivers without naming them, such as the wardrobe putting a shirt away, calls these with `via`.

```ts given
import { ownedCount, receiveThing, releaseThing } from '@ifloom/engine'

const more = receiveThing(state, game, 'food:apple', 2)
const less = releaseThing(more, game, 'food:apple', 1)
ownedCount(less, game, 'food:apple') // 1, with a receiver in the game
```

## Checks

The [content checker](/docs/reference/checks) and [`loadGame`](/docs/reference/content#checks) report these problems with entities:

| Problem | Cause |
|---|---|
| `an entity id must not be a whole number` | A declared entity's id is a whole number, such as `'7'`. |
| A kind the game doesn't declare | An entity's `of`, a stat's `of`, a `count`, an `each` or a `create` names an undeclared kind. |
| A stat on the wrong owner | An effect or condition names a stat with an `of` whose kind doesn't keep it. |
| Someone who can't be | A `receive`'s `to`, a `release`'s `from` or an `owned`'s `of` names someone the checker can tell isn't the player, `'you'` or a unique entity ([Someone](/docs/reference/checks#someone)). |
| No receiver | A `receive`, `release` or `owned` in a game with no plugin that keeps things ([Receivers](/docs/reference/checks#receivers)). |
| A trait's own problem | A plugin's trait reports its data on an entity ([Traits](/docs/reference/checks#traits)). |

## Caveats

- An effect that can't happen does nothing. A `receive` no receiver claims changes nothing, and a `release` takes at most what's there.
- A moving `max` on a stat kept on entities is worked out against the whole state, so it is the same for every entity.
- A declaration's or a `create`'s `stats` aren't held to the range until the next effect moves them.
- An entity the game no longer declares stays in a save that has a record of it, after the declared ones, as if created in play.

The [`create`](/docs/reference/effects#create), [`remove`](/docs/reference/effects#remove) and [`each`](/docs/reference/effects#each) effects change entities, [`receive`](/docs/reference/effects#receive) and [`release`](/docs/reference/effects#release) hand them to receivers, and the [`entity`](/docs/reference/conditions#entity), [`count`](/docs/reference/conditions#count) and [`owned`](/docs/reference/conditions#owned) conditions ask about them.
