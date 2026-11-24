---
title: "Introduction"
description: What IFLoom is, who it's for, how it differs from Twine, Ink and Ren'Py, the rules the engine keeps, and the way through these docs.
---
IFLoom is a TypeScript engine for interactive fiction. You can write a linear novel with it, a management game played a week at a time, or a life sim with a calendar, a map and characters who keep their own hours. All three run on the same small core, and you add the rest with plugins. See [Shapes of game](/docs/guide/shapes) for each one.

## Who it's for

IFLoom is for people who write games in TypeScript and want the bookkeeping handled for them. The core keeps the turn, scenes and choices, stats, entities and what the player holds, a [kv store](/docs/guide/concepts#the-kv-store) for named values such as a name or a count, storylines, triggers, notices, inputs, and saves that survive a game update. It also works out what the player can do right now, and why not.

Time of day, places and people aren't in the core. If your game needs them, the [calendar](/docs/reference/plugins/calendar), [places](/docs/reference/plugins/places) and [cast](/docs/reference/plugins/cast) plugins add them. A linear novel needs none of them.

IFLoom is a library with no UI in its engine, and [How the pieces fit](/docs/guide/how-it-fits) shows how the engine, plugins, a UI of your choice and the build tools go together.

## How it differs from other tools

Twine and Ink are built around branching passages. The story is a graph of text, and the player walks it. If your story is a branching narrative and nothing more, they're the faster route. IFLoom handles that too (see [Your first story](/docs/guide/first-story)), but it's built for games that also keep state, such as numbers that change and things the game has several of. With plugins it adds a clock, a map and characters. Its conditions and effects are plain data, so the engine can check every scene before anyone plays it. If you already know SugarCube or Harlowe, [Coming from SugarCube or Harlowe](/docs/guide/coming-from-twine) maps what you know to IFLoom.

Ren'Py and other visual-novel engines give you a complete presentation layer (sprites, backgrounds, a text box, menus) and a script that drives it. IFLoom's engine is game logic with no DOM. The React UI gives you a ready-made screen with the scene, its choices, the stats, saves and menus. It can fade or slide between scenes, reveal lines one at a time (see [Transitions](/docs/recipes/transitions)), and show a scene as a [layered picture](/docs/reference/scenes#the-picture) with hotspots to click. It doesn't have a visual-novel text box. If you want one, you draw it yourself from the view.

## The rules the engine keeps

- **Replays match.** Every random draw is seeded from the save, so the same save on the same turn gives the same result. Undo can't be used to re-roll, and a scripted playtest gives the same result every run. See [Randomness](/docs/reference/random).
- **Everything is bundled.** The engine never fetches anything or loads code while the game runs, because a game opened from disk can't. See [Shipping a game](/docs/guide/shipping).
- **No DOM and no framework.** The engine is plain TypeScript. It runs the same in a browser, in Node and in a test.
- **No genre.** The engine knows no stat, place or person by name. Your game declares them and supplies its own logic through [rules](/docs/reference/rules).

## The way through the docs

Start with [Installation](/docs/guide/installation), then write [your first story](/docs/guide/first-story). [How the pieces fit](/docs/guide/how-it-fits) comes after it, with a picture of the whole thing. The docs are in tabs along the top:

- **Guide.** Tutorials to read in order. After the first story they split into an Engine track (running a game, the view, saves, a game with plugins, a UI from scratch, testing) and a UI track (choosing between the React UI and your own, in any framework).
- **Recipes.** How to build one piece, such as a [title screen](/docs/recipes/title-screen) or a HUD, and how to build with [Next](/docs/recipes/next), webpack or esbuild.
- **Reference.** Everything the engine exports, starting at [the game](/docs/reference/game).
- **Plugins.** The [first-party plugins](/docs/reference/plugins), such as the calendar, places and the cast.
- **Browser.** [`@ifloom/browser`](/docs/browser) and the [audio player](/docs/browser/audio-player), helpers for any UI.
- **React UI.** The ready-made [React UI](/docs/react) and how to make it your own.
- **CLI.** The [`ifloom` command](/docs/cli) and its Vite preset.
- **Changelog.** [What changed](/docs/changelog) in each release.
