/**
 * @ifloom/plugin-feed/react: the feed plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `feedUi` in the game's `plugins`
 * to have a feed drawn where an app shows one, or draw it yourself from
 * `useFeed`.
 */
import type { ComponentProps } from 'react'
import type { GameState, Result, SceneBeat } from '@ifloom/engine'
import { feed as feedPlugin, type FeedsView } from '../index.ts'
import { Beat, Picture, usePart, Video } from '@ifloom/react'
import { buttonVariants, overridable, type Override, pluginKit, type PluginUi, useKitPart, usePlugin } from '@ifloom/react/kit'

/** The feed plugin's words in English, keyed by name. A game rewords any of them with `ui.<key>` in its strings. */
export const FEED_WORDS = {
  likes: '♥ {n}',
} as const

/** The feed plugin's UI, declared once: its id and its words, for `usePlugin` and `feedUi`. */
const FEED = pluginKit('feed', FEED_WORDS)

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

/** The feed plugin's view with a way to mark a feed seen, as `useFeed` returns it. */
export type FeedControls = FeedsView & {
  /** Sends the `feed/seen` command, which marks the feed's posts seen. */
  seen: (feed: string) => Result<GameState>
}

/**
 * Returns the feed plugin's view and its command from the running game, or null in a game without the plugin. It
 * re-renders when the view changes. `FeedSection` renders from it.
 */
export function useFeed(): FeedControls | null {
  const { view, send } = usePlugin(FEED)
  if (!view) return null
  return { ...view, seen: (feed) => send(feedPlugin.seen(feed)) }
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

function FeedSectionImpl({ with: options }: SectionProps) {
  const { view: feeds, words, send } = usePlugin(FEED)
  const box = usePart('feed', 'flex flex-col gap-3')
  const seenAll = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const card = useKitPart('card', 'post')
  const author = usePart('post-author', 'flex items-center gap-2 text-sm font-medium')
  const portrait = usePart('post-portrait', 'size-6 rounded-full object-cover')
  const image = usePart('post-image', 'w-full rounded')
  const text = usePart('post-text', 'flex flex-col gap-2 text-sm')
  const clip = usePart('post-image', 'w-full rounded')
  const meta = useKitPart('note', 'post-meta', 'text-xs')
  const comment = usePart('post-comment', 'text-xs')
  const commenter = usePart('post-comment-name', 'font-medium')
  const feed = feeds?.feeds.find((entry) => entry.id === options.feed)
  if (!feed) return null
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
 * Renders the feed named by an app section's `with.feed`, from `view.plugins.feed`, newest post first. A preset styles
 * its `feed`, `post` and `post-*` parts.
 *
 * Each post shows its likes and comments, and a button marks the feed seen.
 *
 * A post's words render as beats through `Beat`, and its `video` through `Video`, playing, looping and muted.
 */
export const FeedSection = overridable('FeedSection', FeedSectionImpl)

/**
 * The feed plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It registers `FeedSection` for a
 * device app's `feed` section, and adds the plugin's words.
 */
export const feedUi: PluginUi = {
  ...FEED,
  sections: { feed: FeedSection },
}
