<script setup lang="ts">
import { debug } from '@ifloom/plugin-debug'
import { runner, view } from './runner.ts'

// What a debugger wants on screen: the save's seed, the locks that are on, the triggers fired, and a few commands that ignore locks.
</script>

<template>
  <template v-if="view.plugins.debug">
    <p>Seed {{ view.plugins.debug.seed }}</p>
    <p v-for="(lock, at) in view.plugins.debug.locks" :key="at" class="lock">Locked: {{ lock.reason }} ({{ lock.deny.join(', ') }})</p>
    <p>Triggers fired: {{ Object.keys(view.plugins.debug.fired).join(', ') || 'none' }}</p>
    <button @click="runner.apply(debug.stat('coins', 100))">100 coins</button>
    <button @click="runner.apply(debug.scene())">Close the scene</button>
  </template>
</template>
