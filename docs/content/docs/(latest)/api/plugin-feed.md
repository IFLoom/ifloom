---
title: "@ifloom/plugin-feed"
description: "Every export of @ifloom/plugin-feed and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-feed` and `@ifloom/plugin-feed/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-feed

- Functions: [`feed`](#feed), [`feedsOf`](#feedsof), [`postsOf`](#postsof)
- Types: [`Comment`](#comment), [`FeedDef`](#feeddef), [`FeedState`](#feedstate), [`FeedsView`](#feedsview), [`FeedView`](#feedview), [`OwnPost`](#ownpost), [`PostDef`](#postdef), [`PostView`](#postview)

### Comment

Type. Explained in [Feed](/docs/plugins/feed#comment).

A comment on a post. `text` is its words, as written.

```ts shape
import type { Comment } from '@ifloom/plugin-feed'
type Comment = {
  from: string
  text: string
}
```

### feed

Function. Explained in [Feed](/docs/plugins/feed#feed).

The plugin, with its helpers on it: `feed()` makes the plugin for the
game's `plugins`, and content is written with `feed.react('post-1', { likes: 2 })`.

```ts shape
import { feed } from '@ifloom/plugin-feed'
function feed(): DefinedPlugin<FeedState, FeedsView>
```

| Helper | Signature | Description |
|---|---|---|
| `feed.post` | `(feedId: string, id: string, post?: { text?: string; image?: string; video?: string; likes?: number }): EffectRef` |  |
| `feed.react` | `(post: string, reaction: { likes?: number; from?: string; text?: string }): EffectRef` |  |
| `feed.seen` | `(feedId?: string): CommandRef` |  |
| `feed.posted` | `(gte?: number, feedId?: string): Condition` |  |

### FeedDef

Type. Explained in [Feed](/docs/plugins/feed#feeddef).

```ts shape
import type { FeedDef } from '@ifloom/plugin-feed'
type FeedDef = {
  id: string
  name: string
}
```

### feedsOf

Function. Explained in [Feed](/docs/plugins/feed#feedsof).

The game's feeds, in order: `data.feed.feeds`, from its packs.

```ts shape
import { feedsOf } from '@ifloom/plugin-feed'
function feedsOf(game: Game): FeedDef[]
```

### FeedState

Type. Explained in [Feed](/docs/plugins/feed#feedstate).

What the plugin keeps in a save.

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
| `appeared` | `Record<string, number>` |  |  | The turn each post appeared, by post id. |
| `own` | `OwnPost[]` |  |  | The player's own posts, oldest first. |
| `reactions` | `Record<string, { likes: number; comments: Comment[] }>` |  |  | Likes and comments added to other people's posts since they appeared. |
| `seen` | `Record<string, number>` |  |  | How many posts each feed had when the player last looked. |

### FeedsView

Type. Explained in [Feed](/docs/plugins/feed#feedsview).

```ts shape
import type { FeedsView } from '@ifloom/plugin-feed'
type FeedsView = {
  feeds: FeedView[]
  unread: number
}
```

### FeedView

Type. Explained in [Feed](/docs/plugins/feed#feedview).

One feed, newest post first, with how many posts the player hasn't seen: `unread`, as messages count theirs.

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
| `id` | `string` |  |  |  |
| `name` | `string` |  |  |  |
| `posts` | `PostView[]` |  |  | Its posts, newest first, the player's own among them. |
| `unread` | `number` |  |  | How many of its posts the player hasn't seen. |
| `seen` | `RenderedChoice \| null` |  |  | The button that marks the feed seen (the `feed/allSeen` string, `Mark all seen`), or null while nothing in it is new. |

### OwnPost

Type. Explained in [Feed](/docs/plugins/feed#ownpost).

A post the player made, as the state keeps it.

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
| `id` | `string` |  |  |  |
| `feed` | `string` |  |  | The feed it was posted to. |
| `turn` | `number` |  |  | The turn it was posted. |
| `text` | `string` | yes |  | Its words, as written; tokens are filled as it is shown. |
| `image` | `string` | yes |  | Its picture, as written. |
| `video` | `string` | yes |  | Its video clip, as written. |
| `likes` | `number` |  |  | How many likes it has. |
| `comments` | `Comment[]` |  |  | The comments on it, in order. |

### PostDef

Type. Explained in [Feed](/docs/plugins/feed#postdef).

Someone else's post.

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
| `id` | `string` |  |  |  |
| `feed` | `string` |  |  | The feed it appears in, by id. |
| `from` | `string` |  |  | A character id, or any name the game's prose uses. |
| `when` | `Condition` |  |  | It appears the first time this holds after a command. |
| `body` | `Block[]` |  |  | Its words, as prose blocks. |
| `image` | `string` | yes |  | A picture on the post: a path in the game's `art/` folder (`'photo/park.jpg'`), as an entity's `image` is, or a URL. |
| `video` | `string` | yes |  | A video clip on the post, a path like `image`'s (a bare name is an `.mp4`). Drawn like a GIF: playing, looping, muted. |
| `likes` | `number` | yes |  | Likes it shows when it appears. |

### postsOf

Function. Explained in [Feed](/docs/plugins/feed#postsof).

The game's posts: `data.feed.posts`, from its packs.

```ts shape
import { postsOf } from '@ifloom/plugin-feed'
function postsOf(game: Game): PostDef[]
```

### PostView

Type. Explained in [Feed](/docs/plugins/feed#postview).

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
| `id` | `string` |  |  |  |
| `from` | `string` |  |  | Who posted it, as written: a character id or a name; `''` for the player's own. |
| `name` | `string` |  |  |  |
| `portrait` | `string \| null` |  |  | The poster's face, for an avatar: a person's `portrait` with the cast, else their entity's picture, through `artSrc`; null for the player's own and for a name as written. |
| `text` | `string` |  |  | The words, filled in, with any picture and video markup in them. |
| `beats` | `SceneBeat[]` |  |  | The words as beats, as a scene's are, with pictures and videos in the order written. |
| `image` | `string \| null` |  |  | The post's picture's path, through `artSrc`, or null. |
| `video` | `string \| null` |  |  | The post's video clip's path, through `artSrc`, or null. Drawn like a GIF: playing, looping, muted. |
| `turn` | `number` |  |  | The turn it appeared, or was posted. |
| `likes` | `number` |  |  | How many likes it has. |
| `comments` | `{ from: string; name: string; text: string }[]` |  |  | The comments on it, in order, each with who wrote it and their name. |
| `mine` | `boolean` |  |  | The player's own. |

## @ifloom/plugin-feed/react

- Functions: [`useFeed`](#usefeed)
- Constants: [`FEED_WORDS`](#feed_words), [`FeedSection`](#feedsection), [`feedUi`](#feedui)
- Types: [`FeedControls`](#feedcontrols)

### FEED_WORDS

Const.

The feed plugin's words, in English. A game rewords any with `ui.<key>` in its strings.

```ts shape
import { FEED_WORDS } from '@ifloom/plugin-feed/react'
const FEED_WORDS: { readonly likes: '♥ {n}'; }
```

### FeedControls

Type.

What `useFeed` returns: the feed plugin's view, and its command.

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
| `feeds` | `FeedView[]` |  |  |  |
| `unread` | `number` |  |  |  |
| `seen` | `(feed: string) => Result<GameState>` |  |  | Mark a feed's posts seen: sends `feed/seen`. |

### FeedSection

Const. Explained in [Feed](/docs/plugins/feed#feedsection).

A feed in an app: posts newest first, with likes and comments, and a button
to mark the feed seen. A post's words are drawn as beats through `Beat`, and
its `video` through `Video`, like a GIF. A thin default on `useFeed`.

```ts shape
import { FeedSection } from '@ifloom/plugin-feed/react'
const FeedSection: ComponentType<SectionProps>
```

### feedUi

Const. Explained in [Feed](/docs/plugins/feed#feedui).

The feed plugin's React UI, for `plugins` on `mountGame` or `GameProvider`:
a `FeedSection` wherever a device's app shows a feed, and the feed's words.

```ts shape
import { feedUi } from '@ifloom/plugin-feed/react'
const feedUi: PluginUi
```

### useFeed

Function. Explained in [Feed](/docs/plugins/feed#usefeed).

The feed plugin's view with its command, or null in a game without the plugin. `FeedSection` is drawn from it.

```ts shape
import { useFeed } from '@ifloom/plugin-feed/react'
function useFeed(): FeedControls | null
```
