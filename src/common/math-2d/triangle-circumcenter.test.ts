import { describe, it, expect } from 'vitest';
import { triangleCircumcenter } from './triangle-circumcenter';

describe('triangleCircumcenter', () => {

  it ('should return a correct result for a fairly even triangle', () => {
    const p1 = {x: 0, y: 3};
    const p2 = {x: 2, y: 3};
    const p3 = {x: 1, y: 1};
    const c = triangleCircumcenter(p1, p2, p3);
    expect(c).to.not.equal(null);
    expect(c).to.deep.equal({ x: 1, y: 2.25 });
  });

  it ('should return a correct result for a weirder-shaped triangle', () => {
    const p1 = { x: -10, y: 1 };
    const p2 = { x: -9, y: 10 };
    const p3 = { x: -9, y: 9 };
    const c = triangleCircumcenter(p1, p2, p3);
    expect(c).to.not.equal(null);
    expect(c).to.deep.equal({ x: -45.5, y: 9.5 });
  });

  it ('should return null for a triangle with an area of zero', () => {
    const p1 = { x: 1, y: 1 };
    const p2 = { x: 1, y: 10 };
    const p3 = { x: 1, y: 7 };
    const c = triangleCircumcenter(p1, p2, p3);
    expect(c).to.equal(null);
  });
});
