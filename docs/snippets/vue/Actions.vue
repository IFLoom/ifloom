<script setup lang="ts">
import { runner, view } from './runner.ts'

// The room's buttons, while no scene is open: each with its price in a line, such as "2 coins · until evening",
// greyed out with why it can't be pressed, or warned.
</script>

<template>
  <div class="bottom choices">
    <template v-for="action in view.actions" :key="action.id">
      <button :disabled="Boolean(action.disabled)" @click="runner.apply(action.command)">
        {{ action.label }}<template v-if="action.price"> ({{ action.price.text }})</template>
      </button>
      <!-- Why it can't be pressed, such as "You need 3 coins.", or a warning that it will be refused. -->
      <p v-if="action.disabled ?? action.warning" class="reason">{{ action.disabled ?? action.warning }}</p>
    </template>
  </div>
</template>
