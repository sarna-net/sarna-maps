import {
  BorderLabelConfig,
  BorderLabelVariant,
  Faction,
  GlyphConfig,
  logger,
  pointIsInRectangle,
  Rectangle2d,
  RectangleGrid,
} from '../../common';
import { FactionAffiliationPair } from '../../read/common/retain-faction-affiliation-pairing';

import { traceFaction } from '../../common/utils/faction-traversal-logger';

import { BorderEdgeLoop } from '../voronoi-border';
import {
  determineLabelTokens,
  generateLabelCandidates,
  parseManualCandidatesForFaction,
  scoreLabelCandidates,
  selectBestCandidates
} from './functions';

import { EMPTY_FACTION, INDEPENDENT } from '../constants';
import { BorderLabelCandidate, BorderLabelsResult } from './types';
import { resolveFactionRenderStyle } from '../../render/svg/types/faction-render-style';

const FILE_NAME = 'place-border-labels.ts';

/**
 * Compute the axis-aligned bounding rectangle of a border label candidate's
 * (possibly rotated) label rectangle.
 */
function candidateBoundingRect(candidate: BorderLabelCandidate): {
  anchor: { x: number; y: number };
  dimensions: { width: number; height: number };
} {
  const corners = [candidate.rect.bl, candidate.rect.br, candidate.rect.tl, candidate.rect.tr];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const corner of corners) {
    if (corner.x < minX) minX = corner.x;
    if (corner.x > maxX) maxX = corner.x;
    if (corner.y < minY) minY = corner.y;
    if (corner.y > maxY) maxY = corner.y;
  }
  return {
    anchor: { x: minX, y: minY },
    dimensions: {
      width: Math.max(maxX - minX, 0.01),
      height: Math.max(maxY - minY, 0.01),
    },
  };
}

export function placeBorderLabels(
  viewBox: Rectangle2d,
  eraIndex: number,
  factionMap: Record<string, Faction>,
  pairs: Map<string, FactionAffiliationPair>,
  borderEdgeLoops: Record<string, Array<BorderEdgeLoop>>,
  grid: RectangleGrid,
  glyphConfig: GlyphConfig,
  borderLabelConfig: BorderLabelConfig,
): BorderLabelsResult {

  logger.info('Now placing border labels ...');
  traceFaction(FILE_NAME, 'START', `eraIndex=${eraIndex}`);

  const candidatesByFaction: Record<string, Array<BorderLabelCandidate>> = {};
  let totalNumberOfCandidates = 0;
  let totalNumberOfPlacedLabels = 0;
  let totalNumberOfPlacedManualLabels = 0;

  const candidateIsInViewBox = (candidate: BorderLabelCandidate) =>
    pointIsInRectangle(candidate.rect.bl, viewBox)
    && pointIsInRectangle(candidate.rect.tl, viewBox)
    && pointIsInRectangle(candidate.rect.tr, viewBox)
    && pointIsInRectangle(candidate.rect.br, viewBox);

  Object.keys(borderEdgeLoops).forEach((factionKey) => {

    traceFaction(FILE_NAME, 'PROCESS factionKey', factionKey);

    // --- Skip invalid / special / unassigned factions ---
    if (
      factionKey === EMPTY_FACTION ||
      factionKey === INDEPENDENT ||
      factionKey === 'D' ||
      factionKey.startsWith('D-') ||
      /,Unassigned$/.test(factionKey) ||
      factionKey === 'Unassigned'
    ) {
      traceFaction(FILE_NAME, 'SKIPPED factionKey', factionKey);
      return;
    }

    // --- Resolve faction using pairing data (preferred) with factionMap fallback ---
    const style = resolveFactionRenderStyle({
      factionKey,
      factionMap,
      pairs,
    });

    let faction = style.faction;
    let regionName: string | null = null;

    // --- Handle hierarchical faction keys (e.g. "FWL,Duchy of Andurien") ---
    if (!faction && factionKey.includes(',')) {
      const [factionId, ...regionParts] = factionKey.split(',');
      const topFaction = factionMap[factionId] || factionMap[factionId.toUpperCase()];
      if (topFaction) {
        faction = { ...topFaction };
        regionName = regionParts.join(',').trim();
        faction = {
          ...topFaction,
          name: regionName,
          id: factionKey,
        };
      }
    }

    // --- Missing faction handling ---
    if (!faction) {
      logger.warn('place-border-labels.ts', `Cannot generate borders for faction key ${factionKey} - no such faction is defined`);
      logger.debug(`${borderEdgeLoops[factionKey].length} border loops`);

      traceFaction(FILE_NAME, 'MISSING FACTION', `Cannot generate borders for faction key ${factionKey} - no such faction is defined`);

      faction = {
        id: factionKey,
        name: factionKey,
        color: style.color || '#999999',
      };

      traceFaction(
        FILE_NAME,
        'FALLBACK FACTION CREATED',
        `id="${faction.id}" color="${faction.color}"`
      );
    } else {
      traceFaction(
        FILE_NAME,
        'FACTION RESOLVED',
        `id="${faction.id}" name="${faction.name}"`
      );
    }

    const factionLoops = borderEdgeLoops[factionKey];
    candidatesByFaction[factionKey] = [];

    const factionLabelGrid = new RectangleGrid({ ...grid.viewRect }, 20);

    // --- Token generation ---
    const factionNameTokens = determineLabelTokens(
      faction,
      glyphConfig.borderLabels || glyphConfig.regular
    );

    traceFaction(
      FILE_NAME,
      'TOKENS GENERATED',
      JSON.stringify(factionNameTokens)
    );

    // --- Manual candidates ---
    const manualConfigs = (borderLabelConfig.manualConfigs[faction.id] || [])
      .filter((config) =>
        !config.eras || config.eras.length === 0 || config.eras.includes(eraIndex)
      );

    traceFaction(
      FILE_NAME,
      'MANUAL CONFIG COUNT',
      `count=${manualConfigs.length}`
    );

    const manualCandidates = parseManualCandidatesForFaction(
      faction,
      manualConfigs,
      factionNameTokens,
    ).filter(candidateIsInViewBox);

    traceFaction(
      FILE_NAME,
      'MANUAL CANDIDATES',
      `count=${manualCandidates.length}`
    );

    manualCandidates.forEach((candidate) => {
      factionLabelGrid.placeItem({
        id: candidate.id,
        anchor: { ...candidate.anchorPoint },
        dimensions: { width: 1, height: 1 },
      });

      // also register the candidate's actual rectangle in the main label grid, so that
      // region labels and other labels can reliably avoid overlapping it
      const bbox = candidateBoundingRect(candidate);
      grid.placeItem({
        id: candidate.id,
        anchor: bbox.anchor,
        dimensions: bbox.dimensions,
      });

      traceFaction(
        FILE_NAME,
        'MANUAL CANDIDATE PLACED',
        candidate.id
      );
    });

    totalNumberOfPlacedManualLabels += manualCandidates.length;
    candidatesByFaction[factionKey].push(...manualCandidates);
    totalNumberOfCandidates += manualCandidates.length;

    // --- Loop processing ---
    factionLoops.forEach((loop, loopIndex) => {

      traceFaction(
        FILE_NAME,
        'PROCESS LOOP',
        `factionKey="${factionKey}" loopIndex=${loopIndex}`
      );

      const candidates = generateLabelCandidates(
        faction,
        loop,
        loopIndex,
        factionNameTokens,
        borderLabelConfig,
      ).filter(candidateIsInViewBox);

      traceFaction(
        FILE_NAME,
        'GENERATED CANDIDATES',
        `count=${candidates.length}`
      );

      scoreLabelCandidates(candidates, loop, grid, borderLabelConfig);

      const regularCandidates = candidates.filter(
        (candidate) => candidate.labelVariant !== BorderLabelVariant.Abbreviation
      );

      const abbreviatedCandidates = candidates.filter(
        (candidate) => candidate.labelVariant === BorderLabelVariant.Abbreviation
      );

      traceFaction(
        FILE_NAME,
        'CANDIDATE SPLIT',
        `regular=${regularCandidates.length} abbreviated=${abbreviatedCandidates.length}`
      );

      let selectedCandidates = selectBestCandidates(
        regularCandidates,
        borderLabelConfig,
        factionLabelGrid
      );

      if (selectedCandidates.length === 0) {
        traceFaction(FILE_NAME, 'FALLBACK TO ABBREVIATED', factionKey);

        selectedCandidates = selectBestCandidates(
          abbreviatedCandidates,
          borderLabelConfig,
          factionLabelGrid
        );
      }

      selectedCandidates.forEach((candidate) => {
        const bbox = candidateBoundingRect(candidate);
        grid.placeItem({
          id: candidate.id,
          anchor: bbox.anchor,
          dimensions: bbox.dimensions,
        });
      });

      selectedCandidates.sort((a, b) => b.score - a.score);

      while (
        selectedCandidates.length > 1 &&
        (((loop as any).length || 0) / selectedCandidates.length) <
          2 * borderLabelConfig.rules.minLoopDistanceBetweenLabels &&
        selectedCandidates[selectedCandidates.length - 1].score <
          borderLabelConfig.rules.minGoodScore
      ) {
        const removed = selectedCandidates.pop();
        traceFaction(
          FILE_NAME,
          'REMOVED LOW SCORE CANDIDATE',
          removed ? removed.id : 'undefined'
        );
      }

      traceFaction(
        FILE_NAME,
        'SELECTED CANDIDATES',
        `count=${selectedCandidates.length}`
      );

      candidatesByFaction[factionKey].push(...selectedCandidates);
      totalNumberOfCandidates += candidates.length;
      totalNumberOfPlacedLabels += selectedCandidates.length;
    });
  });

  traceFaction(
    FILE_NAME,
    'FINAL COUNTS',
    `placed=${totalNumberOfPlacedLabels} total=${totalNumberOfCandidates} manual=${totalNumberOfPlacedManualLabels}`
  );

  logger.debug(
    `Border label algorithm selected ${totalNumberOfPlacedLabels} ` +
    `out of ${totalNumberOfCandidates} candidates, ` +
    `${totalNumberOfPlacedManualLabels} of which ` +
    `${totalNumberOfPlacedManualLabels === 1 ? 'was' : 'were'} configured manually`
  );

  return {
    candidatesByFaction,
  };
}