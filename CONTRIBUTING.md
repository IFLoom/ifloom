# Contributing to IFLoom

Thanks for helping. IFLoom is an npm workspaces monorepo: the engine, its plugins, the UIs and the CLI are each a
package in `packages/`, and the examples in `examples/` play them.

## Set up

You need Node 22.18 or later and npm.

```sh
git clone https://github.com/IFLoom/ifloom.git
cd ifloom
npm install
npm test
```

The checkout runs each package's TypeScript source, so there's nothing to build first. [Run the examples from the
repository](https://ifloom.dev/docs/how-to/work-in-the-repository) shows how to play them, and how to try your change
in a game of your own.

## Make a change

[AGENTS.md](AGENTS.md) is the contributor guide: what each package is, the rules the engine keeps, how the packages
depend on each other, and the words the docs and the code use. Read it before a change to the engine or a plugin.

- **Docs.** Anything a package exports is documented in `docs/content/docs/`, in the same change.
- **Checks.** `scripts/verify.sh` runs what your change can break, from the files it touches. `npm run check` is the
  format, lint and typecheck.
- **A changeset.** A change a game maker would notice in a published package adds one, with `npm run changeset`
  ([.changeset/README.md](.changeset/README.md) says how to write it). CI fails a pull request that changes a package
  without one. The docs, the examples and the tooling need none.

## How a release happens

Packages are versioned on their own with [Changesets](https://github.com/changesets/changesets). Once your pull request
is merged, a bot keeps a "Version packages" pull request open with the coming versions and changelogs. A maintainer
merges it to publish, and only the packages that changed get a new version. AGENTS.md, under Releasing, has the
details.
