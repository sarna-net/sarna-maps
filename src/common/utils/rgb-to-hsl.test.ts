import { expect, test } from 'vitest';
import { rgbToHsl } from './rgb-to-hsl';

test('rgb-to-hsl', () => {

  expect(rgbToHsl('#000')).toEqual({
    h: 0,
    s: 0,
    l: 0,
  });

  expect(rgbToHsl('fff')).to.deep.equal({
    h: 0,
    s: 0,
    l: 1,
  });

  const c1 = rgbToHsl('#40e854');
  expect(c1.h).toBe(127);
  expect(c1.s).toBeCloseTo(0.785, 4);
  expect(c1.l).toBeCloseTo(0.5804, 4);

  const c2 = rgbToHsl('59207cff');
  expect(c2.h).toBe(277);
  expect(c2.s).toBeCloseTo(0.5897, 4);
  expect(c2.l).toBeCloseTo(0.3059, 4);

  const c3 = rgbToHsl('#ec2027');
  expect(c3.h).toBe(358);
  expect(c3.s).toBeCloseTo(0.843, 4);
  expect(c3.l).toBeCloseTo(0.5255, 4);
});
