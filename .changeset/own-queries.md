---
"@ifloom/plugin-calendar": patch
"@ifloom/plugin-places": patch
---

Changed: the calendar declares `calendar/now`, `calendar/periods` and `calendar/bedtime`, and places declares `places/here`, `places/holder` and `places/known`, in their own query registries, so a game that imports one reads its queries typed.
