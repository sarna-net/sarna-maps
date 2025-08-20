import {
  BorderLabelConfig,
  BorderLabelVariant,
  Faction,
  GlyphConfig, logger, pointIsInRectangle,
  Rectangle2d,
  RectangleGrid,
} from '../../common';
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

/**
 * Places labels along faction borders, using the following algorithm:
 *
 * For each faction border (an array of clockwise edge loops):
 * - Restrict edge loops to only the visible ones and cut away all the non-visible edges. Continue only for those
 *    edge loops that are at all visible in the current view.
 * - Generate candidates along the edge loop by iterating over each edge and finding two points that can fit a label
 * - Rate the generated candidates using a weighted metric, as described below, and pick the candidate with the highest
 *    score, or none if no candidate's score exceeds the quality threshold
 * - Candidate metric conditions:
 *    - minimal overlap with other labels
 *    - horizontal labels preferred over vertical ones
 *    - the distance between the label anchor (point on the border loop) and the label itself should be minimal
 *    - middle of the edge loop is preferred to the ends, in the case that only a part of the loop is visible
 *   --> all of these conditions are weighted, weights sum to 1
 *
 * @param viewBox The visible part of the universe
 * @param eraIndex The index of the era to draw the labels for
 * @param factionMap The key/value map of all factions, with the faction id as key
 * @param borderEdgeLoops The full list of border edge loops
 * @param grid The grid containing the already placed objects and labels (will be modified)
 * @param glyphConfig The font glyph configuration
 * @param borderLabelConfig The border label configuration
 */
export function placeBorderLabels(
  viewBox: Rectangle2d,
  eraIndex: number,
  factionMap: Record<string, Faction>,
  borderEdgeLoops: Record<string, Array<BorderEdgeLoop>>,
  grid: RectangleGrid,
  glyphConfig: GlyphConfig,
  borderLabelConfig: BorderLabelConfig,
): BorderLabelsResult {
  logger.info('Now placing border labels');
  const candidatesByFaction: Record<string, Array<BorderLabelCandidate>> = {};
  let totalNumberOfCandidates = 0;
  let totalNumberOfPlacedLabels = 0;
  let totalNumberOfPlacedManualLabels = 0;

  // local helper function to check if a candidate's position is at all valid
  const candidateIsInViewBox = (candidate: BorderLabelCandidate) => pointIsInRectangle(candidate.rect.bl, viewBox)
      && pointIsInRectangle(candidate.rect.tl, viewBox)
      && pointIsInRectangle(candidate.rect.tr, viewBox)
      && pointIsInRectangle(candidate.rect.br, viewBox);

  // generate each faction's border labels separately
  Object.keys(borderEdgeLoops).forEach((factionKey) => {
    if (
      factionKey === EMPTY_FACTION
      || factionKey === INDEPENDENT
      || factionKey === 'D'
      || factionKey.startsWith('D-')
    ) {
      return;
    }
    let faction = factionMap[factionKey];
    if (!faction) {
      logger.warn(`Cannot generate borders for faction key ${factionKey} - no such faction is defined`);
      logger.debug(`${borderEdgeLoops[factionKey].length} border loops`);
      faction = {
        id: factionKey,
        name: 'Unknown Faction',
        color: '#000',
      };
      // throw new Error(`An error occurred while placing border labels: A faction with the key "${factionKey}" could not be found`);
    }
    const factionLoops = borderEdgeLoops[factionKey];
    candidatesByFaction[factionKey] = [];

    // instantiate a lookup grid for this faction's labels
    const factionLabelGrid = new RectangleGrid({ ...grid.viewRect }, 20);

    const factionNameTokens = determineLabelTokens(
      faction, glyphConfig.borderLabels || glyphConfig.regular
    );
    const manualCandidates = parseManualCandidatesForFaction(
      faction,
      (borderLabelConfig.manualConfigs[faction.id] || []).filter((config) =>
        !config.eras || config.eras.length === 0 || config.eras.includes(eraIndex)),
      factionNameTokens,
    ).filter(candidateIsInViewBox);

    // place manual candidates first
    manualCandidates.forEach((candidate) => factionLabelGrid.placeItem({
      id: candidate.id,
      anchor: { ...candidate.anchorPoint },
      dimensions: { width: 1, height: 1 },
    }));
    totalNumberOfPlacedManualLabels += manualCandidates.length;
    candidatesByFaction[factionKey].push(...manualCandidates);
    totalNumberOfCandidates += manualCandidates.length;

    factionLoops.forEach((loop, loopIndex) => {
      // find and score candidates
      const candidates = generateLabelCandidates(
        faction,
        loop,
        loopIndex,
        factionNameTokens,
        borderLabelConfig,
      ).filter(candidateIsInViewBox);
      scoreLabelCandidates(candidates, loop, grid, borderLabelConfig);
      const regularCandidates = candidates.filter(
        (candidate) => candidate.labelVariant !== BorderLabelVariant.Abbreviation
      );
      const abbreviatedCandidates = candidates.filter(
        (candidate) => candidate.labelVariant === BorderLabelVariant.Abbreviation
      );
      let selectedCandidates = selectBestCandidates(
        regularCandidates, borderLabelConfig, factionLabelGrid
      );
      if (selectedCandidates.length === 0) {
        // if there are still no valid candidates, pick the best ones among the abbreviated versions
        selectedCandidates = selectBestCandidates(
          abbreviatedCandidates, borderLabelConfig, factionLabelGrid
        );
      }
      // As a final step, compare the loop length and the number of placed candidates. If there are more than enough
      // candidates, we can remove the lowest-rated ones
      selectedCandidates.sort((a, b) => b.score - a.score);
      while (
        selectedCandidates.length > 1
        && (((loop as any).length || 0) / selectedCandidates.length) < 2 * borderLabelConfig.rules.minLoopDistanceBetweenLabels
        && selectedCandidates[selectedCandidates.length - 1].score < borderLabelConfig.rules.minGoodScore
      ) {
        selectedCandidates.pop();
      }
      candidatesByFaction[factionKey].push(...selectedCandidates);
      totalNumberOfCandidates += candidates.length;
      totalNumberOfPlacedLabels += selectedCandidates.length;
    });
  });
  logger.info(
    `Border label algorithm selected ${totalNumberOfPlacedLabels} ` +
    `out of ${totalNumberOfCandidates} candidates, ` +
    `${totalNumberOfPlacedManualLabels} of which ` +
    `${totalNumberOfPlacedManualLabels === 1 ? 'was' : 'were'} configured manually`
  );
  return {
    candidatesByFaction,
  };
}
