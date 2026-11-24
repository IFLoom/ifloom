<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { reducedMotion, transitionOf, withReveals } from '../hints.ts'
import { view } from './runner.ts'

// The scene, coming in by its transition, each revealed line after its delay. When the screen changes,
// the old one goes out by its `out`, then the new one comes in. A click shows every line at once.
const motion = !reducedMotion()
// The view whose scene is on the page, and whether it's going out.
const shown = shallowRef(view.value)
const leaving = ref(false)
const revealed = ref(false)
const transition = computed(() => transitionOf(shown.value))
let timer: ReturnType<typeof setTimeout> | undefined

watch(view, (now) => {
  clearTimeout(timer)
  if (now.scene.key === transition.value.key) return void (shown.value = now)
  const swap = () => {
    leaving.value = false
    revealed.value = false
    shown.value = now
  }
  if (!motion || transition.value.out === 'none') return swap()
  leaving.value = true
  timer = setTimeout(swap, transition.value.ms)
})
</script>

<template>
  <article
    :key="transition.key"
    :data-transition-in="motion ? transition.in : undefined"
    :data-transition-out="leaving ? transition.out : undefined"
    :data-revealed="revealed ? '' : undefined"
    :aria-hidden="leaving ? 'true' : undefined"
    :inert="leaving"
    :style="{ '--ms': `${transition.ms}ms` }"
    @click="revealed = true"
  >
    <h2>{{ shown.scene.title }}</h2>
    <template v-for="({ beat, reveal }, at) in withReveals(shown.scene.beats)" :key="at">
      <p
        v-if="beat.type === 'text' || beat.type === 'say'"
        :data-reveal="motion && reveal ? reveal.as : undefined"
        :style="reveal ? { '--at': `${reveal.at}ms` } : undefined"
      >
        {{ beat.text }}
      </p>
    </template>
  </article>
</template>
