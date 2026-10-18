import { describe, expect, it } from 'vitest'
import { SCHEMA, apply, holds, pluginQuery, loadGame, startingState, view, whyNot, type Game, type GameState, type Pack, type CommandRef } from '@ifloom/engine'
import { calendar, period } from '@ifloom/plugin-calendar'
import { go, places } from '@ifloom/plugin-places'
import { call, cast, hasMet, here, isAt, person, talk, type CastView, type CharacterDef } from '../src/index.ts'

const ava: CharacterDef = {
  id: 'ava',
  name: 'Ava',
  fullName: 'Ava Marsh',
  role: 'Runs the café',
  hue: 20,
  home: 'park',
  // At the counter in the day; by the river otherwise.
  schedule: [{ location: 'cafe', when: period('morning', 'afternoon') }],
  // By the river, once she is a friend, a different conversation.
  talk: [
    { scene: 'ava.river', when: { all: [isAt('ava', 'park'), { stat: 'friendship', of: '$', gte: 25 }] }, label: 'Walk with Ava' },
    { scene: 'ava.hi' },
  ],
  call: { scene: 'ava.call', when: period('evening', 'night'), busy: 'She’s at the counter. Try this evening.' },
  storyline: 'ava',
}
const sam: CharacterDef = { id: 'sam', name: 'Sam', home: 'park', talk: 'sam.hi', stats: { friendship: 5 } }

const scene = (id: string) => ({ id, body: [{ text: id }], choices: [{ id: 'bye', effects: [{ kind: 'scene' as const, scene: null }] }] })

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  stats: [{ id: 'friendship', label: 'Friendship', of: 'character' }],
  storylines: [{ id: 'ava', name: 'Ava' }],
  scenes: ['ava.hi', 'ava.river', 'ava.call', 'sam.hi'].map(scene),
  prose: { 'ava.hi': 'Hi.', 'ava.river': 'Ducks.', 'ava.call': 'Hello?', 'sam.hi': 'Hey.', 'ava.hi#bye': 'Bye', 'ava.river#bye': 'Bye', 'ava.call#bye': 'Bye', 'sam.hi#bye': 'Bye' },
  data: {
    places: {
      locations: [
        { id: 'street', name: 'Street', tag: 'Town', exits: ['cafe', 'park'], art: '', body: [] },
        { id: 'cafe', name: 'Café', tag: 'Town', exits: ['street'], art: '', body: [] },
        { id: 'park', name: 'Park', tag: 'Town', exits: ['street'], art: '', body: [] },
      ],
    },
    cast: { characters: [ava, sam] },
  },
}

function game(withPlaces = true): { game: Game; clock: ReturnType<typeof calendar> } {
  const clock = calendar()
  // Without places, the town's map goes too: nobody is anywhere the player can be.
  const pack = withPlaces ? town : { ...town, data: { cast: town.data!.cast } }
  const { game, problems } = loadGame([pack], {
    id: 'town',
    title: 'Town',
    plugins: [clock, ...(withPlaces ? [places({ start: 'street' })] : []), cast()],
  })
  expect(problems).toEqual([])
  return { game, clock }
}

function run(g: Game, state: GameState, ...commands: CommandRef[]): GameState {
  for (const command of commands) {
    const out = apply(state, g, command)
    expect(out.reason, JSON.stringify(command)).toBeUndefined()
    state = out.state
  }
  return state
}

const shown = (state: GameState, g: Game) => view(state, g).plugins.cast as CastView

describe('the cast', () => {
  it('are entities of the kind character, with the stats the game declares on it', () => {
    const { game: g } = game()
    const state = startingState(g)
    expect(state.entities.character).toEqual({
      ava: { name: 'Ava', stats: { friendship: 0 }, kv: {} },
      sam: { name: 'Sam', stats: { friendship: 5 }, kv: {} },
    })
    expect(view(state, g).entities.character.plural).toBe('People')
  })

  it('are where their schedule puts them, and in the room when that is where the player is', () => {
    const { game: g, clock } = game()
    const cafe = run(g, startingState(g), go('cafe'))
    expect(shown(cafe, g).present.map((person) => person.id)).toEqual(['ava'])
    expect(holds(cafe, here('ava'), g)).toBe(true)
    expect(holds(cafe, here('sam'), g)).toBe(false)
    const evening = clock.write(cafe, { day: 0, period: 'evening' })
    expect(holds(evening, isAt('ava', 'park'), g)).toBe(true)
    expect(shown(evening, g).present).toEqual([])
  })

  it('talk in the first scene whose condition holds, `$` being them', () => {
    const { game: g, clock } = game()
    const park = clock.write(run(g, startingState(g), go('park')), { day: 0, period: 'evening' })
    expect(run(g, park, talk('ava')).sceneId).toBe('ava.hi')
    const friends = { ...park, entities: { ...park.entities, character: { ...park.entities.character, ava: { ...park.entities.character.ava, stats: { friendship: 30 } } } } }
    expect(shown(friends, g).present.find((person) => person.id === 'ava')?.actions[0].label).toBe('Walk with Ava')
    expect(run(g, friends, talk('ava')).sceneId).toBe('ava.river')
    expect(holds(friends, { stat: 'friendship', of: person('ava'), gte: 25 }, g)).toBe(true)
  })

  it('say why a conversation cannot start', () => {
    const { game: g } = game()
    const street = startingState(g)
    expect(whyNot(street, g, talk('ava'))).toBe('Ava is not here.')
    expect(whyNot(street, g, talk('nobody'))).toBe('There is no such person.')
    const cafe = run(g, street, go('cafe'))
    expect(whyNot({ ...cafe, sceneId: 'ava.hi' }, g, talk('ava'))).toBe('Finish this first.')
    const closed = { ...cafe, storylines: { ...cafe.storylines, ava: { ...cafe.storylines.ava, closedUntil: 9 } } }
    expect(whyNot(closed, g, talk('ava'))).toBe('Ava is not taking this right now.')
    expect(shown(closed, g).present[0]).toMatchObject({ closed: true, actions: [{ disabled: 'Ava is not taking this right now.' }] })
  })

  it('are called from anywhere, when they pick up', () => {
    const { game: g, clock } = game()
    const day = startingState(g)
    expect(whyNot(day, g, call('ava'))).toBe('She’s at the counter. Try this evening.')
    expect(whyNot(day, g, call('sam'))).toBe('You cannot reach Sam from here.')
    const evening = clock.write(day, { day: 0, period: 'evening' })
    expect(run(g, evening, call('ava')).sceneId).toBe('ava.call')
  })

  it('are met by seeing their scenes, and listed as contacts once met', () => {
    const { game: g, clock } = game()
    const state = startingState(g)
    expect(holds(state, hasMet('ava'), g)).toBe(false)
    const met = run(g, state, go('cafe'), talk('ava'), { type: 'choose', id: 'bye' })
    expect(holds(met, hasMet('ava'), g)).toBe(true)
    expect(shown(met, g).people.map((person) => person.id)).toEqual(['ava'])
    expect(view(clock.write(met, { day: 0, period: 'evening' }), g).plugins.cast).toBeDefined()
  })

  it('answer queries about whoever is named as character', () => {
    const { game: g } = game()
    const cafe = run(g, startingState(g), go('cafe'))
    const where = pluginQuery(g, 'cast/where')!
    expect(where(cafe, { character: 'ava' })).toBe('cafe')
    expect(where(cafe, { character: 'nobody' })).toBeUndefined()
  })

  it('say who is speaking in their scenes', () => {
    const { game: g } = game()
    const withSpeaker = { ...g, scenes: g.scenes.map((entry) => (entry.id === 'ava.hi' ? { ...entry, speaker: 'ava' } : entry)) }
    const state = run(withSpeaker, startingState(withSpeaker), go('cafe'), talk('ava'))
    expect(view(state, withSpeaker).scene.speaker).toEqual({ id: 'ava', name: 'Ava', hue: 20, portrait: 'art/character/ava.jpg' })
  })

  it('fill prose tokens in a name wherever it is shown, so the player can name someone', () => {
    // Sam is whoever the player says: an input sets the kv key, the name reads it.
    const named: Pack = { ...town, data: { ...town.data, cast: { characters: [ava, { ...sam, name: '{{friendName}}', fullName: '{{friendName}} Reed' }] } } }
    const { game: g, problems } = loadGame([named], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'park' }), cast()] })
    expect(problems).toEqual([])
    const withSpeaker = { ...g, scenes: g.scenes.map((entry) => (entry.id === 'sam.hi' ? { ...entry, speaker: 'sam' } : entry)) }
    const start = startingState(withSpeaker)
    const state = { ...start, kv: { ...start.kv, friendName: 'Robin' } }
    expect(shown(state, withSpeaker).present.find((person) => person.id === 'sam')).toMatchObject({ name: 'Robin', fullName: 'Robin Reed' })
    expect(whyNot(state, withSpeaker, call('sam'))).toBe('You cannot reach Robin from here.')
    expect(pluginQuery(withSpeaker, 'cast/person')!(state, { character: 'sam' })).toMatchObject({ name: 'Robin' })
    expect(view(run(withSpeaker, state, talk('sam')), withSpeaker).scene.speaker).toMatchObject({ name: 'Robin' })
    // Before the player names them, the token shows as written.
    expect(shown(start, withSpeaker).present.find((person) => person.id === 'sam')?.name).toBe('{{friendName}}')
  })

  it('are never in the room without places, but still answer the phone', () => {
    const { game: g, clock } = game(false)
    const state = clock.write(startingState(g), { day: 0, period: 'evening' })
    expect(shown(state, g).present).toEqual([])
    expect(whyNot(state, g, talk('ava'))).toBe('Ava is not here.')
    expect(run(g, state, call('ava')).sceneId).toBe('ava.call')
  })

  it('report what their content names that the game does not have', () => {
    const broken: Pack = {
      id: 'broken',
      schema: SCHEMA,
      stats: [{ id: 'trust', label: 'Trust', of: 'character' }],
      activities: [{ id: 'wave', blocked: [{ when: { not: here('ghost') }, reason: 'No.' }] }],
      data: {
        places: { locations: [{ id: 'yard', name: 'Yard', tag: '', exits: [], art: '', body: [] }] },
        cast: {
          characters: [
            { id: 'mole', name: 'Mole', home: 'burrow', talk: 'mole.hi', storyline: 'tunnels', schedule: [{ location: 'yard', when: { stat: 'trust', of: '$', gte: 2 } }] },
          ],
        },
      },
    }
    const { problems } = loadGame([broken], { id: 'b', title: 'B', plugins: [places(), cast()] })
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'activity wave: unknown character "ghost"',
      'characters mole: talk: opens unknown scene "mole.hi"',
      'characters mole: unknown storyline "tunnels"',
      'characters mole: unknown location "burrow"',
    ])
  })
})
