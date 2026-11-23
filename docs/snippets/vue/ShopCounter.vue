<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// The `shop` panel, shown from Panel.vue: shop.open('counter') opens it with { vendor: 'counter' }.
// The vendor whose counter the open panel shows; null while it's shut.
const vendor = computed(() => view.value.plugins.shop?.panel)
</script>

<template>
  <div v-if="vendor" class="shop">
    <h2>{{ vendor.name }}</h2>
    <p v-if="vendor.closed" class="reason">{{ vendor.closed }}</p>
    <div v-for="good in vendor.goods" :key="good.entity" class="good">
      <strong>{{ good.name }}</strong>
      <span v-if="good.buy.price" class="price">{{ good.buy.price.text }}</span>
      <span v-if="good.stock !== null" class="stock">{{ good.stock }} left</span>
      <!-- Ready-made buttons, with today's price and why one can't be pressed. -->
      <button
        v-for="button in good.sell ? [good.buy, good.sell] : [good.buy]"
        :key="button.id"
        :disabled="Boolean(button.disabled)"
        :title="button.disabled"
        @click="runner.apply(button.command)"
      >
        {{ button.label }}
      </button>
    </div>
  </div>
</template>
