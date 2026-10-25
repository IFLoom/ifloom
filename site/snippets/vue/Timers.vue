<script setup lang="ts">
import { view } from './runner.ts'

// A countdown for each running timer: its label, a bar that empties, and the seconds left.
// The vue template's runner.ts runs startClock(runner) to send the ticks.
</script>

<template>
  <div v-for="timer in view.timers" :key="timer.id" class="timer" :data-timer="timer.id" :data-urgent="timer.left <= timer.total / 4 ? '' : undefined">
    <span v-if="timer.label" class="timer-label">{{ timer.label }}</span>
    <progress :max="timer.total" :value="timer.left" />
    <span class="timer-left">{{ Math.ceil(timer.left / 1000) }}s</span>
  </div>
</template>
