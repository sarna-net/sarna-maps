import { expect, describe, it } from 'vitest';
import { parseFactions } from './parse-factions';

describe('parseFactions v1 format', () => {

  it('should parse v1 factions with URL columns ignored', () => {
    const rows: Array<Array<string>> = [
      ['factionid', 'factionname', 'color', 'startyear', 'endyear', 'https://www.sarna.net/wiki/ComStar'],
      ['CS', 'ComStar', '#F3F3F3', '2788', '', 'https://www.sarna.net/wiki/ComStar'],
      ['CWV', 'Clan Wolverine', '#7B6248', '2807', '2823', 'https://www.sarna.net/wiki/Clan_Wolverine'],
      ['C', 'Clans', '#8E926F', '2807', '', ''],
    ];

    const factions = parseFactions(rows);

    expect(factions).to.have.length(3);
    expect(factions[0].id).to.equal('CS');
    expect(factions[0].name).to.equal('ComStar');
    expect(factions[0].color).to.equal('#F3F3F3');
    expect(factions[0].founding).to.equal(2788);
    expect(factions[0].dissolution).to.be.undefined;

    expect(factions[1].id).to.equal('CWV');
    expect(factions[1].dissolution).to.equal(2823);

    expect(factions[2].id).to.equal('C');
  });

  it('should normalize (X) to X for v1/v3 compatibility', () => {
    const rows: Array<Array<string>> = [
      ['factionid', 'factionname', 'color', 'startyear', 'endyear'],
      ['(X)', 'Unknown Faction', '#999999', '2700', ''],
    ];

    const factions = parseFactions(rows);

    expect(factions).to.have.length(1);
    expect(factions[0].id).to.equal('X');
  });

  it('should parse v3 format with factioncolor column', () => {
    const rows: Array<Array<string>> = [
      ['factionid', 'factionname', 'factioncolor', 'startyear', 'endyear', 'sarnafactionlink'],
      ['LC', 'Lyran Commonwealth', '#FF0000', '2805', '', 'https://sarna.net/wiki/LC'],
    ];

    const factions = parseFactions(rows);

    expect(factions).to.have.length(1);
    expect(factions[0].id).to.equal('LC');
    expect(factions[0].color).to.equal('#FF0000');
  });

  it('should parse the exact-spec mixed-case header (factionColor)', () => {
    const rows: Array<Array<string>> = [
      ['factionID', 'factionName', 'factionColor', 'startYear', 'endYear'],
      ['LC', 'Lyran Commonwealth', '#FF0000', '2805', '2765'],
    ];

    const factions = parseFactions(rows);

    expect(factions).to.have.length(1);
    expect(factions[0].id).to.equal('LC');
    expect(factions[0].name).to.equal('Lyran Commonwealth');
    expect(factions[0].color).to.equal('#FF0000');
    expect(factions[0].founding).to.equal(2805);
    expect(factions[0].dissolution).to.equal(2765);
  });

  it('should handle missing optional columns', () => {
    const rows: Array<Array<string>> = [
      ['factionid', 'factionname', 'color'],
      ['FS', 'Federated Suns', '#0000FF'],
    ];

    const factions = parseFactions(rows);

    expect(factions).to.have.length(1);
    expect(factions[0].founding).to.be.undefined;
    expect(factions[0].dissolution).to.be.undefined;
  });

  it('should parse v1 spreadsheet format with comma separators', () => {
    const rows: Array<Array<string>> = [
      ['factionid', 'factionname', 'color', 'startyear', 'endyear', 'https://www.sarna.net/wiki/ComStar'],
      ['FS', 'Federated Suns', '#FED600', '2317', '', 'https://www.sarna.net/wiki/Federated_Suns'],
      ['DC', 'Draconis Combine', '#EC2027', '2319', '', 'https://www.sarna.net/wiki/Draconis_Combine'],
      ['LC', 'Lyran Commonwealth', '#1861A3', '2341', '', 'https://www.sarna.net/wiki/Lyran_Commonwealth'],
      ['CC', 'Capellan Confederation', '#1D8542', '2367', '', 'https://www.sarna.net/wiki/Capellan_Confederation'],
      ['AuC', 'Aurigan Coalition', '#DB472D', '2910', '', 'https://www.sarna.net/wiki/Aurigan_Coalition'],
      ['FWL', 'Free Worlds League', '#A55EA6', '2271', '', 'https://www.sarna.net/wiki/Free_Worlds_League'],
      ['A', 'Abandoned', '#202020', '', '', ''],
    ];

    const factions = parseFactions(rows);

    expect(factions).to.have.length(7);

    expect(factions[0].id).to.equal('FS');
    expect(factions[0].name).to.equal('Federated Suns');
    expect(factions[0].color).to.equal('#FED600');
    expect(factions[0].founding).to.equal(2317);
    expect(factions[0].dissolution).to.be.undefined;

    expect(factions[1].id).to.equal('DC');
    expect(factions[1].founding).to.equal(2319);

    expect(factions[2].id).to.equal('LC');
    expect(factions[2].founding).to.equal(2341);

    expect(factions[3].id).to.equal('CC');
    expect(factions[3].founding).to.equal(2367);

    expect(factions[4].id).to.equal('AuC');
    expect(factions[4].founding).to.equal(2910);

    expect(factions[5].id).to.equal('FWL');
    expect(factions[5].founding).to.equal(2271);

    expect(factions[6].id).to.equal('A');
    expect(factions[6].name).to.equal('Abandoned');
    expect(factions[6].color).to.equal('#202020');
    expect(factions[6].founding).to.be.undefined;
  });
});