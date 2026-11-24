#!/usr/bin/env bash
# The "done" routine for a change. It checks what the change can break and no more, by looking at the uncommitted
# files (staged, unstaged and untracked) and picking a tier:
#
#   docs      only docs pages, the changelog or other Markdown at the root: the contract tests that read the docs,
#             and the docs' link and include check
#   snippets  the docs' code too (docs/snippets/, docs/lib/): the docs tier, plus the snippets' typecheck and tests
#   full      anything else: every test, the format, lint and typecheck, the three examples' check, build and
#             snapshot, and the website's full check when the docs or the changelog changed too
#
# With nothing uncommitted, it runs the full routine. Stops at the first failure.
#
#   scripts/verify.sh            the tier the changes need
#   scripts/verify.sh --full     everything, whatever changed (CI)
#   scripts/verify.sh --docs     the docs tier, whatever changed
#   scripts/verify.sh --site     also the website's full check (lint, typecheck, links, next build), in any tier
#   scripts/verify.sh --no-docs  never the website's full check
#   scripts/verify.sh --dry-run  say which tier and steps it would run, and run nothing
#
# Run scripts/privacy-check.sh as well before pushing.
set -euo pipefail
cd "$(dirname "$0")/.."

forced=''
site=auto
dry=0
for arg in "$@"; do
  case "$arg" in
    --full) forced=full ;;
    --docs) forced=docs ;;
    --site) site=yes ;;
    --no-docs) site=no ;;
    --dry-run) dry=1 ;;
    *) echo "Unknown option: $arg (see the top of scripts/verify.sh)" >&2; exit 2 ;;
  esac
done

step() { printf '\n== %s\n' "$*"; }

# The tier one path needs.
tier_of() {
  case "$1" in
    docs/content/* | CHANGELOG.md) echo docs ;;
    docs/snippets/* | docs/lib/*) echo snippets ;;
    */*) echo full ;;
    *.md) echo docs ;;
    *) echo full ;;
  esac
}
rank() { case "$1" in docs) echo 1 ;; snippets) echo 2 ;; full) echo 3 ;; esac; }

tier=docs
why=''
docs_changed=0
changed=0
# -z keeps paths as they are (no quoting); a rename lists the new path, then the old one.
note() {
  local path=$1
  changed=1
  [[ -z "$why" ]] && why=$path
  [[ "$path" == docs/* || "$path" == CHANGELOG.md ]] && docs_changed=1
  local this
  this=$(tier_of "$path")
  if (( $(rank "$this") > $(rank "$tier") )); then
    tier=$this
    why=$path
  fi
}
while IFS= read -r -d '' entry; do
  note "${entry:3}"
  # A rename or copy is followed by the path it came from, which counts too: moving an engine file into docs/ is
  # still an engine change.
  if [[ "${entry:0:1}" == R || "${entry:0:1}" == C ]]; then
    IFS= read -r -d '' old
    note "$old"
  fi
done < <(git status --porcelain=v1 -z --untracked-files=all)

if [[ -n "$forced" ]]; then
  tier=$forced
  why="--$forced"
elif (( ! changed )); then
  tier=full
  why='nothing uncommitted'
fi
# The website's full check reads only docs/ and the changelog here, so the full tier runs it when one of them changed,
# and always when it checks everything (--full, or nothing uncommitted). The other tiers check the links instead.
run_site=0
if [[ "$site" == yes ]]; then
  run_site=1
elif [[ "$site" == auto && "$tier" == full ]] && { (( docs_changed )) || [[ "$why" == --full || "$why" == 'nothing uncommitted' ]]; }; then
  run_site=1
fi

printf '== tier: %s' "$tier"
[[ -n "$why" ]] && printf ' (%s)' "$why"
printf '\n'
if (( dry )); then
  case "$tier" in
    full) echo "Would run: npm test, npm run check, the examples' check, build and snapshot." ;;
    snippets) echo "Would run: the docs' contract tests, the snippets' typecheck and tests." ;;
    docs) echo "Would run: the docs' contract tests." ;;
  esac
  if (( run_site )); then echo "And the website's full check (npm run docs:build)."
  elif [[ "$tier" != full ]]; then echo "And the docs' links and includes."
  else echo "Not the website's check: nothing under docs/ or the changelog changed."; fi
  exit 0
fi

if [[ "$tier" == full ]]; then
  step "npm test"; npm test
  # vp check: the format (npm run format fixes it) and lint, then tsc on every project; each cached.
  step "npm run check"; npm run check
else
  # The contract tests that read the docs: each package's docs.test.ts (every export named on its page), the pages'
  # descriptions, the framework tabs and the community plugins list.
  step "the docs' contract tests"
  npx vitest run tests/contracts/docs.test.ts tests/contracts/docs-descriptions tests/contracts/framework-tabs tests/contracts/community-plugins
  if [[ "$tier" == snippets ]]; then
    step "the docs' snippets: typecheck and tests"
    npx vp run typecheck:snippets
    npx vitest run docs/snippets
  fi
  if (( ! run_site )); then
    # Every link and ::include in the docs resolves (the website's script, run against docs/ as it is on disk).
    step "the docs' links and includes"; node scripts/site.ts links
  fi
fi

if (( run_site )); then
  # The website's check (its lint, typecheck, the docs' links and next build), run from its own repo beside this one
  # (../ifloom-site, or $IFLOOM_SITE) against docs/ as it is on disk: scripts/site.ts.
  step "npm run docs:build"; npm run docs:build
fi

if [[ "$tier" == full ]]; then
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
fi

git status --short

step "verified ($tier)"
