<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import type { SaveListing } from '@ifloom/engine'
import { nextSlot } from '@ifloom/browser'
import { runner, view } from './runner.ts'

// A Save button, greyed out while the game refuses saving, and a row for each save with Load and Delete.
const listed = ref<SaveListing[]>([])
const list = async () => {
  listed.value = (await runner.saves?.list()) ?? []
}
// Listed again whenever the view changes, as it does after a load.
watchEffect(() => {
  void view.value
  void list()
})

// Each save in a slot of its own, '1', '2', ..., named from view.when, such as "Day 2 · Tuesday morning · The Corner Café".
const save = () => runner.save(nextSlot(listed.value)).then(list)
const remove = (slot: string) => runner.saves?.remove(slot).then(list)
</script>

<template>
  <button v-if="view.saving.visible" :disabled="!view.saving.allowed" :title="view.saving.reason ?? undefined" @click="save">Save</button>
  <ul class="slots">
    <li v-for="entry in listed" :key="entry.slot">
      <!-- A save that can't be read says why, and can only be deleted. -->
      <template v-if="'broken' in entry">{{ entry.broken }}</template>
      <template v-else>
        {{ entry.name }}
        <button @click="runner.load(entry.slot)">Load</button>
      </template>
      <button @click="remove(entry.slot)">Delete</button>
    </li>
  </ul>
</template>
