---
"@ifloom/engine": patch
"@ifloom/browser": patch
"@ifloom/audio": patch
"@ifloom/react": patch
"@ifloom/plugin-achievements": patch
"@ifloom/plugin-calendar": patch
"@ifloom/plugin-cast": patch
"@ifloom/plugin-debug": patch
"@ifloom/plugin-devices": patch
"@ifloom/plugin-feed": patch
"@ifloom/plugin-generators": patch
"@ifloom/plugin-inventory": patch
"@ifloom/plugin-jobs": patch
"@ifloom/plugin-messages": patch
"@ifloom/plugin-places": patch
"@ifloom/plugin-quests": patch
"@ifloom/plugin-shop": patch
"@ifloom/plugin-statuses": patch
"@ifloom/plugin-unlocks": patch
"@ifloom/plugin-wardrobe": patch
---

Fixed: every library package declares `sideEffects` (`false`, and only its CSS for `@ifloom/react`), so a bundler drops the modules a game never uses. Importing `@ifloom/react/styles.css` and the themes is kept.
