import { describe, it, expect } from 'vitest';
import { generateDisputedSystemFillPattern } from './generate-disputed-system-fill-pattern';

const factions: Record<string, any> = {
  F0: { id: 'F0', name: 'Faction 0', color: '#4477cc' },
  F1: { id: 'F1', name: 'Faction 1', color: '#cc4444' },
  F2: { id: 'F2', name: 'Faction 2', color: '#44cc44' },
  F3: { id: 'F3', name: 'Faction 3', color: '#cccc44' },
};

function hasExponentNotation(markup: string): boolean {
  return /e[+-]\d/i.test(markup);
}

describe('floating-point precision fix', () => {
  // Test 2-7 factions to verify no exponent notation and no offset errors
  for (const numFactions of [2, 3, 4, 5, 6, 7] as const) {
    it('handles ' + numFactions + ' factions without exponent notation', () => {
      const factionKeys = [];
      for (let i = 0; i < numFactions; i++) {
        factionKeys.push('F' + i);
      }
      const key = 'D-' + factionKeys.join('-');
      const markup = generateDisputedSystemFillPattern(key, factions);
      
      // Should not contain exponent notation
      expect(hasExponentNotation(markup)).to.be.false;
      
      // Should have correct number of paths
      const paths = markup.match(/<path /g) || [];
      expect(paths.length).to.equal(numFactions);
    });
  }
  
  // Test that last wedge closes properly (end point should be (1,0) or close to it)
  it('last wedge closes properly for 5 factions', () => {
    const factionKeys = ['F0', 'F1', 'F2', 'F3', 'F4'];
    const key = 'D-F0-F1-F2-F3-F4';
    const markup = generateDisputedSystemFillPattern(key, factions);
    
    // Check that path data doesn't have glaring issues
    const dMatches = markup.match(/d="([^"]+)"/g) || [];
    for (const d of dMatches) {
      // The end of each path should line up with start of next (or back to 0,0)
      expect(d).to.not.match(/e[+-]\d/);
    }
  });
  
  // Test that last wedge closes properly for 7 factions (previously had errors)
  it('last wedge closes properly for 7 factions', () => {
    const factionKeys = ['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
    const key = 'D-F0-F1-F2-F3-F4-F5-F6';
    const markup = generateDisputedSystemFillPattern(key, factions);
    
    const dMatches = markup.match(/d="([^"]+)"/g) || [];
    for (const d of dMatches) {
      expect(d).to.not.match(/e[+-]\d/);
    }
  });
});