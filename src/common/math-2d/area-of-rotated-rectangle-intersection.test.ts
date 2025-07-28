import { describe, it, expect } from 'vitest';
import { areaOfRotatedRectangleIntersection } from './area-of-rotated-rectangle-intersection';


describe('areaOfRotatedRectangleIntersection', () => {

  // it('should correctly calculate the overlap for a simple intersection case', () => {
  //   const rect = {
  //     anchor: {
  //       x: 239.616,
  //       y: 68.077,
  //     },
  //     dimensions: {
  //       height: 3,
  //       width: 14.221923828125,
  //     },
  //   };
  //   const rotRect = {
  //     bl: { x: 247.89, y: 64.41 },
  //     tl: { x: 245.75, y: 69.15 },
  //     tr: { x: 254.53, y: 73.10 },
  //     br: { x: 256.66, y: 68.36 },
  //   };
  //   const overlap = areaOfRotatedRectangleIntersection(rect, rotRect);
  //   expect(overlap.p).toBeDefined();
  //   expect(overlap.p).toEqual(
  //     expect.arrayContaining([
  //       expect.objectContaining({ x: 245.75, y: 69.15}),
  //       expect.objectContaining({ x: 250.0333063291139, y: 71.077 }),
  //       expect.objectContaining({ x: 253.837923828125, y: 71.077 }),
  //       expect.objectContaining({ x: 253.837923828125, y: 68.077 }),
  //       expect.objectContaining({ x: 246.23443459915612, y: 68.077 }),
  //     ])
  //   );
  // });

  it('should correctly calculate the overlap for a non-intersection case', () => {
    const rect = {
      anchor: {
        x: 121.49199999999999,
        y: -258.897,
      },
      dimensions: {
        height: 3,
        width:  9.295166015625,
      },
    };
    const rotRect = {
      bl: { x: 114.52166208345858, y: -252.43340651433607 },
      tl: { x: 125.55648244621185, y: -263.22500974524075 },
      tr: { x: 121.92072611062683, y: -266.94270740215876 },
      br: { x: 110.88590574787357, y: -256.1511041712541 },
    };
    const overlap = areaOfRotatedRectangleIntersection(rect, rotRect);
    expect(overlap.p).toBeDefined();
    expect(overlap.p).toEqual([]);
    expect(overlap.l).toEqual([]);
  });
});
