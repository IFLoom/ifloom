---
title: "Entities"
description: "Kinds and entities: the things a game keeps, such as staff, dishes, apples, notes or photos, each with its own stats and kv store, declared in content, created and removed in play, held by the player or by someone, and listed in the view when you say."
---
Use entities for the things your game keeps: what the player carries, the notes and photos they collect, and anything there are several of with numbers of their own. A café might have staff, each with a skill and a wage, and dishes on its menu, each with a price. A kind names such a thing (`staff`, `dish`, `photo`) and an entity is one of them (Ana, the soup, the photo of the pier). A [stat](/docs/reference/stats) declared with `of: 'staff'` is kept on every member of staff rather than on the player.

The game declares its kinds and the entities that exist at the start. In play, you can:

- [`create`](/docs/reference/effects#create) more entities and [`remove`](/docs/reference/effects#remove) them with effects
- run the same effects over every entity of a kind with [`each`](/docs/reference/effects#each)
- ask how many there are, or whether one is there, with the [`{ count }`](/docs/reference/conditions#count) and [`{ entity }`](/docs/reference/conditions#entity) conditions
- give things to the player or to someone, and move them between holders, with the [`entity`](/docs/reference/effects#entity) and [`move`](/docs/reference/effects#move) effects (see [Holding things](#holding-things))

What an entity is (its name, description, picture, tags and where its numbers start) lives in your content. The save only keeps what play has changed, so a name you fix in an update shows in every old save too. The [view](/docs/reference/view#entities) hands the UI the kinds and entities you say are [listed](#listing), with the stats the player can see on each. For a whole game built on entities, see the management game in [Shapes of game](/docs/guide/shapes#a-management-game-the-corner-café).

```ts
import {
  PLAYER,
  YOU,
  anyOf,
  bindCurrent,
  canHold,
  entitiesOf,
  entityDesc,
  entityImage,
  entityKv,
  entityName,
  entityOf,
  entityTags,
  entityTrait,
  everyEntity,
  give,
  heldBy,
  heldCount,
  heldTotal,
  holderOf,
  holdersOf,
  holding,
  isUnique,
  kindById,
  move,
  ownerOf,
  parseRef,
  protagonist,
  resolveHolder,
  take,
  writeEntity,
  type CreatedEntity,
  type EntityDef,
  type EntityRef,
  type EntityState,
  type Holder,
  type KindDef,
  type Placement,
  type Select,
} from '@ifloom/engine'
```

## A worked example

The Corner Café (`examples/cafe` in the IFLoom repository) keeps staff and dishes. The player has coins and a reputation. Each member of staff has a skill, a morale and a wage, and each dish has a price and a quality.

```ts
import type { Content } from '@ifloom/engine'

const corner: Content = {
  kinds: [{ id: 'staff', label: 'Member of staff', plural: 'Staff', unique: true }, { id: 'dish', label: 'Dish', plural: 'Menu' }],
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
    { id: 'ana', of: 'staff', name: 'Ana', desc: 'Has run the kitchen since the day you opened.', stats: { skill: 5, wage: 12 } },
    { id: 'toast', of: 'dish', name: 'Cheese on toast', desc: 'Thick bread, sharp cheddar.', stats: { price: 4, quality: 2 } },
    { id: 'soup', of: 'dish', name: 'Soup of the day', desc: 'Whatever the market had.', stats: { price: 6, quality: 3 } },
  ],
  // ...
}
```

A new game has the player's stats in `state.stats`. `state.entities` starts empty, because nothing about Ana or the dishes has changed yet. Read them through the functions below, which look at the save first and then at your content:

```ts
import { entitiesOf, entityName, startingState, statValue } from '@ifloom/engine'

const state = startingState(game)
state.stats                                // { coins: 120, reputation: 20 }
state.entities                             // {}
entitiesOf(state, game, 'staff')           // ['staff:ana']
entityName(state, game, 'staff:ana')       // 'Ana'
statValue(state, game, 'morale', 'staff:ana') // 60, the stat's start
statValue(state, game, 'skill', 'staff:ana')  // 5, from her declaration
```

Content names her `'staff:ana'`:

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
  unique?: boolean
  listed?: boolean | Condition
  tags?: string[]
  flags?: Record<string, Condition>
  traits?: Record<string, unknown>
  ui?: Ui<EntityUi>
}
```

| Field | Default | What it does |
|---|---|---|
| `id` | | The name stats, entities, effects and conditions use for the kind, as in `of: 'staff'` or `{ count: 'staff' }`. |
| `label` | | What the player reads for one, such as "Member of staff". |
| `plural` | `label` | What the player reads for more than one, such as "Staff". The [React UI](/docs/react/components#entitytable) heads each kind's table with it. |
| `unique` | `false` | Each entity of the kind is one particular thing, such as a person or a scarf, rather than a sort of thing, such as an apple. Only unique entities [hold things](#holding-things), and a unique thing is in one place at a time. Things of a kind that isn't unique stack: the player holds 3 of `'food:apple'`. The cast's characters are unique. The view passes it on as [`unique`](/docs/reference/view#entitiesview-and-entityview). |
| `listed` | `true` for your kinds, `false` for a plugin's | Whether the view lists the kind's entities. `false` leaves the kind out of the view altogether. A condition is asked for each entity, with `'$'` as that one. See [Listing](#listing). |
| `tags` | `[]` | Words every entity of the kind has, before its own [`tags`](#entitydef). |
| `flags` | `{}` | Named true/false conditions asked for each listed entity, with `'$'` as that one. The view gives each entity a `flags` record of the answers, so a UI can split a list without hiding anything. See [Listing](#listing). |
| `traits` | `{}` | [Traits](#traits) every entity of the kind has, by trait id. They're defaults: an entity's own trait of the same id is laid over them. |
| `ui` | none | [Presentation hints](/docs/reference/ui-hints) for each of its entities, under each one's own, such as the React UI's [`hue`](/docs/react/hints#hue). The engine carries them to the view as written. |

Kinds go in [`Game.kinds`](/docs/reference/game#game). You can declare them on the base you give [`loadGame`](/docs/reference/loader#loadgame), in your [content](/docs/reference/loader#content)'s `kinds`, or both, and a [plugin](/docs/reference/plugins#kinds-and-entities) can bring its own `kinds`. They merge by id, the plugins' first, then the base's, then each pack's. A later kind replaces an earlier one with the same id. When it replaces a plugin's kind, the fields it leaves out keep the plugin's, so a game can reword the cast's kind without listing every character.

## EntityDef

```ts
type EntityDef = {
  id: string
  of: string
  name: string
  desc?: string
  image?: string
  tags?: string[]
  visible?: Condition
  stats?: Record<string, number>
  kv?: Record<string, KvValue>
  at?: Placement
  traits?: Record<string, unknown>
  ui?: Ui<EntityUi>
}
```

One entity that exists from the start of the game, and stays until a [`remove`](/docs/reference/effects#remove) takes it out.

| Field | What it does |
|---|---|
| `id` | Unique within its kind. Two kinds may each have an entity with the same id. It can't be a whole number, so the loader refuses `'7'` (see [Ids](#ids)). |
| `of` | Its kind's id. |
| `name` | What the player reads, such as "Ana". [Prose tokens](/docs/reference/prose#tokens) are filled in each time it's read, so `'{{partnerName}}'` shows the name the player typed. |
| `desc` | A line or two about it, filled in the same way. |
| `image` | Its picture, through [`artSrc`](/docs/reference/prose#artsrc). The [content checker](/docs/reference/checks) lists the file. |
| `tags` | Words a UI or a plugin can sort or pick it by. They come after its kind's tags. |
| `visible` | Whether the view lists it, asked with `'$'` as it. Always, if left out. It narrows its kind's [`listed`](#listing), and changes nothing else: `each`, `count` and the rest still see it. |
| `stats` | Starting values for any of its stats that differ from each stat's `start`. Only stats declared `of` its kind. |
| `kv` | Its own [kv store](/docs/reference/state#kv) at the start. Read a key with `{ kv, of }` and set it with the `kv` effect's `of`. |
| `at` | Who holds it at the start: `'player'` or a unique entity for one of it, or how many each holds, such as `{ player: 2, 'place:larder': 6 }`. Held by nobody if left out. A unique thing starts in one place. See [Holding things](#holding-things). |
| `traits` | Its [traits](#traits), by trait id, such as `{ 'laundry/washable': { temp: 30 } }`. |
| `ui` | Its [presentation hints](/docs/reference/ui-hints), laid over its kind's field by field and carried to the view as written (see [`entityUi`](/docs/reference/ui-hints#entityui)). |

Entities go in [`Game.entities`](/docs/reference/game#game), on the base or in your content. They merge by kind and id (`'staff:ana'`), the base's first. A pack's entity replaces one with the same kind and id, whole.

A [plugin](/docs/reference/plugins#kinds-and-entities)'s `entities` adds more, made from its content once the content and packs are merged. If the game declares one itself with the same kind and id, the game's wins, whole. The rest come after the game's own, and the loader checks them like any declared entity. Only [`loadGame`](/docs/reference/loader#loadgame) asks plugins for entities, so a game built by hand lists them in `game.entities` itself.

## EntityState

```ts
type EntityState = {
  name?: string
  desc?: string
  image?: string
  like?: EntityRef
  tags?: string[]
  traitData?: Record<string, unknown>
  stats?: Stats
  kv?: Record<string, KvValue>
  traits?: Record<string, unknown>
}
```

What play has changed about one entity, at [`state.entities[kind][id]`](/docs/reference/state#entities). A declared entity has no record until an effect changes it, and then only what changed is there: `{ stats: { morale: 52 } }` after Ana's first week. Everything else is read from your content. An entity [created](/docs/reference/effects#create) in play has a record from the start, with what it was given: a `name`, a `desc` and an `image`, the entity it was made `like`, its own `tags`, its trait data (`traitData`), stats and kv.

Reads fall back in this order:

- **A stat:** the record, then the entity it was made [like](#things-made-like-another), then the declaration's `stats`, then the stat's `start`. [`statValue`](/docs/reference/stats#statvalue) does this.
- **A kv key:** the record, then the declaration's `kv`, then the `like`'s. See [`entityKv`](#entitykv).
- **The name:** the record's `name` (one created in play), then the `like`'s, then the declaration's, always with its tokens filled. See [`entityName`](#entityname).
- **The description and picture:** the record's (one created in play), then the `like`'s, then the declaration's. See [`entityDesc`](#entitydesc) and [`entityImage`](#entityimage).
- **Tags:** the kind's, the `like`'s, the declaration's and the record's, each once.
- **A trait's data:** the record's `traitData` laid over the `like`'s, else over the kind's default. See [`entityTrait`](#entitytrait).
- **A trait's state:** the record's `traits`, for the rare [trait](#traits) that keeps state, then where the trait says it starts. See [`traitState`](#traitstate).

Definitions never go into a save. That's why a fix to a name or a starting value reaches old saves, and why a save stays small however many entities the game declares.

## EntityRef

```ts
type EntityRef = string
```

Names an entity in content, as its kind, a colon and its id: `'staff:ana'` or `'staff:#2'`.

**`'$'` is the current one.** Inside an [`each`](/docs/reference/effects#each) effect's `where` and `effects`, and inside a [`{ count }`](/docs/reference/conditions#count) condition's `where`, `of: '$'` means the entity being looked at, one after another. The same goes for a kind's `listed` and `flags`, an entity's `visible` and the `visible` of a stat declared `of` a kind, which the [view](/docs/reference/view#entitiesview-and-entityview) asks for each entity. Anywhere else, `'$'` names nothing, so an effect with it does nothing and a `{ stat }` condition with it fails.

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

**Where `'$'` is replaced.** It's replaced where it's the value of an `of`, `entity`, `at` or `like` key, or a `move`'s `from` or `to`, at any depth, and anywhere in a plugin or custom call's arguments. That's how a custom function or a plugin learns which entity it's working on. `{ custom: 'payBonus', with: { of: '$' } }` is called with `args.of` set to `'staff:ana'`, then `'staff:#1'`, and so on, and the cast lists a character once `{ 'cast/met': { character: '$' } }` holds for them. A `'$'` under any other key, such as a kv condition's `is`, is left as it is.

## Traits

A trait is a named piece of data an entity carries, such as "wash this at 30 degrees". The engine doesn't know what any trait means. A [plugin](/docs/reference/plugins#traits) declares the traits it reads and gives them meaning, and your game can keep traits of its own. Stats and kv stay as they are: a trait is for what an entity *is*, written in content, never for what changes in play.

A trait's id says whose it is. `laundry/washable` belongs to a plugin called `laundry`, and an id with no `/`, such as `cosy`, is your game's own, for your [custom functions](/docs/reference/custom) to read. The first-party plugins' traits are the [cast](/docs/plugins/cast#person-1)'s `cast/person` (who a character is: their schedule, talk and call), the [wardrobe](/docs/plugins/wardrobe#the-wearable-trait)'s `wardrobe/wearable`, the [inventory](/docs/plugins/inventory#usable)'s `inventory/usable` and the [shop](/docs/plugins/shop#the-sellable-trait)'s `shop/sellable`.

You can write a trait in three places:

```ts
import type { Content } from '@ifloom/engine'

export const clothes: Content = {
  // On a kind: a default for every entity of it.
  kinds: [{ id: 'clothing', label: 'Clothing', traits: { 'laundry/washable': { temp: 40 }, cosy: true } }],
  entities: [
    // On an entity.
    { id: 'scarf', of: 'clothing', name: 'Red scarf', traits: { 'laundry/washable': { gentle: true } } },
    { id: 'coat', of: 'clothing', name: 'Winter coat', traits: { 'laundry/washable': { temp: 30 }, cosy: false } },
    { id: 'hat', of: 'clothing', name: 'Bobble hat' },
  ],
  // In the `traits` table, by trait and then entity.
  traits: { 'laundry/washable': { 'clothing:hat': { temp: 30, gentle: true } } },
}
```

```ts
import { traitOf, withTrait } from '@ifloom/engine'

traitOf(game, 'clothing:scarf', 'laundry/washable')   // { temp: 40, gentle: true }
traitOf(game, 'clothing:hat', 'laundry/washable')     // { temp: 30, gentle: true }
traitOf(game, 'clothing:coat', 'cosy')                // false
withTrait(game, 'laundry/washable')                   // ['clothing:scarf', 'clothing:coat', 'clothing:hat']
```

**Which one wins.** A row in the `traits` table wins over the entity's own, and either is laid over the kind's default. When both the default and the entity's value are objects, they're merged field by field, so the scarf keeps the kind's `temp`. Anything else, such as `true` or a list, is replaced whole. A row replaces the entity's own value whole too, though it still gets the kind's default under it.

**What the table is for.** It gives an entity a trait without writing the entity out again, so a [mod](/docs/reference/mods) can change how the hat is washed with one row. In your own content, each row is declared once, like everything else (see [One key declared twice](/docs/reference/loader#one-key-declared-twice)). A pack's row replaces an earlier one. See [the `traits` key](/docs/reference/loader#traits).

**Typed by the plugin.** A plugin that declares a trait adds its data's type to the engine's `Traits` interface, so `traitOf` returns that type and a typo in a field is a type error. See [Declaring traits](/docs/reference/plugins#traits).

**Checked by the plugin.** The [content checker](/docs/reference/checks#traits) asks each plugin's trait about the data on every entity that has it. A trait of a plugin the game doesn't have is let through, as content for a [cooperating](/docs/reference/plugins#cooperates) plugin is.

### Traits and TraitData

```ts
interface Traits {}
type TraitData<K extends string> = K extends keyof Traits ? Traits[K] : unknown
```

`Traits` is empty in the engine. Each plugin adds its own traits to it with a `declare module` block, and `TraitData<'laundry/washable'>` is then the data that trait takes. A trait nobody has added, your game's own included, is `unknown`. To type your own, add them the same way:

```ts
declare module '@ifloom/engine' {
  interface Traits {
    cosy: boolean
  }
}
```

### TraitTable

```ts
type TraitTable = Record<string, Record<EntityRef, unknown>>   // typed by Traits for the ids it knows
```

Traits by trait id and then entity reference. It's the type of the `traits` key in [content and packs](/docs/reference/loader#traits), and of [`game.traits`](/docs/reference/game#game). On a game [`loadGame`](/docs/reference/loader#loadgame) returns, `game.traits` holds every declared entity's traits already worked out, so a tool can read them as plain data.

## Ids

An entity the game declares has the id you give it. One [created](/docs/reference/effects#create) without an id gets the next free number with a `#` in front (`#1`, `#2`), counted per kind in [`state.created`](/docs/reference/state#created). A number is never given twice, even after the entity that had it is removed, so a reference saved in a kv key never comes to mean someone else.

**Why the `#`.** Entities keep their order: declared ones as your content lists them, then created ones in the order they came. The created ones' records are kept in an object, and JavaScript always puts keys that look like whole numbers first, in numeric order. The `#` avoids that, and the loader reports `an entity id must not be a whole number` for a declared one so the rule is the same for both.

## Listing

The view only lists what you say it may, so a UI can't give anything away by drawing everything it's handed. Two fields decide it:

- **A kind's `listed`.** `true` lists every entity of the kind, and `false` leaves the kind out of the view. A condition is asked for each entity, with `'$'` as that one. Your own kinds are listed unless they say otherwise. A plugin's kinds aren't, unless the plugin sets `listed`.
- **An entity's `visible`.** A condition that narrows it further, for one entity.

```ts
import type { Content } from '@ifloom/engine'

const kitchen: Content = {
  kinds: [
    { id: 'staff', label: 'Member of staff', plural: 'Staff' },
    // A dish is on the list once it's on the menu.
    { id: 'dish', label: 'Dish', plural: 'Menu', listed: { kv: 'onMenu', of: '$' } },
    // Kept for the game's own sums, never shown.
    { id: 'supplier', label: 'Supplier', listed: false },
  ],
  entities: [
    { id: 'ana', of: 'staff', name: 'Ana' },
    // Not on the staff list until the story brings him in.
    { id: 'ben', of: 'staff', name: 'Ben', visible: { kv: 'benStarted' } },
    { id: 'soup', of: 'dish', name: 'Soup of the day', kv: { onMenu: true } },
  ],
}
```

The [cast plugin](/docs/plugins/cast)'s `character` kind is listed with `{ 'cast/met': { character: '$' } }`, so a character appears once the player has met them.

To split a list rather than shorten it, give the kind `flags`. Each is a condition asked for every listed entity, and the view hands the answers over as the entity's `flags`:

```ts
{ id: 'staff', label: 'Member of staff', plural: 'Staff', flags: { senior: { stat: 'skill', of: '$', gte: 4 } } }

view(state, game).entities.staff.entries.map((entry) => [entry.name, entry.flags.senior])   // [['Ana', true], ['Ben', false]]
```

**Gotchas.**
- **Only the view is filtered.** `each`, `count`, `{ entity }` and the functions below see every entity in the game, listed or not.
- **Don't hide things in the UI instead.** Anything in the view can end up on screen, in a text UI or in a tool. Say what's hidden here, and every UI keeps it hidden.

## Holding things

Things are held: an apple in the player's pocket, a scarf in a gift box, six apples in the larder. Any entity can be held. Holders are:

- **`'player'`**, the person playing the game. What the player holds stays theirs whoever they're playing.
- **A unique entity**, such as `'character:ava'` or `'place:larder'`. Only entities of a [`unique`](#kinddef) kind hold things. The [cast](/docs/plugins/cast#each-one-is-an-entity)'s characters are unique, and so is every place of the [places plugin](/docs/plugins/places#each-place-is-an-entity), as `'location:<id>'`, so a thing can lie in a room.
- **`'you'`**, whoever the player is playing now. In a game with one protagonist that's always `'player'`. See [Protagonists](#protagonists-you-and-player).

A kind that isn't unique stacks, so the player holds a count of `'food:apple'` rather than separate apples. A unique thing is one particular thing, so it's held once, by one holder at most. Nothing holds itself, however far round: the box can't go into the scarf it holds.

```ts
import type { Content } from '@ifloom/engine'

export const house: Content = {
  kinds: [
    { id: 'place', label: 'Place', unique: true },
    { id: 'food', label: 'Food' },
    { id: 'gift', label: 'Gift', unique: true },
  ],
  entities: [
    { id: 'larder', of: 'place', name: 'The larder' },
    { id: 'apple', of: 'food', name: 'Apple', at: { player: 2, 'place:larder': 6 } },
    { id: 'scarf', of: 'gift', name: 'A red scarf', at: 'player' },
    { id: 'box', of: 'gift', name: 'A gift box' },
  ],
}
```

In play, content changes and asks about holdings with these helpers, or the effects and conditions they write:

```ts
import { give, holding, move, take } from '@ifloom/engine'

give('food:apple', 2)                           // { kind: 'entity', entity: 'food:apple', by: 2 }: two more for you
take('food:apple')                              // { kind: 'entity', entity: 'food:apple', by: -1 }
move('food:apple', 'place:larder', { by: 1 })   // one back in the larder
move('gift:scarf', 'character:ava')             // a unique thing moves from wherever it is
holding('food:apple', 3)                        // { entity: 'food:apple', at: 'you', gte: 3 }
```

The effects are [`entity`](/docs/reference/effects#entity) and [`move`](/docs/reference/effects#move), and the conditions [`{ entity, at }`](/docs/reference/conditions#entity) and [`{ count }`](/docs/reference/conditions#count). [`each`](/docs/reference/effects#each) can run over what a holder holds, and [`create`](/docs/reference/effects#create) can give what it makes to a holder. The view's [`held`](/docs/reference/view#held) is what you hold, ready to draw.

**Where things start.** An entity's [`at`](#entitydef) says who holds it at the start. A new game's [`state.held`](/docs/reference/state#held) is empty: holdings are read from your content until play changes them, as stats are. Once an effect writes a count, the save keeps it, 0 included. So a thing that was placed and then used up stays used up, while a thing an update places for the first time reaches every old save that never touched it.

**When a holder goes.** Removing an entity with [`remove`](/docs/reference/effects#remove) hands what it held to whoever held it. Remove the gift box while the player holds it, and the scarf in it goes to the player. If nobody held the box, what it held goes with it.

**Gotchas.**
- **An effect that can't happen does nothing.** Giving to a holder that isn't there, or to an entity whose kind isn't unique, changes nothing. A `move` moves at most what's there. The [content checker](/docs/reference/checks#holders) reports the holders it can tell are wrong.
- **Giving a unique thing takes it.** `{ kind: 'entity', entity: 'gift:scarf', at: 'character:ava', to: 1 }` takes the scarf from whoever had it. A unique thing's count is 0 or 1.
- **Holding isn't listing.** A kind with `listed: false` still shows in [`view.held`](/docs/reference/view#held) when you hold one of it. An entity's `visible` does hide it there too.

### Notes, photos and other things made in play

Things the player collects, such as a note under the door or the photos they take, are entities too. A note the story knows about is declared, and given when the player finds it. A photo the player takes is made in play with [`create`](/docs/reference/effects#create), with its own name, description and picture:

```ts
import { give, type Content } from '@ifloom/engine'

export const notes: Content = {
  kinds: [
    { id: 'note', label: 'Note', plural: 'Notes', listed: false },
    { id: 'photo', label: 'Photo', plural: 'Photos', listed: false },
  ],
  entities: [{ id: 'welcome', of: 'note', name: 'Welcome note', desc: 'Bins go out Thursday. — Sam, flat 2' }],
  triggers: [{ id: 'welcome', when: { seen: 'street' }, effects: [give('note:welcome')] }],
  activities: [
    {
      id: 'photo-pier',
      effects: [{ kind: 'create', of: 'photo', entity: { id: 'pier', name: 'The pier', desc: 'Gulls, and the end of the pier.', image: 'photo/pier.jpg' }, at: 'player' }],
    },
  ],
}
```

They're held, so they're in [`view.held`](/docs/reference/view#held), and you ask about them as about anything held:

```ts
{ entity: 'note:welcome', at: 'player' }          // the note is in the player's hands
{ count: { of: 'photo', at: 'player' }, gte: 3 }  // three photos taken
```

A UI lists them by kind. The [devices plugin](/docs/plugins/devices#section)'s `things` section lists the things of a kind you hold, newest first, so the [phone](/docs/plugins/phone)'s gallery is the `photo` things you hold and a notes app is `{ things: { of: 'note' } }`. To leave them out of the inventory card, list the kinds the inventory shows in its [`data.inventory.kinds`](/docs/plugins/inventory).

### Protagonists: you and player

A game where the player plays more than one person, such as two siblings taking turns, switches who `'you'` is with the [`you`](/docs/reference/effects#you) effect:

```ts
{ kind: 'you', to: 'character:sam' }   // play as Sam
{ kind: 'you', to: null }              // back to the player
```

The protagonist is a unique entity, kept in [`state.you`](/docs/reference/state#you). While Sam is played:

- `'you'` as a holder is Sam, so `give`, `take` and `holding` work on what Sam holds.
- `of: 'you'` in a [`stat`](/docs/reference/conditions#stat), `level` or [`kv`](/docs/reference/conditions#kv) condition or effect is Sam. Declare the stats that belong to a body, such as energy, `of` the protagonists' kind, and read them `of: 'you'`.
- `'player'` is still the player: the money the household shares, say, or a phone that survives the switch.

A game with one protagonist never runs a `you` effect, and `'you'` and `of: 'you'` then mean the player.

### Things made like another

A thing with state of its own, such as a cake that goes stale, is made in play with [`create`](/docs/reference/effects#create) and `like`. It reads whatever it isn't given (its name, description, picture, tags, stats, kv and traits) from the entity it was made like, so the save keeps only a reference:

```ts
{ kind: 'create', like: 'food:cake', at: 'you', entity: { stats: { fresh: 3 } } }
```

The new entity is a `food` named "Cake", held by you, with a `fresh` of its own. Make things like a declared entity you keep as a pattern, held by nobody. A copy reads the pattern as it reads now, so if play changes the pattern's stats, copies that never set their own follow it.

### Counting

`{ count }` counts distinct things by default: 2 apples and a scarf are 2 things. Add `units: true` to add up how many of each are held instead, 3 here. A [`Select`](#select) picks what's counted:

```ts
{ count: 'staff', gte: 2 }                                          // two members of staff: a kind, the short form
{ count: { at: 'you', tag: 'fruit' }, gte: 3 }                      // three sorts of fruit on you
{ count: { of: 'food', at: 'place:larder' }, units: true, lt: 4 }   // the larder is running low
```

### Select

```ts
type Select = { of?: string; at?: string; tag?: string; trait?: string; where?: Condition }
```

Which entities a [`count`](/docs/reference/conditions#count) or an [`each`](/docs/reference/effects#each) looks at. Each field narrows it:

| Field | What it picks |
|---|---|
| `of` | Entities of a kind. |
| `at` | What a holder holds: `'you'`, `'player'` or a unique entity. |
| `tag` | Entities with a tag, their kind's or their own. |
| `trait` | Entities with a [trait](#traits), by id. |
| `where` | Entities a condition holds for, with `'$'` as each one. |

With none of them, it's every entity in the game. Either way they come in the game's order: declared entities as your content lists them, then those created in play.

## Entities in old saves

A declared entity is in the game unless it was removed, whether or not a save has a record of it. So when an update writes Ben into the café, or the player turns on a mod that adds staff, Ben is there in every old save the moment it loads. Nothing has to fill him in.

The exception is an entity that left in play. A [`remove`](/docs/reference/effects#remove) effect on a declared entity records it in [`state.removed`](/docs/reference/state#removed), and it stays gone. If Ben quit, he doesn't come back. An entity created in play isn't recorded there: once its record goes, nothing would bring it back.

```ts
import { applyEffects, entitiesOf } from '@ifloom/engine'

entitiesOf(save, game, 'staff')   // ['staff:ana', 'staff:ben']: Ben is there, record or not

const left = applyEffects(save, game, [{ kind: 'remove', entity: 'staff:ben' }])
left.removed                      // ['staff:ben']
entitiesOf(left, game, 'staff')   // ['staff:ana']: he stays gone
```

Saves made before version 16 kept the player's items and the game's collections apart from entities. When one loads, each item's count is held by the player as the entity it became (`item:<id>`, or the one entity your game declares with that id), and each collection entry becomes a thing made in play and held by the player: of a kind named after the collection (the phone's `gallery` is `photo`), with its title as its name, its prose as its description, its picture and its data as kv. See the [15 → 16 step](/docs/reference/saves#the-engines-steps).

Saves made before version 15 copied every declared entity's name and starting numbers into the save. When one loads, [`loadState`](/docs/reference/saves#loadstate) drops a declared entity's copied name, and every stat and kv key equal to where it starts, so they read from your content again. A record with nothing left goes.

**Gotchas.**
- **Taken on again.** A `create` that names a removed declared entity's id brings it back and takes it out of `removed`. Its record keeps the name the `create` gave, and the rest reads from its declaration. Removing it again records it once.
- **Saves from before version 7 recorded no removals.** Their `removed` starts empty, so a declared entity removed in such a save is back. See the [6 → 7 step](/docs/reference/saves#the-engines-steps).
- **A dropped declaration.** An entity the game no longer declares stays in a save that has a record of it, and comes after the declared ones, like one created in play. One with no record is simply gone.

## Functions

The effects, conditions and view use these. A [custom function](/docs/reference/custom) or a [plugin](/docs/reference/plugins) can call them directly.

### entitiesOf

```ts
function entitiesOf(state: GameState, game: Game | undefined, kind: string): EntityRef[]
```

Every entity of a kind in the game, as references: the declared ones in the order your content lists them, leaving out any removed, then the ones created in play, in the order they came. It's `[]` for a kind with none, or a kind the game has never heard of.

```ts
import { entitiesOf } from '@ifloom/engine'

entitiesOf(state, game, 'staff')   // ['staff:ana', 'staff:#1']
```

The café's custom effects use it with [`statValue`](/docs/reference/stats#statvalue) to add up a stat over a kind:

```ts
import { entitiesOf, statValue, type Game, type GameState } from '@ifloom/engine'

function total(state: GameState, game: Game, kind: string, stat: string): number {
  return entitiesOf(state, game, kind).reduce((sum, ref) => sum + statValue(state, game, stat, ref), 0)
}

// goes on the game as custom.effects
wages: (state, _args, { game }) => [{ kind: 'stat', stat: 'coins', by: -total(state, game, 'staff', 'wage') }],
```

### entityOf

```ts
function entityOf(state: GameState, game: Game | undefined, ref: EntityRef): EntityState | undefined
```

What play has changed about the entity a reference names: its record in the save, or `{}` for a declared entity nothing has changed yet. It's `undefined` if the entity isn't in the game (removed, never created, or not declared), or if `ref` isn't `kind:id` at all, `'$'` included. Use it to ask whether an entity is there, and with [`writeEntity`](#writeentity) to change its record. To read a value, use `statValue`, `entityKv` or `entityName`, which fall back to your content.

```ts
import { entityOf } from '@ifloom/engine'

entityOf(state, game, 'staff:ana')    // {} on a new game
entityOf(state, game, 'staff:cleo')   // undefined: nobody called Cleo works here
```

`game` can be `undefined` in code that has no game to hand, and then only entities with a record in the save are found.

### entityName

```ts
function entityName(state: GameState, game: Game, ref: EntityRef): string
```

An entity's name as the player reads it: the name it was created with, or its declaration's, with [prose tokens](/docs/reference/prose#tokens) filled for this save. It's the entity's id if it has no name at all.

```ts
import { entityName } from '@ifloom/engine'

entityName(state, game, 'staff:ana')        // 'Ana'
entityName(state, game, 'character:partner') // 'Sam', when the declaration says '{{partnerName}}' and the player typed Sam
```

### entityDesc

```ts
function entityDesc(state: GameState, game: Game, ref: EntityRef): string | undefined
```

An entity's description, with its tokens filled, or `undefined` if it has none. It's the one it was created with, else the `like`'s, else its declaration's.

### entityKv

```ts
function entityKv(state: GameState, game: Game | undefined, ref: EntityRef): Record<string, KvValue>
```

An entity's kv store as it reads: the keys of the entity it was made `like`, then its declaration's `kv`, with every key play has set laid over them. It's `{}` for an entity with none.

```ts
import { entityKv } from '@ifloom/engine'

entityKv(state, game, 'staff:ana')   // { role: 'cook', learning: true }
```

### entityTags

```ts
function entityTags(state: GameState, game: Game, ref: EntityRef): string[]
```

An entity's tags: its kind's, then those of the entity it was made `like`, then its declaration's or the ones it was created with, each once.

### entityImage

```ts
function entityImage(state: GameState, game: Game | undefined, ref: EntityRef): string | undefined
```

An entity's picture as written, before [`artSrc`](/docs/reference/prose#artsrc): the one it was created with, its declaration's, or else that of the entity it was made `like`.

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

Returns the state with the record of the entity `ref` names set to `next`, whole. Whatever `next` leaves out reads from your content again. If there's no such entity, one is added after the rest of its kind. If `ref` isn't `kind:id`, the state comes back unchanged. Use it in a plugin effect or a custom effect that changes an entity in a way the built-in effects can't.

```ts
import { entityOf, writeEntity } from '@ifloom/engine'

const ana = entityOf(state, game, 'staff:ana')!
writeEntity(state, 'staff:ana', { ...ana, name: 'Ana, head cook' })
```

**Gotcha.** Nothing is checked, so a stat isn't held to its range. An entity added this way isn't counted in [`state.created`](/docs/reference/state#created), and isn't recorded when it's later removed. It counts as one created in play unless the game declares it.

### traitOf

```ts
function traitOf<K extends string>(game: Game | undefined, ref: EntityRef, id: K): TraitData<K> | undefined
```

One trait's data on one entity, worked out as [Traits](#traits) says: a table row, else the entity's own, over its kind's default. `undefined` when it doesn't have the trait. An entity [created](/docs/reference/effects#create) in play has its kind's default.

```ts
traitOf(game, 'clothing:coat', 'laundry/washable')?.temp   // 30
```

**Gotcha.** It reads content only, so it doesn't know whether the entity is still in the game, nor what a thing created in play was given. Ask [`entityTrait`](#entitytrait) for that.

### entityTrait

```ts
function entityTrait<K extends string>(state: GameState, game: Game | undefined, ref: EntityRef, id: K): TraitData<K> | undefined
```

One trait's data on one entity as play reads it. For a declared entity it's `traitOf`. For one [created](/docs/reference/effects#create) in play, it's the trait data the `create` gave, laid over the trait of the entity it was made `like`, or over its kind's default.

```ts
entityTrait(state, game, 'clothing:#1', 'laundry/washable')   // the scarf's, for a copy made like it
```

### withTrait

```ts
function withTrait(game: Game | undefined, id: string, state?: GameState): EntityRef[]
```

Every declared entity that has the trait, in the order your content lists them. Pass a state too, and it's every entity in the game that has it as play reads it: declared ones not removed, then those created in play, through [`entityTrait`](#entitytrait).

### traitState

```ts
function traitState<S = unknown>(state: GameState, game: Game, ref: EntityRef, id: string): S | undefined
```

For the rare trait that keeps state of its own on each entity, such as the uses left in a torch: what play last wrote for this entity, or else where the trait's [`state.start`](/docs/reference/plugins#traitdef) says it begins. `undefined` when the entity isn't in the game, doesn't have the trait, or the trait keeps no state. Nothing goes into the save until [`setTraitState`](#settraitstate) writes it.

### setTraitState

```ts
function setTraitState(state: GameState, game: Game, ref: EntityRef, id: string, next: unknown): GameState
```

The state with one entity's state for one trait replaced, kept in its record's `traits`. An entity that isn't in the game is left alone. A plugin calls it from its own effects and commands.

```ts
const left = traitState<{ uses: number }>(state, game, 'tool:torch', 'kit/lamp')?.uses ?? 0
return setTraitState(state, game, 'tool:torch', 'kit/lamp', { uses: left - 1 })
```

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

Returns a copy of a condition or of effects, with every `of`, `entity`, `at` and `like` that is `'$'` set to `ref` (and a `move`'s `from` and `to`), at any depth, and every `'$'` in a plugin or custom call's arguments. This is how `each` and `count` run their `where` and `effects` for each entity, and how the view asks a kind's `listed`. A plugin or custom function can use it to run content written for "this one" on a particular entity:

```ts
import { bindCurrent, holds } from '@ifloom/engine'

holds(state, bindCurrent({ stat: 'morale', of: '$', gte: 75 }, 'staff:ana'), game)   // is Ana happy?
```

Anything else is copied as it is, `undefined` included. A nested `each`'s `effects` and a nested `count`'s `where` (its own or its `Select`'s) are left alone, since their `'$'` is their own.

**Gotcha.** Hand it what's inside an `each` or a `count`, not the `each` or `count` itself. On one of those, its own `effects` or `where` is the part that's left alone.

### PLAYER and YOU

```ts
const PLAYER = 'player'
const YOU = 'you'
```

The two reserved holders, for code that would rather not write the strings.

### Holder and Placement

```ts
type Holder = string
type Placement = Holder | Record<Holder, number>
```

A holder is `'player'`, `'you'` or a unique entity's reference. A placement says where a thing is put, by an entity's `at` or a `create`'s: one holder for one of it, or how many each holder has.

### heldCount

```ts
function heldCount(state: GameState, game: Game | undefined, ref: EntityRef, at?: Holder): number
```

How many of a thing a holder holds, `'you'` if `at` is left out. It's 0 for a thing held elsewhere or not in the game, and for a holder that can't hold.

```ts
import { heldCount } from '@ifloom/engine'

heldCount(state, game, 'food:apple')                   // 2
heldCount(state, game, 'food:apple', 'place:larder')   // 6
```

### heldTotal

```ts
function heldTotal(state: GameState, game: Game | undefined, ref: EntityRef): number
```

How many of a thing are held, by everyone together.

### heldBy

```ts
function heldBy(state: GameState, game: Game | undefined, at?: Holder): { ref: EntityRef; count: number }[]
```

Everything a holder holds (`'you'` if left out), with how many of each, in the game's order of its entities. Things it has none of aren't listed.

### holderOf and holdersOf

```ts
function holderOf(state: GameState, game: Game | undefined, ref: EntityRef): Holder | undefined
function holdersOf(state: GameState, game: Game | undefined, ref: EntityRef): { holder: Holder; count: number }[]
```

Who holds a thing. `holderOf` gives one holder, which for a unique thing is the only one, and `undefined` when nobody does. `holdersOf` gives every holder with its count, in no particular order. Both read the same reverse index, worked out once for each state and never saved.

### canHold

```ts
function canHold(state: GameState, game: Game | undefined, holder: Holder): boolean
```

Whether a holder can hold things now: `'player'` always, a unique entity while it's in the game. Pass a real holder: `'you'` isn't resolved here, so use [`resolveHolder`](#protagonist-resolveholder-and-ownerof) first.

### isUnique

```ts
function isUnique(game: Pick<Game, 'kinds' | 'plugins'> | undefined, ref: EntityRef): boolean
```

Whether an entity's kind is [`unique`](#kinddef): each one is one particular thing, which holds things and is held one at a time. A plugin asks it to treat a person or a coat differently from a stack of apples, as the [shop](/docs/plugins/shop) does when it sells a unique thing only from the vendor's stock.

### protagonist, resolveHolder and ownerOf

```ts
function protagonist(state: GameState): Holder
function resolveHolder(state: GameState, holder: Holder): Holder
function ownerOf(state: GameState, of: string | undefined): EntityRef | undefined
```

How `'you'` is read. `protagonist` is who's played now: [`state.you`](/docs/reference/state#you), or `'player'`. `resolveHolder` turns `'you'` into that and leaves any other holder alone. `ownerOf` reads an `of` the way stats and kv do: `undefined` for the player (no `of`, `'player'`, or `'you'` with nobody played), and an entity's reference otherwise.

### give, take, move and holding

```ts
function give(ref: EntityRef, n?: number): Effect
function take(ref: EntityRef, n?: number): Effect
function move(ref: EntityRef, to: Holder, options?: { from?: Holder; by?: number }): Effect
function holding(ref: EntityRef, n?: number): Condition
```

Helpers that write the holding effects and condition for you. `give` and `take` change what you hold by `n`, 1 if left out. `move` writes a [`move`](/docs/reference/effects#move) effect. `holding` asks whether you hold at least `n`. See [Holding things](#holding-things).

### everyEntity

```ts
function everyEntity(state: GameState, game: Game | undefined): EntityRef[]
```

Every entity in the game, of every kind: the declared ones as your content lists them, leaving out any removed, then those created in play, kind by kind.

## Gotchas

- **Stat ids are shared.** A stat's id is unique across the whole game, counting the player's stats and every kind's. The café can't have both a player's `skill` and a staff `skill`. A `stat` effect or a `{ stat }` condition finds its range, format and levels by id alone.
- **A stat named on the wrong owner does nothing useful.** At run time, `{ kind: 'stat', stat: 'coins', by: 5, of: 'staff:ana' }` gives Ana a `coins` of her own, which no view shows. The [content checker](/docs/reference/checks) reports it, and a kind the game doesn't declare.
- **A stat with a moving ceiling** (`max: { value }`) is worked out against the whole state. It's the same for every entity, not worked out for the one it's on.
- **What a declaration or a `create` gives isn't held to range.** `stats: { skill: 20 }` on a stat with `max: 10` starts at 20, and the next effect that moves it brings it back to 10.

## See it in an example

- The Corner Café: [`examples/cafe/src/world/staff.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/staff.ts) and [`examples/cafe/src/world/menu.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/menu.ts) declare the kinds `staff` and `dish` and start with Ana, cheese on toast and soup as entities, each with a description. [`examples/cafe/src/rules.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/rules.ts) adds up a stat over a kind with `entitiesOf` and `statValue` in its `total` helper. The `improveSoup` activity names one entity as `'dish:soup'`.
- Small Town: the cast's characters are entities of the kind `character`, listed in the view once the player has met them.
- Small Town: in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts), the river shell is an entity of the unique kind `keepsake`. You pick it up by the river with `give`, and give it to Ava at the café with `move`; the café scene says so once `{ entity: 'keepsake:shell', at: 'character:ava' }` holds.
- Small Town: the park's visitors in [`examples/showcase/src/story/park.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/park.ts) are entities of the kind `visitor`, made by the generators plugin and cleared each day with `each` and `remove`.
