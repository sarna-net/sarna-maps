/**
 * Configuration of the glyph widths for a single font / font size.
 */
export interface GlyphSettings {
  lineHeight: number;
  widths: Record<string, number>;
  baseLineOffset?: number; // the number of units to move a line of text until it is centered (allows fine control over vertical centering)
}
