# 0007. Core features are modules that register, not plugins

**Status:** Accepted, 2026-10-16. Step 1 implemented (settings, audio, media, scenes, stats); the rest of the core moves in step 2.

## Context

Each core feature was spread over about ten engine files: its types, the condition, effect and command switches, the loader's merge, the checks, the view, the state intake and the steps after a command. Adding one meant touching all of them, and the shared switches (`holds`, `explain`, `applyEffect`, `run`, `whyNotIn`, `effectsIn`) ended in `return false` or `default: return state`, so a kind left out of one still compiled.

The plugin API already gathers a system in one place. But making the core features plugins would cost three things a core feature needs:

- **Typed top-level keys.** A plugin is called by name with untyped arguments (`{ custom: 'quests/done', with }`). A core feature's conditions and effects are typed members of `Condition` and `Effect`, such as `{ stat: 'coins', gte: 5 }`, which the compiler and editors check.
- **Top-level state, versioned with the save.** A plugin's state lives in `state.plugins[id]` with a version of its own. A core feature's fields (`stats`, `settings`, `audio`) are top-level fields of `GameState`, carried forward by `SAVE_VERSION` and the engine's `STEPS`.
- **Effects that write across slices.** A `stat` effect calls the game's `rules.onStat`, a level gained raises a notice, and a choice runs whatever effects it lists. A plugin writes only its own slice and goes through `context.apply` for the rest.

Import cycles were the other problem. The reducer imports the plugin module, which imports the reducer back, and the condition, custom and audio modules sit in similar loops. A registry that reads the features when it loads would crash whenever a feature was halfway through loading.

## Decision

A core feature is a module in `packages/engine/src/features/`, declared with `defineFeature`. It's internal and not exported, because games and plugins extend the engine with `definePlugin`. A feature declares, in one place:

- its slice of the state, with each field's start and load defaults;
- its kinds of condition (`holds`, `explain`, `references`), effect (`apply`, `references`) and command (`whyNot`, `run`, `effectsOf`, `ignoresLocks`, `references`), as tables keyed by kind;
- its pack key, with a merge of its own, and the lists its problems name;
- its checks, its piece of the view, and its steps after a command (`afterCommand`, and `fromScreen` for what the one screen of the new state shows);
- its runner hooks, and `requires` for the features it needs.

`features/registry.ts` imports the features and nothing else. It checks `requires` as it loads and merges the features' tables. The core's kinds that no feature owns yet are one provisional feature-like table in `core.ts`, which hands them to the registry's `withCore` for the complete tables (`KINDS`). Every shared switch is now a lookup in those tables, typed so that a kind with no entry fails to compile. A condition is looked up by its one kind key, and the checker reports a condition with none or several, an effect kind and a command type the engine doesn't have.

Features are leaves. A feature never imports `reduce.ts`, `condition.ts`, `availability.ts`, `explain.ts`, `check.ts`, `loader.ts`, `intake.ts`, `screen.ts`, `view.ts`, `core.ts` or the registry, not even for a type, and nothing it loads at runtime loads those back. What it needs from the core (`holds`, `runEffects`, `endTurn`, `weighted`, `roll`, custom values, plugins' audio, a scene by id) comes in a `FeatureContext` argument, as a plugin's context does. So the registry can be built at load in any import order. `tests/contracts/features.test.ts` holds this.

The public types are built from the pieces: `Condition`, `Effect` and `Command` from the core's kind maps and the features', and `GameState`, `Game`, `Pack` and `View` as a base plus each feature's piece. `tests/contracts/types.test.ts` holds each to a frozen copy of its old shape, both ways.

## Why

- A feature is read, changed and checked in one file, and the shared code names no feature.
- A kind can't be half-added: the tables are complete or the engine doesn't compile, and content that names a kind the engine lacks is reported instead of quietly skipped.
- Feature tables are plain data read through the context, so there's no load-order rule to remember.
- Settings, audio and the rest keep their typed keys and their place in the save, which plugins can't offer.
