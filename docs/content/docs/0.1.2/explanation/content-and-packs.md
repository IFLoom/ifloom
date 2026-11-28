---
title: "Content, packs and the base"
description: "Why loadGame takes a game as content, packs and a base, and what a mod, a save and an upgrade can change in each."
---
`loadGame` takes a game in three parts: its content, merged, a base, and packs from outside the game's code over the top. The split decides what a mod can change, what a save records, and what the engine upgrades when it moves on.

## Three inputs to loadGame

[`loadGame(content, base, { packs })`](/docs/0.1.2/reference/content#loadgame) returns one `Game`, and each of its arguments has its own job:

- **Content** is the game's own data, in its own files: the scenes, stats, entities, prose and the plugins' content. It is a list of [`Content`](/docs/0.1.2/reference/content#content) objects, one per file, such as `src/world/stats.ts` and `src/story/cafe.ts`.
- **The base** says which game this is and holds its code. It has the game's `id`, `title` and `version`, the `plugins` it uses, and its `rules`, and nothing else.
- **Packs** come from outside the game's code, such as a player's mod or content a supporter code unlocks. Each is a [`Pack`](/docs/0.1.2/reference/content#pack), and `loadGame` lays the packs over the content in order.

`loadGame` merges the plugins' own content first, then your content, then the packs, and checks the result. It reports each problem against the file or pack that caused it, so a mod author reads `mod:spicier · scene allie.talk · …` rather than a stack trace.

## The base holds only code and identity

The base is small on purpose. It holds the facts no mod should change: which game this is, which version, which plugins run, and the game's code. Anything a mod could reasonably want to change, such as a scene, a stat, a price or a plugin's list of quests, is content, even when you'd never think to change it yourself.

That rule settles a lot of small questions. A plugin's list of achievements goes in content's `data`, not in the plugin's options, because a mod might add one. A plugin's options are only code a mod can't change, such as where the player starts. `loadGame` reports a key in the wrong place, such as `rules` in a content file or a scene in the base, and leaves it out.

## Rules are the game's code

Some of a game is code rather than data, such as the sum of the café's takings at the end of a week. That code goes in the base's `rules`, a plain object with the same members a plugin has: hooks the engine calls at fixed moments, and conditions, effects, macros and values that content calls by name with `game/` in front. The engine runs the rules as the first plugin, with the same context, so nothing the game writes is special.

Keeping code out of content keeps content data. Content says `{ 'game/wages': true }`, and the function stays in `src/rules.ts`. A pack can call the same function by the same name, but it can't replace it, so a mod can rearrange what the game does without running code of its own. [Write your own condition, effect or macro](/docs/0.1.2/how-to/write-your-own-condition-or-effect) shows how.

## Why a game's files are content and a mod is a pack

Your own files and a mod both hold scenes and stats, and the engine could have treated them alike. It doesn't, because they differ in three ways:

- **Who owns the ids.** Your content declares each scene, stat and prose key once across all its files, and `loadGame` reports a key declared twice as a mistake. A pack declares keys again on purpose, because changing your game is what it's for. It replaces whatever it repeats, and the last pack wins.
- **What a save records.** Content has no id, so renaming a file or splitting one in two changes nothing a player can see. A pack has an `id`, and saves record the packs they were made with, so loading a save tells the player about a mod they've since removed.
- **What the engine upgrades.** Content is compiled with the engine you build it with, so TypeScript reports anything the engine renamed. A pack was written for some older engine and arrives as data, so it carries a `schema`, and [`upgradePack`](/docs/0.1.2/reference/content#upgradepack) carries it forward when it loads.

So the game's own files are never called packs, and your `src/world/` and `src/story/` hold no packs. Content a supporter code unlocks is a pack too. It sits in `src/unlocks/`, and `ifloom build` encrypts it into the page.

## How merging works

Content merges by id or key. Two files can each add scenes, and each scene id appears once across them. Lists keep the order you combined the files in, so triggers fire in that order and plugins list their entries in it. Moving a scene from one file to another changes nothing.

A pack replaces a thing with the same id whole. Its scene replaces the scene, and its entity replaces the entity, so a mod that wants to change one field declares the whole thing again. Two small tools make that lighter. A scene's [`Patch`](/docs/0.1.2/reference/content#patch) changes its choices without restating it. The [`traits` table](/docs/0.1.2/reference/content#traits) changes one trait on one entity with one row, which is why a mod changes how the shop prices a scarf without writing the scarf out again.

The engine carries translations the same way. A translation is one pack with a [words table](/docs/0.1.2/reference/glossary#words-table), its prose and its strings. The words table gives other words for the fields a player reads, such as `entity.character:ava.name`, and `loadGame` lays it over the merged game last.

## What each part lets change

The split gives each part a different kind of freedom. You can rename, split and move content files at will, because nothing outside the game names them, but keep the ids inside them stable once players have saves. Packs can replace any content, because their problems are pinned on their ids and saves remember which packs they were made with. The base changes only when you ship a new version of the game, and its `version` is what tells a save's migrations how far to carry it.

For the details, see [Content and packs](/docs/0.1.2/reference/content), [The game](/docs/0.1.2/reference/game), [Rules](/docs/0.1.2/reference/rules) and [Mods](/docs/0.1.2/reference/mods). [Organise your game's files](/docs/0.1.2/how-to/organise-your-files) and [Let players add mods](/docs/0.1.2/how-to/let-players-add-mods) are the tasks.
