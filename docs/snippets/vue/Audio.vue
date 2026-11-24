<script setup lang="ts">
import { computed } from 'vue'
import { audioSrc } from '@ifloom/engine'
import { player, runner, view } from './runner.ts'

// The vue template's runner.ts starts the player once, beside the runner: `export const player = startAudio(runner)`.
// A Play again button for each spoken line in the scene that has a voice.
const voices = computed(() => view.value.scene.beats.flatMap((beat) => (beat.type === 'say' && beat.voice ? [beat.voice] : [])))

function replay(voice: string) {
  // The voice names a track in the game's audio.tracks: a file, or a playlist, which has no one file to play.
  const track = runner.game.audio?.tracks[voice]
  if (track && 'src' in track) player.play(audioSrc(track.src), 'voice', track.volume ?? 1)
}
</script>

<template>
  <button v-for="(voice, at) in voices" :key="at" @click="replay(voice)">Play again</button>
</template>
