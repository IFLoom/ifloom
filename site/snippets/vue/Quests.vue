<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// The quest log: the active quests, the tracked one first, each with its hint and how far along it is, then the finished ones.
const quests = computed(() => view.value.plugins.quests)
</script>

<template>
  <template v-if="quests">
    <section v-for="quest in quests.active" :key="quest.id" class="quest" :data-updated="quest.updated ? '' : undefined">
      <h3>{{ quest.name }} ({{ quest.stage }} of {{ quest.stages }})</h3>
      <p>{{ quest.hint }}</p>
      <!-- Track it, so it comes first; the same button says Untrack once it's tracked. -->
      <button v-if="quest.track" @click="runner.apply(quest.track.command)">{{ quest.track.label }}</button>
    </section>
    <p v-if="quests.done.length" class="done">Done: {{ quests.done.map((quest) => quest.name).join(', ') }}</p>
    <!-- Mark all seen, while there is news: it clears the "updated" marks. -->
    <button v-if="quests.seen" @click="runner.apply(quests.seen.command)">{{ quests.seen.label }}</button>
  </template>
</template>
