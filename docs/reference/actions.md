# Actions

An action is one thing the player can do standing in a room: buy a coffee, browse the stalls, read in the library. Each is an `ActivityDef` in `game.activities`, run by the [`activity`](/reference/commands#activity) command and shown as a button through an [`ActionDef`](#actiondef).

```ts
import { effectsOf, need, warningOf, whyNot, type ActivityDef } from '@ifloom/engine'
```

The engine keeps no time of day. An action that takes time says so in its `effects`, with the [calendar plugin](/plugins/calendar)'s [`pass`](/plugins/calendar#effects): `effects: [pass(2), ...]`.

## ActivityDef

```ts
type ActivityDef = {
  id: string
  cost?: ActivityCost
  requires?: readonly Requirement[]
  effects?: readonly EffectRef[]
}
```

| Field | What it does |
|---|---|
| `id` | Unique among activities. |
| `cost` | What it spends. [`ActivityCost`](#activitycost). |
| `requires` | [Conditions](/reference/conditions) that must hold, each with the line the player reads when it does not. [`Requirement`](#requirement). |
| `effects` | [Effects](/reference/effects) applied in order after the cost is paid. A `{ custom: name }` entry is a [custom effect](/reference/custom#effects), for one that has to be worked out; a plugin's effect can be written [in short](/reference/custom#plugincall). |

```ts
import { onlyAt } from '@ifloom/plugin-places'

const coffee: ActivityDef = {
  id: 'coffee',
  cost: { stats: { coins: 3 }, reasons: { coins: 'Not even for a small one.' } },
  requires: [onlyAt(['cafe']), need('You are buzzing already.', { stat: 'energy', lt: 90 })],
  effects: [{ kind: 'stat', key: 'energy', by: 20 }, { custom: 'countCoffee' }],
}

// on the game
custom: {
  effects: {
    countCoffee: (state) => [{ kind: 'flag', key: 'coffees', value: Number(state.flags.coffees ?? 0) + 1 }],
  },
}
```

`coins` and `energy` here are stats the game declares; the engine has none of its own. See [Stats](/reference/stats).

An activity runs anywhere unless a requirement says otherwise. The engine keeps no places: "only in the café" is the [places plugin](/plugins/places)'s [`onlyAt`](/plugins/places#helpers), a requirement whose reason is `Not here.` unless you give one.

**Gotchas.**
- A custom effect sees the state **before** the cost was paid.
- [`loadGame`](/reference/loader#the-checks) checks every id in `requires`, and that every custom effect is declared by the game or a [plugin](/reference/plugins). [`validatePack`](/reference/game#validatepack) checks the plain effects. Neither looks inside a custom effect, and an undeclared one adds nothing.
- The engine adds no button of its own. To let the player wait in any room, declare a `wait` activity and offer it from the game's [`actions`](/reference/game#game):

```ts
import { pass } from '@ifloom/plugin-calendar'

activities: [{ id: 'wait', effects: [pass(1)] }]
actions: [{ id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } }]
```

## ActivityCost

```ts
type ActivityCost = {
  stats?: Record<string, number>
  reasons?: Record<string, string>
}
```

| Field | What it does |
|---|---|
| `stats` | [Stats](/reference/stats) spent, by id: `{ coins: 3, energy: 10 }`. The activity is refused if the player has less of any of them. Write them in the order the button should list them. |
| `reasons` | Refusal lines by stat id, for when this activity's voice beats the stat's own. Default: the stat's [`lacking`](/reference/stats#lackingline) line. |

Costs show on the button before it is pressed, as a [`Price`](#price).

**Gotcha:** an amount of 0 or less is never checked and never shown. A negative amount is not a way to pay the player — put a [`stat` effect](/reference/effects#stat) in `effects`.

## Requirement

```ts
type Requirement = {
  reason: string
  when: Condition
}
```

One thing that must hold for the activity to run: it is met while `when` [holds](/reference/conditions). `reason` is both the refusal and the button's disabled text. Requirements are checked in order; the first that fails is the one the player reads.

The `requires` list is the only place an activity's availability is written down. The reducer refuses on it and the view greys the button out with it, so the two cannot disagree.

### need

```ts
function need(reason: string, when: Condition): Requirement
```

Shorthand for `{ reason, when }`.

```ts
import { weekday } from '@ifloom/plugin-calendar'

requires: [
  need('The café is shut on Sundays.', { not: weekday(6) }),
  need('You need a library card.', { item: 'libraryCard' }),
]
```

A test that has to be worked out from several values is a [custom condition](/reference/custom#conditions): `need('Not on market day.', { not: { custom: 'marketDay' } })`.

## activityById

```ts
function activityById(game: Game, id: string): ActivityDef | undefined
```

## activityBlocked

```ts
function activityBlocked(state: GameState, game: Game, activity: ActivityDef): string | undefined
```

Why the player cannot do this right now, or `undefined` if they can. Checked in the order the player would notice, first failure wins:

1. A scene is open: `Finish this first.`
2. A [lock](/reference/locks) stops `{ type: 'activity', id }`: the lock's `reason`.
3. Each requirement in `requires`, in order: its `reason` (the places plugin's [`onlyAt`](/plugins/places#helpers) is one: `Not here.`).
4. Each stat in `cost.stats`, in the order written, that the player has less of than the cost: `cost.reasons[id]`, or the stat's [`lackingLine`](/reference/stats#lackingline) — its `lacking` with `{n}` as the amount, or `Not enough <label>.`

The [`activity`](/reference/commands#activity) command refuses with exactly this line, and the view uses it as the button's disabled text. The engine's own lines here (`finishFirst`, `notEnough`) can be reworded in the [strings table](/reference/strings#refusals); a lock's and a requirement's `reason` are already the game's.

**Gotcha.** A plugin guard's soft refusal is not in this list. An activity a plugin warns against — the [calendar](/plugins/calendar#the-guard)'s `That would run past dawn.`, say — is not *blocked*: the button stays pressable with the line as its `warning`, and the command is refused with it. See [`warningOf`](#warningof).

## payCost

```ts
function payCost(state: GameState, game: Game, cost: ActivityCost): GameState
```

Spends a cost without checking it: each stat in `cost.stats` down by its amount, held to the stat's range ([`clampStat`](/reference/stats#clampstat)). The `activity` command calls it after `activityBlocked` has passed. Use it when a command you handle yourself needs to charge the same way.

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

A button, listed in the game's own [`actions`](/reference/game#game), offered whenever no scene is open. A plugin's [`buttons`](/reference/plugins#buttons) return the same shape, and the view draws them first: the [places plugin](/plugins/places#the-buttons)'s are the room's own `actions`, from its [`LocationDef`](/plugins/places#locationdef). It sends one [command](/reference/commands).

| Field | What it does |
|---|---|
| `when` | The button is only on screen while this holds. Default: always. |
| `blocked` | The button is on screen but greyed out while one of these holds; the first that does gives the disabled text. |

```ts
// period from '@ifloom/plugin-calendar'
actions: [
  { id: 'coffee', label: 'Buy a coffee', command: { type: 'activity', id: 'coffee' } },
  { id: 'counter', label: 'Chat at the counter', command: { type: 'scene', id: 'cafe.counter' },
    when: { seen: 'cafe.first-visit' },
    blocked: [{ when: period('afternoon'), reason: 'The afternoon queue is out the door.' }] },
]
```

### A "go home" button

The engine offers no travel shortcuts of its own. With the [places plugin](/plugins/places), a game that wants one declares a game action that walks, so every room offers it:

```ts
import { at, go } from '@ifloom/plugin-places'

const town: Game = {
  // ...
  actions: [
    { id: 'home', label: 'Go home', command: go('house'), when: { not: at('house') } },
  ],
}
```

`places/go` only goes to an exit of where the player stands, so from further away the button is greyed out with `You cannot get there from here.` For a button that works from anywhere, send an [activity](#activitydef) whose effects hold the plugin's [`moveTo('house')`](/plugins/places#effects) (it does not run the plugin's [`arrive`](/plugins/places#placesoptions) option).

### How a button and the reducer agree

The view turns each action into a [`RenderedChoice`](#renderedchoice). Its disabled text is [`whyNot`](#whynot) for its command — the same function the reducer refuses with — and its `warning` is [`warningOf`](#warningof) — the line the reducer refuses a pressable button with. An activity's button also carries the activity's cost as its price, and any notes [plugins' prices](/reference/plugins#prices) add.

A `blocked` entry that holds overrides `whyNot`. **Use it sparingly**: the reducer does not know about it, so a command sent anyway still runs. For a reason the engine already knows — a lock, an activity's requirement — leave it to `whyNot`.

To keep a button off the screen until it belongs there, give it a `when`. While a lock that stops everything is on, the screen shows no actions at all; see [`lockedOut`](/reference/locks#lockedout).

## whyNot

```ts
import { whyNot } from '@ifloom/engine'

function whyNot(state: GameState, game: Game, command: Command): string | undefined
```

Why the player cannot do this right now, or `undefined` if they can — for **every** command: activities, choices, items, inputs and plugin commands, such as the [cast](/plugins/cast#commands)'s talking and calling. The one place availability is decided: the reducer refuses with this line and the view greys buttons out with it, so the two cannot disagree, and every refusal is a sentence a UI can show as it is.

Checked in the order a player would notice: a [lock](/reference/locks), then a refusal from a plugin's [guard](/reference/plugins#guards) (both skipped for a plugin command that sets [`ignoresLocks`](/reference/plugins#commands-outside-the-story)), then the game's own handler in [`rules.commands`](/reference/rules#commands) if it returns a refusal, then what the command needs. The lines for each command are listed under [Commands](/reference/commands#command); the engine's own come from the [strings table](/reference/strings), so a game can reword them.

```ts
whyNot(state, game, go('cafe'))
// 'Closed. Opens tomorrow morning.' in the evening, from the café's `locked` (places plugin)
whyNot(state, game, talk('rosa'))   // talk from @ifloom/plugin-cast
// 'Finish this first.' while a scene is open; 'Rosa is not here.' when she is elsewhere
```

## warningOf

```ts
function warningOf(state: GameState, game: Game, command: Command, effects?: readonly Effect[]): string | undefined
```

A warning on a command that can still be pressed, or `undefined`: the `reason` of the first soft refusal a plugin's [guard](/reference/plugins#guards) gives, in the order `game.plugins` lists them. The engine has no warnings of its own. Not asked for a plugin command that sets [`ignoresLocks`](/reference/plugins#commands-outside-the-story), nor in a game where no plugin has a `guard` or a `price`.

Kept apart from `whyNot` because it is not a reason the thing cannot be done: a UI shows the line and offers something else, as the [calendar](/plugins/calendar#the-guard) warns `That would run past dawn.` and the player goes to bed instead.

The view sets it as the button's [`warning`](/reference/view#renderedchoice). The reducer refuses a command with it, once [`whyNot`](#whynot) has let the command through, so a warned button never runs: the UI shows the warning and offers something else. `effects` saves working the command's effects out again when the caller has them; left out, they come from [`effectsOf`](#effectsof).

```ts
warningOf(state, game, { type: 'activity', id: 'cook' })
// 'The dishes would pile up. Wash up first.' with the sink nearly full
```

**Gotcha.** A refusal from `whyNot` comes first: a command that is both refused and warned against is refused with the `whyNot` line.

## effectsOf

```ts
function effectsOf(state: GameState, game: Game, command: Command): Effect[]
```

What a command would apply, worked out before it runs, as plain [effects](/reference/effects). What [plugins' guards and prices](/reference/plugins#guards-prices-and-labels) and [locks with `effect`](/reference/locks#lock) look at.

| Command | Effects |
|---|---|
| `activity` | Its cost first, a `stat` effect of minus the amount for each stat in `cost.stats`, then its `effects`, with custom ones built as the activity would build them. |
| `choose` | The effects of that choice in the open scene, as rendered now. |
| `use` | The item down by one, then the item's `use` effects. |
| `custom` | The plugin command's [`effectsOf`](/reference/plugins#saying-what-a-command-does), or none without one. |
| anything else | None. |

An unknown activity, choice or item, or an item with no `use`, gives none.

```ts
// { id: 'work', requires: [onlyAt(['office'])], cost: { stats: { energy: 30 } }, effects: [pass(2), { kind: 'stat', key: 'coins', by: 20 }] }
effectsOf(state, game, { type: 'activity', id: 'work' })
// [{ kind: 'stat', key: 'energy', by: -30 },
//  { kind: 'custom', name: 'calendar/pass', with: { value: 2 } },
//  { kind: 'stat', key: 'coins', by: 20 }]
```

**Gotchas.**
- `scene` gives none. Look at the command for that. The places plugin's `places/go` and the cast's `cast/talk` give none either, though one moves the player and the other opens a scene. A plugin command, such as the calendar's [`sleep`](/plugins/calendar#commands), gives what its own `effectsOf` says.
- Only the list the command applies directly. What a plugin's effect applies in turn, through its context's [`apply`](/reference/plugins#applying-effects), is not in it.

## Price

```ts
type Price = {
  stats?: { id: string; amount: number; text: string }[]
  notes?: string[]
}
```

What pressing a button will spend, shown on it beforehand. Only costs appear here: what a choice *gives* stays off the button, because a payout printed on a line tells the player which line is the right one.

`stats` lists each stat spent: its id, the amount, and `text` — the amount written through the stat's [`format`](/reference/stats#formatstat) (`'3c'`), ready to print. `notes` are what [plugins' prices](/reference/plugins#prices) say it costs, in their own words: `'2 dishes to wash'`, or the [calendar](/plugins/calendar#price-notes)'s `'until evening'` for a button that passes time. A zero cost is left out; a price with nothing in it is `undefined`, and one with only notes is `{ notes }`.

For an activity the price comes from its `cost`, stats in the order the cost lists them. For a scene choice it is read from the choice's effects: the sum of its negative `stat` effects on [spendable](/reference/stats#statdef) stats, listed in the order the game declared its stats. A `stat` effect that lowers a stat not marked `spendable` — a mood, a reputation — is left off the button. So is one with `of`, which lowers an [entity](/reference/entities)'s stat, not the player's.

## RenderedChoice

```ts
type RenderedChoice = {
  id: string
  label: string
  price?: Price
  disabled?: string
  tags?: string[]
  irreversible?: string
  warning?: string
  command: Command
}
```

One button as the UI draws it: a room action, a **Talk** button, or a scene choice. `command` is what to send when it is pressed. `warning` is a line the button can still be pressed with but the reducer refuses it with: a plugin [guard](/reference/plugins#guards)'s soft refusal, such as the calendar's `That would run past dawn.`; see [`warningOf`](#warningof). `tags` are a scene choice's [tags](/reference/scenes#scenechoice), words the UI can style or filter it by, which the engine gives no meaning; `irreversible` is a warning line to show before it is sent; the [base UI](/ui/components#choicebutton) prints it on the button. See [The view](/reference/view).
