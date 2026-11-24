#!/usr/bin/env node
// `npx ifloom`: runs the bin of @ifloom/cli, this package's one dependency.
// The CLI exports no bin, so find its folder from its main entry (dist/index.js,
// or src/index.ts inside the IFLoom checkout) and run the bin.js beside it.
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const entry = fileURLToPath(import.meta.resolve('@ifloom/cli'))
await import(pathToFileURL(join(dirname(dirname(entry)), 'bin.js')).href)
