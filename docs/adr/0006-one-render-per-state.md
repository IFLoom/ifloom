# 0006. One render per state

**Status:** Accepted and implemented, 2026-10-16

## Context

The reducer did render work after every command. It rendered the open scene again to learn its audio, and built the whole view just to find the pool picks, which `poolPick` wrote into a module variable (`noting`) as a side effect of rendering. So the reducer imported the view. A scene was also rendered again for each choice's `whyNot`, `warningOf` and `effectsOf`, and a command in the browser built up to five views of the same state: the runner's, the reducer's, the backlog's, React's and the audio player's. Two more module variables, `ending` in the reducer and `applier` in the plugin module, carried state that callers had to know about.

## Decision

A public `screen(state, game)` draws one state once: the open scene or the room, its choices with their effects, availability and price, the stage, the plugins' views, and the pool picks and audio it implies, as data. The scene is rendered once per screen and shared by every question about it. `view` only formats a screen. The reducer records picks and started tracks from one `screen` of the new state and never imports the view.

The module variables go:

- **`noting`.** Picks are collected in a record passed down explicitly: `picks` on a plugin's view context and on `SceneCtx`, which a plugin or a hand-built scene passes to `stageView` and `renderScene`.
- **`ending`.** A turn's end passes `ending` through `runEffects`, plugin effects, `turn` hooks and `context.apply`.
- **`applier`.** The plugin module imports the reducer's `runEffects`. That's an import cycle, and a needed one: applying effects runs plugins, and plugins apply effects. It's safe because neither module runs anything when it loads.

`runner.view()` keeps one view per state object, and the backlog, the React UI and `@ifloom/audio` all read it.

## Why

- The reducer stays about state. What a state shows is worked out in one place, so the picks recorded are exactly the ones on screen.
- A module variable is an ordering rule nobody can see. Passing the data makes the rule visible in the signatures.
- One render and one view per state keeps a command cheap however many choices a scene has.
