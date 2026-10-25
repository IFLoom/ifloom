<script setup lang="ts">
import { runner, view } from './runner.ts'

// The notices not yet dismissed, newest first, each with a button that marks it seen, and a badge for the post.
</script>

<template>
  <span v-if="view.notices.byTag.post" class="badge">{{ view.notices.byTag.post }}</span>
  <div class="notices" role="status">
    <div v-for="notice in view.notices.unseen" :key="notice.id" class="notice" :data-tag="notice.tag ?? undefined">
      <strong>{{ notice.title }}</strong>
      <p v-if="notice.text">{{ notice.text }}</p>
      <button @click="runner.apply({ type: 'dismiss', id: notice.id })">Dismiss</button>
    </div>
  </div>
</template>
