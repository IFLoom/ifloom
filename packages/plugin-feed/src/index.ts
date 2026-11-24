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
  artSrc,
  fillTokens,
  holds,
  pluginQuery,
  stringOf,
  type Block,
  type CommandRef,
  type Condition,
  type EffectRef,
  type Game,
  type GameState,
  type RenderedChoice,
  type SceneBeat,
} from '@ifloom/engine'
import {
  arg,
  defineCalls,
  defineData,
  definePlugin,
  list,
  parseBeats,
  renderAction,
  speakerOf,
  styledBeats,
  type CommandsOf,
  type ConditionsOf,
  type DefinedPlugin,
  type EffectsOf,
  type Reference,
  type SenderView,
} from '@ifloom/engine/plugin'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

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
  /** A picture on the post: a path in the game's `art/` folder (`'photo/park.jpg'`), as an entity's `image` is, or a URL. */
  image?: string
  /** A video clip on the post, a path like `image`'s (a bare name is an `.mp4`). Drawn like a GIF: playing, looping, muted. */
  video?: string
  /** Likes it shows when it appears. */
  likes?: number
}

/** A comment on a post. `text` is its words, as written. */
export type Comment = { from: string; text: string }

/** A post the player made, as the state keeps it. */
export type OwnPost = {
  id: string
  feed: string
  /** The turn it was posted. */
  turn: number
  /** Its words, as written; tokens are filled as it is shown. */
  text?: string
  image?: string
  video?: string
  likes: number
  comments: Comment[]
}

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
  /** The poster's face, for an avatar: a person's `portrait` with the cast, else their entity's picture, through `artSrc`; null for the player's own and for a name as written. */
  portrait: string | null
  /** The words, filled in, with any picture and video markup in them. */
  text: string
  /** The words as beats, as a scene's are, with pictures and videos in the order written. */
  beats: SceneBeat[]
  /** The post's picture's path, through `artSrc`, or null. */
  image: string | null
  /** The post's video clip's path, through `artSrc`, or null. Drawn like a GIF: playing, looping, muted. */
  video: string | null
  /** The turn it appeared, or was posted. */
  turn: number
  likes: number
  comments: { from: string; name: string; text: string }[]
  /** The player's own. */
  mine: boolean
}

/** One feed, newest post first, with how many posts the player hasn't seen: `unread`, as messages count theirs. */
export type FeedView = {
  id: string
  name: string
  posts: PostView[]
  unread: number
  /** The button that marks the feed seen (the `feed/allSeen` string, `Mark all seen`), or null while nothing in it is new. */
  seen: RenderedChoice | null
}

export type FeedsView = { feeds: FeedView[]; unread: number }

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    feed: FeedsView
  }
}

const ID = 'feed'

/** The plugin's content: `data.feed.feeds` and `data.feed.posts`, with the words a player reads in each, for a translation's `words` table. */
const DATA = defineData(ID, {
  feeds: list<FeedDef>({ noun: 'feed', words: { name: true } }),
  posts: list<PostDef>({ noun: 'post', words: { body: 'blocks' } }),
})

/** Words content wrote in place, which must not be a prose key. */
const wordsAs =
  (field: string) =>
  (words: string): Reference[] => [{ words, field }]
/** A picture or a video, as a path from the page. */
const picture = (path: string): Reference[] => [{ picture: path }]
const video = (path: string): Reference[] => [{ video: path }]

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** The post has appeared. */
    appeared: { post: arg.entry(DATA.posts) },
    /** The player has made at least `gte` posts (1 if left out), to `feed` or to any. */
    posted: { feed: arg.entry(DATA.feeds).optional(), gte: arg.number().optional(1) },
    /** A post has at least `gte` likes (1 if left out). */
    likes: { post: arg.string(), gte: arg.number().optional(1) },
  },
  effects: {
    /** The player posts to `feed`, as the post with id `post`: its words, picture or video, and likes. */
    post: {
      feed: arg.entry(DATA.feeds),
      post: arg.string(),
      text: arg.words().optional().naming(wordsAs('post')),
      image: arg.string().optional().naming(picture),
      video: arg.string().optional().naming(video),
      likes: arg.number().optional(0),
    },
    /** Likes, a comment `text` from `from`, or both, on a post. */
    react: { post: arg.string(), likes: arg.number().optional(0), from: arg.string().optional(''), text: arg.words().optional().naming(wordsAs('comment')) },
  },
  commands: {
    /** The player has looked at the feed `id`; leave `id` out for all. */
    seen: { id: arg.entry(DATA.feeds).optional() },
  },
})

/** The game's posts: `data.feed.posts`, from its packs. */
export function postsOf(game: Game): PostDef[] {
  return DATA.posts.all(game)
}

/** Who a post is from: the cast's answer when the game has the cast, else their entity's name and picture, or the name as written. */
function senderOf(state: GameState, game: Game, from: string): SenderView {
  const asked = pluginQuery(game, 'cast/sender')?.(state, { from })
  if (asked) return asked
  const known = from ? speakerOf(state, game, from) : null
  return known ? { name: known.name, image: known.image, portrait: known.image } : { name: from, image: null, portrait: null }
}

/** A post's words: its beats, and their words as a line of text, for a UI that draws no beats. */
const drawn = (beats: SceneBeat[]) => ({ text: wordsOf(beats), beats })

/** Beats' words, as a line of text. */
const wordsOf = (beats: readonly SceneBeat[]) => beats.flatMap((beat) => ('text' in beat ? [beat.text] : [])).join('\n\n')

/** The game's feeds, in order: `data.feed.feeds`, from its packs. */
export function feedsOf(game: Game): FeedDef[] {
  return DATA.feeds.all(game)
}

/**
 * The plugin. Add it to the game's `plugins`, and put the feeds and other
 * people's posts in a pack's `data.feed.feeds` and `data.feed.posts`, so a
 * mod can add either.
 */
function feedPlugin(): DefinedPlugin<FeedState, FeedsView> {
  const feedIds = (game: Game) => new Set(feedsOf(game).map((entry) => entry.id))

  /** Posts in a feed the player hasn't looked at; never below nothing, whatever an older save counted. */
  function unseenIn(record: FeedState, game: Game, id: string): number {
    return Math.max(0, count(record, game, id) - (record.seen[id] ?? 0))
  }

  /** Other people's posts that have appeared in a feed: what "unseen" counts. The player's own are never news. */
  function count(record: FeedState, game: Game, id: string): number {
    return postsOf(game).filter((post) => post.feed === id && record.appeared[post.id] !== undefined).length
  }

  return definePlugin<FeedState, FeedsView, typeof CALLS>({
    id: ID,
    version: 3,
    calls: CALLS,
    data: DATA,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    commandVersion: COMMAND_VERSION,
    commandMigrations,
    // Posters are the cast's characters when the game has the cast: a name and a face.
    cooperates: ['cast'],
    migrations: {
      // 1 → 2: the player's posts are stamped with the turn, not the day (they were the same).
      1: (state) => {
        const old = state as { own: (Omit<OwnPost, 'turn'> & { day: number })[] }
        return { ...old, own: (old.own ?? []).map(({ day, ...post }) => ({ ...post, turn: day })) }
      },
      // 2 → 3: a post's and a comment's `text` is its words, as content writes them now, not a prose key:
      // a key the game's prose has becomes those words.
      2: (state, { game }) => {
        const old = state as FeedState
        const words = <T extends { text?: string }>(entry: T): T =>
          entry.text === undefined ? entry : { ...entry, text: game.prose?.line(entry.text) ?? entry.text }
        const comments = (list: Comment[] | undefined) => (list ?? []).map(words)
        return {
          ...old,
          own: (old.own ?? []).map((post) => ({ ...words(post), comments: comments(post.comments) })),
          reactions: Object.fromEntries(Object.entries(old.reactions ?? {}).map(([id, entry]) => [id, { ...entry, comments: comments(entry.comments) }])),
        }
      },
    },
    strings: {
      /** The name on the player's own posts when the game has no `playerName` key in its kv store. */
      you: 'You',
      /** The view's button that marks a feed seen. */
      allSeen: 'Mark all seen',
    },
    start: () => ({ appeared: {}, own: [], reactions: {}, seen: {} }),
    conditions: {
      /** `{ 'feed/appeared': { post } }`. */
      appeared: (_state, { post }, { slice }) => slice.appeared[post] !== undefined,
      /** `{ 'feed/posted': { feed?, gte? } }`: how many posts the player has made, there or anywhere. */
      posted: (_state, { feed, gte }, { slice }) => slice.own.filter((post) => feed === undefined || post.feed === feed).length >= gte,
      /** `{ 'feed/likes': { post, gte } }`: a post has at least this many likes. */
      likes: (_state, { post: id, gte }, { slice, game }) => {
        const own = slice.own.find((post) => post.id === id)
        const base = own ? own.likes : (DATA.posts.get(game, id)?.likes ?? 0)
        return base + (slice.reactions[id]?.likes ?? 0) >= gte
      },
    },
    effects: {
      /**
       * `{ 'feed/post': { feed, post, text?, image?, video?, likes? } }`: the
       * player posts to `feed`, as the post with id `post`. An id already posted is left as it is.
       */
      post: (state, { post: id, feed, text, image, video, likes }, { slice, set, game }) => {
        // A feed the game doesn't have would hold a post nobody can see.
        if (slice.own.some((post) => post.id === id) || !feedIds(game).has(feed)) return state
        const post: OwnPost = { id, feed, turn: state.turn, text, image, video, likes, comments: [] }
        return set({ ...slice, own: [...slice.own, post] })
      },
      /** `{ 'feed/react': { post, likes?, from?, text? } }`: likes, a comment, or both. */
      react: (state, { post: id, likes, from, text }, { slice, set }) => {
        const comment = text === undefined ? [] : [{ from, text }]
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
      /** `{ 'feed/seen': { id } }`: the player has looked at the feed `id`; leave `id` out for all. */
      seen: {
        run: (_state, { id }, { slice, set, game }) => {
          const ids = id === undefined ? [...feedIds(game)] : [id]
          const seen = { ...slice.seen }
          for (const id of ids) seen[id] = count(slice, game, id)
          return set({ ...slice, seen })
        },
      },
    },
    values: {
      /**
       * Posts the player hasn't looked at: in every feed, or in one with
       * `{ feed }`. <code v-pre>{{feed/unread feed=social}}</code>, or a
       * badge's `{ value: 'feed/unread', with: { feed: 'social' } }`.
       */
      unread: (_state, args, { slice, game }) =>
        feedsOf(game)
          .filter((entry) => args.feed === undefined || entry.id === String(args.feed))
          .reduce((sum, entry) => sum + unseenIn(slice, game, entry.id), 0),
    },
    onCommand: (_before, after, { slice, set, game }) => {
      let appeared = slice.appeared
      for (const post of postsOf(game)) {
        if (appeared[post.id] !== undefined || !holds(after, game, post.when)) continue
        appeared = { ...appeared, [post.id]: after.turn }
      }
      return appeared === slice.appeared ? after : set({ ...slice, appeared })
    },
    view: (state, { slice, game, beats }): FeedsView => {
      const words = (text: string | undefined) => (text ? fillTokens(state, game, text) : '')
      const comments = (list: Comment[]) =>
        list.map((comment) => ({ from: comment.from, name: senderOf(state, game, comment.from).name, text: words(comment.text) }))
      const feeds = feedsOf(game).map((entry): FeedView => {
        const theirs = postsOf(game)
          .filter((post) => post.feed === entry.id && slice.appeared[post.id] !== undefined)
          .map((post, order): PostView & { order: number } => ({
            id: post.id,
            from: post.from,
            name: senderOf(state, game, post.from).name,
            portrait: senderOf(state, game, post.from).portrait,
            ...drawn(beats(post.body, post.id)),
            image: post.image === undefined ? null : artSrc(post.image),
            video: post.video === undefined ? null : artSrc(post.video, 'video'),
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
            name: typeof state.kv.playerName === 'string' ? state.kv.playerName : stringOf(game, 'feed/you'),
            portrait: null,
            ...drawn(styledBeats(parseBeats(words(post.text)))),
            image: post.image === undefined ? null : artSrc(post.image),
            video: post.video === undefined ? null : artSrc(post.video, 'video'),
            turn: post.turn,
            likes: post.likes,
            comments: comments(post.comments),
            mine: true,
            order: 1000000 + order,
          }))
        const posts = [...theirs, ...mine].sort((a, b) => b.turn - a.turn || b.order - a.order).map(({ order: _order, ...post }) => post)
        const unread = unseenIn(slice, game, entry.id)
        const seen = unread ? renderAction(state, game, { id: `seen.${entry.id}`, label: stringOf(game, `${ID}/allSeen`), command: seeFeed(entry.id) }) : null
        return { id: entry.id, name: entry.name, posts, unread, seen }
      })
      return { feeds, unread: feeds.reduce((sum, entry) => sum + entry.unread, 0) }
    },
    references: {
      content: (game) =>
        DATA.posts.content(game, (post) => [
          DATA.feeds.ref(post.feed),
          { when: post.when },
          { blocks: post.body },
          ...(post.image !== undefined ? picture(post.image) : []),
          ...(post.video !== undefined ? video(post.video) : []),
        ]),
    },
  })
}

/** An effect: the player posts to a feed. `text` is a prose key. */
const postTo = (feedId: string, id: string, post: { text?: string; image?: string; video?: string; likes?: number } = {}): EffectRef =>
  CALLS.effects.post({ feed: feedId, post: id, ...post })
/** An effect: likes, a comment, or both, on a post. */
const react = (post: string, reaction: { likes?: number; from?: string; text?: string }): EffectRef => CALLS.effects.react({ post, ...reaction })
/** A command: the player has looked at a feed, or at every feed. */
const seeFeed = (feedId?: string): CommandRef => CALLS.commands.seen(feedId === undefined ? undefined : { id: feedId })
/** A condition: the player has posted at least `gte` times, to one feed or any. */
const hasPosted = (gte = 1, feedId?: string): Condition => CALLS.conditions.posted(feedId === undefined ? { gte } : { gte, feed: feedId })

/**
 * The plugin, with its helpers on it: `feed()` makes the plugin for the
 * game's `plugins`, and content is written with `feed.react('post-1', { likes: 2 })`.
 */
export const feed = Object.assign(feedPlugin, { post: postTo, react, seen: seeFeed, posted: hasPosted })
