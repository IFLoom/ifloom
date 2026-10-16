# Changelog

Every change you'd notice as someone making a game with IFLoom is listed here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions will follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once there is a first release.

IFLoom is pre-release, so nothing is a stable API yet and anything below can still change.

## [Unreleased]

### Added

- An engine for any shape of game: a linear novel, a management game played a week at a time, or a life sim with a calendar, places and characters.
- A small core that keeps the turn, scenes and choices, stats, entities, variables, collections, storylines, triggers, notices, inputs and saves.
- Plugins for the rest, each a package of its own: a calendar, places, a cast of characters, quests, a wardrobe, messages, feeds, devices, a ready-made phone, and debug commands that are left out of release builds.
- Content as data. Conditions and effects are plain objects, and your game's own logic plugs in by name with `{ custom: name }`.
- `ifloom check`, which checks a game's content and lists any missing pictures, videos and audio files before anyone plays.
- Every choice is remembered, so a later scene can ask what the player chose.
- Stats you declare yourself, with optional levels, derived stats worked out from a formula, and stats that belong to kinds of entity.
- Seeded randomness. The same save on the same turn gives the same result, so undo can't re-roll and playtests repeat exactly.
- Weighted variants and storylets: scenes drawn at random from a set, each with a weight and its own conditions.
- Saves with undo and redo, a backlog, autosave, export and import, and storage in memory, localStorage or IndexedDB.
- Saves that survive game updates. Give your game a `version` and `migrations`, and older saves load into the new version.
- A profile that outlives saves, settings your game declares, and New Game+.
- Every line the player reads comes from a strings table, so a game or a translation can reword it.
- Mods: data-only files that players add at runtime, checked against the game and recorded in saves.
- The React UI, `@ifloom/react`, with `mountGame` to start a game in one line, a title screen, settings, load and credits pages, and four theme presets: paper, terminal, studio and storybook.
- Ways to make the React UI your own: replace any component, change the classes on any part, drop the styles entirely, or draw your own root.
- Audio: music, ambience, sound effects and voice lines on channels, with volume and mute as settings. `@ifloom/audio` plays it with any framework.
- Media: inline pictures and video, tagged picture pools, layered stages with hotspots, and a lightbox.
- The CLI: `ifloom new` to start a game from a template, plus `dev`, `build`, `check`, `playtest` and `snapshot`.
- `ifloom build` makes one HTML file that opens from disk, with its pictures beside it, or inside it if you add `--inline-assets`.
- `ifloom playtest`, which plays your game with no one at the keyboard and writes every screen to a transcript.
- A `vanilla` template that draws a game with plain DOM, for Vue, Svelte or no framework at all.
- Three example games: The Letter (a linear novel), The Corner Café (a management game) and Small Town (a life sim that uses every feature).
- Minigames: small games inside the story, such as a quick-time event, declared as states with timers, inputs, their own variables and seeded random picks. Start one with the `minigame` effect or a scene's `minigame` field, and drive it with the `tick` and `minigame` commands. The view shows it as `view.minigame`. Undo, the backlog and autosave step over ticks, and a command log with ticks plays back exactly. The React UI draws it with `MinigamePanel`, which runs the clock and takes the arrow keys and space, and a game can swap in its own panel per minigame through `panels`. `useMinigame()` gives a panel of your own the minigame and its clock.
- `display: 'number' | 'bar' | 'pips'` on a stat, passed through the view with the stat's `min` and `max` so a UI can draw a bar or pips. The React UI's stat list draws a basic bar or a row of pips for it.
- Keyboard shortcuts in the React UI, off unless you pass `keys`: the number keys pick the choices on screen, each showing its number, Escape opens the menu, and `keys: { map }` adds keys of your own that send a command.
- `NoticeStrip` in the React UI: a row of unread counts (unseen notices, and apps with a badge) that open where they are. Add it to a layout as `'notice-strip'`.
- These docs, with search, a version picker, `llms.txt` and `llms-full.txt` for AI agents, every page as Markdown, and an `AGENTS.md` in every new game.

### Changed

- The React UI package is now `@ifloom/react` (it was `@ifloom/ui`), and React and Tailwind are only added to games that use them.
- The pages around the game in the React UI (title, settings, load, credits and the gate) are now called pages: `pages`, `usePage`, `TitlePage` and the rest.
- `ifloom check` and `ifloom build` now look for exactly the files the content checker lists.
- `ifloom snapshot` now shows why a choice is refused, as the game does on screen.
- Calendars, places and characters moved out of the core into the calendar, places and cast plugins.

### Removed

- `validatePack` and `referenced`. Use `checkGame` to check a game's content.
- `migrate`, `migratePlugins`, `migrateGame`, `deserialize`, `serialize` and `hydrate`. Use `loadState` to load a save or any other state from outside.
- The built-in "Wait a while" action. A game declares the actions it offers everywhere in `Game.actions`.

[Unreleased]: https://github.com/IFLoom/ifloom/commits/main
