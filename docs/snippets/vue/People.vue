<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// Who's here, each with their face and their Talk button, then everyone you've met.
const cast = computed(() => view.value.plugins.cast)
const met = computed(() => cast.value?.people.filter((person) => person.met) ?? [])
</script>

<template>
  <div v-for="person in cast?.present" :key="person.ref" class="person" :data-person="person.ref">
    <img v-if="person.portrait" :src="person.portrait" alt="" />
    <strong>{{ person.name }}</strong>
    <span v-if="person.description">{{ person.description }}</span>
    <button v-for="talk in person.actions" :key="talk.id" :disabled="Boolean(talk.disabled)" :title="talk.disabled" @click="runner.apply(talk.command)">
      {{ talk.label }}
    </button>
  </div>
  <template v-if="met.length">
    <h3>People you know</h3>
    <ul>
      <li v-for="person in met" :key="person.ref">{{ person.fullName }}<template v-if="person.here"> (here)</template></li>
    </ul>
  </template>
</template>
