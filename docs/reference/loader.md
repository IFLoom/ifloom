# Packs and loading

`loadGame` takes your content as a list of packs, merges them in order into one game, and checks the result. Every broken reference comes back as a problem that names the pack it came from.

```ts
import { loadGame, describeProblem, SCHEMA, type Pack, type Patch, type Problem, type Loaded } from '@ifloom/engine'
```

Your game's own content is simply the first pack. Any later pack, such as a mod, is laid over it by id. This page covers the merge and the checks. [Mods](/reference/mods) covers the other half: the packs a player installs into a built game, the file they come in, the store that keeps them and how the game loads them at start-up.

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
  settings?: SettingDef[]
  strings?: Record<string, string>
  prose?: Record<string, string>
  variants?: Record<string, string[]>
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
| `scenes`, `items`, `storylines`, `activities`, `stats`, `kinds`, `collections`, `triggers`, `inputs`, `settings` | By `id`. A later pack's entry replaces an earlier one with the same id as a whole, so fields aren't merged. The order is first appearance. Any `kinds`, `collections`, `triggers`, `inputs` and `settings` on `loadGame`'s `base` come before every pack's. |
| `entities` | By kind and id (`'staff:ana'`), so two kinds may each have an entity with the same id. A later pack's entity replaces an earlier one with the same kind and id. The order is first appearance, and the base's come first. See [Entities](/reference/entities). |
| `strings` | By key. A later pack wins, and every pack wins over the base's `strings`. A pack of nothing but `strings` is a translation. See [Strings](/reference/strings#overriding). |
| `prose` | By key. A later pack wins. |
| `variants` | By variants name. A later pack appends members to the list. |
| `custom` | [Custom functions](/reference/custom), kind by kind (`conditions`, `effects`, `values`, `panels`) and then by name. A later pack's function replaces an earlier one's of the same kind and name, and the rest are kept. |
| `patches` | Applied straight away, in order. See [Patches](#patches). |
| `data` | Content for the game's [plugins](/reference/plugins#content-and-checks), by plugin id and then list name, such as `{ quests: { quests: [...] } }`. Each list merges by entry `id`, as scenes do. The result is at `game.data.quests.quests`. Locations and characters are content of this kind: `data.places.locations` for the [places plugin](/plugins/places#in-a-pack) and `data.cast.characters` for the [cast](/plugins/cast#in-a-pack). |
| `audio` | [Audio](/reference/audio#gameaudio), over the base's own `audio`. `tracks` merge by id, and a later pack's track replaces an earlier one. `channels` merge by id too, field by field. A later pack's `mute` wins, and its `default` wins channel by channel. |
| `media` | [Media](/reference/media#gamemedia), over the base's own `media`. `pools` merge by id, and a later pack's pool replaces an earlier one with the same id as a whole. To add a file to a pool, a mod redeclares the pool with every file. |

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

The content format this engine reads. A pack written for any other number is refused rather than half-loaded. [`loadGame`](#loadgame) skips it with the problem `written for schema 3, this engine reads 4`, and a [mod](/reference/mods) with the wrong number is refused when the player adds it. Write `schema: SCHEMA` in your own packs so they always match.

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

Merges `packs` in order, lays the result over `base`, builds `game.prose` from the packs' prose and variants, and runs [the checks](#the-checks). `base` carries everything that isn't content: the game's `id`, `title`, `introScene`, `plugins`, `rules`, `actions` and so on. The game that comes back is ready to run. Data scenes render through the engine's [default runtime](/reference/scenes#defaultruntime) with no further wiring.

`base` needs only `id` and `title`. Leave out `introScene` for a game that opens on its idle screen (with the [places plugin](/plugins/places), the room it starts in). A linear story passes `{ id, title, introScene }`. See [Shapes of game](/guide/shapes).

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
- `game.scenes` holds `DataScene`s exactly as declared, beside any hand-written `Scene`s. The engine turns a data scene into a `Scene` the first time [`sceneById`](/reference/game#scenebyid) asks for it, so you don't wrap them yourself.
- `game.prose` is a [`proseStore`](/reference/prose#prosestore-1) over the merged prose and variants. It replaces any `prose` on `base`. `Loaded.prose` and `Loaded.variants` are the same merged records, for tools that want the raw text.
- `game.packs` lists the packs' ids in order. [Saves](/reference/saves#savemeta) record it, so loading a save made with a mod the player has since removed names that mod. A [mod file](/reference/mods)'s pack is always `mod:<id>`.
- Custom functions can sit on `base` or in packs. The base's come first, and each pack lays its own over them by name, kind by kind.
- [Plugins](/reference/plugins) go on `base`, as `plugins`, and only there. A pack can't add one. Plugin content can sit in `base.data` and in packs' `data`, and the base's comes first.
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
- Only a [`DataScene`](/reference/scenes#datascene) can be patched. Patching a hand-written `Scene` is a problem.
- A patch applies to the scene as it stands when its pack is read. A later pack that redeclares the scene replaces it, patch and all.
- A `before` that names a choice that isn't there adds the choice at the end, without a problem. A `replaceChoice` with no matching id is a problem.

## The checks

This is the complete list of what `loadGame` checks. Each problem is reported against the pack that last declared (or patched) the content, with a `where` that says what it is in. Conditions, effects and commands get the same checks wherever they appear, so those come first.

### In a condition

Every condition the loader looks at is walked, including inside `all`, `any`, `not` and a `count`'s `where`. It reports:

| Problem | When the condition names |
|---|---|
| `unknown storyline "…"` | A storyline nobody declares, in `storyline`, `storylineFlag` or `counter`. |
| `unknown item "…"` | An item nobody declares. |
| `unknown stat "…"` | A stat nobody declares, in `stat` or `tier`. |
| `unknown collection "…"` | A collection nobody declares. |
| `unknown kind "…"` | A kind nobody declares, in `count`, `entity` or the `of` of a `stat` or `flag`. `'$'` names no kind and isn't checked. |
| `gated on unknown scene "…"` | A scene that doesn't exist, in `seen`, `since` or `scene`. |
| `gated on a choice in unknown scene "…"` | A `chose` key whose scene doesn't exist. |
| `gated on unknown choice "…"` | A `chose` key whose data scene has no such choice. A hand-written scene's choices aren't known in advance, so they aren't checked. |
| `no custom condition named "…"` | A custom condition that neither the game nor any plugin declares, as `{ custom }` or a [short plugin call](/reference/custom#plugincall). |
| A stat owner problem | See [Stat owners](#stat-owners). |
| Whatever the plugin says | The plugin's [`argProblems`](/reference/plugins#checking-calls), for a call to a plugin's condition. |
| `unknown setting "…"` | A `setting` that the game doesn't declare. |
| `setting "…" is a ui setting; conditions read only play settings` | A `ui` [setting](/reference/settings), which isn't in the state. |
| `<value> for setting "…" is not …` | An `is` the setting can't take: not `true` or `false` for a toggle, not one of a choice's options, or out of a range's bounds or steps. |

### In an effect list

Effect lists are checked on triggers, data scene choices and activities. The loader reports:

| Problem | When |
|---|---|
| `no custom effect named "…"` | A `{ custom }` or short-form effect that neither the game nor any plugin declares. |
| Whatever the plugin says | The plugin's `argProblems`, for a call to a plugin's effect. |
| `unknown kind "…"` | A `create`'s or `each`'s `of`, or the kind in the `of` of a `stat`, `setStat`, `flag` or `remove` effect, names a kind nobody declares. |
| A stat owner problem | A `stat` or `setStat` effect names a declared stat on the wrong owner. See [Stat owners](#stat-owners). |
| `unknown collection "…"` | A `collect` or `discard` names a collection nobody declares. |
| `no prose for "…"` | A `notify`'s `text`, or a `collect` entry's `text`, names prose that isn't written. |
| `goes to unknown scene "…"` | A `scene` effect goes to a scene that doesn't exist. |
| An audio problem | An `audio` effect's channel or track, or a `sound` effect's track. See [Audio](#audio). |

Inside an `each`, its `where` is checked as a condition and its `effects` as an effect list, with `'$'` standing for one of its kind. A problem from inside starts `in each <kind>: `, such as `in each staff: stat "quality" belongs to dish, not staff`.

The loader doesn't check whether a `stat` or `setStat` effect's stat is declared, an `item` effect's item, a `storylineFlag` or `closeStoryline` effect's storyline, or the name of a long-form `{ kind: 'custom' }` effect. [`validatePack`](#what-validatepack-adds) checks those in item uses, activities, and the choices of scenes it renders against probe states.

### In a command

Commands are checked on the game's own `actions`, and wherever a plugin's `check` passes one to `commandProblems`. Only four command types are looked at:

| Command | Problem |
|---|---|
| `scene` | `opens unknown scene "…"` |
| `activity` | `unknown activity "…"` |
| `use` | `unknown item "…"` |
| `custom` | `no plugin command named "…"`, then whatever the plugin's `argProblems` finds in it. |

### Stat owners

A stat is either the player's or belongs to a [kind](/reference/entities). Wherever a stat is named with or without an `of`, in conditions and in `stat` and `setStat` effects, the loader checks it's named on the right owner:

| Problem | Means |
|---|---|
| `stat "…" belongs to <kind>: say whose with "of"` | A kind's stat, named with no `of`, as if it were the player's. |
| `stat "…" is the player's, not <ref>'s` | The player's stat, named with an `of`. |
| `stat "…" belongs to <kind>, not <other>` | A stat named on an entity of another kind. |

### Audio

Wherever content names [audio](/reference/audio), the loader checks it against `game.audio`. A background placement is a scene's `audio`, a place's `audio`, an `audio` effect, or `game.audio.default`. A sound is a `sound` effect, `[[sound:id]]` or `[[voice:id]]`.

| Problem | When |
|---|---|
| `unknown track "…"` | Anything names a track that `game.audio.tracks` doesn't have: a placement, a sound, the markup in any prose, or a playlist. |
| `unknown channel "…"` | A placement names a channel that isn't declared or one of the [four defaults](/reference/audio#channels). |
| `channel "…" plays sounds, not background audio` | A placement names a cue channel, such as `sfx`. |
| `track "…" is a sound on channel "…", not background audio` | A placement or a playlist names a track whose channel is a cue channel. A track with no `channel` is on `sfx`. |
| `track "…" is background audio on channel "…", not a sound` | A sound names a track on a background channel, such as `music`. |
| `"…" is a playlist, not a sound` | A sound names a playlist. |
| `on undeclared channel "…"` | A track's `channel` isn't a channel the game has. |
| `volume is not between 0 and 1` | A track's `volume`. |
| `a playlist with no tracks` | A playlist's list is empty. |
| `"…" is a playlist; a playlist holds tracks` | A playlist names another playlist. |
| `unknown setting "…"` | A channel's `volume`, or `game.audio.mute`, names a setting the game doesn't declare. |
| `setting "…" is not a ui range setting` | A channel's `volume` names a setting that isn't a `ui` range. |
| `setting "…" is not a ui toggle setting` | `game.audio.mute` names a setting that isn't a `ui` toggle. |
| `ducks under unknown channel "…"` | A channel's `duck.under` names a channel the game doesn't have. |
| `duck.to is not between 0 and 1` | A channel's `duck.to`. |
| `mode is not "background" or "cue"` | A channel's `mode`. |

### Media

Wherever content asks for a picture or a video, the loader checks it against `game.media`. That's the picture and video [markup](/reference/prose#videos) in every prose entry, a data scene's `{ media }` blocks and `stage`, and a place's `stage` (through the places plugin's check).

| Problem | When |
|---|---|
| `unknown pool "…"` | Markup (`[[img:@door]]`), a `{ media }` block or a stage layer names a pool `game.media.pools` doesn't have. |
| `no file in pool "…" is tagged "…"` | A request asks for a tag no file in the pool has. The pick would still fall back to other files, but a tag nothing has is usually a typo. |
| `a pool with no files` | A pool is empty. Reported as `pool <id>`. |
| `file <n> has no src` | A file in a pool has no `src`. Reported as `pool <id>`. |
| `unknown flag "…" in …` | Markup has a `name=value` part whose name isn't a flag, such as `speed=2`. |
| `"…" and "…" can't all be alt text in …; is one a misspelt flag?` | Markup has more than one part that isn't a flag. |
| `video flag "…" on a picture` | `controls`, `once`, `sound` or `poster` on a picture: `[[img:]]` markup, a `{ media }` block or a stage layer whose file isn't a video. A pool with a video in it may take them. |
| `flag "rot" turns a picture, not a video, in …` | `rot` on video markup. |
| `media: needs a src or a pool`, `media: has both a src and a pool` | A `{ media }` block. A stage layer gets the same, after `stage layer <id>:`. |
| `stage layer <id>: two layers share this id` | Two layers of one stage have the same `id`. A layer with no `id` is named by its index. |
| `hotspot <id>: needs exactly one of command and choice` | A hotspot has both, or neither. |
| `hotspot <id>: no choice "…" in this scene` | A hotspot's `choice` isn't one of the scene's choices. |
| `hotspot <id>: names choice "…", but only a scene has choices` | A place's hotspot has a `choice`. |
| `hotspot <id>: rect must be four numbers: [x, y, width, height]` | A hotspot's `rect` isn't four numbers. |
| `hotspot <id>: rect is outside 0 to 100` | A number in the rect is below 0 or above 100. |
| `hotspot <id>: rect has no width or height` | The width or the height is 0. |
| `hotspot <id>: rect runs off the stage: x + width and y + height must be 100 or less` | The rect goes past the right or bottom edge. |
| `hotspot <id>: two hotspots share this id` | Two hotspots of one stage have the same `id`. |
| `hotspot <id>: unknown layer "…"` | A hotspot's `layer` names no layer of its stage. |

A hotspot's `command` and `when`, and a layer's `when`, are checked as any [command](#in-a-command) and [condition](#in-a-condition) are, with `hotspot <id>:` or `stage layer <id>:` in front.

### Where each check runs

| `where` | Checked |
|---|---|
| `pack` | `written for schema …, this engine reads …`: the pack's `schema` isn't [`SCHEMA`](#schema). The whole pack is skipped. |
| `patch <scene>` | `no such scene`, `that scene is not declarative, so it cannot be patched`, and `no choice <id>` for a `replaceChoice` with no match. |
| `scene <id>` | Every [data scene](/reference/scenes#datascene). `no prose for "…"` for its `text` blocks, each choice's label key (its `label`, or the default `scene#choice`) and every `labels` key. `variants "…" has no lines` for its `variants` blocks and the variants their `art` names. The conditions on its blocks, a `variants` block's `gate`, and each choice's `when`, `blocked` and `labels`. Each choice's `effects` as an effect list. Its `audio`, as a placement (see [Audio](#audio)). Its `{ media }` blocks and its `stage` (see [Media](#media)). |
| `activity <id>` | Each requirement's `when` in `requires`, and its `effects` as an effect list. |
| `trigger <id>` | Its `when`, and its `effects` as an effect list. |
| `input <id>` | Its `when`, `a choice with no options`, and `min is above max`. |
| `setting <id>` | `two settings share this id` (twice in one pack's list, or the base's; a later pack redeclaring one is fine), `a choice with no options`, `min is above max`, `step must be above 0`, and a `default` the setting can't take, such as `default 9 is not between 0 and 5`. |
| `finished` | The game's [`finished`](/reference/state#new-game) condition. Reported against `base`. |
| `carryOver` | `unknown stat "…"` and `unknown item "…"` in the game's [`carryOver`](/reference/state#new-game), and `stat "…" belongs to <kind>, not the player` for a kind's stat. Reported against `base`. |
| `stat <id>` | `belongs to unknown kind "…"`: its `of` names a kind nobody declares. |
| `entity <kind>:<id>` | `unknown kind "…"`, `no <kind> stat named "…"` for a stat in its `stats` that isn't declared `of` its kind, and `an entity id must not be a whole number` (see [Ids](/reference/entities#ids)). |
| `action <id>` | The game's own [`actions`](/reference/game#game): each one's `when` and `blocked` conditions, and its `command`. They come with `base`, so the pack is reported as `base`. |
| `plugin <id>` | `a plugin id is letters, digits and "-" only` and `two plugins share this id`. Reported against `base`. |
| `data <plugin>` | `the game has no plugin named "<plugin>"`: a pack carries content for a plugin the game wasn't built with. That content is skipped. |
| `<list> <id>` | Whatever the plugin's own [`check`](/reference/plugins#content-and-checks) finds in its content, reported against the pack the entry came from. |
| `track <id>` | A track's channel and volume, and a playlist's tracks. See [Audio](#audio). |
| `channel <id>` | A channel's `volume` setting, `duck` and `mode`. |
| `audio` | `game.audio.mute`. Reported against the last pack that set it, or `base`. |
| `audio default` | The tracks in `game.audio.default`, as placements. |
| `pool <id>` | An empty pool, or a file with no `src`. See [Media](#media). |
| `prose <key>` | The tracks named by `[[sound:id]]` and `[[voice:id]]`, and the pools and flags in picture and video markup, in every prose entry, variants members included, reported against the pack that wrote it. |

A plugin's `check` is lent the loader's own `conditionProblems`, `blockProblems`, `commandProblems`, `audioProblems` and `stageProblems` as [`CheckTools`](/reference/plugins#checktools), so its problems read like the loader's. That's how the [places plugin](/plugins/places#checks) checks a location's exits, body, actions, audio and stage, and the [cast](/plugins/cast#checks) a character's home, schedule and talk scenes.

**Absent partners.** A condition, effect or command named after a plugin the game wasn't built with isn't reported when one of the game's plugins lists that plugin in its [`cooperates`](/reference/plugins#cooperates). In play it simply isn't there: the condition is false, the effect does nothing and the command is refused. A plugin nobody cooperates with is still reported.

**Not checked by the loader:** hand-written `Scene`s, the prose of variants members, `panelData` names, <code v-pre>{{v:…}}</code> values, item uses, an activity's `cost`, a stat's `max` value, and commands of any type other than the four above. The game's own actions are checked, as the `action <id>` row says.

Some problems as `describeProblem` prints them:

```text
town · scene ava.hi · gated on unknown scene "ava.hello"
mod:night-market · activity browse · unknown stat "stamina"
mod:night-market · trigger parcel · unknown collection "drawer"
mod:night-market · input stall · a choice with no options
town · setting difficulty · default "normal" is not one of the options
mod:night-market · locations yard · no prose for "place.yard"
mod:new-menu · entity dish:7 · an entity id must not be a whole number
mod:new-menu · entity dish:pie · no dish stat named "coins"
```

### What validatePack adds

[`validatePack`](/reference/game#validatepack) runs on the finished `Game` rather than the packs, so its problems don't name a pack. Run it from a test alongside the loader. It checks what the loader doesn't:

- duplicate ids among items, scenes, storylines and activities, which only a game built without `loadGame` can have;
- that `introScene` exists, when the game gives one;
- the effects of every item's `use` and every activity: the scene, item and storyline each one names, that a `stat` or `setStat` effect's stat is declared and named on the right owner, collections and `text` prose, the plain effects inside an `each`, and that a long-form `{ kind: 'custom' }` effect names a plugin effect;
- that every stat an activity's `cost` spends is declared;
- the commands of the game's own `actions`: a `scene` or `use` target, and that a `custom` command names a plugin command;
- that a stat's `max: { value }` names a [custom value](/reference/custom#values) the game declares;
- the [settings](/reference/settings): duplicate ids, and each one's declaration as the loader checks it;
- every `{ setting }` condition in `finished`, triggers, inputs, the game's actions, activities' requirements and data scenes, as the loader checks it;
- the stats and items in `carryOver`;
- [audio](#audio): `game.audio` itself, each data scene's `audio`, the markup in its blocks' prose, and the `audio` and `sound` effects on its choices, item uses and activities. Plugins' content, such as a place's `audio`, is left to the loader.
- [media](#media): empty pools, each data scene's `{ media }` blocks and `stage`, the picture and video markup in its blocks' prose, and the commands its hotspots send. A place's `stage` is left to the loader.

With probe states, it also renders every scene, hand-written ones included, and reports a render that throws, duplicate choice ids, the effects of the choices it rendered, the audio and markup in what it rendered, and a hand-written scene's rendered `stage`.

Its treatment of [absent partners](#the-checks) differs from the loader's in one place. It excuses a long-form custom effect of a cooperating plugin the game lacks, but not a custom command, so a game action whose command belongs to a missing partner is reported.

## Problem and describeProblem

```ts
type Problem = { pack: string; where: string; what: string }

function describeProblem(problem: Problem): string
```

`describeProblem` joins the three parts with ` · `, so a mod author reads one line rather than a stack trace:

```text
mod:sunday-market · scene market.stall · goes to unknown scene "market.closing"
```
