<script setup lang="ts">
import { view } from './runner.ts'
import Actions from './Actions.vue'
import Entities from './Entities.vue'
import Inputs from './Inputs.vue'
import Notices from './Notices.vue'
import Panel from './Panel.vue'
import Scene from './Scene.vue'
import Stats from './Stats.vue'

// The screen, put together from the parts on the Render it yourself pages: a side column, the story, the notices and any open panel.
// Each part imports runner and view from ./runner.ts.
</script>

<template>
  <aside class="sidebar">
    <h1>{{ view.title }}</h1>
    <Stats />
    <Entities />
  </aside>
  <main class="story">
    <Scene />
    <Inputs />
    <Actions />
  </main>
  <Notices />
  <Panel />
</template>
