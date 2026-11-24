<script setup lang="ts">
import { ref } from 'vue'
import type { InputView } from '@ifloom/engine'
import { runner, view } from './runner.ts'

// The inputs on offer now, such as the cat's name. What the player enters goes back as an `input` command.
// The vue template's InputField.vue renders one; here they're all in one component.
const typed = ref<Record<string, string>>({})
const refused = ref<Record<string, string>>({})

function submit(input: InputView) {
  const entered = typed.value[input.id] ?? (input.value === null ? '' : String(input.value))
  // A value that breaks the input's rules is refused with why, such as "Up to 16 letters."
  const sent = runner.apply({ type: 'input', id: input.id, to: input.type === 'number' ? Number(entered) : entered })
  refused.value = { ...refused.value, [input.id]: sent.ok ? '' : sent.reason }
}
</script>

<template>
  <div v-for="input in view.inputs" :key="input.id" class="input">
    <template v-if="input.type === 'choice'">
      <button v-for="option in input.options" :key="String(option.value)" @click="runner.apply({ type: 'input', id: input.id, to: option.value })">
        {{ option.label }}
      </button>
    </template>
    <form v-else @submit.prevent="submit(input)">
      <label>
        {{ input.label }}
        <input
          :value="typed[input.id] ?? input.value ?? ''"
          :type="input.type === 'number' ? 'number' : 'text'"
          :maxlength="input.maxLength ?? undefined"
          :min="input.min ?? undefined"
          :max="input.max ?? undefined"
          @input="typed = { ...typed, [input.id]: ($event.target as HTMLInputElement).value }"
        />
      </label>
      <button type="submit">OK</button>
      <p v-if="refused[input.id]" class="reason">{{ refused[input.id] }}</p>
    </form>
  </div>
</template>
