<script setup lang="ts">
import { computed } from 'vue'
import type { RenderedChoice } from '@ifloom/engine'
import { runner, view } from './runner.ts'

// The `jobs` panel, shown from Panel.vue: jobs.open() opens it, and jobs.open(['dogs']) with { job: ['dogs'] } for only those.
const jobs = computed(() => {
  const { panel, plugins } = view.value
  if (panel?.panel !== 'jobs') return []
  const only = panel.with.job
  return (plugins.jobs?.jobs ?? []).filter((job) => !Array.isArray(only) || only.includes(job.id))
})
const buttons = (...all: (RenderedChoice | null)[]) => all.filter((button) => button !== null)
</script>

<template>
  <section v-for="job in jobs" :key="job.id" class="job">
    <h3>
      {{ job.name }}<template v-if="job.rank">: {{ job.rank.name }}</template>
    </h3>
    <p>{{ job.description }}</p>
    <p v-if="job.pay?.stats">Pays {{ job.pay.stats.map((stat) => stat.text).join(', ') }} a shift</p>
    <p v-if="job.nextShift">{{ job.nextShift.inDays ? `Next shift in ${job.nextShift.inDays} days` : 'A shift today' }}</p>
    <!-- Ready-made buttons: Apply while you don't have the job, Work while you do, each with why it can't be done. -->
    <button
      v-for="button in buttons(job.apply, job.work)"
      :key="button.id"
      :disabled="Boolean(button.disabled)"
      :title="button.disabled"
      @click="runner.apply(button.command)"
    >
      {{ button.label }}
    </button>
  </section>
</template>
