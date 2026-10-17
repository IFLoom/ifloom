#!/usr/bin/env bash
# Make a game from each of ifloom new's own templates in a folder outside the
# checkout, as "A game beside the checkout" in the installation guide does, and
# install it with a package manager the way a game installs the packages from
# npm: each @ifloom package is packed (`npm pack`, so only its `files`, with
# the built dist/) and the game depends on the tarball. Then it runs the
# game's check, playtest, build and typecheck. The plugin template makes a
# plugin package, not a game, so it gets install, build, test and typecheck.
#
# It builds the packages first (npm run build). Slower than verify.sh's steps
# (an install per template and package manager), so run it when a template, the
# Vite preset, the build or a package's dependencies change, not on every commit.
#
#   scripts/try-templates.sh [--pm npm|pnpm|yarn|bun|all] [template...]
#
# npm if no --pm; react vue svelte vanilla next plugin if no template is named.
set -euo pipefail
cd "$(dirname "$0")/.."
checkout=$(pwd)
# The checkout's .npmrc gives Node the `ifloom-source` condition. A game beside it has its own Node.
unset NODE_OPTIONS

managers=(npm)
if [[ "${1:-}" == "--pm" ]]; then
  [[ "${2:-}" == all ]] && managers=(npm pnpm yarn bun) || managers=("${2:?--pm takes npm, pnpm, yarn, bun or all}")
  shift 2
fi
templates=("$@")
(( ${#templates[@]} )) || templates=(react vue svelte vanilla next plugin)

for pm in "${managers[@]}"; do
  case $pm in
    npm | pnpm | yarn | bun) command -v "$pm" >/dev/null || { echo "$pm isn't installed." >&2; exit 1; } ;;
    *) echo "Unknown package manager: $pm (npm, pnpm, yarn, bun or all)" >&2; exit 1 ;;
  esac
done

out=$(mktemp -d "${TMPDIR:-/tmp}/ifloom-templates-XXXXXX")
trap 'rm -rf "$out"' EXIT

# Each package built and packed as npm would publish it, a tarball of its `files`, as `npm run pack` makes them.
# A fresh folder each run, so no package manager's cache hands back an older tarball of the same name.
printf '\n== npm run pack\n'
node scripts/build.ts --pack "$out/packs" >/dev/null
echo "Built and packed every package."

failed=()
for pm in "${managers[@]}"; do
  for template in "${templates[@]}"; do
    dir="$out/$pm/try-$template"
    printf '\n== %s with %s in %s\n' "$template" "$pm" "$dir"
    node --input-type=module - "$checkout" "$template" "$dir" "$out/packs" "$pm" <<'EOF'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const [checkout, template, dir, packs, pm] = process.argv.slice(2)
const { newGame } = await import(join(checkout, 'packages/cli/dist/index.js'))
newGame({ name: `try-${template}`, template, into: dir })

// Each @ifloom package the game lists, from its tarball. Until they're on npm, a
// required peer the game doesn't list (the React UI's @ifloom/audio, say) is
// listed too, as no package manager could fetch it from the registry.
const tarball = (name) => `file:${join(packs, readdirSync(packs).find((file) => file === `ifloom-${name.slice('@ifloom/'.length)}-0.0.0.tgz`))}`
const manifest = (name) => JSON.parse(readFileSync(join(checkout, 'packages', name.slice('@ifloom/'.length), 'package.json'), 'utf8'))
const file = join(dir, 'package.json')
const pkg = JSON.parse(readFileSync(file, 'utf8'))
const listed = new Set()
for (const field of ['dependencies', 'devDependencies'])
  for (const name of Object.keys(pkg[field] ?? {})) if (name.startsWith('@ifloom/')) listed.add(name)
const wanted = [...listed]
for (const name of wanted) {
  const { peerDependencies = {}, peerDependenciesMeta = {} } = manifest(name)
  for (const peer of Object.keys(peerDependencies))
    if (peer.startsWith('@ifloom/') && !peerDependenciesMeta[peer]?.optional && !wanted.includes(peer)) wanted.push(peer)
}
for (const name of wanted) {
  const field = Object.keys(pkg.devDependencies ?? {}).includes(name) ? 'devDependencies' : 'dependencies'
  pkg[field] = { ...pkg[field], [name]: tarball(name) }
}
// Bun looks up a package's @ifloom peers on the registry even when the game lists them, so it's told where they are.
if (pm === 'bun') pkg.overrides = Object.fromEntries(wanted.map((name) => [name, tarball(name)]))
writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n')

// The shared tsconfig extends the checkout's base, as a game in games/ does. Beside it, written out in full,
// without the checkout's `ifloom-source` condition, so the typecheck reads the packages' .d.ts files.
const tsconfig = JSON.parse(readFileSync(join(dir, 'tsconfig.json'), 'utf8'))
if (tsconfig.extends) {
  const base = JSON.parse(readFileSync(join(checkout, 'tsconfig.base.json'), 'utf8'))
  delete base.compilerOptions.customConditions
  delete tsconfig.extends
  tsconfig.compilerOptions = { ...base.compilerOptions, ...tsconfig.compilerOptions }
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2) + '\n')
}
EOF
    case $pm in
      npm) install='npm install --no-audit --no-fund --loglevel=error' ;;
      pnpm) install='pnpm install --reporter=append-only --config.strict-dep-builds=false' ;;
      # Yarn 1, or Yarn 2 and later with node_modules, as the installation guide says, since Vite doesn't support Plug'n'Play.
      yarn) [[ $(yarn --version) == 1.* ]] && install='yarn install --non-interactive --silent' || install='echo "nodeLinker: node-modules" > .yarnrc.yml && yarn install' ;;
      bun) install='bun install' ;;
    esac
    run="$pm run"
    if [[ $template == plugin ]]; then
      steps="$install && $run build && $run test && $run typecheck"
      said='installs, builds, tests and typechecks'
    else
      steps="$install && $run check && $run playtest && $run build && $run typecheck"
      said='installs, checks, playtests, builds and typechecks'
    fi
    if (cd "$dir" && eval "$steps"); then
      echo "-- $template with $pm: $said"
    else
      failed+=("$template ($pm)")
    fi
  done
done

if (( ${#failed[@]} )); then
  printf '\nFailed: %s\n' "${failed[*]}"
  exit 1
fi
printf '\n== every template works beside the checkout\n'
