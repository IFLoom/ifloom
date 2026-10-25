<script setup lang="ts">
import type { SceneBeat } from '@ifloom/engine'
import Line from './Line.vue'

// One paragraph of a scene: narration, a spoken line, a picture, a clip. A sound beat is heard, not drawn.
defineProps<{ beat: SceneBeat }>()
</script>

<template>
  <p v-if="beat.type === 'text'"><Line :text="beat.text" :spans="beat.spans" /></p>
  <p v-else-if="beat.type === 'say'" class="beat-say" :data-who="beat.who"><Line :text="beat.text" :spans="beat.spans" /></p>
  <img v-else-if="beat.type === 'image'" class="beat-image" :src="beat.src" :alt="beat.alt ?? ''" />
  <video
    v-else-if="beat.type === 'video'"
    class="beat-image"
    :src="beat.src"
    :poster="beat.poster"
    :autoplay="beat.autoplay"
    :loop="beat.loop"
    :muted="beat.muted"
    :controls="beat.controls"
    playsinline
  />
</template>
