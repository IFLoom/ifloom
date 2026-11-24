/**
 * Returns the URL to load a file from, the data URL in the page when there is one, else the path unchanged. A leading
 * `./` is ignored in the lookup.
 *
 * A build made with `ifloom build --inline-assets` puts the files from `art/` in the page as data URLs, under their
 * paths.
 */
export function assetUrl(src: string): string {
  const inlined = (globalThis as { __ifloomAssets?: Record<string, string> }).__ifloomAssets
  return inlined?.[src.replace(/^\.\//, '')] ?? src
}
