<script setup lang="ts">
import { computed } from 'vue'
import type { QuestEntry } from '@ifloom/plugin-quests'
import { runner, view } from './runner.ts'

// The quest log: the active quests, the pinned one first, each with its hint and how far along it is, then the finished ones.
const quests = computed(() => view.value.plugins.quests)
// Pin a quest, so it comes first; pressing it again unpins.
const pin = (quest: QuestEntry) => runner.apply({ 'quests/track': quest.tracked ? {} : { id: quest.id } })
</script>

<template>
  <template v-if="quests">
    <section v-for="quest in quests.active" :key="quest.id" class="quest" :data-updated="quest.updated ? '' : undefined">
      <h3>{{ quest.name }} ({{ quest.stage }} of {{ quest.stages }})</h3>
      <p>{{ quest.hint }}</p>
      <button @click="pin(quest)">{{ quest.tracked ? 'Unpin' : 'Pin' }}</button>
    </section>
    <p v-if="quests.done.length" class="done">Done: {{ quests.done.map((quest) => quest.name).join(', ') }}</p>
    <!-- Looking at the log clears the "updated" marks. -->
    <button v-if="quests.updates" @click="runner.apply({ 'quests/seen': {} })">Mark all read</button>
  </template>
</template>
