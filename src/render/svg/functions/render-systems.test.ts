import { expect, describe, it } from 'vitest';
import { renderSystems } from './render-systems';
import { Faction, System } from '../../../common';

function factionMap(entries: Array<[string, string, string]>): Record<string, Faction> {
  const map: Record<string, Faction> = {};
  for (const [id, name, color] of entries) {
    map[id] = { id, name, color };
  }
  return map;
}

function system(
  id: string,
  name: string,
  affiliation: string,
  x = 0,
  y = 0,
): System {
  return {
    id,
    name,
    x,
    y,
    fullName: name,
    isCluster: false,
    radiusX: 0,
    radiusY: 0,
    rotation: 0,
    eraAffiliations: [affiliation],
    eraCapitalLevels: [0],
    eraNames: [name],
  };
}

describe('renderSystems disputed rendering', () => {
  it('emits self-filled pie wedges for a disputed D(LC|DC) system, never a shared pattern or default #000', () => {
    const factions = factionMap([
      ['LC', 'Lyran Commonwealth', '#3366cc'],
      ['DC', 'Draconis Combine', '#cc3333'],
    ]);

    const result = renderSystems(
      [system('sys-1', 'Disputed System', 'D(LC|DC)')],
      factions,
      new Map(),
      'light',
      0,
      '',
      1,
    );

    // No shared pattern def is emitted (patterns tile/offset in real renderers).
    expect(result.defs).to.not.contain('system-fill-D-LC-DC');

    // SVG markup must stamp the disputed class on a group holding one wedge
    // per faction plus a border ring.
    expect(result.markup).to.contain('class="system disputed D-LC-DC"');
    expect((result.markup.match(/<path /g) || []).length).to.equal(2);
    expect(result.markup).to.contain('class="disputed-dot-border"');

    // The border ring is styled via CSS; the wedges carry their own fills.
    expect(result.css).to.contain('.system.D-LC-DC .disputed-dot-border');
    expect(result.css).to.contain('fill: none');
    expect(result.css).to.not.contain('url(#system-fill-D-LC-DC)');

    // The disputed class must not rely on a default black fill (#000).
    expect(result.css).to.not.match(/D-LC-DC[^}]*fill:\s*#000/i);
    expect(result.css).to.not.contain('#000000');
  });

  it('does not leave a disputed system styled as default black fill', () => {
    const factions = factionMap([
      ['LC', 'Lyran Commonwealth', '#3366cc'],
      ['DC', 'Draconis Combine', '#cc3333'],
    ]);

    const result = renderSystems(
      [system('sys-2', 'Another Disputed', 'D(LC|DC)')],
      factions,
      new Map(),
      'dark',
      0,
      'region-a',
      1,
    );

    // Prefix mode: the border-ring selector carries the prefix; no pattern url.
    expect(result.markup).to.contain('class="system disputed D-LC-DC"');
    expect(result.css).to.contain('.region-a .system.D-LC-DC .disputed-dot-border');
    expect(result.css).to.not.contain('url(#region-a-system-fill-D-LC-DC)');

    // No black fallback for the disputed class.
    expect(result.css).to.not.match(/D-LC-DC[^}]*fill:\s*#000/i);
  });

  it('default template CSS does not use g.systems prefix (which inflates specificity above faction rules)', () => {
    const factions = factionMap([
      ['LC', 'Lyran Commonwealth', '#3366cc'],
    ]);

    const result = renderSystems(
      [system('sys-3', 'LC System', 'LC')],
      factions,
      new Map(),
      'light',
      0,
      '',
      1,
    );

    // Default rules must NOT use g.systems prefix — doing so gives them
    // specificity (0,2,1) which defeats the faction-specific (0,1,1) rules.
    expect(result.css).to.not.contain('g.systems');
  });

  it('faction color overrides default black fill in without-prefix mode', () => {
    const factions = factionMap([
      ['LC', 'Lyran Commonwealth', '#3366cc'],
    ]);

    const result = renderSystems(
      [system('sys-4', 'LC System', 'LC')],
      factions,
      new Map(),
      'dark',
      0,
      '',
      1,
    );

    // The default rule must use lower specificity than the faction rule.
    // Template: .system, .cluster { fill: #000; ... } → specificity (0,1,0)
    // Faction:  .system.LC { fill: #3366cc }              → specificity (0,1,1)
    expect(result.css).to.contain('.system, .cluster { fill: #000');
    expect(result.css).to.contain('.system.LC');
    expect(result.css).to.contain('#3366cc');
  });

  it('faction color overrides default black fill in layer-prefixed mode', () => {
    const factions = factionMap([
      ['LC', 'Lyran Commonwealth', '#3366cc'],
    ]);

    const result = renderSystems(
      [system('sys-5', 'LC System', 'LC')],
      factions,
      new Map(),
      'dark',
      0,
      'innersphere',
      1,
    );

    // With prefix: default becomes .innersphere .system (0,2,0)
    // faction becomes .innersphere .system.LC (0,2,1) — faction wins.
    expect(result.css).to.contain('.innersphere .system, .cluster { fill: #000');
    expect(result.css).to.contain('.innersphere .system.LC');
    expect(result.css).to.contain('#3366cc');
  });
});
