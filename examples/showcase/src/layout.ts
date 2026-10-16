import { DEFAULT_LAYOUT, type Layout } from '@ifloom/react'

/**
 * The React UI's own layout, with the notice strip over the stage: a row of
 * unread counts (unseen notices, the phone's apps with a badge) that open
 * where they are. No built-in layout has it, so a game adds it.
 */
export const layout: Layout = {
  ...DEFAULT_LAYOUT,
  stage: ['notice-strip', ...DEFAULT_LAYOUT.stage],
}
