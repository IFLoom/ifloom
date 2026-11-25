import { describe, expect, it } from 'vitest'
import { applyEffects, loadGame, say, startingState, view, type Game } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { explorer, metricsText, playtest, snapshot, type Policy } from '../src/index.ts'

const clock = calendar()

/** Three rooms in a row, a bed at one end, and something to do at the other. */
function game(): Game {
  return loadGame(
    [
      { name: 'base', introScene: 'wake', actions: [] },
      {
        name: 'row',
        stats: [{ id: 'carrots', label: 'Carrots' }],
        actions: [
          { id: 'dig', effects: [calendar.pass(1), { stat: 'carrots', by: 1 }] },
          { id: 'wait', label: 'Wait', effects: [calendar.pass(1)] },
        ],
        scenes: [{ id: 'wake', title: 'Morning', body: [{ prose: 'wake' }], choices: [{ id: 'up', label: 'Get up', effects: [{ scene: null }] }] }],
        entities: [
          places.location({
            id: 'bedroom',
            name: 'Bedroom',
            description: 'Home',
            exits: ['hall'],
            body: [{ prose: 'bedroom' }],
            actions: [{ id: 'bed', label: 'Sleep', command: calendar.sleep() }],
          }),
          places.location({ id: 'hall', name: 'Hall', description: 'Home', exits: ['bedroom', 'garden'], body: [{ prose: 'hall' }] }),
          places.location({
            id: 'garden',
            name: 'Garden',
            description: 'Out',
            exits: ['hall'],
            body: [{ prose: 'garden' }],
            actions: [{ id: 'dig', label: 'Dig', command: { type: 'action', id: 'dig' } }],
          }),
        ],
        prose: { bedroom: 'A bed.', hall: 'A hall.', garden: 'Soil.', wake: 'You wake.' },
      },
    ],
    {
      id: 'row',
      title: 'Row',
      plugins: [clock, places({ start: 'bedroom' })],
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
    // The places' `location` kind isn't listed, so it isn't a column.
    expect(metricsText(result.turns).split('\n')[0]).toBe('turn\tcarrots\tscenes\trefused')
  })

  it('counts the kinds the game lists, and leaves out those it never lists', () => {
    const g = loadGame(
      [
        { name: 'base', actions: [] },
        {
          name: 'shed',
          kinds: [
            { id: 'pot', label: 'Pot' },
            { id: 'seed', label: 'Seed', listed: { entity: '$', at: 'you' } },
            { id: 'note', label: 'Note', listed: false },
          ],
          entities: [
            { id: 'clay', of: 'pot', name: 'Clay pot' },
            { id: 'bean', of: 'seed', name: 'Bean' },
            { id: 'list', of: 'note', name: 'List' },
          ],
          actions: [{ id: 'wait', label: 'Wait', effects: [{ turn: true }] }],
        },
      ],
      { id: 'shed', title: 'Shed' },
    ).game
    const result = playtest(g, startingState(g), explorer(), { turns: 1 })
    expect(metricsText(result.turns).split('\n')[0]).toBe('turn\tpot\tseed\tscenes\trefused')
  })

  it('stops a policy that keeps being refused', () => {
    const g = game()
    const result = playtest(g, startingState(g), () => places.go('garden'), { turns: 3 })
    expect(result.refusals.length).toBe(2)
  })

  it('waits for a running timer when there is nothing new to do, so what it brings happens', () => {
    const g = loadGame(
      [
        {
          name: 'oven',
          timers: [{ id: 'oven', ms: 4000, effects: [{ kv: 'baked', to: true }] }],
          actions: [{ id: 'bake', label: 'Bake', once: { per: 'game' }, effects: [{ timer: 'oven' }] }],
        },
      ],
      { id: 'oven', title: 'Oven' },
    ).game
    const result = playtest(g, { ...startingState(g), sceneId: null }, explorer(), { steps: 4 })
    expect(result.transcript).toContain('> {"type":"tick","ms":4000}')
    expect(result.state.kv.baked).toBe(true)
  })

  it('writes each notice once, under the screen it first shows on, and a scene’s inputs with what they hold', () => {
    const g = loadGame(
      [
        {
          name: 'flat',
          introScene: 'hello',
          inputs: [{ id: 'name', label: 'Your name', type: 'text' }],
          scenes: [{ id: 'hello', title: 'Hello', body: [{ prose: 'hello' }], choices: [{ id: 'in', label: 'Go in', effects: [{ scene: null }] }] }],
          prose: { hello: 'A door.' },
          actions: [
            { id: 'rent', label: 'Pay rent', once: { per: 'game' }, effects: [{ notify: 'Rent paid', text: 'The landlord nods.' }] },
            { id: 'wait', label: 'Wait', effects: [{ turn: true }] },
          ],
        },
      ],
      { id: 'flat', title: 'Flat' },
    ).game
    const result = playtest(g, startingState(g), explorer(), { turns: 2 })
    expect(result.transcript).toContain('# Hello\nA door.\n  [>] Go in\n  [input] Your name: —')
    expect(result.transcript.split('! Rent paid: The landlord nods.').length - 1).toBe(1)
  })

  it('writes each spoken line under who says it, from a say() block or an @id: line in prose', () => {
    const g = loadGame(
      [
        {
          name: 'cafe',
          introScene: 'counter',
          kinds: [{ id: 'character', label: 'Person', unique: true }],
          entities: [{ id: 'ava', of: 'character', name: 'Ava' }],
          scenes: [
            {
              id: 'counter',
              title: 'The counter',
              body: [say('ava', 'Morning.'), { text: '@you: "A tea, please."' }, { text: 'Rain on the window.' }],
              choices: [{ id: 'sit', label: 'Sit down', effects: [{ scene: null }] }],
            },
          ],
        },
      ],
      { id: 'cafe', title: 'Café' },
    ).game
    const result = playtest(g, startingState(g), explorer(), { turns: 1 })
    expect(result.transcript).toContain('# The counter\nAva: "Morning."\n\nYou: "A tea, please."\n\nRain on the window.\n  [>] Sit down')
  })

  it('stops going round in circles, rather than walking between two rooms until the step limit', () => {
    const g = game()
    const start = { ...clock.write(startingState(g), { day: 0, period: 'morning' }), sceneId: null }
    const bounce: Policy = (_screen, state) => ((state.plugins.places.state as { at: string }).at === 'bedroom' ? places.go('hall') : places.go('bedroom'))
    const result = playtest(g, start, bounce, { turns: 3 })
    expect(result.transcript).toContain('going round in circles')
    expect(result.transcript.split('\n> ').length).toBeLessThan(10)
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
    const g: Game = { ...plain, rules: { ...plain.rules }, locks: [{ when: { all: [] }, deny: ['choose'], reason: 'Too sleepy.' }] }
    const text = snapshot(g, [{ name: 'start', state: start }])
    expect(text).toContain('=== wake @ start\nYou wake.\n  [ ] Get up — Too sleepy.')
    // The same words and choices the player's screen gets, scene and room.
    const scene = view({ ...start, sceneId: 'wake' }, g).scene
    expect(scene.choices.map((choice) => choice.disabled)).toEqual(['Too sleepy.'])
    const room = view(applyEffects({ ...start, sceneId: null }, g, [{ 'places/move': { location: 'hall' } }]), g).scene
    expect(text).toContain(`=== place:hall @ start\n${room.body}`)
    expect(room.body).toBe('A hall.')
  })
})
