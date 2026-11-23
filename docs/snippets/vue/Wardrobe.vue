<script setup lang="ts">
import { runner, view } from './runner.ts'

// What you have on, slot by slot, with a button to take each thing off, and what else you could wear.
// The buttons are ready-made, worded by the plugin's strings: Take off, Wear raincoat.
</script>

<template>
  <template v-if="view.plugins.wardrobe">
    <div v-for="slot in view.plugins.wardrobe.slots" :key="slot.id" class="slot">
      {{ slot.label }}: {{ slot.name ?? 'nothing' }}
      <button v-if="slot.takeOff" :disabled="Boolean(slot.takeOff.disabled)" @click="runner.apply(slot.takeOff.command)">{{ slot.takeOff.label }}</button>
    </div>
    <button
      v-for="spare in view.plugins.wardrobe.spare"
      :key="spare.entity"
      :disabled="Boolean(spare.wear.disabled)"
      :title="spare.wear.disabled"
      @click="runner.apply(spare.wear.command)"
    >
      {{ spare.wear.label }}
    </button>
  </template>
</template>
