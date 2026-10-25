/**
 * Puts a runner of Small Town where a snippet has something to draw: played as
 * the player would where that's short, and with the debugger's commands, which
 * ignore locks, where it isn't.
 */
import { applyEffects, type CommandRef, type EffectRef, type Runner, type SaveMeta } from '@ifloom/engine'
import { devices } from '@ifloom/plugin-devices'
import { jobs } from '@ifloom/plugin-jobs'

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

/** Out on the high street for the first time: the note under the door is a notice. */
export function steppedOut(runner: Runner): void {
  unpacked(runner)
  send(runner, { 'debug/go': { id: 'high-street' } })
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

/** Runs effects on the runner's state, as a test or a tool would, and plays on from there. */
export function withEffects(runner: Runner, effects: EffectRef[]): void {
  runner.restore({ state: applyEffects(runner.state, runner.game, effects), meta: { played: 0 } as SaveMeta, missingPacks: [], missingPlugins: [] })
}

/** At the park: the ducks' roll is in, and the stones line has its inline action. */
export function inThePark(runner: Runner): void {
  unpacked(runner)
  send(runner, { 'debug/time': { day: 1, period: 'afternoon' } }, { 'debug/go': { id: 'park' } })
}

/** At home with the phone ringing: its timer running and the scene that answers it open. */
export function phoneRinging(runner: Runner): void {
  unpacked(runner)
  withEffects(runner, [{ scene: 'flat.ring' }, { timer: 'flat.ring' }])
}

/** Playing quick feet in the park. */
export function playingQuickFeet(runner: Runner): void {
  inThePark(runner)
  press(runner, 'arrows')
}

/** At home with the phone's texts open. */
export function readingTexts(runner: Runner): void {
  unpacked(runner)
  send(runner, devices.open('texts'))
}

/** The job board open, as Ava's Ask about weekend work opens it. */
export function atTheJobBoard(runner: Runner): void {
  inTheCafe(runner)
  withEffects(runner, [jobs.open()])
}

/** The states every snippet is drawn in by every.test.tsx. */
export const STATES: { name: string; play: (runner: Runner) => void }[] = [
  { name: 'moving day', play: () => {} },
  { name: 'stepped out', play: steppedOut },
  { name: 'in the café', play: inTheCafe },
  { name: 'at the counter', play: atTheCounter },
  { name: 'in the park', play: inThePark },
  { name: 'the phone ringing', play: phoneRinging },
  { name: 'playing quick feet', play: playingQuickFeet },
  { name: 'reading texts', play: readingTexts },
  { name: 'at the job board', play: atTheJobBoard },
]

/** Presses the button on screen with this id: a scene's choice or a room's action. */
export function press(runner: Runner, id: string): void {
  const view = runner.view()
  const button = [...view.scene.choices, ...view.actions].find((choice) => choice.id === id)
  if (!button) throw new Error(`No button "${id}" on screen, only ${[...view.scene.choices, ...view.actions].map((choice) => choice.id).join(', ')}.`)
  send(runner, button.command)
}
