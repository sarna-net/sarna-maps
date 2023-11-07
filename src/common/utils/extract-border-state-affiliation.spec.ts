import { expect } from 'chai';
import 'mocha';
import { extractBorderStateAffiliation } from './extract-border-state-affiliation';

describe('extractBorderStateAffiliation', () => {

  it('should properly recognize simple affiliations', () => {
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

  it('should properly discard hidden systems', () => {
    expect(extractBorderStateAffiliation('F(H)')).to.equal('');
    expect(extractBorderStateAffiliation('F(H),G,P')).to.equal('');
    expect(extractBorderStateAffiliation('H')).to.equal('H');
  });

  it('should properly return disputed systems', () => {
    expect(extractBorderStateAffiliation('D(DC,LC)')).to.equal('D-DC-LC');
  });
});
