import type { NextConfig } from 'next'

const config: NextConfig = {
  // The @ifloom packages ship TypeScript source, so Next compiles them with the app.
  transpilePackages: ['@ifloom/engine', '@ifloom/react', '@ifloom/audio', '@ifloom/browser'],
}

export default config
