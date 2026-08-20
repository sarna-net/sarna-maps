import { describe, it, expect } from 'vitest';
import { parseSingleSystem } from './parse-single-system';
import { Era } from '../../common';

const eras: Array<Era> = [
  { index: 0, name: '2271', year: 2271 },
  { index: 1, name: '3025', year: 3025 },
  { index: 2, name: '3050', year: 3050 },
];

function row(overrides: Record<string, any> = {}) {
  return {
    id: 's1',
    name: 'Test System',
    alternateNames: '',
    x: 1,
    y: 2,
    eraAffiliations: ['FWL', 'FWL', 'FWL'],
    size: [1, 1, 0],
    ...overrides,
  } as any;
}

describe('parseSingleSystem activeEras', () => {
  it('still populates era-indexed arrays for ALL eras even when only a subset is active', () => {
    const system = parseSingleSystem('s1', row(), eras, new Set([1]));
    // Arrays must stay index-aligned with the global era list.
    expect(system.eraAffiliations).to.have.lengthOf(3);
    expect(system.eraNames).to.have.lengthOf(3);
    expect(system.eraCapitalLevels).to.have.lengthOf(3);
    expect(system.eraAffiliations[1]).to.equal('FWL');
  });

  it('defaults to treating every era as active when activeEras is omitted', () => {
    const system = parseSingleSystem('s1', row(), eras);
    expect(system.eraAffiliations).to.have.lengthOf(3);
    expect(system.eraNames).to.have.lengthOf(3);
  });

  it('handles an empty activeEras set as "all eras"', () => {
    const system = parseSingleSystem('s1', row(), eras, new Set());
    expect(system.eraAffiliations).to.have.lengthOf(3);
  });
});
