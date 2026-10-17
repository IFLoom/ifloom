<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'
import Beat from './Beat.vue'
import InputField from './InputField.vue'
import Minigame from './Minigame.vue'
import Panel from './Panel.vue'

// A scene's choices, or the game's own buttons when no scene is open.
const choices = computed(() => [...view.value.scene.choices, ...view.value.actions])
</script>

<template>
  <h1>{{ view.title }}</h1>
  <!-- While a minigame runs, the scene's title and beats are the minigame's. -->
  <h2 v-if="view.scene.title">{{ view.scene.title }}</h2>
  <Beat v-for="(beat, at) in view.scene.beats" :key="at" :beat="beat" />
  <Minigame v-if="view.minigame" :minigame="view.minigame" />

  <div class="inputs">
    <InputField v-for="input in Object.values(view.inputs)" :key="input.id" :input="input" />
  </div>

  <div class="choices">
    <template v-for="(choice, at) in choices" :key="at">
      <button :disabled="Boolean(choice.disabled)" :title="choice.disabled" @click="runner.apply(choice.command)">
        {{ choice.label }}
      </button>
      <!-- Why it can't be pressed, such as "You need 4 coins." -->
      <p v-if="choice.disabled" class="reason">{{ choice.disabled }}</p>
    </template>
  </div>

  <p class="stats">{{ view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · ') }}</p>

  <!-- A panel content opened, such as a shop's counter, over everything else. -->
  <Panel v-if="view.panel" :panel="view.panel" />
</template>
