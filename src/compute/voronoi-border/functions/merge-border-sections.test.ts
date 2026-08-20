import { describe, it, expect } from 'vitest';
import { splitSectionsByAffiliationPair, findNonHomogeneousSections } from './merge-border-sections';
import { BorderSection } from '../types';

function edge(id: string, aff1: string, aff2: string) {
  return {
    id,
    node1: { id: `${id}-n1`, x: 0, y: 0, vertex1Idx: 0, vertex2Idx: 0, vertex3Idx: 0, neighborNodeIndices: [], borderAffiliations: {} } as any,
    node2: { id: `${id}-n2`, x: 1, y: 0, vertex1Idx: 0, vertex2Idx: 0, vertex3Idx: 0, neighborNodeIndices: [], borderAffiliations: {} } as any,
    vertex1Idx: 0,
    vertex2Idx: 0,
    affiliation1: aff1,
    affiliation2: aff2,
    leftAffiliation: aff1,
    rightAffiliation: aff2,
    length: 1,
    closeness: 10,
  };
}

function section(id: string, edges: ReturnType<typeof edge>[]): BorderSection {
  return {
    id,
    edges,
    isLoop: false,
    affiliation1: edges[0]?.affiliation1 ?? '',
    affiliation2: edges[0]?.affiliation2 ?? '',
    node1: edges[0]?.node1,
    node2: edges[edges.length - 1]?.node2,
    length: -1,
    minEdgeIdx: -1,
  };
}

describe('splitSectionsByAffiliationPair', () => {
  it('leaves a homogeneous section untouched', () => {
    const s = section('s', [edge('e1', 'FS,A', 'FS,B'), edge('e2', 'FS,A', 'FS,B')]);
    const out = splitSectionsByAffiliationPair([s]);
    expect(out).to.have.lengthOf(1);
    expect(out[0].edges.map((e) => e.id)).to.deep.equal(['e1', 'e2']);
  });

  it('splits a heterogeneous section at affiliation-pair boundaries', () => {
    // Merged section spanning three regions: FS,A~FS,B then FS,B~FS,C.
    const s = section('s', [
      edge('e1', 'FS,A', 'FS,B'),
      edge('e2', 'FS,A', 'FS,B'),
      edge('e3', 'FS,B', 'FS,C'),
    ]);
    const out = splitSectionsByAffiliationPair([s]);
    expect(out).to.have.lengthOf(2);
    expect(out[0].edges.map((e) => e.id)).to.deep.equal(['e1', 'e2']);
    expect(out[1].edges.map((e) => e.id)).to.deep.equal(['e3']);
  });

  it('drops empty sections', () => {
    const s = section('s', []);
    const out = splitSectionsByAffiliationPair([s]);
    expect(out).to.have.lengthOf(0);
  });
});

describe('findNonHomogeneousSections', () => {
  it('flags a section whose edges span multiple affiliation-pairs', () => {
    const s = section('s', [edge('e1', 'FS,A', 'FS,B'), edge('e2', 'FS,B', 'FS,C')]);
    const violations = findNonHomogeneousSections([s]);
    expect(violations).to.have.lengthOf(1);
    expect(violations[0].id).to.equal('s');
  });

  it('returns empty for homogeneous sections', () => {
    const s = section('s', [edge('e1', 'FS,A', 'FS,B'), edge('e2', 'FS,A', 'FS,B')]);
    expect(findNonHomogeneousSections([s])).to.have.lengthOf(0);
  });
});
