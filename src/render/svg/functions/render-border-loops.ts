import path from 'path';

import { BorderEdgeLoop } from '../../../compute';
import { canonicalAffiliation, Faction, System, TextTemplate } from '../../../common';
import { FactionAffiliationPair } from '../../../read/common/retain-faction-affiliation-pairing';
import { EMPTY_FACTION, INDEPENDENT } from '../../../compute/constants';
import { generateSectionPath } from './generate-section-path';
import { traceFaction } from '../../../common/utils/faction-traversal-logger';
import { resolveFactionRenderStyle, FactionRenderStyle } from '../types/faction-render-style';
import { sanitizeFactionToken } from './sanitize-faction-token';

/**
 * Generates the markup and css to render out borders.
 *
 * Faction color regions use TWO complementary fills:
 *  1) Voronoi territory polygons (loopPaths) filled with faction color @ 0.25
 *     opacity — this is the primary, contiguous faction area the user expects.
 *  2) Radius-bounded disks (one <circle> per system at radiusX/radiusY) —
 *     additive overlay that guarantees even single-system enclaves or clusters
 *     (e.g. Brocchi's Cluster r~7, Hyades r~14) remain visible.
 * Previous code made (2) REPLACE (1) (loopFill='none' when disks existed) and
 * gated markup on loopPaths>0, so most factions appeared empty (only tiny
 * 1-unit disks at 0.25 opacity). Fixed to keep both fills and emit markup
 * for ANY faction present in the era.
 */
export function renderBorderLoops(
  borderLoops: Record<string, Array<BorderEdgeLoop>>,
  factions: Record<string, Faction>,
  pairs: Map<string, FactionAffiliationPair>,
  theme: 'light' | 'dark',
  renderCurves = true,
  prefix = '',
  systems: Array<System> = [],
  eraIndex = 0,
) {
  const templatePath = path.join(__dirname, '../templates/', theme);
  const defTemplate = new TextTemplate('disputed-faction-fill-def.svg.tpl', templatePath);
  const cssTemplate = new TextTemplate('border-faction.css.tpl', templatePath);
  const layerTemplate = new TextTemplate('element-group.svg.tpl', templatePath);
  const edgeTemplate = new TextTemplate('border-path.svg.tpl', templatePath);

  let markup = '';
  let css = '';
  let defs = '';

  const defPrefix = prefix.length ? prefix + '-' : '';
  const cssPrefix = prefix.length ? `.${prefix} ` : '';

  // Map each top-level faction to the systems belonging to it in this era.
  // The faction region of each system is bounded to its configured radius.
  const systemsByFaction: Record<string, Array<System>> = {};
  systems.forEach((system) => {
    const affiliation = canonicalAffiliation(
      system.eraAffiliations[eraIndex] || '',
      {
        levels: 1,
        parseHiddenSystemsAs: 'ignore',
        ignoredAffiliations: ['', 'A', 'U'],
        systemId: system.id,
        eraIndex,
      }
    );
    if (!affiliation || affiliation === EMPTY_FACTION || affiliation === INDEPENDENT) {
      return;
    }
    if (!systemsByFaction[affiliation]) {
      systemsByFaction[affiliation] = [];
    }
    systemsByFaction[affiliation].push(system);
  });

  // A disk at the system's configured radius, in render coordinates (y is
  // flipped). Returns '' when the system has no meaningful radius. Emitted as a
  // native SVG <circle> - the previous 64-vertex polygon approximation
  // serialized ~800 bytes per system (~64 x 13-char segments), so a ~700 KB map
  // ballooned to ~3 MB for ~2,500 radius-bearing systems. Circles are a single
  // primitive (~70 bytes), perfectly round, and avoid the evenodd fill-rule
  // cost of thousands of nested contours in one path.
  function radiusBoundedRegionMarkup(system: System): string {
    const r = Math.max(system.radiusX, system.radiusY);
    if (!r || r <= 0) {
      return '';
    }
    return `<circle cx="${system.x.toFixed(3)}" cy="${(-system.y).toFixed(3)}" r="${r.toFixed(3)}" style="stroke: none" />`;
  }

  // FIX: Iterate over ALL factions with systems, not just those with border loops.
  // Also normalize case (AuC vs AUC) — borderLoops uses raw canonicalAffiliation
  // (preserves AuC case) while systemsByFaction uses pairing-normalized (AUC).
  // Without case folding we would emit duplicate groups (AuC + AUC) and miss
  // matching. We fold to upper-case and aggregate loops/systems per canonical key.
  const normalizedBorderLoops: Record<string, Array<BorderEdgeLoop>> = {};
  Object.entries(borderLoops).forEach(([k, v]) => {
    const uk = k.toUpperCase();
    if (!normalizedBorderLoops[uk]) normalizedBorderLoops[uk] = [];
    normalizedBorderLoops[uk].push(...v);
  });
  const normalizedSystemsByFaction: Record<string, Array<System>> = {};
  Object.entries(systemsByFaction).forEach(([k, v]) => {
    const uk = k.toUpperCase();
    if (!normalizedSystemsByFaction[uk]) normalizedSystemsByFaction[uk] = [];
    normalizedSystemsByFaction[uk].push(...v);
  });
  const allFactionKeys = new Set<string>([
    ...Object.keys(normalizedBorderLoops),
    ...Object.keys(normalizedSystemsByFaction),
  ]);
  allFactionKeys.forEach((factionKey) => {
    if (!factionKey || factionKey === EMPTY_FACTION || factionKey === INDEPENDENT) {
      return;
    }

    // --- RESOLVE FACTION RENDER STYLE ---
    const style = resolveFactionRenderStyle({
      factionKey,
      factionMap: factions,
      pairs,
    });

    if (!style.faction && style.resolutionStatus === 'no-faction-match') {
      traceFaction(
        'src/render/svg/functions/render-border-loops.ts',
        'missing-faction',
        factionKey
      );
    }

    const safeKey = sanitizeFactionToken(factionKey);

    const isDisputed = factionKey === 'D' || /^D[-(]/.test(factionKey);

    if (isDisputed) {
      // Normalize disputed sub-factions from various formats:
      // D-LC-DC, D-LC|DC, D(CC/FS), D-LC/DC all become ['LC','DC'] etc.
      const factionKeys = factionKey
        .replace(/^D[(]([^)]+)[)]$/i, '$1')
        .replace(/^D-/g, '')
        .split(/[-|/]/)
        .filter(Boolean);

      if (factionKeys.length >= 1) {
        // Case-insensitive disputed lookup: factionKeys are upper (AUC) but map may be keyed AuC.
        // Helper ensures AuC/AUC/aUc all resolve. Falls back to style.color for unknown.
        const findFaction = (id: string) => {
          if (!id) return null;
          return factions[id] || factions[id.toUpperCase()] || Object.values(factions).find(f=>f.id.toUpperCase()===id.toUpperCase()) || null;
        };
        const faction1 = findFaction(factionKeys[0]) || (style.disputedFactionIds[0] ? { color: style.color } as any : null);
        const faction2 = findFaction(factionKeys[1]) || faction1 || null;

        defs += defTemplate.replace({
          prefix: defPrefix,
          id: safeKey,
          color1: faction1?.color || (style.disputedFactionIds[0] ? '#999999' : '#c86464'),
          color2: faction2?.color || (style.disputedFactionIds[1] ? '#999999' : '#c86464'),
        });

        if (!faction1) {
          traceFaction(
            'src/render/svg/functions/render-border-loops.ts',
            'missing-disputed-faction',
            factionKeys[0]
          );
        }
        if (factionKeys.length > 1 && !faction2) {
          traceFaction(
            'src/render/svg/functions/render-border-loops.ts',
            'missing-disputed-faction',
            factionKeys[1]
          );
        }

        css += cssTemplate.replace({
          prefix: cssPrefix,
          id: safeKey,
          strokeColor: 'transparent',
          strokeWidth: '0',
          fill: `url(#${defPrefix}border-fill-${safeKey})`,
        });

      } else {
        defs += defTemplate.replace({
          prefix: defPrefix,
          id: 'D',
          color1: '#c86464',
          color2: 'transparent',
        });

        css += cssTemplate.replace({
          prefix: cssPrefix,
          id: safeKey,
          strokeColor: 'transparent',
          strokeWidth: '0',
          fill: `url(#${defPrefix}border-fill-D)`,
        });
      }

    } else {
      css += cssTemplate.replace({
        prefix: cssPrefix,
        id: safeKey,
        strokeColor: style.color || '#000',
        strokeWidth: '1px',
        fill: style.color || '#000',
      });
    }

    let factionMarkup = '';
    const loopPaths: Array<string> = [];

    const loopsForFaction = normalizedBorderLoops[factionKey] || [];
    loopsForFaction.forEach((borderLoop) => {
      if ([undefined, EMPTY_FACTION].includes(borderLoop.innerAffiliation)) {
        return;
      }

      // Shared-boundary dedup: a loop belongs to its inside/inner faction.
      // When the same loop appears under two adjacent faction keys, only the
      // inside faction should render it. Disputed keys use a composite key
      // (e.g. D-LC-DC) so innerAffiliation won't match — skip dedup for them.
      // Use case-insensitive comparison because AuC vs AUC etc. are same faction.
      if (!isDisputed && (borderLoop.innerAffiliation || '').toUpperCase() !== factionKey.toUpperCase()) {
        return;
      }

      traceFaction(
        'src/render/svg/functions/render-border-loops.ts',
        'border-loop',
        factionKey
      );

      loopPaths.push(generateSectionPath(borderLoop, renderCurves));
    });

    // FIX: Radius-bounded disks previously REPLACED territory fills (loopFill='none')
    // and markup was only emitted when loopPaths>0. This made factions with only
    // r=1 disks appear invisible (tiny 1-unit circles at 0.25 opacity) and
    // factions without loops (single-system enclaves) were dropped entirely.
    // Corrected: disks are additive, territory paths remain filled; emit markup
    // if EITHER disks or loops exist so every faction in the era gets a visible area.
    const factionSystems = isDisputed ? [] : (normalizedSystemsByFaction[factionKey] || []);
    const boundedRegionMarkup = factionSystems
      .map((system) => radiusBoundedRegionMarkup(system))
      .filter((markup) => markup.length > 0);

    if (boundedRegionMarkup.length > 0) {
      // Filled disks (stroke suppressed inline so the boundary lines stay clean)
      factionMarkup += boundedRegionMarkup.join('\n');
    }

    if (loopPaths.length > 0) {
      // Territory path stays filled with faction color (CSS fill-opacity 0.25);
      // disks are additive overlays, not replacements. Never suppress fill.
      factionMarkup += edgeTemplate.replace({
        d: loopPaths.join(' '),
        style: '',
      });
    }

    // Emit faction layer if we have any visible geometry (disks OR loops).
    // Safeguard: even unknown factions get a fallback color (#999999 via style)
    // instead of being silently skipped.
    if (factionMarkup.trim()) {
      markup += layerTemplate.replace({
        name: factionKey,
        css_class: 'faction-border-' + safeKey,
        content: factionMarkup,
      });
    }
  });

  if (markup.trim()) {
    return {
      defs,
      css,
      markup: layerTemplate.replace({
        name: 'borders-layer',
        css_class: 'borders',
        content: markup,
      }),
    };
  }

  return {
    defs: '',
    css: '',
    markup: '',
  };
}