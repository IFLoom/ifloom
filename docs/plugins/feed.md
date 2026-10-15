# Feed

`@ifloom/plugin-feed` keeps timelines of posts. Other people's posts appear when the story allows. The player's own go up through an effect, usually on an action with a cost, and collect likes and comments.

A feed belongs to the game: a social app, the town notice board, the parish newsletter. Other people's posts are content, and each appears the first time its [condition](/reference/conditions) holds after a command. The player's own posts are made by the `feed/post` [effect](/reference/effects). Likes and comments come with the `feed/react` effect, usually from a [custom effect](/reference/custom) where the game rolls how a post did.

```ts
import {
  feed, postDefs, postTo, react, seeFeed, hasPosted,
  type FeedDef, type FeedOptions, type PostDef, type OwnPost, type Comment, type FeedState,
  type FeedsView, type FeedView, type PostView,
} from '@ifloom/plugin-feed'
```

**A feed does not need a phone.** The plugin knows nothing about devices. A game shows `view.plugins.feed` wherever it likes, such as a board on the high street. With the [devices plugin](/plugins/devices) a feed can be an app instead, and the [phone bundle](/plugins/phone) does that for you.

## Install

Add the package beside the engine, and add `feed(...)` to the game's `plugins`. See [Adding one](/plugins/#adding-one).

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/plugin-feed": "file:../ifloom/packages/plugin-feed"
  }
}
```

## feed

```ts
function feed(options: FeedOptions): DefinedPlugin<FeedState>
```

The plugin, with the id `feed`. Call it once, when the game is built, with the feeds the game has.

It lists `cooperates: ['cast']` (see [`cooperates`](/reference/plugins#cooperates)): when the game has the [cast](/plugins/cast), a poster or commenter who is one of its characters is shown with their name, and a poster with their portrait, asked by name through its [`cast/person`](/plugins/cast#queries) query. Without the cast, every poster is shown as written, with no portrait.

```ts
const { game } = loadGame(packs, {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro.wake',
  plugins: [
    calendar(),
    places({ start: 'house' }),
    feed({
      feeds: [
        { id: 'social', name: 'Social' },
        { id: 'board', name: 'Notice board' },
      ],
    }),
  ],
})
```

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

The feeds are code, not content: a mod cannot add one.

## Writing posts

Other people's posts are content. List them in a pack's [`data`](/reference/loader#pack) under `feed.posts`. They are merged by id as scenes are, so a mod can add a post or rewrite one.

### PostDef

```ts
type PostDef = {
  id: string
  feed: string
  from: string
  when: Condition
  body: Block[]
  image?: string
  likes?: number
}
```

| Field | What it is |
|---|---|
| `id` | Unique among posts, and among the player's own posts too: `feed/react` and `feed/likes` find a post by id. |
| `feed` | The [feed](#feeddef) it appears in. |
| `from` | Who posted it: a [cast](/plugins/cast) character's id, or any name as it should be shown (`'Parish council'`). |
| `when` | It appears the first time this holds after a command. |
| `body` | Its words, as [prose blocks](/reference/scenes#block). |
| `image` | An image path, passed through. |
| `likes` | Likes it has when it appears. `0` if left out. |

### The player's own posts

The player posts with the `feed/post` effect. It names the feed, gives the post an id, and can carry a prose key for its words, an image and a starting number of likes:

```ts
{ custom: 'feed/post', with: { feed: 'social', id: 'sunset', text: 'own.sunset', image: 'art/sunset.jpg' } }
// or, with the helper:
postTo('social', 'sunset', { text: 'own.sunset', image: 'art/sunset.jpg' })
```

The post is dated with the current [turn](/reference/state). An id the player has already posted is left as it is, so an action that posts the same id twice makes one post. A `feed` the plugin was not given does nothing: no post is made. The player's own posts never count as [unseen](#values).

### Reactions

The `feed/react` effect adds likes, a comment, or both, to a post: the player's own, or someone else's that has appeared.

```ts
react('sunset', { likes: 12 })
react('sunset', { from: 'rosa', text: 'comment.rosa' })   // text is a prose key
react('rosa.loaves', { likes: 1 })                        // the player likes Rosa's post
```

How a post does is usually rolled. Put the roll in a game [custom effect](/reference/custom) that returns `react(...)`. A custom effect is worked out before the list runs, but the plugin effects it returns run in their turn, after the `feed/post` before it. See [Effects run in order](/reference/plugins#effects-run-in-order).

## A worked example

The town has a social feed and a notice board on the high street. Rosa posts about her loaves in the evening, and the parish council pins up a notice in the afternoon. The player can post a photo of the sunset from home. It takes a period of the day, and the game rolls the likes. Time of day comes from the [calendar](/plugins/calendar), and the town's map from the [places](/plugins/places) plugin, both listed before the feed, and Rosa is the [cast](/plugins/cast)'s: `plugins: [calendar(), places({ start: 'house' }), cast(), feed({ /* ... */ })]`. The notice board needs no phone: the high street has a button to read it.

```ts
import { SCHEMA, roll, type Pack } from '@ifloom/engine'
import { postTo, react } from '@ifloom/plugin-feed'
import { pass, period } from '@ifloom/plugin-calendar'
import { onlyAt } from '@ifloom/plugin-places'

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  activities: [
    { id: 'wait', effects: [pass(1)] },
    {
      id: 'postSunset', requires: [onlyAt(['house'])],
      effects: [pass(1), postTo('social', 'sunset', { text: 'own.sunset', image: 'art/sunset.jpg' }), { custom: 'howItDid' }],
    },
  ],
  prose: {
    'post.loaves': 'Seeded loaves are back from tomorrow.',
    'post.fete': 'Village fete on Saturday. Cakes wanted.',
    'own.sunset': 'Sunset from the back step.',
    'comment.rosa': 'Lovely light.',
    // place.house, place.street ...
  },
  data: {
    cast: { characters: [{ id: 'rosa', name: 'Rosa', role: 'Baker', home: 'bakery' }] },
    places: {
      locations: [
        // house ...
        {
          id: 'high-street', name: 'High Street', tag: 'Street', kind: 'street', exits: ['house'], art: '',
          body: [{ text: 'place.street' }],
          actions: [
            { id: 'board', label: 'Read the notice board', command: { type: 'custom', name: 'feed/seen', with: { feed: 'board' } } },
          ],
        },
      ],
    },
    feed: {
      posts: [
        { id: 'rosa.loaves', feed: 'social', from: 'rosa', when: period('evening'), body: [{ text: 'post.loaves' }], likes: 4 },
        { id: 'fete', feed: 'board', from: 'Parish council', when: period('afternoon'), body: [{ text: 'post.fete' }] },
      ],
    },
  },
  custom: {
    effects: {
      // How the sunset did: 3 to 12 likes, and Rosa always says something.
      howItDid: (state) => [
        react('sunset', { likes: 3 + roll(10, state.seed, state.turn, 'sunset.likes') }),
        react('sunset', { from: 'rosa', text: 'comment.rosa' }),
      ],
    },
  },
}
```

How it plays, starting at home on the second morning (turn 1):

```ts
const feeds = (state: GameState) => view(state, game).plugins.feed as FeedsView

state = apply(state, game, { type: 'activity', id: 'wait' }).state    // afternoon
feeds(state).feeds[1].posts
// [{ id: 'fete', from: 'Parish council', name: 'Parish council', portrait: null,
//    text: 'Village fete on Saturday. Cakes wanted.', image: null, turn: 1, likes: 0, comments: [], mine: false }]
feeds(state).unseen     // 1

state = apply(state, game, { type: 'activity', id: 'postSunset' }).state   // evening
feeds(state).feeds[0].posts
// [{ id: 'sunset', mine: true, name: 'Sam Doe', from: '', portrait: null, text: 'Sunset from the back step.',
//    image: 'art/sunset.jpg', likes: 3 to 12, comments: [{ from: 'rosa', name: 'Rosa', text: 'Lovely light.' }], ... },
//  { id: 'rosa.loaves', mine: false, name: 'Rosa', likes: 4, ... }]
holds(state, hasPosted(), game)                                        // true
holds(state, { custom: 'feed/likes', with: { post: 'sunset', gte: 3 } }, game)   // true

state = apply(state, game, seeFeed('social')).state    // the player looked at the feed
feeds(state).unseen     // 1: the notice board

// ...to the high street, and read the board
state = apply(state, game, { type: 'custom', name: 'feed/seen', with: { feed: 'board' } }).state
feeds(state).unseen     // 0
```

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ custom: 'feed/appeared', with: { post } }` | | Someone else's post has appeared. |
| `{ custom: 'feed/posted', with: { feed?, gte? } }` | `hasPosted(gte?, feed?)` | The player has made at least `gte` posts (1 if left out), to that feed or to any. |
| `{ custom: 'feed/likes', with: { post, gte } }` | | A post, the player's own or someone else's, has at least `gte` likes (1 if left out). |

```ts
{ text: 'cafe/rosa-saw-it', when: { custom: 'feed/likes', with: { post: 'sunset', gte: 10 } } }
// the same, short: the full name as the only key
{ text: 'cafe/rosa-saw-it', when: { 'feed/likes': { post: 'sunset', gte: 10 } } }
```

An unknown post is false for `feed/appeared`. For `feed/likes`, it has 0 likes.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ custom: 'feed/post', with: { feed, id, text?, image?, likes? } }` | `postTo(feed, id, { text?, image?, likes? })` | The player posts, this turn. `text` is a prose key. An id already posted, or a feed the plugin was not given, does nothing. |
| `{ custom: 'feed/react', with: { post, likes?, from?, text? } }` | `react(post, { likes?, from?, text? })` | Adds `likes`, and a comment if `text` is given, to a post. `text` is a prose key; `from` is a character id or a name. A post that has not appeared does nothing. |

They work in a data scene choice's effects, an activity's `effects`, a message reply's effects, and in what a game's custom effect returns, in the long form or short (`{ 'feed/post': { feed: 'social', id: 'sunset' } }`, see [plugin calls](/reference/custom)). In a plain-effect list (an item's use, what `rules.turn` returns), write the long form, `{ kind: 'custom', name: 'feed/post', with: {...} }`.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'feed/seen', with: { feed? } }` | `seeFeed(feed?)` | Marks the feed as looked at, which clears its `unseen`. `seeFeed()`, with no feed, marks them all. |

`feed/seen` is never refused apart from [locks](/reference/locks). A UI usually sends it when the player opens a feed.

## Values

| Prose writes | Prints |
|---|---|
| <code v-pre>{{v:feed/unseen}}</code> | Other people's posts the player has not looked at, in every feed. |
| <code v-pre>{{v:feed/unseen-&lt;feed&gt;}}</code> | Other people's posts not looked at in that feed, one value for each feed you configure: <code v-pre>{{v:feed/unseen-social}}</code>, <code v-pre>{{v:feed/unseen-board}}</code>. |

The player's own posts are never counted: they are not news to the player. The per-feed values also serve badges, such as a devices app's `badge: { count: 'feed/unseen-social' }`, and code through [`customValue`](/reference/custom). A value name may contain `-`, so they print in prose like any other.

## Strings

The feed has no refusals, and one line of its own in the [strings table](/reference/strings#plugins-strings). A game, a pack or a translation rewords it by its full key. Every other word it shows is the game's: feed names, post bodies and comments.

| Key | English |
|---|---|
| `feed/you` | `You` — the name on the player's own posts when the game has no `playerName` variable. |

```ts
strings: { 'feed/you': 'Me' }
```

## The view

`view(state, game).plugins.feed` is a `FeedsView`.

### FeedsView

```ts
type FeedsView = { feeds: FeedView[]; unseen: number }
```

| Field | What it is |
|---|---|
| `feeds` | Every feed, in the order `feed(...)` was given them, including empty ones. |
| `unseen` | Other people's posts not looked at, in every feed. |

### FeedView

```ts
type FeedView = { id: string; name: string; posts: PostView[]; unseen: number }
```

| Field | What it is |
|---|---|
| `posts` | Newest turn first. On the same turn, the player's own come first, latest first, and then other people's, the one listed last in the content first. |
| `unseen` | Other people's posts that have appeared in this feed since the player last sent `feed/seen` for it. The player's own are not counted. |

### PostView

```ts
type PostView = {
  id: string
  from: string
  name: string
  portrait: string | null
  text: string
  image: string | null
  turn: number
  likes: number
  comments: { from: string; name: string; text: string }[]
  mine: boolean
}
```

| Field | What it is |
|---|---|
| `from` | The poster, as written. `''` for the player's own. |
| `name` | The poster's name if they are a [cast](/plugins/cast) character, or `from` as written. For the player's own, the game's `playerName` [variable](/reference/state#flags) when it is a string, else the [`feed/you`](#strings) string, `You`. |
| `portrait` | A cast character's portrait (their `portrait`, or `art/character/<id>.jpg`), or `null`. Always `null` for the player's own. |
| `text` | The words, filled in: the body rendered for the current state, or the own post's prose line. |
| `image` | The image path, or `null`. |
| `turn` | The [turn](/reference/state#turn) it appeared or was posted. With the [calendar](/plugins/calendar#what-a-turn-is)'s default, a turn is a day. |
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

What the plugin keeps in a save, at `state.plugins.feed`: the turn each post appeared, the player's own posts oldest first, the likes and comments added to other people's posts, and how many of other people's posts each feed had when the player last looked. A UI reads the view, not this.

### OwnPost

```ts
type OwnPost = {
  id: string
  feed: string
  turn: number
  text?: string
  image?: string
  likes: number
  comments: Comment[]
}
```

A post the player made, as the state keeps it, with the turn it was posted. `text` is a prose key.

The plugin's state is at version 2. A save made at version 1 kept each own post's `day`; loading it moves that to `turn`, the same number, by the plugin's [migration](/reference/plugins). Nothing else changed.

### Comment

```ts
type Comment = { from: string; text: string }
```

A comment as the state keeps it: who, as written, and a prose key.

## For code

The helpers write the content objects for you, typed. `postTo` and `react` return an `EffectRef`, `hasPosted` returns a `Condition`, and `seeFeed` returns a `Command`.

### Helpers

```ts
const postTo: (feedId: string, id: string, post?: { text?: string; image?: string; likes?: number }) => EffectRef
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

When the game loads, the plugin reports, against the pack each post came from, with `where` as `posts <id>`:

- a feed the game was not given (`no feed called "…"`);
- anything `when` names that the game does not have (`unknown storyline "…"`);
- a body block with no prose (`no prose for "…"`), and anything its `when` names.

```text
mod:summer-fete · posts fete.stalls · no feed called "newsletter"
```

The player's own posts and reactions are made by effects and are not checked when the game loads: a `feed/post` to a feed the game was not given does nothing when it runs, and a `text` with no prose shows as `''`.

## Gotchas

- **Posts appear only after a command.** The plugin looks for new posts in its `after` [hook](/reference/plugins#hooks), which runs after every command that took, never on `start`. A post whose `when` holds on the first frame appears after the player's first command.
- **`when` is tested once the command has finished.** A post whose `when` is the calendar's `period('morning')` is missed if the first command of the morning ends in the afternoon. Write `when` for something that stays true, such as a flag, a day (the calendar's `day({ gte: 2 })`), a scene seen.
- **A post appears once,** and stays, whatever `when` does afterwards.
- **No notice.** Unlike a [message](/plugins/messages), a post appearing raises no [notice](/reference/notices). Badge a feed from `feed/unseen-<feed>`, or add a [trigger](/reference/triggers) with a `notify` effect for a post that should pop up.
- **`feed/unseen-<feed>` names come from the feeds you configure.** A feed called `social` gives `feed/unseen-social`; rename the feed and every badge that names the old value stops counting.
- **Own-post and comment prose keys are not checked.** The loader checks the prose of every `PostDef`, but not the `text` keys that `feed/post` and `feed/react` carry, since effects are not read at load. A missing one shows as `''`; read the screen after posting.
- **Ids are shared.** `feed/react` and `feed/likes` look for the player's own post with that id first, then someone else's. Give the player's posts ids that no `PostDef` uses.
- **React after posting.** `feed/react` on a post that is not there yet does nothing, so put the reaction after the `feed/post` in the list, or in a later command.
- **A feed does not need a device.** Show `view.plugins.feed` anywhere: the notice board in the example is drawn in the high street. The [devices](/plugins/devices) plugin is one way to show a feed, not a requirement.
