import { svelte } from '@sveltejs/vite-plugin-svelte'
import { ifloom } from '@ifloom/cli/vite'

// The preset knows no framework, so the game adds Svelte's plugin.
export default ifloom({ vite: { plugins: [svelte()] } })
