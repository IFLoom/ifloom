# The game

A game is one `Game` object. It holds every item, scene and storyline, plus the rules the engine calls when it needs to know something about your game. Every engine function takes the game as an argument, and nothing is registered globally. Even the game's own [custom functions](/reference/custom) live on the game.

```ts
import type { Game } from '@ifloom/engine'
```

Every type on this page comes from the package root: `Game`, `ItemDef`, `StorylineDef` and the rest. `CollectionDef`, `TriggerDef`, `InputDef` and `ActionDef` have pages of their own.

The core has no places and no characters. Locations, exits, walking and where the player is come from the [places plugin](/plugins/places), whose locations are content in a pack's `data.places.locations`. People, their hours, talking and calling come from the [cast plugin](/plugins/cast), whose characters are content in `data.cast.characters`.

## Game

```ts
type Game = {
  id: string
  title: string
  settings?: SettingDef[]
  carryOver?: CarryOver
  finished?: Condition
  startPhase?: string
  stats?: StatDef[]
  kinds?: KindDef[]
  entities?: EntityDef[]
  introScene?: string
  activities: ActivityDef[]
  items: ItemDef[]
  scenes: (Scene | DataScene)[]
  storylines: StorylineDef[]
  prose?: ProseStore
  rules?: GameRules
  strings?: Record<string, string>
  collections?: CollectionDef[]
  triggers?: TriggerDef[]
  inputs?: InputDef[]
  custom?: Custom
  actions?: ActionDef[]
  packs?: string[]
  plugins?: readonly Plugin[]
  data?: Record<string, Record<string, readonly PluginEntry[]>>
}
```

| Field | What it is |
|---|---|
| `id` | The game's id. [Saves](/reference/saves#keys) are kept under it and refuse another game's, so pick one unique to your game and never change it. |
| `title` | The game's name. The view passes it through as `view().title`. |
| `settings` | What the player can change from a settings screen. Nothing is built in. See [Settings](/reference/settings). |
| `carryOver` | What a New Game+ takes from the game before: `{ stats?, flags?, items? }`, each a list of ids, and `items` can be `'all'`. See [New Game+](/reference/state#new-game). |
| `finished` | A [condition](/reference/conditions) that says the game is finished. The runner records the first time it holds in the [profile](/reference/profile), so a title screen can offer New Game+. See [New Game+](/reference/state#new-game). |
| `startPhase` | The stage a new game opens in. Default `''`. See [`phase`](/reference/state#phase). |
| `introScene` | The scene on screen on the first frame. It counts as seen once, at turn 0, before any command runs. Leave it out and the game opens on its idle screen (see [below](#game)) with nothing seen. |
| `stats` | Every stat the game keeps. The engine has none of its own. See [Stats](/reference/stats). |
| `kinds` | The kinds of thing the game keeps several of, such as staff or dishes, each with stats of its own. See [Entities](/reference/entities). |
| `entities` | The things of those kinds that exist at the start of a new game. More can be [created](/reference/effects#create) in play. See [Entities](/reference/entities). |
| `activities` | Everything the player can do, such as paperwork, a jog or a drink. See [Activities and buttons](/reference/actions). |
| `items` | Things the player can have. See [`ItemDef`](#itemdef). |
| `scenes` | Every scene. [Data scenes](/reference/scenes#datascene) and hand-written [`Scene`](/reference/scenes#scene)s sit side by side. A data scene is baked into a `Scene` the first time [`sceneById`](#scenebyid) asks for it. |
| `storylines` | The storylines. See [`StorylineDef`](#storylinedef). |
| `prose` | The words data scenes draw on. See [`ProseStore`](#prosestore). [`loadGame`](/reference/loader#loadgame) sets it. If you build a game by hand, make it with [`proseStore`](/reference/prose#prosestore-1). |
| `strings` | Your game's wording for what the engine and its plugins say to the player, by key: `{ finishFirst: 'Not yet.', 'quests/notDoing': 'Not on your list.' }`. Any key you leave out keeps its English. `loadGame` sets it from the base's and the packs' `strings`, with later ones winning. See [Strings](/reference/strings). |
| `collections` | Named lists the game keeps entries in, such as letters, photos or a ledger. See [Collections](/reference/collections). |
| `triggers` | Effects that happen by themselves the first time a condition holds. See [Triggers](/reference/triggers). |
| `inputs` | What the player can type or pick, and the variable each one writes. See [Inputs](/reference/inputs). |
| `custom` | The game's [custom functions](/reference/custom): conditions, effects, values and panels that content calls by name. |
| `actions` | The game's own buttons, such as waiting or checking a map. Each is an [`ActionDef`](/reference/actions#actiondef). They're offered while no scene is open, after every [plugin's buttons](/reference/plugins#buttons) (the [places plugin](/plugins/places#the-buttons)'s room actions among them). They're also hidden while a [lock](/reference/locks) that denies `'*'` is on. The engine adds no button of its own, so a game with no `actions` has none. |
| `packs` | The ids of the packs the game was loaded from, in order. [`loadGame`](/reference/loader#loadgame) sets it. A save records them, and a save made with a pack this game lacks names it in [`missingPacks`](/reference/saves#loadedsave). |
| `rules` | The game's own logic. See [Rules and hooks](/reference/rules). |
| `plugins` | The [plugins](/reference/plugins) the game is built with, in the order their hooks run. You choose them when you build the game, on the base you pass to [`loadGame`](/reference/loader#loadgame). |
| `data` | Content for the plugins, by plugin id and then list name, as in `data.quests.quests`. `loadGame` sets it, merging `base.data` and every pack's `data` by entry id. |

A new game starts at turn 0 with `introScene` open. Each plugin also gets its own start, so the places plugin's `start` puts the player in a room. See [`startingState`](/reference/commands#startingstate).

**The idle screen.** When no scene is open, the screen shows the [`stage`](/reference/plugins#stage) of the first plugin that has one at the moment. With the places plugin, that's the room the player is in. With no stage, it shows a scene titled with `game.title` and an empty body. Under it come the plugins' buttons and then the game's own `actions`, unless a lock denying `'*'` is on. See [The idle screen](/reference/view#the-idle-screen).

**A game with no places.** Without the [places plugin](/plugins/places) there's no room to stand in and no exits, and with the [cast](/plugins/cast) nobody is ever in the room. A linear story passes only `introScene`, and the screen is whatever scene is open. [The Letter](/guide/shapes) works this way.

This is the showcase's base, trimmed. The content comes from a pack through [`loadGame`](/reference/loader#loadgame):

```ts
import { loadGame } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { town } from './content/town.ts'

const { game, problems } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro',
  startPhase: 'arrival',
  plugins: [calendar(), places({ start: 'flat' }), cast()],
  actions: [{ id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } }],
})
```

The town's locations and people are the plugins' content, in `data.places.locations` and `data.cast.characters`, and `loadGame` fills in `data` from the packs. To build a game from several packs, with mods layered on top, see [Packs and loading](/reference/loader).

## ItemDef

```ts
type ItemDef = {
  id: string
  name: string
  desc: string
  kind: 'gear' | 'stuff'
  start?: number
  use?: { label: string; effects: Effect[] }
}
```

| Field | What it does |
|---|---|
| `kind` | `gear` starts at 1 in a new game and `stuff` at 0, unless `start` says otherwise. |
| `start` | How many a new game starts with. |
| `use` | Makes the item usable with [`use`](/reference/commands#use). Using it spends one, then runs these [effects](/reference/effects). |

An item has no slot of its own. To let the player wear one, add the [wardrobe plugin](/plugins/wardrobe) and list the item among its clothes.

```ts
import type { ItemDef } from '@ifloom/engine'

const sandwich: ItemDef = {
  id: 'sandwich',
  name: 'sandwich',
  desc: 'Cheese and pickle, wrapped in paper.',
  kind: 'stuff',
  use: { label: 'Eat the sandwich', effects: [{ kind: 'stat', key: 'energy', by: 25 }] },
}
```

## Scene

```ts
type Scene = {
  id: string
  title?: string
  speaker?: string
  frame?: 'talk'
  tags?: string[]
  panel?: string
  render: (state: GameState, ctx: SceneCtx) => SceneView
}
```

A scene is anything with an id and a `render` function. If you write it as data, a [`DataScene`](/reference/scenes#datascene), the engine builds `render` for you. See [Scenes](/reference/scenes) for `Scene`, `SceneView`, `SceneChoice` and `SceneCtx`.

## StorylineDef

```ts
type StorylineDef = { id: string; name: string }
```

A storyline is a thread of the story. It's followed by its variables and stages, and can be closed for a while if need be. Each declared storyline gets a [`StorylineState`](/reference/state#storylines) in a new game, and an older save that lacks one gets an empty one the next time a command runs on it. A [cast](/plugins/cast#characterdef) character can belong to one through their `storyline` field, but a storyline doesn't need a character. See [Storylines](/reference/storylines).

```ts
storylines: [
  { id: 'ava', name: 'Ava' },
  { id: 'sam', name: 'Sam' },
]
```

The view draws no storylines of its own. A game or a plugin shows them, as the [quests](/plugins/quests) plugin does when it groups quests by storyline.

## ProseStore

```ts
type ProseStore = {
  line: (key: string, state?: GameState) => string | undefined
  variants: (name: string) => string[]
}
```

The words a data scene draws on. `line` gives the text for a key, filled in for this save. `variants` gives the member keys of a named set of variants, in order. Data scenes read it through the [default runtime](/reference/scenes#defaultruntime). See [Prose and markup](/reference/prose).

**Gotcha.** A game with data scenes and no `prose` renders them empty, because every line counts as unwritten. [`loadGame`](/reference/loader#loadgame) sets it. A game built by hand sets it with [`proseStore`](/reference/prose#prosestore-1).

## Looking things up

```ts
function sceneById(game: Game, id: string): Scene | undefined
function itemById(game: Game, id: string): ItemDef | undefined
```

Each returns the entry with that id, or `undefined`. The engine finds everything through these.

### sceneById

Returns a scene ready to render. A [`DataScene`](/reference/scenes#datascene) is baked into a `Scene` (with [`bakeScene`](/reference/scenes#bakescene)) the first time it's asked for, and the same `Scene` comes back after that. A hand-written `Scene` is returned as it is.

```ts
import { sceneById, sceneContext } from '@ifloom/engine'

const intro = sceneById(game, 'intro')
const shown = intro?.render(state, sceneContext(state, game))
```

**Gotcha.** Look scenes up through `sceneById`, not `game.scenes.find(...)`. The list holds data scenes as you declared them, with no `render`.

### itemById

```ts
import { itemById } from '@ifloom/engine'

itemById(game, 'sandwich')?.kind   // 'stuff'
```

## validatePack

```ts
function validatePack(game: Game, probes?: readonly GameState[]): string[]
```

Checks that every id the game points at resolves. It returns one line per problem, as `where: what`, and an empty array means the game is clean. Run it from a test so a broken id fails at commit time instead of mid-game.

```ts
import { startingState, validatePack } from '@ifloom/engine'

const morning = { ...startingState(game), sceneId: null, turn: 2 }
expect(validatePack(game, [morning])).toEqual([])
```

It always checks:

- duplicate ids among items, scenes, storylines and activities
- that `introScene` exists, if the game gives one
- the effects in each item's `use` and each activity's `effects` (when they're a list), as described below
- that every stat an activity's `cost` spends is declared
- the commands of the game's own `actions`: a scene that doesn't exist, an item that doesn't exist, or a `{ type: 'custom' }` command that names no [plugin command](/reference/plugins#plugincommand) the game has (`no plugin command named …`)
- that every stat's `max: { value }` names a [custom value](/reference/custom#values) the game declares
- [settings](/reference/settings): duplicate ids, each declaration, and every `{ setting }` condition the game declares as data
- that the stats and items in `carryOver` are declared

In those effect lists, it reports:

- a `scene` effect to a scene that doesn't exist, or an `item` effect on an item that doesn't exist
- a `storylineFlag` or `closeStoryline` effect on an undeclared storyline
- a `stat` or `setStat` effect on a stat that isn't [declared](/reference/stats), or on the wrong owner (a player's stat given an `of`, or an entity's stat without one or with another kind's)
- a `collect` or `discard` effect on an undeclared [collection](/reference/collections) (`collection … is not declared`)
- a `collect` entry's or a `notify` effect's `text` that names a prose key the game doesn't have (`no prose for …`)
- a long-form `{ kind: 'custom', name }` effect that names no plugin effect the game has (`no plugin effect named …`), unless it's an [absent partner](/reference/loader#the-checks) a plugin cooperates with
- the plain effects inside an `each`, checked as any other effect with `'$'` standing for one of the kind

A short-form `{ custom }` call isn't looked inside.

With `probes`, every scene is also rendered against each probe state. Anything that throws is reported, along with duplicate choice ids and the ids in the rendered choices' effects.

**Gotchas.**
- Without probes, the choices of hand-written scenes are never looked at. Pass a few states that reach different branches.
- Conditions, data scenes, triggers and the custom functions content names are checked by the [loader](/reference/loader#the-checks), not here. So are a place's exits, body and actions (by the [places plugin](/plugins/places#checks)) and characters (by the [cast plugin](/plugins/cast#checks)).
