<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import type { OpenPanel } from '@ifloom/engine'
import { runner } from './runner.ts'

// The panel open over the story, `view.panel`: a shop's counter, a job board. A `panel` effect opens one, and so does a scene's `panel` while it's open.
// Draw each one your game opens by its name, from what it was opened with. Closing it sends `closePanel`; a scene's own panel has no close button, since it stays while the scene is open.
const props = defineProps<{ panel: OpenPanel }>()

// A modal <dialog>: the browser keeps focus inside it and the page behind it out of reach while it's open.
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
onMounted(() => {
  if (dialog.value && !dialog.value.open) dialog.value.showModal()
})
onBeforeUnmount(() => dialog.value?.close())

// Escape closes it, as Close does. A scene's own panel stays.
function cancel(event: Event) {
  event.preventDefault()
  if (!props.panel.scene) runner.apply({ type: 'closePanel' })
}
</script>

<template>
  <dialog ref="dialog" class="panel" :aria-label="panel.panel" :data-panel="panel.panel" @cancel="cancel">
    <h2>{{ panel.panel }}</h2>
    <pre>{{ JSON.stringify(panel.with, null, 2) }}</pre>
    <button v-if="!panel.scene" @click="runner.apply({ type: 'closePanel' })">Close</button>
  </dialog>
</template>
