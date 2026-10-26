import type { InlineSpan, RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** The scene's lines with their spans: bold and italics, inline actions, tooltips and UI pieces. */
export function drawProse(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const beat of view.scene.beats) {
    if (beat.type === 'text' || beat.type === 'say') drawLine(add(parent, 'p'), beat.text, beat.spans)
  }
}

/** A line's words. Without spans it's plain text; with them, each span is drawn by its type. */
function drawLine(line: HTMLElement, text: string, spans: InlineSpan[] | undefined): void {
  if (!spans) {
    line.textContent = text
    return
  }
  for (const span of spans) {
    switch (span.type) {
      case 'text':
        line.append(span.text)
        break
      case 'bold':
      case 'italic':
        add(line, span.type === 'bold' ? 'strong' : 'em', span.text)
        break
      case 'action': {
        // An inline action: a button in the line that presses the choice, greyed out with its reason.
        const button = add(line, 'button', span.text, 'inline-action')
        button.disabled = Boolean(span.choice.disabled)
        if (span.choice.disabled) button.title = span.choice.disabled
        button.onclick = () => runner.apply(span.choice.command)
        break
      }
      case 'tip':
        // A tooltip: the words, with the note on hover.
        add(line, 'abbr', span.text, 'tip').title = span.tip
        break
      case 'ui':
        // A UI piece, [[ui:name|words|arg]]: draw it by name, or show its words.
        add(line, 'span', span.text, 'ui').dataset.ui = span.name
        break
    }
  }
}
