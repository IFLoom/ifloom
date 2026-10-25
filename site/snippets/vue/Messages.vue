<script setup lang="ts">
import { runner, view } from './runner.ts'

// Each channel's threads, with their messages and the replies on offer, and a button that marks a thread read.
</script>

<template>
  <template v-for="channel in view.plugins.messages?.channels" :key="channel.id">
    <h3>
      {{ channel.name }}<template v-if="channel.unread"> ({{ channel.unread }})</template>
    </h3>
    <section v-for="thread in channel.threads" :key="thread.id" class="thread">
      <h4>{{ thread.name }}</h4>
      <div v-for="message in thread.messages" :key="message.key" class="message" :data-unread="message.read ? undefined : ''">
        <strong>{{ message.name }}</strong>
        <p>{{ message.text }}</p>
        <!-- A reply is a button like any other; once sent, it's the words of the reply. -->
        <p v-if="message.replied" class="replied">{{ message.replied }}</p>
        <template v-else>
          <button
            v-for="reply in message.replies"
            :key="reply.id"
            :disabled="Boolean(reply.disabled)"
            :title="reply.disabled"
            @click="runner.apply(reply.command)"
          >
            {{ reply.label }}
          </button>
        </template>
      </div>
      <button v-if="thread.unread" @click="runner.apply({ 'messages/read': { id: thread.id } })">Mark read</button>
    </section>
  </template>
</template>
