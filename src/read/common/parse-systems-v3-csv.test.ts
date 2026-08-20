import { describe, it, expect } from 'vitest';
import { parseV3CapitalAndRegion, parseSystemsV3Csv } from './parse-systems-v3-csv';
import { Era } from '../../common';

const eras: Array<Era> = [
  { index: 0, name: '2271', year: 2271 },
  { index: 1, name: '3050a', year: 3050 },
];

describe('parseV3CapitalAndRegion', () => {
  it('extracts capital level and region from a fully-formed 4-token affiliation', () => {
    const result = parseV3CapitalAndRegion('DC|Pesht Military District|Kagoshima Prefecture|National Capital');
    expect(result.capitalLevel).toBe(1);
    expect(result.region).toBe('Kagoshima Prefecture');
  });

  it('detects a 2-token capital-only affiliation (e.g. `AuC|National Capital`)', () => {
    const result = parseV3CapitalAndRegion('AuC|National Capital');
    expect(result.capitalLevel).toBe(1);
    expect(result.region).toBe('');
  });

  it('treats the first token of a 2-token capital affiliation as the faction, not the region', () => {
    expect(parseV3CapitalAndRegion('AuC|National Capital').region).toBe('');
  });

  it('detects a 3-token capital affiliation (e.g. `FWL|Duchy of Tamarind|Region Capital`)', () => {
    const result = parseV3CapitalAndRegion('FWL|Duchy of Tamarind|Region Capital');
    expect(result.capitalLevel).toBe(3);
    expect(result.region).toBe('Duchy of Tamarind');
  });

  it('detects a 5-token affiliation with a trailing capital descriptor', () => {
    const result = parseV3CapitalAndRegion('FCL|Donegal March|Alarion Operational Area|Region 1|District Capital');
    expect(result.capitalLevel).toBe(3);
    expect(result.region).toBe('Region 1');
  });

  it('maps major and minor capitals to the correct levels', () => {
    expect(parseV3CapitalAndRegion('FS|Crucis March|New Avalon|Major Capital').capitalLevel).toBe(2);
    expect(parseV3CapitalAndRegion('LC|Protectorate of Donegal|Bolan Province|Minor Capital').capitalLevel).toBe(3);
  });

  it('treats the trailing token as the region when it is not a capital descriptor', () => {
    expect(parseV3CapitalAndRegion('LC|Protectorate of Donegal|Bolan Province').capitalLevel).toBe(0);
    expect(parseV3CapitalAndRegion('LC|Protectorate of Donegal|Bolan Province').region).toBe('Bolan Province');
    expect(parseV3CapitalAndRegion('AuC|Marik Commonwealth').capitalLevel).toBe(0);
    expect(parseV3CapitalAndRegion('AuC|Marik Commonwealth').region).toBe('Marik Commonwealth');
  });

  it('returns level 0 and empty region for unknown or empty affiliations', () => {
    expect(parseV3CapitalAndRegion('')).toEqual({ capitalLevel: 0, region: '' });
    expect(parseV3CapitalAndRegion('U')).toEqual({ capitalLevel: 0, region: '' });
    expect(parseV3CapitalAndRegion('LC')).toEqual({ capitalLevel: 0, region: '' });
  });
});

describe('parseSystemsV3Csv eraAffiliations', () => {
  const header = ['systemID', 'systemName', 'x', 'y', 'size', '2271', '3050a'];

  it('parses systems with pipe-delimited v3 affiliations', () => {
    const rows = [
      header,
      ['1', 'New Avalon', '0', '0', '1|1|0', 'U', 'FS|Crucis March|New Avalon|National Capital'],
      ['2', 'Atreus', '1', '1', '1|1|0', 'U', 'AuC|National Capital'],
      ['3', 'Tamarind', '2', '2', '1|1|0', 'U', 'FWL|Duchy of Tamarind|Region Capital'],
    ];

    const systems = parseSystemsV3Csv(rows as Array<Array<string>>, eras);

    expect(systems).toHaveLength(3);
    // eraAffiliations are preserved as-is
    expect(systems[0].eraAffiliations).toEqual(['U', 'FS|Crucis March|New Avalon|National Capital']);
    expect(systems[1].eraAffiliations).toEqual(['U', 'AuC|National Capital']);
    expect(systems[2].eraAffiliations).toEqual(['U', 'FWL|Duchy of Tamarind|Region Capital']);
  });

  it('defaults to unaffiliated for missing era columns', () => {
    const rows = [
      header,
      ['2', 'Nowhere', '1', '1', '1|1|0', 'U', 'U'],
    ];

    const systems = parseSystemsV3Csv(rows as Array<Array<string>>, eras);

    expect(systems[0].eraAffiliations).toEqual(['U', 'U']);
  });
});
