<script lang="ts">
  import type { InlineSpan } from '@ifloom/engine'
  import { runner } from './runner.ts'

  // A line's words, with bold and italics, and its inline actions and tooltips as buttons in it. A tooltip, or a
  // greyed-out action's reason, is a note after the button that shows on hover, on focus
  // and on a tap (see `.note` in styles.css). A UI piece (`[[ui:…]]`) shows its words.
  let { text, spans }: { text: string; spans?: InlineSpan[] } = $props()
  const id = $props.id()
  let open: number | null = $state(null)

  function press(span: InlineSpan, at: number) {
    if (span.type === 'action' && !span.choice.disabled) runner.apply(span.choice.command)
    else open = open === at ? null : at
  }
  const note = (span: InlineSpan) => (span.type === 'tip' ? span.tip : span.type === 'action' ? span.choice.disabled : undefined)
</script>

{#if !spans}{text}{:else}{#each spans as span, at (at)}{#if span.type === 'text'}{span.text}{:else if span.type === 'bold'}<strong>{span.text}</strong>{:else if span.type === 'italic'}<em>{span.text}</em>{:else if span.type === 'ui'}{span.text}{:else}<button
        type="button"
        class={span.type === 'tip' ? 'tip' : 'inline-action'}
        aria-disabled={span.type === 'action' && span.choice.disabled ? 'true' : undefined}
        aria-describedby={note(span) ? `${id}-${at}` : undefined}
        aria-expanded={note(span) ? open === at : undefined}
        onclick={() => press(span, at)}>{span.text}</button
      >{#if note(span)}<span id="{id}-{at}" role="tooltip" class="note">{note(span)}</span>{/if}{/if}{/each}{/if}
