# 0003. Plugins cooperate by name and never require each other

**Status:** Accepted, 2026-10-16

## Context

Plugins often work better together. The cast plugin can use places to say who is in the room, and quests can react to messages. Letting one plugin import or require another would make that easy, but it would tie games to bundles of plugins they don't all need.

## Decision

A first-party plugin imports only `@ifloom/engine` and requires no other plugin. It may work with others when the game has them, by name only: it lists them in `cooperates` and asks them through conditions, effects and `query`.

## Why

- A game can take any subset of plugins, including none, and each still works on its own.
- Each plugin can be tested, documented and versioned alone. `tests/contracts/boundary.test.ts` holds every plugin to it.
- Bundles such as `@ifloom/phone` wire plugins together without the plugins knowing about the bundle.
