import { describe, it, expect } from 'vitest';
import { generateDisputedSystemFillPattern } from './generate-disputed-system-fill-pattern';
import { sanitizeFactionToken } from './sanitize-faction-token';
import { Faction } from '../../../common';

const factions: Record<string, Faction> = {
  LC: { id: 'LC', name: 'Lyran Commonwealth', color: '#4477cc' },
  DC: { id: 'DC', name: 'Draconis Combine', color: '#cc4444' },
  CC: { id: 'CC', name: 'Capellan Confederation', color: '#44cc44' },
  FS: { id: 'FS', name: 'Federated Suns', color: '#cccc44' },
};

const PI = Math.PI;

/**
 * Signed angular span actually drawn by an `A ... sweep-flag` arc, following
 * the SVG F.6.5 endpoint-to-center conversion: the signed difference is
 * normalised to (-π, π] and then forced to match the sweep flag's sign.
 */
function sweptSpan(startAngle: number, endAngle: number, sweep: number): number {
  let d = endAngle - startAngle;
  while (d > PI) d -= 2 * PI;
  while (d <= -PI) d += 2 * PI;
  if (!sweep && d > 0) d -= 2 * PI;
  else if (sweep && d < 0) d += 2 * PI;
  return d;
}

describe('generateDisputedSystemFillPattern', () => {
  it('emits a group whose class carries the sanitized faction key', () => {
    for (const key of ['D-LC-DC', 'D-CC/FS', 'D(CC/FS)', 'D-CC-FS']) {
      const markup = generateDisputedSystemFillPattern(key, factions);
      expect(markup, `class for ${key}`).to.contain(`class="system disputed ${sanitizeFactionToken(key)}"`);
    }
  });

  it('produces a class that is a legal SVG/CSS token (no illegal characters)', () => {
    const markup = generateDisputedSystemFillPattern('D-CC/FS', factions);
    const factionToken = (markup.match(/class="[^"]+ ([^"]+)"/)?.[1] || '').trim();

    expect(factionToken).to.contain('D-CC_2fFS');
    expect(factionToken).to.not.contain('/');
    expect(factionToken).to.not.contain('(');
    expect(factionToken).to.not.contain(')');
    expect(factionToken).to.match(/^[A-Za-z0-9_-]+$/);
  });

  it('draws the wedges at the given center and radius', () => {
    const markup = generateDisputedSystemFillPattern('D-LC-DC', factions, 10, -20, 3);

    expect(markup).to.contain('M10,-20');
    expect(markup).to.contain('A3,3,0,0,1,');
    expect(markup).to.contain('<circle class="disputed-dot-border" cx="10" cy="-20" r="3"');
  });

  it('emits one closed wedge per faction, in that faction colour', () => {
    const markup = generateDisputedSystemFillPattern('D-LC-DC', factions);
    const paths = markup.match(/<path /g) || [];

    expect(paths.length).to.equal(2);
    // Valid SVG attribute syntax: fill="<color>" (the old fill:<color> colon
    // form was an invalid attribute that parsers silently discarded).
    expect(markup).to.contain('fill="#4477cc"');
    expect(markup).to.contain('fill="#cc4444"');
    // Every wedge must be explicitly closed to center (0,0), else the fill leaks.
    expect((markup.match(/L0,0Z/g) || []).length).to.equal(2);
  });

  it('writes plain decimal coordinates (never exponent notation)', () => {
    // cos/sin of the slice angles yield values like 6.12e-17; SVG path parsers
    // are not required to accept exponent notation.
    for (const key of ['D-LC-DC', 'D-LC-DC-CC', 'D-LC-DC-CC-FS']) {
      const markup = generateDisputedSystemFillPattern(key, factions);
      const d = markup.match(/ d="([^"]+)"/g) || [];
      for (const segment of d) {
        expect(segment, `${key}: ${segment}`).to.not.match(/e[+-]\d/i);
      }
    }
  });

  it('sets the large-arc flag only for slices bigger than a half circle', () => {
    // Three factions => 120 degrees per slice => short arc (large-arc flag 0).
    const three = generateDisputedSystemFillPattern('D-LC-DC-CC', factions, 0, 0, 1);
    expect(three).to.contain('A1,1,0,0,1,');
    expect(three).to.not.contain('A1,1,0,1,1,');
  });

  it('divides the circle evenly for 2, 3 and 4 factions', () => {
    expect((generateDisputedSystemFillPattern('D-LC-DC', factions).match(/<path /g) || []).length).to.equal(2);
    expect((generateDisputedSystemFillPattern('D-LC-DC-CC', factions).match(/<path /g) || []).length).to.equal(3);
    expect((generateDisputedSystemFillPattern('D-LC-DC-CC-FS', factions).match(/<path /g) || []).length).to.equal(4);
  });

  it('spans exactly 360/N degrees per wedge and sums to a full circle', () => {
    const cases: Array<[string, number]> = [
      ['D-LC-DC', 2],
      ['D-LC-DC-CC', 3],
      ['D-LC-DC-CC-FS', 4],
      ['D-LC-DC-CC-FS-CC', 5],
      ['D-LC-DC-CC-FS-CC-CC', 6],
      ['D-LC-DC-CC-FS-CC-CC-CC', 7],
    ];

    for (const [key, N] of cases) {
      const markup = generateDisputedSystemFillPattern(key, factions);
      const dAttrs = markup.match(/ d="([^"]+)"/g) || [];
      expect(dAttrs.length, `${key} wedge count`).to.equal(N);

      let total = 0;
      for (const attr of dAttrs) {
        const m = attr.match(
          /^ d="M([-\d.]+),([-\d.]+) L([-\d.]+),([-\d.]+) A[-\d.]+,([-\d.]+),0,0,1,([-\d.]+),([-\d.]+) L/
        );
        expect(m, `${key}: ${attr}`).not.to.equal(null);
        const [, cx, cy, x1, y1, , x2, y2] = m!.map(Number);
        const a1 = Math.atan2(y1 - cy, x1 - cx);
        const a2 = Math.atan2(y2 - cy, x2 - cx);
        const span = sweptSpan(a1, a2, 1);
        expect(span, `${key} wedge span`).toBeCloseTo((2 * Math.PI) / N, 8);
        total += span;
      }
      expect(total, `${key} total`).toBeCloseTo(2 * Math.PI, 8);
    }
  });

  it('falls back to grey for an unknown faction rather than dropping the slice', () => {
    const markup = generateDisputedSystemFillPattern('D-LC-ZZZ', factions);

    expect((markup.match(/<path /g) || []).length).to.equal(2);
    expect(markup).to.contain('#999999');
  });

  it('returns nothing for a key naming fewer than two factions', () => {
    expect(generateDisputedSystemFillPattern('D-LC', factions)).to.equal('');
  });
});
