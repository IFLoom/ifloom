#!/usr/bin/env bash
# Make a game from each of ifloom new's own templates in a folder outside the
# checkout, as "A game beside the checkout" in the installation guide does, and
# run its install, check, build and typecheck. As the guide's tsconfig does, the
# typecheck covers src/ only: linked from a checkout, vite.config.ts sees two
# copies of Vite's types (the checkout's and the game's), which a published
# install doesn't have. Slower than verify.sh's steps
# (an npm install per template), so run it when a template, the Vite preset or
# a package's dependencies change, not on every commit.
#
#   scripts/try-templates.sh [template...]   react vue svelte vanilla if none named
set -euo pipefail
cd "$(dirname "$0")/.."
checkout=$(pwd)

templates=("$@")
(( ${#templates[@]} )) || templates=(react vue svelte vanilla)

out=$(mktemp -d "${TMPDIR:-/tmp}/ifloom-templates-XXXXXX")
trap 'rm -rf "$out"' EXIT

failed=()
for template in "${templates[@]}"; do
  dir="$out/try-$template"
  printf '\n== %s in %s\n' "$template" "$dir"
  # The game, with its @ifloom packages linked from the checkout and the tsconfig written out in full.
  node --input-type=module - "$checkout" "$template" "$dir" <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const [checkout, template, dir] = process.argv.slice(2)
const { newGame } = await import(join(checkout, 'packages/cli/src/new.ts'))
newGame({ name: `try-${template}`, template, into: dir })
const file = join(dir, 'package.json')
const pkg = JSON.parse(readFileSync(file, 'utf8'))
for (const field of ['dependencies', 'devDependencies'])
  for (const name of Object.keys(pkg[field] ?? {}))
    if (name.startsWith('@ifloom/')) pkg[field][name] = `file:${join(checkout, 'packages', name.slice('@ifloom/'.length))}`
writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n')
const tsconfig = JSON.parse(readFileSync(join(dir, 'tsconfig.json'), 'utf8'))
const base = JSON.parse(readFileSync(join(checkout, 'tsconfig.base.json'), 'utf8'))
delete tsconfig.extends
tsconfig.include = ['src']
tsconfig.compilerOptions = { ...base.compilerOptions, ...tsconfig.compilerOptions }
writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2) + '\n')
EOF
  if (cd "$dir" && npm install --no-audit --no-fund --loglevel=error && npm run check && npm run build && npm run typecheck); then
    echo "-- $template: installs, checks, builds and typechecks"
  else
    failed+=("$template")
  fi
done

if (( ${#failed[@]} )); then
  printf '\nFailed: %s\n' "${failed[*]}"
  exit 1
fi
printf '\n== every template works beside the checkout\n'
