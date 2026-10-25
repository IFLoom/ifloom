<script setup lang="ts">
import { runner, view } from './runner.ts'

// Each device: its open app, with a Home button, or else its home screen of apps, each with its badge.
// A `plugin` section is the messages' or the feed's, drawn as their pages show.
</script>

<template>
  <section v-for="device in view.plugins.devices?.devices" :key="device.id" class="device" :data-device="device.id">
    <h3>
      {{ device.name }}<template v-if="device.badge"> ({{ device.badge }})</template>
    </h3>
    <template v-if="device.open">
      <template v-for="(section, at) in device.open.sections" :key="at">
        <p v-if="section.type === 'prose'">{{ section.text }}</p>
        <div v-else-if="section.type === 'actions'">
          <button v-for="action in section.actions" :key="action.id" :disabled="Boolean(action.disabled)" @click="runner.apply(action.command)">
            {{ action.label }}
          </button>
        </div>
        <template v-else-if="section.type === 'list'">
          <div v-for="entry in section.entries" :key="entry.id" class="entry">
            <strong>{{ entry.title }}</strong>
            <p>{{ entry.text }}</p>
            <button v-for="action in entry.actions" :key="action.id" :disabled="Boolean(action.disabled)" @click="runner.apply(action.command)">
              {{ action.label }}
            </button>
          </div>
        </template>
      </template>
      <button @click="runner.apply({ 'devices/close': { id: device.id } })">Home</button>
    </template>
    <template v-else>
      <button v-for="app in device.apps" :key="app.id" :disabled="Boolean(app.disabled)" :title="app.disabled" @click="runner.apply(app.command)">
        {{ app.name }}<template v-if="app.badge"> ({{ app.badge }})</template>
      </button>
    </template>
  </section>
</template>
