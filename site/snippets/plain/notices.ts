import type { View } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** The notices not yet dismissed, newest first, each with a button that marks it seen. */
export function drawNotices(parent: HTMLElement, view: View): void {
  const toasts = add(parent, 'div', '', 'notices')
  toasts.setAttribute('role', 'status')
  for (const notice of view.notices.unseen) {
    const toast = add(toasts, 'div', '', 'notice')
    if (notice.tag) toast.dataset.tag = notice.tag
    add(toast, 'strong', notice.title)
    if (notice.text) add(toast, 'p', notice.text)
    add(toast, 'button', 'Dismiss').onclick = () => runner.apply({ type: 'dismiss', id: notice.id })
  }
}

/** A badge with how many are unseen under a tag, such as the post. */
export function drawPostBadge(parent: HTMLElement, view: View): void {
  const count = view.notices.byTag.post ?? 0
  if (count) add(parent, 'span', String(count), 'badge')
}
