#!/usr/bin/env bash
# Build every package, then use the built dist/ as a game installed from npm
# would: plain Node (no `ifloom-source` condition) imports each export, every
# file the export maps name resolves and exists, the `ifloom` command runs,
# and tsc type-checks a small consumer against the `.d.ts` files alone.
#
#   scripts/try-dist.sh            build first
#   scripts/try-dist.sh --no-build use the dist/ already there
set -euo pipefail
cd "$(dirname "$0")/.."
checkout=$(pwd)
# The checkout's .npmrc gives Node the source condition; a user's Node has none.
unset NODE_OPTIONS

[[ "${1:-}" == "--no-build" ]] || npm run build --silent >/dev/null

out=$(mktemp -d "${TMPDIR:-/tmp}/ifloom-dist-XXXXXX")
# A folder of its own for npx, so nothing there resolves through the consumer's link to the checkout.
npx=$(mktemp -d "${TMPDIR:-/tmp}/ifloom-npx-XXXXXX")
trap 'rm -rf "$out" "$npx"' EXIT
# The consumer sees the checkout's node_modules, where each @ifloom package links to its folder.
ln -s "$checkout/node_modules" "$out/node_modules"

printf '\n== import every export in plain Node\n'
node --input-type=module - "$checkout" "$out" <<'JS'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const [checkout, out] = process.argv.slice(2)
// Resolve from the consumer's folder, as a game's own code would.
const resolveFrom = (spec) => import.meta.resolve(spec, pathToFileURL(join(out, 'consumer.js')).href)
const problems = []
const imports = []
for (const dir of readdirSync(join(checkout, 'packages')).sort()) {
  const pkg = JSON.parse(readFileSync(join(checkout, 'packages', dir, 'package.json'), 'utf8'))
  for (const [key, target] of Object.entries(pkg.exports ?? {})) {
    const specs = key.includes('*')
      ? readdirSync(join(checkout, 'packages', dir, 'src/themes')).map((file) => key.replace('*', key.endsWith('*') ? file : file.replace(/\.css$/, '')).replace(/^\./, pkg.name))
      : [key.replace(/^\./, pkg.name)]
    for (const spec of specs) {
      if (typeof target === 'object' && !target.import) continue // types only, such as @ifloom/cli/client
      let file
      try {
        file = fileURLToPath(resolveFrom(spec))
      } catch (error) {
        problems.push(`${spec}: ${error.message}`)
        continue
      }
      if (file.includes('/src/') && /\.tsx?$/.test(file)) problems.push(`${spec} resolves to its source, ${file}`)
      else if (!existsSync(file)) problems.push(`${spec} resolves to ${file}, which isn't there`)
      else if (/\.js$/.test(file)) imports.push(spec)
    }
  }
}
for (const spec of imports) {
  try {
    const module = await import(resolveFrom(spec))
    if (!Object.keys(module).length) problems.push(`${spec} exports nothing`)
    else console.log(`  ${spec}: ${Object.keys(module).length} exports`)
  } catch (error) {
    problems.push(`${spec}: ${error.message}`)
  }
}
// The type-check below imports every package that has types.
writeFileSync(join(out, 'consumer.ts'), imports.map((spec, at) => `import * as m${at} from '${spec}'\nvoid m${at}\n`).join(''))
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
JS

printf '\n== the ifloom command\n'
"$checkout/node_modules/.bin/ifloom" help >/dev/null
echo "  ifloom help runs from dist/bin.js"

# `npx ifloom`: the unscoped ifloom package, from its tarball, with the @ifloom/cli it depends on and the engine
# that one peers on from theirs, since they may not be on npm yet. The rest (Vite) comes from the registry.
mkdir -p "$npx/packs"
npm pack -w ifloom -w @ifloom/cli -w @ifloom/engine --pack-destination "$npx/packs" --silent >/dev/null
node --input-type=module - "$npx" <<'JS'
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const [dir] = process.argv.slice(2)
const packs = readdirSync(join(dir, 'packs'))
const pack = (prefix) => `file:./packs/${packs.find((file) => new RegExp(`^${prefix}-\\d`).test(file))}`
writeFileSync(
  join(dir, 'package.json'),
  JSON.stringify({ private: true, dependencies: { ifloom: pack('ifloom'), '@ifloom/engine': pack('ifloom-engine') }, overrides: { '@ifloom/cli': pack('ifloom-cli') } }),
)
JS
(cd "$npx" && npm install --no-audit --no-fund --loglevel=error >/dev/null && npx --no-install ifloom help >/dev/null && node node_modules/ifloom/bin.js help >/dev/null)
echo "  npx ifloom help runs from the ifloom package's tarball"

printf '\n== type-check a consumer against the .d.ts files\n'
cat > "$out/tsconfig.json" <<'JSON'
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "types": ["node"]
  },
  "files": ["consumer.ts"]
}
JSON
echo '{ "type": "module" }' > "$out/package.json"
"$checkout/node_modules/.bin/tsc" -p "$out/tsconfig.json"
echo "  consumer.ts type-checks with skipLibCheck off"

printf '\n== the built packages work\n'
