<script lang="ts">
  import type { OpenPanel } from '@ifloom/engine'
  import { runner } from './runner.ts'

  // The panel open over the story, `view.panel`: a shop's counter, a job board. A `panel` effect opens one, and so does a scene's `panel` while it's open.
  // Draw each one your game opens by its name, from what it was opened with. Closing it sends `closePanel`; a scene's own panel has no close button, since it stays while the scene is open.
  let { panel }: { panel: OpenPanel } = $props()

  // A modal <dialog>: the browser keeps focus inside it and the page behind it out of reach while it's open.
  let dialog: HTMLDialogElement
  $effect(() => {
    if (!dialog.open) dialog.showModal()
    return () => dialog.close()
  })

  // Escape closes it, as Close does. A scene's own panel stays.
  function cancel(event: Event) {
    event.preventDefault()
    if (!panel.scene) runner.apply({ type: 'closePanel' })
  }
</script>

<dialog bind:this={dialog} class="panel" aria-label={panel.panel} data-panel={panel.panel} oncancel={cancel}>
  <h2>{panel.panel}</h2>
  <pre>{JSON.stringify(panel.with, null, 2)}</pre>
  {#if !panel.scene}<button onclick={() => runner.apply({ type: 'closePanel' })}>Close</button>{/if}
</dialog>
