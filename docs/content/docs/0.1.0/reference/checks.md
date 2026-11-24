---
title: "Checking content"
description: "The content checker, checkGame, and every problem it reports about the names and files a game's content uses."
---
The content checker is `checkGame`, one walk over a game's content that reports each name the game lacks and lists every file it names. [`loadGame`](/docs/0.1.0/reference/content#loadgame) runs it on the game it merges, so a loaded game's problems are in its result already, each pinned on the content or pack it came from. `ifloom check` prints them, and [Playtest and snapshot from the command line](/docs/0.1.0/how-to/playtest-and-snapshot) runs it with probes.

In the showcase: `examples/showcase/tests/showcase.test.ts`, whose test `loads with nothing wrong` expects the loaded town to have no problems.

```ts
import { checkGame, describeProblem, type Checked, type FileRef, type Probe, type Problem } from '@ifloom/engine'
import type { Reference } from '@ifloom/engine/plugin'
```

## Checked

The result of [`checkGame`](#checkgame): the problems in a game's content, the warnings, and the files it names. Every field is in [`Checked`](/docs/0.1.0/api/engine#checked).

`problems` lists each [`Problem`](#problem) in the order the checker found it, and is empty when nothing is wrong. `warnings` lists what may go wrong in play but isn't a mistake in the content, in the same shape. So far the one warning is a token that may print nothing (see [prose](#prose)). [`ifloom check`](/docs/0.1.0/reference/cli#ifloom-check) prints each warning as `warning: …` and doesn't fail on one. `files` lists every file the game names, each a [`FileRef`](#fileref).

## Probe

A state to render every scene in, with a name for the problems it finds. Every field is in [`Probe`](/docs/0.1.0/api/engine#probe).

For each probe, the checker renders every scene and reports `render threw: …` at `scene <id> (<name>)` when rendering one throws, such as when one of the game's own values throws for that state. Keep `name` short and without spaces. [`probe`](/docs/0.1.0/reference/cli#probe) from `@ifloom/cli/game` makes one by playing commands and effects from the start, and a [game module](/docs/0.1.0/reference/glossary#game-module)'s `probes` can go to `checkGame` as they are.

```ts given
import { checkGame, startingState } from '@ifloom/engine'

const later = { ...startingState(game), turn: 5 }
checkGame(game, { probes: [{ name: 'day-five', state: later }] })
```

## Problem

One problem the checker found: where the thing came from, what it's in and what's wrong. Every field is in [`Problem`](/docs/0.1.0/api/engine#problem).

`pack` is `game` for a game built by hand. For a loaded game it's the pack that last declared or patched the thing, else the content's `name` (`content` when it has none), `base` for a key the base can't hold, or a plugin's id for what came from that plugin's own content. `where` names what the problem is in, such as `scene ava.hi`, and `what` says what's wrong. [`describeProblem`](#describeproblem) joins the three into one line.

## FileRef

One picture, video or sound file the game names, with where content names it. Every field is in [`FileRef`](/docs/0.1.0/api/engine#fileref).

`path` is where the page asks for the file: after [`artSrc`](/docs/0.1.0/reference/prose#artsrc) for a picture or a video, and after [`audioSrc`](/docs/0.1.0/reference/audio#audiosrc) for a sound. So `{ src: 'door' }` is `art/door.jpg`, and a track's `'music/calm'` is `audio/music/calm.ogg`. The list covers these:

- Every track in `game.audio.tracks`. A playlist names tracks, not files.
- Every file in a [pool](/docs/0.1.0/reference/media#pools). A pool request such as `[[img:@door]]` names no file itself, so its pool's files are listed instead.
- A `{ media }` block's `src` and `poster`, and a picture layer's.
- The files in picture and video markup in any prose, posters included.
- The `image` of a `notify` effect and of an entity, declared or made by a `create` effect. A URL is left out.
- Whatever a plugin's [references](#reference) name, such as a post's picture.

The same file named in two places is listed once for each place. The CLI finds a game's files from this list alone. [`ifloom check`](/docs/0.1.0/reference/cli#ifloom-check) looks for each one in `public/`, and [`ifloom build`](/docs/0.1.0/reference/cli#ifloom-build) looks in the built folder.

## Reference

One name a piece of content gives, for the checker to resolve: an id by what it is, a file, or content to look inside. Every form is in [`Reference`](/docs/0.1.0/api/engine-plugin#reference).

A plugin builds these in its `references`, a trait's `references`, an argument's `.naming()` and a `CheckTools.problems` call, so the checker checks its content as it checks the engine's ([A plugin's content checks](/docs/0.1.0/reference/plugin-checks)). Each form is checked this way:

| Key | Meaning |
|---|---|
| `{ scene, as }` | A scene that has to exist. `as` words the problem, `gated on…` for a condition, `opens…` for a button and `goes to…`, the default, for an effect. |
| `{ choice }` | A `scene#choice` key, checked as `chose` and `since` check it. |
| `{ stat, of, writes }` | A stat read, or written with `writes`, on the player or on `of`. |
| `{ stat, starts }` | A stat an entity of the kind `starts` is given a value for. |
| `{ storyline }`, `{ kind }`, `{ trait }`, `{ action }`, `{ input }`, `{ minigame }`, `{ timer }` | An id the game has to declare. A plugin's action, with a `/`, isn't checked. A timer's `to` and `by` have to be milliseconds. |
| `{ holder, holds, protagonist }` | Something that can hold things, checked as [holders](#checks) are. |
| `{ like, of }` | An entity a `create` makes a thing like, of the kind it makes. |
| `{ minigameKv }` | A key some minigame declares in its `kv`. |
| `{ entity }` | An entity by reference, such as `'food:apple'`, that content or a plugin's `entities` declares. `'$'` and `'food:*'` pass once the kind exists. |
| `{ setting, is }` | A play setting, and a value it has to be able to take. |
| `{ prose }`, `{ variants }` | A prose key that needs words, or a variants list that needs lines. |
| `{ words, field, oldKey }` | Words written in place in the field `field`, reported when they are a prose key the game has, since a field of words never reads one. |
| `{ outdated }` | Content written in a form the engine no longer reads, reported with the way to write it now. |
| `{ value }` | A [value](/docs/0.1.0/reference/custom#values), the game's own (`game/…`) or a plugin's. |
| `{ openPanel, with }` | A [panel](/docs/0.1.0/reference/panels) opened by name. Any name passes, and each plugin is asked what its `with` names. |
| `{ dice, key, plus, against }`, `{ amount }`, `{ ui }` | A roll that has to be well formed, an [amount](/docs/0.1.0/reference/amounts#checks) the engine has to be able to read, and [presentation hints](/docs/0.1.0/reference/ui-hints#checks) that have to be data. |
| `{ channel, track }`, `{ sound }` | A background placement, or a sound played once, checked as [audio](/docs/0.1.0/reference/audio#checks) is. |
| `{ pool, tags }` | A pool and the tags asked of it. |
| `{ call, name, with }` | A call by name to a plugin's or the game's own condition, effect or command, in the [`CallTable`](/docs/0.1.0/reference/plugin-checks) `call` names. |
| `{ entry, plugin, list, noun }` | An entry in a plugin's content, such as a location, reported as `unknown location "…"`. It isn't checked when the game lacks that plugin. |
| `{ picture }`, `{ video }`, `{ audio }` | A file, listed in [`files`](#fileref). A URL isn't listed. |
| `{ reason }` | A refusal's [`Reason`](/docs/0.1.0/reference/actions#reason), whose key, if it has one, has to name a string. |
| `{ problem }` | A plugin's own rule, broken, whose words are reported as they are. |
| `{ markup }` | Prose with markup in it. |
| `{ actionsIn, offers }` | The `[[act:]]` links in a body or a line of prose, each naming one of `offers`, the choices on offer. |
| `{ when }`, `{ effects }`, `{ command }`, `{ blocks }`, `{ media }`, `{ layered }` | Content to look inside, checked as the engine's own is. A layered picture with `choices: null` belongs to no scene, such as a location's. |
| `{ within, refs }` | More references, whose problems read `<within>: <what>`, such as `action dig: unknown location "moon"`. |

A loyalty-card plugin says what its calls and its cards name this way, with `cardsOf(game)` its list of `data.loyalty.cards` and [`actionReferences`](/docs/0.1.0/reference/actions#actionreferences) for each card's actions:

```ts fragment
references: {
  calls: (_table, name, args) => (name === 'stamp' ? [{ entry: String(args.card), plugin: 'loyalty', list: 'cards', noun: 'card' }] : []),
  content: (game) =>
    cardsOf(game).map((card) => ({
      list: 'cards',
      id: card.id,
      refs: [
        { blocks: card.body },
        { layered: card.picture, choices: null },
        ...(card.actions ?? []).map((action) => ({ within: `action ${action.id}`, refs: actionReferences(action) })),
      ],
    })),
},
```

The checker reports a problem in an entry as `<list> <id>`, against the content or pack the entry came from.

## Functions

### checkGame

Returns the problems, warnings and files of a game's content, as a [`Checked`](#checked). Every parameter is in [`checkGame`](/docs/0.1.0/api/engine#checkgame).

It walks every part of the game that is data: scenes, actions, triggers, inputs, settings, stats, entities, `finished`, `carryOver`, the locks, `saveable`, `introScene`, audio, media pools, all the prose, and every plugin's content. It looks each condition, effect and command up in one table that says what it names, so a condition is checked the same wherever it sits, and then resolves each name against the game. It never throws on bad content. A game built by hand calls it in a test:

```ts
import { describe, expect, it } from 'vitest'
import { checkGame, startingState } from '@ifloom/engine'
import module from '../src/game.ts'

const { game } = module.build()

describe('the game', () => {
  it('has nothing wrong with it', () => {
    expect(checkGame(game, { probes: [{ name: 'start', state: startingState(game) }] }).problems).toEqual([])
  })
})
```

`loadGame` returns only problems, so a test that wants the warnings calls `checkGame(game)` on the loaded game.

### describeProblem

Returns a problem as one line, its `pack`, `where` and `what` joined with ` · `. Every parameter is in [`describeProblem`](/docs/0.1.0/api/engine#describeproblem).

```text
mod:sunday-market · scene market.stall · goes to unknown scene "market.closing"
```

## Checks

The checker reports each problem at a `where` that names what the problem is in. The checks on a condition, an effect and a command are the same wherever one sits, and are listed under [Conditions](#conditions), [Effects](#effects) and [Commands](#commands). The rest run where this table says:

| Key | Meaning |
|---|---|
| `scene <id>` | A data scene: `no prose for "…"` for a `{ prose }` block, `variants "…" has no lines` for a `variants` block and the variants its `image` names, the conditions on its blocks, a `variants` block's `gate`, each choice's `when`, `blocked`, `labels` and `effects`, and `two choices share the id "…"`. A [flowing scene](/docs/0.1.0/reference/flows#checks) adds its own checks. Also its `audio`, its `{ media }` blocks and `picture`, its `panel`, `unknown minigame "…"` for its `minigame`, and the [storylet](/docs/0.1.0/reference/storylets#checks) fields. |
| `action <id>` | Each of the content's [actions](/docs/0.1.0/reference/actions#checks): its `when`, `blocked`, `effects` and `command`, `spends unknown stat "…"` or `spends stat "…", which is derived and never written` for its `cost`, `an action's command can't be a choice`, and `an action's command can't be the action itself; give it the effects`. |
| `trigger <id>` | Its `when` and its `effects`. |
| `input <id>` | Its `when`, `a choice with no options`, and `min is above max`. |
| `minigame <id>` | `starts in unknown state "…"`, `no final state can be reached from its start, so it never ends`, `keys maps input "…", which no state's on uses`, `uses key "…", which is not in its kv` and `copies key "…", which is not in its kv`. See [minigames](/docs/0.1.0/reference/minigames#checks). |
| `minigame <id> state <state>` | Its `label`, `a timer needs ms above 0`, `a final state ends the minigame, so its after, on and always never run`, and for each transition `goes to unknown state "…"`, `to lists no states` and `the weight of "…" must be above 0`. A transition's `when` and `effects` are reported under `… <transition>`, and a final state's effects under `… final`. |
| `phrase <name>` | Each problem [phrases](/docs/0.1.0/reference/phrases#checks) lists, and each row's `when` and markup under `phrase <name> row <n>`. |
| `changes` | `stats names "…", which is no stat` for an id in [`changes.stats`](/docs/0.1.0/reference/changes#changesdef), and `stats must be a list of stat ids`. |
| `timer <id>` | `a timer needs ms above 0`, `two timers share this id`, and its `effects`. See [timers](/docs/0.1.0/reference/timers#checks). |
| `setting <id>` | `a choice with no options`, `min is above max`, `step must be above 0`, and a `default` the setting can't take, such as `default 9 is not between 0 and 5`. |
| `stat <id>` | `belongs to unknown kind "…"` for its `of`, `no game value named "…"` or `no plugin value named "…"` for a `max: { value }`, its `visible` and its `ui`, and each problem [stats](/docs/0.1.0/reference/stats#checks) lists for a [formula](/docs/0.1.0/reference/stats#formula) and [levels](/docs/0.1.0/reference/stats#statlevels). |
| `entity <kind>:<id>` | `unknown kind "…"`, `no <kind> stat named "…"`, `stat "…" is derived: it is worked out, never written`, `an entity id must not be a whole number`, what its `visible` names, its `image` file, and its [`at`](/docs/0.1.0/reference/entities#holder-and-placement), checked as a holder is. A unique thing starts with one holder, one of it, and `holders go round in a cycle: … → …` reports unique things that start inside each other. |
| `kind <id>` | What its `listed` and `flags` conditions name, with `'$'` as any one of the kind, and its `ui`. |
| `trait <id>` | `plugin "…" has no trait "…"`, for a trait id whose plugin the game has but doesn't declare it. See [traits](#traits). |
| `trait <id> on <kind>:<id>` | `unknown entity "…"` for a row of the `traits` table that names an entity nobody declares, and what the plugin's trait finds in the data. |
| `finished` | The game's [`finished`](/docs/0.1.0/how-to/offer-new-game-plus) condition. |
| `carryOver` | `unknown stat "…"` and `stat "…" belongs to <kind>, not the player` in [`carryOver`](/docs/0.1.0/how-to/offer-new-game-plus), and for each thing in `held`, `unknown entity "…": name one as "kind:id"` or `unknown kind "…"`. |
| `lock <id>` | The `when` of each of the content's [locks](/docs/0.1.0/reference/locks#lock), by its `id`, or by its place in the list from 0 for one with none. |
| `introScene` | `unknown scene "…"`, when the game opens on a scene it doesn't have. |
| `plugin <id>` | `a plugin id is letters, digits and "-" only`, `two plugins share this id`, `trait "…" must be named "<id>/" and a name` and `two traits share the id "…"`. |
| `data <plugin>` | `the game has no plugin named "<plugin>"`, for content for a plugin the game wasn't built with. |
| `<list> <id>` | What a plugin's content names, from its [references](#reference), and what its own `check` finds. |
| `track <id>`, `channel <id>`, `audio`, `audio default` | The game's [audio](/docs/0.1.0/reference/audio#checks). |
| `pool <id>` | A [pool](/docs/0.1.0/reference/media#checks) that is empty, a file with no `src`, or a file's weight. |
| `prose <key>` | The tracks `[[sound:id]]` and `[[voice:id]]` name, and the pools and flags in picture and video markup, in every line of prose. |
| `version` | `version must be a whole number, 1 or more`, for the base's [`version`](/docs/0.1.0/reference/content#gamebase). |
| `migration <n>` | `a step is keyed by the version it upgrades from, 1 to …`, for a [migration](/docs/0.1.0/upgrading/migrate-your-saves) step keyed outside 1 to `version - 1`. A game with no `version` has no room for steps, so the checker reports any step. |
| `<list> <id>` for `scene`, `storyline`, `action`, `stat`, `kind`, `entity`, `trigger`, `input`, `setting`, `minigame` | `two <list>s share this id`. Only a game built without `loadGame` can have these, since `loadGame` merges by id. |

`loadGame` adds problems of its own about the content and packs themselves, such as a key declared twice ([`loadGame`'s checks](/docs/0.1.0/reference/content#checks)).

A stat is the player's or belongs to a [kind](/docs/0.1.0/reference/entities#kinddef), and every `stat` and `level` condition and `stat` effect has to name it on its owner:

| Problem | Cause |
|---|---|
| `stat "…" belongs to <kind>: say whose with "of"` | A kind's stat is named with no `of`, as if it were the player's. |
| `stat "…" is the player's, not <ref>'s` | The player's stat is named with an `of`. |
| `stat "…" belongs to <kind>, not <other>` | A stat is named on an entity of another kind. |

A [holder](/docs/0.1.0/reference/glossary#holder) that content names has to be one that can hold things, `'player'`, `'you'`, `'$'` or an entity of a [unique](/docs/0.1.0/reference/entities#unique) kind:

| Problem | Cause |
|---|---|
| `unknown holder "…": a holder is "player", "you" or a unique entity` | The name is no holder at all, such as `'pal'`. |
| `unknown kind "…"` | The entity is of a kind nobody declares. |
| `"…" can't hold things: its kind "…" isn't unique` | The entity's kind stacks, such as `'food:apple'`. |
| `"…" can't hold itself` | A `move`'s `to` is the thing it moves. |
| `"you" is already whoever is played: …` | A `you` effect's `to` is `'you'`. |

A [`Reason`](/docs/0.1.0/reference/actions#reason) written by key, `{ string: 'shop/closed' }`, in a `blocked` entry or a `once`, has to name a line in the game's strings, a plugin's or the engine's, or the checker reports `no string named "…"` where it's written.

A call to a plugin the game wasn't built with isn't reported when one of the game's plugins lists that plugin in its [`cooperates`](/docs/0.1.0/reference/plugin-queries). In play the condition is false, the effect does nothing and the command is refused. A call to a plugin nobody cooperates with is reported.

### Conditions

The checker walks every condition, inside `all`, `any`, `not` and a `count`'s `where` too.

| Problem | Cause |
|---|---|
| `"…" takes its arguments as an object, …` | A [plugin call](/docs/0.1.0/reference/custom#plugincall) written by its full name whose value is neither an object nor `true`, such as `{ 'places/at': ['cafe'] }`. It's asked with no arguments. An effect or a command written this way gets the same problem. |
| `a condition asks one thing, but this one has … keys that each say what it asks: …` | One object has two keys that each say what it asks, such as `{ kv, stat }`. It never holds, and the checker doesn't look inside it. Combine them with `all`. |
| `a condition needs one key that says what it asks, such as kv or stat, or a call by name; …` | The object has no such key, such as `{}` or `{ gte: 3 }`. It never holds. |
| `unknown storyline "…"` | `storyline`, or a `kv` condition's `of: 'storyline:…'`, names a storyline nobody declares. |
| `unknown stat "…"` | `stat` or `level` names a stat nobody declares. |
| `unknown kind "…"` | `count`, `entity`, or the `of` of a `stat`, `level` or `kv`, names a kind nobody declares. `'$'`, `'you'`, `'player'`, `'minigame'` and `'storyline:…'` name no kind. |
| `plugin "…" has no trait "…"` | A `count`'s [`Select`](/docs/0.1.0/reference/entities#select) names a `trait` its plugin doesn't declare. |
| `gated on unknown scene "…"` | `seen`, `since` or `scene` names a scene that doesn't exist. |
| `gated on a choice in unknown scene "…"` | A `chose` key, or a `since` naming a `scene#choice`, names a scene that doesn't exist. |
| `gated on unknown choice "…"` | A `chose` or `since` key names a choice its data scene doesn't have. |
| `no game condition named "…"`, `no plugin condition named "…"` | A call names a condition nobody declares, in the game's `rules` for a `game/` name or else in the plugin its name starts with. It adds `; the game has no plugin "…"` when the game lacks that plugin, and a hint to write `game/` in front for a name with no `/`. |
| `minigame key "…" is not in any minigame's kv` | A `kv` condition with `of: 'minigame'` names a key no [minigame](/docs/0.1.0/reference/minigames) declares. |
| `unknown timer "…"` | A `timer` condition names a timer the game doesn't declare. |
| `unknown setting "…"` | A `setting` condition names a setting the game doesn't declare. |
| `setting "…" is a ui setting; conditions read only play settings` | A `setting` condition names a `ui` [setting](/docs/0.1.0/reference/settings), which the state never holds. |
| `<value> for setting "…" is not …` | An `is` the setting can't take: not `true` or `false` for a toggle, not an option of a choice, or outside a range's bounds or steps. |

A call to a plugin's condition is also checked for what the plugin's [references](#reference) say it names. Stat owners and holders are checked as [the tables above](#checks) list.

### Effects

| Problem | Cause |
|---|---|
| `an effect does one thing, but this one has … keys that each say what it does: …` | One object has two keys that each say what it does, such as `{ stat, kv }`. It does nothing. |
| `an effect needs one key that says what it does, such as stat or kv, or a call by name; …` | The object has no such key, such as `{}` or `{ by: 2 }`. It does nothing. |
| `no game effect named "…"`, `no plugin effect named "…"` | A call names an effect nobody declares, worded as for a condition. |
| `unknown stat "…"` | A `stat` effect, or a `roll`'s `plus: { stat }`, names a stat nobody declares. |
| `stat "…" is derived: it is worked out, never written` | A `stat` effect names a stat with a [formula](/docs/0.1.0/reference/stats#formula), or a `create` gives one a value. |
| `no <kind> stat named "…"` | A `create` gives its entity a stat in `with` that isn't declared `of` its kind. |
| `unknown kind "…"` | A `create` or `each` names a kind nobody declares, or a `stat`, `kv`, `entity`, `remove` or `move` effect names an entity of one. |
| `unknown entity "…" to be like: name one the game declares` | A `create`'s `like` names an entity nobody declares. |
| `like names a <kind>, not a <of>` | A `create`'s `like` is of another kind than the one it creates. |
| `plugin "…" has no trait "…"` | An `each`'s `trait`, or a trait in a `create`'s `with.traits`, isn't declared by its plugin. |
| `unknown storyline "…"` | A `kv` effect's `of: 'storyline:…'` or a `closeStoryline` effect names a storyline nobody declares. |
| `goes to unknown scene "…"` | A `scene` effect, or a [storylet](/docs/0.1.0/reference/storylets) draw's `otherwise`, names a scene that doesn't exist. |
| `draws from "…", but no scene is drawn from it` | A storylet draw, `{ scene: { from } }`, names a set no scene's `drawnFrom` includes. |
| `unknown minigame "…"` | A `minigame` effect names a minigame the game doesn't declare. |
| `minigame key "…" is not in any minigame's kv` | A `kv` effect with `of: 'minigame'` names a key no minigame declares. |
| `dice "…" is not dice notation such as "2d6+1", "1d20" or "d100"` | A [`roll`](/docs/0.1.0/reference/rolls) effect's `dice` isn't notation. It rolls nothing. |
| `dice have … sides; a die needs at least 2`, `… dice; a roll throws 1 to 100` | A `roll` effect's dice are out of range, in notation or as `{ count, sides }`. |
| `roll key "…" must be letters, digits and _, not starting with a digit, so {{key}} can show it` | The kv key a `roll` effect names isn't a plain name. |
| `roll plus: …`, `roll against: …` | A `roll` effect's `plus` or `against` isn't an amount the engine can read. |
| `an amount is a number, a stat id, a formula, { stat }, { kv }, { value } or { count }; …` | An [`Amount`](/docs/0.1.0/reference/amounts) has a shape the engine can't read. |
| `unknown timer "…"` | A `timer` effect names a timer the game doesn't declare. It does nothing. |
| `a timer’s to must be a number of milliseconds above 0, or null to stop it`, `a timer’s by must be a number of milliseconds` | A `timer` effect's `to` or `by` is out of range. |
| `jumps to point "…", but a jump only works as a choice's effect in the scene that has that point` | A [`point`](/docs/0.1.0/reference/effects#point) effect sits anywhere but a data scene's choice. In a choice, the scene's [flow checks](/docs/0.1.0/reference/flows#checks) read it. |

The checker also lists a `notify`'s `image` in [`files`](#fileref), checks an `audio` or `sound` effect as [audio](/docs/0.1.0/reference/audio#checks), a `panel` effect's `with` as each plugin's references say, and a call to a plugin's effect for what its references name. Stat owners and holders are checked as [the tables above](#checks) list, for an `entity` effect's `at`, a `move`'s `from` and `to`, a `create`'s `at`, an `each`'s `at` and the entity a `you` effect names.

Inside an `each`, the checker reads `where` as a condition and `effects` as effects, with `'$'` standing for one of its kind. A problem from inside starts `in each <kind>: `, such as `in each staff: stat "quality" belongs to dish, not staff`.

### Commands

| Problem | Cause |
|---|---|
| `opens unknown scene "…"` | A `scene` command names a scene that doesn't exist. |
| `unknown action "…"` | An `action` command names an action the game's content doesn't declare. A plugin's action, such as `places/coffee`, isn't checked, since the plugin answers for it in play. |
| `unknown input "…"` | An `input` command names an input the game doesn't declare. |
| `no game command named "…"`, `no plugin command named "…"` | A call names a command nobody declares. The checker then checks what the plugin's references name. |
| `unknown command type "…"` | A command's `type` is none the engine has. In play it's refused with `This game does not do that.` |

A `setting` command is checked as a `{ setting, is }` condition is. `start`, `newGame`, `choose`, `leave`, `dismiss`, `tick`, `minigame` and `closePanel` name nothing to check. A choice's [`command`](/docs/0.1.0/reference/scenes#choice) is checked as any command is, under `choice <id>:`, and `choice …: a choice's command can't be another choice; put the effects on this one` reports one that is `choose`.

### prose

The checker reads every line of prose and every block of words for its speakers, its inline actions and tooltips, and its tokens. A spoken line written under an id, `@ava: "…"` in [prose](/docs/0.1.0/reference/prose#speech) or a [`say()`](/docs/0.1.0/reference/flows#say) block's speaker, has to name an entity, and `'you'` and `'player'` always pass:

| Problem | Cause |
|---|---|
| `a spoken line is under "…", which names no entity` | No entity has that id or reference. |
| `a spoken line is under "…", which more than one kind has: name it as "kind:…"` | Two kinds share the bare id and neither is `character`. Write the full reference, such as `@staff:jo`. |

The checker reads [inline actions and tooltips](/docs/0.1.0/reference/prose#inline-actions-and-tooltips) against the choices of the scene whose body names them, or a location's body against its actions and the game's:

| Problem | Cause |
|---|---|
| `[[act:…]] names no choice or action offered here` | The id is none of the scene's choices or the room's buttons. |
| `[[act:…]] is in one line twice; only the first is drawn as an action` | One prose line names the same id twice. |
| `[[act:…]] is in two blocks that can show together; only the first is drawn as an action` | Two blocks name the id, and one has no `when`. Members of one variants list are drawn one at a time, so they can each name it. |
| `[[act]] needs the id of a choice: [[act:id]] or [[act:id\|words]]` | The markup is `[[act:]]` or `[[act:\|words]]`. |
| `[[act:…\|]] has no words; leave out the "\|" to use the choice's label` | The markup has an empty `\|`. |
| `[[tip]] needs a prose key: [[tip:key\|words]]` | The markup is `[[tip:\|words]]`. |
| `[[tip:…]] needs the words to show: [[tip:…\|words]]` | A tooltip has no words, so it shows as written. |
| `[[tip:…]]: no prose for "…"` | The tooltip's key has no prose. |
| `[[act:…]] or [[tip:…]] is not closed with "]]", or is missing its ":"` | The checker can't find the markup's end. |
| `[[act]] and [[tip]] are shown as written in a "> " line; use them in narration or a spoken line` | A thought holds inline markup. |

The checker reads the [tokens](/docs/0.1.0/reference/prose#tokens) in every line of prose, every block of words and every phrase's row, and reports them where the line is:

| Problem | Cause |
|---|---|
| `{{…}} names no phrase, no value in rules.values and no kv key the content starts or sets; is the phrase's name right?` | A bare name with a group in it, such as `{{outfit.verdit}}`, names none of these. A key counts when content starts it, an input writes it, an effect sets it with no `of`, a roll keeps its total under it, or a minigame's final state copies to it. A plain name such as `{{friend}}` isn't checked, since a start command or the game's code may set it. |
| `{{…}} names no value "…"` | A plugin's token, `{{plugin/name}}`, names a value no plugin of the game has. |
| `mood.word takes who` | A phrase's token leaves out an argument the phrase declares in [`args`](/docs/0.1.0/reference/phrases#args). |
| `mood.word takes who, not whom` | A phrase's token passes an argument the phrase doesn't take. A phrase with no `args` gives `weather takes no arguments, not who`. |

One token gives a warning instead, in `warnings`. `{{…}} may be unset, and then prints nothing; give it words to show until then, as {{…|…}}` warns about a bare token with no fallback that names a kv key the game's `kv` doesn't start, or a phrase with no row that always fits. A line whose block shows only under a `kv` or `roll` condition on that key, such as `when: { kv: 'playerName' }`, isn't warned about.

### traits

The checker checks every declared entity's [traits](/docs/0.1.0/reference/entities#traittable) once the kind's default, the entity's own and any table row are combined. The check depends on whose trait it is:

- **A trait of a plugin the game has.** The plugin has to declare it, or the checker reports `plugin "laundry" has no trait "laundry/washabel"`. The plugin's `check` reads the data on each entity that has the trait, and the checker resolves what its `references` name, at `trait laundry/washable on clothing:scarf`.
- **A trait of a plugin the game doesn't have.** It passes unchecked, as content for a cooperating plugin does.
- **The game's own trait**, with no `/` in its id. It isn't checked, since no plugin says what it holds.

A row of the `traits` table for an entity nobody declares is reported whoever's trait it is, as `unknown entity "clothing:sock"`. A problem from a row is pinned on the content or pack the row came from, and one from an entity's own data on the content that declares the entity.

### words

The checker reads a translation's [words table](/docs/0.1.0/reference/words) against the fields the game has:

| Problem | Cause |
|---|---|
| `names no field the game has (translatableFields lists every key)` | A pack's key, at `words <key>`, names no field. It's a typo, or a block whose words changed so its hash key moved on. |
| `two fields with different words share the words key "…"; give a block of words an id, or rename one` | Two blocks of words in one scene share an `id`, or two ids join into one key. |

## Caveats

- The checker doesn't run the game's own code. A [macro](/docs/0.1.0/reference/custom#macros) that returns a broken effect, or a `rules.onTurn` that applies one, shows only in play.
- A game built by hand has no content files, so `checkGame` can't report a key declared twice or a key content can't hold. Only `loadGame` reports those.
- The checker reads only the tokens [prose](#prose) lists. A plain `{{breadPrice}}` that names nothing stays on screen as written, so you see it in play.
- A probe renders every scene in its state, even one no route reaches, so a value that throws for an impossible state fails the check.
