# {{title}}

An IFLoom game in a Next.js app, for a game you host on the web: on Vercel,
Netlify or any host that runs Next. `src/game.ts` puts the game together from
its content in `src/world/` (stats and the rest the whole game shares) and
`src/story/` (the scenes, one file per area), and `app/Game.tsx` draws it with
the React UI.

Next builds a website for a server to host. If you want a game players can
download and open from disk, as one `index.html`, start from another template instead
(`ifloom new my-game` gives you the React UI on the `ifloom` CLI), or see the
esbuild recipe in the docs.

## Scripts

| npm | pnpm | yarn | bun | What it does |
|---|---|---|---|---|
| `npm run dev` | `pnpm dev` | `yarn run dev` | `bun run dev` | Serves the app while you edit it. |
| `npm run build` | `pnpm build` | `yarn run build` | `bun run build` | Builds it for a web host. |
| `npm run start` | `pnpm start` | `yarn run start` | `bun run start` | Serves the build. |
| `npm run check` | `pnpm check` | `yarn run check` | `bun run check` | Checks the game's content. Prints "No problems." |
| `npm run playtest` | `pnpm playtest` | `yarn run playtest` | `bun run playtest` | Plays 5 turns with no one at the keyboard, into `playtest/run.txt`. |
| `npm run typecheck` | `pnpm typecheck` | `yarn run typecheck` | `bun run typecheck` | Type-checks the app and the game. |

`check` and `playtest` are the `ifloom` CLI. They load `src/game.ts`, the game
module, on their own, through the CLI's own Vite, so they work beside Next.
`app/Game.tsx` builds the game from the same module with `build()`.

## Docs

- Running a game in Next: https://ifloom.dev/docs/recipes/next
- The React UI: https://ifloom.dev/docs/react
- Everything else: https://ifloom.dev/docs
