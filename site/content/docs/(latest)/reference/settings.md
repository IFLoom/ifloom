---
title: "Settings"
description: "Settings the player can change: play settings in the state that conditions read, and ui settings kept in the profile."
---
Settings are what the player can change from a settings screen, such as whether hints are shown or how large the text is. The engine has none of its own, so you declare every one your game offers in your content's `settings`.

```ts
import type { SettingDef } from '@ifloom/engine'

const settings: SettingDef[] = [
  { id: 'hints', label: 'Show hints', type: 'toggle', default: true },
  {
    id: 'difficulty',
    label: 'Difficulty',
    type: 'choice',
    options: [
      { value: 'gentle', label: 'Gentle' },
      { value: 'usual', label: 'Usual' },
      { value: 'hard', label: 'Hard' },
    ],
    default: 'usual',
  },
  {
    id: 'textSize',
    label: 'Text size',
    type: 'choice',
    affects: 'ui',
    options: [
      { value: 'small', label: 'Small' },
      { value: 'large', label: 'Large' },
    ],
    default: 'small',
  },
]
```

Each setting either changes the game or only changes how it looks:

- **A `play` setting** (the default) is part of the game. Its value is in [`state.settings`](/docs/reference/state#settings), it's saved with the game, and conditions can read it. `hints` and `difficulty` above are play settings.
- **A `ui` setting** never enters the state. It lives in the player's [profile](/docs/reference/profile), and only your UI reads it. `textSize` is one, and so is a volume.

Whichever type it is, the player's last choice is stored in the profile's `core:settings`, so it carries over to their next game.

## SettingDef

```ts
type SettingDef = {
  id: string
  label: string
  affects?: 'play' | 'ui'
} & (
  | { type: 'toggle'; default: boolean }
  | { type: 'choice'; options: { value: string; label: string }[]; default: string }
  | { type: 'range'; min: number; max: number; step?: number; default: number }
)
```

| Field | What it is |
|---|---|
| `id` | How content and the profile name it. |
| `label` | What the settings screen calls it. |
| `affects` | `'play'` if left out. `'ui'` keeps it out of the state. |
| `type` | A `toggle` is on or off. A `choice` is one of its `options`, by `value`. A `range` is a number from `min` to `max`, in steps of `step` from `min` if given. |
| `default` | Its value until the player changes it. It has to be one the setting can take. |

## Reading a setting

Content reads a play setting with the [`{ setting }`](/docs/reference/conditions#setting) condition, which works like `{ kv }`:

```ts
// Rosa offers a hint only to players who keep hints on.
{ id: 'ask-rosa', label: 'bakery#ask-rosa', when: { setting: 'hints' }, effects: [] }

// Something only a hard game has.
{ when: { setting: 'difficulty', is: 'hard' }, text: 'bakery.queue-long' }
```

A UI reads every setting, play and ui alike, from [`view.settings`](/docs/reference/view#settings). That's enough to draw the whole settings screen. A `ui` setting's `value` there is `null`, so read it from the profile.

## Changing a setting

Change either kind with [`runner.setSetting`](/docs/reference/runner#setsetting). It checks the value against the declaration, and refuses an unknown id or a value the setting can't take.

```ts
runner.setSetting('difficulty', 'hard') // a play setting: sent as the setting command
runner.setSetting('textSize', 'large')  // a ui setting: written to the profile
```

A play setting goes through the [`setting`](/docs/reference/commands#setting) command. It's a command like any other, so it's logged and a replay gives the same game. No lock stops it. A ui setting is written to the profile and leaves the state alone. [`runner.snapshot().settings`](/docs/reference/runner#settings) gives every setting's value now.

## A new game

A new game takes the player's stored values for play settings. Pass them to [`startingState`](/docs/reference/commands#startingstate) as `settings`, or let [`runner.newGame`](/docs/reference/runner#newgame) or [`browserRunner`](/docs/browser#browserrunner) read them from the profile. A setting with no stored value, or one it can't take any more, starts at its default.

A save keeps the play settings it was made with. Loading it doesn't apply the player's newer choices. A save from before settings existed, or one made before you added a setting, gets each missing setting's default when it loads.

## Drawing it

`view.settings` has every setting the game declares, as a [`SettingView`](/docs/reference/view#settingview): its `label`, its `type`, and the `options` of a choice or the range of a slider. Read the values of both kinds from [`runner.snapshot().settings`](/docs/reference/runner#settings), since a `ui` setting isn't in the state. Send a change through [`runner.setSetting`](/docs/reference/runner#setsetting).

The React UI draws a Settings page when you turn on its [pages](/docs/react#pages), and [`useSetting`](/docs/react/components#usesetting) reads one setting for a part of your own. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/settings.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/mount-settings.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/react/settings.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Settings.vue]{meta='tab="Vue" tab-group="framework"'}

## Checks

The [content checker](/docs/reference/checks) and [`loadGame`](/docs/reference/loader#what-the-loader-adds) report:

- two settings with the same id in one list
- a `default` the setting can't take
- a choice with no options
- a range whose `min` is above its `max`
- a `{ setting }` condition that names an unknown setting, a ui setting, or an `is` value the setting can't take

**Gotcha.** Conditions can only read play settings. If the story needs to branch on something, make it a play setting, even if the player thinks of it as a preference.

## See it in an example

Small Town: [`examples/showcase/src/world/settings.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/settings.ts) declares `hints`, a play setting the high street reads with `{ setting: 'hints' }`, and `textSize`, a ui setting its [`ui.settings`](/docs/react/hints#settings) hint has the React UI size the page by.
