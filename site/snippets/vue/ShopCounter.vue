<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// The `shop` panel, shown from Panel.vue: shop.open('counter') opens it with { vendor: 'counter' }.
const vendor = computed(() => {
  const { panel, plugins } = view.value
  return panel?.panel === 'shop' ? plugins.shop?.vendors.find((one) => one.id === panel.with.vendor) : undefined
})
</script>

<template>
  <div v-if="vendor" class="shop">
    <h2>{{ vendor.name }}</h2>
    <p v-if="vendor.closed" class="reason">{{ vendor.closed }}</p>
    <div v-for="good in vendor.goods" :key="good.entity" class="good">
      <strong>{{ good.name }}</strong>
      <span v-if="good.buy.price?.stats" class="price">{{ good.buy.price.stats.map((stat) => stat.text).join(', ') }}</span>
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
