# IFLoom

An interactive fiction engine for any shape of game: a linear novel with a few
choices remembered, a management game run a week at a time, or a living world
with a calendar, places to go and characters on their own schedules. The core
keeps turns, scenes, stats and entities; plugins add the calendar and the rest.

Games built on it compile to a static folder — one `index.html` plus its
pictures — that opens from disk or uploads to itch.io as it is.

**Status:** pre-release and private. The engine is being lifted out of the game
it was built for, one piece at a time; nothing here is a stable API yet.

## Packages

| Package | What it is |
|---|---|
| `@ifloom/engine` | State, commands, scenes, conditions, effects, saves. Pure TypeScript, no DOM. |

## Working on it

```bash
npm install
npm test
npm run typecheck
```

## Rules the engine keeps

- **Deterministic.** Nothing is random at runtime. Every draw is hashed from the
  save's seed, the turn and a name, so the same save deals the same cards. That
  is what makes undo, snapshots and scripted playtests possible.
- **Nothing loads at runtime.** No `fetch()` and no dynamic `import()`: a game
  opened from disk can do neither, so everything is bundled when it is built.
- **Genre-neutral.** The engine has no opinions about what a game is about.

## Licence

MIT. See [LICENSE](LICENSE).
