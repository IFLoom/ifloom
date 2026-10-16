import vue from '@vitejs/plugin-vue'
import { ifloom } from '@ifloom/cli/vite'

// The preset adds React and Tailwind only for a game that uses them, so Vue's plugin is the only one.
export default ifloom({ vite: { plugins: [vue()] } })
