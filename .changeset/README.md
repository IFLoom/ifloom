# Changesets

Every change a game maker would notice adds a changeset: a small file saying which packages it changes, how much,
and what to tell people. Make one with:

```sh
npm run changeset
```

It asks which packages changed and whether each is a patch, a minor or a major. Before 1.0, a minor is a breaking
change and a patch everything else, so a new option is a patch and a renamed one a minor. Then write the summary:

- Start it with `Added:`, `Changed:`, `Removed:` or `Fixed:`, which files it under that heading in the root
  `CHANGELOG.md`, the changelog on the docs site.
- Write it for someone making a game, as the changelog reads: what they can do now, or what they have to change.

```md
---
"@ifloom/plugin-jobs": patch
---

Added: a shift that pays raises a notice, `Paid 12 coins at Weekend help`.
```

A change to the docs, the examples or the repository's own tooling needs none. `@ifloom/cli`, `create-ifloom` and
`ifloom` always release together, so a changeset for one releases all three.

When the changes are merged, a bot keeps a "Version packages" pull request open with the coming versions and
changelogs. Merging it publishes them. AGENTS.md, under Releasing, says what happens in between.
