# 0005. Random events are storylets

**Status:** Accepted, 2026-10-16

## Context

Many games want random events: a customer walking in, a chance meeting, something on the news. One way to build that is a registry of events, or "decks" of cards with their own draw rules. That would be a second kind of content alongside scenes, with its own conditions, weights and checks.

## Decision

A random event is a scene that names the sets it can be drawn from in `drawnFrom`. The `{ kind: 'scene', from }` effect draws one of the eligible scenes in a set, using each scene's own `when` and `weight`.

## Why

- Events are written, checked and rendered like any other scene, so there's nothing extra to learn.
- The draw goes through the engine's seeded random, so it stays deterministic.
- A scene can be in more than one set, and the same scene can also be opened directly, which a separate event registry would make awkward.
