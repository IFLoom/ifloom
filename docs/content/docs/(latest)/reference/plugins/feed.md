---
title: "Feed"
description: "Reference for @ifloom/plugin-feed: feeds and other people's posts, the player's own posts, likes and comments, the appeared, posted and likes conditions, the post and react effects, the seen command, the unread value, state, view, React UI, helpers, checks and strings."
---
`@ifloom/plugin-feed` keeps timelines of posts, such as a social app or a notice board. Other people's posts are content that appears the first time a [condition](/docs/reference/conditions) holds at the end of a command. The player's own posts go up through the `feed/post` [effect](/docs/reference/effects), and both collect likes and comments through `feed/react`. The game declares its feeds and posts in `data.feed`, so a mod adds either. The feed needs no other plugin and has no device of its own, and it cooperates with the [cast](/docs/reference/plugins/cast) for posters' names and faces. [Add a plugin](/docs/how-to/add-a-plugin) installs it, and [Build a phone](/docs/how-to/build-a-phone) shows a feed as an app.

In the showcase: `examples/showcase/src/story/ava.ts` and `examples/showcase/src/story/sam.ts`, whose posts appear on the second and third days, and the `postLatest` macro in `examples/showcase/src/rules.ts`, which posts the player's photo and rolls its likes. `examples/showcase/src/world/phone.ts` declares the `social` feed.

```ts
import {
  feed,
  feedsOf,
  postsOf,
  type Comment,
  type FeedDef,
  type FeedState,
  type FeedsView,
  type FeedView,
  type OwnPost,
  type PostDef,
  type PostView,
} from '@ifloom/plugin-feed'
```

## feed

The plugin's factory, which returns the plugin with the id `feed`. It takes no options. Every field of its result is in [`feed`](/docs/api/plugin-feed#feed), and its helpers are listed under [Functions](#functions).

After every command that goes through, the plugin's [`onCommand`](/docs/reference/plugin-api#oncommand) hook makes each post whose `when` now holds appear, stamped with the turn. It never runs on `start`, so a post whose `when` holds in a new game appears after the player's first command.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { cast } from '@ifloom/plugin-cast'
import { feed } from '@ifloom/plugin-feed'

declare const town: Content

export const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [calendar(), cast(), feed()] })
```

## Content

### FeedDef

A feed the game declares in `data.feed.feeds`, such as a social app, a notice board or a paper. Every field is in [`FeedDef`](/docs/api/plugin-feed#feeddef).

The loader merges feeds by id, so a mod adds a feed or renames one, and the view lists them in order. A post names its feed by `id`.

```ts
import type { Content } from '@ifloom/engine'

export const phone: Content = { data: { feed: { feeds: [{ id: 'social', name: 'Social' }, { id: 'board', name: 'Notice board' }] } } }
```

### PostDef

Someone else's post, which the game declares in `data.feed.posts`. Every field is in [`PostDef`](/docs/api/plugin-feed#postdef).

The loader merges posts by id, so a mod adds a post or replaces one whole. A post appears the first time its `when` holds at the end of a command, and stays whatever `when` does after. `from` is the poster, an entity by reference or by a bare id, such as a character's, or a name shown as written, such as `'Town council'`. The `body` renders as a scene's does. `image` and `video` are paths in the game's `art/` folder, or URLs, and a bare video name is an `.mp4`. `likes` is the count it appears with, 0 if left out.

```ts
import { calendar } from '@ifloom/plugin-calendar'
import type { PostDef } from '@ifloom/plugin-feed'

export const cake: PostDef = {
  id: 'ava.cake',
  feed: 'social',
  from: 'ava',
  when: calendar.day({ gte: 1 }),
  body: [{ text: 'Lemon drizzle today. It will not last until noon.' }],
  likes: 14,
}
```

A post's id is unique among posts and among the player's own posts too, because `feed/react` and `feed/likes` look for the player's post with that id first.

## Conditions

Each condition is a [plugin call](/docs/reference/custom#plugincall). It works anywhere a condition goes, such as a block's `when`, a lock or a quest stage.

### feed/appeared

Holds once someone else's post has appeared. A post the game doesn't have is false.

```ts fragment
{ 'feed/appeared': { post: 'ava.cake' } }
```

### feed/posted

Holds once the player has made at least `gte` posts (1 if left out), to the feed `feed` or to any feed.

```ts fragment
{ 'feed/posted': { feed: 'social', gte: 1 } } // feed.posted(1, 'social')
```

### feed/likes

Holds while a post, the player's own or someone else's, has at least `gte` likes (1 if left out). A post the game doesn't have has 0 likes.

```ts fragment
{ 'feed/likes': { post: 'ava.cake', gte: 20 } }
```

## Effects

Both effects work in any effect list, such as a choice's, an action's, a message reply's or what a [macro](/docs/reference/custom#macros) returns. They run in their turn, so a `feed/react` after a `feed/post` in one list finds the new post.

### feed/post

Makes a post of the player's own in the feed `feed`, with the id `post`, stamped with the turn. `text` is its words in place, with tokens filled as it's shown, and `image`, `video` and `likes` are as a [`PostDef`](#postdef)'s. A post id the player has used, or a feed the game doesn't have, does nothing.

```ts fragment
{ 'feed/post': { feed: 'social', post: 'river', text: 'The river at dusk.', image: 'photo/river.svg' } } // feed.post('social', 'river', { text: 'The river at dusk.', image: 'photo/river.svg' })
```

### feed/react

Adds `likes` to a post, and a comment from `from` when `text` is given, on the player's own post or on someone else's that has appeared. `from` is an entity or a name, as a post's is. A post that isn't there yet does nothing, so a reaction goes after the post in its list or in a later command.

```ts fragment
{ 'feed/react': { post: 'river', likes: 3, from: 'ava', text: 'Lovely!' } } // feed.react('river', { likes: 3, from: 'ava', text: 'Lovely!' })
```

A game rolls how a post did in a macro of its own [rules](/docs/reference/custom#macros), which returns the post and the reactions together:

```ts
import type { GameRules } from '@ifloom/engine'
import { feed } from '@ifloom/plugin-feed'

export const rules: GameRules = {
  macros: {
    postRiver: (_state, _args, { roll }) => [
      feed.post('social', 'river', { text: 'The river at dusk.', image: 'photo/river.svg' }),
      feed.react('river', { likes: 3 + roll(10, 'river.likes'), from: 'ava', text: 'Lovely!' }),
    ],
  },
}
```

## Commands

### feed/seen

Marks the feed `id` as looked at, which clears its `unread`, and with no feed marks every feed. The plugin never refuses it, though a [lock](/docs/reference/locks) can. A UI sends it when the player opens a feed, and a feed's `seen` button sends it.

```ts fragment
{ 'feed/seen': { id: 'social' } } // feed.seen('social')
```

## Values

Prose prints this as a token.

| Key | Meaning |
|---|---|
| `{{feed/unread}}` | The number of other people's posts the player hasn't looked at, in every feed. |
| `{{feed/unread feed=social}}` | The same in one feed, and 0 for a feed the game doesn't have. |

The player's own posts never count. The value works as a badge too, with the feed as its argument, as a [devices](/docs/reference/plugins/devices) app's `badge: { value: 'feed/unread', with: { feed: 'social' } }` does. Code reads it with [`amountOf`](/docs/reference/amounts#amountof).

## State

### FeedState

The feeds a save keeps at `state.plugins.feed`: the turn each post appeared on, the player's own posts, the likes and comments added to other people's posts, and how many posts each feed had when the player last looked. Every field is in [`FeedState`](/docs/api/plugin-feed#feedstate).

The save keeps no feed or post of someone else's, which the plugin reads from content. A UI reads [`FeedsView`](#feedsview) instead.

### OwnPost

A post the player made, an entry of `own`, oldest first. Every field is in [`OwnPost`](/docs/api/plugin-feed#ownpost).

The save keeps its `text` as the words it was made with, so a translation loaded later doesn't change it. `turn` is the [turn](/docs/reference/state#turn) it was posted on, and `likes` and `comments` are what reactions added.

### Comment

One comment on a post, as the save keeps it: who wrote it, as written, and its words. Every field is in [`Comment`](/docs/api/plugin-feed#comment). Like a post's text, a comment keeps the words it was made with.

## View

The plugin adds nothing to the room or the screen, and raises no notice when a post appears. A UI badges a feed from `feed/unread`, and a [trigger](/docs/reference/triggers) with a `notify` effect raises a notice for a post that should pop up.

### FeedsView

The feeds as the player sees them, in `view.plugins.feed`. Every field is in [`FeedsView`](/docs/api/plugin-feed#feedsview).

`feeds` lists every feed, in the order the game declares them, empty ones included, and `unread` counts the posts not looked at in every feed.

```ts fragment
{ feeds: [{ id: 'social', name: 'Social', unread: 1, seen: { … }, posts: [ … ] }], unread: 1 }
```

### FeedView

One feed as the player sees it, an entry of `feeds`. Every field is in [`FeedView`](/docs/api/plugin-feed#feedview).

`posts` lists the posts newest turn first. Within one turn the player's own come first, latest first, then other people's, in reverse of the order the game declares them. `unread` counts other people's posts that appeared since the player last sent `feed/seen` for the feed. `seen` is a [`RenderedChoice`](/docs/reference/view#renderedchoice) labelled with the `feed/allSeen` string that marks the feed seen, or `null` while nothing in it is new.

### PostView

One post as the player sees it, an entry of a feed's `posts`. Every field is in [`PostView`](/docs/api/plugin-feed#postview).

The plugin asks the cast's `cast/sender` [query](/docs/reference/plugins/cast#queries) for a poster's `name` and `portrait`, a person's face for an avatar. Without the cast it reads an entity's name and picture with [`speakerOf`](/docs/reference/plugin-views#speakerof), and anything else is shown as written with no portrait. On the player's own post, `from` is `''`, `portrait` is `null`, `mine` is `true`, and `name` is the `playerName` key in the [kv store](/docs/reference/glossary#kv) when it's text, else the `feed/you` string.

`beats` is the post's words rendered as a scene's body is, with [`context.beats`](/docs/reference/plugin-views#beats) for someone else's post, so pictures and videos written into the words sit in order with them. `text` joins the beats' words for a UI that renders no beats. `image` and `video` go through [`artSrc`](/docs/reference/prose#artsrc). `likes` is the count the post started with plus every reaction, and `comments` lists the comments oldest first, each with the commenter's name.

[Render a feed](/docs/how-to/render/phone-plugins#render-a-feed) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-feed/react` subpath renders a feed for a game that uses [`@ifloom/react`](/docs/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) adds it to a game.

### feedUi

The plugin's [`PluginUi`](/docs/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It renders a [`FeedSection`](#feedsection) wherever a [devices](/docs/reference/plugins/devices) app has a `feed` section. Its type is in [`feedUi`](/docs/api/plugin-feed#feedui).

### FEED_WORDS

The words the feed UI uses, by key, which a game rewords as `ui.<key>` in its strings as it does the React UI's own. Its value is in [`FEED_WORDS`](/docs/api/plugin-feed#feed_words). The seen button uses the plugin's own [strings](#strings).

| Key | Meaning |
|---|---|
| `ui.likes` | `♥ {n}`, a post's likes. |

### FeedSection

Renders the feed an app section's `with.feed` names, from `view.plugins.feed`, newest post first. Its props are in [`FeedSection`](/docs/api/plugin-feed#feedsection).

Each post shows the poster's name and portrait, its picture, its video as a [`Video`](/docs/reference/react/components#video) that plays by itself, looping and muted, its words, its likes and its comments. The words are the post's beats, rendered with [`Beat`](/docs/reference/react/components#beat). Opening the feed marks nothing seen, and the feed's **Mark all seen** button from the view does that while it has new posts.

It renders nothing when the feed isn't in the view. A game replaces it as `FeedSection` in [`components`](/docs/reference/react/components#components). Its parts are `feed` (with `data-feed`), `post` (with `data-post`), `post-author`, `post-portrait`, `post-image`, `post-text`, `post-meta`, `post-comment`, `post-comment-name` and `button`.

### useFeed

Returns the feed's view from the running game with a `seen` that marks a feed seen, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`useFeed`](/docs/api/plugin-feed#usefeed).

### FeedControls

The value `useFeed` returns, a [`FeedsView`](#feedsview) with `seen(feed)`, which sends `feed/seen` for the feed and returns the runner's [`Result`](/docs/reference/common#result). Every field is in [`FeedControls`](/docs/api/plugin-feed#feedcontrols).

## Functions

The helpers are properties of `feed` and write its calls, typed:

- **`feed.post(feed, id, { text?, image?, video?, likes? })`** returns the [`feed/post`](#feedpost) effect.
- **`feed.react(post, { likes?, from?, text? })`** returns the [`feed/react`](#feedreact) effect.
- **`feed.seen(feed?)`** returns the [`feed/seen`](#feedseen) command as a [`CommandRef`](/docs/reference/custom#commandref).
- **`feed.posted(gte?, feed?)`** returns the [`feed/posted`](#feedposted) condition.

`feed/appeared` and `feed/likes` have no helper. The showcase's moving-day quest finishes a stage once the player has posted:

```ts
import type { QuestStage } from '@ifloom/plugin-quests'
import { feed } from '@ifloom/plugin-feed'

export const post: QuestStage = { id: 'post', hint: 'Take a photo with someone and post it.', done: feed.posted() }
```

### feedsOf

Returns the game's feeds from `data.feed.feeds`, merged from its content and packs, in order. Its signature is in [`feedsOf`](/docs/api/plugin-feed#feedsof).

### postsOf

Returns the game's posts from `data.feed.posts`, merged from its content and packs, in order. Its signature is in [`postsOf`](/docs/api/plugin-feed#postsof).

```ts given
import { feedsOf, postsOf } from '@ifloom/plugin-feed'

feedsOf(game) // [{ id: 'social', name: 'Social' }]
postsOf(game).map((post) => post.id) // ['ava.cake', 'sam.river']
```

## Checks

When the game loads, the plugin reports problems with each post against the content or pack it came from, with `where` as `posts <id>`:

| Problem | Cause |
|---|---|
| `unknown feed "newsletter"` | `feed` names a feed the game doesn't have. |
| `unknown storyline "ghost"` | `when` names something the game doesn't have. |
| `no prose for "feed.none"` | A body block names something the game doesn't have, or its `when` does. |

A post's `image` and `video` are listed in the checker's [`files`](/docs/reference/checks#fileref). The player's posts and reactions are checked where the effect is written. A `feed/post` lists its `image` and `video` in `files`, and a `feed/post` or `feed/react` whose `text` is a prose key the game has is reported, since `text` is words in place. A `feed/appeared` that names a post the game doesn't have gives `unknown post "…"`, and a `feed/post` or `feed/posted` that names an unknown feed gives `unknown feed "…"`.

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/reference/strings#stringkey-and-strings). The feed refuses nothing, and every other word it shows is the game's.

| Key | Meaning |
|---|---|
| `feed/you` | `You`, the name on the player's own posts when the kv store has no `playerName` text. |
| `feed/allSeen` | `Mark all seen`, the label of a feed's `seen` button. |

## Caveats

- The plugin tests `when` at the end of each command, so a post whose `when` held only partway through a command waits for a later command that ends while it holds.
- A second `feed/post` with a used id makes no new post, but a `feed/react` after it in the same list still lands on the old post. An action that can run more than once guards itself with a `blocked` entry, as the showcase's camera does with its `postedToday` kv key.
