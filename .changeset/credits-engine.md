---
"@ifloom/engine": patch
---

Added: `credits` in content, groups of the people and sources a game thanks (the team, patrons, photographs, models), each credit with a `name` and an optional `role`, `description`, `href`, `licence` and `art`. Groups merge by id, so a mod can credit itself, and the checker reports a credit with no name or a link that isn't `http(s):` or `mailto:`. `creditsOf(game)` lists the groups that have credits.
