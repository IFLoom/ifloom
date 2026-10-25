<script setup lang="ts">
import { runner, view } from './runner.ts'

// The minigame being played, under the scene's title and beats (its words): a bar counting down its timer, and a
// button for each input that does something now. The vue template's runner.ts runs startClock(runner) to send the ticks.
</script>

<template>
  <section v-if="view.minigame" class="minigame" :data-state="view.minigame.state">
    <div v-if="view.minigame.timeLeft !== null && view.minigame.timeTotal" class="timer" role="progressbar" aria-label="Time left">
      <span :style="{ transform: `scaleX(${view.minigame.timeLeft / view.minigame.timeTotal})` }" />
    </div>
    <div class="choices">
      <button v-for="input in view.minigame.inputs" :key="input" @click="runner.apply({ type: 'minigame', input })">{{ input }}</button>
    </div>
  </section>
</template>
