---
"@ifloom/engine": patch
"@ifloom/plugin-achievements": patch
"@ifloom/plugin-calendar": patch
"@ifloom/plugin-cast": patch
"@ifloom/plugin-debug": patch
"@ifloom/plugin-devices": patch
"@ifloom/plugin-feed": patch
"@ifloom/plugin-generators": patch
"@ifloom/plugin-inventory": patch
"@ifloom/plugin-jobs": patch
"@ifloom/plugin-messages": patch
"@ifloom/plugin-places": patch
"@ifloom/plugin-quests": patch
"@ifloom/plugin-shop": patch
"@ifloom/plugin-statuses": patch
"@ifloom/plugin-unlocks": patch
"@ifloom/plugin-wardrobe": patch
---

Removed: every upgrade step for saves, packs and command logs from before this release. `SAVE_VERSION` and `SCHEMA` start again at 1, and each first-party plugin's state, content and command versions are 1 with no migrations. A save, pack or log from an earlier release is refused instead of carried forward. The machinery stays: the engine's step tables, a plugin's `migrations`, `contentMigrations` and `commandMigrations`, and the game's own `rules.migrations` work as before. `ContentTools.effects` and `PackContext`'s `entities` and `you`, which only the removed steps used, are gone, and a pack that records no version for a plugin is read as written for the plugin's current version.
