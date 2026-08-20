import { describe, it, expect } from 'vitest';
import { generateConnectionLines } from './generate-connection-lines';
import { Rectangle2d, System } from '../../common';

const viewRect: Rectangle2d = {
  anchor: { x: -100, y: -100 },
  dimensions: { width: 200, height: 200 },
};

function system(id: string, x: number, y: number, isCluster = false): System {
  return {
    id,
    name: id,
    fullName: id,
    x,
    y,
    isCluster,
    eraAffiliations: [],
    eraCapitalLevels: [],
    eraNames: [],
    names: [],
    radiusX: 1,
    radiusY: 1,
    rotation: 0,
    areasOfInterest: [],
  } as unknown as System;
}

/** Direction-independent key for an emitted connection. */
function unorderedKey(id: string): string {
  const [a, b] = id.split('__');
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

describe('generateConnectionLines', () => {
  it('connects two systems that are within range exactly once', () => {
    const lines = generateConnectionLines([system('A', 0, 0), system('B', 5, 0)], viewRect, 1, 30);

    expect(lines).to.have.length(1);
    expect(unorderedKey(lines[0].id)).to.equal('A__B');
  });

  it('never emits both (A,B) and (B,A) for the same pair', () => {
    const systems = [system('A', 0, 0), system('B', 5, 0), system('C', 10, 0)];

    const lines = generateConnectionLines(systems, viewRect, 1, 30);

    const seen = new Set<string>();
    for (const line of lines) {
      const key = unorderedKey(line.id);
      expect(seen.has(key), `duplicate connection ${key}`).to.equal(false);
      seen.add(key);
    }
    // A-B, A-C and B-C — three unordered pairs, no reversed twins.
    expect(lines).to.have.length(3);
  });

  it('deduplicates when the same system object appears twice in the input', () => {
    // A duplicated entry makes the i<j sweep produce the pair from both sides.
    const a = system('A', 0, 0);
    const b = system('B', 5, 0);

    const lines = generateConnectionLines([a, b, a], viewRect, 1, 30);

    const keys = lines.map((line) => unorderedKey(line.id));
    expect(new Set(keys).size).to.equal(keys.length);
    expect(keys).to.deep.equal(['A__B']);
  });

  it('respects the minimum and maximum distance bounds', () => {
    const systems = [system('A', 0, 0), system('B', 50, 0)];

    expect(generateConnectionLines(systems, viewRect, 1, 30)).to.have.length(0);
    expect(generateConnectionLines(systems, viewRect, 1, 60)).to.have.length(1);
  });

  it('ignores clusters', () => {
    const lines = generateConnectionLines(
      [system('A', 0, 0), system('CL', 5, 0, true)],
      viewRect,
      1,
      30,
    );

    expect(lines).to.have.length(0);
  });
});
