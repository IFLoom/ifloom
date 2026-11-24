---
title: "First-party plugins"
description: "Every first-party plugin, what it adds and the plugins it cooperates with."
---
Writing a plugin of your own? See [Plugin API](/docs/0.1.0/reference/plugin-api).

A [plugin](/docs/0.1.0/reference/glossary#plugin) adds a whole system to a game, with its own state, conditions, effects, commands and view, on top of the engine's turns, scenes, stats and entities. The first-party plugins are packages in the IFLoom repository, each its own package with `@ifloom/engine` as a peer dependency. [How plugins work](/docs/0.1.0/explanation/plugins) explains how they are built, [Add a plugin](/docs/0.1.0/how-to/add-a-plugin) installs one, and [Create a game](/docs/0.1.0/how-to/create-a-game) starts from the showcase with every plugin wired up.

In the showcase: `examples/showcase/src/game.ts`, whose `plugins` list holds every plugin on this page.

## Plugins

Each package's page documents its factory, its content, its calls and its view.

| Key | Meaning |
|---|---|
| [Calendar](/docs/0.1.0/reference/plugins/calendar) | `@ifloom/plugin-calendar` splits a day into periods and a week into days, adds sleep and an optional curfew, and sets whether a turn is a period, a day or a week. |
| [Places](/docs/0.1.0/reference/plugins/places) | `@ifloom/plugin-places` adds locations with exits and actions, walking between them, things lying in them, and where the player is. |
| [Cast](/docs/0.1.0/reference/plugins/cast) | `@ifloom/plugin-cast` adds characters with schedules, who is here, talking and calling, with stats such as a friendship kept on each character. |
| [Quests](/docs/0.1.0/reference/plugins/quests) | `@ifloom/plugin-quests` adds quests whose stages are done by conditions, with tracking and news. |
| [Statuses](/docs/0.1.0/reference/plugins/statuses) | `@ifloom/plugin-statuses` adds timed statuses that change what stats read while they last and run effects as they start, each turn and as they end. |
| [Achievements](/docs/0.1.0/reference/plugins/achievements) | `@ifloom/plugin-achievements` adds achievements earned by a condition or an effect, secret ones, progress counts, and a record in the profile. |
| [Inventory](/docs/0.1.0/reference/plugins/inventory) | `@ifloom/plugin-inventory` adds using, dropping and giving away the things the player holds. |
| [Shop](/docs/0.1.0/reference/plugins/shop) | `@ifloom/plugin-shop` adds vendors that sell things for spendable stats, with stock, restocking, selling back and seeded daily discounts. |
| [Jobs](/docs/0.1.0/reference/plugins/jobs) | `@ifloom/plugin-jobs` adds jobs with hiring requirements, shifts that pay a wage, promotions, missed shifts and firing. |
| [Generators](/docs/0.1.0/reference/plugins/generators) | `@ifloom/plugin-generators` makes entities from templates that draw each field from a pool, a range or a fixed value, seeded so a replay makes the same ones. |
| [Wardrobe](/docs/0.1.0/reference/plugins/wardrobe) | `@ifloom/plugin-wardrobe` adds slots, the wearable things that go in them, and what each body has on. |
| [Messages](/docs/0.1.0/reference/plugins/messages) | `@ifloom/plugin-messages` adds channels and threads of messages that arrive when the story allows, with replies that work as choices. |
| [Feed](/docs/0.1.0/reference/plugins/feed) | `@ifloom/plugin-feed` adds feeds of posts, the player's own posts, likes and comments. |
| [Devices](/docs/0.1.0/reference/plugins/devices) | `@ifloom/plugin-devices` adds devices with apps built from sections, badges, and opening an app without leaving the room. |
| [Cheats](/docs/0.1.0/reference/plugins/cheats) | `@ifloom/plugin-cheats` adds cheats that work in any scene and through any lock, refused until a condition holds if the game says so, with a log of each use. |
| [Unlocks](/docs/0.1.0/reference/plugins/unlocks) | `@ifloom/plugin-unlocks` adds codes the player enters, checked against a slow hash, which unlock cheats, choices and encrypted packs. |
| [Debug](/docs/0.1.0/reference/plugins/debug) | `@ifloom/plugin-debug` adds testing commands that ignore locks, for development builds only. |

A phone is no plugin of its own. A game builds one from devices, messages and feed in its content, as [Build a phone](/docs/0.1.0/how-to/build-a-phone) shows. Plugins other people have written are on [Community plugins](/docs/0.1.0/reference/plugins/community).

## cooperates

A plugin works with another only when the game has both, and names it in its [`cooperates`](/docs/0.1.0/reference/plugin-queries#cooperates). No first-party plugin requires another. [Make plugins work together](/docs/0.1.0/how-to/make-plugins-work-together) shows the pattern for a plugin of your own.

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
