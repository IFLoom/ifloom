<script setup lang="ts">
import { runner, view } from './runner.ts'

// Each feed's posts, newest first, with their likes and comments, and a button that marks the feed seen.
</script>

<template>
  <template v-for="feed in view.plugins.feed?.feeds" :key="feed.id">
    <h3>
      {{ feed.name }}<template v-if="feed.unread"> ({{ feed.unread }} new)</template>
    </h3>
    <article v-for="post in feed.posts" :key="post.id" :class="['post', { mine: post.mine }]">
      <strong>{{ post.name }}</strong>
      <p>{{ post.text }}</p>
      <img v-if="post.image" :src="post.image" alt="" />
      <span class="likes">{{ post.likes }} likes</span>
      <p v-for="(comment, at) in post.comments" :key="at" class="comment">{{ comment.name }}: {{ comment.text }}</p>
    </article>
    <button v-if="feed.unread" @click="runner.apply({ 'feed/seen': { id: feed.id } })">Mark seen</button>
  </template>
</template>
