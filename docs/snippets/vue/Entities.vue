<script setup lang="ts">
import { view } from './runner.ts'

// Each listed kind with its entities and the stats the player can see on each.
// A kind's flags, such as { met: true }, become classes to split or style the list by.
const flagged = (flags: Record<string, boolean>) => Object.keys(flags).filter((flag) => flags[flag])
</script>

<template>
  <template v-for="kind in view.entities" :key="kind.id">
    <template v-if="kind.entries.length">
      <h3>{{ kind.plural }}</h3>
      <ul class="entities">
        <li v-for="entity in kind.entries" :key="entity.ref" :class="flagged(entity.flags)" :data-entity="entity.ref">
          {{ entity.name }}
          <span v-for="stat in entity.stats" :key="stat.key" class="stat">{{ stat.label }} {{ stat.text }}</span>
        </li>
      </ul>
    </template>
  </template>
</template>
