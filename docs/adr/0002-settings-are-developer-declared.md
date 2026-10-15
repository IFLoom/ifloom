# 0002. Settings are declared by the game

**Status:** Accepted, 2026-10-16

## Context

Players expect a settings screen, and it's tempting to give every game a standard set: an art style, a text-only mode, volume presets. But the engine runs very different shapes of game, from a linear novel with no sound to a management game with no pictures. Any setting the engine ships would be wrong for some of them.

## Decision

The engine has no settings of its own. A game declares every setting it offers in `game.settings` (or a pack's `settings`), and the engine only stores, checks and reads them.

## Why

- It follows the engine's "no genre, no game" rule. The engine knows no stat, place or person by name, and the same goes for preferences.
- A setting the game didn't ask for is one it has to hide, test or explain.
- Audio and the React UI read settings by the ids the game names (`game.audio.mute`, a channel's `volume`), so they need nothing built in to work.
