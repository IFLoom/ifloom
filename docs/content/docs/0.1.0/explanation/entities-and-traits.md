---
title: "Entities, things and traits"
description: "The engine keeps one list of entities, each of a kind, carrying traits and holding others, so plugins share them without knowing each other."
---
The engine keeps the people, places and things of a game's world in one list of entities, so plugins can share them without knowing each other. Each is of a kind, carries data called traits, and can hold others. The places plugin, the cast, the shop, the wardrobe and the inventory all work on that one list.

## Kinds and entities

An [entity](/docs/0.1.0/reference/glossary#entity) is one of several things of the same [kind](/docs/0.1.0/reference/glossary#kind), such as a member of staff, a dish, a person or a sandwich. The game declares its kinds in `kinds` and the entities there are at the start in `entities`. Content names one by its kind and id, `'staff:ana'`. A stat declared with `of: 'staff'` is kept on every member of staff rather than on the player, so the café's cook has her own skill, morale and wage.

Reach for an entity when the game has several of something, each with its own name and numbers, or when the player can hold it. A single number the player watches, such as their coins, is a stat. A single fact the story remembers, such as whether a door has been opened, is a kv key.

## Definitions stay in content

Content declares each entity's name, description, picture, tags, traits and starting stats. The save keeps only what play has changed. A new game's state holds nothing about Ana until her morale moves, and then it holds the new morale and nothing else.

The engine could have copied each entity into the save at the start, which would be simpler to read. It doesn't, for two reasons. An update that fixes a name or a description reaches every old save, because the save never had a copy. And a save stays small whatever the size of the world. The rule is the same for holdings: a thing's `at` in content says who holds it at the start, and the save records a count only once play changes it.

Entities made in play follow the same idea. A cake made with `create` and `like: 'food:cake'` reads whatever it isn't given from the cake in content, so the save keeps a reference and the few stats of its own, such as how fresh it is.

## Things and holders

A [thing](/docs/0.1.0/reference/glossary#thing) is an entity the player can hold, such as a sandwich, a note or a photo. The engine has no separate list of things. Anything holdable is an entity, so a thing has a name, a picture, stats and traits like anything else.

A [holder](/docs/0.1.0/reference/glossary#holder) is who has things: the player, or a unique entity. A kind is `unique` when each of its entities is one particular thing that can hold others, such as a person, a location or a gift box. Ava can hold a scarf, and the café can hold a lost glove. A kind that isn't unique stacks instead, so six apples are a count of six, not six entities. Nothing holds itself, however far round: a box can't go into the scarf it holds.

`'you'` is a holder too. It means whoever the player is playing now. A game with one protagonist never changes it, so `'you'` is the player. A game with two siblings taking turns switches it with the `you` effect, and then `'you'` holds what the sibling being played holds, while `'player'` keeps what the household shares.

## Traits give entities meaning

A [trait](/docs/0.1.0/reference/glossary#trait) is a named piece of data an entity carries. The engine doesn't know what any trait means. A plugin declares the traits it reads and gives them meaning:

- **`places/location`** makes an entity a location, with its exits and the things to do there.
- **`cast/person`** makes an entity a character, with a schedule and a way to talk to them.
- **`shop/vendor` and `shop/sellable`** make one entity sell things and give another a price.
- **`wardrobe/wearable`** names the slot a thing goes in.
- **`inventory/usable`** gives a thing a use button.

So a scarf that lies in the park, can be worn and is worth 8 coins at the market stall is one entity with two traits, `wardrobe/wearable` and `shop/sellable`. The wardrobe reads one, the shop reads the other, and neither plugin knows the other exists. Take the shop out of the game and its trait stays on the scarf and does nothing.

A trait is data, never a function, and it describes what an entity is rather than what happens to it. A trait is written in content and doesn't change in play. Anything that changes, such as how worn the scarf is, is a stat or a kv key on the entity. A trait with no `/` in its id, such as `cosy`, is the game's own, for its rules to read.

A kind can give its entities a default trait, an entity can carry its own, and content's `traits` table can set one for any entity by row. The table exists for mods. It changes one trait on one entity without writing the entity out again, so a mod that reprices the scarf is one row.

## Locations, characters and vendors are entities

The places the player walks between, the people they meet and the stalls they buy from are entities too. Each plugin brings a kind for its entities (`location`, `character`, `vendor`) and a helper that writes one, such as `places.location({ ... })` or `cast.person({ ... })`. The helper puts the entity's own fields, its name, `description` and `image`, on the entity, and the rest in the trait.

Making them entities pays off in several places. A relationship is a stat the game declares on the kind `character`, so each person keeps their own friendship. A mod changes a location the way it changes a sandwich, by replacing the entity or adding a `traits` row. A location is unique, so things lie at it and the player can pick them up. And any entity can carry any trait, so a person can keep a stall: give `shop.vendor()` an `of: 'character'` and Ava sells pastries.

## The engine decides what the view lists

The view lists only the entities the game says it may. A kind's `listed` is `true`, `false`, or a condition asked of each entity, and an entity's `visible` narrows it further. The cast's characters are listed once the player has met them, and a supplier kept only for the game's own sums is never listed.

The engine filters, not the UI, because anything in the view can end up on screen, in a text UI or in a tool that reads it. If the view held every entity and trusted each UI to hide some, one careless UI would give the story away. To split a list rather than shorten it, a kind declares [`flags`](/docs/0.1.0/reference/glossary#flags), such as `senior` for staff with high skill, and the view answers each flag on each listed entity. Only the view is filtered. Conditions and effects such as `count` and `each` still see every entity.

## Stats, the kv store and storylines

A game keeps three other kinds of value, and each has a different job:

- **A stat** is a number the player watches change, such as coins, energy or a friendship. The game declares each one with where it starts and the range it keeps to. A stat can be derived, worked out by a formula from others, and it can have levels it passes as it grows.
- **The kv store** holds keys with a true/false, number or text value, such as a name the player typed or a count of lies told. A key that was never set counts as 0. The player has one store, and so does each entity and each storyline.
- **A storyline** is one thread of the story, such as a friendship with Ava, with its own kv store. It can be closed for a number of turns, and the engine records which scenes the player has seen and when. So a storyline's scenes come in order and at a pace, such as "three turns after the last one".

The engine also remembers every choice the player made, so `{ chose: 'ch1.mat#open' }` asks about an earlier choice with no kv key to set. A value the player never sees as a number, such as how many excuses they've made, goes in the kv store. A number shown on screen is a stat.

For the details, see [Entities](/docs/0.1.0/reference/entities), [Stats](/docs/0.1.0/reference/stats), [Storylines](/docs/0.1.0/reference/storylines) and [Game state](/docs/0.1.0/reference/state#kv). [Give the player things to hold and use](/docs/0.1.0/how-to/give-the-player-things), [Add a location](/docs/0.1.0/how-to/add-a-location) and [Add a character with a schedule](/docs/0.1.0/how-to/add-a-character) are the tasks.
