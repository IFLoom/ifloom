<script lang="ts">
  import { runner, view } from './runner.ts'
  import Beat from './Beat.svelte'
  import InputField from './InputField.svelte'
  import Minigame from './Minigame.svelte'

  // The page, in three parts: the side column, the story, and the bottom of the
  // story with the buttons for where you are. Move, add or remove anything; a
  // section is a <details>, so it folds without any code.
</script>

<div class="page">
  <aside class="sidebar">
    <h1>{$view.title}</h1>
    <!-- Where the game is in time, if a plugin says. -->
    {#if $view.when}<p class="clock">{$view.when}</p>{/if}
    {#if $view.stats.length}
      <details class="section" open>
        <summary>Stats</summary>
        <dl class="stats">
          {#each $view.stats as stat (stat.key)}<dt>{stat.label}</dt><dd>{stat.text}</dd>{/each}
        </dl>
      </details>
    {/if}
  </aside>

  <main class="story">
    <!-- While a minigame runs, the scene's title and beats are the minigame's. -->
    {#if $view.scene.title}<h2>{$view.scene.title}</h2>{/if}
    <div class="prose">
      {#each $view.scene.beats as beat, at (at)}<Beat {beat} />{/each}
    </div>
    {#if $view.minigame}<Minigame minigame={$view.minigame} />{/if}

    <div class="inputs">
      {#each Object.values($view.inputs) as input (input.id)}<InputField {input} />{/each}
    </div>

    <div class="choices">
      {#each $view.scene.choices as choice, at (at)}
        <button disabled={Boolean(choice.disabled)} title={choice.disabled} onclick={() => runner.apply(choice.command)}>
          {choice.label}
        </button>
        <!-- Why it can't be pressed, such as "You need 4 coins." -->
        {#if choice.disabled}<p class="reason">{choice.disabled}</p>{/if}
      {/each}
    </div>

    <!-- The bottom of the story: the game's own buttons and its plugins', such as a place's exits and things to do. -->
    {#if $view.actions.length}
      <div class="bottom choices">
        {#each $view.actions as action, at (at)}
          <button disabled={Boolean(action.disabled)} title={action.disabled} onclick={() => runner.apply(action.command)}>
            {action.label}
          </button>
          {#if action.disabled}<p class="reason">{action.disabled}</p>{/if}
        {/each}
      </div>
    {/if}
  </main>
</div>
