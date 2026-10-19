import { describe, expect, it } from 'vitest'
import { apply, loadGame, startingState, view, whyNot, type Game, type GameState } from '@ifloom/engine'
import { appOpen, devices, openApp, type AppDef, type DevicesView } from '../src/index.ts'

const apps: AppDef[] = [
  { id: 'notes', name: 'Notes', icon: 'notes', on: 'laptop', sections: [{ prose: [{ text: 'notes.intro' }] }] },
  { id: 'bank', name: 'Bank', icon: 'bank', on: 'laptop', blocked: [{ when: { not: { kv: 'bankAccount' } }, reason: 'You have no account.' }], sections: [] },
  { id: 'mail', name: 'Mail', icon: 'mail', on: 'laptop', when: { kv: 'emailSetUp' }, badge: { when: { kv: 'newMail' } }, sections: [{ panel: 'inbox' }] },
]

function game(): Game {
  const loaded = loadGame(
    [
      {
        name: 'office',
        activities: [
          {
            id: 'setUpMail',
            effects: [
              { kind: 'kv', key: 'emailSetUp', to: true },
              { kind: 'kv', key: 'newMail', to: true },
            ],
          },
          { id: 'uninstall', effects: [{ kind: 'kv', key: 'emailSetUp', to: false }] },
        ],
        prose: { 'notes.intro': 'Nothing written yet.' },
        custom: { panels: { inbox: () => ({ letters: 2 }) } },
      },
    ],
    { id: 'desk', title: 'Desk', plugins: [devices()], data: { devices: { devices: [{ id: 'laptop', name: 'Laptop', frame: 'laptop' }], apps } } },
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
    expect(whyNot(begin(g), g, openApp('bank'))).toBe('You have no account.')
    expect(whyNot(begin(g), g, openApp('mail'))).toBe('That is not installed.')
    expect(whyNot(begin(g), g, openApp('fax'))).toBe('There is no such app.')
  })

  it('open an app without moving the player or ending the turn, and fill in only that one', () => {
    const g = game()
    const before = begin(g)
    const state = apply(before, g, openApp('notes')).state
    expect(state.turn).toBe(before.turn)
    expect(laptop(state, g).open).toMatchObject({ id: 'notes', sections: [{ kind: 'prose', text: 'Nothing written yet.' }] })
    expect(laptop(state, g).apps.every((app) => app.sections.length === 0)).toBe(true)
  })

  it('count a dot badge as one, and hand a panel its data', () => {
    const g = game()
    let state = apply(begin(g), g, { type: 'activity', id: 'setUpMail' }).state
    expect(laptop(state, g).badge).toBe(1)
    state = apply(state, g, openApp('mail')).state
    expect(laptop(state, g).open?.sections).toEqual([{ kind: 'panel', panel: 'inbox', data: { letters: 2 } }])
  })

  it('close an app that stops being installed', () => {
    const g = game()
    let state = apply(apply(begin(g), g, { type: 'activity', id: 'setUpMail' }).state, g, openApp('mail')).state
    state = apply(state, g, { type: 'activity', id: 'uninstall' }).state
    expect(laptop(state, g).open).toBeNull()
    expect(apply(state, g, openApp('notes')).ok).toBe(true)
  })

  it('report apps that name what the game does not have', () => {
    const bad: AppDef[] = [
      {
        id: 'x',
        name: 'X',
        icon: 'x',
        on: 'watch',
        badge: { value: 'nope/value' },
        sections: [{ collection: 'album' }, { plugin: 'radio' }, { panel: 'nothing' }, { prose: [{ text: 'x.none' }] }],
      },
    ]
    const loaded = loadGame([], { id: 'g', title: 'g', plugins: [devices()], data: { devices: { devices: [{ id: 'laptop', name: 'Laptop' }], apps: bad } } })
    expect(loaded.problems.map((problem) => problem.what)).toEqual([
      'unknown device "watch"',
      'no custom value named "nope/value"',
      'unknown collection "album"',
      'no custom panel named "nothing"',
      'no prose for "x.none"',
      'the game has no plugin named "radio"',
    ])
    expect(appOpen('x')).toEqual({ 'devices/open': { app: 'x' } })
  })
})
