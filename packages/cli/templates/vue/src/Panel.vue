<script setup lang="ts">
import type { OpenPanel } from '@ifloom/engine'
import { runner } from './runner.ts'

// The panel open over the story, `view.panel`: a shop's counter, a job board. A `panel` effect opens one, and so does a scene's `panel` while it's open.
// Draw each one your game opens by its name, from what it was opened with. Closing it sends `closePanel`; a scene's own panel has no close button, since it stays while the scene is open.
defineProps<{ panel: OpenPanel }>()
</script>

<template>
  <section class="panel" role="dialog" aria-modal="true" :aria-label="panel.panel" :data-panel="panel.panel">
    <div>
      <h2>{{ panel.panel }}</h2>
      <pre>{{ JSON.stringify(panel.with, null, 2) }}</pre>
      <button v-if="!panel.scene" @click="runner.apply({ type: 'closePanel' })">Close</button>
    </div>
  </section>
</template>
