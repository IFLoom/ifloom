<script lang="ts">
  import type { MinigameView } from '@ifloom/engine'
  import { runner } from './runner.ts'

  // The minigame being played: a bar counting down its timer, and a button for each input that does something now.
  let { minigame }: { minigame: MinigameView } = $props()
</script>

<section class="minigame" data-state={minigame.state}>
  {#if minigame.timeLeft !== null && minigame.timeTotal}
    <div class="timer" role="progressbar" aria-label="Time left">
      <span style:transform={`scaleX(${minigame.timeLeft / minigame.timeTotal})`}></span>
    </div>
  {/if}
  <div class="choices">
    {#each minigame.inputs as input (input)}
      <button onclick={() => runner.apply({ type: 'minigame', input })}>{input}</button>
    {/each}
  </div>
</section>
