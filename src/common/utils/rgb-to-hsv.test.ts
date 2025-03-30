import { expect, test } from 'vitest';
import { rgbToHsv } from './rgb-to-hsv';

test('rgb-to-hsv', () => {

  expect(rgbToHsv('#000')).to.deep.equal({
    h: 0,
    s: 0,
    v: 0,
  });

  expect(rgbToHsv('#40e854')).to.deep.equal({
    h: 127,
    s: 72,
    v: 91,
  });

  expect(rgbToHsv('59207cff')).to.deep.equal({
    h: 277,
    s: 74,
    v: 49,
  });

  expect(rgbToHsv('fff')).to.deep.equal({
    h: 0,
    s: 0,
    v: 100,
  });

  expect(rgbToHsv('#ec2027')).to.deep.equal({
    h: 358,
    s: 86,
    v: 93,
  });
});
