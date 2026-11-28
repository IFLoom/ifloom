---
title: "Why IFLoom works this way"
description: "The rules the engine keeps, such as seeded randomness and nothing loaded at runtime, with the reason for each and its cost."
---
Each rule the engine keeps turned down an easier design, and each has a cost. Knowing why helps you write a game that works with the engine rather than against it.

## The state is data

A game in progress is one plain object, the [`GameState`](/docs/0.1.2/reference/state). It holds no functions and no class instances, so it turns into JSON as it is, and a save is that JSON. Content is data too: a choice's effects are objects such as `{ stat: 'coins', by: -3 }`, and its `when` is an object such as `{ stat: 'courage', gte: 3 }`.

Data can be checked before anyone plays. The [content checker](/docs/0.1.2/reference/glossary#content-checker) walks every scene, so an effect that opens a scene nobody declared shows up as a problem in `ifloom check`, not as a broken link on someone's screen. Data can also be shipped by someone who can't ship code. A mod is a JSON file of scenes and effects, and the game loads it without running anything from it.

The cost is that content can't hold a function. When a game needs code, such as a sum over every member of staff, it puts that code in its [rules](/docs/0.1.2/reference/glossary#rules) and content calls it by name, `{ 'game/wages': true }`. The code stays in the game's source, and the content stays data.

## The same save gives the same draws

Every random draw is seeded. The engine works each one out from the save's seed, the turn and a name for the draw, through [`hash`](/docs/0.1.2/reference/random). The same save on the same turn deals the same line among its variants, the same market prices and the same dice. The alternative, `Math.random`, would be simpler to write, and the engine turns it down for three reasons:

- **Undo can't re-roll.** Undo goes back to the state before a choice. If the next draw were fresh, a player could undo and choose again until the dice came up well. With seeded draws, choosing again deals the same result, so undo goes back in the story and can't be used to cheat.
- **Rendering is pure.** The engine renders a state when it builds the view and again when the player chooses. With `Math.random`, the screen the player read and the choice they made could disagree about which line was shown.
- **Replays match.** A [command log](/docs/0.1.2/reference/runner) and its start state replay to the same state every time. A bug report's save reproduces exactly, a scripted playtest gives the same transcript on every run, and a snapshot test can pin a screen.

The same holds for your own code. A rule that picks at random draws through `draw`, `drawOne`, `chance` or `weighted` with a name of its own, never `Math.random`.

## Nothing loads at runtime

The engine never fetches a file or imports code while the game runs, and a contract test holds it to that. The reason is that interactive fiction ships as a folder a player can open from disk. A page opened from disk has a `file://` address and a null origin, so the browser treats every neighbouring file as cross-origin. It refuses a `fetch`, a module script loaded from the file next door, a dynamic `import()`, and a stylesheet requested with `crossorigin`.

A normal web build splits a game into a page, a script and a stylesheet, and opened from disk that page comes up blank. So `ifloom build` bundles the whole game into one script and inlines it, with the stylesheet, into `index.html`, with relative paths throughout. Pictures and video are the exception. An `<img>` or a `<video>` may load from a neighbouring folder, so they can stay as files beside the page.

The cost is that nothing can be lazy. Every scene and every line is in the page from the start, and content can't be downloaded later. A mod comes in as a file the player adds, which the game keeps and loads at start-up. Supporter content ships inside the page, encrypted, as [the last section](#what-an-offline-game-can-protect) explains.

## No genre in the engine

The engine knows no stat, location or person by name. It has no money, no energy, no time of day and no map. A game declares its stats, its kinds of entity and its scenes, and adds the systems it needs as [plugins](/docs/0.1.2/explanation/plugins). The game's own logic goes in its `rules`, which the engine runs through the same hooks it gives a plugin.

This keeps one engine fit for a novel, a management game and a life sim (see [Three shapes of game](/docs/0.1.2/explanation/shapes-of-game)). A novel carries no calendar code it never uses, and a management game names its own numbers. The cost is that a game declares more itself. A life sim has to list the calendar, places and the cast, where an engine built for life sims would have them already.

## Presentation lives in UI packages

The engine owns what changes the state, the rules or a replay, and content every UI must read the same way, such as a scene's words or a stat's value. The look and movement of the game belong to a UI. When content wants a fade between scenes or a stat shown as a bar, it writes a [UI hint](/docs/0.1.2/reference/glossary#ui-hints) in a `ui` field. The engine carries each hint to the view as written. It doesn't read one, give one a default, or check its name against any list. It checks only that the hint is data, so a mod with hints still saves and loads as JSON.

The alternative was to give the engine a field for each transition and layout. That would tie the engine to one UI's ideas, and a second UI would have to honour fields it never chose. With hints, each UI package declares the hints it reads and checks them itself. The React UI declares `transition`, `reveal`, `dice` and a few more, and a UI that ignores them still renders the game correctly. Prose works the same way with [UI pieces](/docs/0.1.2/reference/glossary#ui-piece), `[[ui:name|words]]`, which the view carries as opaque spans.

For the same reason the engine has no DOM and imports no framework. React is in `@ifloom/react` and in each plugin's `/react` subpath, which a game rendered another way never loads. The `vanilla` template proves a game runs with no React at all.

## Rules written once

A choice that the player can't take yet carries its reason, and the engine reads the same reason in two places. The view puts it on the greyed-out button, and `apply` gives it when the command is refused. A lock's line works the same way. So the button and the refusal never disagree, and you never write the check and its explanation separately.

This follows from content being data. The engine can ask a condition whenever it likes, before the player presses anything, so it can show the refusal in advance. A tool can ask too: [`whyNot`](/docs/0.1.2/reference/actions) explains why a command would be refused without running it.

## Differences from Twine, Ink and Ren'Py

Twine and Ink are built around branching passages. The story is a graph of text, and the player walks it. For a branching story and nothing more, they're the faster route. IFLoom writes that kind of story too, but it's built for games that also keep state: numbers that change, things the game has several of, and with plugins a clock, a map and characters. Because its conditions and effects are data, the engine checks every scene before anyone plays, and the editor completes `stat: 'coins'` as you type. The [Twine phrasebook](/docs/0.1.2/reference/twine-phrasebook) maps SugarCube and Harlowe to IFLoom.

Ren'Py and other visual-novel engines give you a whole presentation layer, with sprites, backgrounds, a text box and menus, and a script that drives it. IFLoom's engine is game logic with no screen. The React UI gives a ready-made screen with scenes, choices, stats, saves and menus. It fades or slides between scenes, reveals lines one at a time, and shows a scene as a layered picture with hotspots. It has no visual-novel text box. A game that wants one renders it from the view.

## What an offline game can protect

A game that runs from disk has no server to ask, and that limits what a supporter code can protect. The [unlocks plugin](/docs/0.1.2/reference/plugins/unlocks) draws the line in two places:

- **Content behind a code is protected.** A pack in `src/unlocks/` ships only encrypted, with AES-GCM under a key made from the code. Without the code, nobody can read that content or switch it on by editing the game.
- **A condition behind a code only deters.** A cheat or a choice gated on `unlocks/has` is in the game's code, and `unlocks/has` reads the save. Anyone who edits the code, the save or the browser's storage can reach it.
- **The code itself is safe if it's long.** The build holds only a slow hash of each code, 600,000 rounds of PBKDF2 per guess. A short code can still be found by trying them all, so codes of 12 random characters or more hold up.

Two things no offline game can stop. A supporter can post their code, since nothing checks who types it, so each release should get new codes. A supporter can also copy unlocked content out of their browser. Encryption keeps it out of the download, not out of their hands. So encrypt what you'd mind people getting for free, and treat a gated cheat as a thank-you rather than a lock.

For the details, see [Randomness](/docs/0.1.2/reference/random), [UI hints](/docs/0.1.2/reference/ui-hints), [Ship your game](/docs/0.1.2/how-to/ship-your-game) and [Sell supporter content](/docs/0.1.2/how-to/sell-supporter-content).
