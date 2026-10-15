# Loading and mods

A game's content can arrive as several **packs** — the game's own, then any mods — merged in order into one game. The game's content is just the first pack; nothing about it is special. The loader also checks the result and reports every broken reference with the pack that introduced it.

```ts
import { loadGame, describeProblem, SCHEMA, type Pack, type Patch, type Problem, type Loaded } from '@ifloom/engine'
```

Packs can be bundled into the game when it is built, or come from mod files the player adds to a built game, which the game loads over its own pack at start-up. See [Mods](/reference/mods) for the file, the store that keeps it, and how a game loads it.

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
  strings?: Record<string, string>
  prose?: Record<string, string>
  variants?: Record<string, string[]>
  custom?: Custom
  patches?: Patch[]
  data?: Record<string, Record<string, readonly PluginEntry[]>>
}
```

| Field | Merged how |
|---|---|
| `id` | Names the pack in problems: `'core'`, `'mod:longer-market-days'`. |
| `schema` | Must equal `SCHEMA`, or the whole pack is skipped with a problem. |
| `scenes`, `items`, `storylines`, `activities`, `stats`, `kinds`, `collections`, `triggers`, `inputs` | By `id`. A later pack's entry **replaces** an earlier one with the same id, whole — fields are not merged. Order is first appearance. `kinds`, `collections`, `triggers` and `inputs` given on `loadGame`'s `base` come before every pack's. |
| `entities` | By kind and id, `'staff:ana'`: two kinds may each have an entity with the same id. A later pack's entity **replaces** an earlier one with the same kind and id, whole. Order is first appearance, and the base's come first. See [Entities](/reference/entities). |
| `strings` | By key; later wins, over the base's `strings`. A pack of nothing but `strings` is a translation. See [Strings](/reference/strings#overriding). |
| `prose` | By key; later wins. |
| `variants` | By variants name; later packs **append** members. |
| `custom` | [Custom functions](/reference/custom), kind by kind (`conditions`, `effects`, `values`, `panels`), by name: a later pack's entry **replaces** an earlier one's of the same kind and name; the rest are kept. |
| `patches` | Applied right away, in order — see [Patches](#patches). |
| `data` | Content for the game's [plugins](/reference/plugins#content-and-checks), by plugin id and then list name: `{ quests: { quests: [...] } }`. Each list merges by entry `id`, as scenes do: a later pack's entry **replaces** an earlier one with the same id, whole. The result is at `game.data.quests.quests`. A game's locations and people are content of this kind: `data.places.locations` for the [places plugin](/plugins/places#in-a-pack), `data.cast.characters` for the [cast](/plugins/cast#in-a-pack). |

### How packs merge

Everything a pack declares is keyed — by id, by prose key, by variants name, by custom function name — and a later pack wins on a key it repeats. So a mod that wants to change one custom condition ships just that one:

```ts
const longerMarket: Pack = {
  id: 'mod:longer-market-days',
  schema: SCHEMA,
  custom: { conditions: { marketDay: (state) => [5, 6].includes(state.turn % 7) } },
}
```

The game's other custom conditions, and its effects, values and panels, are untouched.

## SCHEMA

```ts
const SCHEMA = 4
```

The content format this engine reads. A pack written for any other number is refused rather than half-loaded: [`loadGame`](#loadgame) skips it with the problem `written for schema 3, this engine reads 4`, and a [mod](/reference/mods) is refused when it is added.

Schema 2 is the content without the engine's clock: no `hours` on a location, no `days` or `periods` in a schedule block, no `steps` in an activity's cost, no `time` effect or `{ type: 'sleep' }` command, and no `period`, `weekday` or `day` condition. Their places are taken by `locked`, a schedule block's `when`, and the [calendar plugin](/plugins/calendar)'s conditions, effects and commands. A pack or mod written for schema 1 has to be rewritten that way.

Schema 3 is the content without the engine's places: no `locations` in a pack, no `startLocation`, no `{ at }` condition, no `at` on an activity, no `{ type: 'travel' }` command and no `move` effect. Their places are taken by the [places plugin](/plugins/places): locations go in `data.places.locations`, the start in `places({ start })`, and content writes its [`places/at`](/plugins/places#conditions) condition, [`onlyAt`](/plugins/places#helpers) requirement, [`places/go`](/plugins/places#commands) command and [`places/move`](/plugins/places#effects) effect. A pack or mod written for schema 2 is refused; rewrite it that way and raise its `schema` to 3.

Schema 4 is the content without the engine's characters: no `characters` in a pack, no `{ type: 'talk' }` or `{ type: 'call' }` command, no `{ kind: 'storyline', standing, rapport }` effect, no `{ characterHere }` or `{ characterAt }` condition, and no `standing` or `rapport` in a `{ storyline }` condition, which now asks only whether the storyline is [open](/reference/conditions#storyline). Their places are taken by the [cast plugin](/plugins/cast): characters go in `data.cast.characters`, with `talk` and `call` on each, content writes its [`cast/talk`](/plugins/cast#commands) and `cast/call` commands and [`cast/here`](/plugins/cast#conditions) and `cast/at` conditions, and a relationship is a [stat](/reference/stats#entity-stats) declared `of: 'character'`, changed with `{ kind: 'stat', key: 'friendship', by: 5, of: person('rosa') }`. A pack or mod written for schema 3 is refused; rewrite it that way and raise its `schema` to 4.

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

Merges `packs` in order, lays the result over `base` (the game's `id`, `title`, `introScene`, `plugins`, `rules` and so on), builds `game.prose` from the packs' prose and variants, and checks it. The game it returns is ready to run: data scenes render through the engine's [default runtime](/reference/scenes#defaultruntime) with no further wiring.

`base` needs only `id` and `title`. Leave out `introScene` for a game that opens on its idle screen (with the [places plugin](/plugins/places), the room it starts in); a linear story passes `{ id, title, introScene }`. See [Shapes of game](/guide/shapes).

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'

const { game, problems } = loadGame(
  [
    { id: 'core', schema: SCHEMA, storylines, activities, items, scenes, prose: WORDS, variants: VARIANTS, data: { places: { locations }, cast: { characters } } },
    { id: 'mod:sunday-market', schema: SCHEMA, data: { cast: { characters: [marketTrader] } }, prose: { 'market.stall': 'Sunday, and the stalls run the length of the square.' } },
  ],
  { id: 'small-town', title: 'Small Town', introScene: 'intro.wake', plugins: [calendar(), places({ start: 'house' }), cast()], rules },
)
for (const problem of problems) console.warn(describeProblem(problem))
```

**Gotchas:**
- `game.scenes` holds `DataScene`s exactly as declared, beside any hand-written `Scene`s. The engine bakes a data scene into a `Scene` the first time [`sceneById`](/reference/game#scenebyid) asks for it; you do not wrap them yourself.
- `game.prose` is a [`proseStore`](/reference/prose#prosestore-1) over the merged prose and variants, replacing any `prose` on `base`. `Loaded.prose` and `Loaded.variants` are the same merged records, for tools that want the raw text.
- `game.packs` lists the packs' ids in order. [Saves](/reference/saves#savemeta) record it, so loading a save made with a mod the player has since removed or turned off names that mod. A [mod file](/reference/mods)'s pack is always `mod:<id>`.
- Custom functions can sit on `base` or in packs. The base game's come first, and each pack lays its own over them by name, kind by kind.
- [Plugins](/reference/plugins) go on `base`, as `plugins`, and only there: a pack cannot add one. Plugin content can sit in `base.data` and in packs' `data`; the base's comes first.
- `kinds`, `entities`, `collections`, `triggers` and `inputs` can sit on `base` as well as in packs. The base's come first, reported as from `base`, and each pack lays its own over them by id (entities by kind and id).
- `loadGame` never throws on bad content. It returns problems; deciding whether to refuse to start is up to you.

## Patches

```ts
type Patch =
  | { scene: string; addChoice: Choice; before?: string }
  | { scene: string; dropChoice: string }
  | { scene: string; replaceChoice: Choice }
```

A small change to a scene an earlier pack declared, without replacing the whole scene: add a choice (at the end, or before the choice with id `before`), drop one by id, or replace the one with the same id.

```ts
const mod: Pack = {
  id: 'mod:sunday-market',
  schema: SCHEMA,
  prose: { 'market.stall#haggle': 'Try to haggle' },
  patches: [
    { scene: 'market.stall', addChoice: { id: 'haggle', effects: [{ kind: 'stat', key: 'coins', by: 1 }] }, before: 'leave' },
  ],
}
```

**Gotchas:**
- Only a [`DataScene`](/reference/scenes#datascene) can be patched. A hand-written `Scene` is a function and gives a problem.
- A patch applies to the scene as it stands when its pack is read. A later pack that redeclares that scene replaces it, patch and all.
- `before` naming a choice that is not there adds at the end, silently. `replaceChoice` with no matching id is a problem.

## The checks

After merging, every `DataScene` is checked. A problem is recorded, against the pack that last declared or patched the scene, with `where` as `scene <id>`, when it:

- names prose that is not written — its `text` blocks, each choice's label key (explicit or the default `scene#choice`), and every `labels` key;
- draws from a set of variants with no members — `variants` blocks and the variants their `art` names;
- names a custom effect the game does not declare (`no custom effect named "…"`), as `{ custom }` or as a [short plugin call](/reference/custom#plugincall);
- has a choice effect with any other problem an effect list can have, as for a trigger: an undeclared collection (`unknown collection "…"`), a `notify` or `collect` whose `text` has no prose, an unknown kind or a stat named on the wrong owner, and whatever a plugin's [`argProblems`](/reference/plugins#checking-calls) finds in a call to its effect;
- has a `scene` effect going to a scene that does not exist;
- has a condition — on a block, a `variants` block's `gate`, a choice's `when`, `blocked` or `labels` — naming an unknown storyline, item, stat (`stat` / `tier`), collection (`collection`), kind (`unknown kind "…"`, from a `count`, an `entity` or an `of`; a `count`'s `where` is looked inside) or scene (`seen` / `since` / `scene`), a `chose` key whose scene does not exist (`gated on a choice in unknown scene "…"`) or whose data scene has no such choice (`gated on unknown choice "…"`), or a custom condition the game does not declare (`no custom condition named "…"`), as `{ custom }` or in short.

Activities, triggers, inputs and the game's own actions are data too, and are checked the same way, against the pack that last declared them:

| Where | Checked |
|---|---|
| `activity <id>` | Each requirement's `when` in `requires`; every custom effect in `effects` has to be declared (`no custom effect named "…"`); and every other problem in its `effects`, as for a trigger. |
| `trigger <id>` | Its `when`, and its `effects`: a [kind](/reference/entities) the game does not declare (`unknown kind "…"`) — a `create`'s or an `each`'s `of`, or the kind in the `of` of a `stat`, `setStat`, `flag` or `remove` effect (`'$'` names none) — an `each`'s `where` and `effects`, checked as any other condition and effects, a `collect` or `discard` into a collection the game does not declare (`unknown collection "…"`), a `notify` or `collect` whose `text` has no prose (`no prose for "…"`), a `scene` effect going to a scene that does not exist (`goes to unknown scene "…"`), and a custom effect nobody declares (`no custom effect named "…"`). |
| `stat <id>` | `belongs to unknown kind "…"`: its `of` names a kind the game does not declare. |
| `entity <kind>:<id>` | `unknown kind "…"`: its `of` names a kind the game does not declare. `no <kind> stat named "…"`: its `stats` sets a stat that is not declared `of` its kind (the player's included). `an entity id must not be a whole number`: see [Ids](/reference/entities#ids). |
| `input <id>` | Its `when`; `a choice with no options`; `min is above max`. |
| `action <id>` | The game's own [`actions`](/reference/game#game), offered everywhere: each one's `when` and `blocked`, and its `command`: a scene that does not exist (`opens unknown scene "…"`), an unknown activity or item, a `{ type: 'custom' }` command no plugin has (`no plugin command named "…"`), and whatever the plugin's `argProblems` finds in it. They come with `base`, so the pack is reported as `base`. |

A condition there is held to the same rules as in a scene: every storyline, item, stat, collection, kind, scene and choice it names has to exist, and every custom condition has to be declared, by the game or by one of its plugins. A custom effect counts as declared when the game or a plugin has it.

**Absent partners.** A condition or effect named after a plugin the game was not built with is not reported when one of the game's plugins lists that plugin in its [`cooperates`](/reference/plugins#cooperates): it is simply not there, so the condition is false and the effect does nothing. [`validatePack`](/reference/game#validatepack) lets the long-form `{ kind: 'custom' }` effect through on the same terms. A plugin nobody cooperates with is still reported.

### Plugins and their content

| Where | Problem |
|---|---|
| `plugin <id>` | `a plugin id is letters, digits and "-" only`; `two plugins share this id`. Reported against `base`. |
| `data <plugin>` | `the game has no plugin named "<plugin>"`: a pack carries content for a plugin the game was not built with. That content is skipped. |
| `<list> <id>` | Whatever the plugin's own [`check`](/reference/plugins#content-and-checks) finds in its content, such as `quests bread · stage buy: unknown item "loaf"`. Reported against the pack that entry came from. |

A plugin's `check` is lent the loader's own checks as [`CheckTools`](/reference/plugins#checktools) — `conditionProblems`, `blockProblems` and `commandProblems` — so its problems read like the loader's.

**Calls a plugin checks.** A plugin with [`argProblems`](/reference/plugins#checking-calls) is asked about what content passes to its conditions, effects and commands, and its answers are reported as the call's own problems, where the call is: every condition checked above (and in a plugin's `check`), every effect list it checks (data scene choices, activities, triggers, and inside an `each`), the game's own `actions`' commands, and every command a plugin's `check` passes to `commandProblems`.

```ts
// town · activity ask · nobody sells "fish"
```

```ts
// mod:night-market · locations yard · no prose for "yard/stalls"
// mod:night-market · characters trader · unknown storyline "trader"   (the cast's check)
// mod:night-market · activity browse · unknown stat "stamina"
// mod:night-market · trigger parcel · unknown collection "drawer"
// mod:night-market · input stall · a choice with no options
// mod:new-menu · entity dish:7 · an entity id must not be a whole number
// mod:new-menu · entity dish:pie · no dish stat named "coins"
```

Kinds and stat owners are checked wherever content names them — triggers, data scene choices, activities, and conditions everywhere — and inside an `each`'s `where` and `effects`, where `'$'` stands for one of its kind and the problem starts `in each <kind>: `:

| Problem | Means |
|---|---|
| `unknown kind "…"` | A `create`, `each`, `remove`, `count`, `entity` or `of` names a kind the game does not declare. |
| `stat "…" belongs to <kind>: say whose with "of"` | A kind's stat, named with no `of`, as if it were the player's. |
| `stat "…" is the player's, not <ref>'s` | The player's stat, named with an `of`. |
| `stat "…" belongs to <kind>, not <other>` | A stat named on an entity of another kind. |

Not checked here: hand-written `Scene`s, variants members' own prose, `panelData` names, and <code v-pre>{{v:…}}</code> values. For ids the rest of the game points at — item uses, the game's own actions — use [`validatePack`](/reference/game#validatepack); a character's home, schedule and talk scenes are checked by the [cast](/plugins/cast#checks). A place's exits, body and actions are checked by the [places plugin](/plugins/places#checks), and a place a condition, effect or command names by its `argProblems`, as `unknown location "…"`.

## Problem and describeProblem

```ts
type Problem = { pack: string; where: string; what: string }

function describeProblem(problem: Problem): string
```

`describeProblem` joins the three with ` · `, so a mod author reads one line, not a stack trace:

```text
mod:sunday-market · scene market.stall · goes to unknown scene "market.closing"
```
