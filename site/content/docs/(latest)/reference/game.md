---
title: "The game"
description: "The Game object: every key a game can have, storylines, the idle screen, saveName, and the helpers that look things up."
---
A game is one `Game` object. It holds every scene, storyline and thing, plus the rules the engine calls when it needs to know something about your game. Every engine function takes the game as an argument, and nothing is registered globally. Even the game's own [custom functions](/docs/reference/custom) live on the game.

```ts
import type { Game } from '@ifloom/engine'
```

Every type on this page comes from the package root: `Game`, `StorylineDef` and the rest. `KindDef`, `EntityDef`, `TriggerDef`, `InputDef` and `ActionDef` have pages of their own.

The core has no places and no characters. Locations, exits, walking and where the player is come from the [places plugin](/docs/plugins/places), whose locations are content in your content's `data.places.locations`. People, their hours, talking and calling come from the [cast plugin](/docs/plugins/cast), whose characters are entities in your content's `entities`, written with its `person()`.

## Game

```ts
type Game = {
  id: string
  title: string
  version?: number
  migrations?: Record<number, (state: GameState, tools: MigrationTools) => GameState>
  settings?: SettingDef[]
  carryOver?: CarryOver
  saveName?: (state: GameState) => string | null
  finished?: Condition
  startPhase?: string
  saveable?: Blocked[]
  stats?: StatDef[]
  kinds?: KindDef[]
  entities?: EntityDef[]
  traits?: TraitTable
  introScene?: string
  activities?: ActivityDef[]
  scenes: (Scene | DataScene)[]
  storylines?: StorylineDef[]
  prose?: ProseStore
  rules?: GameRules
  strings?: Record<string, string>
  triggers?: TriggerDef[]
  inputs?: InputDef[]
  minigames?: MinigameDef[]
  custom?: Custom
  actions?: ActionDef[]
  packs?: string[]
  plugins?: readonly Plugin[]
  data?: Record<string, Record<string, readonly PluginEntry[]>>
  audio?: GameAudio
  media?: GameMedia
  ui?: Ui<GameUi>
}
```

| Field | What it is |
|---|---|
| `id` | The game's id. [Saves](/docs/reference/saves#keys) are kept under it and refuse another game's, so pick one unique to your game and never change it. |
| `title` | The game's name. The view passes it through as `view().title`. |
| `version` | The game's own version, a whole number from 1. Saves record it, so an update can carry older saves forward with `migrations`. Leave it out and the game is at version 1. Declaring it, even as 1, also stops the engine filling newly declared settings into old saves by itself. See [The game's own migrations](/docs/reference/saves#the-games-own-migrations). |
| `migrations` | Steps that carry a save from one version of the game to the next, keyed by the version each upgrades from: step 1 takes a version-1 save to version 2. Each is `(state, tools) => GameState`, and `tools.fill()` fills in content the save lacks. They run when an older save loads. See [The game's own migrations](/docs/reference/saves#the-games-own-migrations). |
| `settings` | What the player can change from a settings screen. Nothing is built in. See [Settings](/docs/reference/settings). |
| `carryOver` | What a New Game+ takes from the game before: `{ stats?, kv?, held? }`, lists of stat ids, kv keys and the things the player holds, and `held` can be `'all'`. See [New Game+](/docs/reference/state#new-game). |
| `saveName` | The name a save is listed under, worked out from the state. See [`saveName`](#savename). |
| `finished` | A [condition](/docs/reference/conditions) that says the game is finished. The runner records the first time it holds in the [profile](/docs/reference/profile), so a title screen can offer New Game+. See [New Game+](/docs/reference/state#new-game). |
| `startPhase` | The stage a new game opens in. Default `''`. See [`phase`](/docs/reference/state#phase). |
| `saveable` | When saving is refused, and why. Saving is always allowed if left out. See [`saveable`](#saveable). |
| `introScene` | The scene on screen on the first frame. It counts as seen once, at turn 0, before any command runs. Leave it out and the game opens on its idle screen (see [below](#game)) with nothing seen. |
| `stats` | Every stat the game keeps. The engine has none of its own. See [Stats](/docs/reference/stats). |
| `kinds` | The kinds of thing the game keeps, such as staff, dishes or what the player carries, each with stats of its own. See [Entities](/docs/reference/entities). |
| `entities` | The things of those kinds that exist at the start of a new game. More can be [created](/docs/reference/effects#create) in play. See [Entities](/docs/reference/entities). |
| `traits` | [Traits](/docs/reference/entities#traits) by trait id and then entity. On a game from [`loadGame`](/docs/reference/loader#traits), every declared entity's traits, worked out from the table rows, the entities and their kinds. On a game built by hand, rows over what the entities declare; [`traitOf`](/docs/reference/entities#traitof) works them out the same way. |
| `activities` | Everything the player can do, such as paperwork, a jog or a drink. None if left out. See [Activities and buttons](/docs/reference/actions). |
| `scenes` | Every scene. [Data scenes](/docs/reference/scenes#datascene) and hand-written [`Scene`](/docs/reference/scenes#scene)s sit side by side. A data scene is baked into a `Scene` the first time [`sceneById`](#scenebyid) asks for it. |
| `storylines` | The storylines. None if left out. See [`StorylineDef`](#storylinedef). |
| `prose` | The words data scenes draw on. See [`ProseStore`](#prosestore). [`loadGame`](/docs/reference/loader#loadgame) sets it. If you build a game by hand, make it with [`proseStore`](/docs/reference/prose#prosestore-1). |
| `strings` | Your game's wording for what the engine and its plugins say to the player, by key: `{ finishFirst: 'Not yet.', 'quests/notDoing': 'Not on your list.' }`. Any key you leave out keeps its English. `loadGame` sets it from the base's, the content's and the packs' `strings`, with later ones winning. See [Strings](/docs/reference/strings). |
| `triggers` | Effects that happen by themselves the first time a condition holds. See [Triggers](/docs/reference/triggers). |
| `inputs` | What the player can type or pick, and the kv key each one writes. See [Inputs](/docs/reference/inputs). |
| `minigames` | Small games inside the story, such as a quick-time event, run as states with timers and inputs. See [Minigames](/docs/reference/minigames). |
| `custom` | The game's [custom functions](/docs/reference/custom): conditions, effects, values and panels that content calls by name. |
| `actions` | The game's own buttons, such as waiting or checking a map. Each is an [`ActionDef`](/docs/reference/actions#actiondef). They're offered while no scene is open, after every [plugin's buttons](/docs/reference/plugins#buttons) (the [places plugin](/docs/plugins/places#the-buttons)'s room actions among them). They're also hidden while a [lock](/docs/reference/locks) that denies `'*'` is on. The engine adds no button of its own, so a game with no `actions` has none. |
| `packs` | The ids of the packs (such as mods) the game was loaded with, in order, and nothing for its own content. [`loadGame`](/docs/reference/loader#loadgame) sets it. A save records them, and a save made with a mod this game lacks names it in [`missingPacks`](/docs/reference/saves#loadedsave). |
| `rules` | The game's own logic. See [Rules and hooks](/docs/reference/rules). |
| `plugins` | The [plugins](/docs/reference/plugins) the game is built with, in the order their hooks run. You choose them when you build the game, on the base you pass to [`loadGame`](/docs/reference/loader#loadgame). |
| `data` | Content for the plugins, by plugin id and then list name, as in `data.quests.quests`. `loadGame` sets it, merging `base.data`, the content's and every pack's `data` by entry id. |
| `audio` | The game's sounds: its tracks and playlists, its channels, its volume and mute settings and what plays by default. A [`GameAudio`](/docs/reference/audio#gameaudio). `loadGame` merges the base's, the content's and every pack's by id. Leave it out and the game is silent. See [Audio](/docs/reference/audio). |
| `media` | The game's pools of pictures and videos, which content picks from by tags: `{ pools: { door: [{ src: 'door/red-night.jpg', tags: ['red', 'night'] }] } }`. A [`GameMedia`](/docs/reference/media#gamemedia). `loadGame` merges the base's and every pack's pools by id. Leave it out and there are no pools. See [Media](/docs/reference/media). |
| `ui` | [Presentation hints](/docs/reference/ui-hints) for the whole game, such as the React UI's default [`transition`](/docs/react/hints#transition) for every screen. The engine carries them as written and gives them no meaning. A key of the game only; packs can't set it. |

A new game starts at turn 0 with `introScene` open. Each plugin also gets its own start, so the places plugin's `start` puts the player in a room. See [`startingState`](/docs/reference/commands#startingstate).

**The idle screen.** When no scene is open, the screen shows the [`stage`](/docs/reference/plugins#stage) of the first plugin that has one at the moment. With the places plugin, that's the room the player is in. With no stage, it shows a scene titled with `game.title` and an empty body. Under it come the plugins' buttons and then the game's own `actions`, unless a lock denying `'*'` is on. See [The idle screen](/docs/reference/view#the-idle-screen).

### saveName

```ts
saveName?: (state: GameState) => string | null
```

The name a save is listed under, usually the name the player typed. Each save records what it returns as [`SaveMeta.player`](/docs/reference/saves#savemeta), so a load screen can show whose save it is. Return `null` for no name. Leave `saveName` out and every save's `player` is `null`.

```ts
const { game } = loadGame([letter], {
  id: 'the-letter',
  title: 'The Letter',
  introScene: 'ch1.mat',
  saveName: (state) => (typeof state.kv.playerName === 'string' ? state.kv.playerName : null),
})
```

The engine doesn't keep a player name of its own. The usual place is a `playerName` key in the [kv store](/docs/reference/state#kv), written by an [input](/docs/reference/inputs), and The Letter reads it from there. A name kept anywhere else works too, because `saveName` can read any part of the state.

### saveable

```ts
saveable?: Blocked[]   // { when: Condition; reason: string; hide?: boolean }[]
```

When the player can't save, as [`Blocked`](/docs/reference/actions#blocked) entries: saving is refused while an entry's `when` holds, with its `reason`. The first entry that holds gives the reason. Leave it out and saving is always allowed.

```ts
const { game } = loadGame([letter], {
  id: 'the-letter',
  title: 'The Letter',
  introScene: 'ch1.mat',
  // No saving on the first page until the reader has typed a name.
  saveable: [{ when: { not: { kv: 'playerName' } }, reason: 'Type your name first.' }],
})
```

- **The runner refuses.** [`runner.save`](/docs/reference/runner#the-runners-members) fails with the reason, and an [autosave](/docs/reference/runner#autosaveoptions) that's due is skipped. Loading is never refused.
- **The view says so first.** [`view.saving`](/docs/reference/view#saving) is `{ allowed, reason, visible }`, so a UI can grey out its Save button with the reason, or leave it off while an entry with `hide` holds. The React UI's [saves menu](/docs/react/components#savesmenu) does this.
- **It's the game's, not the content's.** Content and packs can't set it.
- The [content checker](/docs/reference/checks) checks each `when` as it checks any condition, and reports problems at `saveable`.

**A game with no places.** Without the [places plugin](/docs/plugins/places) there's no room to stand in and no exits, and with the [cast](/docs/plugins/cast) nobody is ever in the room. A linear story passes only `introScene`, and the screen is whatever scene is open. [The Letter](/docs/guide/shapes) works this way.

This is the showcase's base, trimmed. The content comes from the game's files through [`loadGame`](/docs/reference/loader#loadgame):

```ts
import { loadGame } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { content } from './content.ts'

const { game, problems } = loadGame(content, {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro',
  startPhase: 'arrival',
  plugins: [calendar(), places({ start: 'flat' }), cast()],
  actions: [{ id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } }],
})
```

The town's locations are the places plugin's content, in `data.places.locations`, and its people are entities, in `entities`; `loadGame` fills in `data` from the content. To build a game from several files, with mods layered on top, see [Content, packs and loading](/docs/reference/loader).

## Scene

```ts
type Scene = {
  id: string
  title?: string
  speaker?: string
  tags?: string[]
  panel?: string
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

The words a data scene draws on. `line` gives the text for a key, filled in for this save. `variants` gives the member keys of a named set of variants, in order. `weight` gives a member's [weight](/docs/reference/prose#variantmember) in a set, 1 if it has none, and every member weighs 1 if it's left out. `keys` lists every key the store has words for, so the [content checker](/docs/reference/checks) can read the markup in all of them. Without it, the checker reads only the keys content names. Data scenes read it through the [default runtime](/docs/reference/scenes#defaultruntime). See [Prose and markup](/docs/reference/prose).

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

- Small Town: [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) passes `introScene`, `startPhase`, `custom`, `plugins`, `actions`, `strings` and `rules` to `loadGame`. The things in [`examples/showcase/src/world/things.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/things.ts) are entities, and the sandwich and flapjack have the inventory's `usable` trait. The `storylines` in [`examples/showcase/src/world/cast.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/cast.ts) are Ava's and Sam's.
- The Letter: [`examples/novel/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/game.ts) sets `version`, `migrations`, `finished` and `carryOver`.
