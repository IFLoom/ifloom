<script setup lang="ts">
import { runner, view } from './runner.ts'

// The story: the scene's title, its beats and its choices. With no scene open it's the room, whose buttons are view.actions.
// The vue template's Beat.vue renders each beat with its spans; here they're written out.
</script>

<template>
  <h2 v-if="view.scene.title">{{ view.scene.title }}</h2>
  <div class="prose">
    <template v-for="(beat, at) in view.scene.beats" :key="at">
      <p v-if="beat.type === 'text'">{{ beat.text }}</p>
      <!-- Who says it over the words. A quote that answers the line before names no one. -->
      <p v-else-if="beat.type === 'say'" class="beat-say" :data-who="beat.who">
        <span v-if="beat.name" class="speaker-name">{{ beat.name }}</span>
        {{ beat.text }}
      </p>
      <!-- A pick made earlier in a flowing scene, where the decision was. -->
      <p v-else-if="beat.type === 'chose'" class="beat-chose">{{ beat.label }}</p>
      <img v-else-if="beat.type === 'image'" class="beat-image" :src="beat.src" :alt="beat.alt ?? ''" />
      <video
        v-else-if="beat.type === 'video'"
        class="beat-image"
        :src="beat.src"
        :autoplay="beat.autoplay"
        :loop="beat.loop"
        :muted="beat.muted"
        :controls="beat.controls"
      />
    </template>
  </div>
  <div class="choices">
    <template v-for="choice in view.scene.choices" :key="choice.id">
      <button :disabled="Boolean(choice.disabled)" :title="choice.disabled" @click="runner.apply(choice.command)">{{ choice.label }}</button>
      <!-- Why it can't be pressed, such as "You need 4 coins." -->
      <p v-if="choice.disabled" class="reason">{{ choice.disabled }}</p>
    </template>
  </div>
</template>
