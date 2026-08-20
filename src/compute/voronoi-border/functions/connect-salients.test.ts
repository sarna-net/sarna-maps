import { describe, it, expect } from 'vitest';
import { corridorCollidesWithForeignSystems } from './connect-salients';
import { VoronoiBorderNode, BorderDelaunayVertex } from '../types';
import { EMPTY_FACTION } from '../../constants';

function node(id: string, x: number, y: number): VoronoiBorderNode {
  return { id, x, y, vertex1Idx: 0, vertex2Idx: 0, vertex3Idx: 0, neighborNodeIndices: [], borderAffiliations: {} };
}

function vertex(id: string, x: number, y: number, affiliation: string): BorderDelaunayVertex {
  return { id, x, y, affiliation, adjacentTriIndices: [] };
}

const FROM = node('island-node', 0, 0);
const TO = node('section-point', 20, 0);

describe('corridorCollidesWithForeignSystems', () => {
  it('allows a corridor through empty space', () => {
    const vertices = [
      vertex('noise-1', 5, 10, EMPTY_FACTION),
      vertex('own-1', 4, 0, 'CFG'),
    ];
    expect(corridorCollidesWithForeignSystems(FROM, TO, 'CFG', vertices)).toBe(false);
  });

  it('ignores systems of the corridor\'s own faction', () => {
    const vertices = [vertex('own-1', 10, 0, 'CFG')];
    expect(corridorCollidesWithForeignSystems(FROM, TO, 'CFG', vertices)).toBe(false);
  });

  it('ignores noise points', () => {
    const vertices = [vertex('noise-1', 10, 0, EMPTY_FACTION)];
    expect(corridorCollidesWithForeignSystems(FROM, TO, 'CFG', vertices)).toBe(false);
  });

  it('blocks a corridor passing directly through a foreign system', () => {
    // Lothan-style case: the merge point at distance 10 coincides with a DC system
    const vertices = [vertex('lothan', 10, 0, 'DC')];
    expect(corridorCollidesWithForeignSystems(FROM, TO, 'CFG', vertices)).toBe(true);
  });

  it('blocks a corridor passing close to a foreign system', () => {
    const vertices = [vertex('foreign-1', 9, 0.5, 'DC')];
    expect(corridorCollidesWithForeignSystems(FROM, TO, 'CFG', vertices)).toBe(true);
  });

  it('allows a foreign system far from the corridor', () => {
    const vertices = [vertex('foreign-1', 10, 10, 'DC')];
    expect(corridorCollidesWithForeignSystems(FROM, TO, 'CFG', vertices)).toBe(false);
  });

  it('matches the top-level affiliation only (CFG vs CFG subdivision)', () => {
    const vertices = [vertex('sub-1', 10, 0, 'CFG')];
    expect(corridorCollidesWithForeignSystems(FROM, TO, 'CFG', vertices)).toBe(false);
  });

  it('handles the short-corridor midpoint case', () => {
    const from = node('island-node', 0, 0);
    const to = node('section-point', 1, 0);
    const vertices = [vertex('foreign-1', 0.5, 0, 'DC')];
    expect(corridorCollidesWithForeignSystems(from, to, 'CFG', vertices)).toBe(true);
  });
});