<script setup lang="ts">
import { ref } from 'vue'
import { enterCode } from '@ifloom/plugin-unlocks'
import { runner, snapshot, view } from './runner.ts'

// A code box while codes have started, with where the last code stands, and the unlocks with which the player has.
// Start codes once in runner.ts, beside startClock: startUnlocks(runner). It reports idle, checking, wrong or unlocked in the snapshot.
const code = ref('')
</script>

<template>
  <template v-if="view.plugins.unlocks?.total">
    <form v-if="snapshot.helpers.unlocks" @submit.prevent="enterCode(runner, code)">
      <input v-model="code" placeholder="Code" />
      <button :disabled="snapshot.helpers.unlocks.status === 'checking'">
        {{ snapshot.helpers.unlocks.status === 'checking' ? 'Checking…' : 'Unlock' }}
      </button>
      <p v-if="snapshot.helpers.unlocks.status === 'wrong'" class="reason">{{ snapshot.helpers.unlocks.reason }}</p>
      <p v-if="snapshot.helpers.unlocks.status === 'unlocked'">Unlocked: {{ snapshot.helpers.unlocks.entered?.name }}.</p>
    </form>
    <h3>Unlocked {{ view.plugins.unlocks.unlocked }} of {{ view.plugins.unlocks.total }}</h3>
    <ul class="unlocks">
      <li v-for="unlock in view.plugins.unlocks.unlocks" :key="unlock.id" :title="unlock.description">
        {{ unlock.name }}: {{ unlock.unlocked ? 'unlocked' : 'locked' }}
      </li>
    </ul>
  </template>
</template>
