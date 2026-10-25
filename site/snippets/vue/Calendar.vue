<script setup lang="ts">
import { view } from './runner.ts'

// Where the game is in time, with the calendar's pieces on it for a stylesheet, and a nudge at curfew.
</script>

<template>
  <template v-if="view.plugins.calendar">
    <p class="clock" :data-day="view.plugins.calendar.day" :data-weekday="view.plugins.calendar.weekday" :data-period="view.plugins.calendar.period">
      {{ view.plugins.calendar.label }}
    </p>
    <!-- The last period of the day, with the curfew binding: time for bed. -->
    <p v-if="view.plugins.calendar.curfew" class="curfew">It’s late. Time for bed.</p>
  </template>
</template>
