<script lang="ts">
  import { view } from './runner.ts'
  import Layout from './Layout.svelte'
  import Panel from './Panel.svelte'
</script>

<!-- The page: the side column, the story and its bottom. See Layout.svelte. -->
<Layout />

<!-- A panel content opened, such as a shop's counter, over everything else. -->
{#if $view.panel}<Panel panel={$view.panel} />{/if}
