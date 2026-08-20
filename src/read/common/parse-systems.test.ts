import { expect, describe, it } from 'vitest';
import { parseSystems } from './parse-systems';

describe('parseSystems v1 format', () => {

  const v1Eras2 = [
    { index: 0, name: 'Star League', year: 2800 },
    { index: 1, name: '3050', year: 3050 },
  ];

it('should parse v1 comma-separated era affiliations', () => {
    const rows: Array<Array<string>> = [
      ['', '', '', '', '', '', '', '', '', ''],
      ['id', 'systemname', 'alternatename', 'x', 'y', 'size', 'distance (ly)', 'era_0'],
      ['1', 'Bolan', '', '10', '20', '1,1,0', '10', 'LC,Protectorate of Donegal,District of Donegal'],
    ];

    const systems = parseSystems(rows, v1Eras2);

    expect(systems).to.have.length(1);
    expect(systems[0].eraAffiliations[0]).to.equal('LC,Protectorate of Donegal,District of Donegal');
    expect(systems[0].eraAffiliations[1]).to.equal('U');
  });

it('should handle abandoned systems in v1 format', () => {
    const rows: Array<Array<string>> = [
      ['', '', '', '', '', '', '', '', '', ''],
      ['id', 'systemname', 'alternatename', 'x', 'y', 'size', 'distance (ly)', 'era_0', 'era_1'],
      ['1', 'Ghost Bear', '', '50', '60', '1,1,0', '20', 'CGB,Clan Ghost Bear', 'CGB,Clan Ghost Bear'],
    ];

    const systems = parseSystems(rows, v1Eras2);

    expect(systems).to.have.length(1);
    expect(systems[0].eraAffiliations[0]).to.equal('CGB,Clan Ghost Bear');
    expect(systems[0].eraAffiliations[1]).to.equal('U');
  });

  it('should handle CIZ3A and similar codes in v1 format', () => {
    const rows: Array<Array<string>> = [
      ['', '', '', '', '', '', '', '', '', ''],
      ['id', 'systemname', 'alternatename', 'x', 'y', 'size', 'distance (ly)', 'era_0'],
      ['1', 'Periphery', '', '100', '100', '1,1,0', '50', 'CIZ3A'],
    ];

    const systems = parseSystems(rows, v1Eras2);

    expect(systems).to.have.length(1);
    expect(systems[0].eraAffiliations[0]).to.equal('CIZ3A');
  });

  it('should handle multi-region v1 format', () => {
    const rows: Array<Array<string>> = [
      ['', '', '', '', '', '', '', '', '', ''],
      ['id', 'systemname', 'alternatename', 'x', 'y', 'size', 'distance (ly)', 'era_0'],
      ['1', 'New Avalon', '', '0', '0', '1,1,0', '0', 'FS,Crucis March,New Avalon'],
    ];

    const systems = parseSystems(rows, v1Eras2);

    expect(systems).to.have.length(1);
    expect(systems[0].eraAffiliations[0]).to.equal('FS,Crucis March,New Avalon');
  });

  it('should parse v1 spreadsheet system data with various affiliation formats', () => {
    const rows: Array<Array<string>> = [
      ['', '', '', '', '', '', '', '', '', ''],
      ['id', 'systemname', 'alternatename', 'x', 'y', 'size', 'distance (ly)', 'era_0', 'era_1', ''],
      ['1', 'System1', '', '10', '10', '1,1,0', '5', 'LC,Protectorate of Donegal,Bolan Province', 'LC,Protectorate of Donegal,Bolan Province', ''],
      ['2', 'System2', '', '20', '20', '1,1,0', '5', 'LC,Protectorate of Donegal,District of Donegal', 'LC,Protectorate of Donegal,District of Donegal', ''],
      ['3', 'System3', '', '30', '30', '1,1,0', '5', 'CC,Capella Commonality,Region 4', 'CC,Capella Commonality,Region 4', ''],
      ['4', 'System4', '', '40', '40', '1,1,0', '5', 'FS,Crucis March,New Avalon Combat Region', 'FS,Crucis March,New Avalon Combat Region', ''],
      ['5', 'System5', '', '50', '50', '1,1,0', '5', 'FWL,Marik Commonwealth', 'FWL,Marik Commonwealth', ''],
      ['6', 'System6', '', '60', '60', '1,1,0', '5', '', '', ''],
      ['7', 'System7', '', '70', '70', '1,1,0', '5', 'A', 'A', ''],
      ['8', 'System8', '', '80', '80', '1,1,0', '5', 'DC,Dieron Military District,Al Na ir Prefecture', 'DC,Dieron Military District,Al Na ir Prefecture', ''],
    ];

    const systems = parseSystems(rows, v1Eras2);

    expect(systems).to.have.length(8);

    expect(systems[0].eraAffiliations[0]).to.equal('LC,Protectorate of Donegal,Bolan Province');
    expect(systems[1].eraAffiliations[0]).to.equal('LC,Protectorate of Donegal,District of Donegal');
    expect(systems[2].eraAffiliations[0]).to.equal('CC,Capella Commonality,Region 4');
    expect(systems[3].eraAffiliations[0]).to.equal('FS,Crucis March,New Avalon Combat Region');
    expect(systems[4].eraAffiliations[0]).to.equal('FWL,Marik Commonwealth');

    expect(systems[6].eraAffiliations[0]).to.equal('A');
    expect(systems[6].eraAffiliations[1]).to.equal('U');

    expect(systems[7].eraAffiliations[0]).to.equal('DC,Dieron Military District,Al Na ir Prefecture');
  });

  it('should warn and default to U when era column is missing', () => {
    const erasMissing = [
      { index: 0, name: 'Star League', year: 2800 },
      { index: 1, name: '3050', year: 3050 },
    ];
    const rows: Array<Array<string>> = [
      ['', '', '', '', '', '', ''],
      ['id', 'systemname', 'alternatename', 'x', 'y', 'size', 'era_0'],
      ['1', 'Bolan', '', '10', '20', '1,1,0', 'LC'],
    ];

    const systems = parseSystems(rows, erasMissing);

    expect(systems).to.have.length(1);
    expect(systems[0].eraAffiliations[0]).to.equal('LC');
    expect(systems[0].eraAffiliations[1]).to.equal('U');
  });

it('should fallback to v1 pattern when v3 detection finds 0 era columns', () => {
    const eras = [
      { index: 0, name: 'Star League', year: 2800 },
      { index: 1, name: '3050', year: 3050 },
    ];
    const rows: Array<Array<string>> = [
      ['', '', '', '', '', '', '', ''],
      ['id', 'systemname', 'alternatename', 'x', 'y', 'size', 'distance (ly)', 'era_0', 'era_1'],
      ['1', 'Taurius', '', '100', '200', '1,1,0', '10', 'LC,Taurian Concordat', 'FS,FedSuns'],
    ];
    const systems = parseSystems(rows, eras);

    expect(systems).to.have.length(1);
    expect(systems[0].eraAffiliations[0]).to.equal('FS,FedSuns');
    expect(systems[0].eraAffiliations[1]).to.equal('U');
  });
});