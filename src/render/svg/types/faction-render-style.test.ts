import { expect, describe, it } from 'vitest';
import { resolveFactionRenderStyle } from './faction-render-style';
import { Faction } from '../../../common';

function factionMap(entries: Array<[string, string]>): Record<string, Faction> {
  const map: Record<string, Faction> = {};
  for (const [id, name] of entries) {
    map[id] = { id, name, color: '#123456' };
  }
  return map;
}

describe('resolveFactionRenderStyle', () => {
  it('resolves a mixed-case faction id from an upper-cased key', () => {
    const map = factionMap([['AuC', 'Aurigan Coalition'], ['LC', 'Lyran Commonwealth']]);
    const style = resolveFactionRenderStyle({ factionKey: 'AUC', factionMap: map });
    expect(style.faction).to.not.be.null;
    expect(style.faction?.id).to.equal('AuC');
  });

  it('resolves an abandoned-world key A(FACTION) to the inner faction', () => {
    const map = factionMap([['CFG', 'Capellan Confederation']]);
    const style = resolveFactionRenderStyle({ factionKey: 'A(CFG)', factionMap: map });
    expect(style.faction).to.not.be.null;
    expect(style.faction?.id).to.equal('CFG');
  });

  it('resolves a parenthesized disputed key D(F1|F2) to its sub-factions', () => {
    const map = factionMap([['LC', 'Lyran Commonwealth'], ['DC', 'Draconis Combine']]);
    const style = resolveFactionRenderStyle({ factionKey: 'D(LC|DC)', factionMap: map });
    expect(style.isDisputed).to.equal(true);
    expect(style.disputedFactionIds).to.deep.equal(['LC', 'DC']);
    expect(style.faction).to.be.null;
  });

  it('returns no faction for an unknown key instead of a false match', () => {
    const map = factionMap([['LC', 'Lyran Commonwealth']]);
    const style = resolveFactionRenderStyle({ factionKey: 'ZZZ', factionMap: map });
    expect(style.faction).to.be.null;
  });
});
