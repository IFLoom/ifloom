import { describe, expect, it } from 'vitest'
import {
  apply,
  entitiesOf,
  holds,
  pluginQuery,
  loadGame,
  startingState,
  statValue,
  view,
  whyNot,
  writeEntity,
  type Game,
  type GameState,
  type Content,
  type CommandRef,
} from '@ifloom/engine'
import { calendar, period } from '@ifloom/plugin-calendar'
import { go, places } from '@ifloom/plugin-places'
import { call, cast, character, hasMet, here, isAt, peopleOf, person, personOf, talk, type CastView } from '../src/index.ts'

const ava = person({
  id: 'ava',
  name: 'Ava',
  fullName: 'Ava Marsh',
  desc: 'Runs the café',
  hue: 20,
  home: 'park',
  // At the counter in the day; by the river otherwise.
  schedule: [{ location: 'cafe', when: period('morning', 'afternoon') }],
  // By the river, once she is a friend, a different conversation.
  talk: [{ scene: 'ava.river', when: { all: [isAt('ava', 'park'), { stat: 'friendship', of: '$', gte: 25 }] }, label: 'Walk with Ava' }, { scene: 'ava.hi' }],
  call: { scene: 'ava.call', when: period('evening', 'night'), busy: 'She’s at the counter. Try this evening.' },
  storyline: 'ava',
})
const sam = person({ id: 'sam', name: 'Sam', home: 'park', talk: 'sam.hi', stats: { friendship: 5 } })

const scene = (id: string) => ({ id, body: [{ text: id }], choices: [{ id: 'bye', effects: [{ kind: 'scene' as const, scene: null }] }] })

const town: Content = {
  name: 'town',
  stats: [{ id: 'friendship', label: 'Friendship', of: 'character' }],
  storylines: [{ id: 'ava', name: 'Ava' }],
  entities: [ava, sam],
  scenes: ['ava.hi', 'ava.river', 'ava.call', 'sam.hi'].map(scene),
  prose: {
    'ava.hi': 'Hi.',
    'ava.river': 'Ducks.',
    'ava.call': 'Hello?',
    'sam.hi': 'Hey.',
    'ava.hi#bye': 'Bye',
    'ava.river#bye': 'Bye',
    'ava.call#bye': 'Bye',
    'sam.hi#bye': 'Bye',
  },
  data: {
    places: {
      locations: [
        { id: 'street', name: 'Street', tag: 'Town', exits: ['cafe', 'park'], art: '', body: [] },
        { id: 'cafe', name: 'Café', tag: 'Town', exits: ['street'], art: '', body: [] },
        { id: 'park', name: 'Park', tag: 'Town', exits: ['street'], art: '', body: [] },
      ],
    },
  },
}

function game(withPlaces = true): { game: Game; clock: ReturnType<typeof calendar> } {
  const clock = calendar()
  // Without places, the town's map goes too: nobody is anywhere the player can be.
  const pack = withPlaces ? town : { ...town, data: {} }
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
    expect(state.entities).toEqual({})
    expect(entitiesOf(state, g, 'character')).toEqual(['character:ava', 'character:sam'])
    expect([statValue(state, g, 'friendship', character('ava')), statValue(state, g, 'friendship', character('sam'))]).toEqual([0, 5])
    // Listed in the view once met, so nobody is given away before then.
    expect(view(state, g).entities.character).toMatchObject({ plural: 'People', unique: true, entries: [] })
    const met = run(g, run(g, state, go('cafe')), talk('ava'))
    expect(view(met, g).entities.character.entries.map((entry) => [entry.ref, entry.name])).toEqual([['character:ava', 'Ava']])
  })

  it('are written as entities with the person trait, by person()', () => {
    expect(sam).toEqual({ id: 'sam', name: 'Sam', of: 'character', stats: { friendship: 5 }, traits: { 'cast/person': { home: 'park', talk: 'sam.hi' } } })
    const { game: g } = game()
    const state = startingState(g)
    expect(peopleOf(g)).toEqual(['character:ava', 'character:sam'])
    expect(personOf(state, g, 'character:sam')).toEqual({ home: 'park', talk: 'sam.hi' })
    // Their desc is the line under their name, their image their portrait.
    const cafe = run(g, state, go('cafe'))
    expect(shown(cafe, g).present[0]).toMatchObject({ id: 'ava', ref: 'character:ava', desc: 'Runs the café', portrait: 'art/character/ava.jpg' })
  })

  it('include anyone with the trait, of any kind or made in play, named by reference', () => {
    const { game: g } = game()
    const next = run(g, startingState(g), go('park'))
    const created = { ...next, entities: { ...next.entities, character: { '#1': { name: 'Rook', like: 'character:sam' } } } }
    expect(peopleOf(g, created)).toEqual(['character:ava', 'character:sam', 'character:#1'])
    expect(shown(created, g).present.map((one) => one.name)).toEqual(['Sam', 'Rook'])
    expect(holds(created, here('character:#1'), g)).toBe(true)
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
    const friends = writeEntity(park, character('ava'), { stats: { friendship: 30 } })
    expect(shown(friends, g).present.find((person) => person.id === 'ava')?.actions[0].label).toBe('Walk with Ava')
    expect(run(g, friends, talk('ava')).sceneId).toBe('ava.river')
    expect(holds(friends, { stat: 'friendship', of: character('ava'), gte: 25 }, g)).toBe(true)
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
    const named: Content = {
      ...town,
      entities: [ava, person({ id: 'sam', name: '{{friendName}}', fullName: '{{friendName}} Reed', home: 'park', talk: 'sam.hi' })],
    }
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
    const broken: Content = {
      name: 'broken',
      stats: [{ id: 'trust', label: 'Trust', of: 'character' }],
      activities: [{ id: 'wave', blocked: [{ when: { not: here('ghost') }, reason: 'No.' }] }],
      entities: [
        person({
          id: 'mole',
          name: 'Mole',
          home: 'burrow',
          talk: 'mole.hi',
          storyline: 'tunnels',
          schedule: [{ location: 'yard', when: { stat: 'trust', of: '$', gte: 2 } }],
        }),
      ],
      data: {
        places: { locations: [{ id: 'yard', name: 'Yard', tag: '', exits: [], art: '', body: [] }] },
        cast: { characters: [{ id: 'old', name: 'Old' }] },
      },
    }
    const { problems } = loadGame([broken], { id: 'b', title: 'B', plugins: [places(), cast()] })
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'activity wave: unknown entity "character:ghost"',
      'trait cast/person on character:mole: unknown location "burrow"',
      'trait cast/person on character:mole: talk: opens unknown scene "mole.hi"',
      'trait cast/person on character:mole: unknown storyline "tunnels"',
      'characters old: characters are entities now: write them in entities with person({ id, name, ... })',
    ])
  })
})
