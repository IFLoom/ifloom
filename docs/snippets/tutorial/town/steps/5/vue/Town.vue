<!-- src/Town.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// The places plugin's buttons: the ways out of the location the player is at.
const buttons = computed(() => view.value.plugins.places?.exits ?? [])
</script>

<template>
  <nav class="bottom choices">
    <button v-for="button in buttons" :key="button.id" :disabled="Boolean(button.disabled)" :title="button.disabled" @click="runner.apply(button.command)">
      {{ button.label }}
    </button>
  </nav>
</template>
