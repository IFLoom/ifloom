<script setup lang="ts">
import type { Roll } from '@ifloom/engine'
import { view } from './runner.ts'

// The rolls the last command made, as they landed: `2d6: 4 + 5 + 1 = 10 (passed)`. The next command clears them.
const line = (roll: Roll) =>
  `${roll.dice}: ${roll.faces.join(' + ')}${roll.plus ? ` + ${roll.plus}` : ''} = ${roll.total}${roll.passed === undefined ? '' : roll.passed ? ' (passed)' : ' (failed)'}`
</script>

<template>
  <p v-for="(roll, at) in view.rolls" :key="at" class="roll" :data-roll="roll.key" :data-critical="roll.critical">{{ line(roll) }}</p>
</template>
