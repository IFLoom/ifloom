<script setup lang="ts">
import { nextSlot } from '@ifloom/browser'
import { runner, snapshot, view } from './runner.ts'

// A Save button, greyed out while the game refuses saving, and a row for each save with Load and Delete.
// The snapshot lists the saves, and the runner hands a new one after every save and delete.
// Each save in a slot of its own, '1', '2', ..., named from view.when, such as "Day 2 · Tuesday morning · The Corner Café".
const save = () => runner.save(nextSlot(snapshot.value.saves))
</script>

<template>
  <button v-if="view.saving.visible" :disabled="!view.saving.allowed" :title="view.saving.reason ?? undefined" @click="save">Save</button>
  <ul class="slots">
    <li v-for="entry in snapshot.saves" :key="entry.slot">
      <!-- A save that can't be read says why, and can only be deleted. -->
      <template v-if="'broken' in entry">{{ entry.broken }}</template>
      <template v-else>
        {{ entry.name }}
        <button @click="runner.load(entry.slot)">Load</button>
      </template>
      <button @click="runner.saves?.remove(entry.slot)">Delete</button>
    </li>
  </ul>
</template>
