<script setup lang="ts">
import { view } from './runner.ts'

// The unlocks, with which the player has. Entering a code is enterCode, on this page under Entering a code.
</script>

<template>
  <template v-if="view.plugins.unlocks?.total">
    <h3>Unlocked {{ view.plugins.unlocks.unlocked }} of {{ view.plugins.unlocks.total }}</h3>
    <ul class="unlocks">
      <li v-for="unlock in view.plugins.unlocks.unlocks" :key="unlock.id" :title="unlock.description">
        {{ unlock.name }}: {{ unlock.unlocked ? 'unlocked' : 'locked' }}
      </li>
    </ul>
  </template>
</template>
