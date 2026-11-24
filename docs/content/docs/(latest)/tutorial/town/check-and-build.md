---
title: "8. Check, playtest and build"
description: "Check the town for mistakes, watch a playtest run through it, and build it into a folder that opens from disk."
---
By the end of this step you'll have checked the town for mistakes, watched a playtest run through it, and built it into a folder you can open from disk.

## Check the content

The CLI loads the game the way the page does and reports every mistake in its content. Run it in a second terminal, beside the dev server:

```sh
npm run check
```

It prints `No problems.` To see a report, misspell a scene id. In `src/story/opening.ts`, change the kitchen's `{ scene: 'bedroom' }` to `{ scene: 'bedrom' }`, save, and run the check again:

```txt
content · scene kitchen · goes to unknown scene "bedrom"
1 problem.
```

Each line says where the mistake is and what's wrong. The check also reports a file the game names that isn't in `public/`, such as Ruth's picture if you skipped it in step 6. Change `bedrom` back to `bedroom` before you go on. [`ifloom check`](/docs/reference/cli#ifloom-check) says what else it reports.

## Playtest it

A playtest plays the game with nobody at the keyboard, pressing the buttons on each screen for a few turns:

```sh
npm run playtest
```

It prints a row of numbers for each turn, with a column for each of the player's stats, one counting Ruth's kind, `character`, and the scenes and refused commands:

```txt
turn	energy	coins	character	scenes	refused
1	80	6	1	4	0
2	100	2	1	1	0
3	100	2	1	0	0
```

The template's `playtest` script asks for 5 turns, but the table stops at turn 3: the playtest then goes to bed, and sleeping from the evening to the morning ends turns 4 and 5 at once.

Every screen it saw is in `playtest/run.txt`, a turn at a time, with the command it sent from each. The playtest picks its buttons in its own way, so your numbers can differ from these. [Playtest and snapshot from the command line](/docs/how-to/playtest-and-snapshot) runs one on every change.

## Build it

Stop the dev server, then build the game:

```sh
npm run build
```

The build writes the game into `dist/`, as one `index.html` with Ruth's picture at `dist/art/character/ruth.svg`. Then it checks that `index.html` loads its script and styles only from files beside it, which a page opened from disk needs, and that every file the game names is in the folder. It prints the largest files with their sizes, and a line for each problem it finds. Open `dist/` in your file manager and double-click `index.html`. The game runs from the file, with no server, because it loads nothing at runtime ([Why IFLoom works this way](/docs/explanation/design#nothing-loads-at-runtime)).

:::tip[Checkpoint]
The built game opens from `dist/index.html` in your browser. Walk to the café and buy a coffee. Then keep your place:

- **Plain JS and Vue.** Press **Save** in the side column, reload the page, and press **Load**.
- **React.** Press **Wait a while**, which ends a turn and saves the game, reload the page, and press **Continue** on the title screen.

The game carries on from where you left it.
:::

## What you built

You built a small town from a template: two scenes in a house, three locations to walk between, a baker who keeps her own hours, and a coffee that turns coins into energy. You checked it, playtested it and built it into one folder that opens from disk.

Each piece has a how-to of its own for going further:

- [Add a location](/docs/how-to/add-a-location), with pictures and things lying in it.
- [Add a character with a schedule](/docs/how-to/add-a-character), with talk scenes that change as the story does.
- [Open a shop, a job board or another panel](/docs/how-to/open-a-panel), for more than one thing to buy.
- [Ship your game](/docs/how-to/ship-your-game), to put the folder online.

The [Explanation](/docs/explanation/architecture) tab says how the engine, the plugins and your UI fit together, and why they work the way they do.
