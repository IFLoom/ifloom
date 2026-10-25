import { define } from '../../tsdown.base.ts'

// src/bin.ts keeps its `#!/usr/bin/env node`; bin.js beside package.json runs it.
export default define(['src/index.ts', 'src/game.ts', 'src/vite.ts', 'src/bin.ts'], { platform: 'node' })
