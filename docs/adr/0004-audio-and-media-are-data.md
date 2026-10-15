# 0004. Audio and media are data in the engine, played by the UI

**Status:** Accepted, 2026-10-16

## Context

A game needs music, sounds, pictures and video, and the obvious place to play them is wherever the code that changes the scene runs. But the engine has to stay deterministic, replay a command log to the same game, and run headless in tests and the CLI, where there is no browser to play anything.

## Decision

The engine works out what should be playing or showing and puts it in the view as data (`view.audio`, the scene's media and stage). A UI or `@ifloom/audio` plays it, and the engine never touches a media element.

## Why

- The state stays the single source of truth, so a replay or a loaded save gives the same sound and pictures without recording what played.
- Tests, snapshots and `ifloom playtest` run without a browser and can still check what a scene would play.
- Any UI can play the same data, and `@ifloom/audio` imports only the engine.
