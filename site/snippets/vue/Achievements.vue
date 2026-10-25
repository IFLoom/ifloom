<script setup lang="ts">
import { view } from './runner.ts'

// Every achievement, earned or not, with progress towards the ones that count. A secret one reads ??? until it's earned.
</script>

<template>
  <template v-if="view.plugins.achievements">
    <h3>Achievements: {{ view.plugins.achievements.earned }} of {{ view.plugins.achievements.total }}</h3>
    <ul class="achievements">
      <li v-for="entry in view.plugins.achievements.achievements" :key="entry.id" :data-earned="entry.earned ? '' : undefined">
        {{ entry.name }}
        <p v-if="entry.description">{{ entry.description }}</p>
        <progress v-if="entry.progress" :max="entry.progress.target" :value="entry.progress.value" />
      </li>
    </ul>
  </template>
</template>
