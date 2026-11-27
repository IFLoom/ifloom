---
"@ifloom/react": minor
---

Changed: the credits page renders the game's `credits` content in groups, with roles, descriptions, licences and pictures. `PagesOptions.credits` and the `Credit` type are removed: move each line into a group in your content's `credits`, such as `{ id: 'team', title: 'Team', credits: [{ name: 'Written by you' }] }`.
