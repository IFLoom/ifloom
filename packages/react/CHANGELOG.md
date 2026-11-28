# @ifloom/react

## 0.2.0

### Minor Changes

- [#14](https://github.com/IFLoom/ifloom/pull/14) [`e54da5e`](https://github.com/IFLoom/ifloom/commit/e54da5ec92e8a25be26633eb7fb7e1a1b7f46c67) Thanks [@ianleckey](https://github.com/ianleckey)! - Changed: the credits page renders the game's `credits` content in groups, with roles, descriptions, licences and pictures. `PagesOptions.credits` and the `Credit` type are removed: move each line into a group in your content's `credits`, such as `{ id: 'team', title: 'Team', credits: [{ name: 'Written by you' }] }`.

- [#21](https://github.com/IFLoom/ifloom/pull/21) [`826af8c`](https://github.com/IFLoom/ifloom/commit/826af8c012a8a27939b8ffd1bdf2f454494f5308) Thanks [@ianleckey](https://github.com/ianleckey)! - Removed: the core `Inventory` component, its panel, its `inventory` and `thing*` parts, its `inventory` and `heldCount` words and its `DefaultLayout` section. The inventory plugin's React UI draws what the player carries. The templates no longer draw the core list.

### Patch Changes

- [#17](https://github.com/IFLoom/ifloom/pull/17) [`69f8b2d`](https://github.com/IFLoom/ifloom/commit/69f8b2d1b9b013df0d3363e78b2a3a8e04d78fb5) Thanks [@ianleckey](https://github.com/ianleckey)! - Fixed: every library package declares `sideEffects` (`false`, and only its CSS for `@ifloom/react`), so a bundler drops the modules a game never uses. Importing `@ifloom/react/styles.css` and the themes is kept.

- [#15](https://github.com/IFLoom/ifloom/pull/15) [`2bf9e78`](https://github.com/IFLoom/ifloom/commit/2bf9e7801ab43a3d072be092aa46f855bd78cde0) Thanks [@ianleckey](https://github.com/ianleckey)! - Added: splash cards, shown one after another as the game opens, before the gate and the title screen. With `pages` on, a game shows an animated "Powered by IFLoom" card, with a link to ifloom.dev, unless it sets `pages.splash`. List your own cards (`art`, `title`, `text` or a `component`, each with its `ms` and `transition`) in `splash.cards`, with `poweredByIFLoom()` among them where it should go, or set `splash: false` to show none. A click, Enter or Space skips a card, and Escape skips them all unless `skippable` is `false`.
- Updated dependencies [[`e54da5e`](https://github.com/IFLoom/ifloom/commit/e54da5ec92e8a25be26633eb7fb7e1a1b7f46c67), [`32e8cba`](https://github.com/IFLoom/ifloom/commit/32e8cba62ecf34b57a17198ae5c35a26604d7ec9), [`826af8c`](https://github.com/IFLoom/ifloom/commit/826af8c012a8a27939b8ffd1bdf2f454494f5308), [`91fafc8`](https://github.com/IFLoom/ifloom/commit/91fafc8ec46e65c795bc90a449cd29cbd1e46429), [`826af8c`](https://github.com/IFLoom/ifloom/commit/826af8c012a8a27939b8ffd1bdf2f454494f5308), [`7d00d9f`](https://github.com/IFLoom/ifloom/commit/7d00d9f0a8a4c4931aa40fbde0bd2d1b5ade0a13), [`69f8b2d`](https://github.com/IFLoom/ifloom/commit/69f8b2d1b9b013df0d3363e78b2a3a8e04d78fb5), [`91fafc8`](https://github.com/IFLoom/ifloom/commit/91fafc8ec46e65c795bc90a449cd29cbd1e46429)]:
  - @ifloom/engine@0.2.0
  - @ifloom/audio@0.2.0
  - @ifloom/browser@0.2.0
