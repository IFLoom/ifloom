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
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast, peopleOf, personOf, type CastView } from '../src/index.ts'

const ava = cast.person({
  id: 'ava',
  name: 'Ava',
  fullName: 'Ava Marsh',
  description: 'Runs the café',
  ui: { hue: 20 },
  home: 'park',
  // At the counter in the day; by the river otherwise.
  schedule: [{ location: 'cafe', when: calendar.period('morning', 'afternoon') }],
  // By the river, once she is a friend, a different conversation.
  talk: [
    { scene: 'ava.river', when: { all: [cast.at('ava', 'park'), { stat: 'friendship', of: '$', gte: 25 }] }, label: 'Walk with Ava' },
    { scene: 'ava.hi' },
  ],
  call: { scene: 'ava.call', when: calendar.period('evening', 'night'), busy: 'She’s at the counter. Try this evening.' },
  storyline: 'ava',
})
const sam = cast.person({ id: 'sam', name: 'Sam', home: 'park', talk: 'sam.hi', stats: { friendship: 5 } })

const scene = (id: string) => ({ id, body: [{ prose: id }], choices: [{ id: 'bye', label: 'Bye', effects: [{ scene: null }] }] })

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
  },
}

/** The town's map, for the places plugin. */
const map: Content = {
  name: 'map',
  entities: [
    places.location({ id: 'street', name: 'Street', description: 'Town', exits: ['cafe', 'park'], body: [] }),
    places.location({ id: 'cafe', name: 'Café', description: 'Town', exits: ['street'], body: [] }),
    places.location({ id: 'park', name: 'Park', description: 'Town', exits: ['street'], body: [] }),
  ],
}

function game(withPlaces = true): { game: Game; clock: ReturnType<typeof calendar> } {
  const clock = calendar()
  // Without places, the town's map goes too: nobody is anywhere the player can be.
  const { game, problems } = loadGame(withPlaces ? [town, map] : [town], {
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
    expect([statValue(state, g, 'friendship', cast.character('ava')), statValue(state, g, 'friendship', cast.character('sam'))]).toEqual([0, 5])
    // Listed in the view once met, so nobody is given away before then.
    expect(view(state, g).entities.character).toMatchObject({ plural: 'People', unique: true, entries: [] })
    const met = run(g, run(g, state, places.go('cafe')), cast.talk('ava'))
    expect(view(met, g).entities.character.entries.map((entry) => [entry.ref, entry.name])).toEqual([['character:ava', 'Ava']])
  })

  it('are written as entities with the person trait, by cast.person()', () => {
    expect(sam).toEqual({ id: 'sam', name: 'Sam', of: 'character', stats: { friendship: 5 }, traits: { 'cast/person': { home: 'park', talk: 'sam.hi' } } })
    const { game: g } = game()
    const state = startingState(g)
    expect(peopleOf(state, g)).toEqual(['character:ava', 'character:sam'])
    expect(personOf(state, g, 'character:sam')).toEqual({ home: 'park', talk: 'sam.hi' })
    // Their description is the line under their name, their image their portrait.
    const cafe = run(g, state, places.go('cafe'))
    expect(shown(cafe, g).present[0]).toMatchObject({
      id: 'ava',
      ref: 'character:ava',
      description: 'Runs the café',
      image: 'art/character/ava.jpg',
      portrait: 'art/character/ava.jpg',
    })
  })

  it('show a face for avatars beside their picture: the trait’s portrait, else their image', () => {
    const faced: Content = { name: 'faces', traits: { 'cast/person': { 'character:sam': { home: 'park', talk: 'sam.hi', portrait: 'faces/sam.png' } } } }
    const { game: g } = loadGame([town, map, faced], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'street' }), cast()] })
    const park = run(g, startingState(g), places.go('park'))
    expect(shown(park, g).present.find((one) => one.id === 'sam')).toMatchObject({ image: 'art/character/sam.jpg', portrait: 'art/faces/sam.png' })
    const portrait = pluginQuery(g, 'cast/portrait')!
    expect([portrait(park, { character: 'sam' }), portrait(park, { character: 'ava' }), portrait(park, { character: 'nobody' })]).toEqual([
      'art/faces/sam.png',
      'art/character/ava.jpg',
      undefined,
    ])
  })

  it('include anyone with the trait, of any kind or made in play, named by reference', () => {
    const { game: g } = game()
    const next = run(g, startingState(g), places.go('park'))
    const created = { ...next, entities: { ...next.entities, character: { '#1': { name: 'Rook', like: 'character:sam' as const } } } }
    expect(peopleOf(created, g)).toEqual(['character:ava', 'character:sam', 'character:#1'])
    expect(shown(created, g).present.map((one) => one.name)).toEqual(['Sam', 'Rook'])
    expect(holds(created, g, cast.here('character:#1'))).toBe(true)
  })

  it('are where their schedule puts them, and in the room when that is where the player is', () => {
    const { game: g, clock } = game()
    const cafe = run(g, startingState(g), places.go('cafe'))
    expect(shown(cafe, g).present.map((person) => person.id)).toEqual(['ava'])
    expect(holds(cafe, g, cast.here('ava'))).toBe(true)
    expect(holds(cafe, g, cast.here('sam'))).toBe(false)
    const evening = clock.write(cafe, { day: 0, period: 'evening' })
    expect(holds(evening, g, cast.at('ava', 'park'))).toBe(true)
    expect(shown(evening, g).present).toEqual([])
  })

  it('talk in the first scene whose condition holds, `$` being them', () => {
    const { game: g, clock } = game()
    const park = clock.write(run(g, startingState(g), places.go('park')), { day: 0, period: 'evening' })
    expect(run(g, park, cast.talk('ava')).sceneId).toBe('ava.hi')
    const friends = writeEntity(park, cast.character('ava'), { stats: { friendship: 30 } })
    expect(shown(friends, g).present.find((person) => person.id === 'ava')?.actions[0].label).toBe('Walk with Ava')
    expect(run(g, friends, cast.talk('ava')).sceneId).toBe('ava.river')
    expect(holds(friends, g, { stat: 'friendship', of: cast.character('ava'), gte: 25 })).toBe(true)
  })

  it('say why a conversation cannot start', () => {
    const { game: g } = game()
    const street = startingState(g)
    expect(whyNot(street, g, cast.talk('ava'))).toBe('Ava is not here.')
    expect(whyNot(street, g, cast.talk('nobody'))).toBe('There is no such person.')
    const cafe = run(g, street, places.go('cafe'))
    expect(whyNot({ ...cafe, sceneId: 'ava.hi' }, g, cast.talk('ava'))).toBe('Finish this first.')
    const closed = { ...cafe, storylines: { ...cafe.storylines, ava: { ...cafe.storylines.ava, closedUntil: 9 } } }
    expect(whyNot(closed, g, cast.talk('ava'))).toBe('Ava is not taking this right now.')
    expect(shown(closed, g).present[0]).toMatchObject({ closed: true, actions: [{ disabled: 'Ava is not taking this right now.' }] })
  })

  it('are called from anywhere, when they pick up', () => {
    const { game: g, clock } = game()
    const day = startingState(g)
    expect(whyNot(day, g, cast.call('ava'))).toBe('She’s at the counter. Try this evening.')
    expect(whyNot(day, g, cast.call('sam'))).toBe('You cannot reach Sam from here.')
    const evening = clock.write(day, { day: 0, period: 'evening' })
    expect(run(g, evening, cast.call('ava')).sceneId).toBe('ava.call')
  })

  it('are met by seeing their scenes, and listed as contacts once met', () => {
    const { game: g, clock } = game()
    const state = startingState(g)
    expect(holds(state, g, cast.met('ava'))).toBe(false)
    const met = run(g, state, places.go('cafe'), cast.talk('ava'), { type: 'choose', id: 'bye' })
    expect(holds(met, g, cast.met('ava'))).toBe(true)
    expect(shown(met, g).people.map((person) => person.id)).toEqual(['ava'])
    expect(view(clock.write(met, { day: 0, period: 'evening' }), g).plugins.cast).toBeDefined()
  })

  it('answer queries about whoever is named as character', () => {
    const { game: g } = game()
    const cafe = run(g, startingState(g), places.go('cafe'))
    const where = pluginQuery(g, 'cast/where')!
    expect(where(cafe, { character: 'ava' })).toBe('cafe')
    expect(where(cafe, { character: 'nobody' })).toBeUndefined()
  })

  it('are who is speaking in their scenes, as their entity is', () => {
    const { game: g } = game()
    const withSpeaker = { ...g, scenes: g.scenes.map((entry) => (entry.id === 'ava.hi' ? { ...entry, speaker: 'ava' } : entry)) }
    const state = run(withSpeaker, startingState(withSpeaker), places.go('cafe'), cast.talk('ava'))
    // The core reads the entity: no picture of her own, so none is guessed.
    expect(view(state, withSpeaker).scene.speaker).toEqual({ id: 'ava', ref: 'character:ava', name: 'Ava', image: null, ui: { hue: 20 } })
  })

  it('fill prose tokens in a name wherever it is shown, so the player can name someone', () => {
    // Sam is whoever the player says: an input sets the kv key, the name reads it.
    const named: Content = {
      ...town,
      entities: [ava, cast.person({ id: 'sam', name: '{{friendName}}', fullName: '{{friendName}} Reed', home: 'park', talk: 'sam.hi' })],
    }
    const { game: g, problems } = loadGame([named, map], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'park' }), cast()] })
    expect(problems).toEqual([])
    const withSpeaker = { ...g, scenes: g.scenes.map((entry) => (entry.id === 'sam.hi' ? { ...entry, speaker: 'sam' } : entry)) }
    const start = startingState(withSpeaker)
    const state = { ...start, kv: { ...start.kv, friendName: 'Robin' } }
    expect(shown(state, withSpeaker).present.find((person) => person.id === 'sam')).toMatchObject({ name: 'Robin', fullName: 'Robin Reed' })
    expect(whyNot(state, withSpeaker, cast.call('sam'))).toBe('You cannot reach Robin from here.')
    expect(view(run(withSpeaker, state, cast.talk('sam')), withSpeaker).scene.speaker).toMatchObject({ name: 'Robin' })
    // Before the player names them, the token shows as written.
    expect(shown(start, withSpeaker).present.find((person) => person.id === 'sam')?.name).toBe('{{friendName}}')
  })

  it('are never in the room without places, but still answer the phone', () => {
    const { game: g, clock } = game(false)
    const state = clock.write(startingState(g), { day: 0, period: 'evening' })
    expect(shown(state, g).present).toEqual([])
    expect(whyNot(state, g, cast.talk('ava'))).toBe('Ava is not here.')
    expect(run(g, state, cast.call('ava')).sceneId).toBe('ava.call')
  })

  it('report what their content names that the game does not have', () => {
    const broken: Content = {
      name: 'broken',
      stats: [{ id: 'trust', label: 'Trust', of: 'character' }],
      actions: [{ id: 'wave', blocked: [{ when: { not: cast.here('ghost') }, reason: 'No.' }] }],
      entities: [
        cast.person({
          id: 'mole',
          name: 'Mole',
          home: 'burrow',
          talk: 'mole.hi',
          storyline: 'tunnels',
          schedule: [{ location: 'yard', when: { stat: 'trust', of: '$', gte: 2 } }],
        }),
        places.location({ id: 'yard', name: 'Yard', exits: [], body: [] }),
      ],
      data: {
        cast: { characters: [{ id: 'old', name: 'Old' }] },
      },
    }
    const { problems } = loadGame([broken], { id: 'b', title: 'B', plugins: [places(), cast()] })
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'action wave: unknown entity "character:ghost"',
      'trait cast/person on character:mole: unknown location "burrow"',
      'trait cast/person on character:mole: talk: opens unknown scene "mole.hi"',
      'trait cast/person on character:mole: unknown storyline "tunnels"',
      'characters old: characters are entities now: write them in entities with cast.person({ id, name, ... })',
    ])
  })
})
