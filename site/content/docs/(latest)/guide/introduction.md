---
title: "Introduction"
description: What IFLoom is, who it's for, how it differs from Twine, Ink and Ren'Py, the rules the engine keeps, and the way through these docs.
---
IFLoom is a TypeScript engine for interactive fiction. You can write a linear novel with it, a management game played a week at a time, or a life sim with a calendar, a map and characters who keep their own hours. All three run on the same small core, and you add the rest with plugins. See [Shapes of game](/docs/guide/shapes) for each one.

:::warning[Pre-release]
IFLoom is pre-release. Nothing is a stable API yet, and the packages aren't on npm. See [API status](/docs/guide/status).
:::

## Who it's for

IFLoom is for people who write games in TypeScript and want the bookkeeping handled for them. The core keeps the turn, scenes and choices, stats, entities, a kv store, collections, storylines, triggers, notices, inputs, and saves that survive a game update. It also works out what the player can do right now, and why not.

Time of day, places and people aren't in the core. If your game needs them, the [calendar](/docs/plugins/calendar), [places](/docs/plugins/places) and [cast](/docs/plugins/cast) plugins add them. A linear novel needs none of them.

IFLoom is a library first. The engine has no UI. It hands you a description of what to draw, called the [view](/docs/reference/view), and takes back the player's commands, so you can draw a game with plain JS, React, Vue, Svelte or anything else, run it in Node, or test it like any other code. Every UI is optional. The [React UI](/docs/react), `@ifloom/react`, is one ready-made option that draws the whole game in the browser, and you can restyle or replace any part of it. [How the pieces fit](/docs/guide/how-it-fits) shows the engine, the plugins, the UI and the build tools, and which ones you need.

## How it differs from other tools

Twine and Ink are built around branching passages. The story is a graph of text, and the player walks it. If your story is a branching narrative and nothing more, they're the faster route. IFLoom handles that too (see [Your first story](/docs/guide/first-story)), but it's built for games that also keep state, such as numbers that change and things the game has several of. With plugins it adds a clock, a map and characters. Its conditions and effects are plain data, so the engine can check every scene before anyone plays it. If you already know SugarCube or Harlowe, [Coming from SugarCube or Harlowe](/docs/guide/coming-from-twine) maps what you know to IFLoom.

Ren'Py and other visual-novel engines give you a complete presentation layer (sprites, backgrounds, a text box, menus) and a script that drives it. IFLoom's engine is game logic with no DOM. The React UI gives you a ready-made screen with the scene, its choices, the stats, saves and menus, and it can show a picture for a scene. It doesn't do sprites, transitions or a visual-novel text box. If you want those, you draw them yourself from the view.

## The rules the engine keeps

- **Replays match.** Every random draw is seeded from the save, so the same save on the same turn gives the same result. Undo can't be used to re-roll, and a scripted playtest gives the same result every run. See [Randomness](/docs/reference/random).
- **Everything is bundled.** The engine never fetches anything or loads code while the game runs, because a game opened from disk can't. See [Shipping a game](/docs/guide/shipping).
- **No DOM and no framework.** The engine is plain TypeScript. It runs the same in a browser, in Node and in a test.
- **No genre.** The engine knows no stat, place or person by name. Your game declares them and supplies its own logic through [rules](/docs/reference/rules).

## The way through the docs

[How the pieces fit](/docs/guide/how-it-fits) comes next, with a picture of the whole thing. Then [install IFLoom](/docs/guide/installation) and write [your first story](/docs/guide/first-story). After that the guide splits in two:

- **The engine.** Running a game, the view, saves and settings, a game with plugins, a whole UI written from scratch, and testing. This works the same whatever draws your game.
- **The UI.** Choosing between the ready-made [React UI](/docs/react) and your own, and building your own in any framework.

[Recipes](/docs/recipes/title-screen) show how to build one piece, such as a title screen or a HUD, and how to use another bundler, such as [Next](/docs/recipes/next). The [reference](/docs/reference/game) lists everything the engine exports.
