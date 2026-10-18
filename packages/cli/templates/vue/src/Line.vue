<script setup lang="ts">
import { ref, useId } from 'vue'
import type { InlineSpan } from '@ifloom/engine'
import { runner } from './runner.ts'

// A line's words, with bold and italics, and its inline actions and tooltips as buttons in it. A tooltip, or a
// greyed-out action's reason, is a note after the button that shows on hover, on focus
// and on a tap (see `.note` in styles.css).
defineProps<{ text: string; spans?: InlineSpan[] }>()
const id = useId()
const open = ref<number | null>(null)

function press(span: InlineSpan, at: number) {
  if (span.kind === 'action' && !span.choice.disabled) runner.apply(span.choice.command)
  else open.value = open.value === at ? null : at
}
const note = (span: InlineSpan) => (span.kind === 'tip' ? span.tip : span.kind === 'action' ? span.choice.disabled : undefined)
</script>

<template>
  <template v-if="!spans">{{ text }}</template>
  <template v-for="(span, at) in spans" v-else :key="at">
    <template v-if="span.kind === 'text'">{{ span.text }}</template>
    <strong v-else-if="span.kind === 'bold'">{{ span.text }}</strong>
    <em v-else-if="span.kind === 'italic'">{{ span.text }}</em>
    <template v-else>
      <button
        type="button"
        :class="span.kind === 'tip' ? 'tip' : 'inline-action'"
        :aria-disabled="span.kind === 'action' && span.choice.disabled ? 'true' : undefined"
        :aria-describedby="note(span) ? `${id}-${at}` : undefined"
        :aria-expanded="note(span) ? open === at : undefined"
        @click="press(span, at)"
      >
        {{ span.text }}
      </button>
      <span v-if="note(span)" :id="`${id}-${at}`" role="tooltip" class="note">{{ note(span) }}</span>
    </template>
  </template>
</template>
