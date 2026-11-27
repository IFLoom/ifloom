---
"@ifloom/engine": minor
"@ifloom/plugin-shop": patch
"@ifloom/plugin-jobs": patch
"@ifloom/plugin-messages": patch
"@ifloom/plugin-feed": patch
"@ifloom/plugin-devices": patch
"@ifloom/plugin-inventory": patch
"@ifloom/plugin-wardrobe": patch
"@ifloom/plugin-debug": patch
"@ifloom/cli": patch
---

Removed: `PartnerQueries` from `@ifloom/engine/plugin`, so the engine no longer names any plugin. A plugin of your own that asks a first-party plugin's query without importing it gives the answer's type, as in `query<{ day: number }>('calendar/now')`. A game that imports the calendar, places or the cast still reads their queries typed.
