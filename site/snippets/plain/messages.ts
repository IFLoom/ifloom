import type { RunnerSnapshot } from '@ifloom/engine'
// runner, add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** Each channel's threads, with their messages and the replies on offer, and a button that marks a thread read. */
export function drawMessages(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const channel of view.plugins.messages?.channels ?? []) {
    add(parent, 'h3', channel.unread ? `${channel.name} (${channel.unread})` : channel.name)
    for (const thread of channel.threads) {
      const box = add(parent, 'section', '', 'thread')
      add(box, 'h4', thread.name)
      for (const message of thread.messages) {
        const bubble = add(box, 'div', '', 'message')
        if (!message.read) bubble.dataset.unread = ''
        add(bubble, 'strong', message.name)
        add(bubble, 'p', message.text)
        // A reply is a button like any other; once sent, it's the words of the reply.
        if (message.replied) add(bubble, 'p', message.replied, 'replied')
        else drawChoices(bubble, message.replies)
      }
      // Mark read, while anything in the thread is unread.
      if (thread.read) drawChoices(box, [thread.read])
    }
  }
}
