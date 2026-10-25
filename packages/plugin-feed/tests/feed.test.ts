import { describe, expect, it } from 'vitest'
import { apply, holds, loadGame, startingState, view, type Game, type GameState, type Content, type GameRules } from '@ifloom/engine'
import { feed, hasPosted, postTo, react, seeFeed, type FeedsView } from '../src/index.ts'
import { calendar, pass, period, day } from '@ifloom/plugin-calendar'

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
      { id: 'wait', effects: [pass(1)] },
      { id: 'postSunset', effects: [postTo('social', 'sunset', { text: 'own.sunset', image: 'art/sunset.jpg' }), { 'game/roll': true }] },
      { id: 'cheer', effects: [react('ava.cake', { likes: 2, from: 'Sam', text: 'comment.yum' })] },
    ],
    prose: {
      'post.cake': 'Baked a cake!',
      'post.fete': 'Village fete on Saturday.',
      'own.sunset': 'Sunset from the roof.',
      'comment.yum': 'Save me a slice',
      'comment.wow': 'Wow',
    },
    data: {
      feed: {
        posts: [
          { id: 'ava.cake', feed: 'social', from: 'Ava', when: day({ gte: 1 }), body: [{ text: 'post.cake' }], likes: 3 },
          { id: 'fete', feed: 'board', from: 'Parish council', when: period('afternoon'), body: [{ text: 'post.fete' }] },
        ],
      },
    },
  }
  // The game's own roll for how a post does; here, always the same.
  const rules: GameRules = { effects: { roll: () => [react('sunset', { likes: 12, from: 'Ava', text: 'comment.wow' })] } }
  const loaded = loadGame([{ name: 'base', data: feeds }, pack], { id: 'feeds', title: 'Feeds', plugins: [clock, plugin], rules })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

const begin = (g: Game): GameState => clock.write({ ...startingState(g), sceneId: null }, { day: 1, period: 'morning' })
const shown = (state: GameState, g: Game) => view(state, g).plugins.feed as FeedsView

describe('feeds', () => {
  it('show other people’s posts once they appear, counted until the player looks', () => {
    const g = game()
    let state = apply(begin(g), g, { type: 'action', id: 'wait' }).state
    expect(shown(state, g).feeds.map((entry) => [entry.id, entry.posts.map((post) => post.text), entry.unread])).toEqual([
      ['social', ['Baked a cake!'], 1],
      ['board', ['Village fete on Saturday.'], 1],
    ])
    state = apply(state, g, seeFeed('social')).state
    expect(shown(state, g).unread).toBe(1)
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
    expect(holds(state, hasPosted(), g)).toBe(true)
    expect(holds(state, { 'feed/likes': { post: 'sunset', gte: 10 } }, g)).toBe(true)
  })

  it('add reactions to other people’s posts', () => {
    const g = game()
    let state = apply(begin(g), g, { type: 'action', id: 'wait' }).state
    state = apply(state, g, { type: 'action', id: 'cheer' }).state
    expect(shown(state, g).feeds[0].posts[0]).toMatchObject({ likes: 5, comments: [{ from: 'Sam', name: 'Sam', text: 'Save me a slice' }] })
  })
})

describe('video on a post', () => {
  it('sits beside the picture, on other people’s posts and the player’s own', () => {
    const pack: Content = {
      name: 'town',
      actions: [
        { id: 'wait', effects: [pass(1)] },
        { id: 'film', effects: [postTo('social', 'pond', { text: 'own.pond', video: 'clips/pond.mp4' })] },
      ],
      prose: { 'post.fete': 'Bunting going up.\n\n[[widevideo:fete|once]]', 'own.pond': 'Ducks.' },
      data: {
        feed: {
          posts: [
            {
              id: 'fete',
              feed: 'board',
              from: 'Parish council',
              when: day({ gte: 1 }),
              body: [{ text: 'post.fete' }],
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
    expect(social.posts[0]).toMatchObject({ id: 'pond', image: null, video: 'clips/pond.mp4', beats: [{ kind: 'text', text: 'Ducks.' }] })
    expect(board.posts[0]).toMatchObject({ id: 'fete', image: 'art/fete.jpg', video: 'art/fete.webm' })
    expect(board.posts[0].beats).toEqual([
      { kind: 'text', text: 'Bunting going up.' },
      { kind: 'video', src: 'art/fete.mp4', size: 'wide', autoplay: true, loop: false, muted: true, controls: false },
    ])
  })
})
