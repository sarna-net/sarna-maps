import { describe, it, expect } from 'vitest';

/**
 * Mirrors the internal-border predicate in `calculateVoronoiBorders`. An
 * internal (region) border is only legitimate when BOTH sides sit in the same
 * parent territory AND both declare a DIFFERENT region at this level.
 */
function isInternalRegionBorder(
  affiliation1: string,
  affiliation2: string,
  hierarchyLevelIndex: number,
): boolean {
  const levels1 = affiliation1.split(',');
  const levels2 = affiliation2.split(',');
  if (
    levels1.slice(0, hierarchyLevelIndex).join(',') !==
    levels2.slice(0, hierarchyLevelIndex).join(',')
  ) {
    return false;
  }
  const region1 = levels1[hierarchyLevelIndex]?.trim();
  const region2 = levels2[hierarchyLevelIndex]?.trim();
  if (!region1 || !region2) {
    return false;
  }
  return region1 !== region2;
}

describe('internal (region) border filtering', () => {
  it('draws a border between two DIFFERENT declared regions of one faction', () => {
    expect(
      isInternalRegionBorder('FWL,Duchy of Andurien', 'FWL,Principality of Regulus', 1),
    ).to.equal(true);
  });

  it('draws NO border between two systems of the same region', () => {
    expect(
      isInternalRegionBorder('FWL,Duchy of Andurien', 'FWL,Duchy of Andurien', 1),
    ).to.equal(false);
  });

  it('draws NO phantom border where one side declares no region at all', () => {
    // 169 of 355 FWL systems in era 3025 name only the faction. Treating the
    // absent level as an unnamed region drew a border straight through the
    // middle of the faction.
    expect(isInternalRegionBorder('FWL', 'FWL,Duchy of Andurien', 1)).to.equal(false);
    expect(isInternalRegionBorder('FWL,Duchy of Andurien', 'FWL', 1)).to.equal(false);
  });

  it('draws NO border when neither side declares a region', () => {
    expect(isInternalRegionBorder('FWL', 'FWL', 1)).to.equal(false);
  });

  it('ignores an empty-string region level', () => {
    expect(isInternalRegionBorder('FWL,', 'FWL,Duchy of Andurien', 1)).to.equal(false);
  });

  it('never treats a cross-FACTION boundary as an internal border', () => {
    expect(isInternalRegionBorder('FWL,Marik', 'LC,Protectorate of Donegal', 1)).to.equal(false);
  });

  it('applies the same rule at the third hierarchy level', () => {
    expect(
      isInternalRegionBorder(
        'DC,Pesht Military District,Kagoshima Prefecture',
        'DC,Pesht Military District,Ningxia Prefecture',
        2,
      ),
    ).to.equal(true);
    // Sub-region missing on one side => no phantom prefecture border.
    expect(
      isInternalRegionBorder(
        'DC,Pesht Military District',
        'DC,Pesht Military District,Ningxia Prefecture',
        2,
      ),
    ).to.equal(false);
    // Different parent district => handled at level 2, not here.
    expect(
      isInternalRegionBorder(
        'DC,Dieron Military District,Addicks Prefecture',
        'DC,Pesht Military District,Ningxia Prefecture',
        2,
      ),
    ).to.equal(false);
  });
});
