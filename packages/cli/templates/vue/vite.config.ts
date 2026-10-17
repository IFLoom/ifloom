import vue from '@vitejs/plugin-vue'
import { ifloom } from '@ifloom/cli/vite'

// The preset knows no framework, so the game adds Vue's plugin.
export default ifloom({ vite: { plugins: [vue()] } })
