import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

export class TextTemplate {
  private template = '';

  constructor(public name: string, templatePath = '') {
    this.load(templatePath);
  }

  /**
   * Loads a template from the default template directory.
   */
  load(templatePath = '') {
    try {
      if (!templatePath) {
        templatePath = path.join(__dirname);
      }
      this.template = fs.readFileSync(path.join(templatePath, this.name), { encoding: 'utf8' });
    } catch (e) {
      logger.warn(`Template "${this.name}" could not be found`, e.message);
      this.template = '';
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
    let text = this.template;
    Object.keys(replacements).forEach((token) => {
      text = text.replaceAll(`{{${token.toUpperCase()}}}`, String(replacements[token]));
    });
    if (removeUnsetTokens) {
      text = text.replace(/\s*{{[^}]+}}\s*/gi, '');
    }
    return text;
  }
}
