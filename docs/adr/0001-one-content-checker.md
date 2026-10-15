# 0001. One content checker

**Status:** Accepted and implemented, 2026-10-16

## Context

The engine checked content in two places. `loadGame` checked a loaded game's packs, and `validatePack` checked a hand-built one, with its own list of what each condition, effect and command names. The two lists drifted, so some mistakes (an item in `{ has }`, an item's `use` effects) were caught by one path and missed by the other, and a hand-built game's problems could be printed twice in two formats.

## Decision

There is one public checker, `checkGame(game, { probes? })`, which runs on any `Game` and returns its problems and the files it names. `loadGame` calls it and only adds which pack each problem came from, and `validatePack` is removed. What each kind of condition, effect and command names is one table, `references.ts`, and plugins declare `references` for their own calls and content. It's implemented in `packages/engine/src/check.ts` and `references.ts`, and the commit is coming.

## Why

- One walk over the content means one list of rules to keep, so a new condition or effect kind can't be checked in one place and forgotten in the other.
- A hand-built game and a loaded one get the same checks and the same messages.
- The CLI can check files on disk against what the checker says the game names, instead of guessing from the shape of the content.
