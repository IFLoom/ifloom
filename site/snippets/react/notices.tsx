import { Badge, Game, NoticeStrip, Notices, Overlay, Scene, Sidebar, Story, useGame } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`. The default layout has Notices in its Overlay.
export function Layout() {
  return (
    <Game>
      <Sidebar>
        <PostBadge />
      </Sidebar>
      <Story>
        {/* Or the unseen notices in a strip over the story. */}
        <NoticeStrip />
        <Scene />
      </Story>
      <Overlay>
        {/* Toasts in a corner, each with a button that dismisses it. */}
        <Notices />
      </Overlay>
    </Game>
  )
}

// How many are unseen under a tag, from view.notices.byTag.
export function PostBadge() {
  const { view } = useGame()
  const count = view.notices.byTag.post ?? 0
  return count ? <Badge>{count} new</Badge> : null
}
