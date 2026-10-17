import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { ifloom } from '@ifloom/cli/vite'

// The React UI needs React's Vite plugin, and Tailwind for its stylesheet.
// `dedupe` keeps one React when @ifloom/react is linked from a checkout.
export default ifloom({ vite: { plugins: [react(), tailwindcss()], resolve: { dedupe: ['react', 'react-dom'] } } })
