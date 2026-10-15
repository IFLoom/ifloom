# Introduction

IFLoom is an engine for interactive fiction set in a world that keeps going without you. Time passes in turns, and with the [calendar plugin](/plugins/calendar) in days and periods. Places shut when the game says. Characters, through the [cast plugin](/plugins/cast), keep their own schedules. Several storylines run side by side, and the player chooses where to spend the afternoon.

A linear story is the simplest case of the same engine: no places, no clock, chapters that lead into each other. See [Shapes of game](/guide/shapes).

::: warning Pre-release
IFLoom is pre-release. Nothing is a stable API yet, and some names are about to change. See [API status](/guide/status).
:::

## Who it is for

IFLoom is for people who write games in TypeScript and want the world simulation handled for them: the turn and, through a plugin, the calendar, the map, who is where, what the player can do right now and why not, and saves that survive a game update.

You bring the story, and the screen if you want your own. The engine has no UI of its own; it hands you a description of what to draw, and you draw it with whatever you like. For a game in the browser, the [base UI](/ui/), `@ifloom/ui`, draws it for you in React, and you restyle or extend it.

## How it differs from other tools

**Twine and Ink** are built around branching passages: the story is a graph of text, and the player walks it. They are excellent at that, and if your story is a branching narrative they are the faster route. IFLoom starts from a world instead. A scene is something that happens in a place, at a time, with whoever is there, and storylines advance as the player drifts between them.

**Ren'Py** and other visual-novel engines give you a complete presentation layer — sprites, backgrounds, a text box, menus — and a script that drives it. IFLoom gives you none of that. It is a library of game logic with no DOM, and the presentation is entirely yours.

## The rules the engine keeps

- **Deterministic.** Nothing is random at runtime. Every draw is hashed from the save's seed, a name and what it is keyed on, such as the turn, so the same save deals the same cards. Undo, snapshots and scripted playtests rely on it.
- **Nothing loads at runtime.** No `fetch()` and no dynamic `import()`. A game opened from disk can do neither, so everything it needs is bundled when it is built. See [Shipping a game](/guide/shipping).
- **Genre-neutral.** The engine knows no place, person or storyline by name. Your game declares them, and supplies its own logic through hooks.
- **No DOM.** The engine is plain TypeScript. It runs the same in a browser, in Node, and in a test.

## The architecture in one picture

```
  your content                 the engine                    your UI
┌──────────────┐  command   ┌─────────────────┐   view   ┌──────────────┐
│     game     │ ─────────▶ │  apply(state,   │ ───────▶ │ draws what   │
│ places,      │            │   game, cmd)    │          │ view() says, │
│ people,      │            │      ↓          │          │ sends a      │
│ scenes,      │            │  new state      │          │ command when │
│ rules        │            │      ↓          │          │ a button is  │
│              │            │  view(state,    │ ◀─────── │ pressed      │
│              │            │       game)     │ command  │              │
└──────────────┘            └─────────────────┘          └──────────────┘
```

1. The **game** is your content: scenes, activities, stats, the plugins it picks (such as [places](/plugins/places) for a map and the [cast](/plugins/cast) for its people) and the content they read, and the rules that are yours rather than the engine's.
2. The **state** is one plain object — the save.
3. A **command** (`talk`, `choose`, `activity`, a plugin's `go`…) goes through `apply`, which returns the next state and whether the command took.
4. `view` turns the state into a **view**: the scene on screen, who is here, each plugin's slice (the places plugin's exits), what can be done and why not. Your UI, or the [base UI](/ui/), renders the view and sends the next command.

Next: [install it](/guide/installation), then [build a first game](/guide/first-game). To see a whole game first, read [Small Town](/guide/showcase), the showcase, which uses every part of the engine together.
