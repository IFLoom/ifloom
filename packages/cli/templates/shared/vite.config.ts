import { ifloom } from '@ifloom/cli/vite'

// No framework: the preset builds the game into one HTML file. A framework's
// Vite plugin goes in `vite.plugins`: ifloom({ vite: { plugins: [vue()] } }).
export default ifloom()
