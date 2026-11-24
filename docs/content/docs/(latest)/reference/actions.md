---
title: "Actions and buttons"
description: "Actions: what the player can do, with a cost, reasons it's refused, effects and a command, offered as buttons; the order refusals come in, whyNot, warnings and effectsOf."
---
An action is something the player can do, offered as a button: buying a coffee, doing a shift, going for a jog, waiting a while. It's an [`ActionDef`](#actiondef), with the same fields a scene's [choice](/docs/reference/scenes#choice) has: a label, a cost, the reasons it's refused, effects and a command it sends.

Your game's own actions go in your content's `actions`, and each one with a `label` is a button in every room while no scene is open. Plugins offer theirs too, such as the [places plugin](/docs/plugins/places#the-buttons)'s room actions and a [device](/docs/plugins/devices#section)'s app buttons.

```ts
import { actionOf, effectsOf, need, whyNot, type ActionCost, type ActionDef, type Blocked } from '@ifloom/engine'
import { actionReferences } from '@ifloom/engine/plugin'
```

## ButtonDef

```ts shape
type ButtonDef = {
  id: string
  label?: string
  labels?: { when?: Condition; label: string }[]
  when?: Condition
  blocked?: Blocked[]
  cost?: ActionCost
  effects?: EffectRef[]
  command?: CommandRef
  once?: Once
  tags?: string[]
  irreversible?: string
  ui?: Ui<ChoiceUi>
}
```

Something the player can press. A scene's [`Choice`](/docs/reference/scenes#choice) and an [`ActionDef`](#actiondef) are both one, so a choice and a room's button are written and read the same way. Pressing one runs its command, then pays its cost, then applies its effects.

## ActionDef

```ts shape
type ActionDef = ButtonDef
```

| Field | What it does |
|---|---|
| `id` | Unique among the game's actions. The view passes it on as the [`RenderedChoice`](/docs/reference/view#renderedchoice)'s `id`, and `[[act:id]]` in a room's prose names it. |
| `label` | The button's words, as written, with tokens filled in. An action with no label is never drawn as a button. A choice's command, another button or a hotspot does it with `{ type: 'action', id }`. |
| `labels` | Words that depend on state, each `{ when, label }`. The first whose `when` holds wins over `label`. |
| `when` | Only offered, and only done, while this holds. Without it, it's always there. |
| `blocked` | [Conditions](/docs/reference/conditions) that refuse it while they hold, each with the line the player reads. See [`Blocked`](#blocked). |
| `cost` | The stats it spends. See [`ActionCost`](#actioncost). |
| `effects` | [Effects](/docs/reference/effects) applied in order after the cost is paid. A plugin's effect or one of the game's own is written [in short](/docs/reference/custom#plugincall), as in `{ 'game/countCoffee': true }`. |
| `command` | A [command](/docs/reference/commands) it sends, before its cost and effects: a plugin's in short, such as `{ 'places/go': { id: 'cafe' } }`, or the engine's. Any command but `choose`. |
| `once` | Once in the game or once a turn, as a [`Once`](#once): `{ per: 'turn', reason: 'Once a day is plenty.' }`. Once it's spent it's refused with `reason`, which shows on its button. It's counted in [`state.chosen`](/docs/reference/state#chosen) under its id. |
| `tags` | Words the UI can style or filter the button by, passed to its [`RenderedChoice`](/docs/reference/view#renderedchoice). The engine gives them no meaning. |
| `irreversible` | A warning that it can't be undone, which the UI shows on it. |
| `ui` | [Presentation hints](/docs/reference/ui-hints) for the UI, passed to the button as written, such as the React UI's [`transition`](/docs/react/hints#transition-on-a-choice) for the screen it leads to. |

This is the showcase's coffee, a room action of the café, with a [macro](/docs/reference/custom#macros) of the game's own added to count the cups:

```ts
import type { ActionDef, GameRules } from '@ifloom/engine'

const coffee: ActionDef = {
  id: 'coffee',
  label: 'Buy a coffee',
  cost: { stats: { coins: 3 }, reasons: { coins: 'Not even for a small one.' } },
  blocked: [{ when: { kv: 'hadCoffee' }, reason: 'One is enough for today.' }],
  effects: [{ stat: 'energy', by: 15 }, { kv: 'hadCoffee', to: true }, { 'game/countCoffee': true }],
}

// The game's own code, in its rules.
const rules: GameRules = {
  macros: {
    countCoffee: () => [{ kv: 'coffees', by: 1 }],
  },
}
```

`coins` and `energy` are stats the game declares. The engine has none of its own (see [Stats](/docs/reference/stats)).

### What a button sends

Pressing a button sends one command, which is what the player's log keeps:

- An action with only a `command` sends that command, so a lock on the command stops the button, and the log reads `{ type: 'custom', name: 'places/go', … }`.
- An action with a cost, effects or `once` sends [`{ type: 'action', id }`](/docs/reference/commands#action). That command runs its `command` first, if it has one, then pays its cost and applies its effects.

A plugin's action is named with the plugin's id in front, `{ type: 'action', id: 'places/coffee' }`. The engine asks that plugin for it: its [`action`](/docs/reference/plugins#action), else its buttons in this state. So the café's coffee can only be bought while the café's buttons are offered, which is while you're there.

The engine adds no button of its own. To let the player wait in any room, add a `wait` action to your content, as the showcase does:

```ts
import { calendar } from '@ifloom/plugin-calendar'

actions: [{ id: 'wait', label: 'Wait a while', effects: [calendar.pass(1)] }]
```

The engine keeps no time of day. An action that takes time says so in its `effects`, with the [calendar plugin](/docs/plugins/calendar)'s [`pass`](/docs/plugins/calendar#effects), as in `effects: [calendar.pass(2), ...]`.

**Gotchas.**
- One of the game's own macros sees the state before the cost was paid.
- The [content checker](/docs/reference/checks) checks what an action names. It doesn't look inside the game's code, and an effect nobody declares does nothing.
- An action's `command` can't be the action itself. The checker says so, and the engine leaves such a command out.

## ActionCost

```ts shape
type ActionCost = {
  stats?: Record<string, number>
  reasons?: Record<string, string>
}
```

| Field | What it does |
|---|---|
| `stats` | The [stats](/docs/reference/stats) it spends, by id, as in `{ coins: 3, energy: 10 }`. The action is refused if the player has less of any of them. Write them in the order the button should list them. |
| `reasons` | Refusal lines by stat id, for when this action should say it differently from the stat. Without one, the player reads the stat's [`lacking`](/docs/reference/stats#lackingline) line. |

The cost shows on the button before it's pressed, as its [`Price`](/docs/reference/view#price).

**Gotcha.** A negative amount pays the player. `{ coins: -5 }` adds 5 coins when the action is done, and [`effectsOf`](#effectsof) lists it as `{ stat: 'coins', by: 5 }`. It isn't checked against what the player has, and it isn't shown in the price, so the button gives no hint of it. An amount of 0 does nothing. For a payment the player should see coming in your code, a [`stat` effect](/docs/reference/effects#stat) in `effects` is clearer.

## Blocked

```ts shape
type Blocked = {
  when: Condition
  reason: Reason
  hide?: boolean
}
```

Why something the player could do is refused for now. Everything that can be refused takes a `blocked` list of these: an action, a scene's [choice](/docs/reference/scenes#choice), a [place](/docs/plugins/places#the-location-trait), a device's [app](/docs/plugins/devices#appdef) and a [job](/docs/plugins/jobs#jobdef). The entries are checked in order, and the first whose `when` [holds](/docs/reference/conditions) refuses it. Its `reason` is both the refusal and the button's disabled text.

| Field | What it does |
|---|---|
| `when` | Refused while this holds. |
| `reason` | What the player reads, on the greyed-out button and as the refusal: words written in place, or a line of the strings table by key. See [`Reason`](#reason). |
| `hide` | Leave the button off the screen while `when` holds, rather than greyed out. |

The reducer refuses an action on its `blocked` list and the view greys the button out with it, so the two can't disagree.

```ts
import { calendar } from '@ifloom/plugin-calendar'

blocked: [
  { when: calendar.weekday(6), reason: 'The café is shut on Sundays.' },
  { when: { kv: 'barred' }, reason: 'Rosa won’t serve you.', hide: true },
]
```

### Reason

```ts shape
type Reason = string | { string: string }
```

The words a player reads when something is refused. Most are written in place, such as `'Too tired.'`. A reason can also name a line of the [strings table](/docs/reference/strings) by its key, `{ string: 'shop/closed' }`, so a game rewords it once for everywhere it's used. The helpers that write a `blocked` entry for you do this: [`places.onlyAt()`](/docs/plugins/places#helpers)'s is `{ string: 'places/notHere' }` and [`shop.hours()`](/docs/plugins/shop#helpers)'s is `{ string: 'shop/closed' }` unless you give one. The [checker](/docs/reference/checks) reports `no string named "…"` for a key that no table has. Read one yourself with [`reasonOf`](/docs/reference/strings#reasonof).

### Once

```ts shape
type Once = { per: 'game' | 'turn'; reason?: Reason }
```

How often something can happen: once in the whole game, or once a turn. A choice, an action and a [cheat](/docs/plugins/cheats#cheatdef) take one as `once`, and a [trigger](/docs/reference/triggers#triggerdef) takes its `per`.

| Field | What it does |
|---|---|
| `per` | `'game'`: spent for good once it's been pressed. `'turn'`: spent until the turn ends. |
| `reason` | What the player reads on the button once it's spent. The engine's `done` string, `Already done.`, if left out. |

A button counts in [`state.chosen`](/docs/reference/state#chosen), so `per: 'game'` reads its count and `per: 'turn'` the turn it was last pressed.

A [lock](/docs/reference/locks) in your content's `locks` is the other way to refuse things. Use a lock for a rule that spans many commands at once, such as a stretch of the game where the player can't leave the house, and `blocked` for a reason that belongs to one thing.

### need

```ts shape
function need(reason: Reason, when: Condition): Blocked
```

A `blocked` entry written the other way round: refused with `reason` unless `when` holds. It's `{ when: { not: when }, reason }`, for when it reads better to say what the action needs.

```ts
import { need } from '@ifloom/engine'

blocked: [need('You need a scarf for this.', { entity: 'clothing:scarf', at: 'you' })]
```

For a test worked out from several values, use a [condition of your game's own](/docs/reference/rules#gamerules): `{ when: { 'game/marketDay': true }, reason: 'Not on market day.' }`.

## actionOf

```ts shape
function actionOf(state: GameState, game: Game, id: string): ActionDef | undefined
```

The action `{ type: 'action', id }` does, in this state, or `undefined`. An id with no plugin in front is one of the game's `actions`. One with a plugin's id in front, `'places/coffee'`, is that plugin's: what its [`action`](/docs/reference/plugins#action) answers, else the button of that id it offers now.

## Why an action is refused

An action the player can't do right now is refused with one line, which is also its button's disabled text. The engine checks in this order, and the first that fails gives the line:

1. A scene is open: `Finish this first.`
2. Its `when` doesn't hold: `That is not on offer.`
3. A [lock](/docs/reference/locks) stops `{ type: 'action', id }`: the lock's `reason`.
4. Each entry in `blocked`, in order, whose `when` holds: its `reason`.
5. It has `once` and it's spent, done once in the game or this turn: `once.reason`, or `Already done.`.
6. Each stat in `cost.stats`, in the order written, that the player has less of than the cost: `cost.reasons[id]`, or the stat's [`lackingLine`](/docs/reference/stats#lackingline).
7. Its `command` would be refused: that command's reason.

Because `blocked` comes before `cost`, a player short of energy is told `Too late for that.` before `Not enough energy.` when both hold. To have the energy line come first, give it a `blocked` entry of its own, ahead of the others, and keep the cost for spending it:

```ts
import type { ActionDef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

const jog: ActionDef = {
  id: 'jog',
  label: 'Go for a jog',
  cost: { stats: { energy: 10 } },
  blocked: [
    { when: { stat: 'energy', lt: 10 }, reason: 'Too tired.' },
    { when: calendar.period('night'), reason: 'Too late for that.' },
  ],
  once: { per: 'turn', reason: 'Once a day is plenty.' },
  effects: [calendar.pass(1)],
}
```

If the action also costs coins, that's still checked after `blocked`, so the player hears that they can't afford it only once nothing else stands in the way. You can reword the engine's own lines here (`finishFirst`, `notOnOffer` and `notEnough`) in the [strings table](/docs/reference/strings#refusals). A lock's and a `blocked` entry's `reason` are already your game's words.

**Gotcha.** A plugin guard's soft refusal isn't in this list. An action a plugin warns against, such as one the [calendar](/docs/plugins/calendar#the-guard) says `That would run past dawn.` about, isn't blocked. Its button stays pressable with the line as its `warning`, and the command is refused with it. See [`RenderedChoice`](/docs/reference/view#renderedchoice).

## actionReferences

```ts shape
function actionReferences(action: ActionDef): Reference[]
```

What an action names, for the [content checker](/docs/reference/checks): its conditions, effects, command and hints. A plugin whose content holds actions, as a place's or an app's do, hands these to its [`references`](/docs/reference/plugins#references), so they're checked as the game's own are.

## Offering buttons

While no scene is open, the view shows the plugins' buttons first and then the game's actions that have a label. It shows none at all while a [lock](/docs/reference/locks) that denies `'*'` is on (see [`lockedOut`](/docs/reference/locks#lockedout)). It leaves off any button whose command is stopped by a lock with `hide`, or whose own `blocked` entry with `hide` holds.

```ts
import type { ActionDef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

const actions: ActionDef[] = [
  {
    id: 'chat',
    label: 'Chat with Ava',
    command: { type: 'scene', id: 'ava.hi' },
    when: { seen: 'intro' },
    blocked: [{ when: calendar.period('afternoon'), reason: 'The afternoon queue is out the door.' }],
  },
]
```

### A "go home" button

The engine offers no travel shortcuts of its own. With the [places plugin](/docs/plugins/places), you can add an action that walks home, so every room offers it:

```ts
import type { Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const town: Content = {
  actions: [{ id: 'home', label: 'Go home', command: places.go('flat'), when: { not: places.at('flat') } }],
}
```

`places/go` only goes to an exit of where the player stands, so further away the button is greyed out with `You cannot get there from here.` For a button that works from anywhere, give the action effects that hold the plugin's [`places.move('flat')`](/docs/plugins/places#effects) instead. That doesn't run the place's [`arrive`](/docs/plugins/places#arrival).

### How a button and the reducer agree

The view turns each action into a [`RenderedChoice`](/docs/reference/view#renderedchoice) with [`renderAction`](/docs/reference/view#renderaction):

- Its disabled text is [`whyNot`](#whynot) for the command it sends, the same function the reducer refuses with.
- Its `warning` is the first soft refusal a plugin's [guard](/docs/reference/plugins#guards) gives, the line the reducer refuses a pressable button with.
- It carries the action's cost as its [price](/docs/reference/view#price), along with any notes [plugins' prices](/docs/reference/plugins#prices) add.

## whyNot

```ts shape
function whyNot(state: GameState, game: Game, command: CommandRef): string | undefined
```

Why the player can't do this right now, or `undefined` if they can. It answers for every command: actions, choices, inputs and plugin commands such as the [cast](/docs/plugins/cast#commands)'s talking and calling. The reducer refuses with this line and the view greys buttons out with it, so the two can't disagree, and every refusal is a sentence a UI can show as it is.

It checks in this order:

1. A [lock](/docs/reference/locks).
2. A refusal from a plugin's [guard](/docs/reference/plugins#guards), or the game's own in [`rules.guard`](/docs/reference/rules#gamerules).
3. What the command itself needs. The lines for each command are under [Commands](/docs/reference/commands#command).

A plugin command that sets [`ignoresLocks`](/docs/reference/plugins#commands-outside-the-story) skips the first two, and so does the [`setting`](/docs/reference/commands#setting) command. The engine's own lines come from the [strings table](/docs/reference/strings), so a game can reword them.

```ts given
import { whyNot } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'

whyNot(state, game, places.go('cafe'))
// a `blocked` reason on the café, such as 'Closed. Opens tomorrow morning.', while it holds
whyNot(state, game, cast.talk('ava'))
// 'Finish this first.' while a scene is open, or 'Ava is not here.' when she's elsewhere
```

## effectsOf

```ts shape
function effectsOf(state: GameState, game: Game, command: CommandRef): Effect[]
```

What a command would apply, worked out before it runs, as plain [effects](/docs/reference/effects). [Plugins' guards and prices](/docs/reference/plugins#guards-prices-and-labels) and [locks with `effect`](/docs/reference/locks#lock) look at this. The game's own effects among them are worked out against `state`, so a guard sees what they'd do.

| Command | Effects |
|---|---|
| `action` | What its `command` would apply, then its cost, as a `stat` effect of minus the amount for each stat in `cost.stats`, then its `effects`, with the game's own worked out against `state`. |
| `choose` | The effects of that choice in the open scene, as it renders now. |
| `custom` | The plugin command's [`effectsOf`](/docs/reference/plugins#saying-what-a-command-does), or none if it has none. |
| anything else | None. |

An unknown action or choice gives none.

```ts given
import { effectsOf } from '@ifloom/engine'

// the showcase's office action { id: 'work', label: 'Do a shift', cost: { stats: { energy: 30 } }, effects: [calendar.pass(2), { stat: 'coins', by: 20 }] }
effectsOf(state, game, { type: 'action', id: 'places/work' })
// [{ stat: 'energy', by: -30 },
//  { 'calendar/pass': { by: 2 } },
//  { stat: 'coins', by: 20 }]
```

**Gotchas.**
- `scene` gives none. Look at the command itself for that. The places plugin's `places/go` and the cast's `cast/talk` give none either, though one moves the player and the other opens a scene. A plugin command such as the calendar's [`sleep`](/docs/plugins/calendar#commands) gives what its own `effectsOf` says.
- It's only the list the command applies directly. What a plugin's effect applies in turn, through its context's [`apply`](/docs/reference/plugins#applying-effects), isn't in it.

## Drawing it

While no scene is open, the buttons are in `view.actions`: the game's own, then each plugin's (the places plugin's for the room, say), then your content's. Each is a [`RenderedChoice`](/docs/reference/view#renderedchoice). Show its `price` with the label, and grey it out with `disabled`, which is [why it's refused](#why-an-action-is-refused). Show a `warning` too: the button can be pressed, but the command will be refused with that line. Send `command` when it's pressed.

The React UI's [`RoomActions`](/docs/react/components#roomactions) draws them at the bottom of the story in the default layout, and [`ChoiceList`](/docs/react/components#choicelist) draws any list of them the same way. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/actions.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/actions.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Actions.vue]{meta='tab="Vue" tab-group="framework"'}

## See it in an example

- Small Town: the café's `coffee` in [`examples/showcase/src/story/cafe.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/cafe.ts) is one of the café's room actions. It costs 3 coins and is refused once you've had one today. "Wait a while" is in the content's `actions` in [`examples/showcase/src/world/actions.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/actions.ts), and the camera's buttons are an app's in [`examples/showcase/src/world/phone.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/phone.ts).
- The Corner Café: its four buttons are the content's `actions` in [`examples/cafe/src/world/actions.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/actions.ts). Buying the staff lunch costs 25 coins and is blocked when there's nobody to feed.
