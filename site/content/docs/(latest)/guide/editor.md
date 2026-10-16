---
title: "The editor"
description: Write scenes, choices, stats and storylets in the browser at /editor, play them in the real React UI as you go, and export the pack as TypeScript or JSON to drop into a game.
---
The [editor](/editor) lets you write a story in your browser and play it as you go, without installing anything. You build scenes and choices from forms, see each change in the React UI beside them, and export the result as a pack. When the story outgrows the editor, you move the pack into a game project and carry on in code.

It runs entirely in the page. Your projects are kept in the browser's storage on your own machine, and nothing is uploaded.

## What you can make

A project is one [pack](/docs/reference/loader#pack). The outline on the left lists what's in it:

- **Scenes**, each a [data scene](/docs/reference/scenes#datascene). You give it a title, a speaker, tags and body blocks, and each block is prose or a picture with an optional condition. A scene with sets in "Drawn from" is a [storylet](/docs/reference/storylets), marked in the outline.
- **Choices** in each scene. A choice has a label, a cost in stats, a condition for showing it, reasons to grey it out, and its effects.
- **Stats**, with every field of a [`StatDef`](/docs/reference/stats#statdef), including levels, rounding, how it's displayed and a derived formula.
- **Variables**. They need no declaration, so the editor only keeps a note of what each one is for. The note goes into the TypeScript export as a comment.
- **Items**, with what using one does.

Conditions and effects come from menus. Wherever a form asks for a scene, a stat, an item or a variable, it offers the ones that exist, and "Add new…" makes another. Renaming anything in the form's header renames it everywhere it's named. That includes the prose keys that follow a scene's id, such as `market#buy`.

### Choices with a cost

A cost is a stat the choice spends. It's kept as a [`stat` effect](/docs/reference/effects#stat) with a negative `by`, at the front of the choice's effects. When the stat is [spendable](/docs/reference/stats#statdef), the button shows the price. "Block it when short" adds a `blocked` reason, so the button is greyed out with a line such as "You need 3 coins." while the player can't pay.

### Prose

Each block's words live under a [prose key](/docs/reference/prose#prose-keys). The editor names keys after the scene and choice ids (`market`, `market/2`, `market#buy`), and you can change a block's key by editing it above the text. The toolbar inserts each kind of [markup](/docs/reference/prose#markup): pictures, video, sound, voice lines, speaker lines, thoughts and pool pictures. Beside the text, the editor shows the beats the engine reads from it.

Pictures and videos are paths only. Nothing is uploaded, so the preview draws each one as a labelled box with its path. Put the files in your game's `art/` folder when you move to a project.

## Playing it

The preview on the right runs your project with the real [React UI](/docs/react), with any of the [theme presets](/docs/react/customising). It rebuilds a moment after each change and carries on from the scene on screen. Restart starts the game again, from the intro or from the scene you pick in "Start at". "Play from here" on a scene opens it straight away.

The Problems tab lists what [`checkGame`](/docs/reference/checks#checkgame) finds, such as a choice with no label or an effect that names a scene that isn't there. Click one to open the form it concerns. The same problems show above each form, and a red dot marks them in the outline.

### Plugins

Project settings has a switch for each first-party plugin, with the options its function is called with as JSON. The preview runs the plugins you switch on. Their content goes in the pack's `data` as JSON, and their conditions and effects are entered as JSON in the builders, such as `{ "quests/done": { "quest": "errand" } }`. Proper forms for plugins come later.

## Export and import

The buttons across the top export the project's pack:

- **Export TS** downloads a module with `export const <name>: Pack = { … }`, formatted like the examples, with a note of the variables it uses and how to load it.
- **Export JSON** downloads the same pack as JSON, the format a [mod](/docs/reference/mods) uses.

Import JSON opens a JSON pack as a new project and lists what `checkGame` makes of it. The editor can't read TypeScript you've written by hand, and it opens only data scenes.

## Moving to a project

When you want a world with places and a clock, hand-written scenes or your own UI, move the pack into a game:

1. Follow [Installation](/docs/guide/installation), then make a game with `npm run new -- my-story` and run `npm install`.
2. Export the project as TypeScript, and save the file in the game's `src/` folder, say as `src/market-day.ts`.
3. Load it in `src/game.ts`, with the title and intro scene the export's comment gives:

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { marketDay } from './market-day.ts'

export default loadGame([marketDay], { id: 'market-day', title: 'Market day', introScene: 'market' })
```

Then run `npm run dev -w my-story`, and carry on from [Your first story](/docs/guide/first-story). Plugins you used in the preview go in the base game's `plugins`, as [A game with a world](/docs/guide/first-game) shows.

## Snippets

[Snippets](/editor/snippets) has the editor's builders on their own: a condition, a list of effects, a stat, an item, a setting and the prose markup helper. Each shows the TypeScript it makes, with a Copy button, for pasting into a game you're already writing in code.

## What it doesn't do

- **Only part of the engine has forms.** Scenes, choices, stats, variables and items do. Activities, triggers, inputs, collections, entities, settings and audio tracks don't, so add those in code once you've moved to a project. A choice's `labels` and a block's variants are edited as JSON.
- **Drafts stay in this browser.** Clearing the site's data deletes them, and they don't follow you to another machine. Export anything you want to keep.
- **One pack per project.** A game made of several packs is a project you build in code.
