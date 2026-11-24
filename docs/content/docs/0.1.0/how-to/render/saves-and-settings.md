---
title: "Render saves, settings and the backlog"
description: "Render a save and load screen, a settings screen and the backlog with Undo in a UI of your own, in plain JS, React or Vue."
---
Render the screens a player opens from a menu: saves to load, settings to change, and the [backlog](/docs/0.1.0/api/engine#backlogentry) of what was shown, with Undo. Set up the runner first, as [Start your own UI](/docs/0.1.0/how-to/render/start) shows. These parts read the runner's [snapshot](/docs/0.1.0/reference/glossary#snapshot) as well as its view, because saves, setting values, the backlog and undo belong to the runner rather than to the game state.

## Render a save and load screen

`snapshot.saves` lists the saves in the runner's save store, newest first, then any that can't be read. Each is a [`SaveMeta`](/docs/0.1.0/api/engine#savemeta) with its `name`, or `{ slot, broken }` with why it can't be read. The React UI's [`GameMenu`](/docs/0.1.0/api/react#gamemenu) opens its [`SavesMenu`](/docs/0.1.0/api/react#savesmenu), which you can also place yourself, and [`useSaves`](/docs/0.1.0/api/react#usesaves) does everything it does without its look.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
import { nextSlot } from '@ifloom/browser'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** A Save button, greyed out while the game refuses saving, and a row for each save with Load and Delete. */
export function drawSaves(parent: HTMLElement, { view, saves }: RunnerSnapshot): void {
  const { allowed, reason, visible } = view.saving
  if (visible) {
    const save = add(parent, 'button', 'Save')
    save.disabled = !allowed
    if (reason) save.title = reason
    // Each save in a slot of its own, '1', '2', ..., named from view.when, such as "Day 2 · Tuesday morning · The Corner Café".
    save.onclick = () => void runner.save(nextSlot(saves))
  }
  // The snapshot lists the saves, and the runner hands a new one after every save and delete.
  const list = add(parent, 'ul', '', 'slots')
  for (const entry of saves) {
    const row = add(list, 'li')
    // A save that can't be read says why, and can only be deleted.
    add(row, 'span', 'broken' in entry ? entry.broken : entry.name)
    if (!('broken' in entry)) add(row, 'button', 'Load').onclick = () => void runner.load(entry.slot)
    add(row, 'button', 'Delete').onclick = () => void runner.saves?.remove(entry.slot)
  }
}
```

```tsx tab="React" tab-group="framework"
import { SavesMenu, Section, useSaves } from '@ifloom/react'

// The game menu (GameMenu) opens the saves menu. To place it yourself, in a section that opens a dialog:
export function Saves() {
  return (
    <Section id="saves" title="Saves" dialog>
      <SavesMenu />
    </Section>
  )
}

// Or a button of your own, from useSaves.
export function QuickSave() {
  const saves = useSaves()
  if (!saves.available || !saves.saving.visible) return null
  return (
    <button disabled={!saves.saving.allowed} title={saves.saving.reason ?? undefined} onClick={() => void saves.save('Before the park')}>
      Quick save
    </button>
  )
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { nextSlot } from '@ifloom/browser'
import { runner, snapshot, view } from './runner.ts'

// A Save button, greyed out while the game refuses saving, and a row for each save with Load and Delete.
// The snapshot lists the saves, and the runner hands a new one after every save and delete.
// Each save in a slot of its own, '1', '2', ..., named from view.when, such as "Day 2 · Tuesday morning · The Corner Café".
const save = () => runner.save(nextSlot(snapshot.value.saves))
</script>

<template>
  <button v-if="view.saving.visible" :disabled="!view.saving.allowed" :title="view.saving.reason ?? undefined" @click="save">Save</button>
  <ul class="slots">
    <li v-for="entry in snapshot.saves" :key="entry.slot">
      <!-- A save that can't be read says why, and can only be deleted. -->
      <template v-if="'broken' in entry">{{ entry.broken }}</template>
      <template v-else>
        {{ entry.name }}
        <button @click="runner.load(entry.slot)">Load</button>
      </template>
      <button @click="runner.saves?.remove(entry.slot)">Delete</button>
    </li>
  </ul>
</template>
```

Save with `runner.save(slot)`, in a new numbered slot from [`nextSlot`](/docs/0.1.0/api/browser#nextslot), which skips named slots such as `auto`. Load with `runner.load(slot)`, and delete through the store with `runner.saves.remove(slot)`. Each is async and answers a [`Result`](/docs/0.1.0/reference/common#result) rather than throwing, so show its `reason` when it fails. The runner keeps `snapshot.saves` up to date, and a load replaces the game in play and calls your listener, so the screen renders again without code of yours.

`view.saving` says whether the game allows saving now, as a [`SavingView`](/docs/0.1.0/api/engine#savingview). Grey Save out while `allowed` is false, with `reason` as its title, and leave it off the screen while `visible` is false. A Continue button loads the first save in the list that isn't broken, the autosave included. [Write a save driver](/docs/0.1.0/how-to/write-a-save-driver) keeps saves somewhere other than `localStorage`.

## Render a settings screen

`view.settings` lists every [setting](/docs/0.1.0/reference/settings) the game declares, in order, as a [`SettingView`](/docs/0.1.0/api/engine#settingview) with its `label`, its `type`, its `default`, and the `options` of a choice or the range of a slider. The React UI renders a Settings page when you turn on its `pages`, and [`useSetting`](/docs/0.1.0/api/react#usesetting) reads one setting for a component of your own.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** A settings screen: every setting the game declares, with its value now. A change goes through runner.setSetting. */
export function drawSettings(parent: HTMLElement, { view, settings }: RunnerSnapshot): void {
  // settings has the values of both kinds: play settings from the state, ui settings from the profile.
  for (const setting of view.settings) {
    const label = add(parent, 'label', setting.label)
    const value = settings[setting.id] ?? setting.default
    if (setting.type === 'toggle') {
      const box = add(label, 'input')
      Object.assign(box, { type: 'checkbox', checked: value === true })
      box.onchange = () => runner.setSetting(setting.id, box.checked)
    } else if (setting.type === 'choice') {
      const select = add(label, 'select')
      for (const option of setting.options ?? []) Object.assign(add(select, 'option', option.label), { value: option.value, selected: option.value === value })
      select.onchange = () => runner.setSetting(setting.id, select.value)
    } else {
      const range = add(label, 'input')
      Object.assign(range, {
        type: 'range',
        min: String(setting.min ?? 0),
        max: String(setting.max ?? 100),
        step: String(setting.step ?? 1),
        value: String(value),
      })
      range.onchange = () => runner.setSetting(setting.id, Number(range.value))
    }
  }
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import module from './game.ts'

// `pages` opens on a title screen whose Settings page renders every setting the game declares, play and ui alike.
mountGame(module.build(), { pages: true })
```

```tsx tab="React" tab-group="framework"
import type { ReactNode } from 'react'
import { useSetting } from '@ifloom/react'

// A ui setting does what your UI makes of it: here, Small Town's text size, read with useSetting.
export function TextSize({ children }: { children?: ReactNode }) {
  const size = useSetting('textSize')
  return <div style={{ fontSize: size === 'large' ? '1.25rem' : undefined }}>{children}</div>
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import type { KvValue } from '@ifloom/engine'
import { runner, snapshot, view } from './runner.ts'

// A settings screen: every setting the game declares, with its value now. A change goes through runner.setSetting.
// snapshot.settings has both kinds: play settings from the state, ui settings from the profile.
const valueOf = (id: string, fallback: KvValue) => snapshot.value.settings[id] ?? fallback
const set = (id: string, to: KvValue) => runner.setSetting(id, to)
</script>

<template>
  <label v-for="setting in view.settings" :key="setting.id">
    {{ setting.label }}
    <input
      v-if="setting.type === 'toggle'"
      type="checkbox"
      :checked="valueOf(setting.id, setting.default) === true"
      @change="set(setting.id, ($event.target as HTMLInputElement).checked)"
    />
    <select
      v-else-if="setting.type === 'choice'"
      :value="valueOf(setting.id, setting.default)"
      @change="set(setting.id, ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="option in setting.options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    <input
      v-else
      type="range"
      :min="setting.min ?? 0"
      :max="setting.max ?? 100"
      :step="setting.step ?? 1"
      :value="valueOf(setting.id, setting.default)"
      @change="set(setting.id, Number(($event.target as HTMLInputElement).value))"
    />
  </label>
</template>
```

Read each setting's value from `snapshot.settings`, which holds both kinds. A `play` setting is part of the game state, and the [profile](/docs/0.1.0/reference/profile) keeps a `ui` setting, never the state. Change either kind with `runner.setSetting(id, to)`, which checks the value against the declaration and answers a `Result`. A `ui` setting does only what your UI makes of it, so copy it where your stylesheet can read it, such as `document.documentElement.dataset.textSize`. The runner calls your listener when a setting changes, so the screen renders again.

## Render the backlog and undo

`snapshot.backlog` lists what was shown, oldest first, each a [`BacklogEntry`](/docs/0.1.0/api/engine#backlogentry) with its `title`, its `beats` and the choice the player made. `snapshot.canUndo` and `snapshot.canRedo` say whether `runner.undo()` and `runner.redo()` have a step to take. The React UI's `GameMenu` offers the backlog and Undo when the runner has them, and [`Backlog`](/docs/0.1.0/api/react#backlog) renders the backlog wherever you place it.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts. The runner's backlog is on: browserRunner(game, { backlog: true }).
import { add, runner } from './runner.ts'

/** What was shown, oldest first, each scene's choice after its words, and a button that steps back one command. */
export function drawBacklog(parent: HTMLElement, { backlog, canUndo }: RunnerSnapshot): void {
  const undo = add(parent, 'button', 'Undo')
  undo.disabled = !canUndo
  undo.onclick = () => runner.undo()
  const list = add(parent, 'ol', '', 'backlog')
  for (const entry of backlog) {
    const item = add(list, 'li')
    add(item, 'h3', entry.title)
    for (const beat of entry.beats) if (beat.type === 'text' || beat.type === 'say') add(item, 'p', beat.text)
    if (entry.chose) add(item, 'p', entry.chose, 'chose')
  }
}
```

```tsx tab="React" tab-group="framework"
import { Backlog, Section, useGame, useWords } from '@ifloom/react'
import { Button } from '@ifloom/react/kit'

// The game menu (GameMenu) offers the backlog and undo when the runner has them. To place them yourself:
// a section that opens the backlog in a dialog, and an Undo button.
export function History() {
  const words = useWords()
  const { runner, snapshot } = useGame()
  return (
    <>
      <Section id="backlog" title={words('backlog')} dialog>
        <Backlog />
      </Section>
      <Button variant="outline" disabled={!snapshot.canUndo} onClick={() => runner.undo()}>
        Undo
      </Button>
    </>
  )
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { runner, snapshot } from './runner.ts'

// What was shown, oldest first, each scene's choice after its words, and a button that steps back one command.
// The runner's backlog is on: browserRunner(game, { backlog: true }).
</script>

<template>
  <button :disabled="!snapshot.canUndo" @click="runner.undo()">Undo</button>
  <ol class="backlog">
    <li v-for="(entry, at) in snapshot.backlog" :key="at">
      <h3>{{ entry.title }}</h3>
      <template v-for="(beat, index) in entry.beats" :key="index">
        <p v-if="beat.type === 'text' || beat.type === 'say'">{{ beat.text }}</p>
      </template>
      <p v-if="entry.chose" class="chose">{{ entry.chose }}</p>
    </li>
  </ol>
</template>
```

The backlog stays empty unless the runner has it on, with `browserRunner(game, { backlog: true })`. The backlog keeps inline actions as plain words, so nothing in it can be pressed. `browserRunner` turns undo on, 50 steps deep, and `runner.offers` says which of the two a menu should offer.

For more on what these sections render, see:

- [Saves](/docs/0.1.0/reference/saves), [Settings](/docs/0.1.0/reference/settings), [The profile](/docs/0.1.0/reference/profile) and [The runner](/docs/0.1.0/reference/runner).
- [Browser helpers](/docs/0.1.0/api/browser), for `browserRunner` and `nextSlot`.
- [Add a settings page](/docs/0.1.0/how-to/add-a-settings-page) and [Write a save driver](/docs/0.1.0/how-to/write-a-save-driver).
