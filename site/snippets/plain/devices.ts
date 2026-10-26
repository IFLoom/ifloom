import type { RunnerSnapshot } from '@ifloom/engine'
import type { DeviceView } from '@ifloom/plugin-devices'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** Each device: a button that brings it out, and while it's out, its open app or else its home screen of apps, with Home and Close. */
export function drawDevices(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const device of view.plugins.devices?.devices ?? []) {
    const screen = add(parent, 'section', '', 'device')
    screen.dataset.device = device.id
    add(screen, 'h3', device.badge ? `${device.name} (${device.badge})` : device.name)
    // Whether it's out, and on what, is the game's state, so every UI shows the same.
    if (!device.shown) {
      drawChoices(screen, [{ ...device.home, label: `Take out the ${device.name}` }])
      continue
    }
    if (device.open) drawApp(screen, device)
    else
      drawChoices(
        screen,
        device.apps.map((app) => ({ id: app.id, label: app.name, disabled: app.disabled, command: app.command })),
      )
    // Home goes back from an app; Close puts it away.
    drawChoices(screen, device.open ? [device.home, device.close!] : [device.close!])
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
}
