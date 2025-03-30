import { expect, test } from 'vitest';
import { hsvToRgb } from './hsv-to-rgb';

test('hsv-to-rgb', () => {
  expect(hsvToRgb({
    h: 0,
    s: 0,
    v: 0,
  })).to.equal('#000000');

  expect(hsvToRgb({
    h: 0,
    s: 0,
    v: 100,
  })).to.equal('#ffffff');

  expect(hsvToRgb({
    h: 1,
    s: 1,
    v: 100,
  })).to.equal('#fffcfc');

  expect(hsvToRgb({
    h: 127,
    s: 72,
    v: 91,
  })).to.equal('#40e854');

  expect(hsvToRgb({
    h: 277,
    s: 74,
    v: 49,
  })).to.equal('#59207c');

  expect(hsvToRgb({
    h: 358,
    s: 86,
    v: 93,
  })).to.equal('#ed2127');

});
