# Decision records

Decisions about IFLoom's design that a future review shouldn't re-open without a new reason. Each record says what the problem was, what was decided and why. They're for contributors and agents, so the docs site leaves this folder out.

| No. | Decision | Status |
|---|---|---|
| [0001](0001-one-content-checker.md) | One content checker, no separate `validatePack` | Implemented |
| [0002](0002-settings-are-developer-declared.md) | Settings are declared by the game, with none built in | Accepted |
| [0003](0003-plugins-cooperate-by-name.md) | Plugins cooperate by name and never require each other | Accepted |
| [0004](0004-audio-and-media-are-data.md) | Audio and media are data in the engine, played by the UI | Accepted |
| [0005](0005-random-events-are-storylets.md) | Random events are storylets | Accepted |
| [0006](0006-one-render-per-state.md) | One render per state: `screen`, and no render work in the reducer | Implemented |
| [0007](0007-core-features-register.md) | Core features are modules that register, not plugins | Step 1 implemented |

To add one, copy the shape of an existing record: a title, Status, Context, Decision and Why. Number it one past the last.
