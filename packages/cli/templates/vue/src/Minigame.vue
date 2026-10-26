<script setup lang="ts">
import type { MinigameView } from '@ifloom/engine'
import { runner } from './runner.ts'

// The minigame being played: a bar counting down its timer, and a button for each input that does something now,
// in the words the game's `minigame.<input>` strings give it.
defineProps<{ minigame: MinigameView }>()
</script>

<template>
  <section class="minigame" :data-state="minigame.state">
    <div v-if="minigame.timeLeft !== null && minigame.timeTotal" class="timer" role="progressbar" aria-label="Time left">
      <span :style="{ transform: `scaleX(${minigame.timeLeft / minigame.timeTotal})` }" />
    </div>
    <div class="choices">
      <button v-for="input in minigame.inputs" :key="input.id" @click="runner.apply(input.command)">{{ input.label }}</button>
    </div>
  </section>
</template>
