<!-- src/App.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// The scene's choices. With no scene open, the room's buttons and the game's,
// the ways out, each labelled with where it goes, and a Talk button for each person here,
// under their name ("Ruth: Talk"), so two people's buttons don't read the same.
const buttons = computed(() => [
  ...view.value.scene.choices,
  ...view.value.actions,
  ...(view.value.plugins.places?.exits ?? []),
  ...(view.value.plugins.cast?.present ?? []).flatMap((person) => person.actions.map((action) => ({ ...action, label: `${person.name}: ${action.label}` }))),
])
</script>

<template>
  <p v-if="view.when">{{ view.when }}</p>
  <h2>{{ view.scene.title }}</h2>
  <!-- Who the scene is with, such as Ruth at the counter. -->
  <h3 v-if="view.scene.speaker">{{ view.scene.speaker.name }}</h3>
  <!-- Narration, and a spoken line, under the name of who says it when the line names them. -->
  <template v-for="(beat, at) in view.scene.beats" :key="at">
    <p v-if="beat.type === 'text'">{{ beat.text }}</p>
    <p v-else-if="beat.type === 'say'">{{ beat.name ? `${beat.name}: ` : '' }}“{{ beat.text }}”</p>
  </template>
  <button v-for="(button, at) in buttons" :key="at" :disabled="Boolean(button.disabled)" :title="button.disabled" @click="runner.apply(button.command)">
    {{ button.label }}
  </button>
  <p>{{ view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · ') }}</p>
</template>
