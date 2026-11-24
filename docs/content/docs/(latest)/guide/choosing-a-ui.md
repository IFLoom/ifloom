---
title: "Choosing a UI"
description: "The start of the UI track: use the ready-made React UI, @ifloom/react, with its presets and parts you can replace, or build your own UI on the runner in plain JS, React, Vue or Svelte. What each gives you and costs."
---
The engine has no UI. Something has to draw the [view](/docs/reference/view) and send the player's commands, and you have two ways to do that. Both run on the same [runner](/docs/guide/running-a-game), so you can start with one and move to the other later without touching your game's content.

| | The React UI | Your own UI |
|---|---|---|
| Package | `@ifloom/react` | none: your code, with `@ifloom/browser` and `@ifloom/audio` |
| Framework | React, with Tailwind CSS | Anything: plain JS, React, Vue, Svelte… |
| Template | `react` (the default) or `next` | `vanilla`, `vue` or `svelte` |
| You get | The whole game drawn: scenes, choices with reasons, stats, inputs, minigames, a title screen, settings, saves, the backlog, mods, and panels for several plugins | What you write. The templates start you with the scene, choices, inputs, stats, minigames and sound |
| Its look | Four theme presets, CSS variables, styling by `data-part`, or any component replaced | Yours from the start |
| Best for | Getting a complete game in front of players quickly, then making it your own | A game whose screen is the point, or a project already built in another framework |

## The React UI

`@ifloom/react` draws the whole game. The `react` template's `src/main.ts` is a single call to [`mountGame`](/docs/react#mountgame), which makes the runner, starts the audio player when the game has sound, and draws everything into the page. From there, these pages take it further:

- [The React UI](/docs/react) covers `mountGame`, `GameShell`, layouts, the title screen and other pages, sound and its words.
- [Make it your own](/docs/react/customising) goes from a theme preset (`paper`, `terminal`, `studio` or `storybook`) and a few CSS variables, through styling any part by its `data-part`, to replacing a component or the whole frame.
- [Extending](/docs/react/extending) adds your own panels and screens.
- [Components](/docs/react/components) lists every part, with its props.

It needs React and Tailwind in your build. The `react` template sets both up on the `ifloom` CLI, and the [Next](/docs/recipes/next), [webpack](/docs/recipes/webpack) and [esbuild](/docs/recipes/esbuild) recipes show the same with those tools.

## Your own UI

A UI of your own is a loop: draw `runner.view()`, send the `command` on whatever the player presses, and draw again when the runner says something changed. The `vanilla` template's whole UI is one file of plain JS, `src/main.ts`.

- [A UI from scratch](/docs/guide/ui-from-scratch) explains that plain JS UI a piece at a time, then adds undo, saves and a setting.
- [Your own UI in any framework](/docs/guide/frameworks) shows the same UI in plain JS, React by hand, Vue and Svelte, side by side.
- Every reference and plugin page for something the player sees, such as [stats](/docs/reference/stats#drawing-it), [timers](/docs/reference/timers#drawing-it) or [the shop](/docs/plugins/shop#drawing-it), has a **Drawing it** section. It says what the view hands a UI, then draws it in plain JS, with the React UI's ready-made part, and in Vue. That code is type-checked and tested against Small Town, so it runs as shown.
- The recipes build the pieces most games want in each framework: a [title screen](/docs/recipes/title-screen), a [HUD](/docs/recipes/hud), [plugin panels](/docs/recipes/plugin-ui), [minigames](/docs/recipes/minigames), [transitions](/docs/recipes/transitions) and [actions inside the text](/docs/recipes/inline-actions).

Two packages do the browser jobs every UI needs, so you don't write them again. [`@ifloom/browser`](/docs/browser) runs a minigame's clock and the keyboard shortcuts, numbers new save slots and gives a key that shows held-back prose. [`@ifloom/audio`](/docs/browser/audio-player) plays the game's music and sounds. Both are plain DOM and work under any framework.

## Mixing the two

The React UI is made of parts, and each part is a React component reading the same view. In React you can use the parts you like inside a page of your own, such as its [`ChoiceList`](/docs/react/components#choicelist) under your own scene drawing. See [Write your own root](/docs/react/customising#8-write-your-own-root).

Next: [A UI from scratch](/docs/guide/ui-from-scratch), or [The React UI](/docs/react).
