<script setup lang="ts">
import { runner, view } from './runner.ts'

// A flowing scene: everything up to where it stopped, the picks made on the way, and the decision it's waiting on.
// What the last pick brought, from `fresh` on, gets a class to fade it in; what came before stays still.
const fresh = (at: number) => view.value.scene.fresh > 0 && at >= view.value.scene.fresh
</script>

<template>
  <div class="prose">
    <template v-for="(beat, at) in view.scene.beats" :key="at">
      <p v-if="beat.type === 'chose'" class="beat-chose" :class="{ fresh: fresh(at) }">{{ beat.label }}</p>
      <p v-else-if="beat.type === 'text' || beat.type === 'say'" :class="{ fresh: fresh(at) }">{{ beat.text }}</p>
    </template>
  </div>
  <div class="choices">
    <button
      v-for="choice in view.scene.choices"
      :key="choice.id"
      :disabled="Boolean(choice.disabled)"
      :title="choice.disabled"
      @click="runner.apply(choice.command)"
    >
      {{ choice.label }}
    </button>
  </div>
</template>
