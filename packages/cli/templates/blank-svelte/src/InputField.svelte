<script lang="ts">
  import type { InputView } from '@ifloom/engine'
  import { runner } from './runner.ts'

  // A value the game asks for, such as the player's name. What they enter goes back as an `input` command.
  let { input }: { input: InputView } = $props()
  // svelte-ignore state_referenced_locally
  let value = $state(input.value === null ? '' : String(input.value))

  function submit(event: SubmitEvent) {
    event.preventDefault()
    runner.apply({ type: 'input', id: input.id, value: input.kind === 'number' ? Number(value) : value })
  }
</script>

{#if input.kind === 'choice'}
  <div class="inputs" role="group" aria-label={input.label}>
    {#each input.options as option (option.value)}
      <button onclick={() => runner.apply({ type: 'input', id: input.id, value: option.value })}>{option.label}</button>
    {/each}
  </div>
{:else}
  <form onsubmit={submit}>
    <label>
      {input.label}
      <input
        bind:value
        type={input.kind === 'number' ? 'number' : 'text'}
        maxlength={input.maxLength ?? undefined}
        min={input.min ?? undefined}
        max={input.max ?? undefined}
      />
    </label>
    <button type="submit">OK</button>
  </form>
{/if}
