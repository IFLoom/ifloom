/**
 * Puts a runner of Small Town where a snippet has something to draw: played as
 * the player would where that's short, and with the debugger's commands, which
 * ignore locks, where it isn't.
 */
import type { CommandRef, Runner } from '@ifloom/engine'

/** Sends each command, and fails the test on a refusal. */
export function send(runner: Runner, ...commands: CommandRef[]): void {
  for (const command of commands) {
    const sent = runner.apply(command)
    if (!sent.ok) throw new Error(`${JSON.stringify(command)}: ${sent.reason}`)
  }
}

/** Moving day done: the boxes unpacked, so the town is open. */
export function unpacked(runner: Runner): void {
  send(runner, { type: 'choose', id: 'unpack' })
}

/** A Tuesday morning in the café, with 20 coins. */
export function inTheCafe(runner: Runner): void {
  unpacked(runner)
  send(runner, { 'debug/time': { day: 1, period: 'morning' } }, { 'debug/go': { id: 'cafe' } }, { 'debug/stat': { stat: 'coins', to: 20 } })
}

/** In the café with the counter open, as its Go to the counter button does. */
export function atTheCounter(runner: Runner): void {
  inTheCafe(runner)
  press(runner, 'counter')
}

/** The states every snippet is drawn in by every.test.tsx. */
export const STATES: { name: string; play: (runner: Runner) => void }[] = [
  { name: 'moving day', play: () => {} },
  { name: 'in the café', play: inTheCafe },
  { name: 'at the counter', play: atTheCounter },
]

/** Presses the button on screen with this id: a scene's choice or a room's action. */
export function press(runner: Runner, id: string): void {
  const view = runner.view()
  const button = [...view.scene.choices, ...view.actions].find((choice) => choice.id === id)
  if (!button) throw new Error(`No button "${id}" on screen, only ${[...view.scene.choices, ...view.actions].map((choice) => choice.id).join(', ')}.`)
  send(runner, button.command)
}
