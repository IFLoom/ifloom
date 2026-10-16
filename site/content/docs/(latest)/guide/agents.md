---
title: "Using IFLoom with an AI agent"
description: Work on an IFLoom game with a coding agent. Where the docs are as llms.txt and llms-full.txt, the AGENTS.md every new game comes with, and how to have the agent check its own work.
---
A coding agent can write and change an IFLoom game well, as long as it can read the docs and check what it did. This page covers where an agent finds the docs, what a new game tells it, and how to keep it honest.

## Give it the docs

The docs site publishes two files written for language models:

- [`llms.txt`](https://ifloom.github.io/ifloom/llms.txt) is an index. It lists every page with a link and a one-line description.
- [`llms-full.txt`](https://ifloom.github.io/ifloom/llms-full.txt) is every page in one file.

Every page is also published as plain Markdown, such as `https://ifloom.github.io/ifloom/llms.mdx/docs/guide/introduction/content.md` for the introduction. The button at the top of each page copies it for you.

`llms-full.txt` is the simplest thing to hand an agent. For an agent with a small context, give it `llms.txt` instead and let it fetch the pages it needs.

The same docs are in the `site/content/docs/` folder of your IFLoom checkout, as Markdown. An agent working in a game inside the checkout can read them there without going online. This matters while the docs site isn't public yet.

## The AGENTS.md in every new game

`npm run new` puts an `AGENTS.md` in every game it makes, whichever template you pick. Many coding agents read a file of that name on their own when they start work in a folder. For a game called `my-game`, it reads:

```md
# My Game

An interactive fiction game built on IFLoom, a TypeScript engine. This file is
for coding agents working on the game.

## Learn the engine

- The docs, in one file: https://ifloom.github.io/ifloom/llms-full.txt
  (until the docs are public, read `site/content/docs/` in the IFLoom checkout this game sits in).
- Working games to copy patterns from: `examples/novel`, `examples/cafe` and
  `examples/showcase` in the checkout.

## How the game is put together

- `src/game.ts` is the game. Content is plain data: scenes, choices,
  conditions, effects, stats and prose. Prefer data over code.
- The engine is deterministic and has no DOM. Randomness is seeded from the save.
- Plugins (a calendar, places, a cast of characters…) are added to `plugins: [...]`
  when the game is loaded, and their content goes under `data.<plugin>` in a pack.
- `src/main.ts` draws the game in the browser.

## After every change

- `npm run check` lists anything the game names that doesn't exist. It should print "No problems."
- `npm run playtest` plays the game with no one at the keyboard and writes what it saw.
- `npm run dev` serves the game in a browser; `npm run build` makes one HTML file.
```

It's yours to edit. Add your game's own conventions to it, such as how you name scenes, the tone of the prose, or which plugins the game uses.

## Tips

- **Point it at an example.** The three examples are whole, working games. Ask the agent to follow `examples/novel` for a story in chapters, `examples/cafe` for a game built on [entities](/docs/reference/entities), or `examples/showcase` for places, characters and a calendar.
- **Have it run `npm run check`** after every change. It loads the game and lists every problem the loader finds, such as a scene, prose key or id that the content names but nothing declares. It prints `No problems.` when there are none, and exits with an error when there are some, so an agent can tell the difference. Inside the checkout, that's `npm run check -w my-game` from the root.
- **Have it run `npm run playtest`** to see the game played. The [playtest](/docs/cli#ifloom-playtest) plays a few turns with no one at the keyboard and writes every screen and every command to a text file. An agent can read that file to find a scene that never shows up, a choice that's always greyed out, or a number that never moves.
- **Ask for content as data.** Scenes, conditions and effects are plain objects that `check` can read. A rule written as code is harder for the agent, and for `check`, to verify.

## Next

- [Your first story](/docs/guide/first-story) builds a short game step by step, which is also a good thing to hand an agent as an example of the format.
- [The CLI](/docs/cli) documents `check`, `playtest` and the other commands in full.
