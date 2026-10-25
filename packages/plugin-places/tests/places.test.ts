import { describe, expect, it } from 'vitest'
import {
  SCHEMA,
  commandOf,
  apply,
  applyEffects,
  checkGame,
  heldCount,
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
import { calendar, pass, period } from '@ifloom/plugin-calendar'
import {
  at,
  go,
  location,
  locationOf,
  locationRef,
  locationsOf,
  moveTo,
  onlyAt,
  pickUp,
  places,
  where,
  within,
  type PlaceDef,
  type PlacesOptions,
  type PlacesView,
} from '../src/index.ts'

const place = (id: string, exits: string[], extra: Partial<PlaceDef> = {}) =>
  location({
    id,
    name: id[0].toUpperCase() + id.slice(1),
    desc: 'Town',
    exits,
    image: `place/${id}`,
    body: [{ text: `place.${id}` }],
    ...extra,
  })

/** The town's places, with more on some of them by id. */
const townPlaces = (more: Record<string, Partial<PlaceDef>> = {}) => [
  place('house', ['street'], more.house),
  place('street', ['house', 'cafe', 'park'], { tags: ['outdoors'], ...more.street }),
  place('cafe', ['street', 'back'], {
    blocked: [{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
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
    { id: 'coffee', blocked: [onlyAt(['cafe'], 'There is no coffee here.')], effects: [{ kv: 'coffee', to: true }] },
    { id: 'nap', label: 'Nap', effects: [pass(1)] },
    { id: 'hop', effects: [moveTo('park')] },
  ],
  entities: townPlaces(),
}

function game(options: PlacesOptions = { start: 'house' }, locks: Content['locks'] = []) {
  const clock = calendar()
  const { game, problems } = loadGame([{ name: 'base', locks }, town], {
    id: 'town',
    title: 'Town',
    plugins: [clock, places(options)],
  })
  expect(problems).toEqual([])
  return { game, clock }
}

function walk(g: Game, state: GameState, ...to: string[]): GameState {
  for (const id of to) {
    const out = apply(state, g, go(id))
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
    expect(where(state)).toBe('house')
    const screen = view(state, g)
    expect(screen.scene).toMatchObject({ title: 'House', body: 'Your house.', key: 'room:house' })
    expect(screen.when).toBe('Day 1 · Monday morning · House')
    expect(shown(state, g)).toEqual({
      location: { id: 'house', ref: 'location:house', name: 'House', desc: 'Town', tags: [], image: 'art/place/house.jpg', stage: null },
      exits: [
        {
          id: 'street',
          label: 'Street',
          ref: 'location:street',
          desc: 'Town',
          tags: ['outdoors'],
          image: 'art/place/street.jpg',
          command: commandOf(go('street')),
        },
      ],
      things: [],
    })
  })

  it('are walked between by exit, and offer what there is to do there', () => {
    const { game: g } = game()
    const state = walk(g, startingState(g), 'street', 'cafe')
    expect(where(state)).toBe('cafe')
    expect(view(state, g).actions.map((action) => action.id)).toEqual(['coffee', 'nap'])
    expect(apply(state, g, { type: 'action', id: 'coffee' }).state.kv.coffee).toBe(true)
    expect(whyNot(walk(g, startingState(g), 'street'), g, { type: 'action', id: 'coffee' })).toBe('There is no coffee here.')
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
    const staff = { ...cafe, kv: { staff: true } }
    expect(shown(staff, g).exits.map((exit) => exit.id)).toEqual(['street', 'back'])
    const locked = game({ start: 'house' }, [{ when: { kv: 'grounded' }, deny: ['places/go'], hide: true, reason: 'Grounded.' }]).game
    expect(shown({ ...startingState(locked), kv: { grounded: true } }, locked).exits).toEqual([])
  })

  it('answer `at` and `within`, following a place’s parent', () => {
    const { game: g } = game()
    const back = walk(g, { ...startingState(g), kv: { staff: true } }, 'street', 'cafe', 'back')
    expect(holds(back, at('back'), g)).toBe(true)
    expect(holds(back, at('cafe'), g)).toBe(false)
    expect(holds(back, within('cafe'), g)).toBe(true)
    expect(holds(back, within('street'), g)).toBe(false)
    expect(holds(back, within('street', 'cafe'), g)).toBe(true)
  })

  it('move the player at once by effect, closing any scene, with no exit needed', () => {
    const { game: g } = game()
    const state = apply(startingState(g), g, { type: 'action', id: 'hop' }).state
    expect(where(state)).toBe('park')
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
    expect(where(state)).toBeNull()
    expect(view(state, g).scene).toMatchObject({ title: 'Town', body: '' })
    expect(shown(state, g)).toEqual({ location: null, exits: [], things: [] })
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
      actions: [{ id: 'swim', blocked: [{ when: { not: at('lido') }, reason: 'No.' }], effects: [moveTo('pier')] }],
      entities: [place('yard', ['lane'], { parent: 'yard', body: [{ text: 'place.yard' }], actions: [{ id: 'dig', label: 'Dig', command: go('moon') }] })],
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

  describe('a place’s stage', () => {
    /** The café with a layered picture: the room, a lamp in the evening, and hotspots on them. */
    function withStage(stage: PlaceDef['stage']) {
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
        entities: [place('cafe', ['street', 'back'], { stage })],
      }
      const { game: g, problems } = loadGame([town], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'cafe' })] }, { packs: [pictures] })
      return { g, problems }
    }

    const stage: PlaceDef['stage'] = {
      aspect: '16/9',
      layers: [
        { id: 'room', src: 'cafe/room' },
        { id: 'counter', pool: 'counter', tags: ['day'] },
        { id: 'lamp', src: 'cafe/lamp.png', when: { kv: 'evening' } },
      ],
      hotspots: [
        { id: 'menu', rect: [10, 20, 30, 20], label: 'Read the menu', command: { type: 'action', id: 'coffee' } },
        { id: 'lamp', rect: [70, 5, 10, 10], label: 'The lamp', command: { type: 'action', id: 'nap' }, layer: 'lamp' },
        { id: 'door', rect: [85, 30, 15, 70], label: 'The back door', command: go('back') },
      ],
    }

    it('draws its shown layers and their hotspots in the view slice, beside the picture', () => {
      const { g, problems } = withStage(stage)
      expect(problems).toEqual([])
      const location = shown(startingState(g), g).location!
      expect(location.image).toBe('art/place/cafe.jpg')
      expect(location.stage).toEqual({
        aspect: '16/9',
        layers: [
          { id: 'room', src: 'art/cafe/room.jpg' },
          { id: 'counter', src: 'art/cafe/counter-day.jpg' },
        ],
        hotspots: [
          { id: 'menu', rect: [10, 20, 30, 20], label: 'Read the menu', command: { type: 'action', id: 'coffee' } },
          // The back room is staff only: greyed out with the exit's own reason.
          { id: 'door', rect: [85, 30, 15, 70], label: 'The back door', command: commandOf(go('back')), disabled: 'Staff only.' },
        ],
      })
    })

    it('shows a layer and its hotspot once the layer’s condition holds', () => {
      const { g } = withStage(stage)
      const evening = { ...startingState(g), kv: { evening: true } }
      const location = shown(evening, g).location!
      expect(location.stage!.layers.map((layer) => layer.id)).toEqual(['room', 'counter', 'lamp'])
      expect(location.stage!.hotspots.map((hotspot) => hotspot.id)).toEqual(['menu', 'lamp', 'door'])
    })

    it('keeps the picture but drops the hotspots while a scene is open, as the exits go', () => {
      const { g } = withStage(stage)
      const busy = { ...startingState(g), sceneId: 'anything' }
      expect(shown(busy, g).location!.stage).toMatchObject({ layers: [{ id: 'room' }, { id: 'counter' }], hotspots: [] })
    })

    it('records the pool’s pick after a command, under the place', () => {
      const { g } = withStage(stage)
      const after = apply(startingState(g), g, { type: 'action', id: 'nap' }).state
      expect(after.media.picks).toEqual({ 'counter|day|cafe|stage:1': 'cafe/counter-day.jpg' })
    })

    it('reports a choice hotspot, an unknown pool, a bad rect and an unknown layer', () => {
      const { problems } = withStage({
        layers: [{ id: 'room', pool: 'shelves' }],
        hotspots: [
          { id: 'menu', rect: [90, 0, 20, 10], label: 'Menu', choice: 'order' },
          { id: 'lamp', rect: [0, 0, 10, 10], label: 'Lamp', command: { type: 'action', id: 'dance' }, layer: 'lamp' },
        ],
      })
      expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
        'trait places/location on location:cafe: stage layer room: unknown pool "shelves"',
        'trait places/location on location:cafe: hotspot menu: names choice "order", but only a scene has choices',
        'trait places/location on location:cafe: hotspot menu: rect runs off the stage: x + width and y + height must be 100 or less',
        'trait places/location on location:cafe: hotspot lamp: unknown layer "lamp"',
        'trait places/location on location:cafe: hotspot lamp: unknown action "dance"',
      ])
    })
  })

  describe('things lying in a place', () => {
    const lying = (): { g: Game } => {
      const withThings: Content = {
        ...town,
        kinds: [{ id: 'item', label: 'Thing' }],
        entities: [
          ...town.entities!,
          { id: 'paper', of: 'item', name: 'Newspaper', at: { 'location:street': 2 } },
          { id: 'coin', of: 'item', name: 'Coin', at: 'location:house', visible: { kv: 'lookedClosely' } },
        ],
        actions: [...(town.actions ?? []), { id: 'drop', effects: [{ move: 'item:paper', from: 'you', to: 'location:park' }] }],
      }
      const { game: g, problems } = loadGame([withThings], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'house' })] })
      expect(problems).toEqual([])
      return { g }
    }

    it('are what the place’s entity holds: each location is a unique entity of the kind location', () => {
      const { g } = lying()
      expect(g.kinds?.find((kind) => kind.id === 'location')).toMatchObject({ unique: true, listed: false })
      expect(g.entities?.find((entity) => entity.of === 'location' && entity.id === 'cafe')).toMatchObject({ name: 'Cafe', desc: 'Town' })
      const state = startingState(g)
      expect(view(state, g).entities.location).toBeUndefined()
      expect(pluginQuery(g, 'places/holder')!(state)).toBe(locationRef('house'))
      expect(holds(state, { entity: 'item:paper', at: 'location:street', gte: 2 }, g)).toBe(true)
    })

    it('are shown in the place, but those not visible, with a button that picks one up', () => {
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
          pickUp: { id: 'pickUp.item:paper', label: 'Pick up', command: commandOf(pickUp('item:paper')) },
        },
      ])
      const took = apply(street, g, pickUp('item:paper'))
      expect(took.reason).toBeUndefined()
      expect([heldCount(took.state, g, 'item:paper', 'player'), heldCount(took.state, g, 'item:paper', locationRef('street'))]).toEqual([1, 1])
      expect(whyNot(house, g, pickUp('item:paper'))).toBe('There is no Newspaper here.')
      expect(whyNot({ ...street, sceneId: 'x' }, g, pickUp('item:paper'))).toBe('Finish this first.')
      expect(shown({ ...street, sceneId: 'x' }, g).things).toEqual([])
    })
  })

  describe('each place is an entity with the location trait', () => {
    it('is written with location(): the entity has the name, desc, image and tags, and the trait the rest', () => {
      const cafe = place('cafe', ['street'], { tags: ['indoors'], ui: { transition: 'fade' } })
      expect(cafe).toEqual({
        id: 'cafe',
        of: 'location',
        name: 'Cafe',
        desc: 'Town',
        image: 'place/cafe',
        tags: ['indoors'],
        traits: { 'places/location': { exits: ['street'], body: [{ text: 'place.cafe' }], ui: { transition: 'fade' } } },
      })
      const { game: g } = game()
      expect(locationsOf(g)).toEqual(['location:house', 'location:street', 'location:cafe', 'location:back', 'location:park'])
      expect(locationOf(g, 'back')?.parent).toBe('cafe')
      expect(locationOf(g, 'location:back')?.parent).toBe('cafe')
      expect(locationOf(g, 'moon')).toBeUndefined()
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
      expect(where(aboard)).toBe('vessel:ferry')
      expect(shown(aboard, g).location).toMatchObject({ id: 'vessel:ferry', ref: 'vessel:ferry', name: 'The ferry' })
      expect(pluginQuery(g, 'places/holder')!(aboard)).toBe('vessel:ferry')
    })

    it('is changed by a mod with a traits row, or replaced by its entity', () => {
      const mod: Pack = {
        id: 'mod:shortcut',
        schema: SCHEMA,
        // A row replaces the trait: the house gets a door straight to the park.
        traits: { 'places/location': { 'location:house': { exits: ['street', 'park'], body: [{ text: 'place.house' }] } } },
        // An entity of the same reference replaces the game's: the park gets a new name.
        entities: [place('park', ['street', 'house'], { name: 'The Green' })],
      }
      const { game: g, problems } = loadGame([town], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'house' })] }, { packs: [mod] })
      expect(problems).toEqual([])
      const park = walk(g, startingState(g), 'park')
      expect(shown(park, g).location).toMatchObject({ id: 'park', name: 'The Green' })
      expect(shown(park, g).exits.map((exit) => exit.id)).toEqual(['street', 'house'])
    })

    it('answers the `places/desc` value with the place’s desc', () => {
      const { game: g } = game()
      expect(view(startingState(g), g).when).toBe('Day 1 · Monday morning · House')
      const { game: told } = (() => {
        const content: Content = { ...town, prose: { ...town.prose, 'place.house': 'A {{v:places/desc}} house: {{v:places/name}}.' } }
        return { game: loadGame([content], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'house' })] }).game }
      })()
      expect(view(startingState(told), told).scene.body).toBe('A Town house: House.')
    })

    it('reports locations still written in data', () => {
      const old = { name: 'old', data: { places: { locations: [{ id: 'yard' }] } } } as unknown as Content
      const { problems } = loadGame([old], { id: 't', title: 'T', plugins: [places()] })
      expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
        'locations yard: locations are entities now: write them in entities with location({ id, name, exits, body, ... })',
      ])
    })
  })

  it('carries an older pack’s locations forward into entities, art as the image and tag as the desc', () => {
    const old = {
      id: 'mod:old',
      schema: 23,
      prose: { 'place.shed': 'The {{v:places/tag}} shed.' },
      data: { places: { locations: [{ id: 'shed', name: 'Shed', tag: 'Garden', art: 'place/shed', exits: ['house'], body: [{ text: 'place.shed' }] }] } },
    } as unknown as Pack
    const { game: g, problems } = loadGame([town], { id: 'town', title: 'Town', plugins: [calendar(), places({ start: 'house' })] }, { packs: [old] })
    expect(problems).toEqual([])
    expect(g.entities?.find((entity) => entity.id === 'shed')).toEqual({
      of: 'location',
      id: 'shed',
      name: 'Shed',
      desc: 'Garden',
      image: 'place/shed',
      traits: { 'places/location': { exits: ['house'], body: [{ text: 'place.shed' }] } },
    })
    expect(g.data?.places).toBeUndefined()
    const shed = applyEffects(startingState(g), g, [moveTo('shed')])
    expect(view(shed, g).scene.body).toBe('The Garden shed.')
  })
})
