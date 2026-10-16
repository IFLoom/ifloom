---
title: "Feed"
---
`@ifloom/plugin-feed` keeps timelines of posts, like a social app or a notice board. Other people's posts appear when the story allows. The player's own go up through an effect, usually on an action with a cost, and collect likes and comments.

You'd want it when the town keeps talking while the player isn't there: a friend's photo the morning after, a notice about the fête, the player's own post that does well or doesn't. In the showcase, Ava and Sam post to a social feed and the player posts the photos they take.

Other people's posts are content, and each appears the first time its [condition](/docs/reference/conditions) holds at the end of a command. The player's own posts are made by the `feed/post` [effect](/docs/reference/effects). Likes and comments come from the `feed/react` effect, usually returned by a [custom effect](/docs/reference/custom) where the game rolls how a post did.

```ts
import {
  feed, postDefs, postTo, react, seeFeed, hasPosted,
  type FeedDef, type FeedOptions, type PostDef, type OwnPost, type Comment, type FeedState,
  type FeedsView, type FeedView, type PostView,
} from '@ifloom/plugin-feed'
```

The plugin knows nothing about devices. Your game decides where a feed is shown, such as a board on the high street. With the [devices plugin](/docs/plugins/devices) a feed can be an app instead, and the [phone bundle](/docs/plugins/phone) sets that up for you.

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "0.0.0",
    "@ifloom/plugin-feed": "0.0.0"
  }
}
```

Then add `feed(...)` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details.

## feed

```ts
function feed(options: FeedOptions): DefinedPlugin<FeedState>
```

Builds the plugin, with the id `feed`. Call it once, when you build the game, with the feeds the game has.

```ts
import { loadGame, type Pack } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { feed } from '@ifloom/plugin-feed'

declare const town: Pack // your content

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro',
  plugins: [
    calendar(),
    places({ start: 'flat' }),
    cast(),
    feed({
      feeds: [
        { id: 'social', name: 'Social' },
        { id: 'board', name: 'Notice board' },
      ],
    }),
  ],
})
```

The plugin lists `cooperates: ['cast']` (see [`cooperates`](/docs/reference/plugins#cooperates)). When the game has the [cast](/docs/plugins/cast), a poster or commenter who is one of its characters is shown with their name, and a poster with their portrait too. The plugin gets these from the cast's [`cast/person`](/docs/plugins/cast#queries) query. Without the cast, every poster is shown as written, with no portrait.

### FeedOptions

```ts
type FeedOptions = { feeds: FeedDef[] }
```

| Field | What it is |
|---|---|
| `feeds` | Every feed, in the order the view lists them. |

### FeedDef

```ts
type FeedDef = { id: string; name: string }
```

| Field | What it is |
|---|---|
| `id` | What posts name the feed by. It also names the feed's [value](#values), `feed/unseen-<id>`. |
| `name` | What the player reads. |

The feeds are code, not content, so a mod can't add one.

## Writing posts

Other people's posts are content. List them in a pack's [`data`](/docs/reference/loader#pack) under `feed.posts`. They're merged by id as scenes are, so a mod can add a post or rewrite one.

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
  { id: 'ava.cake', feed: 'social', from: 'ava', when: day({ gte: 1 }), body: [{ text: 'feed.ava-cake' }], likes: 14 },
  { id: 'sam.river', feed: 'social', from: 'sam', when: day({ gte: 2 }), body: [{ text: 'feed.sam-river' }], likes: 3 },
]
```

### The player's own posts

The player posts with the `feed/post` effect. It names the feed and gives the post an id. It can also carry a prose key for the words, an image, a video and a starting number of likes:

```ts
import { postTo } from '@ifloom/plugin-feed'

const long = { custom: 'feed/post', with: { feed: 'social', id: 'river', text: 'own.river', image: 'art/photo/river.svg' } }
const short = postTo('social', 'river', { text: 'own.river', image: 'art/photo/river.svg' })   // the same
const clip = postTo('social', 'ducks', { text: 'own.ducks', video: 'art/clips/ducks.mp4' })
```

The post is stamped with the current [turn](/docs/reference/state). If the player has already posted that id, nothing happens, so an action that posts the same id twice makes one post. A `feed` the plugin wasn't given does nothing either. The player's own posts never count as [unseen](#values).

### Reactions

The `feed/react` effect adds likes, a comment, or both, to a post. That can be the player's own post or someone else's that has appeared.

```ts
import { react } from '@ifloom/plugin-feed'

react('river', { likes: 12 })
react('river', { from: 'ava', text: 'comment.nice' })   // text is a prose key
react('ava.cake', { likes: 1 })                        // the player likes Ava's post
```

How a post does is usually rolled. Put the roll in a game [custom effect](/docs/reference/custom) that returns `react(...)`. A custom effect is worked out before the list runs, but the plugin effects it returns run in their turn, after the `feed/post` before them. See [Effects run in order](/docs/reference/plugins#effects-run-in-order). The showcase's `postLatest` effect, in `examples/showcase/src/content/custom.ts`, does this.

## A worked example

A cut-down Small Town with a social feed and a notice board on the high street. Ava posts on the second day, and the town council pins up a notice the same day. The player can photograph the river from the park and post it. That takes a period of the day, and the game rolls the likes. The notice board needs no phone, because the high street has a button to read it.

The time of day comes from the [calendar](/docs/plugins/calendar), the map from [places](/docs/plugins/places) and Ava and Sam from the [cast](/docs/plugins/cast). The calendar goes first in `plugins`, so the feed sees the new day when one begins.

```ts
import { SCHEMA, loadGame, roll, type Pack } from '@ifloom/engine'
import { calendar, day, pass, sleep } from '@ifloom/plugin-calendar'
import { onlyAt, places, type LocationDef } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { feed, postTo, react } from '@ifloom/plugin-feed'

const place = (id: string, name: string, exits: string[]): LocationDef =>
  ({ id, name, tag: 'Small Town', kind: 'street', art: '', exits, body: [{ text: `place.${id}` }] })

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  activities: [
    { id: 'wait', effects: [pass(1)] },
    {
      id: 'photoRiver',
      requires: [onlyAt(['park'])],
      effects: [pass(1), postTo('social', 'river', { text: 'own.river', image: 'art/photo/river.svg' }), { custom: 'howItDid' }],
    },
  ],
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
  data: {
    places: {
      locations: [
        { ...place('flat', 'Your flat', ['high-street']), actions: [{ id: 'bed', label: 'Go to bed', command: sleep() }] },
        {
          ...place('high-street', 'High Street', ['flat', 'park']),
          actions: [{ id: 'board', label: 'Read the notice board', command: { type: 'custom', name: 'feed/seen', with: { feed: 'board' } } }],
        },
        place('park', 'Riverside Park', ['high-street']),
      ],
    },
    cast: {
      characters: [
        { id: 'ava', name: 'Ava', role: 'Runs the café', portrait: 'art/character/ava.svg', home: 'park' },
        { id: 'sam', name: 'Sam', role: 'Neighbour', portrait: 'art/character/sam.svg', home: 'park' },
      ],
    },
    feed: {
      posts: [
        { id: 'ava.cake', feed: 'social', from: 'ava', when: day({ gte: 1 }), body: [{ text: 'feed.ava-cake' }], likes: 14 },
        { id: 'sam.river', feed: 'social', from: 'sam', when: day({ gte: 2 }), body: [{ text: 'feed.sam-river' }], likes: 3 },
        { id: 'bins', feed: 'board', from: 'Town council', when: day({ gte: 1 }), body: [{ text: 'board.bins' }] },
      ],
    },
  },
  custom: {
    effects: {
      // How the photo did: 3 to 12 likes, and Ava always says something.
      howItDid: (state) => [
        react('river', { likes: 3 + roll(10, state.seed, state.turn, 'river.likes') }),
        react('river', { from: 'ava', text: 'comment.nice' }),
      ],
    },
  },
}

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [
    calendar(),
    places({ start: 'flat' }),
    cast(),
    feed({ feeds: [{ id: 'social', name: 'Social' }, { id: 'board', name: 'Notice board' }] }),
  ],
})
```

Here's how it plays. A new game starts in the flat on Monday morning, turn 0:

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
state = apply(state, game, { type: 'activity', id: 'photoRiver' }).state   // afternoon
feeds(state).feeds[0].posts
// [{ id: 'river', mine: true, from: '', name: 'You', portrait: null, text: 'The river at dusk.',
//    image: 'art/photo/river.svg', turn: 0, likes: 3 to 12, comments: [{ from: 'ava', name: 'Ava', text: 'Lovely!' }] }]
feeds(state).unseen                                                          // 0: your own posts aren't news
holds(state, hasPosted(), game)                                              // true
holds(state, { custom: 'feed/likes', with: { post: 'river', gte: 3 } }, game)   // true

// Home, and to bed in the evening
state = apply(state, game, go('high-street')).state
state = apply(state, game, go('flat')).state
state = apply(state, game, { type: 'activity', id: 'wait' }).state
state = apply(state, game, sleep()).state    // Day 2 · Tuesday morning, turn 1
feeds(state).feeds[0].posts
// [{ id: 'ava.cake', mine: false, name: 'Ava', portrait: 'art/character/ava.svg', turn: 1, likes: 14, ... },
//  { id: 'river', mine: true, turn: 0, ... }]
feeds(state).unseen     // 2: Ava's post and the council's notice

state = apply(state, game, seeFeed('social')).state    // the player looked at the feed
feeds(state).unseen     // 1: the notice board

// The high street's button reads the board
state = apply(state, game, go('high-street')).state
state = apply(state, game, { type: 'custom', name: 'feed/seen', with: { feed: 'board' } }).state
feeds(state).unseen     // 0
```

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ custom: 'feed/appeared', with: { post } }` | | Someone else's post has appeared. |
| `{ custom: 'feed/posted', with: { feed?, gte? } }` | `hasPosted(gte?, feed?)` | The player has made at least `gte` posts (1 if left out), to that feed or to any. |
| `{ custom: 'feed/likes', with: { post, gte } }` | | A post, the player's own or someone else's, has at least `gte` likes (1 if left out). |

Each can also be written short, with the full name as the only key (see [plugin calls](/docs/reference/custom#plugincall)):

```ts
const long = { text: 'place.cafe/ava-saw-it', when: { custom: 'feed/likes', with: { post: 'river', gte: 10 } } }
const short = { text: 'place.cafe/ava-saw-it', when: { 'feed/likes': { post: 'river', gte: 10 } } }   // the same
```

An unknown post is false for `feed/appeared`, and has 0 likes for `feed/likes`.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ custom: 'feed/post', with: { feed, id, text?, image?, video?, likes? } }` | `postTo(feed, id, { text?, image?, video?, likes? })` | The player posts, stamped with this turn. `text` is a prose key. An id already posted, or a feed the plugin wasn't given, does nothing. |
| `{ custom: 'feed/react', with: { post, likes?, from?, text? } }` | `react(post, { likes?, from?, text? })` | Adds `likes` to a post, and a comment if `text` is given. `text` is a prose key and `from` is a character id or a name. A post that hasn't appeared does nothing. |

They work in a data scene choice's effects, an activity's `effects`, a message reply's effects, and in what a game's custom effect returns. You can write the long form or the short one, `{ 'feed/post': { feed: 'social', id: 'river' } }` (see [plugin calls](/docs/reference/custom#plugincall)). Where only plain effects go, such as an item's `use` or what `rules.turn` returns, write `{ kind: 'custom', name: 'feed/post', with: {...} }` instead.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'feed/seen', with: { feed? } }` | `seeFeed(feed?)` | Marks the feed as looked at, which clears its `unseen`. `seeFeed()`, with no feed, marks them all. |

Only a [lock](/docs/reference/locks) can refuse `feed/seen`. A UI usually sends it when the player opens a feed.

## Values

| Prose writes | Prints |
|---|---|
| `{{v:feed/unseen}}` | Other people's posts the player hasn't looked at, in every feed. |
| `{{v:feed/unseen-<feed>}}` | Other people's posts the player hasn't looked at in that feed. There's one for each feed you configure, such as `{{v:feed/unseen-social}}` and `{{v:feed/unseen-board}}`. |

The player's own posts are never counted, since they aren't news to the player. The per-feed values also work as badges, such as a devices app's `badge: { count: 'feed/unseen-social' }`, and code can read them with [`customValue`](/docs/reference/custom). A value name may contain `-`, so they print in prose like any other.

## Strings

The feed never refuses anything, and has one line of its own in the [strings table](/docs/reference/strings#plugins-strings). A game, a pack or a translation rewords it by its full key. Every other word it shows is the game's, such as feed names, post bodies and comments.

| Key | English |
|---|---|
| `feed/you` | `You`. The name on the player's own posts when the game has no `playerName` variable. |

To reword it in your game, put it in the base's `strings`:

```ts
import { loadGame } from '@ifloom/engine'
import { feed } from '@ifloom/plugin-feed'
import { town } from './town.ts'

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [feed({ feeds: [{ id: 'social', name: 'Social' }] })],
  strings: { 'feed/you': 'Me' },
})
```

## The view

`view(state, game).plugins.feed` is a `FeedsView`.

### FeedsView

```ts
type FeedsView = { feeds: FeedView[]; unseen: number }
```

| Field | What it is |
|---|---|
| `feeds` | Every feed, in the order you gave them to `feed(...)`, including empty ones. |
| `unseen` | Other people's posts not looked at, in every feed. |

### FeedView

```ts
type FeedView = { id: string; name: string; posts: PostView[]; unseen: number }
```

| Field | What it is |
|---|---|
| `posts` | Newest turn first. Within a turn, the player's own come first, latest first, then other people's, in reverse of the order the content lists them. |
| `unseen` | Other people's posts that have appeared in this feed since the player last sent `feed/seen` for it. The player's own aren't counted. |

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
| `name` | The poster's name if they're a [cast](/docs/plugins/cast) character, or `from` as written. On the player's own posts it's the game's `playerName` [variable](/docs/reference/state#flags) when that's a string, and otherwise the [`feed/you`](#strings) string, `You`. |
| `portrait` | A cast character's portrait (their `portrait`, or `art/character/<id>.jpg`), or `null`. Always `null` for the player's own. |
| `text` | The words, filled in. For someone else's post it's the body rendered for the current state, and for the player's own it's the prose line. |
| `beats` | `text` parsed into [beats](/docs/reference/prose#scenebeat), as a scene's body is, so a picture or video written into a post's words with [markup](/docs/reference/prose#videos) sits in order with them. |
| `image` | The image path, or `null`. |
| `video` | The video path, or `null`. The React UI's [`FeedSection`](/docs/react/components#feedsection) draws it under the image with [`Video`](/docs/react/components#video). |
| `turn` | The [turn](/docs/reference/state#turn) it appeared or was posted on. With the [calendar](/docs/plugins/calendar#what-a-turn-is)'s default, a turn is a day. |
| `likes` | The likes it started with, plus every `feed/react` since. |
| `comments` | Oldest first, each with the commenter's name and the comment's words filled in. |
| `mine` | The player's own. |

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

A post the player made, as the state keeps it, with the turn it was posted. `text` is a prose key.

The plugin's state is at version 2. A save made at version 1 kept a `day` on each of the player's posts. When you load it, the plugin's [migration](/docs/reference/plugins) moves that number to `turn` unchanged. Nothing else changed.

### Comment

```ts
type Comment = { from: string; text: string }
```

A comment as the state keeps it. `from` is who wrote it, as written, and `text` is a prose key.

## For code

The helpers write the content objects for you, typed. `postTo` and `react` return an `EffectRef`, `hasPosted` returns a `Condition`, and `seeFeed` returns a `Command`.

### Helpers

```ts
const postTo: (feedId: string, id: string, post?: { text?: string; image?: string; video?: string; likes?: number }) => EffectRef
const react: (post: string, reaction: { likes?: number; from?: string; text?: string }) => EffectRef
const seeFeed: (feedId?: string) => Command
const hasPosted: (gte?: number, feedId?: string) => Condition
```

### postDefs

```ts
function postDefs(game: Game): PostDef[]
```

The game's posts, merged from its packs: `game.data.feed.posts`.

## Checks

When the game loads, the plugin reports these problems against the pack each post came from, with `where` as `posts <id>`:

- A feed the game wasn't given (`no feed called "…"`).
- Anything `when` names that the game doesn't have, such as `unknown storyline "…"`.
- A body block with no prose (`no prose for "…"`), a `variants` block with no lines, a `{ media }` block's pool or flags, and anything the block's `when` names.

```text
mod:summer-fete · posts fete.stalls · no feed called "newsletter"
```

A post's `image` and `video` are listed in the checker's [`files`](/docs/reference/checks#fileref), as paths from the page.

The player's own posts and reactions are made by effects, and those are checked wherever the effect is. A `feed/post` or `feed/react` whose `text` has no prose gives `no prose for "…"`, and a `feed/post`'s `image` and `video` are listed in `files`. A `feed/appeared` condition naming a post the game doesn't have gives `unknown post "…"`. A `feed/post` to a feed the game wasn't given isn't reported, and does nothing when it runs.

## Gotchas

- **Posts appear only after a command.** The plugin looks for new posts in its `after` [hook](/docs/reference/plugins#hooks), which runs after every command that went through, never on `start`. A post whose `when` holds when the game starts appears after the player's first command.
- **`when` is tested at the end of each command.** A post whose `when` held only partway through a command waits for a later command that ends while it holds. A post with the calendar's `period('morning')` as its `when` doesn't appear if the player's first command of the day ends in the afternoon. It appears at the end of the next command that ends in a morning, which may be days later. If it matters when a post comes, write `when` for something that stays true, such as a flag, a day (the calendar's `day({ gte: 2 })`) or a scene seen.
- **A post appears once.** After that it stays, whatever `when` does.
- **No notice.** Unlike a [message](/docs/plugins/messages), a post raises no [notice](/docs/reference/notices) when it appears. Badge a feed from `feed/unseen-<feed>`, or add a [trigger](/docs/reference/triggers) with a `notify` effect for a post that should pop up.
- **`feed/unseen-<feed>` names come from your feeds.** A feed called `social` gives `feed/unseen-social`. If you rename the feed, every badge that names the old value stops counting.
- **Own-post and comment prose keys are checked where they're written.** A `text` key that a [custom effect](/docs/reference/custom#effects) works out in play isn't, and a missing one shows as `''`.
- **Ids are shared.** `feed/react` and `feed/likes` look for the player's own post with that id first, then someone else's. Give the player's posts ids that no `PostDef` uses.
- **Posting twice still reacts twice.** A second `feed/post` with an id the player has used makes no new post, but any `feed/react` after it in the same list still lands on the old post. If an action can run more than once, guard it with a requirement, as the showcase does with its `postedToday` variable.
- **React after posting.** `feed/react` on a post that isn't there yet does nothing. Put the reaction after the `feed/post` in the list, or in a later command.
- **A feed doesn't need a device.** You can show `view.plugins.feed` anywhere, such as the notice board in the example. The [devices](/docs/plugins/devices) plugin is one way to show a feed, not a requirement.

## See it in an example

Small Town: `data.feed.posts` in [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts) has a post each from Ava and Sam. [`examples/showcase/src/content/custom.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/custom.ts) posts the player's photo with `postTo` and adds likes and a comment with `react`, and the `settle` quest waits on `feed/posted`.
