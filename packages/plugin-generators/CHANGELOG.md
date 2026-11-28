# @ifloom/plugin-generators

## 0.2.0

### Minor Changes

- [#21](https://github.com/IFLoom/ifloom/pull/21) [`826af8c`](https://github.com/IFLoom/ifloom/commit/826af8c012a8a27939b8ffd1bdf2f454494f5308) Thanks [@ianleckey](https://github.com/ianleckey)! - Changed: holding left the engine (ADR 0016). A devices section's `things` is `{ of, where? }`, `where` a condition with `'$'` as each thing, such as `{ owned: '$' }`. A generators template runs `effects` after it creates, such as `[{ receive: '$' }]`, in place of `at`. Debug's `held` sets a thing's count through `receive` and `release`, and shows only in a game with a plugin that keeps things.

### Patch Changes

- [#19](https://github.com/IFLoom/ifloom/pull/19) [`7d00d9f`](https://github.com/IFLoom/ifloom/commit/7d00d9f0a8a4c4931aa40fbde0bd2d1b5ade0a13) Thanks [@ianleckey](https://github.com/ianleckey)! - Removed: every upgrade step for saves, packs and command logs from before this release. `SAVE_VERSION` and `SCHEMA` start again at 1, and each first-party plugin's state, content and command versions are 1 with no migrations. A save, pack or log from an earlier release is refused instead of carried forward. The machinery stays: the engine's step tables, a plugin's `migrations`, `contentMigrations` and `commandMigrations`, and the game's own `rules.migrations` work as before. `ContentTools.effects` and `PackContext`'s `entities` and `you`, which only the removed steps used, are gone, and a pack that records no version for a plugin is read as written for the plugin's current version.

- [#17](https://github.com/IFLoom/ifloom/pull/17) [`69f8b2d`](https://github.com/IFLoom/ifloom/commit/69f8b2d1b9b013df0d3363e78b2a3a8e04d78fb5) Thanks [@ianleckey](https://github.com/ianleckey)! - Fixed: every library package declares `sideEffects` (`false`, and only its CSS for `@ifloom/react`), so a bundler drops the modules a game never uses. Importing `@ifloom/react/styles.css` and the themes is kept.
- Updated dependencies [[`e54da5e`](https://github.com/IFLoom/ifloom/commit/e54da5ec92e8a25be26633eb7fb7e1a1b7f46c67), [`32e8cba`](https://github.com/IFLoom/ifloom/commit/32e8cba62ecf34b57a17198ae5c35a26604d7ec9), [`826af8c`](https://github.com/IFLoom/ifloom/commit/826af8c012a8a27939b8ffd1bdf2f454494f5308), [`91fafc8`](https://github.com/IFLoom/ifloom/commit/91fafc8ec46e65c795bc90a449cd29cbd1e46429), [`826af8c`](https://github.com/IFLoom/ifloom/commit/826af8c012a8a27939b8ffd1bdf2f454494f5308), [`7d00d9f`](https://github.com/IFLoom/ifloom/commit/7d00d9f0a8a4c4931aa40fbde0bd2d1b5ade0a13), [`69f8b2d`](https://github.com/IFLoom/ifloom/commit/69f8b2d1b9b013df0d3363e78b2a3a8e04d78fb5), [`91fafc8`](https://github.com/IFLoom/ifloom/commit/91fafc8ec46e65c795bc90a449cd29cbd1e46429)]:
  - @ifloom/engine@0.2.0
