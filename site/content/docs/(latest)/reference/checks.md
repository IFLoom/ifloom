---
title: "Checking content"
description: "What the content checker reports, where each problem is pinned, and how to run checkGame and describeProblem yourself."
---
`checkGame` reads through a game's content once, reports everything it names that the game doesn't have, and lists the files it names. [`loadGame`](/docs/reference/loader#loadgame) runs it on the game it merges. A game you build by hand calls it itself, usually from a test.

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

A loaded game's problems are already in `loadGame`'s result, each pinned on the content or pack it came from, so there's no need to check it again. `ifloom check` prints a game's problems once either way.

## checkGame

```ts
function checkGame(game: Game, options?: { probes?: readonly Probe[] }): Checked

type Checked = { problems: Problem[]; files: FileRef[] }
type Probe = { name: string; state: GameState }
```

Walks every part of the game that is data: scenes and data scenes, actions, triggers, inputs, settings, stats, entities, `finished`, `carryOver`, the locks, `saveable`, `introScene`, audio, media pools, all the prose, and every plugin's content. Each condition, effect and command is looked up in one table that says what it names, so a condition reads the same wherever it sits. Then each name is checked against the game.

It never throws on bad content. It returns the problems in the order it found them, and an empty list when there's nothing wrong.

**Gotchas:**
- A hand-written `Scene` is a function, so the checker can't see inside it. Only its [storylet](/docs/reference/storylets) fields are checked, unless you give it probes.
- It doesn't run the game's own code. An [effect in `rules`](/docs/reference/custom#effects) that returns a broken effect, or a `rules.onTurn` that applies one, is only found in play.
- A key content or a pack can't hold, such as `rules`, is reported by [`loadGame`](/docs/reference/loader#loadgame) as `content has no "rules", so it was left out`. So is a key your content declares twice. A hand-built game has no content files, so `checkGame` has nothing to say about these.
- It doesn't check the tokens in prose, such as `{{v:game/breadPrice}}`. An unknown one is left on screen as written, so you can see it.

## Probes

A probe is a state to render every scene against, with a name for the problems it finds. It's the only way to check a hand-written scene's choices.

```ts
const later = { ...startingState(game), turn: 5 }
checkGame(game, { probes: [{ name: 'day five', state: later }] })
```

For each probe the checker renders every scene and reports, against `scene <id> (<name>)`:

- `render threw: …` when a scene's `render` throws
- for a hand-written scene, `two choices share the id "…"`, and everything its rendered body, media, audio and stage name, and each rendered choice's effects, after `choice <id>:`.

A data scene's content is checked already, so a probe only renders it to see that it doesn't throw.

## Problem and describeProblem

```ts
type Problem = { pack: string; where: string; what: string }

function describeProblem(problem: Problem): string
```

`pack` says where the thing came from. For a game you built by hand it's `game`. For a loaded game it's the pack that last declared or patched the thing, or else the content's `name` (`content` when it has none), `base` for a key `loadGame`'s `base` can't hold, or a plugin's id for what came from that plugin's own content. `where` says what the problem is in, such as `scene ava.hi`, and `what` says what's wrong.

`describeProblem` joins the three with ` · `, so a mod author reads one line:

```text
mod:sunday-market · scene market.stall · goes to unknown scene "market.closing"
```

## FileRef

```ts
type FileRef = { path: string; type: 'picture' | 'video' | 'audio'; where: string }
```

`checked.files` lists every picture, video and sound file the game names, with where it's named. The `path` is where the page asks for it: after [`artSrc`](/docs/reference/prose#artsrc) for pictures and videos, after [`audioSrc`](/docs/reference/audio#audiosrc) for sounds. So `{ src: 'door' }` is `art/door.jpg` and a track's `'music/calm'` is `audio/music/calm.ogg`.

The list covers:

- every track in `game.audio.tracks` (a playlist names tracks, not files)
- every file in a [pool](/docs/reference/media#pools)
- a `{ media }` block's `src` and `poster`, and a stage layer's
- the files in picture and video markup in any prose, posters included
- the `image` of a `notify` effect, used as written (a URL is left out), and of an entity, declared or made by a `create` effect, through `artSrc`, so a character's portrait is listed with them
- whatever a plugin's [references](#plugin-references) name, such as a post's picture.

A pool request (`[[img:@door]]`) names no file itself. Its pool's files are listed instead. A place's `art` isn't listed, because no UI draws it.

The same file named in two places is listed once for each place. The CLI uses this list and nothing else to find a game's files. [`ifloom check`](/docs/cli#ifloom-check) looks for each one in `public/`, and [`ifloom build`](/docs/cli#ifloom-build) looks in the built folder, both with [`checkFiles`](/docs/cli#checkfiles).

## What content names

These are the checks on a condition, an effect and a command. They're the same wherever one sits: in a scene, an action, a trigger, a plugin's content, or inside another.

### In a condition

Every condition is walked, including inside `all`, `any`, `not` and a `count`'s `where`.

| Problem | When the condition names |
|---|---|
| `"…" takes its arguments as an object, …` | A [short plugin call](/docs/reference/custom#plugincall) whose value isn't an object or `true`, such as `{ 'places/at': ['cafe'] }`. It's asked with no arguments. The same problem is reported for an effect or a command written that way. |
| `a condition asks one thing, but this one has … keys that each say what it asks: …` | Two keys in one object that each say what it asks, such as `{ kv, stat }`. It never holds, so combine them with `all`. Its parts aren't looked into. |
| `a condition needs one key that says what it asks, such as kv or stat, or a call by name; …` | No such key at all, such as `{}` or `{ gte: 3 }`. It never holds. |
| `{ custom: "…" } is written in short now, as { "game/…": { … } }, or true for no arguments` | A call in the form content wrote before schema 18. It never holds. The same is reported for an effect written that way. |
| `unknown storyline "…"` | A storyline nobody declares, in `storyline` or a `kv` condition's `of: 'storyline:…'`. |
| `unknown stat "…"` | A stat nobody declares, in `stat` or `level`. |
| `unknown kind "…"` | A kind nobody declares, in `count`, `entity` or the `of` of a `stat`, `level` or `kv`. `'$'`, `'you'`, `'player'`, `'minigame'` and `'storyline:…'` name no kind and aren't checked as one. |
| A holder problem | An `entity` condition's `at`, or a `count`'s `Select`'s. See [Holders](#holders). |
| `plugin "…" has no trait "…"` | A `count`'s `Select` names a `trait` of a plugin the game has, which that plugin doesn't declare. |
| `gated on unknown scene "…"` | A scene that doesn't exist, in `seen`, `since` or `scene`. |
| `gated on a choice in unknown scene "…"` | A `chose` key, or a `since` naming a `scene#choice`, whose scene doesn't exist. |
| `gated on unknown choice "…"` | A `chose` or `since` key whose data scene has no such choice. A hand-written scene's choices aren't known in advance. |
| `no custom condition named "…"` | A [call](/docs/reference/custom#plugincall) to a condition that neither the game's `rules` nor a plugin declares. A name with no `/` adds `; the game's own code is called with "game/" in front, as "game/…"`. |
| A stat owner problem | See [Stat owners](#stat-owners). |
| `minigame key "…" is not in any minigame's kv` | A `kv` condition with `of: 'minigame'` naming a key no [minigame](/docs/reference/minigames) declares. |
| `unknown timer "…"` | A `timer` condition naming a timer the game doesn't declare in `timers`. |
| `unknown setting "…"` | A `setting` the game doesn't declare. |
| `setting "…" is a ui setting; conditions read only play settings` | A `ui` [setting](/docs/reference/settings), which isn't in the state. |
| `<value> for setting "…" is not …` | An `is` the setting can't take: not `true` or `false` for a toggle, not one of a choice's options, or out of a range's bounds or steps. |
| Whatever the plugin says | For a call to a plugin's condition, what its [references](#plugin-references) name and its [`argProblems`](/docs/reference/plugins#checking-calls). |

### In an effect

| Problem | When |
|---|---|
| `effects are told apart by their key now, as { …: … }, not { kind: "…" }` | An effect still written with `kind`, as before schema 21. It does nothing. |
| `an effect does one thing, but this one has … keys that each say what it does: …` | Two keys that each say what it does, such as `{ stat, kv }`. It does nothing. |
| `an effect needs one key that says what it does, such as stat or kv, or a call by name; …` | An effect with no such key, such as `{}` or `{ by: 2 }`. It does nothing. |
| `no custom effect named "…"` | A [call](/docs/reference/custom#plugincall) to an effect that neither the game's `rules` nor a plugin declares. A name with no `/` adds where the game's own goes, as for a condition. |
| `unknown stat "…"` | A `stat` effect names a stat nobody declares. |
| A stat owner problem | A `stat` effect names a stat on the wrong owner. See [Stat owners](#stat-owners). |
| `stat "…" is derived: it is worked out, never written` | A `stat` effect names a [derived stat](/docs/reference/stats#derived-stats), or a `create` effect gives one a value. |
| `no <kind> stat named "…"` | A `create` effect gives its entity a stat in `with` that isn't declared `of` its kind. |
| `unknown kind "…"` | The kind a `create` or an `each` names, the kind in the `of` of a `stat` or `kv` effect, or in the entity an `entity`, `remove` or `move` effect names. |
| A holder problem | An `entity` effect's `at`, a `move`'s `from` and `to`, a `create`'s `at`, an `each`'s `at`, and the entity a `you` effect names. See [Holders](#holders). |
| `unknown entity "…" to be like: name one the game declares` | A `create`'s `like` names an entity nobody declares. |
| `like names a <kind>, not a <of>` | A `create`'s `like` is of another kind than the one it creates. |
| `plugin "…" has no trait "…"` | An `each`'s `trait`, or a trait in a `create`'s `with.traits`, of a plugin the game has that doesn't declare it. |
| `unknown storyline "…"` | A `kv` effect's `of: 'storyline:…'`, or a `closeStoryline` effect. |
| `no prose for "…"` | A `notify`'s `text`. |
| `goes to unknown scene "…"` | A `scene` effect, or a [storylet](/docs/reference/storylets) draw's `otherwise`. |
| `draws from "…", but no scene is drawn from it` | A storylet draw, `{ scene: { from } }`, names a set no scene's `drawnFrom` includes. |
| An audio problem | An `audio` effect's channel or track, or a `sound` effect's track. See [Audio](#audio). |
| `unknown minigame "…"` | A `minigame` effect. |
| `minigame key "…" is not in any minigame's kv` | A `kv` effect with `of: 'minigame'`. |
| `dice "…" is not dice notation such as "2d6+1", "1d20" or "d100"` | A [`roll`](/docs/reference/effects#roll) effect's `dice` that isn't notation. The effect rolls nothing. |
| `dice have … sides; a die needs at least 2`, `… dice; a roll throws 1 to 100` | A `roll` effect's dice, in notation or as `{ count, sides }`. |
| `roll key "…" must be letters, digits and _, not starting with a digit, so {{key}} can show it` | The kv key a `roll` effect names. |
| `roll plus must be a number or { stat }`, `roll against must be a number` | A `roll` effect's `plus` and `against`. |
| `unknown stat "…"` | A `roll` effect's `plus: { stat }`. |
| `unknown timer "…"` | A [`timer`](/docs/reference/effects#timer) effect naming a timer the game doesn't declare. The effect does nothing. |
| `a timer’s to must be a number of milliseconds above 0, or null to stop it`, `a timer’s by must be a number of milliseconds` | A `timer` effect's `to` and `by`. |
| Whatever the plugin says | For a call to a plugin's effect, what its references name and its `argProblems`. |
| Whatever the plugins say | For a `panel` effect, each plugin's [`panelProblems`](/docs/reference/plugins#checking-panels) about its `with`. Any panel name is allowed. |
| `jumps to point "…", but a jump only works as a choice's effect in the scene that has that point` | A [`point`](/docs/reference/effects#point) effect anywhere but a choice of a data scene. In a choice, its scene's [flow checks](/docs/reference/flows#the-checks) read it instead. |

Inside an `each`, its `where` is checked as a condition and its `effects` as effects, with `'$'` standing for one of its kind. A problem from inside starts `in each <kind>: `, such as `in each staff: stat "quality" belongs to dish, not staff`.

### In a command

| Command | Problem |
|---|---|
| `scene` | `opens unknown scene "…"` |
| `action` | `unknown action "…"`, for one the game's content doesn't declare. A plugin's action (`places/coffee`) is the plugin's to answer for in play, so it isn't checked. |
| `input` | `unknown input "…"` |
| `setting` | The setting and the value, as a `{ setting, is }` condition is checked. |
| `custom`, or a call in short (a plugin's or the game's own) | `no plugin command named "…"`, then what the plugin's references name and its `argProblems`. |

`start`, `newGame`, `choose`, `leave`, `dismiss`, `tick`, `minigame` and `closePanel` name nothing to check. A `type` the engine doesn't have is reported as `unknown command type "…"`, and in play it's refused with `This game does not do that.`

### Stat owners

A stat is either the player's or belongs to a [kind](/docs/reference/entities). Wherever a stat is named, in `stat` and `level` conditions and in `stat` effects, it has to be named on the right owner:

| Problem | Means |
|---|---|
| `stat "…" belongs to <kind>: say whose with "of"` | A kind's stat, named with no `of`, as if it were the player's. |
| `stat "…" is the player's, not <ref>'s` | The player's stat, named with an `of`. |
| `stat "…" belongs to <kind>, not <other>` | A stat named on an entity of another kind. |

### Holders

Wherever content names a [holder](/docs/reference/entities#holding-things), it has to be one that can hold things: `'player'`, `'you'`, `'$'`, or an entity of a [unique](/docs/reference/entities#kinddef) kind.

| Problem | Means |
|---|---|
| `unknown holder "…": a holder is "player", "you" or a unique entity` | Not a holder at all, such as `'pal'`. |
| `unknown kind "…"` | An entity of a kind nobody declares. |
| `"…" can't hold things: its kind "…" isn't unique` | An entity whose kind stacks, such as `'food:apple'`. |
| `"…" can't hold itself` | A `move` whose `to` is the thing it moves. |
| `"you" is already whoever is played: …` | A `you` effect whose `to` is `'you'`. |

Where things start, in each entity's [`at`](/docs/reference/entities#entitydef), is checked at `entity <kind>:<id>`: see [Where each check runs](#where-each-check-runs).

### Speakers

A spoken line written under an id, `@ava: "…"` in [prose](/docs/reference/prose#speech) or a [`say()`](/docs/reference/flows#the-builders) block's speaker, has to name an entity. `'you'` and `'player'` always pass.

| Problem | Means |
|---|---|
| `a spoken line is under "…", which names no entity` | No entity has that id, or that reference. |
| `a spoken line is under "…", which more than one kind has: name it as "kind:…"` | A bare id two kinds share, and neither is a `character`. Write the full reference, `@staff:jo`. |

### Absent partners

A condition, effect or command named after a plugin the game wasn't built with isn't reported when one of the game's plugins lists that plugin in its [`cooperates`](/docs/reference/plugins#cooperates). That holds for a condition, an effect and a command. In play it isn't there: the condition is false, the effect does nothing and the command is refused. A plugin nobody cooperates with is still reported.

## Where each check runs

| `where` | Checked |
|---|---|
| `scene <id>` | For a [data scene](/docs/reference/scenes#datascene): `no prose for "…"` for its `text` blocks, each choice's label key (its `label`, or the default `scene#choice`) and every `labels` key. `variants "…" has no lines` for its `variants` blocks and the variants their `art` names. The conditions on its blocks, a `variants` block's `gate`, and each choice's `when`, `blocked` and `labels`. Each choice's `effects`. `two choices share the id "…"`, among its decisions' choices and its ending choices together. For a scene that [flows](/docs/reference/flows#the-checks): what its sections, decisions (each choice, and what its `then` names) and minigame and panel blocks name, and the flow's own checks. Its `audio` as a placement (see [Audio](#audio)), its `{ media }` blocks and its `stage` (see [Media](#media)), and, for its `panel`, each plugin's [`panelProblems`](/docs/reference/plugins#checking-panels) about its `with`. For every scene, data or hand-written, `unknown minigame "…"` for its `minigame` field, and its storylet fields: `weight must be above 0`, `has a weight but no drawnFrom, so it is never drawn`, `has a when but no drawnFrom; when only gates draws`, and its `when`. |
| `action <id>` | The content's [`actions`](/docs/reference/actions#actiondef): each one's `when`, `blocked`, `effects` and `command`. For each stat its `cost` spends: `spends unknown stat "…"`, or `spends stat "…", which is derived and never written`. `an action's command can't be a choice`, and `an action's command can't be the action itself; give it the effects`. |
| `trigger <id>` | Its `when` and its `effects`. |
| `input <id>` | Its `when`, `a choice with no options`, and `min is above max`. |
| `minigame <id>` | `starts in unknown state "…"`, `no final state can be reached from its start, so it never ends`, `keys maps input "…", which no state's on uses`, `uses key "…", which is not in its kv` (one another minigame declares), and `copies key "…", which is not in its kv`. See [Minigames](/docs/reference/minigames#the-checks). |
| `minigame <id> state <state>` | Its `label`'s prose, `a timer needs ms above 0`, `a final state ends the minigame, so its after, on and always never run`, and for each transition (`after`, `on <input>`, `always <n>`): `goes to unknown state "…"`, `to lists no states`, and `the weight of "…" must be above 0`. Each transition's `when` and `effects` are checked under `minigame <id> state <state> <transition>`, and a final state's effects under `… final`. |
| `timer <id>` | `a timer needs ms above 0`, `two timers share this id`, and its `effects`. See [Timers](/docs/reference/timers#the-checks). |
| `setting <id>` | `a choice with no options`, `min is above max`, `step must be above 0`, and a `default` the setting can't take, such as `default 9 is not between 0 and 5`. |
| `stat <id>` | `belongs to unknown kind "…"` for its `of`, `no custom value named "…"` for a `max: { value }`, its `visible` condition and its `ui` (see [Presentation hints](#presentation-hints)). For a [derived stat](/docs/reference/stats#derived-stats): `derive reads unknown stat "…"`, `derive reads stat "…", which belongs to …, not …`, `a derived stat cannot be spendable: it is never written`, `a derived stat has no start: it is worked out`, and `derive goes round in a cycle: … → …`. For [levels](/docs/reference/stats#levels): `levels.at needs at least one threshold`, `levels.at must go up, each threshold above the last`, and `levels.at … outside the stat's range (… to …)`. |
| `entity <kind>:<id>` | `unknown kind "…"`, `no <kind> stat named "…"` for a stat in its `stats` that isn't declared `of` its kind, `stat "…" is derived: it is worked out, never written`, and `an entity id must not be a whole number` (see [Ids](/docs/reference/entities#ids)). What its `visible` names, with `'$'` as it, and its `image` file. For its [`at`](/docs/reference/entities#holding-things): `at can't be "you" where a thing starts: …`, `at names the entity itself: nothing can hold itself`, `at names unknown holder "…"` (a holder has to be declared), `at names "…", whose kind isn't unique, so it can't hold things`, `at gives "…" <n>: a count is a whole number above 0`, `a unique thing starts in one place, one of it`, and `holders go round in a cycle: … → …` for unique things that start inside each other. |
| `kind <id>` | What its `listed` and `flags` conditions name, with `'$'` as any one of the kind, and its `ui`. |
| `trait <id>` | `plugin "…" has no trait "…"`, for a trait id whose plugin the game has but which that plugin doesn't declare. See [Traits](#traits). |
| `trait <id> on <kind>:<id>` | `unknown entity "…"` for a row of the `traits` table that names an entity nobody declares, and whatever the plugin's trait finds in the data with its `check` and `references`. See [Traits](#traits). |
| `finished` | The game's [`finished`](/docs/reference/state#new-game) condition. |
| `carryOver` | `unknown stat "…"` in [`carryOver`](/docs/reference/state#new-game) and `stat "…" belongs to <kind>, not the player` for a kind's stat. For each thing in `held`: `unknown entity "…": name one as "kind:id"`, or `unknown kind "…"`. |
| `lock <id>` | The `when` of each of the content's [`locks`](/docs/reference/locks), by its `id`, or by its place in the list from 0 for one with none. |
| `introScene` | `unknown scene "…"`, when the game opens on a scene it doesn't have. |
| `plugin <id>` | `a plugin id is letters, digits and "-" only` and `two plugins share this id`. For its [traits](/docs/reference/plugins#traits): `trait "…" must be named "<id>/" and a name` and `two traits share the id "…"`. |
| `data <plugin>` | `the game has no plugin named "<plugin>"`: content for a plugin the game wasn't built with. |
| `<list> <id>` | What a plugin's content names, from its [references](#plugin-references), and whatever its own [`check`](/docs/reference/plugins#check) finds. |
| `track <id>`, `channel <id>`, `audio`, `audio default` | The audio manifest. See [Audio](#audio). |
| `pool <id>` | An empty pool, a file with no `src`, or a file's weight. See [Media](#media). |
| `prose <key>` | The tracks named by `[[sound:id]]` and `[[voice:id]]`, and the pools and flags in picture and video markup, in every line of prose. |
| `version` | `version must be a whole number, 1 or more`, for the game's [`version`](/docs/reference/saves#the-games-own-migrations). |
| `migration <n>` | `a step is keyed by the version it upgrades from, 1 to …`, for a step keyed outside 1 to `version - 1`. A game with no `version` has no room for steps, so any step is reported. |
| `<list> <id>` for `scene`, `storyline`, `action`, `stat`, `kind`, `entity`, `trigger`, `input`, `setting`, `minigame` | `two <list>s share this id`. Only a game built without `loadGame` can have these, since `loadGame` merges by id. |

`loadGame` adds a few of its own, about the content and packs themselves, such as a key declared twice. See [What the loader adds](/docs/reference/loader#what-the-loader-adds).

## Traits

Every declared entity's [traits](/docs/reference/entities#traits) are checked once the kind's default, the entity's own and any table row are combined. What's checked depends on whose trait it is:

- **A trait of a plugin the game has.** The plugin must declare it, or the checker reports `plugin "laundry" has no trait "laundry/washabel"`. Its `check` is asked about the data on each entity that has it, and what its `references` name is resolved, at `trait laundry/washable on clothing:scarf`.
- **A trait of a plugin the game doesn't have.** Let through unchecked, as content for a [cooperating](/docs/reference/plugins#cooperates) plugin is.
- **Your game's own** (no `/` in the id). Not checked, since no plugin says what it holds.

A row of the `traits` table for an entity nobody declares is reported whoever's trait it is: `unknown entity "clothing:sock"`. A problem from a row is pinned on the content or pack the row came from, and one from an entity's own data on the content that declares the entity.

## Audio

Wherever content names [audio](/docs/reference/audio), it's checked against `game.audio`. A background placement is a scene's `audio`, a place's `audio`, an `audio` effect, or `game.audio.default`. A sound is a `sound` effect, `[[sound:id]]` or `[[voice:id]]`.

| Problem | When |
|---|---|
| `unknown track "…"` | Anything names a track that `game.audio.tracks` doesn't have: a placement, a sound, markup, or a playlist. |
| `unknown channel "…"` | A placement names a channel that isn't declared or one of the [four defaults](/docs/reference/audio#channels). |
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

Wherever content asks for a picture or a video, it's checked against `game.media`. That's the picture and video [markup](/docs/reference/prose#videos) in every line of prose, a data scene's `{ media }` blocks and `stage`, and a place's `stage`.

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

## Presentation hints

A `ui` field of [presentation hints](/docs/reference/ui-hints) is checked only for being data, wherever content writes one: a scene, a choice (as `choice <id>:`), a block, an action, a stat, a kind, an entity, a place and the game (reported as `ui`). What the hints say is the UI's to check. The React UI's [`checkUiHints`](/docs/react/hints#checkuihints) does that for its own.

| Problem | When |
|---|---|
| `ui must be an object of hints` | `ui` is a string, a number, an array or null. |
| `ui.… is a function; ui hints are data` | A function anywhere inside it. |
| `ui.… is not plain data; ui hints are objects, arrays, text, numbers and true/false` | A class instance, such as a `Date` or a `Map`. |
| `[[reveal]] is no longer markup and would be shown as written; …` | `[[reveal]]` left in prose. Put the paragraph in a block of its own with a `ui` hint. |

## Inline actions and tooltips

[Inline actions and tooltips](/docs/reference/prose#inline-actions-and-tooltips) are checked in every prose line, and against the choices of the scene (or the buttons of the room) whose body names them. A data scene's body is checked against its choices, a hand-built scene's rendered body against the choices its render gives, and a place's body against its `actions` and the game's.

| Problem | When |
|---|---|
| `[[act:…]] names no choice or action offered here` | The id isn't one of the scene's choices, or the room's buttons. |
| `[[act:…]] is in one line twice; only the first is drawn as an action` | The same id twice in one prose line. |
| `[[act:…]] is in two blocks that can show together; only the first is drawn as an action` | Two blocks name it, and at least one has no `when`. Members of one variants list are drawn one at a time, so they can each name it. |
| `[[act]] needs the id of a choice: [[act:id]] or [[act:id\|words]]` | `[[act:]]` or `[[act:\|words]]`. |
| `[[act:…\|]] has no words; leave out the "\|" to use the choice's label` | An empty `\|`. |
| `[[tip]] needs a prose key: [[tip:key\|words]]` | `[[tip:\|words]]`. |
| `[[tip:…]] needs the words to show: [[tip:…\|words]]` | A tooltip with no words, which is shown as written. |
| `[[tip:…]]: no prose for "…"` | The tooltip's key has no prose. |
| `[[act:…]] or [[tip:…]] is not closed with "]]", or is missing its ":"` | Markup that the reader can't find the end of. |
| `[[act]] and [[tip]] are shown as written in a "> " line; use them in narration or a spoken line` | Inline markup in a thought. |
| `choice …: a choice's command can't be another choice; put the effects on this one` | A choice's [`command`](/docs/reference/scenes#choice) is `choose`. |

A choice's `command` is checked as any command is, under `choice <id>:`.

## Plugin references

A plugin tells the checker what its calls and its content name, so its content is checked the same way the engine's is. It gives a [`references`](/docs/reference/plugins#references) field with two functions, both optional:

- `calls(table, name, args, game)` says what one call to its conditions, effects or commands names, from the `with` that content passes.
- `content(game)` says what each entry of its content names, as `{ list, id, refs }`.

Each returns a list of `Reference`s:

```ts
type Reference =
  | { scene: string; as?: 'gate' | 'go' | 'open' }
  | { choice: string }
  | { drawnFrom: string }
  | { stat: string; of?: string; writes?: boolean }
  | { stat: string; starts: string }
  | { storyline: string }
  | { setting: string; is?: KvValue }
  | { kind: string }
  | { entity: string }
  | { holder: string; holds?: string; protagonist?: boolean }
  | { like: string; of?: string }
  | { trait: string }
  | { action: string }
  | { input: string }
  | { minigame: string }
  | { minigameKv: string }
  | { timer: string; to?: unknown; by?: unknown }
  | { prose: string }
  | { variants: string }
  | { value: string }
  | { openPanel: string; with?: PluginArgs }
  | { channel: string; track: string | null | undefined }
  | { sound: string }
  | { dice: unknown; key?: unknown; plus?: unknown; against?: unknown }
  | { ui: unknown }
  | { pool: string; tags?: readonly string[] }
  | { call: CallTable; name: string; with?: PluginArgs }
  | { entry: string; plugin: string; list: string; noun: string }
  | { picture: string; asWritten?: boolean }
  | { video: string; asWritten?: boolean }
  | { audio: string }
  | { markup: string }
  | { when: Condition | undefined }
  | { effects: readonly EffectRef[] | undefined }
  | { command: CommandRef | undefined }
  | { blocks: readonly Block[] | undefined }
  | { actionsIn: readonly Block[] | string | undefined; offers: readonly string[] }
  | { media: SceneMedia }
  | { stage: MediaStage | undefined; choices: readonly string[] | null }
  | { within: string; refs: readonly Reference[] }
```

| Reference | Checked as |
|---|---|
| `{ scene, as }` | A scene that has to exist. `as` words the problem: `gated on…` for a condition, `opens…` for a button, `goes to…` (the default) for an effect. |
| `{ choice }` | A `scene#choice` key, as `chose` and `since` check it. |
| `{ stat, of, writes }` | A stat read, or with `writes`, written, on the player or on `of`. |
| `{ stat, starts }` | A stat an entity of the kind `starts` is given a value for. |
| `{ storyline }`, `{ kind }`, `{ trait }`, `{ action }`, `{ input }`, `{ minigame }`, `{ timer }` | An id that has to be declared. A plugin's action, with a `/`, isn't checked. A timer's `to` and `by` have to be milliseconds. |
| `{ holder, holds, protagonist }` | Something that can hold things. See [Holders](#holders). |
| `{ like, of }` | An entity a `create` makes a thing like, of the kind it makes. |
| `{ minigameKv }` | A key some minigame declares in its `kv`. |
| `{ entity }` | An entity by reference, `'food:apple'`, that content (or a plugin's `entities`) declares: `unknown entity "food:pear"`. `'$'` and `'food:*'` pass, once the kind is there. A shop's goods and the wardrobe's slots name their things this way. |
| `{ setting, is }` | A play setting, and a value it has to be able to take. |
| `{ prose }`, `{ variants }` | A prose key that needs words, a variants list that needs lines. |
| `{ value }` | A [value](/docs/reference/custom#values), the game's own (`game/…`) or a plugin's. |
| `{ openPanel, with }` | A panel opened by name. Any name is allowed, and each plugin's [`panelProblems`](/docs/reference/plugins#checking-panels) is asked about its `with`. |
| `{ dice, key, plus, against }`, `{ ui }` | A roll that has to be well formed, and [presentation hints](#presentation-hints) that have to be data. |
| `{ channel, track }`, `{ sound }` | A background placement, or a sound played once. |
| `{ pool, tags }` | A pool and the tags asked of it. |
| `{ call }` | A call by name to a plugin's or the game's own condition, effect or command, in the table `call` names (a [`CallTable`](/docs/reference/plugins#checking-calls)). |
| `{ entry, plugin, list, noun }` | An entry in a plugin's content, such as a location: `unknown location "…"`. Not checked when the game doesn't have that plugin. |
| `{ picture }`, `{ video }`, `{ audio }` | A file, listed in [`files`](#fileref). A picture or video goes through `artSrc` unless it's `asWritten`, a path from the page. |
| `{ markup }` | Prose with markup in it. |
| `{ actionsIn, offers }` | The `[[act:]]` links in a body or a line of prose, each naming one of `offers`, the choices on offer. |
| `{ when }`, `{ effects }`, `{ command }`, `{ blocks }`, `{ media }`, `{ stage }` | Content to look inside, checked as the engine's own is. A stage with `choices: null` has no scene, such as a place's. |
| `{ within, refs }` | More references, whose problems read `<within>: <what>`, such as `action dig: unknown location "moon"`. |

This is how the [places plugin](/docs/plugins/places) says what a location names, trimmed. [`actionReferences`](/docs/reference/actions#actionreferences) gives what an action names:

```ts
references: {
  // A call to places/go names the location it goes to.
  calls: (table, name, args) => (table === 'commands' && name === 'go' ? [location(String(args.id))] : []),
  content: (game) =>
    locationsOf(game).map((place) => ({
      list: 'locations',
      id: place.id,
      refs: [
        { blocks: place.body },
        { stage: place.stage, choices: null },
        // Each of its actions, checked as the game's own are.
        ...(place.actions ?? []).map((action) => ({ within: `action ${action.id}`, refs: actionReferences(action) })),
      ],
    })),
},
```

A problem in an entry is reported as `<list> <id>`, against the content or pack the entry came from. A rule of the plugin's own that no reference can say, such as an exit to a place that isn't there, goes in its [`check`](/docs/reference/plugins#check).

## See it in an example

Small Town: the test `loads with nothing wrong` in [`examples/showcase/tests/showcase.test.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/tests/showcase.test.ts) runs `checkGame` on the loaded game and expects no problems. [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) turns the loader's problems into lines with `describeProblem`, and its `probes` are the states `ifloom snapshot` renders every scene in.
