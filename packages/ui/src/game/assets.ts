/**
 * Where a picture really is. A build made with `ifloom build --inline-assets`
 * puts every file from `art/` into the page as a data URL, under its path;
 * everywhere else the path is used as it is.
 */
export function assetUrl(src: string): string {
  const inlined = (globalThis as { __ifloomAssets?: Record<string, string> }).__ifloomAssets
  return inlined?.[src.replace(/^\.\//, '')] ?? src
}
