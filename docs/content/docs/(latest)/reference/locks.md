---
title: "Locks"
description: "Reference for Lock and LockTarget, the locks in content's locks that refuse commands while a condition holds, with lockOn and lockedOut."
---
A lock refuses some commands while a condition holds, with one line the player reads, such as an intro that moves only through its scenes or an office where the phone stays in the pocket. Your content declares locks in `locks`, so a mod can add one. [State, commands and the view](/docs/explanation/state-and-commands#locks-and-blocked-reasons) explains locks beside `blocked` reasons, and [Find out why a choice doesn't show](/docs/how-to/troubleshoot-a-missing-choice) traces a refusal back to its lock.

In the showcase: `examples/showcase/src/story/moving-day.ts` and `story/office.ts`, whose locks keep moving day to its scene and the phone away at work.

```ts
import { lockOn, lockedOut, type Lock, type LockTarget } from '@ifloom/engine/plugin'
```

## Lock

A lock the game declares in `locks`, which stops the commands in `deny` while its `when` holds. Every field is in [`Lock`](/docs/api/engine-plugin#lock).

The engine tests the locks in order, against the state before the command runs, and refuses a command on the first lock that stops it. The view greys out the button with the same `reason`, or leaves it off the screen when that lock has `hide`. A pack's lock with the same `id` takes the place of content's, and a lock with no `id` is added after the ones before it.

| Field | Meaning |
|---|---|
| `deny` | The [`LockTarget`](#locktarget)s the lock stops. `'*'` stops every command not in `except`. |
| `except` | The targets the lock never stops, named as in `deny`, even under `'*'`. |
| `effect` | The one effect a command must apply for the lock to stop it, named by its key (`'turn'`) or a plugin's full name (`'calendar/pass'`), as [`effectsOf`](/docs/reference/actions#effectsof) lists it. |
| `hide` | Whether a stopped button leaves the screen in place of being greyed out. It covers the room's actions, the places plugin's exits and a plugin's offered actions, and never scene choices or buttons a plugin renders elsewhere. |

The showcase's two locks keep moving day to its scene and the phone in the pocket at work:

```ts
import type { Lock } from '@ifloom/engine/plugin'
import { places } from '@ifloom/plugin-places'

export const locks: Lock[] = [
  { id: 'moving-day', when: { kv: 'phase', is: ['arrival'] }, deny: ['*'], except: ['choose', 'input'], reason: 'Unpack first.' },
  { id: 'no-phone', when: places.at('office'), deny: ['devices/*'], reason: 'Not at work.' },
]
```

A lock with `effect` still stops only what `deny` covers, so `deny: ['action', 'custom']` with `effect: 'turn'` stops the actions and plugin commands that end a turn. The lock stops a command wherever it's aimed, so `deny: ['places/go']` stops every journey. A location's [`blocked`](/docs/reference/actions#blocked) entry keeps the player out of one location and not others.

## LockTarget

A name `deny` and `except` take: a [command](/docs/reference/commands#command) type, `'*'`, a plugin's command by its full name, or a whole plugin with `/*`. Every form is in [`LockTarget`](/docs/api/engine-plugin#locktarget).

Every plugin command has the type `custom`, so `'custom'` stops them all, `'places/go'` stops one and `'places/*'` stops every one of the places plugin's. The game's own [`commands`](/docs/reference/rules#commands) are named `'game/rest'` or `'game/*'`. An action is the command `action`, so `'action'` stops every action with a cost, effects or `once`. A plugin's action, such as `{ type: 'action', id: 'places/coffee' }`, is that plugin's too, so `'places/*'` stops it, while a single name such as `'places/go'` names a command and never an action.

```ts fragment
{ when: { kv: 'lateNight' }, deny: ['action'], hide: true, reason: 'Everything is shut.' }
```

## Functions

### lockOn

Returns the first lock in `game.locks` that stops a command now, or `undefined`. Its signature is in [`lockOn`](/docs/api/engine-plugin#lockon).

It reports a lock that matches a plugin command with `ignoresLocks` too, and [`whyNot`](/docs/reference/actions#whynot) is what skips it.

```ts given
import { lockOn } from '@ifloom/engine/plugin'
import { places } from '@ifloom/plugin-places'
import { commandOf } from '@ifloom/engine'

lockOn(state, game, commandOf(places.go('park')))?.reason // 'Unpack first.' on moving day
```

### lockedOut

Returns true while a lock that denies `'*'` is on, whatever its `except` and `effect`. Its signature is in [`lockedOut`](/docs/api/engine-plugin#lockedout).

While it's true, the player moves only through scenes, and the room shows no exits, no characters and no actions.

```ts given
import { lockedOut } from '@ifloom/engine/plugin'

lockedOut(state, game) // true on moving day
```

## Caveats

- A lock never stops `start`, the [`setting`](/docs/reference/commands#setting) command, or a plugin command that sets `ignoresLocks`, such as the [debug plugin](/docs/reference/plugins/debug)'s.
- `effect` sees only what `effectsOf` lists. The calendar's `sleep` lists a `calendar/pass`, not a `turn`, so `effect: 'turn'` doesn't stop it and `effect: 'calendar/pass'` does.
- `hide` follows the first lock that stops the command. When a lock without `hide` stops a button first, the button stays greyed out even though a later lock would hide it.
- A lock that denies `'*'` empties the room even when it has an `effect`. A lock that should leave the room's other actions alone denies `'action'` and `'custom'` instead.
- A curfew isn't a lock. The [calendar plugin](/docs/reference/plugins/calendar)'s guard warns on a button the player can still press.
