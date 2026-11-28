import { describe, expect, it } from 'vitest'
import {
  SCHEMA,
  commandOf,
  apply,
  checkGame,
  holds,
  pluginQuery,
  loadGame,
  startingState,
  view,
  whyNot,
  type Game,
  type GameState,
  type Content,
  type Pack,
} from '@ifloom/engine'
import { loadChecked, play } from '@ifloom/engine/testing'
import { definePlugin } from '@ifloom/engine/plugin'
import { calendar } from '@ifloom/plugin-calendar'
import { locationOf, locationsOf, lyingCount, places, type PlaceDef, type PlacesOptions, type PlacesView } from '../src/index.ts'

const place = (id: string, exits: string[], extra: Partial<PlaceDef> = {}) =>
  places.location({
    id,
    name: id[0].toUpperCase() + id.slice(1),
    description: 'Town',
    exits,
    image: `place/${id}`,
    body: [{ prose: `place.${id}` }],
    ...extra,
  })

/** The town's places, with more on some of them by id. */
const townPlaces = (more: Record<string, Partial<PlaceDef>> = {}) => [
  place('house', ['street'], more.house),
  place('street', ['house', 'cafe', 'park'], { tags: ['outdoors'], ...more.street }),
  place('cafe', ['street', 'back'], {
    blocked: [{ when: { not: calendar.period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
    actions: [{ id: 'coffee', label: 'Buy a coffee', command: { type: 'action', id: 'coffee' } }],
    ...more.cafe,
  }),
  place('back', ['cafe'], { parent: 'cafe', blocked: [{ when: { not: { kv: 'staff' } }, reason: 'Staff only.', hide: true }], ...more.back }),
  place('park', ['street'], more.park),
]

/** A house, a street, a café in it with a back room, and a park; a bakery stall in the café. */
const town: Content = {
  name: 'town',
  prose: {
    'place.house': 'Your house.',
    'place.street': 'The high street.',
    'place.cafe': 'The café.',
    'place.back': 'Crates of milk.',
    'place.park': 'Ducks.',
  },
  actions: [
    { id: 'coffee', blocked: [places.onlyAt(['cafe'], 'There is no coffee here.')], effects: [{ kv: 'coffee', to: true }] },
    { id: 'nap', label: 'Nap', effects: [calendar.pass(1)] },
    { id: 'hop', effects: [places.move('park')] },
    { id: 'feed', blocked: [places.onlyAt(['park'])], effects: [{ kv: 'fed', to: true }] },
  ],
  entities: townPlaces(),
}

function game(options: PlacesOptions = { start: 'house' }, locks: Content['locks'] = []) {
  const clock = calendar()
  const game = loadChecked([{ name: 'base', locks }, town], {
    id: 'town',
    title: 'Town',
    plugins: [clock, places(options)],
  })
  return { game, clock }
}

function walk(g: Game, state: GameState, ...to: string[]): GameState {
  for (const id of to) {
    const out = apply(state, g, places.go(id))
    expect(out.reason).toBeUndefined()
    state = out.state
  }
  return state
}

const shown = (state: GameState, g: Game) => view(state, g).plugins.places as PlacesView

describe('places', () => {
  it('start where the game says, and fill the screen with the room', () => {
    const { game: g } = game()
    const state = startingState(g)
    expect(places.where(state, g)).toBe('house')
    const screen = view(state, g)
    expect(screen.scene).toMatchObject({ title: 'House', body: 'Your house.', key: 'room:house' })
    expect(screen.when).toBe('Day 1 · Monday morning · House')
    expect(shown(state, g)).toEqual({
      location: { id: 'house', ref: 'location:house', name: 'House', description: 'Town', tags: [], image: 'art/place/house.jpg', picture: null },
      exits: [
        {
          id: 'street',
          label: 'Street',
          ref: 'location:street',
          description: 'Town',
          tags: ['outdoors'],
          image: 'art/place/street.jpg',
          command: commandOf(places.go('street')),
        },
      ],
      things: [],
    })
  })

  it('are walked between by exit, and offer what there is to do there', () => {
    const { game: g } = game()
    const state = walk(g, startingState(g), 'street', 'cafe')
    expect(places.where(state, g)).toBe('cafe')
    expect(view(state, g).actions.map((action) => action.id)).toEqual(['coffee', 'nap'])
    expect(apply(state, g, { type: 'action', id: 'coffee' }).state.kv.coffee).toBe(true)
    expect(whyNot(walk(g, startingState(g), 'street'), g, { type: 'action', id: 'coffee' })).toBe('There is no coffee here.')
    // With no reason of its own, the plugin's `places/notHere` string, which a game can reword.
    expect(places.onlyAt(['park'])).toEqual({ when: places.away('park'), reason: { string: 'places/notHere' } })
    expect(places.onlyAt(['park'], 'Only there.', { hide: true })).toEqual({ when: places.away('park'), reason: 'Only there.', hide: true })
    // Away holds anywhere else; nowhere at all is away from everywhere.
    expect(holds(state, g, places.away('park'))).toBe(true)
    expect(holds(state, g, places.away('park', 'cafe'))).toBe(false)
    expect(whyNot(state, g, { type: 'action', id: 'feed' })).toBe('Not here.')
    expect(whyNot(state, { ...g, strings: { ...g.strings, 'places/notHere': 'Only in the park.' } }, { type: 'action', id: 'feed' })).toBe('Only in the park.')
  })

  it('say why a journey is refused', () => {
    const { game: g, clock } = game()
    const house = startingState(g)
    expect(whyNot(house, g, places.go('cafe'))).toBe('You cannot get there from here.')
    expect(whyNot(house, g, places.go('house'))).toBe('You are already here.')
    expect(whyNot(house, g, places.go('moon'))).toBe('There is no such place.')
    expect(whyNot({ ...house, sceneId: 'x' }, g, places.go('street'))).toBe('Finish this first.')
    const evening = clock.write(walk(g, house, 'street'), { day: 0, period: 'evening' })
    expect(whyNot(evening, g, places.go('cafe'))).toBe('Closed. Opens tomorrow morning.')
    expect(shown(evening, g).exits.find((exit) => exit.id === 'cafe')?.disabled).toBe('Closed. Opens tomorrow morning.')
  })

  it('keep a player inside a location its blocked entries close, until a trigger sends them out', () => {
    // As how-to/add-a-location shows: blocked only refuses walking in, and a trigger moves the player out at closing.
    const closing = {
      id: 'cafe.closing',
      once: { per: 'turn' as const },
      when: { all: [places.at('cafe'), { not: calendar.period('morning', 'afternoon') }] },
      effects: [places.move('street'), { notify: 'The café closes.' }],
    }
    const plain = game().game
    const closes = loadChecked([{ name: 'base' }, { ...town, triggers: [closing] }], {
      id: 'town',
      title: 'Town',
      plugins: [calendar(), places({ start: 'house' })],
    })
    const nap = { type: 'action' as const, id: 'nap' }
    // Without the trigger, the evening finds the player still in the closed café.
    const stayed = play(walk(plain, startingState(plain), 'street', 'cafe'), plain, nap, nap)
    expect(places.where(stayed, plain)).toBe('cafe')
    // With it, they're put out on the street once it closes, and told why.
    const sent = play(walk(closes, startingState(closes), 'street', 'cafe'), closes, nap, nap)
    expect(places.where(sent, closes)).toBe('street')
    expect(view(sent, closes).notices.unseen.map((notice) => notice.title)).toContain('The café closes.')
  })

  it('hide an exit a hiding lock or a hiding `locked` stops', () => {
    const { game: g } = game()
    const cafe = walk(g, startingState(g), 'street', 'cafe')
    expect(shown(cafe, g).exits.map((exit) => exit.id)).toEqual(['street'])
    const staff = { ...cafe, kv: { staff: true } }
    expect(shown(staff, g).exits.map((exit) => exit.id)).toEqual(['street', 'back'])
    const locked = game({ start: 'house' }, [{ when: { kv: 'grounded' }, deny: ['places/go'], hide: true, reason: 'Grounded.' }]).game
    expect(shown({ ...startingState(locked), kv: { grounded: true } }, locked).exits).toEqual([])
  })

  it('list no exits while a minigame runs in the room, as while a scene is open', () => {
    const { game: base } = game()
    const g: Game = { ...base, minigames: [{ id: 'darts', start: 'throw', states: { throw: { final: {} } } }] }
    const street = walk(g, startingState(g), 'street')
    expect(shown(street, g).exits.length).toBeGreaterThan(0)
    const playing = { ...street, minigame: { id: 'darts', state: 'throw', elapsed: 0, kv: {}, steps: 0 } }
    expect(shown(playing, g).exits).toEqual([])
  })

  it('answer `at` and `within`, following a place’s parent', () => {
    const { game: g } = game()
    const back = walk(g, { ...startingState(g), kv: { staff: true } }, 'street', 'cafe', 'back')
    expect(holds(back, g, places.at('back'))).toBe(true)
    expect(holds(back, g, places.at('cafe'))).toBe(false)
    expect(holds(back, g, places.within('cafe'))).toBe(true)
    expect(holds(back, g, places.within('street'))).toBe(false)
    expect(holds(back, g, places.within('street', 'cafe'))).toBe(true)
  })

  it('move the player at once by effect, closing any scene, with no exit needed', () => {
    const { game: g } = game()
    const state = apply(startingState(g), g, { type: 'action', id: 'hop' }).state
    expect(places.where(state, g)).toBe('park')
  })

  it('run the doorstep on arrival by exit, while its condition holds, and not on a move', () => {
    const ducks: Content = {
      ...town,
      entities: townPlaces({
        park: {
          arrive: {
            when: { not: { kv: 'ducks' } },
            effects: [
              { kv: 'ducks', to: true },
              { kv: 'fed', by: 1 },
            ],
          },
        },
      }),
    }
    const { game: g, problems } = loadGame([ducks], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'street' })] })
    expect(problems).toEqual([])
    const there = walk(g, startingState(g), 'park')
    expect(there.kv).toMatchObject({ ducks: true, fed: 1 })
    // Once it no longer holds, nothing happens on the doorstep.
    expect(walk(g, walk(g, there, 'street'), 'park').kv.fed).toBe(1)
    const moved = apply(startingState(g), g, { type: 'action', id: 'hop' }).state
    expect(moved.kv.ducks).toBeUndefined()
  })

  it('leave a game nowhere with no start, and nothing on the screen but its buttons', () => {
    const { game: g } = game({})
    const state = startingState(g)
    expect(places.where(state, g)).toBeNull()
    expect(view(state, g).scene).toMatchObject({ title: 'Town', body: '' })
    expect(shown(state, g)).toEqual({ location: null, exits: [], things: [] })
  })

  it('show the location’s picture with the room, as view.scene.image', () => {
    const { game: g } = game({ start: 'house' })
    const house = startingState(g)
    expect(view(house, g).scene.image).toBe('art/place/house.jpg')
    expect(view(walk(g, house, 'street'), g).scene.image).toBe('art/place/street.jpg')
    // A scene opened over the room shows its own speaker's picture, or none: never the location's.
    const withScene = loadChecked([{ name: 'base' }, { ...town, scenes: [{ id: 'note', body: [{ text: 'A note.' }], choices: [] }] }], {
      id: 'town',
      title: 'Town',
      plugins: [calendar(), places({ start: 'house' })],
    })
    expect(view({ ...startingState(withScene), sceneId: 'note' }, withScene).scene).toMatchObject({ key: 'scene:note', image: null })
  })

  it('give the room its hints and a key by the place', () => {
    const hinted: Content = { ...town, entities: townPlaces({ street: { ui: { transition: 'slide-left' } } }) }
    const { game: g, problems } = loadGame([hinted], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'house' })] })
    expect(problems).toEqual([])
    const house = startingState(g)
    expect(view(house, g).scene).toMatchObject({ key: 'room:house' })
    expect(view(house, g).scene.ui).toBeUndefined()
    expect(view(walk(g, house, 'street'), g).scene).toMatchObject({ key: 'room:street', ui: { transition: 'slide-left' } })
    const odd: Content = { name: 'odd', prose: town.prose, entities: [place('house', [], { ui: 'fade' as never })] }
    expect(
      loadGame([odd], { id: 't', title: 'T', plugins: [places({ start: 'house' })] }).problems.map((problem) => `${problem.where}: ${problem.what}`),
    ).toEqual(['trait places/location on location:house: ui must be an object of hints'])
  })

  it('report places content names that are not there', () => {
    const broken: Content = {
      name: 'broken',
      actions: [{ id: 'swim', blocked: [{ when: { not: places.at('lido') }, reason: 'No.' }], effects: [places.move('pier')] }],
      entities: [
        place('yard', ['lane'], { parent: 'yard', body: [{ prose: 'place.yard' }], actions: [{ id: 'dig', label: 'Dig', command: places.go('moon') }] }),
      ],
    }
    const { problems } = loadGame([broken], { id: 'b', title: 'B', plugins: [places({ start: 'nowhere' })] })
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'action swim: unknown entity "location:lido"',
      'action swim: unknown entity "location:pier"',
      'trait places/location on location:yard: exit to unknown location "lane"',
      'trait places/location on location:yard: is inside itself',
      'trait places/location on location:yard: no prose for "place.yard"',
      'trait places/location on location:yard: action dig: unknown entity "location:moon"',
      'options start: unknown entity "location:nowhere"',
    ])
  })

  describe('audio', () => {
    /** The town with sounds: music everywhere by default, the café's murmur on the ambience channel. */
    function withSound(extra: Partial<PlaceDef> = {}) {
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
        actions: [
          { id: 'hush', effects: [{ audio: 'ambience', to: null }] },
          { id: 'listen', effects: [{ audio: 'ambience' }] },
        ],
        // A pack replaces the game's café by its reference, as it replaces any entity.
        entities: [place('cafe', ['street'], { audio: { ambience: 'murmur' }, ...extra })],
      }
      const { game: g, problems } = loadGame([town], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'street' })] }, { packs: [sounds] })
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
      const hushed = apply(cafe, g, { type: 'action', id: 'hush' }).state
      expect(view(hushed, g).audio.channels.ambience.track).toBeNull()
      // Handed back, the place's murmur plays again.
      const back = apply(hushed, g, { type: 'action', id: 'listen' }).state
      expect(view(back, g).audio.channels.ambience.track).toBe('murmur')
    })

    it('report a place’s unknown track, or a sound on a background channel', () => {
      const { problems } = withSound({ audio: { ambience: 'rain', music: 'knock', sfx: 'knock' } })
      expect(problems.map((problem) => `${problem.pack} · ${problem.where}: ${problem.what}`)).toEqual([
        'sounds · trait places/location on location:cafe: audio: unknown track "rain"',
        'sounds · trait places/location on location:cafe: audio: track "knock" is a sound on channel "sfx", not background audio',
        'sounds · trait places/location on location:cafe: audio: channel "sfx" plays sounds, not background audio',
        'sounds · trait places/location on location:cafe: audio: track "knock" is a sound on channel "sfx", not background audio',
      ])
    })
  })

  describe('a place’s picture', () => {
    /** The café with a layered picture: the room, a lamp in the evening, and hotspots on them. */
    function withPicture(picture: PlaceDef['picture']) {
      const pictures: Pack = {
        id: 'pictures',
        schema: SCHEMA,
        media: {
          pools: {
            counter: [
              { src: 'cafe/counter-day.jpg', tags: ['day'] },
              { src: 'cafe/counter-night.jpg', tags: ['night'] },
            ],
          },
        },
        entities: [place('cafe', ['street', 'back'], { picture })],
      }
      const { game: g, problems } = loadGame([town], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'cafe' })] }, { packs: [pictures] })
      return { g, problems }
    }

    const picture: PlaceDef['picture'] = {
      aspect: '16/9',
      layers: [
        { id: 'room', src: 'cafe/room' },
        { id: 'counter', pool: 'counter', tags: ['day'] },
        { id: 'lamp', src: 'cafe/lamp.png', when: { kv: 'evening' } },
      ],
      hotspots: [
        { id: 'menu', rect: [10, 20, 30, 20], label: 'Read the menu', command: { type: 'action', id: 'coffee' } },
        { id: 'lamp', rect: [70, 5, 10, 10], label: 'The lamp', command: { type: 'action', id: 'nap' }, layer: 'lamp' },
        { id: 'door', rect: [85, 30, 15, 70], label: 'The back door', command: places.go('back') },
      ],
    }

    it('draws its shown layers and their hotspots in the view slice, beside the picture', () => {
      const { g, problems } = withPicture(picture)
      expect(problems).toEqual([])
      const location = shown(startingState(g), g).location!
      expect(location.image).toBe('art/place/cafe.jpg')
      expect(location.picture).toEqual({
        aspect: '16/9',
        layers: [
          { id: 'room', src: 'art/cafe/room.jpg' },
          { id: 'counter', src: 'art/cafe/counter-day.jpg' },
        ],
        hotspots: [
          { id: 'menu', rect: [10, 20, 30, 20], label: 'Read the menu', command: { type: 'action', id: 'coffee' } },
          // The back room is staff only: greyed out with the exit's own reason.
          { id: 'door', rect: [85, 30, 15, 70], label: 'The back door', command: commandOf(places.go('back')), disabled: 'Staff only.' },
        ],
      })
    })

    it('shows a layer and its hotspot once the layer’s condition holds', () => {
      const { g } = withPicture(picture)
      const evening = { ...startingState(g), kv: { evening: true } }
      const location = shown(evening, g).location!
      expect(location.picture!.layers.map((layer) => layer.id)).toEqual(['room', 'counter', 'lamp'])
      expect(location.picture!.hotspots.map((hotspot) => hotspot.id)).toEqual(['menu', 'lamp', 'door'])
    })

    it('keeps the picture but drops the hotspots while a scene is open, as the exits go', () => {
      const { g } = withPicture(picture)
      const busy = { ...startingState(g), sceneId: 'anything' }
      expect(shown(busy, g).location!.picture).toMatchObject({ layers: [{ id: 'room' }, { id: 'counter' }], hotspots: [] })
    })

    it('records the pool’s pick after a command, under the place', () => {
      const { g } = withPicture(picture)
      const after = apply(startingState(g), g, { type: 'action', id: 'nap' }).state
      expect(after.media.picks).toEqual({ 'counter|day|cafe|picture:1': 'cafe/counter-day.jpg' })
    })

    it('reports a choice hotspot, an unknown pool, a bad rect and an unknown layer', () => {
      const { problems } = withPicture({
        layers: [{ id: 'room', pool: 'shelves' }],
        hotspots: [
          { id: 'menu', rect: [90, 0, 20, 10], label: 'Menu', choice: 'order' },
          { id: 'lamp', rect: [0, 0, 10, 10], label: 'Lamp', command: { type: 'action', id: 'dance' }, layer: 'lamp' },
        ],
      })
      expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
        'trait places/location on location:cafe: picture layer room: unknown pool "shelves"',
        'trait places/location on location:cafe: hotspot menu: names choice "order", but only a scene has choices',
        'trait places/location on location:cafe: hotspot menu: rect runs off the picture: x + width and y + height must be 100 or less',
        'trait places/location on location:cafe: hotspot lamp: unknown layer "lamp"',
        'trait places/location on location:cafe: hotspot lamp: unknown action "dance"',
      ])
    })
  })

  describe('things lying in a place', () => {
    /** A pocket for these tests: a receiver that keeps counts of what the player picks up. */
    const pocket = definePlugin<Record<string, number>>({
      id: 'pocket',
      version: 1,
      start: () => ({}),
      receiver: {
        receive: (_state, ref, count, _to, { slice, set }) => set({ ...slice, [ref]: (slice[ref] ?? 0) + count }),
        owned: (_state, ref, _of, { slice }) => slice[ref] ?? 0,
        release: (_state, ref, count, _from, { slice, set }) => set({ ...slice, [ref]: (slice[ref] ?? 0) - count }),
      },
    })
    const lying = (withPocket = true, options: PlacesOptions = {}): { g: Game } => {
      const withThings: Content = {
        ...town,
        kinds: [{ id: 'item', label: 'Thing' }],
        entities: [
          ...town.entities!,
          { id: 'paper', of: 'item', name: 'Newspaper', traits: { ...places.lies('street', { count: 2 }) } },
          { id: 'coin', of: 'item', name: 'Coin', traits: { ...places.lies('house') }, visible: { kv: 'lookedClosely' } },
          {
            id: 'key',
            of: 'item',
            name: 'Key',
            traits: {
              ...places.lies('house', { when: { kv: 'perception', gte: 5 }, onFind: [{ kv: 'foundKey', by: 1 }], onPickUp: [{ kv: 'hasKey', to: true }] }),
            },
          },
        ],
        actions: [
          ...(town.actions ?? []),
          { id: 'drop', effects: [places.put('item:paper')] },
          { id: 'look', effects: [{ kv: 'perception', to: 5 }] },
          { id: 'blink', effects: [{ kv: 'perception', to: 0 }] },
        ],
      }
      const plugins = [calendar(), places({ start: 'house', ...options }), ...(withPocket ? [pocket] : [])]
      const { game: g, problems } = loadGame([withThings], { id: 'town', title: 'Town', plugins })
      expect(problems).toEqual([])
      return { g }
    }
    const pocketOf = (state: GameState) => state.plugins.pocket?.state as Record<string, number>

    it('start where their places/lies trait says, kept in the places plugin, the locations holding nothing', () => {
      const { g } = lying()
      expect(g.kinds?.find((kind) => kind.id === 'location')).toMatchObject({ unique: true, listed: false })
      expect(g.entities?.find((entity) => entity.of === 'location' && entity.id === 'cafe')).toMatchObject({ name: 'Cafe', description: 'Town' })
      const state = startingState(g)
      expect(view(state, g).entities.find((kind) => kind.id === 'location')).toBeUndefined()
      expect(lyingCount(state, g, 'item:paper', 'street')).toBe(2)
      expect(lyingCount(state, g, 'item:paper', 'location:street')).toBe(2)
      expect(pluginQuery(g, 'places/holder')).toBeUndefined()
    })

    it('are shown in the place, but those not visible, with a button that picks one up for whoever keeps things', () => {
      const { g } = lying()
      const house = startingState(g)
      expect(shown(house, g).things).toEqual([])
      expect(shown({ ...house, kv: { lookedClosely: true } }, g).things.map((thing) => thing.ref)).toEqual(['item:coin'])
      const street = walk(g, house, 'street')
      expect(shown(street, g).things).toEqual([
        {
          ref: 'item:paper',
          name: 'Newspaper',
          image: null,
          count: 2,
          pickUp: { id: 'pickUp.item:paper', label: 'Pick up', command: commandOf(places.pickUp('item:paper')) },
        },
      ])
      const took = apply(street, g, places.pickUp('item:paper'))
      expect(took.reason).toBeUndefined()
      expect(pocketOf(took.state)).toEqual({ 'item:paper': 1 })
      expect(lyingCount(took.state, g, 'item:paper', 'street')).toBe(1)
      expect(whyNot(house, g, places.pickUp('item:paper'))).toBe('There is no Newspaper here.')
      expect(whyNot({ ...street, sceneId: 'x' }, g, places.pickUp('item:paper'))).toBe('Finish this first.')
      expect(shown({ ...street, sceneId: 'x' }, g).things).toEqual([])
    })

    it('are picked up into kv keys alone when no plugin keeps things, by onPickUp', () => {
      const { g } = lying(false, { onPickUp: [{ kv: 'pickedUp', by: 1 }] })
      const street = walk(g, startingState(g), 'street')
      const took = apply(street, g, places.pickUp('item:paper')).state
      expect(lyingCount(took, g, 'item:paper', 'street')).toBe(1)
      expect(took.kv.pickedUp).toBe(1)
    })

    it('lie hidden until their when holds, are found once with onFind, and stay found', () => {
      const { g } = lying()
      const house = startingState(g)
      expect(shown(house, g).things).toEqual([])
      expect(whyNot(house, g, places.pickUp('item:key'))).toBe('There is no Key here.')
      const looked = apply(house, g, { type: 'action', id: 'look' }).state
      expect(looked.kv.foundKey).toBe(1)
      expect(shown(looked, g).things.map((thing) => thing.ref)).toEqual(['item:key'])
      // Found once: the condition failing later hides it no more, and onFind doesn't run again.
      const blinked = apply(apply(looked, g, { type: 'action', id: 'blink' }).state, g, { type: 'action', id: 'look' }).state
      expect(blinked.kv.foundKey).toBe(1)
      expect(shown(blinked, g).things.map((thing) => thing.ref)).toEqual(['item:key'])
      const took = apply(blinked, g, places.pickUp('item:key')).state
      expect(took.kv.hasKey).toBe(true)
      expect(pocketOf(took)).toEqual({ 'item:key': 1 })
    })

    it('are not found from another place', () => {
      const { g } = lying()
      const street = walk(g, startingState(g), 'street')
      const looked = apply(street, g, { type: 'action', id: 'look' }).state
      expect(looked.kv.foundKey).toBeUndefined()
    })

    it('are put down where the player is by places/put, or nowhere when the player is nowhere', () => {
      const { g } = lying()
      const house = startingState(g)
      const dropped = apply(house, g, { type: 'action', id: 'drop' }).state
      expect(lyingCount(dropped, g, 'item:paper', 'house')).toBe(1)
      expect(shown(dropped, g).things.map((thing) => [thing.ref, thing.count])).toEqual([['item:paper', 1]])
      const nowhere = { ...house, plugins: { ...house.plugins, places: { version: 1, state: { at: null, floor: {}, found: [] } } } }
      expect(apply(nowhere, g, { type: 'action', id: 'drop' }).state.plugins.places.state).toEqual({ at: null, floor: {}, found: [] })
    })

    it('are checked: an unknown location, a bad count, and onFind with no when', () => {
      const bad: Content = {
        ...town,
        kinds: [{ id: 'item', label: 'Thing' }],
        entities: [
          ...town.entities!,
          { id: 'a', of: 'item', name: 'A', traits: { ...places.lies('moon') } },
          { id: 'b', of: 'item', name: 'B', traits: { ...places.lies('house', { count: 0 }) } },
          { id: 'c', of: 'item', name: 'C', traits: { ...places.lies('house', { onFind: [] }) } },
        ],
      }
      const { problems } = loadGame([bad], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'house' })] })
      const lines = problems.map((problem) => problem.what)
      expect(lines).toContain('lies in unknown location "moon"')
      expect(lines).toContain('lies 0 of it: a count is a whole number above 0')
      expect(lines).toContain('onFind runs when a hidden thing is found: give it a when')
    })
  })

  describe('each place is an entity with the location trait', () => {
    it('is written with places.location(): the entity has the name, description, image and tags, and the trait the rest', () => {
      const cafe = place('cafe', ['street'], { tags: ['indoors'], ui: { transition: 'fade' } })
      expect(cafe).toEqual({
        id: 'cafe',
        of: 'location',
        name: 'Cafe',
        description: 'Town',
        image: 'place/cafe',
        tags: ['indoors'],
        traits: { 'places/location': { exits: ['street'], body: [{ prose: 'place.cafe' }], ui: { transition: 'fade' } } },
      })
      const { game: g } = game()
      const state = startingState(g)
      expect(locationsOf(state, g)).toEqual(['location:house', 'location:street', 'location:cafe', 'location:back', 'location:park'])
      expect(locationOf(state, g, 'back')?.parent).toBe('cafe')
      expect(locationOf(state, g, 'location:back')?.parent).toBe('cafe')
      expect(locationOf(state, g, 'moon')).toBeUndefined()
    })

    it('has its picture checked as a file, as any entity’s is', () => {
      const { game: g } = game()
      const pictures = checkGame(g).files.filter((file) => file.where.startsWith('entity location:'))
      expect(pictures).toContainEqual({ path: 'art/place/cafe.jpg', type: 'picture', where: 'entity location:cafe' })
      expect(pictures).toHaveLength(5)
    })

    it('can be of any kind that carries the trait', () => {
      const boat: Content = {
        ...town,
        prose: { ...town.prose, 'place.ferry': 'Gulls.' },
        kinds: [{ id: 'vessel', label: 'Boat', unique: true }],
        entities: [...townPlaces({ park: { exits: ['street', 'vessel:ferry'] } }), place('ferry', ['park'], { of: 'vessel', name: 'The ferry' })],
      }
      const { game: g, problems } = loadGame([boat], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'park' })] })
      expect(problems).toEqual([])
      const aboard = walk(g, startingState(g), 'vessel:ferry')
      expect(places.where(aboard, g)).toBe('vessel:ferry')
      expect(shown(aboard, g).location).toMatchObject({ id: 'vessel:ferry', ref: 'vessel:ferry', name: 'The ferry' })
    })

    it('is changed by a mod with a traits row, or replaced by its entity', () => {
      const mod: Pack = {
        id: 'mod:shortcut',
        schema: SCHEMA,
        // A row replaces the trait: the house gets a door straight to the park.
        traits: { 'places/location': { 'location:house': { exits: ['street', 'park'], body: [{ prose: 'place.house' }] } } },
        // An entity of the same reference replaces the game's: the park gets a new name.
        entities: [place('park', ['street', 'house'], { name: 'The Green' })],
      }
      const { game: g, problems } = loadGame([town], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'house' })] }, { packs: [mod] })
      expect(problems).toEqual([])
      const park = walk(g, startingState(g), 'park')
      expect(shown(park, g).location).toMatchObject({ id: 'park', name: 'The Green' })
      expect(shown(park, g).exits.map((exit) => exit.id)).toEqual(['street', 'house'])
    })

    it('answers the `places/description` value with the place’s description', () => {
      const { game: g } = game()
      expect(view(startingState(g), g).when).toBe('Day 1 · Monday morning · House')
      const { game: told } = (() => {
        const content: Content = { ...town, prose: { ...town.prose, 'place.house': 'A {{places/description}} house: {{places/name}}.' } }
        return { game: loadGame([content], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'house' })] }).game }
      })()
      expect(view(startingState(told), told).scene.body).toBe('A Town house: House.')
    })
  })
})
