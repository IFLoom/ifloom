import { svelte } from '@sveltejs/vite-plugin-svelte'
import { ifloom } from '@ifloom/cli/vite'

// The preset adds React and Tailwind only for a game that uses them, so Svelte's plugin is the only one.
export default ifloom({ vite: { plugins: [svelte()] } })
