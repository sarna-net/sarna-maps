import { expect, describe, it } from 'vitest';
import { canonicalAffiliation } from './affiliation';

describe('canonicalAffiliation', () => {

  it('should extract simple affiliations', () => {
    expect(canonicalAffiliation('P')).to.equal('P');
    expect(canonicalAffiliation(' P')).to.equal('P');
    expect(canonicalAffiliation('P ')).to.equal('P');
    expect(canonicalAffiliation('PQR')).to.equal('PQR');
  });

  it('should only consider the first section of comma affiliations', () => {
    expect(canonicalAffiliation('P,Q,R')).to.equal('P');
    expect(canonicalAffiliation(' P,  Q , R')).to.equal('P');
    expect(canonicalAffiliation('P ,Q ,R ')).to.equal('P');
    expect(canonicalAffiliation('PQR,SVW')).to.equal('PQR');
  });

  it('should properly discard abandoned and undiscovered systems', () => {
    expect(canonicalAffiliation('A')).to.equal('');
    expect(canonicalAffiliation('U')).to.equal('');
    expect(canonicalAffiliation('A(D,F)')).to.equal('');
    expect(canonicalAffiliation('U(D,F)')).to.equal('');
    expect(canonicalAffiliation('A,B,C')).to.equal('');
    expect(canonicalAffiliation('U,V,W')).to.equal('');
  });

  it('should return the parenthesized faction for abandoned systems with controlling faction', () => {
    expect(canonicalAffiliation('A(LC)', { ignoredAffiliations: [] })).to.equal('LC');
    expect(canonicalAffiliation('A(FS),DC', { ignoredAffiliations: [] })).to.equal('FS');
  });

  it('should properly discard hidden systems in ignore mode', () => {
    expect(canonicalAffiliation('F(H)')).to.equal('');
    expect(canonicalAffiliation('F(H),G,P')).to.equal('');
    expect(canonicalAffiliation('H')).to.equal('H');
  });

  it('should properly return the main faction for hidden systems in faction mode', () => {
    expect(canonicalAffiliation('F(H)', { parseHiddenSystemsAs: 'faction' })).to.equal('F');
    expect(canonicalAffiliation('F(H),G,P', { parseHiddenSystemsAs: 'faction' })).to.equal('F');
  });

  it('should properly return the main faction plus the hidden string for hidden systems in full mode', () => {
    expect(canonicalAffiliation('F(H)', { parseHiddenSystemsAs: 'full' })).to.equal('F(H)');
    expect(canonicalAffiliation('F(H),G,P', { parseHiddenSystemsAs: 'full' })).to.equal('F(H)');
  });

  it('should properly return disputed systems', () => {
    expect(canonicalAffiliation('D(DC,LC)')).to.equal('D-DC-LC');
  });

  it('should normalize disputed keys with pipe separator inside parens', () => {
    expect(canonicalAffiliation('D(LC|DC)')).to.equal('D-LC-DC');
  });

  it('should normalize disputed keys with slash separator inside parens', () => {
    expect(canonicalAffiliation('D(LC/DC)')).to.equal('D-LC-DC');
  });

  it('should properly return additional levels of affiliation (comma format)', () => {
    expect(canonicalAffiliation('LC,Protectorate of Donegal', { levels: 2 }))
      .to.equal('LC,Protectorate of Donegal');
    expect(canonicalAffiliation('LC,Protectorate of Donegal,Alarion Province', { levels: 2 }))
      .to.equal('LC,Protectorate of Donegal');
    expect(canonicalAffiliation('LC,Protectorate of Donegal,Alarion Province', { levels: 3 }))
      .to.equal('LC,Protectorate of Donegal,Alarion Province');
    expect(canonicalAffiliation('LC,Protectorate of Donegal', { levels: 3 }))
      .to.equal('LC,Protectorate of Donegal');
  });

  it('should extract v3 pipe levels correctly', () => {
    expect(canonicalAffiliation('DC|Pesht Military District|Ningxia Prefecture', { levels: 1 }))
      .to.equal('DC');
    expect(canonicalAffiliation('DC|Pesht Military District|Ningxia Prefecture', { levels: 2 }))
      .to.equal('DC,Pesht Military District');
    expect(canonicalAffiliation('DC|Pesht Military District|Ningxia Prefecture', { levels: 3 }))
      .to.equal('DC,Pesht Military District,Ningxia Prefecture');
  });

  it('should remove comma-separated capital tokens when requested', () => {
    expect(canonicalAffiliation('LC,Protectorate of Donegal,major capital,Alarion Province', { removeCapitalTokens: true, levels: 1 }))
      .to.equal('LC');
    expect(canonicalAffiliation('LC,Protectorate of Donegal,major capital,Alarion Province', { removeCapitalTokens: true, levels: 3 }))
      .to.equal('LC,Protectorate of Donegal,Alarion Province');
  });

  it('should remove pipe-separated v3 capital tokens when requested', () => {
    expect(canonicalAffiliation('FWL|Principality of Regulus|District Capital', { removeCapitalTokens: true, levels: 1 }))
      .to.equal('FWL');
    expect(canonicalAffiliation('FWL|Principality of Regulus|District Capital', { removeCapitalTokens: true, levels: 2 }))
      .to.equal('FWL,Principality of Regulus');
  });

  it('should handle v3 pipe format without systemId/eraIndex', () => {
    expect(canonicalAffiliation('HL|Region 1')).to.equal('HL');
    expect(canonicalAffiliation('LC|Region 5')).to.equal('LC');
    expect(canonicalAffiliation('FS|Region 3,Some Region')).to.equal('FS');
  });

  it('should handle mixed pipe and comma formats', () => {
    expect(canonicalAffiliation('DC|Region 10')).to.equal('DC');
    expect(canonicalAffiliation('FWL,Free Worlds League')).to.equal('FWL');
    expect(canonicalAffiliation('MOC|Markov Commonwealth')).to.equal('MOC');
  });

  it('should accept syntheticPoint without systemId/eraIndex', () => {
    expect(canonicalAffiliation('DC|Region 10', { syntheticPoint: true })).to.equal('DC');
    expect(canonicalAffiliation('LC|Region 5', { syntheticPoint: true })).to.equal('LC');
  });

  it('should return EMPTY_FACTION sentinel verbatim', () => {
    expect(canonicalAffiliation('EMPTY')).to.equal('EMPTY');
  });

  describe('5-level affiliation hierarchy (faction + 3 regions + capital)', () => {
    const fourLevel = 'FS|Periphery March|June Operational Area|Islamabad Combat Region';
    const fiveLevel = 'FS|Crucis March|Chirikof Operational Area|Remagen Combat Region|Region Capital';

    it('should extract all 4 levels from four-level pipe string', () => {
      expect(canonicalAffiliation(fourLevel, { levels: 1 })).to.equal('FS');
      expect(canonicalAffiliation(fourLevel, { levels: 2 })).to.equal('FS,Periphery March');
      expect(canonicalAffiliation(fourLevel, { levels: 3 })).to.equal('FS,Periphery March,June Operational Area');
      expect(canonicalAffiliation(fourLevel, { levels: 4 })).to.equal('FS,Periphery March,June Operational Area,Islamabad Combat Region');
    });

    it('should extract all 5 levels from five-level pipe string (with capital)', () => {
      expect(canonicalAffiliation(fiveLevel, { levels: 1 })).to.equal('FS');
      expect(canonicalAffiliation(fiveLevel, { levels: 2 })).to.equal('FS,Crucis March');
      expect(canonicalAffiliation(fiveLevel, { levels: 3 })).to.equal('FS,Crucis March,Chirikof Operational Area');
      expect(canonicalAffiliation(fiveLevel, { levels: 4 })).to.equal('FS,Crucis March,Chirikof Operational Area,Remagen Combat Region');
      expect(canonicalAffiliation(fiveLevel, { levels: 5 })).to.equal('FS,Crucis March,Chirikof Operational Area,Remagen Combat Region,Region Capital');
    });

    it('should strip capital token from 5-level string when removeCapitalTokens is true', () => {
      expect(canonicalAffiliation(fiveLevel, { levels: 5, removeCapitalTokens: true })).to.equal('FS,Crucis March,Chirikof Operational Area,Remagen Combat Region');
      expect(canonicalAffiliation(fiveLevel, { levels: 4, removeCapitalTokens: true })).to.equal('FS,Crucis March,Chirikof Operational Area,Remagen Combat Region');
      expect(canonicalAffiliation(fiveLevel, { levels: 1, removeCapitalTokens: true })).to.equal('FS');
    });

  });

});
