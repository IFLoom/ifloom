<script setup lang="ts">
import { runner, view } from './runner.ts'

// The scene's layered picture, else its image: layers stacked bottom first, and each hotspot a button placed by its rect, in percent.
const fill = { position: 'absolute', inset: '0', width: '100%', height: '100%' } as const
const at = ([left, top, width, height]: [number, number, number, number]) =>
  ({ position: 'absolute', left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }) as const
</script>

<template>
  <div v-if="view.scene.picture" class="picture" :style="{ position: 'relative', aspectRatio: view.scene.picture.aspect ?? 'auto' }">
    <template v-for="(layer, index) in view.scene.picture.layers" :key="index">
      <video v-if="layer.video" :src="layer.src" :style="fill" autoplay loop muted />
      <img v-else :src="layer.src" alt="" :style="fill" />
    </template>
    <button
      v-for="hotspot in view.scene.picture.hotspots"
      :key="hotspot.id"
      class="hotspot"
      :aria-label="hotspot.label"
      :title="hotspot.disabled ?? hotspot.label"
      :disabled="Boolean(hotspot.disabled)"
      :style="at(hotspot.rect)"
      @click="runner.apply(hotspot.command)"
    />
  </div>
  <img v-else-if="view.scene.image" :src="view.scene.image" alt="" />
</template>
