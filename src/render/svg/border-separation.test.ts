import { describe, it, expect } from 'vitest';
import { getPrimaryLayerZoom } from './write-svg-maps';
import { BORDER_STROKE_WIDTH_PX } from '../../compute/constants';
import { GeneratorConfig } from '../../common';

/**
 * Mirrors the conversion in `calculateVoronoiBorders`: the per-side offset, in
 * map units, that yields the requested visible gap at a given zoom.
 */
function separationMapUnits(borderSeparation: number, strokeWidthPx: number, zoom: number): number {
  return (borderSeparation + strokeWidthPx) / (2 * zoom);
}

/** The clear gap actually visible on screen, in render pixels. */
function visibleGapPx(separation: number, strokeWidthPx: number, zoom: number): number {
  return 2 * separation * zoom - strokeWidthPx;
}

function config(layers: Array<Record<string, unknown>>, width = 1000, height = 1143) {
  return {
    dimensions: { width, height },
    mapLayers: layers,
  } as unknown as GeneratorConfig;
}

describe('border separation scaling', () => {
  it('produces the configured visible gap at any zoom', () => {
    const borderSeparation = 0.5;
    // neighborhood-sol-3145 (1000px / 140 map units) is ~7.14; universe maps ~1.
    for (const zoom of [0.5, 1, 2, 7.142857, 12.5]) {
      const separation = separationMapUnits(borderSeparation, BORDER_STROKE_WIDTH_PX, zoom);
      const gap = visibleGapPx(separation, BORDER_STROKE_WIDTH_PX, zoom);
      expect(gap).to.be.closeTo(borderSeparation, 1e-9);
    }
  });

  it('regression: assuming zoom=1 inflates the gap in proportion to the real zoom', () => {
    const borderSeparation = 0.5;
    const realZoom = 1000 / 140; // neighborhood-sol-3145 main layer

    const buggy = separationMapUnits(borderSeparation, BORDER_STROKE_WIDTH_PX, 1);
    const buggyGap = visibleGapPx(buggy, BORDER_STROKE_WIDTH_PX, realZoom);
    const fixedGap = visibleGapPx(
      separationMapUnits(borderSeparation, BORDER_STROKE_WIDTH_PX, realZoom),
      BORDER_STROKE_WIDTH_PX,
      realZoom,
    );

    expect(buggyGap).to.be.greaterThan(9); // ~9.7px of white space
    expect(fixedGap).to.be.closeTo(borderSeparation, 1e-9);
  });

  it('derives zoom from the first layer that draws borders', () => {
    const zoom = getPrimaryLayerZoom(
      config([
        {
          name: 'main',
          dimensions: { width: 1000, height: 1143 },
          mapUnitDimensions: { width: 140, height: 160 },
          elements: { borders: [{ display: 'factions' }] },
        },
        {
          name: 'minimap',
          dimensions: { width: 400, height: 200 },
          mapUnitDimensions: { width: 1200, height: 600 },
          elements: { borders: [{ display: 'factions' }] },
        },
      ]),
    );

    expect(zoom).to.be.closeTo(1000 / 140, 1e-9);
  });

  it('falls back to the top-level image dimensions when a layer omits its own', () => {
    const zoom = getPrimaryLayerZoom(
      config(
        [
          {
            name: 'main',
            mapUnitDimensions: { width: 1450, height: 1200 },
            elements: { borders: [{ display: 'factions' }] },
          },
        ],
        1450,
        1200,
      ),
    );

    expect(zoom).to.equal(1);
  });

  it('skips layers that draw no borders', () => {
    const zoom = getPrimaryLayerZoom(
      config([
        {
          name: 'backdrop',
          dimensions: { width: 800, height: 800 },
          mapUnitDimensions: { width: 100, height: 100 },
          elements: {},
        },
        {
          name: 'main',
          dimensions: { width: 500, height: 500 },
          mapUnitDimensions: { width: 250, height: 250 },
          elements: { borders: [{ display: 'factions' }] },
        },
      ]),
    );

    expect(zoom).to.equal(2);
  });

  it('never returns a non-positive or non-finite zoom', () => {
    expect(getPrimaryLayerZoom(config([]))).to.equal(1);
    expect(
      getPrimaryLayerZoom(
        config([{ name: 'broken', mapUnitDimensions: { width: 0, height: 0 }, elements: {} }]),
      ),
    ).to.equal(1);
  });
});
