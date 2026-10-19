---
title: "The editor"
description: Write scenes, choices, stats and storylets in the browser at /editor, play them in the real React UI as you go, and export them as TypeScript content for a game or a JSON pack to share.
---
The [editor](/editor) lets you write a story in your browser and play it as you go, without installing anything. You build scenes and choices from forms, see each change in the React UI beside them, and export the result as a file of content for a game. When the story outgrows the editor, you move it into a game project and carry on in code.

It runs entirely in the page. Your projects are kept in the browser's storage on your own machine, and nothing is uploaded.

## What you can make

A project is one file of [content](/docs/reference/loader#content-and-packs). The outline on the left lists what's in it:

- **Scenes**, each a [data scene](/docs/reference/scenes#datascene). You give it a title, a speaker, tags and body blocks, and each block is prose or a picture with an optional condition. A scene with sets in "Drawn from" is a [storylet](/docs/reference/storylets), marked in the outline.
- **Choices** in each scene. A choice has a label, a cost in stats, a condition for showing it, reasons to grey it out, and its effects.
- **Stats**, with every field of a [`StatDef`](/docs/reference/stats#statdef), including levels, rounding, how it's displayed and a derived formula.
- **Key–values (kv)**, the keys of the kv store. They need no declaration, so the editor only keeps a note of what each one is for. The note goes into the TypeScript export as a comment.
- **Kinds**, each a [`KindDef`](/docs/reference/entities#kinddef): its label and plural, whether it's `unique` (each one a particular thing that can hold others), whether the view [lists](/docs/reference/entities#listing) its entities (always, never, or while a condition holds, with `'$'` as each one), its tags, its flags and the traits every one of it starts with.
- **Things**, the [entities](/docs/reference/entities) of every kind, grouped by kind in the outline. Each has a name, a description, a picture path, tags, who holds how many at the start (its `at`), a condition that narrows its listing, starting stats and kv, and its [traits](/docs/reference/entities#traits). The first-party traits have forms: the [inventory](/docs/plugins/inventory)'s `usable`, the [wardrobe](/docs/plugins/wardrobe)'s `wearable`, the [shop](/docs/plugins/shop)'s `sellable` and the [cast](/docs/plugins/cast)'s `person`. Any other trait, and a person's schedule and calls, are JSON. A thing you add is of the `item` kind unless you name another, as in `food:bun`, and the editor declares its kind if the project doesn't have it.

Conditions and effects come from menus. Wherever a form asks for a scene, a stat, a thing, a kind or a kv key, it offers the ones that exist, and "Add new…" makes another. The menus for things cover what a holder [holds](/docs/reference/entities#holding-things) (`entity`), how many things match (`count`, with its kind, holder, tag and trait), giving and taking (`entity`), moving a thing between holders (`move`) and who the player plays (`you`). The holders offered are `'you'`, the player, and the unique entities the project has, including the places' locations and the shop's vendors in its plugin content. Renaming anything in the form's header renames it everywhere it's named. That includes the prose keys that follow a scene's id, such as `market#buy`, and every reference to a kind's things when you rename the kind.

### Choices with a cost

A cost is a stat the choice spends. It's kept as a [`stat` effect](/docs/reference/effects#stat) with a negative `by`, at the front of the choice's effects. When the stat is [spendable](/docs/reference/stats#statdef), the button shows the price. "Block it when short" adds a `blocked` reason, so the button is greyed out with a line such as "You need 3 coins." while the player can't pay.

### Prose

Each block's words live under a [prose key](/docs/reference/prose#prose-keys). The editor names keys after the scene and choice ids (`market`, `market/2`, `market#buy`), and you can change a block's key by editing it above the text. The toolbar inserts each kind of [markup](/docs/reference/prose#markup): pictures, video, sound, voice lines, speaker lines, thoughts, pool pictures, a pause before what follows (`[[reveal]]`), an inline action (`[[act:id|words]]`) and a tooltip (`[[tip:key|words]]`). The last two go in the line at the cursor, not in a paragraph of their own. Beside the text, the editor shows the beats the engine reads from it, with inline actions as links and tooltips underlined.

A choice the body draws inline is marked "in the text" in the list of choices, and its form says which prose holds it. "Put it in the text" adds `[[act:id]]` to the end of the last text block. Under "More", a choice can send a command as well as its effects, written as JSON. Renaming a choice renames its `[[act:]]` in the scene's prose too. See [Actions and tooltips in the text](/docs/recipes/inline-actions).

A block's "Reveal it after a pause" box gives it a [`reveal`](/docs/reference/transitions#reveals): how long it waits and how it comes in. The scene's own fields have menus for how it comes in and goes out, and its effects can say how the next screen arrives. See [Transitions](/docs/recipes/transitions).

Pictures and videos are paths only. Nothing is uploaded, so the preview draws each one as a labelled box with its path. Put the files in your game's `art/` folder when you move to a project.

## Playing it

The preview on the right runs your project with the real [React UI](/docs/react), with any of the [theme presets](/docs/react/customising). It rebuilds a moment after each change and carries on from the scene on screen. Restart starts the game again, from the intro or from the scene you pick in "Start at". "Play from here" on a scene opens it straight away.

The Problems tab lists what [`checkGame`](/docs/reference/checks#checkgame) finds, such as a choice with no label or an effect that names a scene that isn't there. Click one to open the form it concerns. The same problems show above each form, and a red dot marks them in the outline.

### Plugins

Project settings has a switch for each first-party plugin, with the options its function is called with as JSON. The preview runs the plugins you switch on. Their content goes in the project's `data` as JSON, and their conditions and effects are entered as JSON in the builders, such as `{ "quests/done": { "quest": "errand" } }`. Proper forms for plugins come later.

## Export and import

The buttons across the top export the project two ways:

- **Export TS** downloads a module with `export const <name>: Content = { … }`, [content](/docs/reference/loader#content) for your game's `src/story/` folder. It's formatted like the examples, with a note of the kv keys it uses and how to add it to the game.
- **Export JSON** downloads the project as a [pack](/docs/reference/loader#pack), with the project's id and the [`SCHEMA`](/docs/reference/loader#schema) it was written for. That's the shape a [mod](/docs/reference/mods)'s pack has, so use it to share the story or to make a mod of it.

Import JSON opens either one as a new project and lists what `checkGame` makes of it: a pack, which is upgraded if it was written for an older schema, or content with no id or schema, which takes its id from the file's name. The editor can't read TypeScript, and it opens only data scenes.

## Moving to a project

When you want a world with places and a clock, hand-written scenes or your own UI, move the project into a game:

1. Make a game with `npm create ifloom@latest my-story`, as [Installation](/docs/guide/installation) shows, and run `npm install` in its folder.
2. Export the project as TypeScript, and save the file in the game's `src/story/` folder, say as `src/story/market-day.ts`. It's part of the story, so it goes beside the template's `opening.ts` (see [Organising a game](/docs/guide/organising)).
3. Load it in `src/game.ts`, with the title and intro scene the export's comment gives:

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { stats } from './world/stats.ts'
import { marketDay } from './story/market-day.ts'

export default loadGame([stats, marketDay], { id: 'market-day', title: 'Market day', introScene: 'market' })
```

Delete `src/story/opening.ts` if you don't want the template's two scenes. If your export declares a stat the template's `src/world/stats.ts` declares too, `npm run check` reports it as declared twice, so you can keep one.

Then run `npm run dev`, and carry on from [Your first story](/docs/guide/first-story). Plugins you used in the preview go in the base game's `plugins`, as [A game with a world](/docs/guide/first-game) shows.

## Snippets

[Snippets](/editor/snippets) has the editor's builders on their own: a condition, a list of effects, a stat, a thing, a setting and the prose markup helper. Each shows the TypeScript it makes, with a Copy button, for pasting into a game you're already writing in code.

## What it doesn't do

- **Only part of the engine has forms.** Scenes, choices, stats, kv keys, kinds and things do. Activities, triggers, inputs, settings and audio tracks don't, so add those in code once you've moved to a project. A choice's `labels` and a block's variants are edited as JSON.
- **Drafts stay in this browser.** Clearing the site's data deletes them, and they don't follow you to another machine. Export anything you want to keep.
- **One file per project.** A game made of several files is a project you build in code.
