<script setup lang="ts">
import { computed } from 'vue'
import type { SceneBeat } from '@ifloom/engine'
import { runner, view } from './runner.ts'

// A flowing scene: everything up to where it stopped, the choices made on the way, a fold's beats together, and the decision it's waiting on.
// What the last choice brought, from `fresh` on, gets a class to fade it in; what came before stays still.
const fresh = (at: number) => view.value.scene.fresh > 0 && at >= view.value.scene.fresh

// The beats in runs: one on its own, or a fold's together, in a <details> the player opens and shuts.
const runs = computed(() => {
  const out: { fold?: string; beats: { beat: SceneBeat; at: number }[] }[] = []
  view.value.scene.beats.forEach((beat, at) => {
    const fold = typeof beat.section?.fold === 'string' ? beat.section.fold : undefined
    const last = out.at(-1)
    if (fold !== undefined && last?.fold === fold) last.beats.push({ beat, at })
    else out.push({ fold, beats: [{ beat, at }] })
  })
  return out
})
</script>

<template>
  <div class="prose">
    <component :is="run.fold === undefined ? 'div' : 'details'" v-for="(run, index) in runs" :key="index">
      <summary v-if="run.fold !== undefined">{{ run.fold }}</summary>
      <template v-for="{ beat, at } in run.beats" :key="at">
        <p v-if="beat.type === 'chose'" class="beat-chose" :class="{ fresh: fresh(at) }">{{ beat.label }}</p>
        <p v-else-if="beat.type === 'text' || beat.type === 'say'" :class="{ fresh: fresh(at) }">{{ beat.text }}</p>
      </template>
    </component>
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
