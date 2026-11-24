---
title: "Three shapes of game"
description: "One small core makes a linear novel, a management game and a life sim, as the three example games show."
---
One small core makes three quite different games, and each of the repository's examples shows what it uses and what it leaves out. All three run on the same engine: the turn, scenes and choices, conditions and effects, stats, entities and their holders, the kv store, saves and the view. They differ in how much world each one declares, and in which plugins it adds.

The three examples are whole games you can play, check and ship:

- **A linear novel.** The Letter, in `examples/novel`, is chapters in order, choices the story remembers and a few numbers kept quietly. It uses no plugins.
- **A management game.** The Corner Café, in `examples/cafe`, is money and several of a thing, staff and dishes, each with numbers of its own, run a week at a time. It uses no plugins either.
- **A life sim.** The showcase, Small Town, in `examples/showcase`, is people who keep their own hours, friendships that grow and a town to walk around. It uses the calendar, places and the cast, and every other first-party plugin besides.

[Examples](/docs/0.1.0/reference/examples) maps each feature to the file that shows it. `ifloom new` starts a game from any of them, with `--template novel`, `cafe` or `town`.

## A linear novel uses the core alone

The Letter is the smallest whole game. A letter for the last tenant lands on your mat, and what you do with it, and what you tell the neighbour downstairs, decides how the third chapter goes. It has three chapters, two endings, one stat and no plugins.

Its base needs only an `id`, a `title` and a `version`, with a migration and a save name in its rules. The first scene is content's `introScene`. With no places plugin there's no map, so there's no room to return to, and the novel keeps a scene open from the first page to an ending. Every choice opens the next scene, and none offers `leave`.

The rest is the core doing ordinary work:

- **A name the player types.** An [input](/docs/0.1.0/reference/inputs) asks for one until it's given, and the first chapter's choices wait on `{ kv: 'playerName' }`. The prose prints it with `{{playerName}}`.
- **One stat.** Opening the letter and telling the truth each add to `courage`, and the braver ending is a choice offered only with `{ stat: 'courage', gte: 3 }`.
- **Choices the engine remembers.** A later chapter asks `{ chose: 'ch1.mat#open' }` about an earlier choice, with no kv key to set.
- **A count.** Each lie adds to a kv key with `{ kv: 'fibs', by: 1 }`, and the last chapter reads it back. A key never set counts as 0, so the honest reader's line needs nothing written first.
- **A chapter is a turn.** Every choice that moves to the next chapter carries `{ turn: true }`, so `state.turn` is the chapter the reader has reached.

The game leaves out a lot. It has no calendar, so no periods and no bed. It has no entities, so nothing to hold. Its layout is one narrow column with no side panel, and its title screen offers New Game+ once a reader reaches either ending, because both endings set a `readBefore` key that `carryOver` keeps. The core makes all of this without a line of the game's own code beyond the migration and the save name.

## A management game adds entities

The Corner Café is mostly data. The player runs a café a week at a time. Each week the till is counted, the staff are paid, and everyone gets a little more tired. Look after them and they stay, and a happy team gets a good review in the local paper.

Like The Letter, it has no places, characters or clock. It adds [entities](/docs/0.1.0/explanation/entities-and-traits), the things the game keeps several of. It declares two kinds, `staff` and `dish`, and stats that belong to each kind rather than to the player:

```ts fragment
{ id: 'morale', label: 'Morale', of: 'staff', start: 60 },
{ id: 'quality', label: 'Quality', of: 'dish', start: 2, min: 1, max: 5 },
```

The same effects and conditions that work on the player's stats take an `of` naming an entity, so better soup is `{ stat: 'quality', by: 1, of: 'dish:soup' }`. Hiring makes a new member of staff in play with `create`, and `{ count: 'staff', gte: 4 }` says when there's no room behind the counter.

A week is one action, Count the till and end the week. It runs two of the game's own macros, from `src/rules.ts`, for the takings and the wages, since summing every dish's price and every wage is code rather than data. Then `each` takes 8 morale from every member of staff, a second `each` with a `where` removes anyone below 20, and `{ turn: true }` ends the week:

```ts fragment
{ each: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ remove: '$' }] },
```

`'$'` stands for each one in turn. Triggers watch the counts too. One notices an empty kitchen once a week, and another raises the reputation the first time two of the staff are happy.

So a turn here is a week because a button says so, and nobody ever sleeps. A management game that also wants days and a weekday adds the calendar with `calendar({ turn: 'week' })`, and the week's button then moves the clock on instead. Its layout puts the tables of staff and dishes in the main column, over the week's buttons, because in a management game the player mostly looks at the things being managed.

## A life sim adds the world plugins

A life sim is the core with three plugins, listed calendar first so every other plugin sees the new day when one begins:

- **The calendar** adds the periods of a day, the weekday, a bed and a curfew, and makes a turn a day.
- **Places** adds the map: locations with exits, walking between them, and where the player is.
- **The cast** adds the people: their hours, who is here, talking and calling.

Each location and each character is an entity, written with `places.location({ ... })` and `cast.person({ ... })`. A location's opening hours are its `blocked` list, using the calendar's conditions. A character's schedule says where they are while each condition holds, and they're here when places says the player is at that location too. A friendship is a stat declared on the kind `character`, read as `{ stat: 'friendship', of: cast.character('ava'), gte: 25 }`.

In the showcase a turn is a day, ended by going to bed, and a new game starts on the night you move in. The game spends most of its time in the room for the location the player is at, and opens a scene for a conversation or an event. The React UI's default layout is made for this shape, with the side column for the clock, stats and the people met, and the story for the location, its exits and who is here. The showcase adds every other first-party plugin on top, such as quests, the shop and the phone, which is why it's the example the docs point at.

## The core is the same in all three

The three games share more than they differ. Each one's `src/game.ts` only assembles: content in `src/world/` and `src/story/`, a base with its rules, and the plugins it uses. Each has tests that play it, a playtest that writes a transcript, and a build that makes one HTML file that opens from disk.

The amount of world changes from game to game. The novel declares a stat and some scenes. The café declares kinds and entities and a little code. The life sim takes plugins for time, places and people. None of them carries a system it doesn't use, because the engine has no genre of its own (see [Why IFLoom works this way](/docs/0.1.0/explanation/design#no-genre-in-the-engine)).

For the details, see [Examples](/docs/0.1.0/reference/examples), [Turns, scenes and the room](/docs/0.1.0/explanation/turns-and-time) and [Entities, things and traits](/docs/0.1.0/explanation/entities-and-traits). [Create a game](/docs/0.1.0/how-to/create-a-game) starts one from any of the three.
