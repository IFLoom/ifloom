---
title: "Using IFLoom with an AI agent"
description: Work on an IFLoom game with a coding agent. Where the docs are as llms.txt, llms-full.txt and an MCP server, the AGENTS.md every new game comes with, and how to have the agent check its own work.
---
A coding agent can write and change an IFLoom game well, as long as it can read the docs and check what it did. Give it the docs below, let the `AGENTS.md` in a new game brief it, and have it run the game's checks after each change.

## Give it the docs

The docs site publishes two files written for language models:

- [`llms.txt`](https://ifloom.dev/llms.txt) is an index. It lists every page with a link and a one-line description.
- [`llms-full.txt`](https://ifloom.dev/llms-full.txt) is every page in one file.

Every page is also published as plain Markdown, such as `https://ifloom.dev/llms.mdx/docs/guide/introduction/content.md` for the introduction. The Copy Markdown button at the top of each page copies it for you, and the Open menu beside it opens the page in ChatGPT, Claude or Cursor, or as Markdown.

`llms-full.txt` is the simplest thing to hand an agent. For an agent with a small context, give it `llms.txt` instead and let it fetch the pages it needs.

The same docs are in the `docs/content/docs/` folder of the [IFLoom repository](https://github.com/IFLoom/ifloom), as Markdown, for an agent that works offline in a clone of it.

## Connect it to the MCP server

The docs site also runs an MCP server at `https://ifloom.dev/api/mcp`, over streamable HTTP. An agent that speaks MCP can search the docs and fetch the pages it needs instead of reading them all. Add it to your agent's MCP settings:

```json
{
  "mcpServers": {
    "ifloom": { "url": "https://ifloom.dev/api/mcp" }
  }
}
```

The file and its name depend on the agent, such as `.mcp.json` for Claude Code or `.cursor/mcp.json` for Cursor. The server has three tools:

- `search` finds pages and headings that match a query.
- `list_pages` lists every page with its path and description.
- `get_page` returns one page as Markdown, given a path such as `/docs/reference/scenes`.

## The AGENTS.md in every new game

`npm create ifloom` puts an `AGENTS.md` in every game it makes, whichever template you pick. Many coding agents read a file of that name on their own when they start work in a folder. For a game called `my-game`, it reads:

```md
# My Game

An interactive fiction game built on IFLoom, a TypeScript engine. This file is
for coding agents working on the game.

## Learn the engine

- The docs, in one file: https://ifloom.dev/llms-full.txt
- The docs' MCP server, to search them and fetch single pages: https://ifloom.dev/api/mcp
- Working games to copy patterns from: `examples/novel`, `examples/cafe` and
  `examples/showcase` in the IFLoom repository, https://github.com/IFLoom/ifloom.

## Where things go

- `src/game.ts` only assembles the game: its default export is
  `defineGame({ build })`, the game module the page and the CLI build it from,
  where `build` returns `loadGame([...content], { ... })` with the plugins and
  rules. Content doesn't go here.
- `src/world/` holds what the whole game shares, one file per kind:
  `stats.ts`, `things.ts`, `cast.ts` for the people, `settings.ts` for what the
  player can change. Each file exports a `Content` object.
- `src/story/` holds the story, one file per area: a place, a chapter or a
  character's arc. Each exports a `Content` object with that area's scenes,
  choices and its slice of plugin content (that place, its vendor, its jobs).
- The words a player reads are written in place: a choice's `label`, an
  entity's `name`, a block of words in a scene, `text('…')` or
  `{ text: '…' }`. Only lines read by key, `{ prose: 'key' }` blocks,
  `variants` and pools, go in the `prose` table. A translation is one pack
  with a `words` table: https://ifloom.dev/docs/recipes/translating
- `src/rules.ts` holds the game's rules (`onTurn`, `onStat`, ...) once it has any.
- A new file's content goes in the list in `src/game.ts`. Files can be renamed
  and split freely, but each scene, stat, prose key or other key is declared
  once: `npm run check` reports one declared twice.
- A pack is different: content from outside the code, with an `id` and a
  `schema`, such as a mod. Packs go in `loadGame`'s third argument and replace
  what the content declares.
- Content is plain data: scenes, choices, conditions, effects, stats and words.
  Prefer data over code.
- How to organise a game: https://ifloom.dev/docs/guide/organising

## How the game is put together

- The engine is deterministic and has no DOM. Randomness is seeded from the save.
- Plugins (a calendar, places, a cast of characters…) are added to `plugins: [...]`
  when the game is loaded, and their content goes under `data.<plugin>`.
- `src/main.ts` draws the game in the browser. The page's layout, the side
  column, the story and its sections, is `src/layout.tsx` with React,
  `src/Layout.vue` with Vue, `src/Layout.svelte` with Svelte and `src/layout.ts`
  in plain JS.

## After every change

- `npm run check` lists anything the game names that doesn't exist. It should print "No problems."
- `npm run playtest` plays the game with no one at the keyboard and writes what it saw.
- `npm run dev` serves the game in a browser; `npm run build` makes one HTML file.
```

It's yours to edit. Add your game's own conventions to it, such as how you name scenes, the tone of the prose, or which plugins the game uses.

## Tips

- **Point it at an example.** The three examples in the repository are whole, working games. Ask the agent to follow `examples/novel` for a story in chapters, `examples/cafe` for a game built on [entities](/docs/reference/entities), or `examples/showcase` for places, characters and a calendar.
- **Have it run `npm run check`** after every change. It loads the game and lists every problem the loader finds, such as a scene, prose key or id that the content names but nothing declares. It prints `No problems.` when there are none, and exits with an error when there are some, so an agent can tell the difference.
- **Have it run `npm run playtest`** to see the game played. The [playtest](/docs/reference/cli#ifloom-playtest) plays a few turns with no one at the keyboard and writes every screen and every command to a text file. An agent can read that file to find a scene that never shows up, a choice that's always greyed out, or a number that never moves.
- **Ask for content as data.** Scenes, conditions and effects are plain objects that `check` can read. A rule written as code is harder for the agent, and for `check`, to verify.

## Next

- [Your first story](/docs/guide/first-story) builds a short game step by step, which is also a good thing to hand an agent as an example of the format.
- [The CLI](/docs/reference/cli) documents `check`, `playtest` and the other commands in full.
