<script setup lang="ts">
import { ref } from 'vue'
import { runner, view } from './runner.ts'
import Beat from './Beat.vue'
import InputField from './InputField.vue'
import Minigame from './Minigame.vue'

// The page, in three parts: the side column, the story, and the bottom of the
// story with the buttons for where you are. Move, add or remove anything; a
// section is a <details>, so it folds without any code.

// One save slot, and what happened the last time it was used.
const said = ref('')
async function save() {
  const saved = await runner.save('quick')
  said.value = saved.ok ? 'Saved.' : saved.reason
}
async function load() {
  const loaded = await runner.load('quick')
  said.value = loaded.ok ? 'Loaded.' : loaded.reason
}
</script>

<template>
  <div class="page">
    <aside class="sidebar">
      <h1>{{ view.title }}</h1>
      <!-- Where the game is in time, if a plugin says. -->
      <p v-if="view.when" class="clock">{{ view.when }}</p>
      <details v-if="view.stats.length" class="section" open>
        <summary>Stats</summary>
        <dl class="stats">
          <template v-for="stat in view.stats" :key="stat.key">
            <dt>{{ stat.label }}</dt>
            <dd>{{ stat.text }}</dd>
          </template>
        </dl>
      </details>
      <!-- Saving. While the game's `saveable` refuses it, Save is greyed out with why (`hide` leaves it off). -->
      <details class="section" open>
        <summary>Saves</summary>
        <div class="saves">
          <button v-if="view.saving.visible" :disabled="!view.saving.allowed" :title="view.saving.reason ?? undefined" @click="save">Save</button>
          <button @click="load">Load</button>
        </div>
        <p v-if="view.saving.visible && view.saving.reason" class="reason">{{ view.saving.reason }}</p>
        <p v-if="said" class="said">{{ said }}</p>
      </details>
    </aside>

    <main class="story">
      <!-- While a minigame runs, the scene's title and beats are the minigame's. -->
      <h2 v-if="view.scene.title">{{ view.scene.title }}</h2>
      <div class="prose">
        <Beat v-for="(beat, at) in view.scene.beats" :key="at" :beat="beat" />
      </div>
      <Minigame v-if="view.minigame" :minigame="view.minigame" />

      <div class="inputs">
        <InputField v-for="input in Object.values(view.inputs)" :key="input.id" :input="input" />
      </div>

      <div class="choices">
        <template v-for="(choice, at) in view.scene.choices" :key="at">
          <button :disabled="Boolean(choice.disabled)" :title="choice.disabled" @click="runner.apply(choice.command)">
            {{ choice.label }}
          </button>
          <!-- Why it can't be pressed, such as "You need 4 coins." -->
          <p v-if="choice.disabled" class="reason">{{ choice.disabled }}</p>
        </template>
      </div>

      <!-- The bottom of the story: the game's own buttons and its plugins', such as a place's exits and things to do. -->
      <div v-if="view.actions.length" class="bottom choices">
        <template v-for="(action, at) in view.actions" :key="at">
          <button :disabled="Boolean(action.disabled)" :title="action.disabled" @click="runner.apply(action.command)">
            {{ action.label }}
          </button>
          <p v-if="action.disabled" class="reason">{{ action.disabled }}</p>
        </template>
      </div>
    </main>
  </div>
</template>
