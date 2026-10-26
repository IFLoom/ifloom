<script setup lang="ts">
import { runner, snapshot } from './runner.ts'

// What was shown, oldest first, each scene's choice after its words, and a button that steps back one command.
// The runner's backlog is on: browserRunner(game, { backlog: true }).
</script>

<template>
  <button :disabled="!snapshot.canUndo" @click="runner.undo()">Undo</button>
  <ol class="backlog">
    <li v-for="(entry, at) in snapshot.backlog" :key="at">
      <h3>{{ entry.title }}</h3>
      <template v-for="(beat, index) in entry.beats" :key="index">
        <p v-if="beat.type === 'text' || beat.type === 'say'">{{ beat.text }}</p>
      </template>
      <p v-if="entry.chose" class="chose">{{ entry.chose }}</p>
    </li>
  </ol>
</template>
