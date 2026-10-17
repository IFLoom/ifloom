<script setup lang="ts">
import { view } from './runner.ts'
import Layout from './Layout.vue'
import Panel from './Panel.vue'
</script>

<template>
  <!-- The page: the side column, the story and its bottom. See Layout.vue. -->
  <Layout />
  <!-- A panel content opened, such as a shop's counter, over everything else. -->
  <Panel v-if="view.panel" :panel="view.panel" />
</template>
