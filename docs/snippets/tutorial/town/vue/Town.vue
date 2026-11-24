<!-- src/Town.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// The places plugin's ways out, then a Talk button for each person here, under their name ("Ruth: Talk").
const buttons = computed(() => [
  ...(view.value.plugins.places?.exits ?? []),
  ...(view.value.plugins.cast?.present ?? []).flatMap((person) => person.actions.map((action) => ({ ...action, label: `${person.name}: ${action.label}` }))),
])
</script>

<template>
  <nav class="bottom choices">
    <button v-for="button in buttons" :key="button.id" :disabled="Boolean(button.disabled)" :title="button.disabled" @click="runner.apply(button.command)">
      {{ button.label }}
    </button>
  </nav>
</template>
