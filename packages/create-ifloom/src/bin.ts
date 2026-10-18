#!/usr/bin/env node
/**
 * create-ifloom — a new IFLoom game, for `npm create ifloom`:
 *
 *   npm create ifloom@latest my-game
 *   npm create ifloom@latest my-game -- --template vue
 *   pnpm create ifloom my-game --theme paper
 *
 * Makes the game in ./my-game and prints what to run next. See create.ts.
 */
import { create } from './create.ts'

process.exitCode = create(process.argv.slice(2), {
  cwd: process.cwd(),
  userAgent: process.env.npm_config_user_agent,
  log: (line) => console.log(line),
  error: (line) => console.error(line),
})
