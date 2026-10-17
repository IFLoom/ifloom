<script lang="ts">
  import { runner, view } from './runner.ts'
  import Beat from './Beat.svelte'
  import InputField from './InputField.svelte'
  import Minigame from './Minigame.svelte'

  // A scene's choices, or the game's own buttons when no scene is open.
  const choices = $derived([...$view.scene.choices, ...$view.actions])
</script>

<h1>{$view.title}</h1>
<!-- While a minigame runs, the scene's title and beats are the minigame's. -->
{#if $view.scene.title}<h2>{$view.scene.title}</h2>{/if}
{#each $view.scene.beats as beat, at (at)}<Beat {beat} />{/each}
{#if $view.minigame}<Minigame minigame={$view.minigame} />{/if}

<div class="inputs">
  {#each Object.values($view.inputs) as input (input.id)}<InputField {input} />{/each}
</div>

<div class="choices">
  {#each choices as choice, at (at)}
    <button disabled={Boolean(choice.disabled)} title={choice.disabled} onclick={() => runner.apply(choice.command)}>
      {choice.label}
    </button>
    <!-- Why it can't be pressed, such as "You need 4 coins." -->
    {#if choice.disabled}<p class="reason">{choice.disabled}</p>{/if}
  {/each}
</div>

<p class="stats">{$view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · ')}</p>
