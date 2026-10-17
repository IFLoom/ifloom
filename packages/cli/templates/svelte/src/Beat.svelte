<script lang="ts">
  import type { SceneBeat } from '@ifloom/engine'
  import Line from './Line.svelte'

  // One paragraph of a scene: narration, a spoken line, a picture, a letter. A sound beat is heard, not drawn.
  let { beat }: { beat: SceneBeat } = $props()
</script>

{#if beat.kind === 'text'}
  <p><Line text={beat.text} spans={beat.spans} /></p>
{:else if beat.kind === 'mono'}
  <p class="beat-mono">{beat.text}</p>
{:else if beat.kind === 'say'}
  <p class="beat-say" data-who={beat.who}><Line text={beat.text} spans={beat.spans} /></p>
{:else if beat.kind === 'image'}
  <img class="beat-image" src={beat.src} alt={beat.alt ?? ''} />
{:else if beat.kind === 'video'}
  <video
    class="beat-image"
    src={beat.src}
    poster={beat.poster}
    autoplay={beat.autoplay}
    loop={beat.loop}
    muted={beat.muted}
    controls={beat.controls}
    playsinline
  ></video>
{:else if beat.kind === 'mail'}
  <div class="beat-prop">
    {#each beat.headers as line (line.key)}<p>{line.key}: {line.value}</p>{/each}
    <p>{beat.body}</p>
  </div>
{:else if beat.kind === 'prop'}
  <div class="beat-prop">{beat.text}</div>
{/if}
