import { describe, expect, it } from 'vitest'
import { applyEffects, loadGame, startingState, view, type Game } from '@ifloom/engine'
import { calendar, pass, sleep } from '@ifloom/plugin-calendar'
import { go, places } from '@ifloom/plugin-places'
import { explorer, metricsText, playtest, snapshot } from '../src/index.ts'

const clock = calendar()

/** Three rooms in a row, a bed at one end, and something to do at the other. */
function game(): Game {
  return loadGame(
    [
      {
        name: 'row',
        stats: [{ id: 'carrots', label: 'Carrots' }],
        activities: [
          { id: 'dig', effects: [pass(1), { kind: 'stat', stat: 'carrots', by: 1 }] },
          { id: 'wait', effects: [pass(1)] },
        ],
        scenes: [{ id: 'wake', title: 'Morning', body: [{ text: 'wake' }], choices: [{ id: 'up', effects: [{ kind: 'scene', scene: null }] }] }],
        data: {
          places: {
            locations: [
              {
                id: 'bedroom',
                name: 'Bedroom',
                tag: 'Home',
                exits: ['hall'],
                art: '',
                body: [{ text: 'bedroom' }],
                actions: [{ id: 'bed', label: 'Sleep', command: sleep() }],
              },
              { id: 'hall', name: 'Hall', tag: 'Home', exits: ['bedroom', 'garden'], art: '', body: [{ text: 'hall' }] },
              {
                id: 'garden',
                name: 'Garden',
                tag: 'Out',
                exits: ['hall'],
                art: '',
                body: [{ text: 'garden' }],
                actions: [{ id: 'dig', label: 'Dig', command: { type: 'activity', id: 'dig' } }],
              },
            ],
          },
        },
        prose: { bedroom: 'A bed.', hall: 'A hall.', garden: 'Soil.', wake: 'You wake.', 'wake#up': 'Get up' },
      },
    ],
    {
      id: 'row',
      title: 'Row',
      introScene: 'wake',
      plugins: [clock, places({ start: 'bedroom' })],
      actions: [{ id: 'wait', label: 'Wait', command: { type: 'activity', id: 'wait' } }],
    },
  ).game
}

describe('playtest', () => {
  it('plays turn by turn with the explorer: digging every day, walking home to bed', () => {
    const g = game()
    const result = playtest(g, clock.write(startingState(g), { day: 0, period: 'morning' }), explorer(), { turns: 3 })
    expect(result.refusals).toEqual([])
    const carrots = result.turns.map((turn) => turn.stats.carrots)
    // A carrot or more every turn (a day, here) it played, and never fewer than the one before.
    expect(carrots.slice(0, 3).every((count, day) => count > (carrots[day - 1] ?? 0))).toBe(true)
    expect(result.transcript).toContain('== Turn 1 · Day 1 · Monday morning · Bedroom')
    expect(result.transcript).toContain('[>] Dig')
    expect(metricsText(result.turns).split('\n')[0]).toBe('turn\tcarrots\tscenes\trefused')
  })

  it('stops a policy that keeps being refused', () => {
    const g = game()
    const result = playtest(g, startingState(g), () => go('garden'), { turns: 3 })
    expect(result.refusals.length).toBe(2)
  })
})

describe('snapshot', () => {
  it('renders every scene and place in every probe', () => {
    const g = game()
    const text = snapshot(g, [{ name: 'start', state: startingState(g) }])
    expect(text).toContain('=== wake @ start\nYou wake.\n  [>] Get up')
    expect(text).toContain('=== place:garden @ start\nSoil.')
  })

  it("reads as the engine's view does: a choice a lock refuses is greyed out with its reason", () => {
    const plain = game()
    const start = startingState(plain)
    const g: Game = { ...plain, rules: { ...plain.rules, locks: [{ when: { phase: [start.phase] }, deny: ['choose'], reason: 'Too sleepy.' }] } }
    const text = snapshot(g, [{ name: 'start', state: start }])
    expect(text).toContain('=== wake @ start\nYou wake.\n  [ ] Get up — Too sleepy.')
    // The same words and choices the player's screen gets, scene and room.
    const scene = view({ ...start, sceneId: 'wake' }, g).scene
    expect(scene.choices.map((choice) => choice.disabled)).toEqual(['Too sleepy.'])
    const room = view(applyEffects({ ...start, sceneId: null }, g, [{ kind: 'custom', name: 'places/move', with: { location: 'hall' } }]), g).scene
    expect(text).toContain(`=== place:hall @ start\n${room.body}`)
    expect(room.body).toBe('A hall.')
  })
})
