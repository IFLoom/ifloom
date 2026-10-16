---
title: "Packs and loading"
---
`loadGame` takes your content as a list of packs, merges them in order into one game, and checks the result. Every broken reference comes back as a problem that names the pack it came from.

```ts
import { loadGame, SCHEMA, type Pack, type Patch, type Loaded } from '@ifloom/engine'
```

Your game's own content is simply the first pack. Any later pack, such as a mod, is laid over it by id. This page covers the merge and which pack a problem is pinned on. The checks themselves are on [Checking content](/docs/reference/checks). [Mods](/docs/reference/mods) covers the other half: the packs a player installs into a built game, the file they come in, the store that keeps them and how the game loads them at start-up.

## Pack

```ts
type Pack = {
  id: string
  schema: number
  scenes?: (Scene | DataScene)[]
  items?: ItemDef[]
  storylines?: StorylineDef[]
  activities?: ActivityDef[]
  stats?: StatDef[]
  kinds?: KindDef[]
  entities?: EntityDef[]
  collections?: CollectionDef[]
  triggers?: TriggerDef[]
  inputs?: InputDef[]
  minigames?: MinigameDef[]
  settings?: SettingDef[]
  strings?: Record<string, string>
  prose?: Record<string, string>
  variants?: Record<string, VariantMember[]>
  custom?: Custom
  patches?: Patch[]
  data?: Record<string, Record<string, readonly PluginEntry[]>>
  audio?: Partial<GameAudio>
  media?: GameMedia
}
```

| Field | Merged how |
|---|---|
| `id` | Names the pack in problems, such as `'town'` or `'mod:sunday-market'`. |
| `schema` | Must equal [`SCHEMA`](#schema), or the whole pack is skipped with a problem. |
| `scenes`, `items`, `storylines`, `activities`, `stats`, `kinds`, `collections`, `triggers`, `inputs`, `minigames`, `settings` | By `id`. A later pack's entry replaces an earlier one with the same id as a whole, so fields aren't merged. The order is first appearance. Any `kinds`, `collections`, `triggers`, `inputs`, `minigames` and `settings` on `loadGame`'s `base` come before every pack's. |
| `entities` | By kind and id (`'staff:ana'`), so two kinds may each have an entity with the same id. A later pack's entity replaces an earlier one with the same kind and id. The order is first appearance, and the base's come first. See [Entities](/docs/reference/entities). |
| `strings` | By key. A later pack wins, and every pack wins over the base's `strings`. A pack of nothing but `strings` is a translation. See [Strings](/docs/reference/strings#overriding). |
| `prose` | By key. A later pack wins. |
| `variants` | By variants name. A later pack appends members to the list. A member is a prose key, or `{ text, weight }` to give it a [weight](/docs/reference/prose#variantmember). |
| `custom` | [Custom functions](/docs/reference/custom), kind by kind (`conditions`, `effects`, `values`, `panels`) and then by name. A later pack's function replaces an earlier one's of the same kind and name, and the rest are kept. |
| `patches` | Applied straight away, in order. See [Patches](#patches). |
| `data` | Content for the game's [plugins](/docs/reference/plugins#content-and-checks), by plugin id and then list name, such as `{ quests: { quests: [...] } }`. Each list merges by entry `id`, as scenes do. The result is at `game.data.quests.quests`. Locations and characters are content of this kind: `data.places.locations` for the [places plugin](/docs/plugins/places#in-a-pack) and `data.cast.characters` for the [cast](/docs/plugins/cast#in-a-pack). |
| `audio` | [Audio](/docs/reference/audio#gameaudio), over the base's own `audio`. `tracks` merge by id, and a later pack's track replaces an earlier one. `channels` merge by id too, field by field. A later pack's `mute` wins, and its `default` wins channel by channel. |
| `media` | [Media](/docs/reference/media#gamemedia), over the base's own `media`. `pools` merge by id, and a later pack's pool replaces an earlier one with the same id as a whole. To add a file to a pool, a mod redeclares the pool with every file. |

### How packs merge

Everything a pack declares is keyed, whether by id, prose key, variants name or custom function name, and a later pack wins on any key it repeats. So a mod that changes one custom condition ships just that one:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const longerMarket: Pack = {
  id: 'mod:longer-market-days',
  schema: SCHEMA,
  custom: { conditions: { marketDay: (state) => [5, 6].includes(state.turn % 7) } },
}
```

The game's other custom conditions, and its effects, values and panels, are left alone.

## SCHEMA

```ts
const SCHEMA = 4
```

The content format this engine reads. A pack written for any other number is refused rather than half-loaded. [`loadGame`](#loadgame) skips it with the problem `written for schema 3, this engine reads 4`, and a [mod](/docs/reference/mods) with the wrong number is refused when the player adds it. Write `schema: SCHEMA` in your own packs so they always match.

## loadGame

```ts
function loadGame(
  packs: Pack[],
  base: Omit<Game, 'scenes' | 'items' | 'storylines' | 'activities' | 'stats'>,
): Loaded

type Loaded = {
  game: Game
  prose: Record<string, string>
  variants: Record<string, string[]>
  problems: Problem[]
}
```

Merges `packs` in order, lays the result over `base`, builds `game.prose` from the packs' prose and variants, and checks the game with [`checkGame`](/docs/reference/checks#checkgame). See [What the loader adds](#what-the-loader-adds). `base` carries everything that isn't content: the game's `id`, `title`, `introScene`, `plugins`, `rules`, `actions` and so on. The game that comes back is ready to run. Data scenes render through the engine's [default runtime](/docs/reference/scenes#defaultruntime) with no further wiring.

`base` needs only `id` and `title`. Leave out `introScene` for a game that opens on its idle screen (with the [places plugin](/docs/plugins/places), the room it starts in). A linear story passes `{ id, title, introScene }`. See [Shapes of game](/docs/guide/shapes).

This is how the showcase builds Small Town, trimmed to the parts that matter here:

```ts
import { describeProblem, loadGame, type Pack } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { custom } from './content/custom.ts'
import { town } from './content/town.ts'

export function smallTown({ mods = [] as Pack[] } = {}) {
  const { game, problems } = loadGame([town, ...mods], {
    id: 'small-town',
    title: 'Small Town',
    introScene: 'intro',
    custom,
    plugins: [calendar({ start: { day: 0, period: 'night' } }), places({ start: 'flat' }), cast()],
    actions: [{ id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } }],
  })
  return { game, problems: problems.map(describeProblem) }
}
```

The real file is `examples/showcase/src/game.ts`. It also adds the phone, quests, wardrobe and debug plugins, a start phase, strings and rules. Its `main.tsx` logs the problems as warnings and starts the game anyway.

**Gotchas:**
- `loadGame` never throws on bad content. It returns problems, and it's up to you whether to refuse to start.
- `game.scenes` holds `DataScene`s exactly as declared, beside any hand-written `Scene`s. The engine turns a data scene into a `Scene` the first time [`sceneById`](/docs/reference/game#scenebyid) asks for it, so you don't wrap them yourself.
- `game.prose` is a [`proseStore`](/docs/reference/prose#prosestore-1) over the merged prose and variants. It replaces any `prose` on `base`. `Loaded.prose` and `Loaded.variants` are the same merged records, for tools that want the raw text.
- `game.packs` lists the packs' ids in order. [Saves](/docs/reference/saves#savemeta) record it, so loading a save made with a mod the player has since removed names that mod. A [mod file](/docs/reference/mods)'s pack is always `mod:<id>`.
- Custom functions can sit on `base` or in packs. The base's come first, and each pack lays its own over them by name, kind by kind.
- [Plugins](/docs/reference/plugins) go on `base`, as `plugins`, and only there. A pack can't add one. Plugin content can sit in `base.data` and in packs' `data`, and the base's comes first.
- `kinds`, `entities`, `collections`, `triggers` and `inputs` can sit on `base` as well as in packs. The base's come first, are reported as from `base`, and each pack lays its own over them by id (entities by kind and id). A plugin's own `kinds` come before the base's, so the game can redeclare them, and the entities a plugin makes from its content are added only where the game hasn't declared one with the same kind and id.

## Patches

```ts
type Patch =
  | { scene: string; addChoice: Choice; before?: string }
  | { scene: string; dropChoice: string }
  | { scene: string; replaceChoice: Choice }
```

A patch makes a small change to a scene an earlier pack declared, so you don't have to replace the whole scene. You can add a choice (at the end, or before the choice whose id is `before`), drop one by id, or replace the one with the same id.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const mod: Pack = {
  id: 'mod:compliments',
  schema: SCHEMA,
  prose: { 'ava.hi#coffee': 'Ask what she recommends' },
  patches: [
    { scene: 'ava.hi', addChoice: { id: 'coffee', effects: [{ kind: 'stat', key: 'energy', by: 5 }] }, before: 'bye' },
  ],
}
```

**Gotchas:**
- Only a [`DataScene`](/docs/reference/scenes#datascene) can be patched. Patching a hand-written `Scene` is a problem.
- A patch applies to the scene as it stands when its pack is read. A later pack that redeclares the scene replaces it, patch and all.
- A `before` that names a choice that isn't there adds the choice at the end, without a problem. A `replaceChoice` with no matching id is a problem.

## What the loader adds

`loadGame` merges the packs, then checks the merged game with the [content checker](/docs/reference/checks), the same `checkGame` you can run on any game. It pins each problem on the pack that introduced it: the pack that last declared or patched the scene, item, stat, prose key, track or plugin entry the problem is in. What came with `base`, such as the game's `actions`, `finished` and `carryOver`, is reported against `base`. [Checking content](/docs/reference/checks) has the full list of checks.

It also reports what is wrong with the packs themselves, which the merged game no longer shows:

| `where` | Problem |
|---|---|
| `pack` | `written for schema …, this engine reads …`: the pack's `schema` isn't [`SCHEMA`](#schema). The whole pack is skipped. |
| `patch <scene>` | `no such scene`, `that scene is not declarative, so it cannot be patched`, and `no choice <id>` for a `replaceChoice` with no match. |
| `setting <id>` | `two settings share this id`: twice in one pack's list, or the base's. A later pack redeclaring one is fine. |
| `variants <name>` | `"…" has a weight of …; a weight must be above 0`, for a [variants member](/docs/reference/prose#variantmember) with a weight of 0 or less. |
| `data <plugin>` | `the game has no plugin named "<plugin>"`: a pack carries content for a plugin the game wasn't built with. That content is skipped. |

Some problems as [`describeProblem`](/docs/reference/checks#problem-and-describeproblem) prints them:

```text
town · scene ava.hi · gated on unknown scene "ava.hello"
mod:night-market · activity browse · unknown stat "stamina"
mod:night-market · trigger parcel · unknown collection "drawer"
mod:night-market · locations yard · no prose for "place.yard"
mod:new-menu · entity dish:pie · no dish stat named "coins"
town · stat service · derive goes round in a cycle: service → mood → service
```
