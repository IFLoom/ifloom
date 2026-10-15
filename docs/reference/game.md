# The game

A game is one `Game`: every item, scene and storyline, plus the rules the engine calls instead of knowing your game. Every function in the engine takes the game as an argument; nothing is registered globally — even the game's own [custom functions](/reference/custom) live on the game.

```ts
import type { Game } from '@ifloom/engine'
```

Every type on this page comes from the package root: `Game`, `ItemDef`, `StorylineDef` and the rest. `CollectionDef`, `TriggerDef` and `InputDef` have pages of their own.

The core has no places and no characters. Locations, exits, walking and where the player is come from the [places plugin](/plugins/places), whose locations are content in a pack's `data.places.locations`; people, their hours, talking and calling come from the [cast plugin](/plugins/cast), whose characters are content in `data.cast.characters`.

## Game

```ts
type Game = {
  id: string
  title: string
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
| `id` | The game's id. [Saves](/reference/saves#keys) are kept under it and refuse another game's; pick one unique to your game and never change it. |
| `title` | The game's name. The view passes it through as `view().title`. |
| `startPhase` | The stage a new game opens in. Default `''`. See [`phase`](/reference/state#phase). |
| `introScene` | The scene on screen on the first frame. It counts as seen once, at turn 0, before any command runs. Leave it out and the game opens on its idle screen (see [below](#game)), with nothing seen. |
| `stats` | Every stat the game keeps; the engine has none of its own. See [Stats](/reference/stats). |
| `kinds` | The kinds of thing the game keeps several of, each with stats of its own: staff, dishes. See [Entities](/reference/entities). |
| `entities` | The things of those kinds there at the start of a new game. More can be [created](/reference/effects#create) in play. See [Entities](/reference/entities). |
| `activities` | Everything the player can do: paperwork, a jog, a drink. See [Actions](/reference/actions). |
| `items` | Things the player can have. [`ItemDef`](#itemdef). |
| `scenes` | Every scene: [data scenes](/reference/scenes#datascene) and hand-written [`Scene`](/reference/scenes#scene)s side by side. A data scene is baked into a `Scene` the first time [`sceneById`](#scenebyid) asks for it. |
| `storylines` | The storylines. [`StorylineDef`](#storylinedef). |
| `prose` | The words data scenes draw on. [`ProseStore`](#prosestore). Set by [`loadGame`](/reference/loader#loadgame); by hand, build it with [`proseStore`](/reference/prose#prosestore-1). |
| `strings` | The game's words for what the engine and its plugins say to the player, by key: `{ finishFirst: 'Not yet.', 'quests/notDoing': 'Not on your list.' }`. Every key left out keeps its English. Set by `loadGame` from the base's and the packs' `strings`, later winning. See [Strings](/reference/strings). |
| `collections` | Named lists the game keeps entries in: letters, photos, a ledger. [Collections](/reference/collections). |
| `triggers` | Effects that happen by themselves the first time a condition holds. [Triggers](/reference/triggers). |
| `inputs` | What the player can type or pick, and the variable each writes. [Inputs](/reference/inputs). |
| `custom` | The game's [custom functions](/reference/custom): conditions, effects, values and panels content calls by name. |
| `actions` | Buttons offered whenever no scene is open, after every [plugin's buttons](/reference/plugins#buttons) (the [places plugin](/plugins/places#the-buttons)'s room actions among them): waiting, checking a map. [`ActionDef`](#actiondef). A game with none has none: the engine adds no button of its own. |
| `packs` | The ids of the packs the game was loaded from, in order. Set by [`loadGame`](/reference/loader#loadgame); a save records them, and a save made with a pack this game lacks names it in [`missingPacks`](/reference/saves#loadedsave). |
| `rules` | The game's own logic. See [Rules and hooks](/reference/rules). |
| `plugins` | The [plugins](/reference/plugins) the game is built with, in the order their hooks run. Chosen when the game is built, on the base you pass to [`loadGame`](/reference/loader#loadgame). |
| `data` | Content for the plugins, by plugin id and then list name: `data.quests.quests`. Set by `loadGame`, merged from `base.data` and every pack's `data` by entry id. |

A new game starts at turn 0 with `introScene` open, and each plugin's own start (the places plugin's `start` puts the player in a room). See [`startingState`](/reference/commands#startingstate).

**The idle screen.** With no scene open, the screen is the [`stage`](/reference/plugins#stage) of the first plugin that has one now (the places plugin's: the room the player is in), else a scene titled with `game.title` and an empty body; under it are the plugins' buttons, then the game's own `actions`.

**A game with no places.** A game without the [places plugin](/plugins/places) has no room to stand in and no exits, and with the [cast](/plugins/cast), nobody is ever in the room. A linear story passes only `introScene`, and the screen is whatever scene is open. [The Letter](/guide/shapes) is one.

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'

const town: Game = {
  id: 'town',
  title: 'Market Day',
  startPhase: 'arrival',
  introScene: 'arrival.unpack',
  plugins: [calendar(), places({ start: 'house' }), cast()],
  activities,
  items,
  scenes,
  storylines: [{ id: 'baker', name: 'Rosa' }],
  rules,
}
```

The town's locations and people are the plugins' content, in `data.places.locations` and `data.cast.characters`; a game built from packs gets `data` from [`loadGame`](/reference/loader#loadgame). To build a game from several packs, with mods layered on top, see [Loading and mods](/reference/loader).

## ActionDef

```ts
type ActionDef = {
  id: string
  label: string
  command: Command
  when?: Condition
  blocked?: { when: Condition; reason: string }[]
}
```

A button that sends one [command](/reference/commands): in a [place](/plugins/places#locationdef)'s `actions`, in the game's own `actions`, from a plugin's [`buttons`](/reference/plugins#buttons), or in a [device](/plugins/devices)'s `{ actions }` section. Most send `{ type: 'activity', id }`; the view then prices and greys out the button from the activity itself, so it cannot disagree with the reducer. `when` keeps the button off the screen until it holds; `blocked` greys it out with a reason of your own. See [Actions](/reference/actions#actiondef).

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
| `kind` | `gear` starts at 1 in a new game, `stuff` at 0, unless `start` says otherwise. |
| `start` | How many a new game starts with. |
| `use` | Makes it usable with [`use`](/reference/commands#use): one is spent, then these [effects](/reference/effects) run. |

An item has no slot of its own. To let the player wear one, add the [wardrobe plugin](/plugins/wardrobe) and list the item among its clothes.

```ts
const bun: ItemDef = {
  id: 'bun',
  name: 'Sticky bun',
  desc: 'Still warm from the bakery.',
  kind: 'stuff',
  use: { label: 'Eat it', effects: [{ kind: 'stat', key: 'energy', by: 15 }] },
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

A scene is anything with an id and a `render` function. Write them as data — a [`DataScene`](/reference/scenes#datascene) — and the engine builds `render` for you; see [Scenes](/reference/scenes) for `Scene`, `SceneView`, `SceneChoice` and `SceneCtx`.

## StorylineDef

```ts
type StorylineDef = { id: string; name: string }
```

A storyline: a thread of the story, followed by its variables and stages, and closed for a while if need be. Each declared one gets a [`StorylineState`](/reference/state#storylines) in a new game, and an older save that lacks one gets an empty one the next time a command runs on it. A [cast](/plugins/cast#characterdef) character can belong to one through their `storyline` field; a storyline need not have a character. See [Storylines](/reference/world).

```ts
storylines: [
  { id: 'ada', name: 'Ada' },
  { id: 'market', name: 'The market' },
]
```

The view draws no storylines of its own: a game or a plugin shows them, as the [quests](/plugins/quests) plugin groups quests by storyline.

## ProseStore

```ts
type ProseStore = {
  line: (key: string, state?: GameState) => string | undefined
  variants: (name: string) => string[]
}
```

The words a data scene draws on: `line` gives the text for a key, filled in for this save; `variants` gives the member keys of a named set of variants, in order. Data scenes read it through the [default runtime](/reference/scenes#defaultruntime). See [Prose and markup](/reference/prose).

**Gotcha.** A game with data scenes and no `prose` renders them empty: every line is unwritten. [`loadGame`](/reference/loader#loadgame) sets it; a game built by hand sets it with [`proseStore`](/reference/prose#prosestore-1).

## Looking things up

```ts
function sceneById(game: Game, id: string): Scene | undefined
function itemById(game: Game, id: string): ItemDef | undefined
```

The entry with that id, or `undefined`. The engine finds everything through these.

### sceneById

A scene ready to render. A [`DataScene`](/reference/scenes#datascene) is baked into a `Scene` the first time it is asked for (with [`bakeScene`](/reference/scenes#bakescene)) and the same `Scene` is returned after that; a hand-written `Scene` is returned as it is.

```ts
const counter = sceneById(town, 'cafe.counter')
const shown = counter?.render(state, sceneContext(state, town))
```

**Gotcha.** Look scenes up through `sceneById`, not `game.scenes.find(...)`: the list holds data scenes as declared, with no `render`.

### itemById

```ts
itemById(town, 'bun')?.kind   // 'stuff'
```

## validatePack

```ts
function validatePack(game: Game, probes?: readonly GameState[]): string[]
```

Checks that every id the game points at resolves, and returns one line per problem as `where: what`. An empty array means clean. Run it from a test so a broken id fails at commit time instead of mid-game.

Always checked:
- duplicate ids among items, scenes, storylines and activities;
- `introScene` exists, when the game gives one;
- the scene, item, storyline and stat ids in item `use` effects and in activity effects (a `{ custom }` effect is not looked inside) — a `stat` effect must name a [declared stat](/reference/stats), a `collect` or `discard` effect a declared [collection](/reference/collections) (`collection … is not declared`), and the `text` of a `collect` entry or a `notify` effect a prose key the game has (`no prose for …`).
- the targets of the commands of the game's own `actions` — a scene, an item;
- every `{ type: 'custom' }` command on those actions names a [plugin command](/reference/plugins#plugincommand) the game has (`no plugin command named …`);
- every stat an activity's cost spends is declared, and every `max: { value }` names a [custom value](/reference/custom#values) the game declares.

With `probes`, every scene is also rendered against each probe state, and anything that throws is reported, along with duplicate choice ids and the ids in rendered choices' effects.

```ts
import { startingState, validatePack } from '@ifloom/engine'

const morning = { ...startingState(town), sceneId: null, turn: 2 }
expect(validatePack(town, [morning])).toEqual([])
```

**Gotchas.**
- Without probes, the choices of hand-written scenes are never looked at. Pass a few states that reach different branches.
- Conditions — in data scenes and activity requirements — are checked by the [loader](/reference/loader#the-checks), not here, and so are a place's exits, body and actions, by the [places plugin](/plugins/places#checks); characters by the [cast plugin](/plugins/cast#checks).
