import { defineConfig } from 'tsdown'

// The package as it's published: ES modules, their types and source maps in dist/.
// `npm run build` makes it, and `npm publish` runs that first. Two entries, the
// plugin and its React UI (the `/react` subpath), with dist/ mirroring src/.
export default defineConfig({
  entry: ['src/index.ts', 'src/react/index.tsx'],
  unbundle: true,
  format: 'esm',
  platform: 'neutral',
  fixedExtension: false,
  dts: true,
  sourcemap: true,
})
