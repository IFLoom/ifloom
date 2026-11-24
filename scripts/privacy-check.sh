#!/usr/bin/env bash
# Before pushing: IFLoom is published under the IFLoom name only. Fails if
# the files or the commits about to be pushed carry a private identity or a
# secret.
#
#   scripts/privacy-check.sh [range]    the files, and the commits in range (origin/main..HEAD if left out)
#   scripts/privacy-check.sh --history  the files, and every commit HEAD has: each author and committer,
#                                       each message, and each line any commit added
#
# What counts as private, none of it written in this repo:
# - your global git identity (git config --global user.name / user.email);
# - each line of ${IFLOOM_PRIVATE_WORDS:-~/.config/ifloom/private-words}, if
#   the file exists (other names that must stay out, one per line);
# - any email address but the IFLoom one and the Co-Authored-By one (in
#   the files and commit messages);
# - a token or key: npm_, ghp_ and the other GitHub tokens, github_pat_,
#   sk-, AWS's AKIA, and private keys.
set -uo pipefail
cd "$(dirname "$0")/.."

history=0
if [[ "${1:-}" == --history ]]; then
  history=1
  shift
fi
range="${1:-origin/main..HEAD}"
(( history )) && range=HEAD
identity="IFLoom <ifloom@pm.me>"
allowed='^(ifloom@pm\.me|noreply@anthropic\.com)$'
failed=0
fail() { echo "PRIVACY: $*"; failed=1; }

words=()
for key in user.name user.email; do
  value=$(git config --global "$key" || true)
  [[ -n "$value" ]] && words+=("$value")
done
list="${IFLOOM_PRIVATE_WORDS:-$HOME/.config/ifloom/private-words}"
if [[ -f "$list" ]]; then
  while IFS= read -r line; do [[ -n "$line" && "$line" != \#* ]] && words+=("$line"); done < "$list"
else
  echo "note: no $list, so only the global git identity and email addresses are checked."
fi

# Tracked and new files in the working tree.
for word in "${words[@]}"; do
  hits=$(git grep -I -i -l -F --untracked -e "$word" -- . ':!node_modules' 2>/dev/null || true)
  [[ -n "$hits" ]] && fail "a private word is in: $(echo $hits)"
done
emails=$(git grep -I -h -o -E --untracked '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}' -- . ':!node_modules' ':!package-lock.json' 2>/dev/null | sort -u | grep -v -E "$allowed" || true)
[[ -n "$emails" ]] && fail "email addresses in files: $(echo $emails)"
# Tokens and keys, by the shapes their issuers give them.
secrets='\bnpm_[A-Za-z0-9]{36}\b|\bgh[pousr]_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{22,}|\bsk-[A-Za-z0-9_-]{20,}|\bAKIA[0-9A-Z]{16}\b|-----BEGIN ([A-Z]+ )*PRIVATE KEY-----'
hits=$(git grep -I -l -E --untracked -e "$secrets" -- . ':!node_modules' 2>/dev/null || true)
[[ -n "$hits" ]] && fail "a token or key is in: $(echo $hits)"

# The commits about to be pushed: authors, committers and messages.
if git rev-parse --verify -q "${range%%..*}" >/dev/null; then
  people=$(git log "$range" --format='%an <%ae>%n%cn <%ce>' | sort -u | grep -v -x -F "$identity" || true)
  [[ -n "$people" ]] && fail "commits in $range not by $identity: $(echo $people)"
  for word in "${words[@]}"; do
    git log "$range" --format=%B | grep -q -i -F -e "$word" && fail "a private word is in a commit message in $range"
  done
  messages=$(git log "$range" --format=%B | grep -o -E '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' | sort -u | grep -v -E "$allowed" || true)
  [[ -n "$messages" ]] && fail "email addresses in commit messages: $(echo $messages)"
else
  echo "note: ${range%%..*} not found; commits not checked."
fi

# The whole history: every line a commit added, even one a later commit took out, is still in the repo.
if (( history )); then
  # Each added line, after the commit that added it: "<hash> +<line>".
  added=$(git log -p --no-color --no-ext-diff --diff-merges=first-parent --format='commit %h' HEAD |
    awk '/^commit [0-9a-f]+$/ { at = $2; next } /^\+/ && !/^\+\+\+ / { print at " " $0 }')
  for word in "${words[@]}"; do
    at=$(grep -i -F -e "$word" <<<"$added" | cut -d' ' -f1 | sort -u)
    [[ -n "$at" ]] && fail "a private word was added in: $(echo $at)"
  done
  at=$(grep -E -e "$secrets" <<<"$added" | cut -d' ' -f1 | sort -u)
  [[ -n "$at" ]] && fail "a token or key was added in: $(echo $at)"
  echo "Checked every line added in the $(git rev-list --count HEAD) commits of HEAD."
fi

if (( failed )); then exit 1; fi
echo "Privacy check passed."
