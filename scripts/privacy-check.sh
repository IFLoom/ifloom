#!/usr/bin/env bash
# Before pushing: IFLoom is published under the IFLoom name only. Fails if
# the files or the commits about to be pushed carry a private identity.
#
#   scripts/privacy-check.sh [range]   range defaults to origin/main..HEAD
#
# What counts as private, none of it written in this repo:
# - your global git identity (git config --global user.name / user.email);
# - each line of ${IFLOOM_PRIVATE_WORDS:-~/.config/ifloom/private-words}, if
#   the file exists (other names that must stay out, one per line);
# - any email address but the IFLoom one and the Co-Authored-By one.
set -uo pipefail
cd "$(dirname "$0")/.."

range="${1:-origin/main..HEAD}"
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

if (( failed )); then exit 1; fi
echo "Privacy check passed."
