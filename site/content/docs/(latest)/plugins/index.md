---
title: "First-party plugins"
description: "The first-party plugins and the phone bundle, what each adds, how they work together, and how to add one to a game."
---
The engine's core knows about turns, scenes, stats, entities, the kv store and the rest of the [core concepts](/docs/guide/concepts), but not about clocks, maps or people. Those come from plugins. A [plugin](/docs/reference/plugins) adds a whole system to a game, with its own state, conditions, effects, commands, hooks and view. The first-party plugins below live in the IFLoom repository beside the engine, and you add the ones your game needs.

A linear novel might use none of them. A life sim like the [showcase](/docs/guide/showcase) uses most: the calendar for days, places for the town, the cast for its people, and the phone for texts and a feed.

| Plugin | Package | What it adds |
|---|---|---|
| [Calendar](/docs/plugins/calendar) | `@ifloom/plugin-calendar` | The game's clock. It splits a day into periods and a week into days, adds sleep and an optional curfew, and decides whether a turn is a period, a day or a week. You write opening hours and schedules with its conditions. |
| [Places](/docs/plugins/places) | `@ifloom/plugin-places` | Locations with exits and things to do in each, walking between them, and where the player is. Locations are content, so a mod can add a room. |
| [Cast](/docs/plugins/cast) | `@ifloom/plugin-cast` | The game's people. Characters keep their own hours, and you can see who is in the room, talk to them and call them. What the game keeps about each one, such as a friendship, is a stat on them. Characters are content, so a mod can add someone. |
| [Quests](/docs/plugins/quests) | `@ifloom/plugin-quests` | What the player is doing, how far they've got, and a hint for what comes next. |
| [Statuses](/docs/plugins/statuses) | `@ifloom/plugin-statuses` | Timed statuses: a boost or an ailment that lasts some turns, changes what the player's stats read while it lasts, and can run effects as it starts, each turn and as it ends. |
| [Achievements](/docs/plugins/achievements) | `@ifloom/plugin-achievements` | Achievements earned by a condition or an effect, secret ones shown as `???` until earned, progress counts such as 4 of 10, and a record in the player's profile that outlives saves. |
| [Inventory](/docs/plugins/inventory) | `@ifloom/plugin-inventory` | Using, dropping and giving away the things you hold. A thing with the `usable` trait gets a button that runs its effects and spends one, unless it's kept. |
| [Shop](/docs/plugins/shop) | `@ifloom/plugin-shop` | Vendors that sell things for any spendable stat, stock the vendor holds and restocks each turn or day (or none, so it never runs out), selling back, and seeded daily discounts. Works with the calendar for opening hours and with places for where a vendor stands. |
| [Jobs](/docs/plugins/jobs) | `@ifloom/plugin-jobs` | Jobs with hiring requirements, shifts that cost energy or time and pay a wage, promotion ladders, and getting fired for missed shifts or a condition such as low performance. Works with the calendar for shift days and hours and with places for the workplace. |
| [Generators](/docs/plugins/generators) | `@ifloom/plugin-generators` | New entities made from templates: named pools of values with weights, number ranges and fixed values for each field, seeded so a replay makes the same ones. |
| [Wardrobe](/docs/plugins/wardrobe) | `@ifloom/plugin-wardrobe` | Slots the game declares, the things with the `wearable` trait that go in them, and what you have on. |
| [Messages](/docs/plugins/messages) | `@ifloom/plugin-messages` | Messages that arrive when the story allows, in channels and threads, with replies that work like choices. |
| [Feed](/docs/plugins/feed) | `@ifloom/plugin-feed` | Timelines of other people's posts, the player's own posts, and the likes and comments they get. |
| [Devices](/docs/plugins/devices) | `@ifloom/plugin-devices` | Devices with apps declared as data, badges, and opening an app without leaving the room. |
| [Cheats](/docs/plugins/cheats) | `@ifloom/plugin-cheats` | Cheats for the player, such as +20 coins, that work in any scene and through any lock. Each is free for everyone or refused (or hidden) until a condition holds, such as a supporter unlock. A log records what was used, and content can ask about it. |
| [Unlocks](/docs/plugins/unlocks) | `@ifloom/plugin-unlocks` | Codes the player enters, such as a supporter's, checked against a slow hash so no code ships in the game. An unlock opens cheats and choices through `unlocks/has`, and can carry packs of its own that the build encrypts under the code. It's remembered in the profile. |
| [Debug](/docs/plugins/debug) | `@ifloom/plugin-debug` | Commands for testing that ignore locks. You can set a stat (a character's too) or a kv key, set how many of a thing someone holds (`debug/held`), jump to a scene, set the turn or the calendar's clock, and go anywhere on the places map. Use it in development builds only. |

There's also one bundle:

| Bundle | Package | What it adds |
|---|---|---|
| [Phone](/docs/plugins/phone) | `@ifloom/phone` | A smartphone in one call. It wires devices, messages and feed together, with apps for each channel and feed, contacts and a gallery. |

Plugins other people have written are listed on [Community plugins](/docs/plugins/community), with how to get yours listed.

## How they are built

- **Each is its own package.** A game that doesn't use one doesn't ship it.
- **The engine is a peer dependency.** A plugin uses the game's own copy of `@ifloom/engine`, so a game only ever has one engine. Every `@ifloom` package names another it uses the same way, by the range `^` and its version.
- **They only use the engine's public API.** A first-party plugin imports nothing but `@ifloom/engine`, the same API your own plugins use, so anything one of them does, a plugin of yours can do too.
- **None needs another.** You can add any of them, in any combination. A plugin that works with others lists them in its `cooperates`, and uses them only when the game has them:
  - The cast cooperates with places and the calendar. It asks places where the player is, and its schedules usually use the calendar's conditions. Without places, nobody is ever in the room, but calls still work.
  - The shop cooperates with the calendar and places. A vendor keeps the calendar's hours and stands at a place on the map.
  - The shop, the wardrobe and the inventory don't know about each other. Each reads what you hold from the engine and its own trait on each thing, so a scarf can carry the shop's `sellable` and the wardrobe's `wearable` at once, and each plugin ignores the other's trait. See [Using them together](/docs/plugins/inventory#with-the-shop-and-the-wardrobe), and [Things: carrying, selling, wearing](/docs/recipes/things) for the four side by side.
  - The inventory cooperates with places. Dropping a thing asks places, by its `places/holder` query, for somewhere to put it where you are. Without an answer, a dropped thing is gone.
  - Jobs cooperate with the calendar and places. Shifts fall on the calendar's weekdays and periods, take its time, and are worked at a place on the map.
  - Cheats cooperate with unlocks by name. A supporter-only cheat names `unlocks/has` in its `blocked`, and without that plugin the condition is false, so the cheat stays refused.
  - Debug cooperates with the calendar and places. `debug/time` sets the calendar's clock and `debug/go` moves the player on the places map.
  - Messages, the feed and devices cooperate with the cast. Messages and posts show the [cast](/docs/plugins/cast)'s names and faces, and a device's contacts section lists the people the player can call.
  - A device's app can show another plugin's view by name, such as a messages channel or a feed. Messages and feeds work without a device.

  A bundle such as the [phone](/docs/plugins/phone) is the one thing that does depend on plugins, because its job is to wire several together for you.

## Adding one

Install the plugin's package beside the engine:

```sh tab="npm" tab-group="package-manager"
npm install @ifloom/plugin-quests
```

```sh tab="pnpm" tab-group="package-manager"
pnpm add @ifloom/plugin-quests
```

```sh tab="yarn" tab-group="package-manager"
yarn add @ifloom/plugin-quests
```

```sh tab="bun" tab-group="package-manager"
bun add @ifloom/plugin-quests
```

Then add it to the game's `plugins`, on the base you pass to [`loadGame`](/docs/reference/loader#loadgame). This is a cut-down version of the showcase's own setup:

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { quests } from '@ifloom/plugin-quests'

declare const town: Content // your content

const { game, problems } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [calendar(), places({ start: 'flat' }), quests()],
})
```

You choose plugins when you build the game. They're never loaded while it runs. A mod can bring content for a plugin the game already has, in its pack's [`data`](/docs/reference/loader#pack), but it can't add a plugin.

Content calls a plugin's conditions, effects and commands by their full name, `<plugin>/<name>`, as the only key, with the arguments as its value. Every plugin's helpers write it for you:

```ts
{ 'quests/done': { quest: 'settle' } }   // what questDone('settle') writes
```

A call works anywhere a [condition](/docs/reference/conditions), an effect or a command goes. Its value is always an object of named arguments, or `true` for none. The game's own code is called the same way, with `game/` in front. See [`PluginCall`](/docs/reference/custom#plugincall).

## Starting from a game that has them all

To see every plugin wired up in a game of your own, start from the showcase:

```sh
npm create ifloom@latest my-town -- --template town
```

That writes `my-town`, a copy of Small Town. See [`ifloom new`](/docs/cli#ifloom-new) for the other templates.

## See it in an example

Small Town's [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) uses every plugin here, in its `plugins` list.
