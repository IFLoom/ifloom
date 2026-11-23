<script setup lang="ts">
import { computed } from 'vue'
import type { RenderedChoice } from '@ifloom/engine'
import { runner, view } from './runner.ts'

// The `jobs` panel, shown from Panel.vue: jobs.open() opens it, and jobs.open(['dogs']) with only those.
// The view's panel is the jobs on the open board, already filtered; null while it's shut.
const jobs = computed(() => view.value.plugins.jobs?.panel ?? [])
const buttons = (...all: (RenderedChoice | null)[]) => all.filter((button) => button !== null)
</script>

<template>
  <section v-for="job in jobs" :key="job.id" class="job">
    <h3>
      {{ job.name }}<template v-if="job.rank">: {{ job.rank.name }}</template>
    </h3>
    <p>{{ job.description }}</p>
    <p v-if="job.pay">Pays {{ job.pay.text }} a shift</p>
    <p v-if="job.nextShift">{{ job.nextShift.inDays ? `Next shift in ${job.nextShift.inDays} days` : 'A shift today' }}</p>
    <!-- Ready-made buttons: Apply while you don't have the job, Work while you do, each with why it can't be done. -->
    <button
      v-for="button in buttons(job.apply, job.work, job.quit)"
      :key="button.id"
      :disabled="Boolean(button.disabled)"
      :title="button.disabled"
      @click="runner.apply(button.command)"
    >
      {{ button.label }}
    </button>
  </section>
</template>
