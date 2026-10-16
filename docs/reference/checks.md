# Checking content

`checkGame` reads through a game's content once, reports everything it names that the game doesn't have, and lists the files it names. [`loadGame`](/reference/loader#loadgame) runs it on the game it merges. A game you build by hand calls it itself, usually from a test.

```ts
import { checkGame, describeProblem, type Checked, type FileRef, type Probe, type Problem, type Reference } from '@ifloom/engine'
```

```ts
import { describe, expect, it } from 'vitest'
import { checkGame, startingState } from '@ifloom/engine'
import { game } from '../src/game.ts'

describe('the game', () => {
  it('has nothing wrong with it', () => {
    const morning = startingState(game)
    expect(checkGame(game, { probes: [{ name: 'morning', state: morning }] }).problems).toEqual([])
  })
})
```

A loaded game's problems are already in `loadGame`'s result, each pinned on the pack it came from, so there's no need to check it again. `ifloom check` prints a game's problems once either way.

## checkGame

```ts
function checkGame(game: Game, options?: { probes?: readonly Probe[] }): Checked

type Checked = { problems: Problem[]; files: FileRef[] }
type Probe = { name: string; state: GameState }
```

Walks every part of the game that is data: scenes and data scenes, items and their `use` effects, activities, the game's actions, triggers, inputs, settings, stats, entities, `finished`, `carryOver`, the locks in `rules.locks`, `introScene`, audio, media pools, all the prose, and every plugin's content. Each condition, effect and command is looked up in one table that says what it names, so a condition reads the same wherever it sits. Then each name is checked against the game.

It never throws on bad content. It returns the problems in the order it found them, and an empty list when there's nothing wrong.

**Gotchas:**
- A hand-written `Scene` is a function, so the checker can't see inside it. Only its [storylet](/reference/storylets) fields are checked, unless you give it probes.
- It doesn't run your custom functions. A [custom effect](/reference/custom#effects) that returns a broken effect, or a `rules.turn` that does, is only found in play.
- It doesn't check the tokens in prose, such as <code v-pre>{{v:breadPrice}}</code>. An unknown one is left on screen as written, so you can see it.

## Probes

A probe is a state to render every scene against, with a name for the problems it finds. It's the only way to check a hand-written scene's choices.

```ts
const later = { ...startingState(game), turn: 5 }
checkGame(game, { probes: [{ name: 'day five', state: later }] })
```

For each probe the checker renders every scene and reports, against `scene <id> (<name>)`:

- `render threw: …` when a scene's `render` throws;
- for a hand-written scene, `two choices share the id "…"`, and everything its rendered body, media, audio and stage name, and each rendered choice's effects, after `choice <id>:`.

A data scene's content is checked already, so a probe only renders it to see that it doesn't throw.

## Problem and describeProblem

```ts
type Problem = { pack: string; where: string; what: string }

function describeProblem(problem: Problem): string
```

`pack` is the pack the content came from. For a game you built by hand it's `game`. For a loaded game it's the pack that last declared or patched the thing, or `base` for what came with `loadGame`'s `base`. `where` says what the problem is in, such as `scene ava.hi`, and `what` says what's wrong.

`describeProblem` joins the three with ` · `, so a mod author reads one line:

```text
mod:sunday-market · scene market.stall · goes to unknown scene "market.closing"
```

## FileRef

```ts
type FileRef = { path: string; kind: 'picture' | 'video' | 'audio'; where: string }
```

`checked.files` lists every picture, video and sound file the game names, with where it's named. The `path` is where the page asks for it: after [`artSrc`](/reference/prose#artsrc) for pictures and videos, after [`audioSrc`](/reference/audio#audiosrc) for sounds. So `{ src: 'door' }` is `art/door.jpg` and a track's `'music/calm'` is `audio/music/calm.ogg`.

The list covers:

- every track in `game.audio.tracks` (a playlist names tracks, not files);
- every file in a [pool](/reference/media#pools);
- a `{ media }` block's `src` and `poster`, and a stage layer's;
- the files in picture and video markup in any prose, posters included;
- the `image` of a `notify` effect and of a `collect` entry, used as written (a URL is left out);
- whatever a plugin's [references](#plugin-references) name, such as a post's picture or a character's `portrait`.

A pool request (`[[img:@door]]`) names no file itself. Its pool's files are listed instead. A place's `art` isn't listed, because no UI draws it.

The same file named in two places is listed once for each place. The CLI uses this list and nothing else to find a game's files. [`ifloom check`](/cli/#ifloom-check) looks for each one in `public/`, and [`ifloom build`](/cli/#ifloom-build) looks in the built folder, both with [`checkFiles`](/cli/#checkfiles).

## What content names

These are the checks on a condition, an effect and a command. They're the same wherever one sits: in a scene, an activity, a trigger, a plugin's content, or inside another.

### In a condition

Every condition is walked, including inside `all`, `any`, `not` and a `count`'s `where`.

| Problem | When the condition names |
|---|---|
| `a condition has one kind, but this one has …` | Two kinds in one object, such as `{ flag, has }`. It never holds; combine them with `all`. Its parts aren't looked into. |
| `a condition needs one kind, such as flag or stat; …` | No kind at all, such as `{}` or `{ gte: 3 }`. It never holds. |
| `unknown storyline "…"` | A storyline nobody declares, in `storyline`, `storylineFlag` or `counter`. |
| `unknown item "…"` | An item nobody declares, in `item` or `has`. |
| `unknown stat "…"` | A stat nobody declares, in `stat`, `level` or `tier`. |
| `unknown collection "…"` | A collection nobody declares. |
| `unknown kind "…"` | A kind nobody declares, in `count`, `entity` or the `of` of a `stat`, `level` or `flag`. `'$'` names no kind and isn't checked. |
| `gated on unknown scene "…"` | A scene that doesn't exist, in `seen`, `since` or `scene`. |
| `gated on a choice in unknown scene "…"` | A `chose` key whose scene doesn't exist. |
| `gated on unknown choice "…"` | A `chose` key whose data scene has no such choice. A hand-written scene's choices aren't known in advance. |
| `no custom condition named "…"` | A custom condition that neither the game nor a plugin declares, as `{ custom }` or a [short plugin call](/reference/custom#plugincall). |
| A stat owner problem | See [Stat owners](#stat-owners). |
| `unknown setting "…"` | A `setting` the game doesn't declare. |
| `setting "…" is a ui setting; conditions read only play settings` | A `ui` [setting](/reference/settings), which isn't in the state. |
| `<value> for setting "…" is not …` | An `is` the setting can't take: not `true` or `false` for a toggle, not one of a choice's options, or out of a range's bounds or steps. |
| Whatever the plugin says | For a call to a plugin's condition, what its [references](#plugin-references) name and its [`argProblems`](/reference/plugins#checking-calls). |

### In an effect

| Problem | When |
|---|---|
| `unknown effect kind "…"` | A `kind` the engine doesn't have. The effect does nothing. |
| `an effect needs a kind, or a custom call by name` | An effect with neither, such as `{}`. It does nothing. |
| `no custom effect named "…"` | A `{ custom }` or short-form effect that neither the game nor a plugin declares. |
| `no plugin effect named "…"` | A long-form `{ kind: 'custom', name }` effect that no plugin declares. Only a plugin can answer the long form. |
| `unknown stat "…"` | A `stat` or `setStat` effect names a stat nobody declares. |
| A stat owner problem | A `stat` or `setStat` effect names a stat on the wrong owner. See [Stat owners](#stat-owners). |
| `stat "…" is derived: it is worked out, never written` | A `stat` or `setStat` effect names a [derived stat](/reference/stats#derived-stats), or a `create` effect gives one a value. |
| `no <kind> stat named "…"` | A `create` effect gives its entity a stat that isn't declared `of` its kind. |
| `unknown kind "…"` | A `create`'s or `each`'s `of`, or the kind in the `of` of a `stat`, `setStat`, `flag` or `remove` effect. |
| `unknown item "…"` | An `item` effect. |
| `unknown storyline "…"` | A `storylineFlag` or `closeStoryline` effect. |
| `unknown collection "…"` | A `collect` or `discard`. |
| `no prose for "…"` | A `notify`'s `text`, or a `collect` entry's `text`. |
| `goes to unknown scene "…"` | A `scene` effect, or a [storylet](/reference/storylets) draw's `otherwise`. |
| `draws from "…", but no scene is drawn from it` | A storylet draw, `{ kind: 'scene', from }`, names a set no scene's `drawnFrom` includes. |
| An audio problem | An `audio` effect's channel or track, or a `sound` effect's track. See [Audio](#audio). |
| Whatever the plugin says | For a call to a plugin's effect, what its references name and its `argProblems`. |

Inside an `each`, its `where` is checked as a condition and its `effects` as effects, with `'$'` standing for one of its kind. A problem from inside starts `in each <kind>: `, such as `in each staff: stat "quality" belongs to dish, not staff`.

### In a command

| Command | Problem |
|---|---|
| `scene` | `opens unknown scene "…"` |
| `activity` | `unknown activity "…"` |
| `use` | `unknown item "…"` |
| `input` | `unknown input "…"` |
| `setting` | The setting and the value, as a `{ setting, is }` condition is checked. |
| `custom` | `no plugin command named "…"`, then what the plugin's references name and its `argProblems`. |

`start`, `choose`, `leave` and `dismiss` name nothing to check. A `type` the engine doesn't have is reported as `unknown command type "…"`, and in play it's refused with `This game does not do that.`

### Stat owners

A stat is either the player's or belongs to a [kind](/reference/entities). Wherever a stat is named, in `stat` and `level` conditions and in `stat` and `setStat` effects, it has to be named on the right owner:

| Problem | Means |
|---|---|
| `stat "…" belongs to <kind>: say whose with "of"` | A kind's stat, named with no `of`, as if it were the player's. |
| `stat "…" is the player's, not <ref>'s` | The player's stat, named with an `of`. |
| `stat "…" belongs to <kind>, not <other>` | A stat named on an entity of another kind. |

### Absent partners

A condition, effect or command named after a plugin the game wasn't built with isn't reported when one of the game's plugins lists that plugin in its [`cooperates`](/reference/plugins#cooperates). That holds for every form: a condition, a short or long effect, and a command. In play it simply isn't there: the condition is false, the effect does nothing and the command is refused. A plugin nobody cooperates with is still reported.

## Where each check runs

| `where` | Checked |
|---|---|
| `scene <id>` | For a [data scene](/reference/scenes#datascene): `no prose for "…"` for its `text` blocks, each choice's label key (its `label`, or the default `scene#choice`) and every `labels` key. `variants "…" has no lines` for its `variants` blocks and the variants their `art` names. The conditions on its blocks, a `variants` block's `gate`, and each choice's `when`, `blocked` and `labels`. Each choice's `effects`. `two choices share the id "…"`. Its `audio` as a placement (see [Audio](#audio)), its `{ media }` blocks and its `stage` (see [Media](#media)), and `no custom panel named "…"` for its `panelData`. For every scene, data or hand-written, its storylet fields: `weight must be above 0`, `has a weight but no drawnFrom, so it is never drawn`, `has a when but no drawnFrom; when only gates draws`, and its `when`. |
| `item <id>` | The effects of its `use`. |
| `activity <id>` | Each requirement's `when`, and its `effects`. For each stat its `cost` spends: `spends unknown stat "…"`, or `spends stat "…", which is derived and never written`. |
| `action <id>` | The game's own [`actions`](/reference/game#game): each one's `when` and `blocked`, and its `command`. |
| `trigger <id>` | Its `when` and its `effects`. |
| `input <id>` | Its `when`, `a choice with no options`, and `min is above max`. |
| `setting <id>` | `a choice with no options`, `min is above max`, `step must be above 0`, and a `default` the setting can't take, such as `default 9 is not between 0 and 5`. |
| `stat <id>` | `belongs to unknown kind "…"` for its `of`, `no custom value named "…"` for a `max: { value }`, and its `visible` condition. For a [derived stat](/reference/stats#derived-stats): `derive reads unknown stat "…"`, `derive reads stat "…", which belongs to …, not …`, `a derived stat cannot be spendable: it is never written`, `a derived stat has no start: it is worked out`, and `derive goes round in a cycle: … → …`. For [levels](/reference/stats#levels): `levels.at needs at least one threshold`, `levels.at must go up, each threshold above the last`, and `levels.at … outside the stat's range (… to …)`. |
| `entity <kind>:<id>` | `unknown kind "…"`, `no <kind> stat named "…"` for a stat in its `stats` that isn't declared `of` its kind, `stat "…" is derived: it is worked out, never written`, and `an entity id must not be a whole number` (see [Ids](/reference/entities#ids)). |
| `finished` | The game's [`finished`](/reference/state#new-game) condition. |
| `carryOver` | `unknown stat "…"` and `unknown item "…"` in [`carryOver`](/reference/state#new-game), and `stat "…" belongs to <kind>, not the player` for a kind's stat. |
| `lock <n>` | The `when` of each lock in [`rules.locks`](/reference/locks), by its place in the list from 0. |
| `introScene` | `unknown scene "…"`, when the game opens on a scene it doesn't have. |
| `plugin <id>` | `a plugin id is letters, digits and "-" only` and `two plugins share this id`. |
| `data <plugin>` | `the game has no plugin named "<plugin>"`: content for a plugin the game wasn't built with. |
| `<list> <id>` | What a plugin's content names, from its [references](#plugin-references), and whatever its own [`check`](/reference/plugins#check) finds. |
| `track <id>`, `channel <id>`, `audio`, `audio default` | The audio manifest. See [Audio](#audio). |
| `pool <id>` | An empty pool, a file with no `src`, or a file's weight. See [Media](#media). |
| `prose <key>` | The tracks named by `[[sound:id]]` and `[[voice:id]]`, and the pools and flags in picture and video markup, in every line of prose. |
| `version` | `version must be a whole number, 1 or more`, for the game's [`version`](/reference/saves#the-game-s-own-migrations). |
| `migration <n>` | `a step is keyed by the version it upgrades from, 1 to …`, for a step keyed outside 1 to `version - 1`. A game with no `version` has no room for steps, so any step is reported. |
| `<list> <id>` for `scene`, `item`, `storyline`, `activity`, `stat`, `kind`, `entity`, `collection`, `trigger`, `input`, `setting` | `two <list>s share this id`. Only a game built without `loadGame` can have these, since packs merge by id. |

`loadGame` adds a few of its own, about the packs themselves. See [What the loader adds](/reference/loader#what-the-loader-adds).

## Audio

Wherever content names [audio](/reference/audio), it's checked against `game.audio`. A background placement is a scene's `audio`, a place's `audio`, an `audio` effect, or `game.audio.default`. A sound is a `sound` effect, `[[sound:id]]` or `[[voice:id]]`.

| Problem | When |
|---|---|
| `unknown track "…"` | Anything names a track that `game.audio.tracks` doesn't have: a placement, a sound, markup, or a playlist. |
| `unknown channel "…"` | A placement names a channel that isn't declared or one of the [four defaults](/reference/audio#channels). |
| `channel "…" plays sounds, not background audio` | A placement names a cue channel, such as `sfx`. |
| `track "…" is a sound on channel "…", not background audio` | A placement or a playlist names a track whose channel is a cue channel. A track with no `channel` is on `sfx`. |
| `track "…" is background audio on channel "…", not a sound` | A sound names a track on a background channel, such as `music`. |
| `"…" is a playlist, not a sound` | A sound names a playlist. |
| `on undeclared channel "…"` | A track's `channel` isn't a channel the game has. |
| `volume is not between 0 and 1` | A track's `volume`. |
| `a playlist with no tracks` | A playlist's list is empty. |
| `"…" is a playlist; a playlist holds tracks` | A playlist names another playlist. |
| `"…" has a weight of …; a weight must be above 0` | A playlist entry's `weight` is 0 or less. |
| `"…" has a weight, but only a shuffled playlist uses weights` | A playlist entry has a `weight`, but the playlist's `order` isn't `'shuffle'`. |
| `unknown setting "…"` | A channel's `volume`, or `game.audio.mute`, names a setting the game doesn't declare. |
| `setting "…" is not a ui range setting` | A channel's `volume` names a setting that isn't a `ui` range. |
| `setting "…" is not a ui toggle setting` | `game.audio.mute` names a setting that isn't a `ui` toggle. |
| `ducks under unknown channel "…"` | A channel's `duck.under` names a channel the game doesn't have. |
| `duck.to is not between 0 and 1` | A channel's `duck.to`. |
| `mode is not "background" or "cue"` | A channel's `mode`. |

## Media

Wherever content asks for a picture or a video, it's checked against `game.media`. That's the picture and video [markup](/reference/prose#videos) in every line of prose, a data scene's `{ media }` blocks and `stage`, and a place's `stage`.

| Problem | When |
|---|---|
| `unknown pool "…"` | Markup (`[[img:@door]]`), a `{ media }` block or a stage layer names a pool `game.media.pools` doesn't have. |
| `no file in pool "…" is tagged "…"` | A request asks for a tag no file in the pool has. The pick would still fall back to other files, but a tag nothing has is usually a typo. |
| `a pool with no files` | A pool is empty. Reported as `pool <id>`. |
| `file <n> has no src` | A file in a pool has no `src`. Reported as `pool <id>`. |
| `file <n> has a weight of …; a weight must be above 0` | A file's `weight` is 0 or less. Reported as `pool <id>`. |
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

A hotspot's `command` and `when`, and a layer's `when`, are checked as any command and condition are, with `hotspot <id>:` or `stage layer <id>:` in front.

## Plugin references

A plugin tells the checker what its calls and its content name, so its content is checked the same way the engine's is. It gives a [`references`](/reference/plugins#references) field with two functions, both optional:

- `calls(kind, name, args, game)` says what one call to its conditions, effects or commands names, from the `with` that content passes;
- `content(game)` says what each entry of its content names, as `{ list, id, refs }`.

Each returns a list of `Reference`s:

```ts
type Reference =
  | { scene: string; as?: 'gate' | 'go' | 'open' }
  | { choice: string }
  | { drawnFrom: string }
  | { stat: string; of?: string; writes?: boolean }
  | { stat: string; starts: string }
  | { item: string }
  | { storyline: string }
  | { collection: string }
  | { setting: string; is?: FlagValue }
  | { kind: string }
  | { activity: string }
  | { input: string }
  | { prose: string }
  | { variants: string }
  | { value: string }
  | { panel: string }
  | { channel: string; track: string | null | undefined }
  | { sound: string }
  | { pool: string; tags?: readonly string[] }
  | { call: 'conditions' | 'effects' | 'commands'; name: string; with?: PluginArgs; long?: boolean }
  | { entry: string; plugin: string; list: string; noun: string }
  | { picture: string; asWritten?: boolean }
  | { video: string; asWritten?: boolean }
  | { audio: string }
  | { markup: string }
  | { when: Condition | undefined }
  | { effects: readonly EffectRef[] | undefined }
  | { command: Command | undefined }
  | { blocks: readonly Block[] | undefined }
  | { media: SceneMedia }
  | { stage: MediaStage | undefined; choices: readonly string[] | null }
  | { within: string; refs: readonly Reference[] }
```

| Reference | Checked as |
|---|---|
| `{ scene, as }` | A scene that has to exist. `as` words the problem: `gated on…` for a condition, `opens…` for a button, `goes to…` (the default) for an effect. |
| `{ choice }` | A `scene/choice` key, as `chose` checks it. |
| `{ stat, of, writes }` | A stat read, or with `writes`, written, on the player or on `of`. |
| `{ stat, starts }` | A stat an entity of the kind `starts` is given a value for. |
| `{ item }`, `{ storyline }`, `{ collection }`, `{ kind }`, `{ activity }`, `{ input }` | An id that has to be declared. |
| `{ setting, is }` | A play setting, and a value it has to be able to take. |
| `{ prose }`, `{ variants }` | A prose key that needs words, a variants list that needs lines. |
| `{ value }`, `{ panel }` | A [custom value or panel](/reference/custom). |
| `{ channel, track }`, `{ sound }` | A background placement, or a sound played once. |
| `{ pool, tags }` | A pool and the tags asked of it. |
| `{ call }` | A call to a custom or plugin condition, effect or command by name. |
| `{ entry, plugin, list, noun }` | An entry in a plugin's content, such as a location: `unknown location "…"`. Not checked when the game doesn't have that plugin. |
| `{ picture }`, `{ video }`, `{ audio }` | A file, listed in [`files`](#fileref). A picture or video goes through `artSrc` unless it's `asWritten`, a path from the page. |
| `{ markup }` | Prose with markup in it. |
| `{ when }`, `{ effects }`, `{ command }`, `{ blocks }`, `{ media }`, `{ stage }` | Content to look inside, checked as the engine's own is. A stage with `choices: null` has no scene, such as a place's. |
| `{ within, refs }` | More references, whose problems read `<within>: <what>`, such as `action dig: unknown location "moon"`. |

This is how the [places plugin](/plugins/places) says what a location names:

```ts
references: {
  calls: (kind, name, args) => (kind === 'commands' && name === 'go' ? [location(String(args.to))] : []),
  content: (game) =>
    locationsOf(game).map((place) => ({
      list: 'locations',
      id: place.id,
      refs: [
        { blocks: place.body },
        { stage: place.stage, choices: null },
        ...(place.actions ?? []).map((action) => ({ within: `action ${action.id}`, refs: [{ when: action.when }, { command: action.command }] })),
      ],
    })),
},
```

A problem in an entry is reported as `<list> <id>`, against the pack the entry came from. A rule of the plugin's own that no reference can say, such as an exit to a place that isn't there, goes in its [`check`](/reference/plugins#check).
