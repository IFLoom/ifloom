// Each package's CHANGELOG.md: with a GitHub token (the release workflow has one), each entry links its pull request
// and thanks who wrote it; without one, as when trying `npm run release:version` locally, the plain entries.
import github from '@changesets/changelog-github'
import plain from '@changesets/cli/changelog'

const functions = process.env.GITHUB_TOKEN ? (github.default ?? github) : (plain.default ?? plain)
export default functions
