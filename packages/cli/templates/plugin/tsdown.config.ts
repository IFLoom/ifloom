import { defineConfig } from 'tsdown'

// The package as it's published: ES modules, their types and source maps in dist/.
// `npm run build` makes it, and `npm publish` runs that first.
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'neutral',
  fixedExtension: false,
  dts: true,
  sourcemap: true,
})
