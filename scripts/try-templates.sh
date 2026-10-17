#!/usr/bin/env bash
# Make a game from each of ifloom new's own templates in a folder outside the
# checkout, as "A game beside the checkout" in the installation guide does, and
# run its install, check, playtest, build and typecheck. As the guide's tsconfig does, the
# typecheck covers src/ only: linked from a checkout, vite.config.ts sees two
# copies of Vite's types (the checkout's and the game's), which a published
# install doesn't have. The next template keeps its own tsconfig, and gets the
# `turbopack.root` the Next recipe gives a game linked from a checkout. Slower than verify.sh's steps
# (an npm install per template), so run it when a template, the Vite preset or
# a package's dependencies change, not on every commit.
#
#   scripts/try-templates.sh [template...]   react vue svelte vanilla next if none named
set -euo pipefail
cd "$(dirname "$0")/.."
checkout=$(pwd)

templates=("$@")
(( ${#templates[@]} )) || templates=(react vue svelte vanilla next)

out=$(mktemp -d "${TMPDIR:-/tmp}/ifloom-templates-XXXXXX")
trap 'rm -rf "$out"' EXIT

failed=()
for template in "${templates[@]}"; do
  dir="$out/try-$template"
  printf '\n== %s in %s\n' "$template" "$dir"
  # The game, with its @ifloom packages linked from the checkout and the tsconfig written out in full.
  node --input-type=module - "$checkout" "$template" "$dir" <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, sep } from 'node:path'
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
if (tsconfig.extends) {
  const base = JSON.parse(readFileSync(join(checkout, 'tsconfig.base.json'), 'utf8'))
  delete tsconfig.extends
  tsconfig.include = ['src']
  tsconfig.compilerOptions = { ...base.compilerOptions, ...tsconfig.compilerOptions }
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2) + '\n')
}
// Turbopack reads no file outside its root, and the linked packages are in the checkout: the root is the folder holding both.
const config = join(dir, 'next.config.ts')
if (template === 'next') {
  const a = dir.split(sep), b = checkout.split(sep)
  let at = 0
  while (at < a.length && a[at] === b[at]) at++
  const root = a.slice(0, at).join(sep) || sep
  writeFileSync(config, readFileSync(config, 'utf8').replace(/(transpilePackages: \[[^\]]*\],\n)/, `$1  turbopack: { root: ${JSON.stringify(root)} },\n`))
}
EOF
  if (cd "$dir" && npm install --no-audit --no-fund --loglevel=error && npm run check && npm run playtest && npm run build && npm run typecheck); then
    echo "-- $template: installs, checks, playtests, builds and typechecks"
  else
    failed+=("$template")
  fi
done

if (( ${#failed[@]} )); then
  printf '\nFailed: %s\n' "${failed[*]}"
  exit 1
fi
printf '\n== every template works beside the checkout\n'
