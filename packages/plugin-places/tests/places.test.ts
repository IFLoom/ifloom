import { describe, expect, it } from 'vitest'
import { SCHEMA, apply, holds, loadGame, startingState, view, whyNot, type Game, type GameRules, type GameState, type Pack } from '@ifloom/engine'
import { calendar, pass, period } from '@ifloom/plugin-calendar'
import { at, go, moveTo, onlyAt, places, where, within, type LocationDef, type PlacesOptions, type PlacesView } from '../src/index.ts'

const place = (id: string, exits: string[], extra: Partial<LocationDef> = {}): LocationDef => ({
  id,
  name: id[0].toUpperCase() + id.slice(1),
  tag: 'Town',
  kind: 'room',
  exits,
  art: `place/${id}`,
  body: [{ text: `place.${id}` }],
  ...extra,
})

/** A house, a street, a café in it with a back room, and a park; a bakery stall in the café. */
const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  prose: {
    'place.house': 'Your house.',
    'place.street': 'The high street.',
    'place.cafe': 'The café.',
    'place.back': 'Crates of milk.',
    'place.park': 'Ducks.',
  },
  activities: [
    { id: 'coffee', requires: [onlyAt(['cafe'], 'There is no coffee here.')], effects: [{ kind: 'flag', key: 'coffee', value: true }] },
    { id: 'nap', effects: [pass(1)] },
    { id: 'hop', effects: [moveTo('park')] },
  ],
  data: {
    places: {
      locations: [
        place('house', ['street']),
        place('street', ['house', 'cafe', 'park']),
        place('cafe', ['street', 'back'], {
          kind: 'venue',
          locked: [{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
          actions: [{ id: 'coffee', label: 'Buy a coffee', command: { type: 'activity', id: 'coffee' } }],
        }),
        place('back', ['cafe'], { parent: 'cafe', locked: [{ when: { not: { flag: 'staff' } }, reason: 'Staff only.', hide: true }] }),
        place('park', ['street']),
      ],
    },
  },
}

function game(options: PlacesOptions = { start: 'house' }, rules: GameRules = {}) {
  const clock = calendar()
  const { game, problems } = loadGame([town], {
    id: 'town',
    title: 'Town',
    plugins: [clock, places(options)],
    rules,
    actions: [{ id: 'nap', label: 'Nap', command: { type: 'activity', id: 'nap' } }],
  })
  expect(problems).toEqual([])
  return { game, clock }
}

function walk(g: Game, state: GameState, ...to: string[]): GameState {
  for (const id of to) {
    const out = apply(state, g, go(id))
    expect(out.refused).toBeUndefined()
    state = out.state
  }
  return state
}

const shown = (state: GameState, g: Game) => view(state, g).plugins.places as PlacesView

describe('places', () => {
  it('start where the game says, and fill the screen with the room', () => {
    const { game: g } = game()
    const state = startingState(g)
    expect(where(state)).toBe('house')
    const screen = view(state, g)
    expect(screen.scene).toMatchObject({ title: 'House', body: 'Your house.', frame: 'stage' })
    expect(screen.when).toBe('Day 1 · Monday morning · House')
    expect(shown(state, g)).toEqual({
      location: { id: 'house', name: 'House', tag: 'Town', kind: 'room', art: 'place/house' },
      exits: [{ id: 'street', name: 'Street', tag: 'Town', kind: 'room', art: 'place/street', command: go('street') }],
    })
  })

  it('are walked between by exit, and offer what there is to do there', () => {
    const { game: g } = game()
    const state = walk(g, startingState(g), 'street', 'cafe')
    expect(where(state)).toBe('cafe')
    expect(view(state, g).actions.map((action) => action.id)).toEqual(['coffee', 'nap'])
    expect(apply(state, g, { type: 'activity', id: 'coffee' }).state.flags.coffee).toBe(true)
    expect(whyNot(walk(g, startingState(g), 'street'), g, { type: 'activity', id: 'coffee' })).toBe('There is no coffee here.')
  })

  it('say why a journey is refused', () => {
    const { game: g, clock } = game()
    const house = startingState(g)
    expect(whyNot(house, g, go('cafe'))).toBe('You cannot get there from here.')
    expect(whyNot(house, g, go('house'))).toBe('You are already here.')
    expect(whyNot(house, g, go('moon'))).toBe('There is no such place.')
    expect(whyNot({ ...house, sceneId: 'x' }, g, go('street'))).toBe('Finish this first.')
    const evening = clock.write(walk(g, house, 'street'), { day: 0, period: 'evening' })
    expect(whyNot(evening, g, go('cafe'))).toBe('Closed. Opens tomorrow morning.')
    expect(shown(evening, g).exits.find((exit) => exit.id === 'cafe')?.disabled).toBe('Closed. Opens tomorrow morning.')
  })

  it('hide an exit a hiding lock or a hiding `locked` stops', () => {
    const { game: g } = game()
    const cafe = walk(g, startingState(g), 'street', 'cafe')
    expect(shown(cafe, g).exits.map((exit) => exit.id)).toEqual(['street'])
    const staff = { ...cafe, flags: { staff: true } }
    expect(shown(staff, g).exits.map((exit) => exit.id)).toEqual(['street', 'back'])
    const locked = game({ start: 'house' }, { locks: [{ when: { flag: 'grounded' }, deny: ['places/go'], hide: true, reason: 'Grounded.' }] }).game
    expect(shown({ ...startingState(locked), flags: { grounded: true } }, locked).exits).toEqual([])
  })

  it('answer `at` and `within`, following a place’s parent', () => {
    const { game: g } = game()
    const back = walk(g, { ...startingState(g), flags: { staff: true } }, 'street', 'cafe', 'back')
    expect(holds(back, at('back'), g)).toBe(true)
    expect(holds(back, at('cafe'), g)).toBe(false)
    expect(holds(back, within('cafe'), g)).toBe(true)
    expect(holds(back, within('street'), g)).toBe(false)
    expect(holds(back, within('street', 'cafe'), g)).toBe(true)
  })

  it('move the player at once by effect, closing any scene, with no exit needed', () => {
    const { game: g } = game()
    const state = apply(startingState(g), g, { type: 'activity', id: 'hop' }).state
    expect(where(state)).toBe('park')
  })

  it('run the doorstep on arrival by exit', () => {
    const { game: g } = game({
      start: 'street',
      arrive: (state) => (where(state) === 'park' ? { ...state, flags: { ...state.flags, ducks: true } } : state),
    })
    expect(walk(g, startingState(g), 'park').flags.ducks).toBe(true)
  })

  it('leave a game nowhere with no start, and nothing on the screen but its buttons', () => {
    const { game: g } = game({})
    const state = startingState(g)
    expect(where(state)).toBeNull()
    expect(view(state, g).scene).toMatchObject({ title: 'Town', body: '' })
    expect(shown(state, g)).toEqual({ location: null, exits: [] })
  })

  it('report places content names that are not there', () => {
    const broken: Pack = {
      id: 'broken',
      schema: SCHEMA,
      activities: [{ id: 'swim', requires: [{ when: at('lido'), reason: 'No.' }], effects: [moveTo('pier')] }],
      data: {
        places: {
          locations: [
            place('yard', ['lane'], { parent: 'yard', body: [{ text: 'place.yard' }], actions: [{ id: 'dig', label: 'Dig', command: go('moon') }] }),
          ],
        },
      },
    }
    const { problems } = loadGame([broken], { id: 'b', title: 'B', plugins: [places({ start: 'nowhere' })] })
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'activity swim: unknown location "pier"',
      'activity swim: unknown location "lido"',
      'options start: unknown location "nowhere"',
      'locations yard: exit to unknown location "lane"',
      'locations yard: is inside itself',
      'locations yard: no prose for "place.yard"',
      'locations yard: action dig: unknown location "moon"',
    ])
  })

  describe('audio', () => {
    /** The town with sounds: music everywhere by default, the café's murmur on the ambience channel. */
    function withSound(extra: Partial<LocationDef> = {}) {
      const sounds: Pack = {
        id: 'sounds',
        schema: SCHEMA,
        audio: {
          tracks: {
            calm: { src: 'calm.ogg', channel: 'music' },
            murmur: { src: 'cafe-murmur.ogg', channel: 'ambience' },
            knock: { src: 'knock.ogg' },
          },
          default: { music: 'calm' },
        },
        activities: [
          { id: 'hush', effects: [{ kind: 'audio', channel: 'ambience', track: null }] },
          { id: 'listen', effects: [{ kind: 'audio', channel: 'ambience' }] },
        ],
        data: { places: { locations: [place('cafe', ['street'], { kind: 'venue', audio: { ambience: 'murmur' }, ...extra })] } },
      }
      const { game: g, problems } = loadGame([town, sounds], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'street' })] })
      return { g, problems }
    }

    it('play the place’s channels while the player is there, over the game’s default', () => {
      const { g, problems } = withSound({ audio: { ambience: 'murmur', music: null } })
      expect(problems).toEqual([])
      const street = startingState(g)
      expect(view(street, g).audio.channels.ambience.track).toBeNull()
      expect(view(street, g).audio.channels.music.track).toBe('calm')
      const cafe = walk(g, street, 'cafe')
      expect(view(cafe, g).audio.channels.ambience).toMatchObject({ track: 'murmur', src: 'audio/cafe-murmur.ogg', loop: true })
      // The café silences the music.
      expect(view(cafe, g).audio.channels.music.track).toBeNull()
      expect(view(walk(g, cafe, 'street'), g).audio.channels.ambience.track).toBeNull()
    })

    it('give way to an audio effect', () => {
      const { g } = withSound()
      const cafe = walk(g, startingState(g), 'cafe')
      const hushed = apply(cafe, g, { type: 'activity', id: 'hush' }).state
      expect(view(hushed, g).audio.channels.ambience.track).toBeNull()
      // Handed back, the place's murmur plays again.
      const back = apply(hushed, g, { type: 'activity', id: 'listen' }).state
      expect(view(back, g).audio.channels.ambience.track).toBe('murmur')
    })

    it('report a place’s unknown track, or a sound on a background channel', () => {
      const { problems } = withSound({ audio: { ambience: 'rain', music: 'knock', sfx: 'knock' } })
      expect(problems.map((problem) => `${problem.pack} · ${problem.where}: ${problem.what}`)).toEqual([
        'sounds · locations cafe: audio: unknown track "rain"',
        'sounds · locations cafe: audio: track "knock" is a sound on channel "sfx", not background audio',
        'sounds · locations cafe: audio: channel "sfx" plays sounds, not background audio',
        'sounds · locations cafe: audio: track "knock" is a sound on channel "sfx", not background audio',
      ])
    })
  })
})
