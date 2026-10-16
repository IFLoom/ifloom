<script setup lang="ts">
// The version switcher in the nav. The config passes in the snapshots it found
// in docs/versions/ and the name of the docs at the root.
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'
import VPFlyout from 'vitepress/dist/client/theme-default/components/VPFlyout.vue'
import VPMenuLink from 'vitepress/dist/client/theme-default/components/VPMenuLink.vue'
import VPNavScreenMenuGroup from 'vitepress/dist/client/theme-default/components/VPNavScreenMenuGroup.vue'

const props = defineProps<{
  versions: string[]
  latest: string
  screenMenu?: boolean
}>()

const { site } = useData()
const route = useRoute()

const current = computed(() => {
  // The route includes the base (/ifloom/), so strip it first.
  const path = route.path.slice(site.value.base.length - 1)
  const found = props.versions.find((v) => path.startsWith(`/${v}/`))
  return found ?? props.latest
})

// Newest release first, after the latest docs.
const items = computed(() => [
  { text: props.latest, link: '/guide/introduction' },
  ...[...props.versions]
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
    .map((v) => ({ text: v, link: `/${v}/guide/introduction` })),
])
</script>

<template>
  <VPNavScreenMenuGroup v-if="screenMenu" :text="`Version: ${current}`" :items="items" />
  <VPFlyout v-else class="VersionSwitcher" icon="vpi-versioning" :button="current" label="Switch version">
    <VPMenuLink v-for="item in items" :key="item.link" :item="item" />
  </VPFlyout>
</template>

<style>
.vpi-versioning {
  --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='6' cy='6' r='2'/%3E%3Ccircle cx='18' cy='6' r='2'/%3E%3Ccircle cx='6' cy='18' r='2'/%3E%3Cpath d='M6 8v8M18 8c0 4-6 4-10 8'/%3E%3C/svg%3E");
}
</style>

<style scoped>
.VersionSwitcher {
  display: flex;
  align-items: center;
}

.VersionSwitcher :deep(.option-icon) {
  margin-right: 4px;
}
</style>
