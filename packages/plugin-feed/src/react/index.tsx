/**
 * @ifloom/plugin-feed/react: the feed plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `feedUi` in the game's `plugins`
 * to have a feed drawn where an app shows one, or draw it yourself from
 * `useFeed`.
 */
import type { ComponentProps } from 'react'
import type { GameState, Result, SceneBeat } from '@ifloom/engine'
import type { FeedsView } from '../index.ts'
import { Beat, buttonVariants, overridable, type Override, Picture, type PluginUi, useGame, usePart, useWords, Video } from '@ifloom/react'

/** The feed plugin's words, in English. A game rewords any with `ui.<key>` in its strings. */
export const FEED_WORDS = {
  likes: '♥ {n}',
} as const

declare module '@ifloom/react' {
  interface OverridableComponents {
    FeedSection: Override<ComponentProps<typeof FeedSection>>
  }
  interface PartNames {
    'feed': true
    'post': true
    'post-author': true
    'post-comment': true
    'post-comment-name': true
    'post-image': true
    'post-meta': true
    'post-portrait': true
    'post-text': true
  }
}

type SectionProps = { data: unknown; with: Record<string, unknown> }

/** What `useFeed` returns: the feed plugin's view, and its command. */
export type FeedControls = FeedsView & {
  /** Mark a feed's posts seen: sends `feed/seen`. */
  seen: (feed: string) => Result<GameState>
}

/** The feed plugin's view with its command, or null in a game without the plugin. `FeedSection` is drawn from it. */
export function useFeed(): FeedControls | null {
  const { view, send } = useGame()
  const data = view.plugins.feed as FeedsView | undefined
  if (!data) return null
  return { ...data, seen: (feed) => send({ type: 'custom', name: 'feed/seen', with: { id: feed } }) }
}

/** A message's or a post's words: its beats, as a scene's are drawn, or its text when the plugin gives none. */
function Words({ beats, text }: { beats?: SceneBeat[]; text: string }) {
  if (!beats) return <>{text}</>
  return (
    <>
      {beats.map((beat, index) => (
        <Beat key={index} beat={beat} />
      ))}
    </>
  )
}

function FeedSectionImpl({ data, with: options }: SectionProps) {
  const { send } = useGame()
  const feeds = useFeed()
  const words = useWords(FEED_WORDS)
  const box = usePart('feed', 'flex flex-col gap-3')
  const seenAll = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const card = usePart('post', 'flex flex-col gap-2 rounded-lg border p-3')
  const author = usePart('post-author', 'flex items-center gap-2 text-sm font-medium')
  const portrait = usePart('post-portrait', 'size-6 rounded-full object-cover')
  const image = usePart('post-image', 'w-full rounded')
  const text = usePart('post-text', 'flex flex-col gap-2 text-sm')
  const clip = usePart('post-image', 'w-full rounded')
  const meta = usePart('post-meta', 'text-xs text-muted-foreground')
  const comment = usePart('post-comment', 'text-xs')
  const commenter = usePart('post-comment-name', 'font-medium')
  const feed = ((data as FeedsView | undefined) ?? feeds)?.feeds.find((entry) => entry.id === options.feed)
  if (!feed || !feeds) return null
  return (
    <div {...box} data-feed={feed.id}>
      {feed.seen ? (
        <button type="button" {...seenAll} onClick={() => send(feed.seen!.command)}>
          {feed.seen.label}
        </button>
      ) : null}
      {feed.posts.map((post) => (
        <article key={post.id} {...card} data-post={post.id}>
          <p {...author}>
            {post.portrait ? <Picture {...portrait} src={post.portrait} alt="" /> : null}
            {post.name}
          </p>
          {post.image ? <Picture {...image} src={post.image} alt="" /> : null}
          {post.video ? <Video className={clip.className} src={post.video} autoplay loop muted controls={false} /> : null}
          {post.beats?.length || (!post.beats && post.text) ? (
            <div {...text}>
              <Words beats={post.beats} text={post.text} />
            </div>
          ) : null}
          <p {...meta}>{words('likes', { n: post.likes })}</p>
          {post.comments.map((entry, index) => (
            <p key={index} {...comment}>
              <span {...commenter}>{entry.name}</span> {entry.text}
            </p>
          ))}
        </article>
      ))}
    </div>
  )
}

/**
 * A feed in an app: posts newest first, with likes and comments, and a button
 * to mark the feed seen. A post's words are drawn as beats through `Beat`, and
 * its `video` through `Video`, like a GIF. A thin default on `useFeed`.
 */
export const FeedSection = overridable('FeedSection', FeedSectionImpl)

/**
 * The feed plugin's React UI, for `plugins` on `mountGame` or `GameProvider`:
 * a `FeedSection` wherever a device's app shows a feed, and the feed's words.
 */
export const feedUi: PluginUi = {
  id: 'feed',
  words: FEED_WORDS,
  sections: { feed: FeedSection },
}
