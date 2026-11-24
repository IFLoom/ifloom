---
title: "4. Check, playtest and build"
description: "Step 4 of the story tutorial. Checks the story's content for mistakes, plays it to an ending with nobody at the keyboard, and builds it into a folder that opens from disk."
---
By the end of this step you'll have checked the story for mistakes, read a playtest that plays it to an ending, and built it into a folder you can open from disk.

## Check the content

The CLI loads the game the way the page does and reports every mistake in its content. Run it in a second terminal, beside the dev server:

```sh
npm run check
```

It prints `No problems.` To see a report, misspell a scene id. In `src/story/opening.ts`, change the `keep` choice's `{ scene: 'ch2.bus' }` to `{ scene: 'ch2.buss' }`, save, and run the check again:

```txt
content · scene ch1.stop · goes to unknown scene "ch2.buss"
1 problem.
```

Each line says where the mistake is and what's wrong. The check also reports a misspelt choice in a `chose`, and a stat that a condition names but nothing declares. Change `ch2.buss` back to `ch2.bus` before you go on. [`ifloom check`](/docs/reference/cli#ifloom-check) says what else it reports.

## Playtest it

A playtest plays the game with nobody at the keyboard. It presses a choice on each screen, one it hasn't pressed before where it can, until the story starts over:

```sh
npm run playtest
```

It prints a row of numbers for each turn, with a column for each of the player's stats, then the scenes it opened and the commands the game refused:

```txt
turn	warmth	scenes	refused
1	2	3	0
```

The story never ends a turn, so the whole run is turn 1. The playtest shared the umbrella, paid the fare and waved the man in, so it opened three scenes and ended with a warmth of 2. It doesn't type, so it never gave a name, and the greeting line stayed hidden.

Every screen it saw is in `playtest/run.txt`, with the choice it pressed on each. The last screen is the warm ending:

```txt
== Turn 1
# The end
He turns out to live two doors down. He brings biscuits next time.
  [>] Start again

> {"type":"choose","id":"again"}

  a new game: the playtest stops here
```

The playtest stops when **Start again** begins a new game. A refused command is a button the game offered and then wouldn't do, so the playtest fails when the `refused` column isn't 0. [Playtest and snapshot from the command line](/docs/how-to/playtest-and-snapshot) runs one on every change.

## Build it

Stop the dev server, then build the game:

```sh
npm run build
```

The build writes the game into `dist/` as one `index.html`, and checks that the folder opens from disk. Open `dist/` in your file manager and double-click `index.html`. The game runs from the file, with no server, because it loads nothing at runtime ([Why IFLoom works this way](/docs/explanation/design#nothing-loads-at-runtime)).

:::tip[Checkpoint]
The built game opens from `dist/index.html` in your browser, at "Chapter one: the stop" (after **New game** in the React template). Type your name, share the umbrella and pay the fare, then wave the man in. The page shows "The end", and **Start again** takes you back to the stop.
:::

## What you built

You wrote a story in three chapters with two endings. It keeps a stat for how kind the player has been, greets the player by name, and remembers each choice to change the chapters that follow. You checked it, playtested it and built it into one folder that opens from disk.

Each piece has a how-to of its own for going further:

- [Write a flowing scene](/docs/how-to/write-a-flowing-scene), where the story carries on below the player's choice instead of opening another scene.
- [Organise your game's files](/docs/how-to/organise-your-files), to give each chapter a file of its own as the story grows.
- [Ship your game](/docs/how-to/ship-your-game), to put the folder online.

[Build a small town](/docs/tutorial/town/create-a-game), the other tutorial, adds locations, a clock and a character with plugins. [Three shapes of game](/docs/explanation/shapes-of-game) shows a longer novel built the way this story is, and the [Explanation](/docs/explanation/architecture) tab says how the engine, the plugins and your UI fit together.
