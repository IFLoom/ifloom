<script setup lang="ts">
import type { KvValue } from '@ifloom/engine'
import { runner, snapshot, view } from './runner.ts'

// A settings screen: every setting the game declares, with its value now. A change goes through runner.setSetting.
// snapshot.settings has both kinds: play settings from the state, ui settings from the profile.
const valueOf = (id: string, fallback: KvValue) => snapshot.value.settings[id] ?? fallback
const set = (id: string, to: KvValue) => runner.setSetting(id, to)
</script>

<template>
  <label v-for="setting in view.settings" :key="setting.id">
    {{ setting.label }}
    <input
      v-if="setting.type === 'toggle'"
      type="checkbox"
      :checked="valueOf(setting.id, setting.default) === true"
      @change="set(setting.id, ($event.target as HTMLInputElement).checked)"
    />
    <select
      v-else-if="setting.type === 'choice'"
      :value="valueOf(setting.id, setting.default)"
      @change="set(setting.id, ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="option in setting.options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    <input
      v-else
      type="range"
      :min="setting.min ?? 0"
      :max="setting.max ?? 100"
      :step="setting.step ?? 1"
      :value="valueOf(setting.id, setting.default)"
      @change="set(setting.id, Number(($event.target as HTMLInputElement).value))"
    />
  </label>
</template>
