# First-party plugins

A [plugin](/reference/plugins) adds a whole system to the engine, with its own state, conditions, effects, commands, hooks and view. The engine has no systems built in beyond its core. Systems a game may or may not want live in plugins, and the first-party ones are kept in the IFLoom repository beside the engine.

| Plugin | Package | What it adds |
|---|---|---|
| [Calendar](/plugins/calendar) | `@ifloom/plugin-calendar` | The game's clock: the periods of a day, the days of a week, sleep and a curfew, and what a turn is: a period, a day or a week. Opening hours and schedules are written with its conditions. |
| [Places](/plugins/places) | `@ifloom/plugin-places` | Locations with exits and things to do in each, walking between them, and where the player is. Locations are content, so a mod can add a room. The engine has no places of its own. |
| [Cast](/plugins/cast) | `@ifloom/plugin-cast` | The game's people: characters who keep their own hours, who is in the room, talking and calling, and what the game keeps about each, such as a friendship, as stats on them. Characters are content, so a mod can add someone. The engine has no people of its own. |
| [Quests](/plugins/quests) | `@ifloom/plugin-quests` | What the player is doing, how far they have got, and the hint for what comes next. |
| [Wardrobe](/plugins/wardrobe) | `@ifloom/plugin-wardrobe` | Slots the game declares, clothes that go in them, and what the player has on. |
| [Messages](/plugins/messages) | `@ifloom/plugin-messages` | Messages that arrive when the story allows, in channels and threads, with replies that work like choices. |
| [Feed](/plugins/feed) | `@ifloom/plugin-feed` | Timelines of other people's posts, the player's own posts, and the likes and comments they get. |
| [Devices](/plugins/devices) | `@ifloom/plugin-devices` | Devices with apps declared as data, badges, and opening an app without leaving the room. |
| [Debug](/plugins/debug) | `@ifloom/plugin-debug` | Commands for testing: set a stat (a character's too) or a variable, jump to a scene, set the calendar's clock or the turn, go anywhere on the places plugin's map. Development builds only. |

And one bundle:

| Bundle | Package | What it adds |
|---|---|---|
| [Phone](/plugins/phone) | `@ifloom/phone` | A smartphone in one call: devices, messages and feed wired together, with apps for each channel and feed, contacts and a gallery. |

## How they are built

- **Each is its own package.** A game that does not use one does not ship it.
- **The engine is a peer dependency.** A plugin uses the game's own copy of `@ifloom/engine`, so there is only ever one engine in a game.
- **They use only the engine's front door.** A first-party plugin imports nothing but `@ifloom/engine`, the same API your own plugins use. Anything one can do, a plugin of yours can do too.
- **None requires another.** Add any of them, in any combination. Messages and feeds work without a device, and devices show them as apps when both are there. Messages, the feed and a phone's contacts show the [cast](/plugins/cast)'s names and faces when the game has the cast, and work without it. A bundle such as the [phone](/plugins/phone) is the one thing that depends on plugins: it wires several together for you.

## Adding one

Install the package beside the engine. While IFLoom is pre-release, point both at a local checkout, as in [Installation](/guide/installation):

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/plugin-quests": "file:../ifloom/packages/plugin-quests"
  }
}
```

Then add it to the game's `plugins`, on the base you pass to [`loadGame`](/reference/loader#loadgame):

```ts
import { loadGame } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { quests } from '@ifloom/plugin-quests'

const { game, problems } = loadGame(packs, {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro.wake',
  plugins: [calendar(), places({ start: 'house' }), quests()],
})
```

Plugins are chosen when the game is built and are never loaded while it runs. A mod can bring content for a plugin the game has, in its pack's [`data`](/reference/loader#pack), but it cannot add one.

Content names a plugin's conditions and effects by their full name, `<plugin>/<name>`, in either of two forms. The pages below show the long one; the short one puts the name as the only key:

```ts
{ custom: 'quests/done', with: { quest: 'bakery' } }   // long
{ 'quests/done': { quest: 'bakery' } }                 // short, the same
```

Both work anywhere a [condition](/reference/conditions) or a content effect goes. [Custom functions](/reference/custom) has the rule for what the short form's value becomes.
