---
"@ifloom/react": patch
"@ifloom/cli": patch
---

Added: splash cards, shown one after another as the game opens, before the gate and the title screen. With `pages` on, a game shows a "Powered by IFLoom" card unless it sets `pages.splash`. List your own cards (`art`, `title`, `text` or a `component`, each with its `ms` and `transition`) in `splash.cards`, with `poweredByIFLoom()` among them where it should go, or set `splash: false` to show none. A click, Enter or Space skips a card, and Escape skips them all unless `skippable` is `false`.
