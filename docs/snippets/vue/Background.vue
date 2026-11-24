<script setup lang="ts">
import { computed } from 'vue'
import Scene from './Scene.vue'
import { view } from './runner.ts'

// The scene's picture behind its words: its bottom layer as the background of a box round the scene.
// A video layer can't be a CSS background, so it's left to Picture.vue.
const background = computed(() => {
  const layer = view.value.scene.picture?.layers[0]
  return layer && !layer.video ? `url("${layer.src}")` : undefined
})
</script>

<template>
  <div class="scene-background" :style="{ backgroundImage: background, backgroundSize: 'cover', backgroundPosition: 'center' }">
    <Scene />
  </div>
</template>
