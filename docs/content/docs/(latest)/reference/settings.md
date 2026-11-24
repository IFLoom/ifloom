---
title: "Settings"
description: "Reference for SettingDef: the settings a player can change, play settings kept in the state and read by conditions, and ui settings kept in the profile."
---
A setting is something the player changes from a settings screen, such as whether hints show or how large the text is. The engine declares none of its own, so your content declares each one in `settings`. [Add a settings page](/docs/how-to/add-a-settings-page) puts them on screen.

In the showcase: `examples/showcase/src/world/settings.ts`, which declares `hints`, a play setting the high street reads, and `textSize`, a ui setting.

```ts
import type { SettingDef } from '@ifloom/engine'
```

## SettingDef

A setting the game declares in `settings`, a toggle, a choice of options or a number in a range. Every field is in [`SettingDef`](/docs/api/engine#settingdef).

`affects` says what the setting changes, and every setting is one of two sorts:

- **A play setting**, `affects: 'play'` or left out, is part of the game. Its value is in [`state.settings`](/docs/reference/state#settings), the save keeps it, and the [`setting`](/docs/reference/conditions#setting) condition reads it.
- **A ui setting**, `affects: 'ui'`, never enters the state. The player's [profile](/docs/reference/profile) keeps it, and only a UI reads it, as for a text size or a volume.

The player's last value for either sort is kept in the profile's `core:settings`, so it carries over to their next game. A `default` is the value until the player changes it, and it has to be one the setting can take. A `range` steps by `step` from `min` when `step` is given.

[`runner.setSetting`](/docs/reference/runner#setsetting) changes either sort, and refuses an unknown id or a value the setting can't take. A play setting goes through the [`setting`](/docs/reference/commands#setting) command, so the log keeps it and a replay gives the same game, and no lock stops it. A ui setting is written to the profile and leaves the state alone.

```ts
import type { SettingDef } from '@ifloom/engine'

export const settings: SettingDef[] = [
  { id: 'hints', label: 'Show hints', type: 'toggle', default: true },
  {
    id: 'textSize',
    label: 'Text size',
    type: 'choice',
    affects: 'ui',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'large', label: 'Large' },
    ],
    default: 'normal',
  },
]
```

The high street reads the play setting in a choice's `when`:

```ts fragment
{ id: 'ask-ava', label: 'Ask Ava for a tip', when: { setting: 'hints' }, effects: [] }
```

## State

[`state.settings`](/docs/reference/state#settings) holds the play settings by id. A new game takes the player's stored values: pass them to [`startingState`](/docs/reference/commands#startingstate) as `settings`, or let [`runner.newGame`](/docs/reference/runner#newgame) or [`browserRunner`](/docs/reference/browser#browserrunner) read them from the profile. A setting with no stored value, or a stored value it can't take any more, starts at its `default`.

A save keeps the play settings it was made with, so loading it doesn't apply the player's newer values. A setting the game added after the save was made gets its `default` when the save loads.

## View

`view.settings` lists every setting the game declares, play and ui alike, each a [`SettingView`](/docs/api/engine#settingview) with its `label`, its `type` and its options or range. A ui setting's `value` there is `null`, so read both sorts' values from [`runner.snapshot().settings`](/docs/reference/runner#runnersnapshot). To render them, see [Render a settings screen](/docs/how-to/render/saves-and-settings#render-a-settings-screen).

## Checks

The [content checker](/docs/reference/checks) and [`loadGame`](/docs/reference/content#checks) report these problems with settings:

| Problem | Cause |
|---|---|
| `a choice with no options` | A `choice` setting has an empty or missing `options`. |
| `min is above max` | A `range` setting's `min` is above its `max`. |
| `step must be above 0` | A `range` setting's `step` is 0 or less. |
| `default "huge" is not one of the options` | The `default` is a value the setting can't take. |
| `unknown setting "hints"` | A `setting` condition names no declared setting. |
| `setting "textSize" is a ui setting; conditions read only play settings` | A `setting` condition names a ui setting. |

The checker also reports two settings with the same id, an `affects` other than `play` or `ui`, and a `setting` condition's `is` that the setting can't take.

## Caveats

- Conditions read only play settings. A preference the story branches on has to be a play setting, even when the player thinks of it as how the game looks.
