<script setup lang="ts">
import { view } from './runner.ts'

// What the last command moved, as pills: `+30 coins`, `-1 Energy`, `+4 Ava`, marked up or down for styling.
</script>

<template>
  <ul v-if="view.changes.length" class="changes">
    <li
      v-for="change in view.changes"
      :key="`${change.of ?? 'player'} ${change.stat}`"
      class="change"
      :data-stat="change.stat"
      :data-of="change.of"
      :data-dir="change.by > 0 ? 'up' : 'down'"
    >
      {{ change.text }} {{ change.name }}
    </li>
  </ul>
</template>
