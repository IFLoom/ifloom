import { describe, expect, it } from 'vitest'
import {
  SCHEMA,
  apply,
  holds,
  loadGame,
  loadState,
  translatableFields,
  upgradePack,
  view,
  type Game,
  type GameState,
  type Content,
  type GameRules,
} from '@ifloom/engine'
import { freshState, loadChecked } from '@ifloom/engine/testing'
import { feed, type FeedsView } from '../src/index.ts'
import { calendar } from '@ifloom/plugin-calendar'

const clock = calendar()

const plugin = feed()
/** The feeds, as the base game's content. */
const feeds = {
  feed: {
    feeds: [
      { id: 'social', name: 'Social' },
      { id: 'board', name: 'Notice board' },
    ],
  },
}

function game(): Game {
  const pack: Content = {
    name: 'town',
    stats: [{ id: 'fans', label: 'Fans' }],
    actions: [
      { id: 'wait', effects: [calendar.pass(1)] },
      { id: 'postSunset', effects: [feed.post('social', 'sunset', { text: 'Sunset from the roof.', image: 'art/sunset.jpg' }), { 'game/roll': true }] },
      { id: 'cheer', effects: [feed.react('ava.cake', { likes: 2, from: 'Sam', text: 'Save me a slice' })] },
    ],
    prose: {
      'post.cake': 'Baked a cake!',
      'post.fete': 'Village fete on Saturday.',
    },
    data: {
      feed: {
        posts: [
          { id: 'ava.cake', feed: 'social', from: 'Ava', when: calendar.day({ gte: 1 }), body: [{ prose: 'post.cake' }], likes: 3 },
          { id: 'fete', feed: 'board', from: 'Parish council', when: calendar.period('afternoon'), body: [{ prose: 'post.fete' }] },
        ],
      },
    },
  }
  // The game's own roll for how a post does; here, always the same.
  const rules: GameRules = { macros: { roll: () => [feed.react('sunset', { likes: 12, from: 'Ava', text: 'Wow' })] } }
  return loadChecked([{ name: 'base', data: feeds }, pack], { id: 'feeds', title: 'Feeds', plugins: [clock, plugin], rules })
}

const begin = (g: Game): GameState => clock.write(freshState(g), { day: 1, period: 'morning' })
const shown = (state: GameState, g: Game) => view(state, g).plugins.feed as FeedsView

describe('feeds', () => {
  it('show other people’s posts once they appear, counted until the player looks', () => {
    const g = game()
    let state = apply(begin(g), g, { type: 'action', id: 'wait' }).state
    expect(shown(state, g).feeds.map((entry) => [entry.id, entry.posts.map((post) => post.text), entry.unread])).toEqual([
      ['social', ['Baked a cake!'], 1],
      ['board', ['Village fete on Saturday.'], 1],
    ])
    const social = shown(state, g).feeds[0]
    expect(social.seen).toMatchObject({ label: 'Mark all seen', command: { type: 'custom', name: 'feed/seen', with: { id: 'social' } } })
    state = apply(state, g, social.seen!.command).state
    expect(shown(state, g).unread).toBe(1)
    expect(shown(state, g).feeds[0].seen).toBeNull()
  })

  it('take the player’s own posts, newest first, with the reactions they get', () => {
    const g = game()
    let state = apply(begin(g), g, { type: 'action', id: 'wait' }).state
    state = apply(state, g, { type: 'action', id: 'postSunset' }).state
    const social = shown(state, g).feeds[0]
    expect(social.posts[0]).toMatchObject({
      id: 'sunset',
      mine: true,
      name: 'You',
      text: 'Sunset from the roof.',
      image: 'art/sunset.jpg',
      likes: 12,
      comments: [{ from: 'Ava', name: 'Ava', text: 'Wow' }],
    })
    expect(holds(state, g, feed.posted())).toBe(true)
    expect(holds(state, g, { 'feed/likes': { post: 'sunset', gte: 10 } })).toBe(true)
  })

  it('add reactions to other people’s posts', () => {
    const g = game()
    let state = apply(begin(g), g, { type: 'action', id: 'wait' }).state
    state = apply(state, g, { type: 'action', id: 'cheer' }).state
    expect(shown(state, g).feeds[0].posts[0]).toMatchObject({ likes: 5, comments: [{ from: 'Sam', name: 'Sam', text: 'Save me a slice' }] })
  })
})

describe('words written as prose keys', () => {
  it('are their words in a schema 24 pack, and in a save from version 2 of the feed', () => {
    const old = {
      id: 'mod:posts',
      schema: 24,
      prose: { 'own.pier': 'The pier at dusk.' },
      actions: [{ id: 'snap', effects: [feed.post('social', 'pier', { text: 'own.pier' }), feed.react('pier', { from: 'Ava', text: 'Lovely' })] }],
    }
    const upgraded = upgradePack(old, [feed()])
    expect(upgraded.ok && upgraded.value.actions?.[0].effects).toEqual([
      feed.post('social', 'pier', { text: 'The pier at dusk.' }),
      feed.react('pier', { from: 'Ava', text: 'Lovely' }),
    ])

    const g = game()
    const saved = {
      ...JSON.parse(JSON.stringify(begin(g))),
      plugins: {
        ...JSON.parse(JSON.stringify(begin(g).plugins)),
        feed: {
          version: 2,
          state: { appeared: {}, own: [{ id: 'cake', feed: 'social', turn: 0, text: 'post.cake', likes: 0, comments: [] }], reactions: {}, seen: {} },
        },
      },
    }
    const loaded = loadState(saved, g)
    expect(loaded.ok && shown(loaded.value, g).feeds[0].posts[0].text).toBe('Baked a cake!')
  })
})

describe('words in a post’s effect', () => {
  it('are fields a translation gives other words, under where the effect is', () => {
    const fields = translatableFields(game()).filter((field) => field.key.startsWith('action.'))
    expect(fields.map((field) => [field.key.replace(/\.[0-9a-f]{6}\./, '.#.'), field.text])).toEqual([
      ['action.postSunset.feed/post.#.text', 'Sunset from the roof.'],
      ['action.cheer.feed/react.#.text', 'Save me a slice'],
    ])
    const key = fields[0].key
    const { game: translated, problems } = loadGame(
      [{ name: 'base', data: feeds }],
      { id: 'feeds', title: 'Feeds', plugins: [clock, plugin], rules: { macros: { roll: () => [] } } },
      { packs: [{ id: 'mod:fr', schema: SCHEMA, actions: game().actions, words: { [key]: 'Coucher de soleil.' } }] },
    )
    expect(problems).toEqual([])
    expect(JSON.stringify(translated.actions)).toContain('Coucher de soleil.')
  })
})

describe('video on a post', () => {
  it('sits beside the picture, on other people’s posts and the player’s own', () => {
    const pack: Content = {
      name: 'town',
      actions: [
        { id: 'wait', effects: [calendar.pass(1)] },
        { id: 'film', effects: [feed.post('social', 'pond', { text: 'Ducks.', video: 'clips/pond.mp4' })] },
      ],
      prose: { 'post.fete': 'Bunting going up.\n\n[[widevideo:fete|once]]' },
      data: {
        feed: {
          posts: [
            {
              id: 'fete',
              feed: 'board',
              from: 'Parish council',
              when: calendar.day({ gte: 1 }),
              body: [{ prose: 'post.fete' }],
              image: 'art/fete.jpg',
              video: 'art/fete.webm',
            },
          ],
        },
      },
    }
    const { game: g, problems } = loadGame([{ name: 'base', data: feeds }, pack], { id: 'feeds', title: 'Feeds', plugins: [clock, plugin] })
    expect(problems).toEqual([])
    let state = apply(begin(g), g, { type: 'action', id: 'wait' }).state
    state = apply(state, g, { type: 'action', id: 'film' }).state
    const [social, board] = shown(state, g).feeds
    expect(social.posts[0]).toMatchObject({ id: 'pond', image: null, video: 'art/clips/pond.mp4', beats: [{ type: 'text', text: 'Ducks.' }] })
    expect(board.posts[0]).toMatchObject({ id: 'fete', image: 'art/fete.jpg', video: 'art/fete.webm' })
    expect(board.posts[0].beats).toEqual([
      { type: 'text', text: 'Bunting going up.' },
      { type: 'video', src: 'art/fete.mp4', size: 'wide', autoplay: true, loop: false, muted: true, controls: false },
    ])
  })
})
