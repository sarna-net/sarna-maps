/**
 * Safely encode a faction key for use as an SVG `id` attribute and as a CSS
 * class / selector token.
 *
 * Faction keys (e.g. disputed forms like `D(CC/FS)` or `D-CC/FS`) can contain
 * characters that are illegal or fragile in those contexts: `(` `)` `/` break
 * CSS class selectors and trip `url(#...)` parsers. We keep alphanumerics,
 * dashes and underscores verbatim and percent-encode every other code point,
 * so the same key always yields the same safe token and id/class stay in sync.
 */
export function sanitizeFactionToken(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, (char) => '_' + char.charCodeAt(0).toString(16));
}
