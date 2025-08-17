import { expect, describe, it } from 'vitest';
import { extractBorderStateAffiliation } from './extract-border-state-affiliation';

describe('extractBorderStateAffiliation', () => {

  it('should extract simple affiliations', () => {
    expect(extractBorderStateAffiliation('P')).to.equal('P');
    expect(extractBorderStateAffiliation(' P')).to.equal('P');
    expect(extractBorderStateAffiliation('P ')).to.equal('P');
    expect(extractBorderStateAffiliation('PQR')).to.equal('PQR');
  });

  it('should only consider the first section of border affiliations', () => {
    expect(extractBorderStateAffiliation('P,Q,R')).to.equal('P');
    expect(extractBorderStateAffiliation(' P,  Q , R')).to.equal('P');
    expect(extractBorderStateAffiliation('P ,Q ,R ')).to.equal('P');
    expect(extractBorderStateAffiliation('PQR,SVW')).to.equal('PQR');
  });

  it('should properly discard abandoned and undiscovered systems', () => {
    expect(extractBorderStateAffiliation('A')).to.equal('');
    expect(extractBorderStateAffiliation('U')).to.equal('');
    expect(extractBorderStateAffiliation('A(D,F)')).to.equal('');
    expect(extractBorderStateAffiliation('U(D,F)')).to.equal('');
    expect(extractBorderStateAffiliation('A,B,C')).to.equal('');
    expect(extractBorderStateAffiliation('U,V,W')).to.equal('');
  });

  it('should properly discard hidden systems in ignore mode', () => {
    expect(extractBorderStateAffiliation('F(H)')).to.equal('');
    expect(extractBorderStateAffiliation('F(H),G,P')).to.equal('');
    expect(extractBorderStateAffiliation('H')).to.equal('H');
  });

  it('should properly return the main faction for hidden systems in faction mode', () => {
    expect(extractBorderStateAffiliation('F(H)', [], 'faction')).to.equal('F');
    expect(extractBorderStateAffiliation('F(H),G,P', [], 'faction')).to.equal('F');
  });

  it('should properly return the main faction plus the hidden string for hidden systems in full mode', () => {
    expect(extractBorderStateAffiliation('F(H)', [], 'full')).to.equal('F(H)');
    expect(extractBorderStateAffiliation('F(H),G,P', [], 'full')).to.equal('F(H)');
  });

  it('should properly return disputed systems', () => {
    expect(extractBorderStateAffiliation('D(DC,LC)')).to.equal('D-DC-LC');
  });
});
