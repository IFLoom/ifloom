<script lang="ts">
  import type { SceneBeat } from '@ifloom/engine'
  import Line from './Line.svelte'

  // One paragraph of a scene: narration, a spoken line, a picture, a clip, a pick made earlier. A sound beat is heard, not drawn.
  let { beat }: { beat: SceneBeat } = $props()
</script>

{#if beat.type === 'text'}
  <p><Line text={beat.text} spans={beat.spans} /></p>
{:else if beat.type === 'say'}
  <p class="beat-say" data-who={beat.who}>
    {#if beat.name}<span class="speaker-name">{beat.name}</span>{/if}
    <Line text={beat.text} spans={beat.spans} />
  </p>
{:else if beat.type === 'chose'}
  <p class="beat-chose">{beat.label}</p>
{:else if beat.type === 'image'}
  <img class="beat-image" src={beat.src} alt={beat.alt ?? ''} />
{:else if beat.type === 'video'}
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
{/if}
