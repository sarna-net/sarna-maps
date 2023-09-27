import * as fs from 'fs';
import * as path from 'path';

export class Template {
  private textTemplate = '';

  constructor(public name: string) {
    this.load();
  }

  /**
   * Loads a template from the default template directory.
   */
  load() {
    try {
      this.textTemplate = fs.readFileSync(
        path.join(__dirname, '..', 'templates', this.name),
        { encoding: 'utf8' },
      );
    } catch (e) {
      console.warn(`Template "${this.name}" could not be found`, e.message);
      this.textTemplate = '';
    }
  }

  /**
   * Replace the provided tokens with the corresponding values and return the result.
   * 
   * @param replacements Object of token replacements (replace *key* with *value*)
   * @param removeUnsetTokens Set to true if all tokens that do not appear in the passed object should be set to empty string
   * @returns The resulting string with replaced tokens
   */
  replace(replacements: Record<string, unknown> = {}, removeUnsetTokens = true) {
    let text = this.textTemplate;
    Object.keys(replacements).forEach((token) => {
      text = text.replaceAll(`{{${token.toUpperCase()}}}`, String(replacements[token]));
    });
    if (removeUnsetTokens) {
      text = text.replace(/\s*\{\{[^}]+\}\}\s*/gi, '');
    }
    return text;
  }
}