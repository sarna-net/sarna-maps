import { expect, describe, it } from 'vitest';
import { sanitizeFactionToken } from './sanitize-faction-token';

describe('sanitizeFactionToken', () => {
  it('leaves alnum, dash and underscore tokens unchanged', () => {
    expect(sanitizeFactionToken('D-LC-DC')).to.equal('D-LC-DC');
    expect(sanitizeFactionToken('LC')).to.equal('LC');
  });

  it('encodes parentheses and slashes into stable hex escapes', () => {
    // `(` -> 0x28, `)` -> 0x29, `/` -> 0x2f
    expect(sanitizeFactionToken('D(CC/FS)')).to.equal('D_28CC_2fFS_29');
    expect(sanitizeFactionToken('D-CC/FS')).to.equal('D-CC_2fFS');
  });

  it('is deterministic and reversible enough to stay in sync across id/class/css', () => {
    const key = 'D(CC/FS)';
    const a = sanitizeFactionToken(key);
    const b = sanitizeFactionToken(key);
    expect(a).to.equal(b);
    expect(a).not.to.match(/[()/]/);
  });
});
