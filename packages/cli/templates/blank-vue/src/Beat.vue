<script setup lang="ts">
import type { SceneBeat } from '@ifloom/engine'

// One paragraph of a scene: narration, a spoken line, a picture, a letter. A sound beat is heard, not drawn.
defineProps<{ beat: SceneBeat }>()
</script>

<template>
  <p v-if="beat.kind === 'text'">{{ beat.text }}</p>
  <p v-else-if="beat.kind === 'mono'" class="beat-mono">{{ beat.text }}</p>
  <p v-else-if="beat.kind === 'say'" class="beat-say" :data-who="beat.who">{{ beat.text }}</p>
  <img v-else-if="beat.kind === 'image'" class="beat-image" :src="beat.src" :alt="beat.alt ?? ''" />
  <video
    v-else-if="beat.kind === 'video'"
    class="beat-image"
    :src="beat.src"
    :poster="beat.poster"
    :autoplay="beat.autoplay"
    :loop="beat.loop"
    :muted="beat.muted"
    :controls="beat.controls"
    playsinline
  />
  <div v-else-if="beat.kind === 'mail'" class="beat-prop">
    <p v-for="line in beat.headers" :key="line.key">{{ line.key }}: {{ line.value }}</p>
    <p>{{ beat.body }}</p>
  </div>
  <div v-else-if="beat.kind === 'prop'" class="beat-prop">{{ beat.text }}</div>
</template>
