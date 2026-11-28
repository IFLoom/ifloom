---
title: "Glossary"
description: "One definition for each word the IFLoom docs use, with links to the explanation and the reference entry for each."
---
Each word the docs use has one meaning, defined here in a sentence or two. Every entry links to the page that explains the idea and the reference entry that documents it. Code names, such as `drawChoices` or `RoomScene`, keep their spelling even where the prose word differs.

## action

A button outside a scene's choices, an [`ActionDef`](/docs/reference/actions#actiondef) with a `label`, `when`, `blocked`, `cost`, `effects`, a `command` and `once`, sent as `{ type: 'action', id }`. An action without a label is no button, and only its command does it. See [State, commands and the view](/docs/explanation/state-and-commands).

## amount

A number content names that the engine works out when it reads it, such as a stat, a kv key's number or a count. See [`Amount`](/docs/reference/amounts#amount).

## base

The second argument of [`loadGame`](/docs/reference/content#loadgame), which holds the game's `id`, `title`, `version`, `plugins`, `receivers` and `rules`, and nothing a mod could change. See [`GameBase`](/docs/reference/content#gamebase) and [Content, packs and the base](/docs/explanation/content-and-packs).

## beat

One piece of a scene's body as the view renders it, such as a paragraph, a spoken line, a picture or a past choice. Content writes blocks, and the view has beats. See [`SceneBeat`](/docs/reference/prose#scenebeat).

## block

One entry of a scene's body in content, such as `text()`, `say()`, `decide()` or `{ prose }`. See [`Block`](/docs/reference/scenes#block).

## blocked

A reason something can be refused, `{ when, reason, hide? }`, refused while `when` holds. A vendor's opening hours are one. See [`Blocked`](/docs/reference/actions#blocked).

## body

A scene's list of [blocks](#block), which the view renders as [beats](#beat). See [`DataScene`](/docs/reference/scenes#datascene).

## button

The control a UI renders for a [choice](#choice) or an [action](#action), from its [`RenderedChoice`](/docs/reference/view#renderedchoice). The word means the control only, never the choice or action behind it.

## character

An entity carrying the cast plugin's `cast/person` trait, of the kind `character`, with a schedule and lines. See the [cast plugin](/docs/reference/plugins/cast) and [Entities, things and traits](/docs/explanation/entities-and-traits).

## choice

An option a scene offers, in its `choices` or a [decision](#decision), which the player chooses. See [`Choice`](/docs/reference/scenes#choice).

## choose

The player's act of taking a [choice](#choice), recorded in [`state.chosen`](/docs/reference/state#chosen) and read by the [`chose`](/docs/reference/conditions#chose) condition. The player never picks a choice, since a pick is random.

## condition

A test of the state written as data, such as `{ stat: 'coins', gte: 3 }`, that holds or doesn't. See [`Condition`](/docs/reference/conditions#condition) and [State, commands and the view](/docs/explanation/state-and-commands).

## content

The game's own data in its files, a [`Content`](/docs/reference/content#content) per file with no id or schema, each key declared once across the files. See [Content, packs and the base](/docs/explanation/content-and-packs).

## content checker

[`checkGame`](/docs/reference/checks#checkgame), the one walk that checks a game's content and lists the files it names. [`loadGame`](/docs/reference/content#loadgame) runs it.

## content migrations

The steps that carry a [pack](#pack) written for an older [`SCHEMA`](/docs/reference/content#schema) forward, run by [`upgradePack`](/docs/reference/content#upgradepack). Each plugin carries its own content forward with its [content migrations](/docs/reference/plugin-migrations).

## cost

The stats an action or a choice spends, checked before it runs and shown on its button as a price. See [`ActionCost`](/docs/reference/actions#actioncost).

## decision

A `{ decide, choices }` block, written `decide()`, where a [flow](#flow) waits for the player to choose. See [Flows](/docs/reference/flows).

## description

The line that describes a thing, an entity, a status, an achievement, a quest, a cheat, a job or an unlock. Never `desc` or `summary`.

## draw

A seeded random pick, such as [`draw`](/docs/reference/random#draw), a pool's pick, a set of variants or a vendor's daily discounts. The word never means rendering. See [Why IFLoom works this way](/docs/explanation/design).

## effect

A change to the state written as data, told apart by its key, such as `{ stat: 'coins', by: -2 }` or `{ scene: null }`. See [Effects](/docs/reference/effects#effect).

## entity

A member of a [kind](#kind), such as a character, a location, a vendor or a sandwich. Content declares its name, description, picture, tags, traits and starting values, and the save keeps only what play changed. See [Entities](/docs/reference/entities#entitydef) and [Entities, things and traits](/docs/explanation/entities-and-traits).

## entity reference

An entity's kind and id joined by `:`, such as `'character:ava'`, which the engine hands back as an [`EntityRef`](/docs/reference/common#entityref).

## flags

A kind's named true/false conditions, asked of each listed entity with `'$'` as it, and answered in the view as each entity's `flags`, such as `{ met: true }`. The word never means the kv store. See [`KindDef`](/docs/reference/entities#kinddef).

## flow

A scene's body read top to bottom as the player chooses. It waits at a [decision](#decision), shows the chosen choice's `then`, and carries on after it. See [Flows](/docs/reference/flows).

## fold

A section of a scene the player opens and shuts, written `fold()`. It's presentation only, the React UI's `fold` hint, and never state. See [Flows](/docs/reference/flows).

## game module

The default export of a game's `src/game.ts`, made by `defineGame`, which the page and the CLI both build the game from. See [The game module](/docs/reference/cli#the-game-module).

## good

A vendor's entry for a thing it sells, with a price and stock, written as a `GoodDef` in its `goods`. The thing sold is a [thing](#thing). See the [shop plugin](/docs/reference/plugins/shop).

## helper

Code started beside a runner that works on it from outside, such as [`startClock`](/docs/reference/browser#startclock), in one call that returns the way to stop it. A helper with something for the player reports it in the snapshot's `helpers`. See [`setHelper`](/docs/reference/runner#sethelper).

## here

The location the player is at now, read with the places plugin's `places/here`. See the [places plugin](/docs/reference/plugins/places).

## holder

The [inventory plugin](/docs/reference/plugins/inventory)'s word for who carries things, `'player'`, a unique entity or `'you'`. The engine has no holders: it names [someone](#someone), and the plugins that keep things are [receivers](#receiver).

## hook

A plugin's or the game's `onX` function, run at an event, that returns the next state, such as `onTurn`. See [Rules](/docs/reference/rules) and [How plugins work](/docs/explanation/plugins).

## item

A word the docs don't use. A thing the player holds is a [thing](#thing), and a member of a list is an entry.

## jump

A choice's `{ point }` effect, written `jump()`, which sends the [flow](#flow) to a [point](#point). It's the only way a flow loops. See [Flows](/docs/reference/flows).

## kind

A sort of entity, such as `staff`, `photo` or the cast's `character`, declared in `kinds` with a label, whether each is `unique`, whether it's [listed](#listed), its tags, its [flags](#flags) and default traits. See [`KindDef`](/docs/reference/entities#kinddef).

## kv

The kv store, keys with a true/false, number or text value, written with the `kv` effect and read with the `kv` condition. The player has one, and so do each entity, each storyline and a running minigame. See [`state.kv`](/docs/reference/state#kv) and [Entities, things and traits](/docs/explanation/entities-and-traits).

## label

The words on a button or a field. A thing has a [name](#name) and a heading has a [title](#title).

## layout

In the React UI, the page as a component, made of the regions `Game`, `Sidebar`, `Story` and `Overlay`. See [the React UI](/docs/reference/react).

## listed

A kind's `listed`, which says whether the view shows the kind's entities: true, false or a condition with `'$'` as each entity. An entity's `visible` narrows it. A game's kinds are listed unless they say otherwise, and a plugin's aren't. See [`KindDef`](/docs/reference/entities#kinddef).

## location

An entity carrying the places plugin's `places/location` trait, with exits and things to do. It's never called a place or a room. See the [places plugin](/docs/reference/plugins/places).

## lock

A rule that refuses commands for now and says why, such as moving day allowing only its own scene. See [Locks](/docs/reference/locks).

## lookup

A function that reads what content declares or play made, named `xOf(game, id)` for one definition, `xsOf(game)` for a list, and `xOf(state, game, ref)` for what an entity is now. See [`sceneOf`](/docs/reference/game#sceneof).

## macro

An effect that stands for other effects, in a plugin's or the game's `macros`, so prices, guards and locks see the effects it stands for. See [Macros](/docs/reference/custom#macros).

## mod

A [pack](#pack) a player adds to a built game, its id written `mod:<id>`. See [Mods](/docs/reference/mods) and [Let players add mods](/docs/how-to/let-players-add-mods).

## name

The word a thing, an entity, a status, an achievement, a quest, a cheat, a job or an unlock is called by. A heading has a [title](#title) and a button a [label](#label).

## once

`once: { per: 'game' | 'turn', reason? }`, the one shape that limits a choice, an action, a cheat or a trigger to one use per game or per turn. See [`Once`](/docs/reference/actions#once).

## options

A plugin factory's settings, such as `places({ start: 'flat' })`, which are code a mod can't change. Content goes in `data`. See [How plugins work](/docs/explanation/plugins).

## pack

Content from outside the game's code, such as a mod, unlocked content or a JSON export, with an `id` that saves record and a `schema`. It goes over the content, last wins. See [`Pack`](/docs/reference/content#pack) and [Content, packs and the base](/docs/explanation/content-and-packs).

## page

In the React UI, the title page and the pages around the game (settings, load, credits, the gate and any a game adds), turned on with the `pages` option. See [the React UI](/docs/reference/react).

## panel

A named piece of UI over the story that the UI renders by name, such as `shop` or `jobs`, opened by the `panel` effect and kept in `state.panel`. See [Panels](/docs/reference/panels).

## phase

The kv key `phase`, which holds the stretch of the game the player is in, such as `'arrival'`. See [`phase`](/docs/reference/state#phase).

## picture

A layered picture with hotspots on a scene or a location, a `PictureDef` of layers each shown while its `when` holds, and hotspots that take a choice or send a command. See [Media](/docs/reference/media#picturedef).

## plugin

A package that adds conditions, effects, commands, state, a view and content to the engine, such as the calendar or the shop. See [Plugin API](/docs/reference/plugin-api) and [How plugins work](/docs/explanation/plugins).

## point

A `{ point }` block, written `point()`, a place in a [flow](#flow) that a [jump](#jump) can go to. See [Flows](/docs/reference/flows).

## prose key

A line kept in content's `prose` table and read by key, for a line several scenes share, a set drawn at random, or a line a mod rewrites by key. See [Prose](/docs/reference/prose).

## protagonist

A unique entity the player plays, chosen with the `you` effect, such as one of two siblings taking turns. See [you](#you) and [Someone and Played](/docs/reference/entities#someone-and-played).

## provider

A plugin member that answers a question and changes nothing, named by its noun, such as `guard`, `label`, `scene` or `view`. See [Plugin API](/docs/reference/plugin-api) and [How plugins work](/docs/explanation/plugins).

## receiver

A plugin that keeps things, such as the inventory or the wardrobe, which the `receive` and `release` effects and the `owned` condition ask. The engine keeps no record of who has what itself. See [Receivers](/docs/reference/entities#receivers).

## references

The ids a condition, effect, command or plugin's content names, which the [content checker](#content-checker) resolves. See [A plugin's content checks](/docs/reference/plugin-checks).

## registries

The interfaces a plugin or the game augments to type its calls by full name, its queries' answers, its view and its traits, such as `ConditionRegistry` and `TraitRegistry`. See [Declaring a plugin's calls](/docs/reference/plugin-calls).

## render

The work a UI or the engine's [`view`](/docs/reference/view#view) does to turn the state into a screen. See [Start your own UI](/docs/how-to/render/start).

## Result

The answer of a call that can fail in a way its caller should expect, `{ ok: true, value }` or `{ ok: false, reason }`, never a throw. See [`Result`](/docs/reference/common#result).

## roll

A dice roll the `roll` effect makes, seeded from the save, its total kept in the kv store under its key. A check is a roll with a target, `against`. See [Rolls](/docs/reference/rolls).

## room

The screen shown while no scene is open, a provider's `RoomScene`. With the places plugin, it shows the location the player is at. See [Turns, scenes and the room](/docs/explanation/turns-and-time).

## rules

The game's own code, a [`GameRules`](/docs/reference/rules#gamerules) of hooks, providers and the calls content makes as `game/<name>`, given on the [base](#base). See [Content, packs and the base](/docs/explanation/content-and-packs).

## save

A stored [state](/docs/reference/state#gamestate) with its metadata, in a slot of the save store. See [Saves](/docs/reference/saves).

## scene

A screen of the story with a title, a [body](#body) and [choices](#choice), declared in content's `scenes`. See [`DataScene`](/docs/reference/scenes#datascene) and [Turns, scenes and the room](/docs/explanation/turns-and-time).

## screen

[`screen(state, game)`](/docs/reference/view#screen), one state rendered once, before the view words it for a UI. The React UI's title page and settings are [pages](#page), never screens.

## section

In the React UI, a titled `Section` of a layout that folds or opens in a dialog. See [the React UI](/docs/reference/react).

## show

The player's side of the screen. Code [renders](#render) the state, and the screen shows the result to the player.

## showcase

The example game in `examples/showcase`, titled Small Town, which uses every feature. See [Examples](/docs/reference/examples).

## snapshot

The runner's [`RunnerSnapshot`](/docs/reference/runner#runnersnapshot), every value a UI renders (the view, settings, backlog, undo and redo, saves and helpers' reports) in one value.

## someone

Who content gives a thing to, takes it from or asks about: `'player'`, `'you'` or a unique entity. See [Someone and Played](/docs/reference/entities#someone-and-played).

## speech

A spoken line written under who says it by id, `@ava: "…"` in prose or `say('ava', words)` in a flow. The view shows the speaker's name from the entity. See [Prose](/docs/reference/prose).

## stage

A step of a quest, and only that. See the [quests plugin](/docs/reference/plugins/quests).

## stat

A number the game declares, the player's or each entity's of a kind, kept within its range. See [`StatDef`](/docs/reference/stats#statdef).

## state

One game in progress, a plain object that is the save. See [`GameState`](/docs/reference/state#gamestate) and [State, commands and the view](/docs/explanation/state-and-commands).

## state intake

[`loadState`](/docs/reference/saves#loadstate), the one way a state from outside, such as a save, comes into play, carried forward by the engine's, plugins' and game's migrations.

## state slice

A plugin's own part of the state, at `state.plugins[id]`. See [Plugin migrations](/docs/reference/plugin-migrations).

## story

In the React UI, the main column of the layout. See [the React UI](/docs/reference/react).

## storylet

A scene marked to be drawn at random from a set, with weights and limits. See [Storylets](/docs/reference/storylets).

## storyline

A thread of the story, open or closed, with its own kv store. See [Storylines](/docs/reference/storylines).

## tag

A word on an entity or a kind that content selects by, such as `fruit`. See [Entities](/docs/reference/entities#entitydef).

## thing

An entity the player can have or collect, such as a sandwich, a note or a photo, kept by a [receiver](#receiver) or in kv keys. See [Entities, things and traits](/docs/explanation/entities-and-traits).

## timer

A named countdown in real time, declared in `timers` with its milliseconds and the effects that run when it runs out, and run down only by `tick` commands. See [Timers](/docs/reference/timers).

## title

The heading of a scene, a page or a minigame. A thing has a [name](#name).

## trait

A named piece of data an entity carries, written on its kind, on the entity or in a `traits` table, and read with `traitOf`. A trait with a `/` in its id is a plugin's. See [Entities](/docs/reference/entities#traittable) and [Entities, things and traits](/docs/explanation/entities-and-traits).

## trigger

Effects that run by themselves after a command once a condition holds. See [Triggers](/docs/reference/triggers).

## turn

The engine's only clock, a count that a `turn` effect moves on. The game decides how long a turn is. See [`turn`](/docs/reference/state#turn) and [Turns, scenes and the room](/docs/explanation/turns-and-time).

## UI hints

Presentation hints in a `ui` field on a scene, choice, block, action, stat, kind, entity or the game, carried to the view as written and given meaning only by a UI. See [UI hints](/docs/reference/ui-hints) and [Why IFLoom works this way](/docs/explanation/design).

## UI piece

A piece of a UI's own inside a line of prose, `[[ui:name|words|arg]]`, which the view carries as a `ui` span for a UI to render. See [Prose](/docs/reference/prose).

## variants

A named set of lines, one drawn at random each time it's shown. See [`VariantMember`](/docs/reference/prose#variantmember).

## view

The value every UI renders, built from the state by [`view`](/docs/reference/view#view), worded and free of spoilers such as a choice's effects. See [State, commands and the view](/docs/explanation/state-and-commands).

## words in place

The words a player reads, written in the field that shows them, such as a `text()` block, a `label` or a `reason`. See [Prose](/docs/reference/prose).

## words table

A pack's `words`, other words for the fields a player reads, by key, such as `action.wait.label`. A translation is one pack with it. See [The words table](/docs/reference/words).

## you

The one the player is playing now, the protagonist the `you` effect chose, else `'player'`. See [`state.you`](/docs/reference/state#you).
