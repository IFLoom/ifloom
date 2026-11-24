---
title: "Inputs"
description: "Inputs the player types or picks, such as a name, checked against their declaration and written to a kv key."
---
An input is something the player types or picks, which the engine writes to a key in the [kv store](/docs/reference/state#kv). It might be a name for the cat, the hour the alarm goes off, or their usual order at the café. The game declares each input with what it accepts, and the [`input`](/docs/reference/commands#input) command writes it. The engine checks the value against the declaration, so a UI can't put anything else in.

```ts
import type { InputDef } from '@ifloom/engine'
```

## A worked example

```ts
import type { Content } from '@ifloom/engine'

const town: Content = {
  inputs: [
    // The showcase asks for this on moving day.
    { id: 'catName', label: 'Name your cat', type: 'text', maxLength: 16, when: { kv: 'phase', is: ['arrival'] } },
    { id: 'alarm', label: 'Wake at', type: 'number', min: 5, max: 10, key: 'wakeAt' },
    {
      id: 'order',
      label: 'Your usual',
      type: 'choice',
      options: [{ value: 'tea', label: 'Tea' }, { value: 'coffee', label: 'Coffee' }],
    },
  ],
  // ...
}
```

The UI reads what to draw from [`view.inputs`](/docs/reference/view#inputs), and sends what the player entered:

```ts given
import { apply, view } from '@ifloom/engine'

view(state, game).inputs.find((input) => input.id === 'alarm')
// { id: 'alarm', label: 'Wake at', type: 'number', maxLength: null, min: 5, max: 10, options: [], value: null }

let next = apply(state, game, { type: 'input', id: 'alarm', to: 7 }).state
next = apply(next, game, { type: 'input', id: 'catName', to: '  Biscuit ' }).state

next.kv  // { wakeAt: 7, catName: 'Biscuit', ... }
```

Prose reads the value back like any kv key, and conditions test it with [`{ kv }`](/docs/reference/conditions#kv), such as `{ kv: 'order', is: 'tea' }`.

A button can send the command with no `to`, as `{ type: 'input', id: 'catName' }`, and the UI asks for the value when it's pressed. If the command arrives without one, it's refused with `Enter something first.`, so the UI must fill the value in before passing it on.

## InputDef

```ts shape
type InputDef = {
  id: string
  label: string
  type: 'text' | 'number' | 'choice'
  key?: string
  when?: Condition
  maxLength?: number
  min?: number
  max?: number
  options?: { value: KvValue; label: string }[]
}
```

| Field | What it does |
|---|---|
| `id` | What the `input` command names. |
| `label` | What the field is called, for the UI. |
| `type` | `'text'`, `'number'` or `'choice'`. A pack written before schema 21 called it `kind`, and loading it carries it across. |
| `key` | The kv key it writes. The input's `id` if left out. |
| `when` | The input is only on offer while this [condition](/docs/reference/conditions) holds. Otherwise it's left out of the view, and refused with `Not now.` |
| `maxLength` | Text only. The most characters, after trimming. 40 if left out. |
| `min`, `max` | Number only. The range, inclusive. Either may be left out. |
| `options` | Choice only. The values on offer, each with what the player reads. |

Declare inputs in your [content](/docs/reference/content#content)'s `inputs`, which [`loadGame`](/docs/reference/content#loadgame) gathers into [`Game.inputs`](/docs/reference/game#game). They merge by id, so a pack's input replaces one with the same id.

## Why a value is refused

An `input` command whose value can't be entered is refused with one line, as the player reads it. [`whyNot`](/docs/reference/actions#whynot) gives this line for an `input` command, after the [locks](/docs/reference/locks) and any hard plugin [guard](/docs/reference/plugins#guards) have had their say. A guard's soft warning still refuses the command when it runs. A game that handles `input` itself in [`rules.commands`](/docs/reference/rules#commands) skips it. These are the lines, in the order they're checked:

| Line | When |
|---|---|
| `There is no such thing to fill in.` | No input has that id. |
| `Not now.` | Its `when` doesn't hold. |
| `Enter something first.` | There's no value. For text, also a value that isn't a string or is only spaces. |
| `Keep it to <n> characters.` | Text longer than `maxLength` after trimming. |
| `Enter a number.` | For a number, a value that isn't a finite number. |
| `Between <min> and <max>.` | A number out of range, with both bounds declared. |
| `At least <min>.` / `At most <max>.` | A number out of range, with only one bound declared. |
| `That is not one of the options.` | For a choice, a value that isn't one of the `options`' values. |

Each line is the engine's English from the [strings table](/docs/reference/strings#input) (`noSuchInput`, `notNow`, `enterSomething`, `tooLong`, `enterNumber`, `between`, `atLeast`, `atMost`, `notAnOption`), and a game can reword it.

```ts given
import { whyNot } from '@ifloom/engine'

whyNot(state, game, { type: 'input', id: 'alarm', to: 11 })  // 'Between 5 and 10.'
```

A text value is trimmed before it's checked and before it's written to the kv store, so `'  Sam '` is kept as `'Sam'`.

## Drawing it

`view.inputs` has each input on offer now, in the order you declared them, as an [`InputView`](/docs/reference/view#inputview): its `label`, its `type`, its limits, the `options` of a choice, and the `value` its kv key holds. Send what the player enters as `{ type: 'input', id, to }`. A value that breaks the input's rules is refused with [why](#why-a-value-is-refused), so show the reason by the field.

The React UI draws a field for each. While a scene is open, [`Scene`](/docs/react/components#scene) draws them between the scene's words and its choices, so a scene that asks for a name shows the box where the question is. Outside a scene, [`InputFields`](/docs/react/components#inputfields) draws them, under the room in the default layout. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/inputs.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/inputs.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Inputs.vue]{meta='tab="Vue" tab-group="framework"'}

## Gotchas

- **A number must be sent as a number.** An HTML field gives a string, and `'7'` is refused with `Enter a number.`, so convert it before sending.
- **Choice values are compared exactly.** `1` and `'1'` are different options.
- **An input writes a kv key, not a stat.** To let the player set a number that effects spend, have a choice or an action read the key through one of the game's own [effects](/docs/reference/effects#computed-effects).
- **A typed name can name a character.** The [cast plugin](/docs/plugins/cast#a-name-the-player-chooses) fills tokens in a character's `name`, so `name: '{{friendName}}'` shows what the player typed.
- **It works with a scene open.** Inputs aren't refused with `Finish this first.`, so a scene can ask for a name halfway through. To keep an input to one scene, use `when` (for example `{ scene: ['intro'] }`) or a [lock](/docs/reference/locks) that denies `'input'`.
- **The loader checks the declaration.** It reports a `'choice'` input with no options and a `min` above `max`. See [Checking content](/docs/reference/checks).

## See it in an example

- Small Town: [`examples/showcase/src/story/moving-day.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/moving-day.ts) asks for the cat's name with the `catName` input, offered only on moving day with `when: { kv: 'phase', is: ['arrival'] }`.
- The Letter: [`examples/novel/src/story/ch1.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/story/ch1.ts) asks for the reader's name with `playerName` until one is typed, and the first chapter's choices wait for it.
