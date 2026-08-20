import { expect, describe, it } from 'vitest';
import { initializeLabelItems } from './initialize-label-items';
import { Faction, GlyphConfig, Rectangle2d, RectangleGrid, System, SystemLabelConfig } from '../../../common';

function stubViewRect(): Rectangle2d {
  return {
    anchor: { x: 0, y: 0 },
    dimensions: { width: 1000, height: 1000 },
  };
}

function stubGlyphConfig(): GlyphConfig {
  return {
    regular: { lineHeight: 2.5, widths: { default: 1 } },
    small: { lineHeight: 1.5, widths: { default: 0.8 } },
  };
}

function stubSystemLabelConfig(): SystemLabelConfig {
  return {
    margins: {
      regular: { top: 0, right: 0.3, bottom: 0.75, left: 0.3 },
    },
    padding: { x: 0.25, y: 0.2 },
    overrides: {},
  };
}

function makeSystem(overrides: Partial<System> & { id: string; eraNames: string[] }): System {
  return {
    name: overrides.eraNames[0],
    fullName: overrides.eraNames[0],
    x: 0,
    y: 0,
    radiusX: 1,
    radiusY: 1,
    rotation: 0,
    isCluster: false,
    eraAffiliations: overrides.eraAffiliations ?? [''],
    eraCapitalLevels: overrides.eraCapitalLevels ?? [0],
    ...overrides,
  };
}

describe('initializeLabelItems bracket stripping', () => {
  it('should strip non-faction bracket content from label and add it as alt-name addition', () => {
    const system = makeSystem({
      id: 'sys-1',
      eraNames: ['Adhara [Trip (3040+)]'],
      eraAffiliations: ['MOC'],
    });

    const grid = new RectangleGrid(stubViewRect());
    const factionMap: Record<string, Faction> = {};

    const { labelItems } = initializeLabelItems(
      stubViewRect(),
      0,
      [system],
      grid,
      stubGlyphConfig(),
      stubSystemLabelConfig(),
      factionMap,
    );

    expect(labelItems).toHaveLength(1);
    const label = labelItems[0];

    expect(label.label).toBe('Adhara');
    expect(label.additions).toHaveLength(1);
    expect(label.additions[0]).toEqual({
      text: 'Trip (3040+)',
      class: 'alt-name',
      delta: { x: 0, y: 0 },
    });
  });

  it('should keep faction-id bracket content in label and not add alt-name', () => {
    const system = makeSystem({
      id: 'sys-2',
      eraNames: ['Albion [LC]'],
      eraAffiliations: ['LC'],
    });

    const grid = new RectangleGrid(stubViewRect());
    const factionMap: Record<string, Faction> = {
      LC: { id: 'LC', name: 'Lyran Commonwealth', color: '#3366cc' },
    };

    const { labelItems } = initializeLabelItems(
      stubViewRect(),
      0,
      [system],
      grid,
      stubGlyphConfig(),
      stubSystemLabelConfig(),
      factionMap,
    );

    expect(labelItems).toHaveLength(1);
    const label = labelItems[0];

    expect(label.label).toBe('Albion [LC]');
    expect(label.additions).toHaveLength(0);
  });

  it('should handle system name with no brackets', () => {
    const system = makeSystem({
      id: 'sys-3',
      eraNames: ['Sol'],
      eraAffiliations: ['LC'],
    });

    const grid = new RectangleGrid(stubViewRect());
    const factionMap: Record<string, Faction> = {
      LC: { id: 'LC', name: 'Lyran Commonwealth', color: '#3366cc' },
    };

    const { labelItems } = initializeLabelItems(
      stubViewRect(),
      0,
      [system],
      grid,
      stubGlyphConfig(),
      stubSystemLabelConfig(),
      factionMap,
    );

    expect(labelItems).toHaveLength(1);
    const label = labelItems[0];

    expect(label.label).toBe('Sol');
    expect(label.additions).toHaveLength(0);
  });

  it('should handle system name with bracket containing plain alt name', () => {
    const system = makeSystem({
      id: 'sys-4',
      eraNames: ['Agador [Yance I]'],
      eraAffiliations: ['DC'],
    });

    const grid = new RectangleGrid(stubViewRect());
    const factionMap: Record<string, Faction> = {};

    const { labelItems } = initializeLabelItems(
      stubViewRect(),
      0,
      [system],
      grid,
      stubGlyphConfig(),
      stubSystemLabelConfig(),
      factionMap,
    );

    expect(labelItems).toHaveLength(1);
    const label = labelItems[0];

    expect(label.label).toBe('Agador');
    expect(label.additions).toHaveLength(1);
    expect(label.additions[0]).toEqual({
      text: 'Yance I',
      class: 'alt-name',
      delta: { x: 0, y: 0 },
    });
  });

  it('should handle system name with bracket containing date-suffixed alt name', () => {
    const system = makeSystem({
      id: 'sys-5',
      eraNames: ['Aer [Finnalon (2822+)]'],
      eraAffiliations: ['CC'],
    });

    const grid = new RectangleGrid(stubViewRect());
    const factionMap: Record<string, Faction> = {};

    const { labelItems } = initializeLabelItems(
      stubViewRect(),
      0,
      [system],
      grid,
      stubGlyphConfig(),
      stubSystemLabelConfig(),
      factionMap,
    );

    expect(labelItems).toHaveLength(1);
    const label = labelItems[0];

    expect(label.label).toBe('Aer');
    expect(label.additions).toHaveLength(1);
    expect(label.additions[0]).toEqual({
      text: 'Finnalon (2822+)',
      class: 'alt-name',
      delta: { x: 0, y: 0 },
    });
  });
});
