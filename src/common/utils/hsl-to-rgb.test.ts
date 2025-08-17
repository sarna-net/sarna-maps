import { expect, test } from 'vitest';
import { hslToRgb } from './hsl-to-rgb';

test('hsl-to-rgb', () => {
  expect(hslToRgb({
    h: 0,
    s: 0,
    l: 0,
  })).to.equal('#000000');

  expect(hslToRgb({
    h: 0,
    s: 0,
    l: 1,
  })).to.equal('#ffffff');

  expect(hslToRgb({
    h: 1,
    s: .01,
    l: .6,
  })).to.equal('#9a9898');

  expect(hslToRgb({
    h: 127,
    s: 0.72,
    l: 0.91,
  })).to.equal('#d8f9db');

  expect(hslToRgb({
    h: 277,
    s: 0.74,
    l: 0.49,
  })).to.equal('#9320d9');

  expect(hslToRgb({
    h: 358,
    s: 0.86,
    l: 0.93,
  })).to.equal('#fddedf');

});
