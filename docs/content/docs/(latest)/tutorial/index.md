---
title: "Introduction"
description: "IFLoom is a TypeScript engine for interactive fiction of any shape, from a linear novel to a life sim, with two tutorials to start from."
---
IFLoom is a TypeScript engine for interactive fiction. You can write a linear novel with it, a management game played a week at a time, or a life sim with a calendar, a map and characters who keep their own hours. All three run on the same small core, and plugins add the rest. [Three shapes of game](/docs/explanation/shapes-of-game) shows each one.

A game is TypeScript files of plain data, its scenes, stats and people, which the engine checks before anyone plays. The CLI builds them into one HTML file that opens from disk, so you can share the game on any static host or send the folder to a friend.

## Who it's for

IFLoom is for people who write games in TypeScript and want the bookkeeping handled for them. The core keeps the turn, scenes and choices, stats, entities and what the player holds, and saves that survive a game update. It also works out what the player can do right now, and why not.

Time of day, places and people aren't in the core. The [calendar](/docs/reference/plugins/calendar), [places](/docs/reference/plugins/places) and [cast](/docs/reference/plugins/cast) plugins add them when a game needs them. The engine has no UI of its own, so you render the game with the ready-made React UI or with your own code in any framework ([Choosing a UI](/docs/explanation/choosing-a-ui)).

Twine and Ink walk a graph of passages, and Ren'Py gives you a full visual-novel screen. IFLoom keeps game state as well as story, and its conditions and effects are data the engine can check ([Differences from Twine, Ink and Ren'Py](/docs/explanation/design#differences-from-twine-ink-and-renpy)). The engine also keeps a few rules, such as seeded randomness and nothing loaded at runtime, which [Why IFLoom works this way](/docs/explanation/design) explains.

## Choose a tutorial

Each tutorial starts from `npm create ifloom` and ends with a game in a folder that opens from disk. Each step is one page and ends with a checkpoint, so you can see the game work before you move on.

- **[Write a short story](/docs/tutorial/story/start-a-story)**: a linear story with no plugins, in four steps. You write scenes and choices, keep a stat, ask the player's name, remember a choice, and end the story. Start here if you're writing a novel or a branching story.
- **[Build a small town](/docs/tutorial/town/create-a-game)**: one day in a small town, in eight steps. The player wakes up in a new house, walks down the high street to a café, meets Ruth the baker on weekday mornings, and buys a coffee that gives back energy. Start here for a game with places, people and time.

The town tutorial links to the story tutorial for the player's name and a remembered choice, so you can do either one first.

## The way through the docs

The docs are in tabs along the top:

- **Tutorial.** The two tutorials, read in order.
- **How-to guides.** One task each, such as [Create a game](/docs/how-to/create-a-game) with pnpm, yarn or bun, [Add a location](/docs/how-to/add-a-location) or [Ship your game](/docs/how-to/ship-your-game).
- **Explanation.** How the engine works and why, starting at [How the pieces fit](/docs/explanation/architecture).
- **Reference.** Every feature, plugin and package, starting at the [reference index](/docs/reference).
- **Upgrading.** Moving a game to a newer engine.
- **API.** Every export's signature and fields, generated from the source.
- **Changelog.** [What changed](/docs/changelog) in each release.
