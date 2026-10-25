<script setup lang="ts">
import { ref } from 'vue'
import type { InputView } from '@ifloom/engine'
import { runner } from './runner.ts'

// A value the game asks for, such as the player's name. What they enter goes back as an `input` command.
const props = defineProps<{ input: InputView }>()
const value = ref(props.input.value === null ? '' : String(props.input.value))

function submit() {
  runner.apply({ type: 'input', id: props.input.id, to: props.input.type === 'number' ? Number(value.value) : value.value })
}
</script>

<template>
  <div v-if="input.type === 'choice'" class="inputs" role="group" :aria-label="input.label">
    <button v-for="option in input.options" :key="String(option.value)" @click="runner.apply({ type: 'input', id: input.id, to: option.value })">
      {{ option.label }}
    </button>
  </div>
  <form v-else @submit.prevent="submit">
    <label>
      {{ input.label }}
      <input
        v-model="value"
        :type="input.type === 'number' ? 'number' : 'text'"
        :maxlength="input.maxLength ?? undefined"
        :min="input.min ?? undefined"
        :max="input.max ?? undefined"
      />
    </label>
    <button type="submit">OK</button>
  </form>
</template>
