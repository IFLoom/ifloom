/**
 * @ifloom/plugin-feed — timelines of posts that appear when the story allows,
 * the player's own posts, and the reactions they get.
 *
 * A feed is the game's: a social app, a town notice board, the morning paper.
 * Other people's posts are content that appears the first time a condition
 * holds. The player's own go up with the `feed/post` effect — from an action
 * with a cost, usually — and collect likes and comments with `feed/react`.
 * Nothing here knows about phones; a device shows a feed as an app.
 */
import {
  defaultRuntime,
  definePlugin,
  holds,
  parseBeats,
  pluginQuery,
  renderScene,
  say,
  type Block,
  type Command,
  type Condition,
  type EffectRef,
  type Game,
  type GameState,
  type PluginProblem,
  type Reference,
  type SceneBeat,
} from '@ifloom/engine'

export type FeedDef = { id: string; name: string }

/** Someone else's post. */
export type PostDef = {
  id: string
  feed: string
  /** A character id, or any name the game's prose uses. */
  from: string
  /** It appears the first time this holds after a command. */
  when: Condition
  /** Its words, as prose blocks. */
  body: Block[]
  image?: string
  /** A video clip on the post, as a path from the page like `image`. Drawn like a GIF: playing, looping, muted. */
  video?: string
  /** Likes it shows when it appears. */
  likes?: number
}

/** A comment on a post. `text` is a prose key. */
export type Comment = { from: string; text: string }

/** A post the player made, as the state keeps it. */
export type OwnPost = {
  id: string
  feed: string
  /** The turn it was posted. */
  turn: number
  /** A prose key. */
  text?: string
  image?: string
  video?: string
  likes: number
  comments: Comment[]
}

export type FeedOptions = { feeds: FeedDef[] }

/** What the plugin keeps in a save. */
export type FeedState = {
  /** The turn each post appeared, by post id. */
  appeared: Record<string, number>
  /** The player's own posts, oldest first. */
  own: OwnPost[]
  /** Likes and comments added to other people's posts since they appeared. */
  reactions: Record<string, { likes: number; comments: Comment[] }>
  /** How many posts each feed had when the player last looked. */
  seen: Record<string, number>
}

export type PostView = {
  id: string
  from: string
  name: string
  portrait: string | null
  /** The words, filled in, with any picture and video markup in them. */
  text: string
  /** The words as beats, as a scene's are, with pictures and videos in the order written. */
  beats: SceneBeat[]
  image: string | null
  /** The post's video clip, or null. Drawn like a GIF: playing, looping, muted. */
  video: string | null
  /** The turn it appeared, or was posted. */
  turn: number
  likes: number
  comments: { from: string; name: string; text: string }[]
  /** The player's own. */
  mine: boolean
}

export type FeedView = { id: string; name: string; posts: PostView[]; unseen: number }

export type FeedsView = { feeds: FeedView[]; unseen: number }

const ID = 'feed'

/** The game's posts: `data.feed.posts`, from its packs. */
export function postDefs(game: Game): PostDef[] {
  return (game.data?.[ID]?.posts ?? []) as PostDef[]
}

/** Who posted, as the cast plugin knows them, asked by name: a name and a face, or the name as written. */
function personOf(game: Game, state: GameState, from: string): { name: string; portrait: string | null } {
  const known = pluginQuery(game, 'cast/person')?.(state, { value: from }) as { name: string; portrait: string | null } | undefined
  return known ?? { name: from, portrait: null }
}

/**
 * The plugin. Add it to the game's `plugins` with the feeds the game has, and
 * put other people's posts in a pack's `data.feed.posts`.
 */
export function feed(options: FeedOptions) {
  const feedIds = new Set(options.feeds.map((entry) => entry.id))

  /** Posts in a feed the player hasn't looked at; never below nothing, whatever an older save counted. */
  function unseenIn(record: FeedState, game: Game, id: string): number {
    return Math.max(0, count(record, game, id) - (record.seen[id] ?? 0))
  }

  /** Other people's posts that have appeared in a feed: what "unseen" counts. The player's own are never news. */
  function count(record: FeedState, game: Game, id: string): number {
    return postDefs(game).filter((post) => post.feed === id && record.appeared[post.id] !== undefined).length
  }

  return definePlugin<FeedState>({
    id: ID,
    version: 2,
    // Posters are the cast's characters when the game has the cast: a name and a face.
    cooperates: ['cast'],
    migrations: {
      // 1 → 2: the player's posts are stamped with the turn, not the day (they were the same).
      1: (state) => {
        const old = state as { own: (Omit<OwnPost, 'turn'> & { day: number })[] }
        return { ...old, own: (old.own ?? []).map(({ day, ...post }) => ({ ...post, turn: day })) }
      },
    },
    strings: {
      /** The name on the player's own posts when the game has no `playerName` variable. */
      you: 'You',
    },
    start: () => ({ appeared: {}, own: [], reactions: {}, seen: {} }),
    conditions: {
      /** `{ custom: 'feed/appeared', with: { post } }`. */
      appeared: (_state, args, { slice }) => slice.appeared[String(args.post)] !== undefined,
      /** `{ custom: 'feed/posted', with: { feed?, gte? } }`: how many posts the player has made, there or anywhere. */
      posted: (_state, args, { slice }) =>
        slice.own.filter((post) => args.feed === undefined || post.feed === args.feed).length >= Number(args.gte ?? 1),
      /** `{ custom: 'feed/likes', with: { post, gte } }`: a post has at least this many likes. */
      likes: (_state, args, { slice, game }) => {
        const id = String(args.post)
        const own = slice.own.find((post) => post.id === id)
        const base = own ? own.likes : (postDefs(game).find((post) => post.id === id)?.likes ?? 0)
        return base + (slice.reactions[id]?.likes ?? 0) >= Number(args.gte ?? 1)
      },
    },
    effects: {
      /**
       * `{ custom: 'feed/post', with: { feed, id, text?, image?, video?, likes? } }`: the
       * player posts. An id already posted is left as it is.
       */
      post: (state, args, { slice, set }) => {
        const id = String(args.id)
        // A feed the game doesn't have would hold a post nobody can see.
        if (slice.own.some((post) => post.id === id) || !feedIds.has(String(args.feed))) return state
        const post: OwnPost = {
          id,
          feed: String(args.feed),
          turn: state.turn,
          text: args.text === undefined ? undefined : String(args.text),
          image: args.image === undefined ? undefined : String(args.image),
          video: args.video === undefined ? undefined : String(args.video),
          likes: Number(args.likes ?? 0),
          comments: [],
        }
        return set({ ...slice, own: [...slice.own, post] })
      },
      /** `{ custom: 'feed/react', with: { post, likes?, from?, text? } }`: likes, a comment, or both. */
      react: (state, args, { slice, set }) => {
        const id = String(args.post)
        const comment = args.text === undefined ? [] : [{ from: String(args.from ?? ''), text: String(args.text) }]
        const likes = Number(args.likes ?? 0)
        const own = slice.own.findIndex((post) => post.id === id)
        if (own >= 0) {
          const list = [...slice.own]
          list[own] = { ...list[own], likes: list[own].likes + likes, comments: [...list[own].comments, ...comment] }
          return set({ ...slice, own: list })
        }
        if (slice.appeared[id] === undefined) return state
        const before = slice.reactions[id] ?? { likes: 0, comments: [] }
        return set({
          ...slice,
          reactions: { ...slice.reactions, [id]: { likes: before.likes + likes, comments: [...before.comments, ...comment] } },
        })
      },
    },
    commands: {
      /** `{ type: 'custom', name: 'feed/seen', with: { feed } }`: the player has looked; leave `feed` out for all. */
      seen: {
        run: (_state, args, { slice, set, game }) => {
          const ids = args.feed === undefined ? [...feedIds] : [String(args.feed)]
          const seen = { ...slice.seen }
          for (const id of ids) seen[id] = count(slice, game, id)
          return set({ ...slice, seen })
        },
      },
    },
    values: {
      /** <code v-pre>{{v:feed/unseen}}</code>: posts the player hasn't looked at, in every feed. */
      unseen: (_state, { slice, game }) =>
        options.feeds.reduce((sum, entry) => sum + unseenIn(slice, game, entry.id), 0),
      ...Object.fromEntries(
        options.feeds.map((entry) => [
          `unseen-${entry.id}`,
          (_state: GameState, { slice, game }: { slice: FeedState; game: Game }) =>
            unseenIn(slice, game, entry.id),
        ]),
      ),
    },
    hooks: {
      after: (_before, after, { slice, set, game }) => {
        let appeared = slice.appeared
        for (const post of postDefs(game)) {
          if (appeared[post.id] !== undefined || !holds(after, post.when, game)) continue
          appeared = { ...appeared, [post.id]: after.turn }
        }
        return appeared === slice.appeared ? after : set({ ...slice, appeared })
      },
    },
    view: (state, { slice, game, picks }): FeedsView => {
      const runtime = defaultRuntime(game)
      const words = (key: string | undefined) => (key ? (game.prose?.line(key, state) ?? '') : '')
      const comments = (list: Comment[]) => list.map((comment) => ({ from: comment.from, name: personOf(game, state, comment.from).name, text: words(comment.text) }))
      const feeds = options.feeds.map((entry): FeedView => {
        const theirs = postDefs(game)
          .filter((post) => post.feed === entry.id && slice.appeared[post.id] !== undefined)
          .map((post, order): PostView & { order: number } => ({
            id: post.id,
            from: post.from,
            name: personOf(game, state, post.from).name,
            portrait: personOf(game, state, post.from).portrait,
            text: renderScene({ id: post.id, body: post.body, choices: [] }, state, runtime, picks).body ?? '',
            beats: [],
            image: post.image ?? null,
            video: post.video ?? null,
            turn: slice.appeared[post.id],
            likes: (post.likes ?? 0) + (slice.reactions[post.id]?.likes ?? 0),
            comments: comments(slice.reactions[post.id]?.comments ?? []),
            mine: false,
            order,
          }))
        const mine = slice.own
          .filter((post) => post.feed === entry.id)
          .map((post, order): PostView & { order: number } => ({
            id: post.id,
            from: '',
            name: typeof state.flags.playerName === 'string' ? state.flags.playerName : say(game, 'feed/you'),
            portrait: null,
            text: words(post.text),
            beats: [],
            image: post.image ?? null,
            video: post.video ?? null,
            turn: post.turn,
            likes: post.likes,
            comments: comments(post.comments),
            mine: true,
            order: 1000000 + order,
          }))
        const posts = [...theirs, ...mine]
          .sort((a, b) => b.turn - a.turn || b.order - a.order)
          .map(({ order: _order, ...post }) => ({ ...post, beats: parseBeats(post.text) }))
        return { id: entry.id, name: entry.name, posts, unseen: unseenIn(slice, game, entry.id) }
      })
      return { feeds, unseen: feeds.reduce((sum, entry) => sum + entry.unseen, 0) }
    },
    references: {
      calls: (kind, name, args) => {
        if (kind === 'conditions' && name === 'appeared') return [{ entry: String(args.post), plugin: 'feed', list: 'posts', noun: 'post' }]
        if (kind !== 'effects') return []
        // What the player posts or comments: its words, and its picture or video as a path from the page.
        const refs: Reference[] = []
        if (args.text !== undefined) refs.push({ prose: String(args.text) })
        if (name === 'post' && args.image !== undefined) refs.push({ picture: String(args.image), asWritten: true })
        if (name === 'post' && args.video !== undefined) refs.push({ video: String(args.video), asWritten: true })
        return refs
      },
      content: (game) =>
        postDefs(game).map((post) => ({
          list: 'posts',
          id: post.id,
          refs: [
            { when: post.when },
            { blocks: post.body },
            ...(post.image !== undefined ? [{ picture: post.image, asWritten: true }] : []),
            ...(post.video !== undefined ? [{ video: post.video, asWritten: true }] : []),
          ],
        })),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const post of postDefs(game)) {
        if (!feedIds.has(post.feed)) problems.push({ list: 'posts', id: post.id, what: `no feed called "${post.feed}"` })
      }
      return problems
    },
  })
}

/** An effect: the player posts to a feed. `text` is a prose key. */
export const postTo = (feedId: string, id: string, post: { text?: string; image?: string; video?: string; likes?: number } = {}): EffectRef => ({
  custom: 'feed/post',
  with: { feed: feedId, id, ...post },
})
/** An effect: likes, a comment, or both, on a post. */
export const react = (post: string, reaction: { likes?: number; from?: string; text?: string }): EffectRef => ({
  custom: 'feed/react',
  with: { post, ...reaction },
})
/** A command: the player has looked at a feed, or at every feed. */
export const seeFeed = (feedId?: string): Command => ({ type: 'custom', name: 'feed/seen', with: { feed: feedId } })
/** A condition: the player has posted at least `gte` times, to one feed or any. */
export const hasPosted = (gte = 1, feedId?: string): Condition => ({
  custom: 'feed/posted',
  with: feedId === undefined ? { gte } : { gte, feed: feedId },
})
