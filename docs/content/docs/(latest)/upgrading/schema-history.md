---
title: "Schema history"
description: "How upgradePack carries an older pack forward, and each change to the content format, schema by schema."
---
A [pack](/docs/reference/glossary#pack), such as a mod, records the [`SCHEMA`](/docs/reference/content#schema) it was written for, and [`upgradePack`](/docs/reference/content#upgradepack) carries an older one forward when [`loadGame`](/docs/reference/content#loadgame) loads it. This page says how that works and lists what each schema changed. Your own content isn't upgraded, so the [content checker](/docs/reference/checks) reports what it finds in an older form. [Content, packs and the base](/docs/explanation/content-and-packs) explains why. In the showcase, Small Town, `examples/showcase/src/game.ts` lays the player's mods over the content with `loadGame`, which upgrades each one.

## How a pack is carried forward

`SCHEMA` is 1. When the content format changes, `SCHEMA` goes up by one and the engine gains a step from the schema before, keyed by the schema it upgrades from. `upgradePack` runs the steps in order, from the pack's schema up to `SCHEMA`, and sets the pack's `schema` as it goes. A pack written for a newer schema is refused, and so is one older than the engine's oldest step.

Each plugin carries its own content with its [content migrations](/docs/reference/plugin-migrations#contentversion-and-contentmigrations), and a pack records in `plugins` the version of each plugin's content it was written for. Before the engine's step from each schema, every plugin's steps keyed by that schema or below run, and the rest run after the engine's last. A pack that records no version for a plugin is read as written for the plugin's current version. A plugin left out of the list given to `upgradePack` leaves its content as it was.

## Schemas

Schema 1 is the first. No schema has changed the content format since, so the engine has no steps yet, and neither do the first-party plugins.

## Command logs

A [command log](/docs/reference/runner#commandlog) records the `schema` and each plugin's `commandVersion` its commands were written for, and [`replay`](/docs/reference/runner#replay) carries an older log's commands forward in the same way. The engine's command steps are keyed by schema and each plugin's [command migrations](/docs/reference/plugin-migrations#commandversion-and-commandmigrations) by its version. Neither has any steps yet. A log that records no versions is read as the oldest, so every step runs.

## Content written in an older form

Your own content is compiled against the engine you build it with, so TypeScript reports a field the engine renamed. Content that still type-checks in an older form, or a plain-JS game's, gets one of these problems from the content checker instead:

| Problem | Cause |
|---|---|
| `{ custom: "…" } is written in short now, as { "game/…": { … } }, or true for no arguments` | A condition or an effect calls code in the long form from before schema 18. It never holds, or does nothing. |
| `effects are told apart by their key now, as { …: … }, not { kind: "…" }` | An effect still has the `kind` field from before schema 21. It does nothing. |
| `` `{ words }` is `{ text }` now: a block of words written in place is `{ text: "…" }` `` | A block from before schema 25 holds `words`. |
| `{ text: "…" } names the prose "…", but a { text } block is words written in place now (schema 25): write the words, or { prose: "…" } to read that prose` | A `{ text }` block's words are a prose key the game has, as a block read them before schema 25. |
| `label "…" names the prose "…", but a label is words written in place now (schema 25): write the words` | A choice's or an action's `label` or `labels` entry, a minigame state's `label` or a reply's `label` is a prose key the game has. A `notify` effect's text and a `feed/post` or `feed/react` text get the same problem, starting `notice text`, `post` or `comment`. |
| `no label: its words are no longer read from the prose "…" (schema 25), so give it label: "…"` | A scene's choice, or a message's reply, has no `label`, and the game's prose has words under `<scene>#<choice>` or `<message>#<reply>`. With no label, it shows its id. |
| `[[reveal]] is no longer markup and would be shown as written; …` | Prose holds `[[reveal]]`, which schema 16 replaced with a block's `ui.reveal` hint. |
| `{{v:…}} is written {{…}} now: …` | A token names a value in the form from before schema 30. It still prints. |
| `clothes are things with the wardrobe/wearable trait now: …` | Content holds a `data.wardrobe.clothes` list from before schema 13. Give each thing the `wardrobe/wearable` trait instead. |

Words with a space in them are never read as a prose key, so `label: 'Leave'` is never reported. [Upgrade IFLoom](/docs/upgrading) runs the checker as part of moving a game to a newer engine.
