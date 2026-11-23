import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** Each feed's posts, newest first, with their likes and comments, and a button that marks the feed seen. */
export function drawFeed(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const feed of view.plugins.feed?.feeds ?? []) {
    add(parent, 'h3', feed.unread ? `${feed.name} (${feed.unread} new)` : feed.name)
    for (const post of feed.posts) {
      const card = add(parent, 'article', '', post.mine ? 'post mine' : 'post')
      add(card, 'strong', post.name)
      add(card, 'p', post.text)
      if (post.image) Object.assign(add(card, 'img'), { src: post.image, alt: '' })
      add(card, 'span', `${post.likes} likes`, 'likes')
      for (const comment of post.comments) add(card, 'p', `${comment.name}: ${comment.text}`, 'comment')
    }
    // Mark all seen, while anything in the feed is new.
    if (feed.seen) drawChoices(parent, [feed.seen])
  }
}
