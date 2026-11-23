<script setup lang="ts">
import { runner, view } from './runner.ts'

// What you hold, each thing with a button to use it, when it has a use, and one to drop it.
</script>

<template>
  <div v-for="thing in view.plugins.inventory?.things" :key="`${thing.at}/${thing.ref}`" class="thing">
    <span :title="thing.description ?? ''">{{ thing.count > 1 ? `${thing.name} ×${thing.count}` : thing.name }}</span>
    <button
      v-for="button in thing.use ? [thing.use, thing.drop] : [thing.drop]"
      :key="button.id"
      :disabled="Boolean(button.disabled)"
      :title="button.disabled"
      @click="runner.apply(button.command)"
    >
      {{ button.label }}
    </button>
  </div>
</template>
