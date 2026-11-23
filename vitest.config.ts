import vue from '@vitejs/plugin-vue'
import { defaultClientConditions, defaultServerConditions } from 'vite'
import { defineConfig } from 'vitest/config'

// The tests read the @ifloom packages' source through their `ifloom-source` export condition, never dist/ (ADR 0012).
const source = 'ifloom-source'

export default defineConfig({
  // The docs' Vue snippets (docs/snippets/vue/) are single-file components, which their tests mount.
  plugins: [vue()],
  resolve: { conditions: [source, ...defaultClientConditions] },
  ssr: { resolve: { conditions: [source, ...defaultServerConditions] } },
  test: {
    environment: 'node',
    fsModuleCache: true,
    include: ['packages/*/tests/**/*.test.{ts,tsx}', 'examples/*/tests/**/*.test.{ts,tsx}', 'docs/snippets/tests/**/*.test.{ts,tsx}'],
  },
})
