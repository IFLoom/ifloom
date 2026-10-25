<script setup lang="ts">
import type { RenderedChoice } from '@ifloom/engine'
import { runner, view } from './runner.ts'

// The room's buttons, while no scene is open: each with its price, greyed out with why it can't be pressed, or warned.
const cost = (action: RenderedChoice) => [...(action.price?.stats ?? []).map((stat) => stat.text), ...(action.price?.notes ?? [])].join(', ')
</script>

<template>
  <div class="bottom choices">
    <template v-for="action in view.actions" :key="action.id">
      <button :disabled="Boolean(action.disabled)" @click="runner.apply(action.command)">
        {{ action.label }}<template v-if="cost(action)"> ({{ cost(action) }})</template>
      </button>
      <!-- Why it can't be pressed, such as "You need 3 coins.", or a warning that it will be refused. -->
      <p v-if="action.disabled ?? action.warning" class="reason">{{ action.disabled ?? action.warning }}</p>
    </template>
  </div>
</template>
