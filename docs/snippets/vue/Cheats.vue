<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// The cheats under their groups, each a button that says how often it's been used, greyed out with why when it's refused.
const cheats = computed(() => view.value.plugins.cheats?.cheats ?? [])
const groups = computed(() => [...new Set(cheats.value.map((cheat) => cheat.group))])
</script>

<template>
  <template v-for="group in groups" :key="group ?? ''">
    <h3 v-if="group">{{ group }}</h3>
    <button
      v-for="cheat in cheats.filter((entry) => entry.group === group)"
      :key="cheat.id"
      :disabled="Boolean(cheat.button.disabled)"
      :title="cheat.button.disabled ?? cheat.description"
      @click="runner.apply(cheat.button.command)"
    >
      {{ cheat.name }}<template v-if="cheat.used"> (used {{ cheat.used }})</template>
    </button>
  </template>
</template>
