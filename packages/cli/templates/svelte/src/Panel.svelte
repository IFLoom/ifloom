<script lang="ts">
  import type { OpenPanel } from '@ifloom/engine'
  import { runner } from './runner.ts'

  // The panel content opened (`{ kind: 'panel', panel, with }`) over the story: a shop's counter, a job board.
  // Draw each one your game opens by its name, from what it was opened with; closing it sends `closePanel`.
  let { panel }: { panel: OpenPanel } = $props()
</script>

<section class="panel" role="dialog" aria-modal="true" aria-label={panel.panel} data-panel={panel.panel}>
  <div>
    <h2>{panel.panel}</h2>
    <pre>{JSON.stringify(panel.with, null, 2)}</pre>
    <button onclick={() => runner.apply({ type: 'closePanel' })}>Close</button>
  </div>
</section>
