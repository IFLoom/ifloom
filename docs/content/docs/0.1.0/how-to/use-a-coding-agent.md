---
title: "Work with a coding agent"
description: "Give a coding agent the IFLoom docs and a brief for your game, and have it check its own work."
---
Use this when a coding agent, such as Claude Code, Cursor or Codex, writes or changes your game. The agent needs to read the docs and to check what it did, and these steps give it both.

## Give it the docs

Hand the agent one of the files the docs site publishes for language models:

- [`llms-full.txt`](https://ifloom.dev/llms-full.txt) holds every page in one file. Give it to an agent with room for it in its context.
- [`llms.txt`](https://ifloom.dev/llms.txt) lists every page with a link and a one-line description. Give it to an agent with a small context, and let it fetch the pages it needs.

Each page is also plain Markdown under `https://ifloom.dev/llms.mdx/docs/`. The Copy Markdown button at the top of a page copies it, and the Open menu beside it opens the page in ChatGPT, Claude or Cursor. An agent that works offline in a clone of the [IFLoom repository](https://github.com/IFLoom/ifloom) can read the same pages in `docs/content/docs/`.

## Connect it to the MCP server

The docs site runs an MCP server at `https://ifloom.dev/api/mcp`, over streamable HTTP, so the agent searches the docs and fetches single pages. Add it to the agent's MCP settings, such as `.mcp.json` for Claude Code or `.cursor/mcp.json` for Cursor:

```json
{
  "mcpServers": {
    "ifloom": { "url": "https://ifloom.dev/api/mcp" }
  }
}
```

The server has three tools:

- `search` finds pages and headings that match a query.
- `list_pages` lists every page with its path and description.
- `get_page` returns one page as Markdown, given a path such as `/docs/reference/scenes`.

## Let AGENTS.md brief it

Every game that `npm create ifloom` makes has an `AGENTS.md`, which agents read when they start work in a folder. It points the agent at the docs, the MCP server and the three examples. It also says where each kind of content goes, as [Organise your game's files](/docs/0.1.0/how-to/organise-your-files) does, and which commands to run after every change.

Add your game's own conventions to it, such as how you name scenes, the tone of the prose, and which plugins the game uses.

## Have it check its own work

Tell the agent to run these after every change:

1. `npm run check` loads the game and lists every problem, such as a scene, prose key or id that content names and nothing declares. It prints `No problems.` and exits with `0` when there are none, and exits with `1` otherwise.
2. `npm run playtest` plays a few turns with nobody at the keyboard and writes every screen and command to a text file. The agent reads it to find a scene that never shows, a choice that's always refused, or a number that never moves.
3. `npm run typecheck` runs TypeScript, so a field the agent misspelt fails.

## Point it at an example

Ask the agent to follow one of the repository's three examples, which are whole, working games:

- `examples/novel` for a story in chapters.
- `examples/cafe` for a management game built on [entities](/docs/0.1.0/reference/entities).
- `examples/showcase` for places, characters and a calendar.

Ask for content as data, too. Scenes, conditions and effects are plain objects that `check` reads, and a rule written as code is harder for the agent and for `check` to verify.

For more, see:

- [The CLI](/docs/0.1.0/reference/cli), for `check`, `playtest` and the other commands.
- [Playtest and snapshot from the command line](/docs/0.1.0/how-to/playtest-and-snapshot), to put the same checks in CI.
- [The examples](/docs/0.1.0/reference/examples), with each example's files.
