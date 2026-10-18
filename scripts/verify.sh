#!/usr/bin/env bash
# The "done" routine for a change: the root checks, the three examples, and
# clean-up of what they leave behind. Stops at the first failure.
#
#   scripts/verify.sh            everything
#   scripts/verify.sh --no-docs  skip the docs build and its link check
#
# Run scripts/privacy-check.sh as well before pushing.
set -euo pipefail
cd "$(dirname "$0")/.."

docs=1
[[ "${1:-}" == "--no-docs" ]] && docs=0

step() { printf '\n== %s\n' "$*"; }

step "npm test"; npm test
# vp check: the format (npm run format fixes it) and lint, then tsc on every project; each cached.
step "npm run check"; npm run check

if (( docs )); then
  # The link check, then next build: cached tasks (site:links, site:build in vite.config.ts) that run again only when
  # something the site reads has changed.
  step "npm run docs:build"; npm run docs:build
fi

for example in novel cafe showcase; do
  dir="examples/$example"
  step "$dir: ifloom check, build, snapshot"
  (cd "$dir" && npx ifloom check && npx ifloom build && npx ifloom snapshot)
  # Only the showcase commits its snapshot. Elsewhere, snapshot writes a fresh one to throw away.
  if [[ -d "$dir/snapshots" ]] && [[ -z "$(git ls-files "$dir/snapshots")" ]]; then
    rm -rf "$dir/snapshots"
    echo "Removed $dir/snapshots (not tracked)."
  fi
done

step "clean-up"
for out in examples/*/dist-one; do
  [[ -d "$out" ]] && rm -rf "$out" && echo "Removed $out (build output, not in .gitignore)."
done
games=$(find games -mindepth 1 -maxdepth 1 -type d 2>/dev/null || true)
if [[ -n "$games" ]]; then
  echo "games/ has workspaces. Delete the ones you made for this change, then run npm install:"
  echo "$games" | sed 's/^/  /'
fi
git status --short

step "verified"
