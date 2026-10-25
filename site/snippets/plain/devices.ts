import type { View } from '@ifloom/engine'
import type { DeviceView } from '@ifloom/plugin-devices'
// runner, add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices, runner } from './runner.ts'

/** Each device: its open app, with a Home button, or else its home screen of apps, each with its badge. */
export function drawDevices(parent: HTMLElement, view: View): void {
  for (const device of view.plugins.devices?.devices ?? []) {
    const screen = add(parent, 'section', '', 'device')
    screen.dataset.device = device.id
    add(screen, 'h3', device.badge ? `${device.name} (${device.badge})` : device.name)
    if (device.open) drawApp(screen, device)
    else
      drawChoices(
        screen,
        device.apps.map((app) => ({ id: app.id, label: app.name, disabled: app.disabled, command: app.command })),
      )
  }
}

/** The open app's sections. A `plugin` section is the messages' or the feed's, drawn as their pages show. */
function drawApp(screen: HTMLElement, device: DeviceView): void {
  for (const section of device.open?.sections ?? []) {
    if (section.type === 'prose') add(screen, 'p', section.text)
    else if (section.type === 'actions') drawChoices(add(screen, 'div'), section.actions)
    else if (section.type === 'list') {
      for (const entry of section.entries) {
        const row = add(screen, 'div', '', 'entry')
        add(row, 'strong', entry.title)
        add(row, 'p', entry.text)
        drawChoices(row, entry.actions)
      }
    }
  }
  add(screen, 'button', 'Home').onclick = () => runner.apply({ 'devices/close': { id: device.id } })
}
