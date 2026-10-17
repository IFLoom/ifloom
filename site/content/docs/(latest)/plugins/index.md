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
| [Shop](/docs/plugins/shop) | `@ifloom/plugin-shop` | Vendors with prices in any spendable stat, limited stock that restocks each turn or day, selling back, and seeded daily discounts. Works with the calendar for opening hours and with places for where a vendor stands. |
| [Jobs](/docs/plugins/jobs) | `@ifloom/plugin-jobs` | Jobs with hiring requirements, shifts that cost energy or time and pay a wage, promotion ladders, and getting fired for missed shifts or a condition such as low performance. Works with the calendar for shift days and hours and with places for the workplace. |
| [Generators](/docs/plugins/generators) | `@ifloom/plugin-generators` | New entities made from templates: named pools of values with weights, number ranges and fixed values for each field, seeded so a replay makes the same ones. |
| [Wardrobe](/docs/plugins/wardrobe) | `@ifloom/plugin-wardrobe` | Slots the game declares, clothes that go in them, and what the player has on. |
| [Messages](/docs/plugins/messages) | `@ifloom/plugin-messages` | Messages that arrive when the story allows, in channels and threads, with replies that work like choices. |
| [Feed](/docs/plugins/feed) | `@ifloom/plugin-feed` | Timelines of other people's posts, the player's own posts, and the likes and comments they get. |
| [Devices](/docs/plugins/devices) | `@ifloom/plugin-devices` | Devices with apps declared as data, badges, and opening an app without leaving the room. |
| [Cheats](/docs/plugins/cheats) | `@ifloom/plugin-cheats` | Cheats for the player, such as +20 coins, that work in any scene and through any lock. Each is free for everyone or refused (or hidden) until a condition holds, such as a supporter unlock. A log records what was used, and content can ask about it. |
| [Debug](/docs/plugins/debug) | `@ifloom/plugin-debug` | Commands for testing that ignore locks. You can set a stat (a character's too) or a kv key, give the player an item (`debug/item`), jump to a scene, set the turn or the calendar's clock, and go anywhere on the places map. Use it in development builds only. |

There's also one bundle:

| Bundle | Package | What it adds |
|---|---|---|
| [Phone](/docs/plugins/phone) | `@ifloom/phone` | A smartphone in one call. It wires devices, messages and feed together, with apps for each channel and feed, contacts and a gallery. |

## How they are built

- **Each is its own package.** A game that doesn't use one doesn't ship it.
- **The engine is a peer dependency.** A plugin uses the game's own copy of `@ifloom/engine`, so a game only ever has one engine. Every `@ifloom` package names another it uses the same way, by the range `^` and its version.
- **They only use the engine's public API.** A first-party plugin imports nothing but `@ifloom/engine`, the same API your own plugins use, so anything one of them does, a plugin of yours can do too.
- **None requires another.** You can add any of them, in any combination. A plugin that works with others lists them in its `cooperates`, and uses them only when the game has them:
  - The cast cooperates with places and the calendar. It asks places where the player is, and its schedules usually use the calendar's conditions. Without places, nobody is ever in the room, but calls still work.
  - The shop cooperates with the calendar and places. A vendor keeps the calendar's hours and stands at a place on the map.
  - Jobs cooperate with the calendar and places. Shifts fall on the calendar's weekdays and periods, take its time, and are worked at a place on the map.
  - Cheats cooperate with unlocks by name. A supporter-only cheat names `unlocks/has` in its `blocked`, and without that plugin the condition is false, so the cheat stays refused.
  - Debug cooperates with the calendar and places. `debug/time` sets the calendar's clock and `debug/go` moves the player on the places map.
  - Messages, the feed and devices cooperate with the cast. Messages and posts show the [cast](/docs/plugins/cast)'s names and faces, and a device's contacts section lists the people the player can call.
  - A device's app can show another plugin's view by name, such as a messages channel or a feed. Messages and feeds work without a device.

  A bundle such as the [phone](/docs/plugins/phone) is the one thing that does depend on plugins, because its job is to wire several together for you.

## Adding one

List the plugin's package in your game's `package.json`, beside the engine, then run `npm install` at the root of the checkout:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-quests": "^0.0.0"
  }
}
```

The range `^0.0.0` matches the checkout's own packages, which a game inside the checkout uses. [Installation](/docs/guide/installation) covers a game kept somewhere else.

Then add it to the game's `plugins`, on the base you pass to [`loadGame`](/docs/reference/loader#loadgame). This is a cut-down version of the showcase's own setup:

```ts
import { loadGame, type Pack } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { quests } from '@ifloom/plugin-quests'

declare const town: Pack // your content

const { game, problems } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro',
  plugins: [calendar(), places({ start: 'flat' }), quests()],
})
```

You choose plugins when you build the game. They're never loaded while it runs. A mod can bring content for a plugin the game already has, in its pack's [`data`](/docs/reference/loader#pack), but it can't add a plugin.

Content names a plugin's conditions and effects by their full name, `<plugin>/<name>`, and you can write that in two forms. The pages below and every plugin's helpers use the short one, which makes the name the only key and the arguments its value:

```ts
{ 'quests/done': { quest: 'settle' } }                 // short
{ custom: 'quests/done', with: { quest: 'settle' } }   // long, the same
```

Both work anywhere a [condition](/docs/reference/conditions), a content effect or a command goes. The short form's value is always an object of named arguments, or `true` for none. See [`PluginCall`](/docs/reference/custom#plugincall).

## Starting from a game that has them all

To see every plugin wired up in a game of your own, start from the showcase:

```sh
npm run new -- my-town --template town
```

That writes `games/my-town`, a copy of Small Town. See [`ifloom new`](/docs/cli#ifloom-new) for the other templates.

## See it in an example

Small Town's [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) uses every plugin here, in its `plugins` list.
