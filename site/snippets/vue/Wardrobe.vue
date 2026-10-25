<script setup lang="ts">
import { runner, view } from './runner.ts'

// What you have on, slot by slot, with a button to take each thing off, and what else you could wear.
</script>

<template>
  <template v-if="view.plugins.wardrobe">
    <div v-for="slot in view.plugins.wardrobe.slots" :key="slot.id" class="slot">
      {{ slot.label }}: {{ slot.name ?? 'nothing' }}
      <button v-if="slot.entity" @click="runner.apply({ 'wardrobe/takeOff': { id: slot.id } })">Take off</button>
    </div>
    <button v-for="spare in view.plugins.wardrobe.spare" :key="spare.entity" @click="runner.apply({ 'wardrobe/wear': { id: spare.entity } })">
      Wear the {{ spare.name }}
    </button>
  </template>
</template>
