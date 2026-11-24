---
title: "Choosing a UI"
description: "Compare the ready-made React UI with a UI of your own in any framework, and see what each gives you and costs."
---
This page compares the two ways to put a game on screen, so you can pick one. The engine has no UI. A UI has to render the [view](/docs/reference/glossary#view) and send the player's commands, and it's either the ready-made React UI or code of your own. Both run on the same [runner](/docs/reference/runner), so you can start with one and move to the other later without touching your game's content.

## The React UI renders the whole game

`@ifloom/react` renders every part of the game the engine and the plugins put in the view. Its default layout has the story in the main column: the scene, its pictures and spoken lines, its choices with their reasons, then the location the player is at, its exits and the people here. A side column holds the title, the clock, the player's menu, the stats, the things the player holds, and buttons for quests, people, achievements and the rest. Notices sit in a corner, panels and dialogs open over the story, and with `pages` turned on the game opens on a title screen with settings, saves and credits.

Each part shows only when the game has something for it, so a novel with no plugins gets one column of story and a menu. The React UI names no plugin. Each plugin's part comes from that plugin's own `/react` subpath, and the game lists the ones it wants.

It has two entries, for two kinds of reader. `@ifloom/react` is for a game that uses the UI: `mountGame`, the layout's regions, every component and hook, and the options that restyle and replace them. `@ifloom/react/kit` is for building components of your own that look like the UI's: what a plugin's UI is made of, dialogs, and the shadcn/ui primitives. A game that only mounts the UI and restyles it never imports the kit.

You make it your own in steps, each further than the last. A theme preset (`paper`, `terminal`, `studio` or `storybook`) and a few CSS variables change the whole look. Any part can be styled by its `data-part`. Any component can be replaced, and a layout of your own can move, fold or drop any section.

The cost is the stack. The React UI needs React and Tailwind CSS in your build. The `react` and `next` templates set both up, and the build how-tos show the same for webpack and esbuild. It also renders a game the way a game of the ordinary kind looks, so a game whose screen is the whole point will fight its layout sooner or later.

## Your own UI is a loop

A UI of your own is a loop. Render `runner.snapshot()`, send the `command` on whatever the player presses, and render again when the runner says something changed. Any framework can run that loop, or none: the `vanilla` template's whole UI is one file of plain DOM code, and the `vue` and `svelte` templates do the same in their frameworks.

The view makes that loop short. Every button the view lists is a ready `RenderedChoice`, with its label, its price, its reason when refused and the command it sends. So your UI never works out what a choice costs or why it's refused, and never builds a plugin's command. It renders what the view says, in whatever shape you like.

Two packages do the browser jobs every UI needs, so you don't write them again. [`@ifloom/browser`](/docs/reference/browser) makes a runner with saves in the browser, an autosave and undo, ticks timers and minigames, maps the keyboard and shows held-back prose on a key. [`@ifloom/audio`](/docs/reference/browser/audio-player) plays the game's music and sounds. Both are plain DOM and work under any framework, and the React UI uses them too.

The cost is that you write it. The templates start you with the scene, its choices, inputs, stats, minigames and sound. A title screen, a load screen, plugin panels and the rest are yours to add, and the [Render it yourself](/docs/how-to/render/start) how-tos show each one in plain JS, React and Vue.

## Picking one

Pick the React UI when you want a complete game in front of players soon and expect to restyle it rather than rebuild it. It suits a life sim with several plugins best, since every first-party plugin's part is ready.

Pick your own UI when the screen is the point of the game, such as a visual novel's text box or a map you click around, or when the project is already built in another framework. A UI of your own also fits a game with almost no screen, such as a novel, where the loop is a page of code.

## Mixing the two

The choice isn't all or nothing in React. The React UI is made of parts, each a component reading the same view, so a page of your own can use the parts you like, such as its `ChoiceList` under a scene you render yourself. A plugin's React UI is built from the same kit a game's own components use, so a component you write sits beside the plugins' as an equal.

Outside React, the parts don't carry over, but the view does. A Vue or Svelte UI renders the same `RenderedChoice` buttons and the same plugin views, and switching later means rewriting the screen, not the game.

For the details, see [the React UI](/docs/reference/react), [`@ifloom/browser`](/docs/reference/browser) and [The view](/docs/reference/view). [Set up the React UI](/docs/how-to/react/set-up-the-react-ui) and [Start your own UI](/docs/how-to/render/start) are where to begin.
