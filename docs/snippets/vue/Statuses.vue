<script setup lang="ts">
import { view } from './runner.ts'

// The active statuses, under the stats: each with how many turns it has left. The stats already include what they add.
</script>

<template>
  <ul v-if="view.plugins.statuses?.active.length" class="statuses">
    <li v-for="status in view.plugins.statuses.active" :key="status.id" :title="status.description">
      {{ status.name }} ({{ status.turnsLeft }} left)<template v-if="status.stacks > 1"> ×{{ status.stacks }}</template>
    </li>
  </ul>
</template>
