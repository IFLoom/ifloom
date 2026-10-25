---
title: "Feed"
description: "Social feeds of other people's posts, the player's own posts, and the likes and comments they get."
---
`@ifloom/plugin-feed` keeps timelines of posts, like a social app or a notice board. Other people's posts appear when the story allows. The player's own go up through an effect, usually on an action with a cost, and collect likes and comments.

You'd want it when the town keeps talking while the player isn't there: a friend's photo the morning after, a notice about the fête, the player's own post that does well or doesn't. In the showcase, Ava and Sam post to a social feed and the player posts the photos they take.

Other people's posts are content, and each appears the first time its [condition](/docs/reference/conditions) holds at the end of a command. The player's own posts are made by the `feed/post` [effect](/docs/reference/effects). Likes and comments come from the `feed/react` effect, usually returned by one of the [game's own effects](/docs/reference/custom#effects), where the game rolls how a post did.

```ts
import {
  feed, feedsOf, postsOf, postTo, react, seeFeed, hasPosted,
  type FeedDef, type PostDef, type OwnPost, type Comment, type FeedState,
  type FeedsView, type FeedView, type PostView,
} from '@ifloom/plugin-feed'
```

The plugin knows nothing about devices. Your game decides where a feed is shown, such as a board on the high street. With the [devices plugin](/docs/plugins/devices) a feed can be an app instead, and the [phone bundle](/docs/plugins/phone) sets that up for you.

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-feed": "^0.0.0"
  }
}
```

Then add `feed(...)` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details.

## feed

```ts
function feed(): DefinedPlugin<FeedState, FeedsView>
```

Builds the plugin, with the id `feed`. Call it once, when you build the game. It takes no options: the feeds and the posts are content, in your content's `data.feed`, so a mod can add either.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { feed } from '@ifloom/plugin-feed'

declare const town: Content // your content

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [
    calendar(),
    places({ start: 'flat' }),
    cast(),
    feed(),
  ],
})
```

The feeds go in the content beside the posts:

```ts
data: {
  feed: {
    feeds: [
      { id: 'social', name: 'Social' },
      { id: 'board', name: 'Notice board' },
    ],
    posts: [/* … */],
  },
}
```

The plugin lists `cooperates: ['cast']` (see [`cooperates`](/docs/reference/plugins#cooperates)). A poster or commenter who is an [entity](/docs/reference/entities), such as one of the [cast](/docs/plugins/cast)'s characters, is shown with their name, and a poster with their picture too. The plugin reads these with [`speakerOf`](/docs/reference/plugins#speakerof). Anyone else is shown as written, with no portrait.

### FeedDef

```ts
type FeedDef = { id: string; name: string }
```

| Field | What it is |
|---|---|
| `id` | What posts name the feed by. It's also what the [value](#values) `feed/unread` takes as `feed`. |
| `name` | What the player reads. |

Feeds are content. List them in your content's `data.feed.feeds`, in the order the view lists them. They're merged by id, so a mod can add a feed or rename one.

### feedsOf

```ts
function feedsOf(game: Game): FeedDef[]
```

The game's feeds, merged from its content and packs, in order.

## Writing posts

Other people's posts are content. List them in your content's [`data`](/docs/reference/loader#content) under `feed.posts`. They're merged by id as scenes are, so a mod can add a post or rewrite one.

### PostDef

```ts
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

| Field | What it is |
|---|---|
| `id` | Unique among posts, and among the player's own posts too, because `feed/react` and `feed/likes` find a post by id. |
| `feed` | The [feed](#feeddef) it appears in. |
| `from` | Who posted it. Either a [cast](/docs/plugins/cast) character's id, or any name as it should be shown (`'Town council'`). |
| `when` | It appears the first time this holds at the end of a command. |
| `body` | Its words, as [prose blocks](/docs/reference/scenes#block). |
| `image` | An image path, passed through to the view. |
| `video` | A video path, such as `'art/clips/fete.mp4'`, passed through to the view. A UI plays it like a GIF: by itself, looping and muted. |
| `likes` | How many likes it has when it appears. `0` if you leave it out. |

These are the showcase's two posts. Ava's appears on the second day and Sam's on the third:

```ts
import { day } from '@ifloom/plugin-calendar'
import { type PostDef } from '@ifloom/plugin-feed'

const posts: PostDef[] = [
  { id: 'ava.cake', feed: 'social', from: 'ava', when: day({ gte: 1 }), body: [{ prose: 'feed.ava-cake' }], likes: 14 },
  { id: 'sam.river', feed: 'social', from: 'sam', when: day({ gte: 2 }), body: [{ prose: 'feed.sam-river' }], likes: 3 },
]
```

### The player's own posts

The player posts with the `feed/post` effect. It names the feed and gives the post an id. It can also carry the post's words, an image, a video and a starting number of likes:

```ts
import { postTo } from '@ifloom/plugin-feed'

const written = { 'feed/post': { feed: 'social', post: 'river', text: 'own.river', image: 'art/photo/river.svg' } }
const helped = postTo('social', 'river', { text: 'own.river', image: 'art/photo/river.svg' })   // the same
const clip = postTo('social', 'ducks', { text: 'own.ducks', video: 'art/clips/ducks.mp4' })
```

The post is stamped with the current [turn](/docs/reference/state). If the player has already posted that id, nothing happens, so an action that posts the same id twice makes one post. A `feed` the plugin wasn't given does nothing either. The player's own posts never count as [unread](#values).

### Reactions

The `feed/react` effect adds likes, a comment, or both, to a post. That can be the player's own post or someone else's that has appeared.

```ts
import { react } from '@ifloom/plugin-feed'

react('river', { likes: 12 })
react('river', { from: 'ava', text: 'Lovely!' })   // a comment, in its words
react('ava.cake', { likes: 1 })                        // the player likes Ava's post
```

How a post does is usually rolled. Put the roll in one of the [game's own effects](/docs/reference/custom#effects), in its `rules`, that returns `react(...)`. It runs in its turn, after the `feed/post` before it, and the plugin effects it returns run there and then. See [Effects run in order](/docs/reference/plugins#effects-run-in-order). The showcase's `postLatest` effect, in `examples/showcase/src/rules.ts`, does this.

## A worked example

A cut-down Small Town with a social feed and a notice board on the high street. Ava posts on the second day, and the town council pins up a notice the same day. The player can photograph the river from the park and post it. That takes a period of the day, and the game rolls the likes. The notice board needs no phone, because the high street has a button to read it.

The time of day comes from the [calendar](/docs/plugins/calendar), the map from [places](/docs/plugins/places) and Ava and Sam from the [cast](/docs/plugins/cast). The calendar goes first in `plugins`, so the feed sees the new day when one begins.

```ts
import { loadGame, type Content, type GameRules } from '@ifloom/engine'
import { calendar, day, pass, sleep } from '@ifloom/plugin-calendar'
import { places, location, type PlaceDef } from '@ifloom/plugin-places'
import { cast, person } from '@ifloom/plugin-cast'
import { feed, postTo, react, seeFeed } from '@ifloom/plugin-feed'

const place = (id: string, name: string, exits: string[]): PlaceDef =>
  ({ id, name, desc: 'Small Town', exits, body: [{ prose: `place.${id}` }] })

const map = [
  { ...place('flat', 'Your flat', ['high-street']), actions: [{ id: 'bed', label: 'Go to bed', command: sleep() }] },
  {
    ...place('high-street', 'High Street', ['flat', 'park']),
    actions: [{ id: 'board', label: 'Read the notice board', command: seeFeed('board') }],
  },
  {
    ...place('park', 'Riverside Park', ['high-street']),
    actions: [
      {
        id: 'photoRiver',
        label: 'Photograph the river',
        effects: [pass(1), postTo('social', 'river', { text: 'own.river', image: 'art/photo/river.svg' }), { 'game/howItDid': true }],
      },
    ],
  },
].map(location)

const town: Content = {
  // A label-less action is no button of its own: a test or a choice sends it.
  actions: [{ id: 'wait', effects: [pass(1)] }],
  prose: {
    'place.flat': 'Boxes, mostly.',
    'place.high-street': 'A bakery, a launderette, a bus stop.',
    'place.park': 'The river is slow and brown.',
    'feed.ava-cake': 'Lemon drizzle today. It will not last until noon.',
    'feed.sam-river': 'The ducks have unionised.',
    'board.bins': 'Bins go out on Thursdays from now on.',
    'own.river': 'The river at dusk.',
    'comment.nice': 'Lovely!',
  },
  entities: [
    person({ id: 'ava', name: 'Ava', desc: 'Runs the café', image: 'art/character/ava.svg', home: 'park' }),
    person({ id: 'sam', name: 'Sam', desc: 'Neighbour', image: 'art/character/sam.svg', home: 'park' }),
    ...map,
  ],
  data: {
    feed: {
      feeds: [{ id: 'social', name: 'Social' }, { id: 'board', name: 'Notice board' }],
      posts: [
        { id: 'ava.cake', feed: 'social', from: 'ava', when: day({ gte: 1 }), body: [{ prose: 'feed.ava-cake' }], likes: 14 },
        { id: 'sam.river', feed: 'social', from: 'sam', when: day({ gte: 2 }), body: [{ prose: 'feed.sam-river' }], likes: 3 },
        { id: 'bins', feed: 'board', from: 'Town council', when: day({ gte: 1 }), body: [{ prose: 'board.bins' }] },
      ],
    },
  },
}

// The game's own code: how the photo did, 3 to 12 likes, and Ava always says something.
const rules: GameRules = {
  effects: {
    howItDid: (_state, _args, { roll }) => [
      react('river', { likes: 3 + roll(10, 'river.likes') }),
      react('river', { from: 'ava', text: 'comment.nice' }),
    ],
  },
}

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [
    calendar(),
    places({ start: 'flat' }),
    cast(),
    feed(),
  ],
  rules,
})
```

A new game starts in the flat on Monday morning, turn 0. Played through:

```ts
import { apply, holds, startingState, view, type GameState } from '@ifloom/engine'
import { sleep } from '@ifloom/plugin-calendar'
import { go } from '@ifloom/plugin-places'
import { hasPosted, seeFeed, type FeedsView } from '@ifloom/plugin-feed'

const feeds = (state: GameState) => view(state, game).plugins.feed as FeedsView
let state = startingState(game)

// To the park, and post a photo of the river
state = apply(state, game, go('high-street')).state
state = apply(state, game, go('park')).state
state = apply(state, game, { type: 'action', id: 'places/photoRiver' }).state   // afternoon
feeds(state).feeds[0].posts
// [{ id: 'river', mine: true, from: '', name: 'You', portrait: null, text: 'The river at dusk.',
//    image: 'art/photo/river.svg', turn: 0, likes: 3 to 12, comments: [{ from: 'ava', name: 'Ava', text: 'Lovely!' }] }]
feeds(state).unread                                                          // 0: your own posts aren't news
holds(state, game, hasPosted())                                              // true
holds(state, game, { 'feed/likes': { post: 'river', gte: 3 } })   // true

// Home, and to bed in the evening
state = apply(state, game, go('high-street')).state
state = apply(state, game, go('flat')).state
state = apply(state, game, { type: 'action', id: 'wait' }).state
state = apply(state, game, sleep()).state    // Day 2 · Tuesday morning, turn 1
feeds(state).feeds[0].posts
// [{ id: 'ava.cake', mine: false, name: 'Ava', portrait: 'art/character/ava.svg', turn: 1, likes: 14, ... },
//  { id: 'river', mine: true, turn: 0, ... }]
feeds(state).unread     // 2: Ava's post and the council's notice

state = apply(state, game, seeFeed('social')).state    // the player looked at the feed
feeds(state).unread     // 1: the notice board

// The high street's button reads the board
state = apply(state, game, go('high-street')).state
state = apply(state, game, { type: 'custom', name: 'feed/seen', with: { id: 'board' } }).state
feeds(state).unread     // 0
```

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'feed/appeared': { post } }` | | Someone else's post has appeared. |
| `{ 'feed/posted': { feed?, gte? } }` | `hasPosted(gte?, feed?)` | The player has made at least `gte` posts (1 if left out), to that feed or to any. |
| `{ 'feed/likes': { post, gte } }` | | A post, the player's own or someone else's, has at least `gte` likes (1 if left out). |

Each is a call with the full name as the only key (see [plugin calls](/docs/reference/custom#plugincall)):

```ts
const block = { prose: 'place.cafe.ava-saw-it', when: { 'feed/likes': { post: 'river', gte: 10 } } }
```

An unknown post is false for `feed/appeared`, and has 0 likes for `feed/likes`.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ 'feed/post': { feed, post, text?, image?, video?, likes? } }` | `postTo(feed, id, { text?, image?, video?, likes? })` | The player posts to `feed`, as the post `post`, stamped with this turn. `text` is its words, as written. An id already posted, or a feed the plugin wasn't given, does nothing. |
| `{ 'feed/react': { post, likes?, from?, text? } }` | `react(post, { likes?, from?, text? })` | Adds `likes` to a post, and a comment if `text` is given. `text` is the comment's words and `from` is a character id or a name. A post that hasn't appeared does nothing. |

They work in any effect list: a data scene choice's, an action's, a thing's use in the [inventory](/docs/plugins/inventory), a message reply's, a plugin's [`effectsOf`](/docs/reference/plugins#saying-what-a-command-does), and what one of the game's own effects returns. Written out, a post is `{ 'feed/post': { feed: 'social', post: 'river' } }` (see [plugin calls](/docs/reference/custom#plugincall)).

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ 'feed/seen': { id? } }` | `seeFeed(feed?)` | Marks the feed `id` as looked at, which clears its `unread` count. `seeFeed()`, with no feed, marks them all. |

Only a [lock](/docs/reference/locks) can refuse `feed/seen`. A UI usually sends it when the player opens a feed.

## Values

| Prose writes | Prints |
|---|---|
| `{{v:feed/unread}}` | Other people's posts the player hasn't looked at, in every feed. |
| `{{v:feed/unread feed=social}}` | Other people's posts the player hasn't looked at in that feed. |

The player's own posts are never counted, since they aren't news to the player. The value works as a badge too, with the feed as its argument: a devices app's `badge: { value: 'feed/unread', with: { feed: 'social' } }`. Code can read it with [`amountOf`](/docs/reference/amounts#amountof)`(state, game, { value: 'feed/unread', with: { feed: 'social' } })`.

## Strings

The feed never refuses anything, and has one line of its own in the [strings table](/docs/reference/strings#plugins-strings). A game, a pack or a translation rewords it by its full key. Every other word it shows is the game's, such as feed names, post bodies and comments.

| Key | English |
|---|---|
| `feed/you` | `You`. The name on the player's own posts when the game has no `playerName` key in its kv store. |

To reword it in your game, put it in your content's `strings`:

```ts
import type { Content } from '@ifloom/engine'

export const words: Content = {
  strings: { 'feed/you': 'Me' },
}
```

## The view

`view(state, game).plugins.feed` is a `FeedsView`.

Its [React UI](#the-react-ui) draws a feed with [`FeedSection`](#feedsection) in an app, and [`useFeed`](#usefeed) gives this view and the seen command with no markup.

### FeedsView

```ts
type FeedsView = { feeds: FeedView[]; unread: number }
```

| Field | What it is |
|---|---|
| `feeds` | Every feed, in the order `data.feed.feeds` lists them, including empty ones. |
| `unread` | Other people's posts not looked at, in every feed. Messages count theirs under the same name. |

### FeedView

```ts
type FeedView = { id: string; name: string; posts: PostView[]; unread: number }
```

| Field | What it is |
|---|---|
| `posts` | Newest turn first. Within a turn, the player's own come first, latest first, then other people's, in reverse of the order the content lists them. |
| `unread` | Other people's posts that have appeared in this feed since the player last sent `feed/seen` for it. The player's own aren't counted. |

### PostView

```ts
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

| Field | What it is |
|---|---|
| `from` | The poster, as written. `''` for the player's own. |
| `name` | The poster's name if they're a [cast](/docs/plugins/cast) character, or `from` as written. On the player's own posts it's the `playerName` key in the game's [kv store](/docs/reference/state#kv) when that's a string, and otherwise the [`feed/you`](#strings) string, `You`. |
| `portrait` | The poster's entity's `image`, through `artSrc`, or `null`. Always `null` for the player's own. |
| `text` | The words of its beats, joined, for a UI that draws no beats. |
| `beats` | The words as [beats](/docs/reference/prose#scenebeat), as a scene's body is drawn: someone else's post's body drawn for the current state with [`context.beats`](/docs/reference/plugins#beats), and the player's own post's prose line, so a picture or video written into a post's words with [markup](/docs/reference/prose#videos) sits in order with them. [Bold and italics](/docs/reference/prose#bold-and-italics) come as spans. |
| `image` | The image path, or `null`. |
| `video` | The video path, or `null`. The React UI's [`FeedSection`](#feedsection) draws it under the image with [`Video`](/docs/react/components#video). |
| `turn` | The [turn](/docs/reference/state#turn) it appeared or was posted on. With the [calendar](/docs/plugins/calendar#what-a-turn-is)'s default, a turn is a day. |
| `likes` | The likes it started with, plus every `feed/react` since. |
| `comments` | Oldest first, each with the commenter's name and the comment's words filled in. |
| `mine` | The player's own. |

## The React UI

`@ifloom/plugin-feed/react` draws a feed inside an app, for a game drawn with [`@ifloom/react`](/docs/react). List `feedUi` in the game's [`plugins`](/docs/react/kit#the-plugins-option) and a [`FeedSection`](#feedsection) is drawn wherever a [device](/docs/plugins/devices)'s app shows a feed.

It's yours to leave out. Draw the plugin yourself from `view.plugins.feed`, or from [`useFeed`](#usefeed) with your own markup, and nothing of ours is drawn: that's as much a way to use the plugin as ours. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads this subpath.

```tsx
import { mountGame } from '@ifloom/react'
import { feedUi } from '@ifloom/plugin-feed/react'

mountGame(game, { plugins: [feedUi] })
```

### feedUi

```ts
const feedUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): a [`FeedSection`](#feedsection) is drawn wherever a [device](/docs/plugins/devices)'s app shows a feed.

Its words are in `FEED_WORDS`. A game rewords any of them with `ui.<key>` in its strings, as it does the React UI's own: `{ 'ui.likes': '…' }`.

| Key | English |
|---|---|
| `ui.likes` | `♥ {n}` |

### FeedSection

```tsx
const FeedSection: PluginSectionComponent
```

A [feed](/docs/plugins/feed), the one named by `with.feed` (`data-feed`). Each post (`data-post`) shows the poster's name and portrait, its picture, its `video` (a [`Video`](/docs/react/components#video), playing like a GIF), its words, its likes (`ui.likes`) and its comments. The words are the post's [`beats`](/docs/plugins/feed#postview), drawn with [`Beat`](/docs/react/components#beat), so pictures and clips in them show in order.

Opening the feed marks nothing seen. While it has unseen posts, a **Mark all seen** button (`ui.allSeen`) sends `feed/seen` for the feed. It draws nothing if the feed isn't in the view.

Replaceable as `FeedSection` in [`components`](/docs/react/components#components). Parts: `feed`, `post`, `post-author`, `post-portrait`, `post-image`, `post-text`, `post-meta`, `post-comment`, `post-comment-name` and `button`.

### useFeed

```ts
function useFeed(): FeedControls | null

type FeedControls = FeedsView & { seen: (feed: string) => Result<GameState> }
```

The [feed](/docs/plugins/feed) plugin's view (its feeds, each with posts and an unread count) with its command, or `null` in a game without the plugin. `seen(feed)` sends `feed/seen`. [`FeedSection`](#feedsection) is drawn from it.

## The state

### FeedState

```ts
type FeedState = {
  appeared: Record<string, number>
  own: OwnPost[]
  reactions: Record<string, { likes: number; comments: Comment[] }>
  seen: Record<string, number>
}
```

What the plugin keeps in a save, at `state.plugins.feed`. It holds:

- the turn each post appeared on
- the player's own posts, oldest first
- the likes and comments added to other people's posts
- how many of other people's posts each feed had when the player last looked

A UI reads the view, not this.

### OwnPost

```ts
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

A post the player made, as the state keeps it, with the turn it was posted. `text` is its words, as written, and tokens in it are filled as it's shown.

The plugin's state is at version 2. A save made at version 1 kept a `day` on each of the player's posts. When you load it, the plugin's [migration](/docs/reference/plugins) moves that number to `turn` unchanged. Nothing else changed.

### Comment

```ts
type Comment = { from: string; text: string }
```

A comment as the state keeps it. `from` is who wrote it, as written, and `text` its words.

## For code

The helpers write the content objects for you, typed. `postTo` and `react` return an `Effect`, `hasPosted` returns a `Condition`, and `seeFeed` returns a [`CommandRef`](/docs/reference/custom#commandref).

### Helpers

```ts
const postTo: (feedId: string, id: string, post?: { text?: string; image?: string; video?: string; likes?: number }) => EffectRef
const react: (post: string, reaction: { likes?: number; from?: string; text?: string }) => EffectRef
const seeFeed: (feedId?: string) => CommandRef
const hasPosted: (gte?: number, feedId?: string) => Condition
```

### postsOf

```ts
function postsOf(game: Game): PostDef[]
```

The game's posts, merged from its content and packs: `game.data.feed.posts`.

## Checks

When the game loads, the plugin reports these problems against the content or pack each post came from, with `where` as `posts <id>`:

- A feed the game doesn't have (`unknown feed "…"`).
- Anything `when` names that the game doesn't have, such as `unknown storyline "…"`.
- A body block with no prose (`no prose for "…"`), a `variants` block with no lines, a `{ media }` block's pool or flags, and anything the block's `when` names.

```text
mod:summer-fete · posts fete.stalls · unknown feed "newsletter"
```

A post's `image` and `video` are listed in the checker's [`files`](/docs/reference/checks#fileref), as paths from the page.

The player's own posts and reactions are made by effects, and those are checked wherever the effect is. A `feed/post` or `feed/react` whose `text` has no prose gives `no prose for "…"`, and a `feed/post`'s `image` and `video` are listed in `files`. A `feed/appeared` condition naming a post the game doesn't have gives `unknown post "…"`. A `feed/post` to a feed the game wasn't given isn't reported, and does nothing when it runs.

## Gotchas

- **Posts appear only after a command.** The plugin looks for new posts in its `onCommand` [hook](/docs/reference/plugins#hooks-and-providers), which runs after every command that went through, never on `start`. A post whose `when` holds when the game starts appears after the player's first command.
- **`when` is tested at the end of each command.** A post whose `when` held only partway through a command waits for a later command that ends while it holds. A post with the calendar's `period('morning')` as its `when` doesn't appear if the player's first command of the day ends in the afternoon. It appears at the end of the next command that ends in a morning, which may be days later. If it matters when a post comes, write `when` for something that stays true, such as a kv key, a day (the calendar's `day({ gte: 2 })`) or a scene seen.
- **A post appears once.** After that it stays, whatever `when` does.
- **No notice.** Unlike a [message](/docs/plugins/messages), a post raises no [notice](/docs/reference/notices) when it appears. Badge a feed from `feed/unread` with `{ feed }`, or add a [trigger](/docs/reference/triggers) with a `notify` effect for a post that should pop up.
- **A feed the game doesn't have counts nothing.** `feed/unread` with `{ feed: 'board' }` is 0 when there's no `board` feed, so a badge that names a renamed feed stops counting.
- **A post's words are kept in the save.** A post the player made, and a comment, keep the words they were made with, so a translation loaded later doesn't change them. A save from version 2 of the feed, which kept a prose key, gets that key's words when it loads. A `text` that is a prose key the game has is reported where content writes it.
- **Ids are shared.** `feed/react` and `feed/likes` look for the player's own post with that id first, then someone else's. Give the player's posts ids that no `PostDef` uses.
- **Posting twice still reacts twice.** A second `feed/post` with an id the player has used makes no new post, but any `feed/react` after it in the same list still lands on the old post. If an action can run more than once, guard it with a `blocked` entry, as the showcase does with its `postedToday` kv key.
- **React after posting.** `feed/react` on a post that isn't there yet does nothing. Put the reaction after the `feed/post` in the list, or in a later command.
- **A feed doesn't need a device.** You can show `view.plugins.feed` anywhere, such as the notice board in the example. The [devices](/docs/plugins/devices) plugin is one way to show a feed, not a requirement.

## See it in an example

Small Town: Ava's post is in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts) and Sam's in [`examples/showcase/src/story/sam.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/sam.ts). [`examples/showcase/src/rules.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/rules.ts) posts the player's photo with `postTo` and adds likes and a comment with `react`, and the `settle` quest waits on `feed/posted`.
