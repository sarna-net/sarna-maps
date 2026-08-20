import { expect, describe, it, vi, afterEach } from 'vitest';
import { logger } from '../../../common/utils/logger';
import { assertFillDefsPresent } from './render-map-layer';

describe('assertFillDefsPresent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not flag a present def whose id contains parentheses', () => {
    const defs = '<pattern id="basemap-border-fill-D_28CC_2fFS_29" />';
    const css = 'g.borders .faction-border-D_28CC_2fFS_29 path { fill: url(#basemap-border-fill-D_28CC_2fFS_29) }';

    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    assertFillDefsPresent(defs, css, 'render-map-layer.ts');

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('still flags a genuinely missing def', () => {
    const defs = '<pattern id="basemap-border-fill-D-LC-DC" />';
    const css = 'g.borders .faction-border-D-CC-FF path { fill: url(#basemap-border-fill-D-CC-FF) }';

    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    assertFillDefsPresent(defs, css, 'render-map-layer.ts');

    expect(errorSpy).toHaveBeenCalledOnce();
  });
});
