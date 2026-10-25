---
title: "The game"
description: "The Game object: every key a game can have, storylines, the idle screen, saveName, and the helpers that look things up."
---
A game is one `Game` object. It holds every scene, storyline and thing, plus the game's own code the engine calls when it needs to know something about your game. Every engine function takes the game as an argument, and nothing is registered globally. Even the game's own [functions](/docs/reference/custom) live on the game, in its [`rules`](/docs/reference/rules).

```ts
import type { Game } from '@ifloom/engine'
```

Every type on this page comes from the package root: `Game`, `StorylineDef` and the rest. `KindDef`, `EntityDef`, `TriggerDef`, `InputDef` and `ActionDef` have pages of their own.

You don't usually write a `Game` by hand. [`loadGame`](/docs/reference/loader#loadgame) builds one from your content and a base: the base says what the game is and holds its code (`id`, `title`, `version`, `plugins` and `rules`), and everything else comes from the content and packs, so a mod can reach it.

The core has no places and no characters. Locations, exits, walking and where the player is come from the [places plugin](/docs/plugins/places), whose locations are entities in your content's `entities`, written with its `location()`. People, their hours, talking and calling come from the [cast plugin](/docs/plugins/cast), whose characters are entities in your content's `entities`, written with its `person()`.

## Game

```ts
type Game = {
  // From the base
  id: string
  title: string
  version?: number
  plugins?: readonly Plugin[]
  rules?: GameRules
  // From the content and packs
  scenes: (Scene | DataScene)[]
  introScene?: string
  storylines?: StorylineDef[]
  prose?: ProseStore
  strings?: Record<string, string>
  stats?: StatDef[]
  kv?: Record<string, KvValue>
  resets?: Record<string, KvValue>
  kinds?: KindDef[]
  entities?: EntityDef[]
  traits?: TraitTable
  actions?: ActionDef[]
  locks?: Lock[]
  triggers?: TriggerDef[]
  inputs?: InputDef[]
  settings?: SettingDef[]
  minigames?: MinigameDef[]
  timers?: TimerDef[]
  saveable?: Blocked[]
  finished?: Condition
  carryOver?: CarryOver
  audio?: GameAudio
  media?: GameMedia
  ui?: Ui<GameUi>
  data?: Record<string, Record<string, readonly PluginEntry[]>>
  // Set by loadGame
  packs?: string[]
}
```

| Field | What it is |
|---|---|
| `id` | The game's id. [Saves](/docs/reference/saves#keys) are kept under it and refuse another game's, so pick one unique to your game and never change it. |
| `title` | The game's name. The view passes it through as `view().title`. |
| `version` | The game's own version, a whole number from 1. Saves record it, so an update can carry older saves forward with [`rules.migrations`](/docs/reference/rules#migrations). Leave it out and the game is at version 1. Declaring it, even as 1, also stops the engine filling newly declared settings into old saves by itself. See [The game's own migrations](/docs/reference/saves#the-games-own-migrations). |
| `plugins` | The [plugins](/docs/reference/plugins) the game is built with, in the order their hooks run. You choose them on the base you pass to [`loadGame`](/docs/reference/loader#loadgame). |
| `rules` | The game's own code: its hooks, the functions content calls as `game/…`, its commands, `saveName` and `migrations`. See [Rules and hooks](/docs/reference/rules). |
| `scenes` | Every scene. [Data scenes](/docs/reference/scenes#datascene) and hand-written [`Scene`](/docs/reference/scenes#scene)s sit side by side. A data scene is baked into a `Scene` the first time [`sceneById`](#scenebyid) asks for it. |
| `introScene` | The scene on screen on the first frame. It counts as seen once, at turn 0, before any command runs. Leave it out and the game opens on its idle screen (see [below](#game)) with nothing seen. |
| `storylines` | The storylines. None if left out. See [`StorylineDef`](#storylinedef). |
| `prose` | The words data scenes draw on. See [`ProseStore`](#prosestore). [`loadGame`](/docs/reference/loader#loadgame) sets it. If you build a game by hand, make it with [`proseStore`](/docs/reference/prose#prosestore-1). |
| `strings` | Your game's wording for what the engine and its plugins say to the player, by key: `{ finishFirst: 'Not yet.', 'quests/notDoing': 'Not on your list.' }`. Any key you leave out keeps its English. `loadGame` sets it from the content's and the packs' `strings`, with later ones winning. See [Strings](/docs/reference/strings). |
| `stats` | Every stat the game keeps. The engine has none of its own. See [Stats](/docs/reference/stats). |
| `kv` | The [kv store](/docs/reference/state#kv) a new game starts with, such as `{ phase: 'arrival', lives: 3 }`. [`startingState`](/docs/reference/commands#startingstate)'s `kv` goes over it. |
| `resets` | kv keys written back at the end of every turn. See [`resets`](/docs/reference/rules#resets). |
| `kinds` | The kinds of thing the game keeps, such as staff, dishes or what the player carries, each with stats of its own. A plugin's kinds come from its [`content`](/docs/reference/plugins#kinds-and-entities). See [Entities](/docs/reference/entities). |
| `entities` | The things of those kinds that exist at the start of a new game. More can be [created](/docs/reference/effects#create) in play. See [Entities](/docs/reference/entities). |
| `traits` | [Traits](/docs/reference/entities#traits) by trait id and then entity. On a game from [`loadGame`](/docs/reference/loader#traits), every declared entity's traits, worked out from the table rows, the entities and their kinds. On a game built by hand, rows over what the entities declare; [`traitOf`](/docs/reference/entities#traitof) works them out the same way. |
| `actions` | What the player can do, such as waiting, a jog or a drink, each an [`ActionDef`](/docs/reference/actions#actiondef). One with a `label` is a button, offered while no scene is open, after every [plugin's buttons](/docs/reference/plugins#buttons) (the [places plugin](/docs/plugins/places#the-buttons)'s room actions among them), and hidden while a [lock](/docs/reference/locks) that denies `'*'` is on. One with no label is done only by `{ type: 'action', id }`. The engine adds no button of its own, so a game with no `actions` has none. |
| `locks` | What the player can't do for now, and why. See [Locks](/docs/reference/locks). |
| `triggers` | Effects that happen by themselves the first time a condition holds. See [Triggers](/docs/reference/triggers). |
| `inputs` | What the player can type or pick, and the kv key each one writes. See [Inputs](/docs/reference/inputs). |
| `settings` | What the player can change from a settings screen. Nothing is built in. See [Settings](/docs/reference/settings). |
| `minigames` | Small games inside the story, such as a quick-time event, run as states with timers and inputs. See [Minigames](/docs/reference/minigames). |
| `timers` | Named countdowns in real time, such as a phone that rings for ten seconds, with the effects that run when one runs out. See [Timers](/docs/reference/timers). |
| `saveable` | When saving is refused, and why. Saving is always allowed if left out. See [`saveable`](#saveable). |
| `finished` | A [condition](/docs/reference/conditions) that says the game is finished. The runner records the first time it holds in the [profile](/docs/reference/profile), so a title screen can offer New Game+. See [New Game+](/docs/reference/state#new-game). |
| `carryOver` | What a New Game+ takes from the game before: `{ stats?, kv?, held? }`, lists of stat ids, kv keys and the things the player holds, and `held` can be `'all'`. See [New Game+](/docs/reference/state#new-game). |
| `audio` | The game's sounds: its tracks and playlists, its channels, its volume and mute settings and what plays by default. A [`GameAudio`](/docs/reference/audio#gameaudio). `loadGame` merges the content's and every pack's by id. Leave it out and the game is silent. See [Audio](/docs/reference/audio). |
| `media` | The game's pools of pictures and videos, which content picks from by tags: `{ pools: { door: [{ src: 'door/red-night.jpg', tags: ['red', 'night'] }] } }`. A [`GameMedia`](/docs/reference/media#gamemedia). `loadGame` merges the content's and every pack's pools by id. Leave it out and there are no pools. See [Media](/docs/reference/media). |
| `ui` | [Presentation hints](/docs/reference/ui-hints) for the whole game, such as the React UI's default [`transition`](/docs/react/hints#transition) for every screen. The engine carries them as written and gives them no meaning. A pack's hints replace the content's key by key. |
| `data` | Content for the plugins, by plugin id and then list name, as in `data.quests.quests`. `loadGame` sets it, merging each plugin's own content, the game's content and every pack's `data` by entry id. |
| `packs` | The ids of the packs (such as mods) the game was loaded with, in order, and nothing for its own content. [`loadGame`](/docs/reference/loader#loadgame) sets it. A save records them, and a save made with a mod this game lacks names it in [`missingPacks`](/docs/reference/saves#loadedsave). |

A new game starts at turn 0 with `introScene` open and the content's `kv` in its kv store. Each plugin also gets its own start, so the places plugin's `start` puts the player in a room. See [`startingState`](/docs/reference/commands#startingstate).

**The idle screen.** When no scene is open, the screen shows the [`stage`](/docs/reference/plugins#stage) of the first plugin that has one at the moment, the game's own `rules.stage` first. With the places plugin, that's the room the player is in. With no stage, it shows a scene titled with `game.title` and an empty body. Under it come the game's and the plugins' buttons and then the content's `actions`, unless a lock denying `'*'` is on. See [The idle screen](/docs/reference/view#the-idle-screen).

### saveName

The name a save is listed under is worked out by the game's code, so it's [`rules.saveName`](/docs/reference/rules#savename).

### saveable

```ts
saveable?: Blocked[]   // { when: Condition; reason: string; hide?: boolean }[]
```

When the player can't save, as [`Blocked`](/docs/reference/actions#blocked) entries: saving is refused while an entry's `when` holds, with its `reason`. The first entry that holds gives the reason. Leave it out and saving is always allowed. It's content, so a pack can add entries, which come after the content's.

```ts
import type { Content } from '@ifloom/engine'

export const ch1: Content = {
  // No saving on the first page until the reader has typed a name.
  saveable: [{ when: { not: { kv: 'playerName' } }, reason: 'Type your name first.' }],
}
```

- **The runner refuses.** [`runner.save`](/docs/reference/runner#the-runners-members) fails with the reason, and an [autosave](/docs/reference/runner#autosaveoptions) that's due is skipped. Loading is never refused.
- **The view says so first.** [`view.saving`](/docs/reference/view#saving) is `{ allowed, reason, visible }`, so a UI can grey out its Save button with the reason, or leave it off while an entry with `hide` holds. The React UI's [saves menu](/docs/react/components#savesmenu) does this.
- The [content checker](/docs/reference/checks) checks each `when` as it checks any condition, and reports problems at `saveable`.

**A game with no places.** Without the [places plugin](/docs/plugins/places) there's no room to stand in and no exits, and with the [cast](/docs/plugins/cast) nobody is ever in the room. A linear story gives only an `introScene` in its content, and the screen is whatever scene is open. [The Letter](/docs/guide/shapes) works this way.

This is the showcase, trimmed. The base holds what the game is and its code. Where it starts, its starting kv and its buttons are content, from the game's files, through [`loadGame`](/docs/reference/loader#loadgame):

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { rules } from './rules.ts'

const movingDay: Content = {
  introScene: 'intro',
  kv: { phase: 'arrival' },
  actions: [{ id: 'wait', label: 'Wait a while', effects: [{ 'calendar/pass': { by: 1 } }] }],
  // ...its scenes
}

const { game, problems } = loadGame([movingDay], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [calendar(), places({ start: 'flat' }), cast()],
  rules,
})
```

The town's locations and its people are entities, in `entities`, written with the places plugin's `location()` and the cast's `person()`. `loadGame` fills in `game.entities` from the content. To build a game from several files, with mods layered on top, see [Content, packs and loading](/docs/reference/loader).

## Scene

```ts
type Scene = {
  id: string
  title?: string
  speaker?: string
  tags?: string[]
  panel?: ScenePanel
  ui?: Ui<SceneUi>
  drawnFrom?: string[]
  weight?: number
  when?: Condition
  render: (state: GameState, ctx: SceneCtx) => SceneView
}
```

A scene is anything with an id and a `render` function. If you write it as data, a [`DataScene`](/docs/reference/scenes#datascene), the engine builds `render` for you. `drawnFrom`, `weight` and `when` make it a [storylet](/docs/reference/storylets), a scene drawn at random from a named set. See [Scenes](/docs/reference/scenes) for `Scene`, `SceneView`, `SceneChoice` and `SceneCtx`.

## StorylineDef

```ts
type StorylineDef = { id: string; name: string }
```

A storyline is a thread of the story. It's followed by its kv store and stages, and can be closed for a while if need be. Each declared storyline gets a [`StorylineState`](/docs/reference/state#storylines) in a new game, and an older save that lacks one gets an empty one the next time a command runs on it. A [cast](/docs/plugins/cast#person-1) character can belong to one through their `storyline` field, but a storyline doesn't need a character. See [Storylines](/docs/reference/storylines).

```ts
storylines: [
  { id: 'ava', name: 'Ava' },
  { id: 'sam', name: 'Sam' },
]
```

The view draws no storylines of its own. A game or a plugin shows them, as the [quests](/docs/plugins/quests) plugin does when it groups quests by storyline.

## ProseStore

```ts
type ProseStore = {
  line: (key: string, state?: GameState) => string | undefined
  variants: (name: string) => string[]
  weight?: (name: string, key: string) => number
  keys?: () => string[]
}
```

The words a data scene draws on. `line` gives the text for a key, filled in for this save. `variants` gives the member keys of a named set of variants, in order. `weight` gives a member's [weight](/docs/reference/prose#variantmember) in a set, 1 if it has none, and every member weighs 1 if it's left out. `keys` lists every key the store has words for, so the [content checker](/docs/reference/checks) can read the markup in all of them. Without it, the checker reads only the keys content names. Data scenes read it as they're [drawn](/docs/reference/scenes#running-data-scenes). See [Prose and markup](/docs/reference/prose).

**Gotcha.** A game with data scenes and no `prose` renders them empty, because every line counts as unwritten. [`loadGame`](/docs/reference/loader#loadgame) sets it. A game built by hand sets it with [`proseStore`](/docs/reference/prose#prosestore-1).

## Ids and separators

Content names things by id, and an id is letters, digits, `-` and `_`, in parts joined by `.`, such as `cafe.counter`. The other separators always mean the same thing, wherever they appear:

| Separator | Means | Examples |
|---|---|---|
| `.` | A part of an id. | Scene `cafe.counter`, prose key `place.cafe.ava`, audio track `cafe.murmur` |
| `/` | A plugin's name: its id, then the name. | `quests/done`, `statuses/apply`, `{{v:messages/unread}}`, the string `calendar/period.morning` |
| `#` | A choice in a scene, or a reply to a message. | The label key `ch1.mat#open`, and `{ chose: 'ch1.mat#open' }` |
| `:` | A reference with what it is in front. | The entity `character:ava`, a mod's pack `mod:naps`, the profile's `core:settings` |

So keep `/`, `#` and `:` out of your own ids and prose keys. A name with a `/` is looked up among the plugins first.

## Looking things up

```ts
function sceneById(game: Game, id: string): Scene | undefined
```

Returns the scene with that id, or `undefined`. To look up an entity, use [`entityOf`](/docs/reference/entities#entityof) or [`kindById`](/docs/reference/entities#kindbyid).

### sceneById

Returns a scene ready to render. A [`DataScene`](/docs/reference/scenes#datascene) is baked into a `Scene` (with [`bakeScene`](/docs/reference/scenes#bakescene)) the first time it's asked for, and the same `Scene` comes back after that. A hand-written `Scene` is returned as it is.

```ts
import { sceneById, sceneContext } from '@ifloom/engine'

const intro = sceneById(game, 'intro')
const shown = intro?.render(state, sceneContext(state, game))
```

**Gotcha.** Look scenes up through `sceneById`, not `game.scenes.find(...)`. The list holds data scenes as you declared them, with no `render`.

## Checking a game

[`checkGame`](/docs/reference/checks#checkgame) checks that everything the game names resolves, and lists the files it names. Run it from a test so a broken id fails at commit time instead of mid-game. [`loadGame`](/docs/reference/loader#loadgame) runs it for you. [Checking content](/docs/reference/checks) has the whole list.

## See it in an example

- Small Town: [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) passes `id`, `title`, `plugins` and `rules` to `loadGame`, and everything else is content: the moving-day story in [`story/moving-day.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/moving-day.ts) gives the `introScene`, the starting `kv` and a lock, and [`world/actions.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/actions.ts) the buttons. The things in [`examples/showcase/src/world/things.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/things.ts) are entities, and the sandwich and flapjack have the inventory's `usable` trait. The `storylines` in [`examples/showcase/src/world/cast.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/cast.ts) are Ava's and Sam's.
- The Letter: [`examples/novel/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/game.ts) sets `version`, with `migrations` and `saveName` in its rules.
