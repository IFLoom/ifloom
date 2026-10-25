<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// Where you are: the place's name and picture, the ways out, and what lies here to pick up.
const places = computed(() => view.value.plugins.places)
</script>

<template>
  <template v-if="places?.location">
    <h3>{{ places.location.name }}</h3>
    <img v-if="places.location.image" :src="places.location.image" alt="" />
    <!-- Each exit is a button like any other, greyed out with why it can't be taken. -->
    <nav class="exits">
      <button v-for="exit in places.exits" :key="exit.id" :disabled="Boolean(exit.disabled)" :title="exit.disabled" @click="runner.apply(exit.command)">
        {{ exit.label }}
      </button>
    </nav>
    <div v-for="thing in places.things" :key="thing.ref" class="lying">
      {{ thing.name }}<template v-if="thing.count > 1"> ×{{ thing.count }}</template>
      <button :disabled="Boolean(thing.pickUp.disabled)" @click="runner.apply(thing.pickUp.command)">{{ thing.pickUp.label }}</button>
    </div>
  </template>
</template>
