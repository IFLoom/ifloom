# Locks

A lock is something the player cannot do for now, and why. Stages of a game — an intro that only moves through its scenes, a night before a first day that keeps you near home — are written as locks: data that says what is stopped, while what holds, and the line the player reads.

The reducer refuses on the first lock that matches, and the view greys out (or hides) the button with the same line, so the two cannot disagree.

```ts
import { lockOn, lockedBy, lockedOut, type Lock } from '@ifloom/engine'
```

The examples walk with the [places plugin](/plugins/places): `go`, `moveTo` and `at` come from `@ifloom/plugin-places`.

Locks live in [`rules.locks`](/reference/rules#locks), checked in order.

## Lock

```ts
type Lock = {
  when: Condition
  deny: readonly LockTarget[]
  except?: readonly LockTarget[]
  effect?: string
  hide?: boolean
  reason: string
}
```

| Field | What it does |
|---|---|
| `when` | While this [condition](/reference/conditions) holds, the lock is on. |
| `deny` | What it stops: [command](/reference/commands#command) types, `'*'` for every type not in `except`, a [plugin](/reference/plugins) command by full name (`'places/go'`), or all of one plugin's commands (`'places/*'`). `'custom'` stops every plugin command. |
| `except` | What it never stops, even under `'*'`. Names things the same way as `deny`. |
| `effect` | Stop just the commands that would apply this effect: a built-in effect's `kind` (`'turn'`), or a plugin's effect by full name (`'calendar/pass'`, for everything that passes time). What a command would apply is [`effectsOf`](/reference/actions#effectsof). |
| `hide` | Leave a stopped button off the screen instead of showing it greyed out: a [places](/plugins/places#the-view) exit, a room's action, a [game action](/reference/game#game) or a plugin's [button](/reference/plugins#buttons). Scene choices, the [cast](/plugins/cast#personview)'s **Talk** buttons and buttons a plugin draws elsewhere (a [device](/plugins/devices)'s actions) are still greyed out. |
| `reason` | The refusal and the disabled text. Written for the player. |

**Gotchas.**
- A lock stops a command whatever it is aimed at: `deny: ['places/go']` stops every journey. To keep the player out of some places and not others, give those places a [`locked`](/plugins/places#locationdef) entry instead.
- A lock with `effect` still stops only what `deny` covers: `deny: ['*']` with `effect: 'turn'` stops every command that would end a turn. It sees only what [`effectsOf`](/reference/actions#effectsof) lists: an activity's cost (as `stat` effects) and effects, a choice's effects, an item's use, and a plugin command's own [`effectsOf`](/reference/plugins#saying-what-a-command-does). The calendar's `sleep` lists a `calendar/pass`, not a `turn`, so `effect: 'turn'` does not stop it; `effect: 'calendar/pass'` does.
- A lock with `effect` and `deny: ['*']` still counts for [`lockedOut`](#lockedout), which ignores `effect`: the room shows no exits, people or actions while it is on.
- Locks are checked before [`rules.commands`](/reference/rules#commands), so they stop commands the game handles itself too. They never stop `start`.
- A plugin command that sets [`ignoresLocks`](/reference/plugins#commands-outside-the-story) is never stopped by a lock, even under `'*'`. Only tools outside the story set it, such as the [debug plugin](/plugins/debug)'s commands. [`lockOn`](#lockon) and [`lockedBy`](#lockedby) still report the lock that matches it; [`whyNot`](/reference/actions#whynot) is what skips it.
- `hide` goes by the first lock that stops the command. A button stopped first by a lock without `hide` stays on screen greyed out, even if a later lock would hide it.
- `hide` never leaves off a button whose plugin command sets `ignoresLocks`: a lock does not stop it, so it stays.
- `when` is tested against the state *before* the command. A choice that ends the intro by changing `phase` is not stopped by the intro's own lock if `choose` is in `except`.

### LockTarget

```ts
type LockTarget = Command['type'] | '*' | `${string}/${string}`
```

What `deny` and `except` can name. A plugin command's type is always `custom`, so a lock names it by its full name, or names the whole plugin with `/*`:

```ts
// No phone at work: every command of the devices plugin, while the player is in the office.
{ when: at('office'), deny: ['devices/*'], reason: 'Not at work.' }
```

## lockOn

```ts
function lockOn(state: GameState, game: Game, command: Command): Lock | undefined
```

The first lock in `rules.locks` that stops this command right now, or `undefined`.

## lockedBy

```ts
function lockedBy(state: GameState, game: Game, command: Command): string | undefined
```

`lockOn(...)?.reason`: why this command is stopped, or `undefined`.

```ts
lockedBy(state, town, go('market')) // "Stay in tonight." on the first night, with the lock in the example below
```

## lockedOut

```ts
function lockedOut(state: GameState, game: Game): boolean
```

True while a lock that denies `'*'` is on. The player is then in a stretch that only moves through its scenes: the view shows **no exits, no people and no actions**, whatever `except` allows.

A curfew — nothing may run past dawn — is not a lock: it is the [calendar plugin](/plugins/calendar#the-guard)'s guard, a warning the player can still see the button behind.

## Examples

See them in the showcase: [Small Town](/guide/showcase#locks) holds moving day in its scene and keeps the phone in the pocket at work.

### An intro that only moves through its scenes

The player starts in `arrival` and can do nothing but take choices until the last scene sets the phase to `open`.

```ts
rules: {
  locks: [
    { when: { phase: ['arrival'] }, deny: ['*'], except: ['choose'], reason: 'Not yet.' },
  ],
}
```

The last choice of the intro:

```ts
effects: [{ kind: 'phase', value: 'open' }, moveTo('house')]
```

In a game with the [calendar](/plugins/calendar), let the intro's scenes carry the clock through the night themselves by building it with `calendar({ curfew: { not: { phase: ['arrival'] } } })`.

### A first night that keeps the player in

The evening the player moves in, they stay in the house: every journey is refused with one line.

```ts
locks: [
  { when: { phase: ['first-night'] }, deny: ['places/go'], reason: 'Stay in tonight.' },
]
```

Every exit shows greyed out with `Stay in tonight.`. A lock stops a command whatever its destination; to keep the player out of the market but let them walk the high street, put the condition on the market itself, as a place's [`locked`](/plugins/places#locationdef) entry, with `hide: true` for a place that should not be on the map at all:

```ts
{ id: 'market', /* … */ locked: [{ when: { phase: ['first-night'] }, reason: 'The market is not set up yet.' }] }
{ id: 'park', /* … */ locked: [{ when: { phase: ['first-night'] }, reason: 'Too far for tonight.', hide: true }] }
```

`hide` leaves any button off the screen, not only exits. Late at night, every activity button — **Buy a coffee**, **Browse the stalls** — is gone rather than greyed out, while the exits home still show:

```ts
{ when: { flag: 'lateNight' }, deny: ['activity'], hide: true, reason: 'Everything is shut.' }
```

### Nothing that ends the turn

While the café is short-staffed, the player cannot do anything in the room that would end the turn, and the button says why. Everything else still works.

```ts
locks: [
  { when: { flag: 'shortStaffed' }, deny: ['activity', 'custom'], effect: 'turn', reason: 'Not while the café is this busy.' },
]
```

An activity whose effects hold `{ kind: 'turn' }` is greyed out with the line; one without is not. It denies `activity` and `custom` rather than `'*'`, because a lock that denies `'*'` empties the room while it is on (see [`lockedOut`](#lockedout)).

### "No time for that" on what passes time

On the first morning, the player should get to the café for their shift, not spend the morning browsing. Activities that take no time are still allowed. With the [calendar](/plugins/calendar), time passes through its [`calendar/pass`](/plugins/calendar#effects) effect, so a lock on that effect stops just the activities that pass time:

```ts
import { period } from '@ifloom/plugin-calendar'

locks: [
  {
    when: { all: [{ phase: ['first-day'] }, period('morning')] },
    deny: ['activity'],
    effect: 'calendar/pass',
    reason: 'No time for that — the café opens soon.',
  },
]
```

Buying a coffee (no time) still works; a jog in the park, whose effects hold `pass(1)`, is greyed out with the line. Deny `'*'` instead and the room empties (see [`lockedOut`](#lockedout)); deny `['activity', 'choose']` to stop scene choices that pass time too.
