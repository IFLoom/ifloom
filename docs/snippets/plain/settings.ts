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
