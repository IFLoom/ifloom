<script setup lang="ts">
import { runner, view } from './runner.ts'

// The scene's lines with their spans: bold and italics, inline actions, tooltips and UI pieces.
// The vue template's Line.vue does the same, with notes that open on a tap.
</script>

<template>
  <template v-for="(beat, at) in view.scene.beats" :key="at">
    <p v-if="beat.type === 'text' || beat.type === 'say'">
      <template v-if="!beat.spans">{{ beat.text }}</template>
      <template v-for="(span, index) in beat.spans" v-else :key="index">
        <template v-if="span.type === 'text'">{{ span.text }}</template>
        <strong v-else-if="span.type === 'bold'">{{ span.text }}</strong>
        <em v-else-if="span.type === 'italic'">{{ span.text }}</em>
        <!-- An inline action: a button in the line that presses the choice, greyed out with its reason. -->
        <button
          v-else-if="span.type === 'action'"
          class="inline-action"
          :disabled="Boolean(span.choice.disabled)"
          :title="span.choice.disabled"
          @click="runner.apply(span.choice.command)"
        >
          {{ span.text }}
        </button>
        <!-- A tooltip: the words, with the note on hover. -->
        <abbr v-else-if="span.type === 'tip'" class="tip" :title="span.tip">{{ span.text }}</abbr>
        <!-- A UI piece, [[ui:name|words|arg]]: render it by name, or show its words. -->
        <span v-else class="ui" :data-ui="span.name">{{ span.text }}</span>
      </template>
    </p>
  </template>
</template>
