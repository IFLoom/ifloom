---
title: "Find out why a choice doesn't show"
description: "Troubleshooting for a choice or an action that is missing or greyed out: every reason the engine hides one or refuses it, in the order it asks, and how to see which with whyNot, explain, the debug card, the playtest transcript and ifloom check."
---
Use this when a choice or an action you wrote isn't on screen, or is greyed out when you expect it to work. The engine hides a choice for a few reasons and refuses one for a few more, and it can tell you which. Find your symptom in the tables, then ask the engine to confirm it.

## The choice isn't on screen

A scene's choice or a room's action is left off the screen for one of these reasons:

| Problem | Cause |
|---|---|
| A choice is missing from its scene. | Its `when` doesn't hold. A choice or an action whose `when` fails isn't offered at all, so use a `blocked` entry instead to show it greyed out with a reason. |
| A choice or an action is missing while a condition holds. | One of its [`blocked`](/docs/reference/actions#blocked) entries has `hide: true` and its `when` holds. Take `hide` off to grey it out instead. |
| A room's action or exit is missing. | A [lock](/docs/reference/locks) with `hide: true` stops its command. A hiding lock covers the room's buttons only, and greys out a scene's choices instead. |
| The scene's `choices` are missing below a decision. | A [flowing scene](/docs/how-to/write-a-flowing-scene) offers its `choices` only once the flow reaches the end of the body. While the flow waits at a `decide()`, only that decision's choices show. |
| A choice is missing from the buttons but the line has a link. | The prose holds it inline with `[[act:id\|words]]`, so it leaves the list of buttons and shows as a link in the line. See [Put a choice inside a line of text](/docs/how-to/put-a-choice-in-a-line). |
| An action is missing while a scene is open. | The room's actions show only while no scene is open. A scene offers its own choices instead. |
| A location's action is missing. | The [places plugin](/docs/reference/plugins/places) offers a location's actions only while the player is there. |
| An action never shows as a button. | It has no `label`. An action with no label is done only by its command. |
| A condition you wrote never holds. | A misspelt kv key reads as unset, and a call to a name nobody declares is false. `ifloom check` reports the call, as `no game condition named "game/marketDy"`. A call with a second key, such as a stray `when`, isn't a call at all. |
| A thing is missing from the list of what the player holds. | Its kind isn't [`listed`](/docs/reference/entities#listed), or its `visible` fails. A plugin's kinds aren't listed unless the game says so. |

## The choice is greyed out

A greyed-out button carries the reason in `disabled`, and the engine refuses its command with the same words. These are the reasons, in the order [`whyNot`](/docs/reference/actions#whynot) asks:

| Problem | Cause |
|---|---|
| `Finish this first.` on everything. | A [minigame](/docs/reference/minigames) is running, or, on an action, a scene is open. |
| A line of your own on many buttons. | A [lock](/docs/reference/locks) in your content's `locks` stops the command while its `when` holds. Its `deny` and `except` say which commands. |
| A plugin's line, such as `That would run past dawn.` | A plugin's [guard](/docs/reference/plugin-api#guard) refuses it, such as the calendar's [curfew](/docs/reference/plugins/calendar#calendar). A soft refusal leaves the button pressable with the line as its `warning`. |
| `That is not on offer.` | The command names a choice the scene doesn't offer now, or an action whose `when` fails. |
| Your `blocked` reason. | The first [`blocked`](/docs/reference/actions#blocked) entry whose `when` holds. |
| `Already done.`, or your `once` reason. | Its [`once`](/docs/reference/actions#once) is spent, for the game or until the turn ends. |
| `Not enough coins.`, or your `cost.reasons` line. | The player has less of a stat than its [`cost`](/docs/reference/actions#actioncost) asks. Only `cost` refuses: a `stat` effect that takes coins never does. |
| The reason of another command. | The choice or action sends a `command`, and that command is refused. |

A button shows a choice's own `blocked` and `once` reasons ahead of a lock's. To have a player read one reason before another, such as being too tired before it being too late, put it first in `blocked`.

## Ask the engine why

Ask [`whyNot`](/docs/reference/actions#whynot) about the command, and [`explain`](/docs/reference/conditions#explain) about a condition. `explainText` prints the explanation as lines with ✓ or ✗ on each part:

```ts given
import { explain, explainText, sceneOf, whyNot } from '@ifloom/engine'

whyNot(state, game, { type: 'choose', id: 'coffee' }) // 'Not enough coins.', or undefined when it can be done

const coffee = sceneOf(game, 'ava.hi')?.choices?.find((choice) => choice.id === 'coffee')
console.log(explainText(explain(state, game, coffee?.when)))
// ✗ all of 2: 1 fail
//   ✓ kv metAva is true; wants set
//   ✗ stat coins is 3; wants 5 or more
```

A `when` that holds and a `whyNot` that answers `undefined` mean the choice is on offer. A call to the game's own code explains only as the name it called, so test that function on its own.

## See it while you play

Add the [debug plugin](/docs/reference/plugins/debug) to development builds, as [Debug a game](/docs/how-to/debug-a-game) shows. The React UI's debug card has a **Why not** tab with the locks on now, what each denies, and every greyed-out choice, action and person's button with its reason. Its forms set a stat, a kv key or the clock, so you can change the state until the choice shows.

## Find it in a playtest

Run `npx ifloom playtest`. The transcript marks each greyed-out button `[ ]` with its reason after a dash, and lists a choice that's missing by leaving it out of the screen. A button the game offered and then refused is listed after the run, as `turn 3: refused {…}: <reason>`. [Playtest and snapshot from the command line](/docs/how-to/playtest-and-snapshot) covers both.

## Check the content

Run `npx ifloom check`. It reports a condition that names a stat, a scene, a kv key's call or a plugin the game lacks, a `blocked` reason by key that no strings table has, and a flow whose every choice hides once picked. Fix those first, since each can hide a choice without any error in play.

For more, see:

- [Actions](/docs/reference/actions), with [`Blocked`](/docs/reference/actions#blocked), [`Once`](/docs/reference/actions#once), [`ActionCost`](/docs/reference/actions#actioncost) and [`whyNot`](/docs/reference/actions#whynot).
- [Conditions](/docs/reference/conditions), with [`explain`](/docs/reference/conditions#explain) and [`explainText`](/docs/reference/conditions#explaintext).
- [Locks](/docs/reference/locks) and [Choice](/docs/reference/scenes#choice).
- [State and commands](/docs/explanation/state-and-commands#locks-and-blocked-reasons), on why the button and the refusal always agree.
