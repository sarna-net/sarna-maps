import { GlyphSettings } from './glyph-settings';

export interface GlyphConfig {
  regular: GlyphSettings;
  small: GlyphSettings;
  borderLabels?: GlyphSettings;
}
