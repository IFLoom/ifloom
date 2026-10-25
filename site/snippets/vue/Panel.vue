<script setup lang="ts">
import { runner, view } from './runner.ts'
import ShopCounter from './ShopCounter.vue'

// The panel open over the story, drawn by its name, with a Close button unless a scene holds it open.
// The vue template's App.vue draws <Panel v-if="view.panel" :panel="view.panel" />; this one reads view.panel itself.
</script>

<template>
  <section v-if="view.panel" class="panel" role="dialog" :aria-label="view.panel.panel">
    <div>
      <!-- The shop's counter (see the shop plugin's page); any other panel shows what it was opened with. -->
      <ShopCounter v-if="view.panel.panel === 'shop'" />
      <pre v-else>{{ JSON.stringify(view.panel.with, null, 2) }}</pre>
      <button v-if="!view.panel.scene" @click="runner.apply({ type: 'closePanel' })">Close</button>
    </div>
  </section>
</template>
