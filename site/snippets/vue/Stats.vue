<script setup lang="ts">
import { view } from './runner.ts'

// The listed stats: each label and value, a bar from min to max, and how far to the next level.
</script>

<template>
  <dl class="stats">
    <template v-for="stat in view.stats" :key="stat.key">
      <dt>
        {{ stat.label }}<template v-if="stat.level"> (level {{ stat.level.level }})</template>
      </dt>
      <dd>
        {{ stat.text }}
        <meter :min="stat.min" :max="stat.max" :value="stat.value" />
        <!-- Towards the next level, from 0 to 1; there's no next one at the top. -->
        <progress v-if="stat.level?.next != null" :max="1" :value="stat.level.progress" />
      </dd>
    </template>
  </dl>
</template>
