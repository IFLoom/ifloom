import { describe, expect, it } from 'vitest'
import { apply, loadGame, startingState, view, whyNot, type Game, type GameState } from '@ifloom/engine'
import { devices, type AppDef, type DevicesView } from '../src/index.ts'

const apps: AppDef[] = [
  { id: 'notes', name: 'Notes', icon: 'notes', on: 'laptop', sections: [{ prose: [{ prose: 'notes.intro' }] }] },
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
  const loaded = loadGame(
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
  expect(loaded.problems).toEqual([])
  return loaded.game
}

const begin = (g: Game): GameState => ({ ...startingState(g), sceneId: null })
const laptop = (state: GameState, g: Game) => (view(state, g).plugins.devices as DevicesView).devices[0]

describe('devices', () => {
  it('show installed apps, greyed out with a reason while locked', () => {
    const g = game()
    expect(laptop(begin(g), g).apps.map((app) => [app.id, app.disabled])).toEqual([
      ['notes', undefined],
      ['bank', 'You have no account.'],
    ])
    expect(whyNot(begin(g), g, devices.open('bank'))).toBe('You have no account.')
    expect(whyNot(begin(g), g, devices.open('mail'))).toBe('That is not installed.')
    expect(whyNot(begin(g), g, devices.open('fax'))).toBe('There is no such app.')
  })

  it('open an app without moving the player or ending the turn, and fill in only that one', () => {
    const g = game()
    const before = begin(g)
    const state = apply(before, g, devices.open('notes')).state
    expect(state.turn).toBe(before.turn)
    expect(laptop(state, g).open).toMatchObject({ id: 'notes', sections: [{ type: 'prose', text: 'Nothing written yet.' }] })
    expect(laptop(state, g).apps.every((app) => app.sections.length === 0)).toBe(true)
  })

  it('count a dot badge as one, and hand a panel what it is opened with', () => {
    const g = game()
    let state = apply(begin(g), g, { type: 'action', id: 'setUpMail' }).state
    expect(laptop(state, g).badge).toBe(1)
    state = apply(state, g, devices.open('mail')).state
    expect(laptop(state, g).open?.sections).toEqual([{ type: 'panel', panel: 'inbox', with: { letters: 2 } }])
  })

  it('close an app that stops being installed', () => {
    const g = game()
    let state = apply(apply(begin(g), g, { type: 'action', id: 'setUpMail' }).state, g, devices.open('mail')).state
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
        sections: [{ things: { of: 'album' } }, { plugin: 'radio' }, { panel: 'nothing' }, { prose: [{ prose: 'x.none' }] }],
      },
    ]
    const loaded = loadGame([{ name: 'base', data: { devices: { devices: [{ id: 'laptop', name: 'Laptop' }], apps: bad } } }], {
      id: 'g',
      title: 'g',
      plugins: [devices()],
    })
    expect(loaded.problems.map((problem) => problem.what)).toEqual([
      'unknown device "watch"',
      'no custom value named "nope/value"',
      'unknown kind "album"',
      'no prose for "x.none"',
      'the game has no plugin named "radio"',
    ])
    expect(devices.appOpen('x')).toEqual({ 'devices/open': { app: 'x' } })
  })
})
