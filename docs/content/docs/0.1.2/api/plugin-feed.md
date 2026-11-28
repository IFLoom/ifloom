---
title: "@ifloom/plugin-feed"
description: "Every export of @ifloom/plugin-feed and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-feed` and `@ifloom/plugin-feed/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-feed

- Functions: [`feed`](#feed), [`feedsOf`](#feedsof), [`postsOf`](#postsof)
- Types: [`Comment`](#comment), [`FeedDef`](#feeddef), [`FeedState`](#feedstate), [`FeedsView`](#feedsview), [`FeedView`](#feedview), [`OwnPost`](#ownpost), [`PostDef`](#postdef), [`PostView`](#postview)

### Comment

Type. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#comment).

A comment on a post, one entry of a post's comments in `FeedState`.

```ts shape
import type { Comment } from '@ifloom/plugin-feed'
type Comment = {
  from: string
  text: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `from` | `string` |  |  | The commenter, a character's id or a name. |
| `text` | `string` |  |  | The comment's words, as written. The view fills in their prose tokens. |

### feed

Function. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#feed).

Returns the feed plugin, for the game's `plugins`. It cooperates with the cast, which gives posters their names and
faces.

Content declares feeds and posts in `data.feed.feeds` and `data.feed.posts`, and the helpers write its calls, such as
`feed.react('post-1', { likes: 2 })`.

```ts shape
import { feed } from '@ifloom/plugin-feed'
function feed(): DefinedPlugin<FeedState, FeedsView>
```

Uses: [`DefinedPlugin`](/docs/0.1.2/api/engine-plugin#definedplugin), [`FeedState`](#feedstate), [`FeedsView`](#feedsview).

| Helper | Signature | Description |
|---|---|---|
| `feed.post` | `(feedId: string, id: string, post?: { text?: string; image?: string; video?: string; likes?: number }):` [`EffectRef`](/docs/0.1.2/api/engine#effectref) | Returns the `feed/post` effect, which posts the player's post `id` to the feed, with its words in place, picture, video and likes. A post id already used is left as it is. |
| `feed.react` | `(post: string, reaction: { likes?: number; from?: string; text?: string }):` [`EffectRef`](/docs/0.1.2/api/engine#effectref) | Returns the `feed/react` effect, which adds likes, a comment from `from`, or both, to a post that has appeared. |
| `feed.seen` | `(feedId?: string):` [`CommandRef`](/docs/0.1.2/api/engine#commandref) | Returns the `feed/seen` command, which marks the feed seen, or every feed when none is named. |
| `feed.posted` | `(gte?: number, feedId?: string):` [`Condition`](/docs/0.1.2/api/engine#condition) | Returns the `feed/posted` condition, which holds once the player has made at least `gte` posts, to the feed or to any. |

### FeedDef

Type. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#feeddef).

A feed the game declares in `data.feed.feeds`, such as a social app, a notice board or a paper. Posts name it in their `feed`.

```ts shape
import type { FeedDef } from '@ifloom/plugin-feed'
type FeedDef = {
  id: string
  name: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The feed's id, unique among the game's feeds. |
| `name` | `string` |  |  | The feed's name. |

### feedsOf

Function. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#feedsof).

Returns the game's feeds, `data.feed.feeds` from its content and packs, in declared order.

```ts shape
import { feedsOf } from '@ifloom/plugin-feed'
function feedsOf(game: Game): FeedDef[]
```

Uses: [`Game`](/docs/0.1.2/api/engine#game), [`FeedDef`](#feeddef).

### FeedState

Type. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#feedstate).

The feeds a save keeps for the player. The plugin reads feeds and other people's posts from content, so the save keeps only what play changed.

```ts shape
import type { FeedState } from '@ifloom/plugin-feed'
type FeedState = {
  appeared: Record<string, number>
  own: OwnPost[]
  reactions: Record<string, { likes: number; comments: Comment[] }>
  seen: Record<string, number>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `appeared` | `Record<string, number>` |  |  | The posts that have appeared, each id mapped to the turn it appeared on. |
| `own` | [`OwnPost[]`](#ownpost) |  |  | The player's own posts, oldest first. |
| `reactions` | `Record<string, { likes: number; comments:` [`Comment[]`](#comment) `}>` |  |  | The likes and comments added to other people's posts since they appeared, by post id. |
| `seen` | `Record<string, number>` |  |  | The number of other people's posts each feed had when the player last looked, by feed id. |

### FeedsView

Type. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#feedsview).

The feeds as the player sees them, in `view.plugins.feed`.

```ts shape
import type { FeedsView } from '@ifloom/plugin-feed'
type FeedsView = {
  feeds: FeedView[]
  unread: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `feeds` | [`FeedView[]`](#feedview) |  |  | The game's feeds, in declared order. |
| `unread` | `number` |  |  | The number of unseen posts across every feed. |

### FeedView

Type. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#feedview).

A feed as the player sees it, in `view.plugins.feed.feeds`. Its `unread` counts other people's posts the player hasn't seen.

```ts shape
import type { FeedView } from '@ifloom/plugin-feed'
type FeedView = {
  id: string
  name: string
  posts: PostView[]
  unread: number
  seen: RenderedChoice | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The feed's id. |
| `name` | `string` |  |  | The feed's name. |
| `posts` | [`PostView[]`](#postview) |  |  | The feed's posts, newest first, the player's own among them. |
| `unread` | `number` |  |  | The number of other people's posts in the feed the player hasn't seen. The player's own posts never count. |
| `seen` | [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice) `\| null` |  |  | The button that marks the feed seen, labelled with the `feed/allSeen` string. Null while nothing in it is new. |

### OwnPost

Type. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#ownpost).

A post the player made with the `feed/post` effect, as `FeedState` keeps it.

```ts shape
import type { OwnPost } from '@ifloom/plugin-feed'
type OwnPost = {
  id: string
  feed: string
  turn: number
  text?: string
  image?: string
  video?: string
  likes: number
  comments: Comment[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The post's id, which `feed/react` and `feed/likes` name. |
| `feed` | `string` |  |  | The id of the feed the post went to. |
| `turn` | `number` |  |  | The turn the post was made on. |
| `text` | `string` | yes |  | The post's words, as written. The view fills in their prose tokens. |
| `image` | `string` | yes |  | The post's picture, as written. |
| `video` | `string` | yes |  | The post's video clip, as written. |
| `likes` | `number` |  |  | The number of likes the post has. |
| `comments` | [`Comment[]`](#comment) |  |  | The comments on the post, oldest first. |

### PostDef

Type. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#postdef).

Someone else's post, which the game declares in `data.feed.posts`. It appears the first time its `when` holds after a command.

```ts shape
import type { PostDef } from '@ifloom/plugin-feed'
type PostDef = {
  id: string
  feed: string
  from: string
  when: Condition
  body: Block[]
  image?: string
  video?: string
  likes?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The post's id, unique among the game's posts. |
| `feed` | `string` |  |  | The id of the feed the post appears in. |
| `from` | `string` |  |  | The poster, a character's id or any name the game's prose uses. |
| `when` | [`Condition`](/docs/0.1.2/api/engine#condition) |  |  | The post's condition. The post appears the first time it holds after a command, and stays. |
| `body` | [`Block[]`](/docs/0.1.2/api/engine#block) |  |  | The post's words, as blocks. |
| `image` | `string` | yes |  | The post's picture, a path in the game's `art/` folder (`'photo/park.jpg'`) or a URL. |
| `video` | `string` | yes |  | The post's video clip, a path like `image`'s, where a bare name is an `.mp4`. The React UI plays it like a GIF, looping and muted. |
| `likes` | `number` | yes |  | The number of likes the post has when it appears. 0 if left out. |

### postsOf

Function. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#postsof).

Returns the game's posts, `data.feed.posts` from its content and packs, in declared order.

```ts shape
import { postsOf } from '@ifloom/plugin-feed'
function postsOf(game: Game): PostDef[]
```

Uses: [`Game`](/docs/0.1.2/api/engine#game), [`PostDef`](#postdef).

### PostView

Type. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#postview).

A post as the player sees it, in a `FeedView`'s `posts`.

```ts shape
import type { PostView } from '@ifloom/plugin-feed'
type PostView = {
  id: string
  from: string
  name: string
  portrait: string | null
  text: string
  beats: SceneBeat[]
  image: string | null
  video: string | null
  turn: number
  likes: number
  comments: { from: string; name: string; text: string }[]
  mine: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The post's id. |
| `from` | `string` |  |  | The poster as written, a character's id or a name. It's `''` for the player's own post. |
| `name` | `string` |  |  | The poster's name, or for the player's own post the `playerName` kv key, else the `feed/you` string ("You"). |
| `portrait` | `string \| null` |  |  | The poster's face for an avatar, through `artSrc`. It's a person's `portrait` with the cast, else their entity's picture. It's null for the player's own post and for a poster named only as written. |
| `text` | `string` |  |  | The post's words, tokens filled in, with any picture and video markup in them. |
| `beats` | [`SceneBeat[]`](/docs/0.1.2/api/engine#scenebeat) |  |  | The post's words rendered as beats, as a scene's are, with pictures and videos in the order written. |
| `image` | `string \| null` |  |  | The post's picture's path, through `artSrc`, or null when it has none. |
| `video` | `string \| null` |  |  | The post's video clip's path, through `artSrc`, or null when it has none. |
| `turn` | `number` |  |  | The turn the post appeared on, or was posted on. |
| `likes` | `number` |  |  | The number of likes the post has, its starting likes plus any reactions. |
| `comments` | `{ from: string; name: string; text: string }[]` |  |  | The comments on the post, oldest first, each with its commenter as written, their name and its words. |
| `mine` | `boolean` |  |  | True for the player's own post. |

## @ifloom/plugin-feed/react

- Functions: [`useFeed`](#usefeed)
- Constants: [`FEED_WORDS`](#feed_words), [`FeedSection`](#feedsection), [`feedUi`](#feedui)
- Types: [`FeedControls`](#feedcontrols)

### FEED_WORDS

Const. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#feed_words).

The feed plugin's words in English, keyed by name. A game rewords any of them with `ui.<key>` in its strings.

```ts shape
import { FEED_WORDS } from '@ifloom/plugin-feed/react'
const FEED_WORDS: { readonly likes: '♥ {n}'; }
```

### FeedControls

Type. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#feedcontrols).

The feed plugin's view with a way to mark a feed seen, as `useFeed` returns it.

```ts shape
import type { FeedControls } from '@ifloom/plugin-feed/react'
type FeedControls = {
  feeds: FeedView[]
  unread: number
  seen: (feed: string) => Result<GameState>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `feeds` | [`FeedView[]`](#feedview) |  |  | The game's feeds, in declared order. |
| `unread` | `number` |  |  | The number of unseen posts across every feed. |
| `seen` | `(feed: string) =>` [`Result`](/docs/0.1.2/api/engine#result)`<`[`GameState`](/docs/0.1.2/api/engine#gamestate)`>` |  |  | Sends the `feed/seen` command, which marks the feed's posts seen. |

### FeedSection

Const. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#feedsection).

Renders the feed named by an app section's `with.feed`, from `view.plugins.feed`, newest post first. A preset styles
its `feed`, `post` and `post-*` parts.

Each post shows its likes and comments, and a button marks the feed seen.

A post's words render as beats through `Beat`, and its `video` through `Video`, playing, looping and muted.

```ts shape
import { FeedSection } from '@ifloom/plugin-feed/react'
const FeedSection: ComponentType<SectionProps>
```

Uses: [`SectionProps`](/docs/0.1.2/api/react#sectionprops).

### feedUi

Const. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#feedui).

The feed plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It registers `FeedSection` for a
device app's `feed` section, and adds the plugin's words.

```ts shape
import { feedUi } from '@ifloom/plugin-feed/react'
const feedUi: PluginUi
```

Uses: [`PluginUi`](/docs/0.1.2/api/react-kit#pluginui).

### useFeed

Function. Explained in [Feed](/docs/0.1.2/reference/plugins/feed#usefeed).

Returns the feed plugin's view and its command from the running game, or null in a game without the plugin. It
re-renders when the view changes. `FeedSection` renders from it.

```ts shape
import { useFeed } from '@ifloom/plugin-feed/react'
function useFeed(): FeedControls | null
```

Uses: [`FeedControls`](#feedcontrols).
