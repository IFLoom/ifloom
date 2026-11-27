import { describe, expect, it } from 'vitest'
import { apply, holds, loadGame, view, whyNot, type Game, type GameState } from '@ifloom/engine'
import { freshState, loadChecked } from '@ifloom/engine/testing'
import { devices, type AppDef, type DevicesView } from '../src/index.ts'

const apps: AppDef[] = [
  { id: 'notes', name: 'Notes', icon: 'notes', on: 'laptop', sections: [{ blocks: [{ prose: 'notes.intro' }] }] },
  { id: 'bank', name: 'Bank', icon: 'bank', on: 'laptop', blocked: [{ when: { not: { kv: 'bankAccount' } }, reason: 'You have no account.' }], sections: [] },
  {
    id: 'mail',
    name: 'Mail',
    icon: 'mail',
    on: 'laptop',
    when: { kv: 'emailSetUp' },
    badge: { when: { kv: 'newMail' } },
    sections: [{ panel: 'inbox', with: { letters: 2 } }],
  },
]

function game(): Game {
  return loadChecked(
    [
      { name: 'base', data: { devices: { devices: [{ id: 'laptop', name: 'Laptop', frame: 'laptop' }], apps } } },
      {
        name: 'office',
        actions: [
          {
            id: 'setUpMail',
            effects: [
              { kv: 'emailSetUp', to: true },
              { kv: 'newMail', to: true },
            ],
          },
          { id: 'uninstall', effects: [{ kv: 'emailSetUp', to: false }] },
        ],
        prose: { 'notes.intro': 'Nothing written yet.' },
      },
    ],
    { id: 'desk', title: 'Desk', plugins: [devices()] },
  )
}

const laptop = (state: GameState, g: Game) => (view(state, g).plugins.devices as DevicesView).devices[0]

describe('devices', () => {
  it('show installed apps, greyed out with a reason while locked', () => {
    const g = game()
    expect(laptop(freshState(g), g).apps.map((app) => [app.id, app.disabled])).toEqual([
      ['notes', undefined],
      ['bank', 'You have no account.'],
    ])
    expect(whyNot(freshState(g), g, devices.open('bank'))).toBe('You have no account.')
    expect(whyNot(freshState(g), g, devices.open('mail'))).toBe('That is not installed.')
    expect(whyNot(freshState(g), g, devices.open('fax'))).toBe('There is no such app.')
  })

  it('open an app without moving the player or ending the turn, and fill in only that one', () => {
    const g = game()
    const before = freshState(g)
    const state = apply(before, g, devices.open('notes')).state
    expect(state.turn).toBe(before.turn)
    expect(laptop(state, g).open).toMatchObject({ id: 'notes', sections: [{ type: 'prose', text: 'Nothing written yet.' }] })
    expect(laptop(state, g).apps.every((app) => app.sections.length === 0)).toBe(true)
  })

  it('count a dot badge as one, and hand a panel what it is opened with', () => {
    const g = game()
    let state = apply(freshState(g), g, { type: 'action', id: 'setUpMail' }).state
    expect(laptop(state, g).badge).toBe(1)
    state = apply(state, g, devices.open('mail')).state
    expect(laptop(state, g).open?.sections).toEqual([{ type: 'panel', panel: 'inbox', with: { letters: 2 } }])
  })

  it('keep whether a device is out, and on what, in the save: put away, its home screen, or an app', () => {
    const g = game()
    const start = freshState(g)
    expect(laptop(start, g)).toMatchObject({ shown: false, open: null, close: null })
    expect(laptop(start, g).home).toMatchObject({ label: 'Home', command: { type: 'custom', name: 'devices/home', with: { id: 'laptop' } } })
    expect(whyNot(start, g, devices.close('laptop'))).toBe('That is put away.')
    const home = apply(start, g, laptop(start, g).home.command).state
    expect(home.plugins.devices.state).toEqual({ shown: { laptop: null } })
    expect(home.turn).toBe(start.turn)
    expect(laptop(home, g)).toMatchObject({ shown: true, open: null, close: { label: 'Close' } })
    expect(holds(home, g, { 'devices/open': { device: 'laptop' } })).toBe(true)
    const notes = apply(home, g, devices.open('notes')).state
    expect(laptop(notes, g)).toMatchObject({ shown: true, open: { id: 'notes' } })
    // Home from an app goes back to the home screen; close puts it away and forgets the app.
    expect(laptop(apply(notes, g, devices.home('laptop')).state, g)).toMatchObject({ shown: true, open: null })
    const away = apply(notes, g, laptop(notes, g).close!.command).state
    expect(away.plugins.devices.state).toEqual({ shown: {} })
    expect(laptop(away, g)).toMatchObject({ shown: false, open: null, close: null })
    expect(holds(away, g, { 'devices/open': { device: 'laptop' } })).toBe(false)
    // Opening an app brings its device out on it.
    expect(laptop(apply(start, g, devices.open('notes')).state, g)).toMatchObject({ shown: true, open: { id: 'notes' } })
  })

  it('close an app that stops being installed', () => {
    const g = game()
    let state = apply(apply(freshState(g), g, { type: 'action', id: 'setUpMail' }).state, g, devices.open('mail')).state
    state = apply(state, g, { type: 'action', id: 'uninstall' }).state
    expect(laptop(state, g).open).toBeNull()
    expect(apply(state, g, devices.open('notes')).ok).toBe(true)
  })

  it('report apps that name what the game does not have', () => {
    const bad: AppDef[] = [
      {
        id: 'x',
        name: 'X',
        icon: 'x',
        on: 'watch',
        badge: { value: 'nope/value' },
        sections: [{ things: { of: 'album' } }, { plugin: 'radio' }, { panel: 'nothing' }, { blocks: [{ prose: 'x.none' }] }],
      },
    ]
    const loaded = loadGame([{ name: 'base', data: { devices: { devices: [{ id: 'laptop', name: 'Laptop' }], apps: bad } } }], {
      id: 'g',
      title: 'g',
      plugins: [devices()],
    })
    expect(loaded.problems.map((problem) => problem.what)).toEqual([
      'unknown device "watch"',
      'no plugin value named "nope/value"; the game has no plugin "nope"',
      'unknown kind "album"',
      'no prose for "x.none"',
      'the game has no plugin named "radio"',
    ])
    expect(devices.appOpen('x')).toEqual({ 'devices/open': { app: 'x' } })
  })
})
