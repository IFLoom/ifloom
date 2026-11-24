---
title: "First-party plugins"
description: "Reference index of the first-party plugins: each package, what it adds, and the plugins each one cooperates with."
---
Writing a plugin of your own? See [Plugin API](/docs/reference/plugin-api).

A [plugin](/docs/reference/glossary#plugin) adds a whole system to a game, with its own state, conditions, effects, commands and view, on top of the engine's turns, scenes, stats and entities. The first-party plugins are packages in the IFLoom repository, each its own package with `@ifloom/engine` as a peer dependency. [How plugins work](/docs/explanation/plugins) explains how they are built, [Add a plugin](/docs/how-to/add-a-plugin) installs one, and [Create a game](/docs/how-to/create-a-game) starts from the showcase with every plugin wired up.

In the showcase: `examples/showcase/src/game.ts`, whose `plugins` list holds every plugin on this page.

## Plugins

Each package's page documents its factory, its content, its calls and its view.

| Key | Meaning |
|---|---|
| [Calendar](/docs/reference/plugins/calendar) | `@ifloom/plugin-calendar` splits a day into periods and a week into days, adds sleep and an optional curfew, and sets whether a turn is a period, a day or a week. |
| [Places](/docs/reference/plugins/places) | `@ifloom/plugin-places` adds locations with exits and actions, walking between them, things lying in them, and where the player is. |
| [Cast](/docs/reference/plugins/cast) | `@ifloom/plugin-cast` adds characters with schedules, who is here, talking and calling, with stats such as a friendship kept on each character. |
| [Quests](/docs/reference/plugins/quests) | `@ifloom/plugin-quests` adds quests whose stages are done by conditions, with tracking and news. |
| [Statuses](/docs/reference/plugins/statuses) | `@ifloom/plugin-statuses` adds timed statuses that change what stats read while they last and run effects as they start, each turn and as they end. |
| [Achievements](/docs/reference/plugins/achievements) | `@ifloom/plugin-achievements` adds achievements earned by a condition or an effect, secret ones, progress counts, and a record in the profile. |
| [Inventory](/docs/reference/plugins/inventory) | `@ifloom/plugin-inventory` adds using, dropping and giving away the things the player holds. |
| [Shop](/docs/reference/plugins/shop) | `@ifloom/plugin-shop` adds vendors that sell things for spendable stats, with stock, restocking, selling back and seeded daily discounts. |
| [Jobs](/docs/reference/plugins/jobs) | `@ifloom/plugin-jobs` adds jobs with hiring requirements, shifts that pay a wage, promotions, missed shifts and firing. |
| [Generators](/docs/reference/plugins/generators) | `@ifloom/plugin-generators` makes entities from templates whose fields are drawn from pools, ranges and fixed values, seeded so a replay makes the same ones. |
| [Wardrobe](/docs/reference/plugins/wardrobe) | `@ifloom/plugin-wardrobe` adds slots, the wearable things that go in them, and what each body has on. |
| [Messages](/docs/reference/plugins/messages) | `@ifloom/plugin-messages` adds channels and threads of messages that arrive when the story allows, with replies that work as choices. |
| [Feed](/docs/reference/plugins/feed) | `@ifloom/plugin-feed` adds feeds of posts, the player's own posts, likes and comments. |
| [Devices](/docs/reference/plugins/devices) | `@ifloom/plugin-devices` adds devices with apps built from sections, badges, and opening an app without leaving the room. |
| [Cheats](/docs/reference/plugins/cheats) | `@ifloom/plugin-cheats` adds cheats that work in any scene and through any lock, refused until a condition holds if the game says so, with a log of each use. |
| [Unlocks](/docs/reference/plugins/unlocks) | `@ifloom/plugin-unlocks` adds codes the player enters, checked against a slow hash, which unlock cheats, choices and encrypted packs. |
| [Debug](/docs/reference/plugins/debug) | `@ifloom/plugin-debug` adds testing commands that ignore locks, for development builds only. |

A phone is no plugin of its own. A game builds one from devices, messages and feed in its content, as [Build a phone](/docs/how-to/build-a-phone) shows. Plugins other people have written are on [Community plugins](/docs/reference/plugins/community).

## cooperates

A plugin works with another only when the game has both, and names it in its [`cooperates`](/docs/reference/plugin-queries#cooperates). No first-party plugin requires another. [Make plugins work together](/docs/how-to/make-plugins-work-together) shows the pattern for a plugin of your own.

| Key | Meaning |
|---|---|
| Cast | Asks places where the player is, and its schedules read the calendar's conditions. Without places, nobody is ever here. |
| Shop | Keeps a vendor's opening hours with the calendar and stands a vendor at a location with places. |
| Jobs | Puts shifts on the calendar's weekdays and periods, takes its time, and sets each workplace with places. |
| Inventory | Asks places for the holder a dropped thing goes to, `places/holder`. Without an answer, a dropped thing is gone. |
| Cheats | Names `unlocks/has` in a supporter-only cheat's `blocked`. Without unlocks the condition is false, so the cheat stays refused. |
| Debug | Sets the calendar's clock with `debug/time` and moves the player with `debug/go`. |
| Messages, feed and devices | Show the cast's names and faces, and a device's contacts section lists the characters the player can call. A device's app can show a messages channel or a feed by name. |

The shop, the wardrobe and the inventory don't cooperate. Each reads what the player holds from the engine and its own trait on each thing, so one scarf can carry the shop's `shop/sellable` and the wardrobe's `wardrobe/wearable` at once.
