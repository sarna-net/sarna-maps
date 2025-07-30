import {
  angleBetweenPoints,
  BezierEdge2d,
  BorderLabelConfig,
  BorderLabelVariant,
  distancePointToLine,
  Faction,
  lineFromPoints, perpendicularEdge, Point2d,
  pointAlongEdgePath, pointIsLeftOfLine, pointOnQuadraticBezierCurve,
  radToDeg, scaleVector, Vector2d
} from '../../../common';
import { BorderEdgeLoop } from '../../voronoi-border';
import { BorderLabelBaselines, BorderLabelCandidate, BorderLabelDetails } from '../types';
import { EMPTY_FACTION } from '../../constants';

/**
 * Iterate over the given border edge loop and generate border label candidates along the way, in several variants
 * (single line, multiline and abbreviated).
 *.
 * @param faction The faction object
 * @param loop The border edge loop to generate candidates for
 * @param loopIndex The loop's index (within its faction)
 * @param factionNameTokens The different token configurations for the faction name
 * @param borderLabelConfig The border label configuration object
 */
export function generateLabelCandidates(
  faction: Faction,
  loop: BorderEdgeLoop,
  loopIndex: number,
  factionNameTokens: Record<BorderLabelVariant, BorderLabelDetails | undefined>,
  borderLabelConfig: BorderLabelConfig,
) {
  const candidates: Array<BorderLabelCandidate> = [];

  // If this loop is an inner loop (a hole inside a faction area), and the hole contains nothing
  // (no other faction), no borders will be displayed. In that case, we do not need any border
  // labels either.
  if (loop.innerAffiliation === EMPTY_FACTION) {
    return [];
  }

  // calculate label dimensions for the faction name
  const labelWidthFull = factionNameTokens[BorderLabelVariant.SingleLine]?.width || 1;

  const loopLength = loop.edges.reduce((sum, edge) => sum + edge.length, 0);

  // make sure the loop is long enough to fit at least one candidate
  if (loopLength <= (factionNameTokens[BorderLabelVariant.Abbreviation]?.width || Infinity)) {
    return candidates;
  }

  const edgePath: Array<BezierEdge2d> = loop.edges.map((edge) => ({
    p1: edge.node1,
    p2: edge.node2,
    length: edge.length,
    p1c1: edge.n1c1,
    p1c2: edge.n1c2,
    p2c1: edge.n2c1,
    p2c2: edge.n2c2,
  }));

  // iterate over edge loop and create candidates in regular intervals
  for (
    let candidatePosition = 0;
    candidatePosition < loopLength;
    candidatePosition += borderLabelConfig.rules.distanceBetweenCandidates
  ) {
    const controlPointCenter = pointAlongEdgePath(edgePath, candidatePosition % loopLength);
    if (controlPointCenter) {
      // find two more points, one on each side of the candidate center point
      const controlPointLeft = pointAlongEdgePath(edgePath, (candidatePosition - labelWidthFull * 0.5 + loopLength) % loopLength);
      const controlPointRight = pointAlongEdgePath(edgePath, (candidatePosition + labelWidthFull * 0.5) % loopLength);
      if (!controlPointLeft || !controlPointRight) {
        // TODO adjust distance for next candidate (why?)
        continue;
      }

      // for further calculations, create a line going through the left and right control points,
      // we will call it the control line
      const controlLine = lineFromPoints(controlPointLeft, controlPointRight);
      // calculate the distance of the center point to the control line, giving us an idea of how straight
      // this part of the border is
      const centerPointDistance = distancePointToLine(controlPointCenter, controlLine);
      // we can also calculate the label's angle, which is important for scoring the candidate
      const labelAngle = (radToDeg(angleBetweenPoints(controlPointLeft, controlPointRight)) + 360) % 360;
      // determine whether the center point is inside or outside of the control line - inside being further
      // in the edge loop area
      let centerPointIsOutside = pointIsLeftOfLine(controlPointCenter, controlPointLeft, controlPointRight);
      if (loop.isInnerLoop) {
        centerPointIsOutside = !centerPointIsOutside;
      }
      // get an edge perpendicular to the control line, pointing inwards
      const perpEdge = perpendicularEdge(
        { p1: controlPointLeft, p2: controlPointRight },
        borderLabelConfig.rules.labelDistanceToBorder,
        loop.isInnerLoop ? 'left' : 'right',
      );

      // We can now construct the candidate's label rectangle by starting from the center control point
      // and moving in the direction of the perpendicular edge. How far we have to move depends on whether the center
      // point is inside or outside of the control line.
      // First, we need a vector pointing in the right direction, and of the correct length.
      const perpVector: Vector2d = {
        a: perpEdge.p2.x - perpEdge.p1.x,
        b: perpEdge.p2.y - perpEdge.p1.y,
      };
      if (centerPointIsOutside) {
        scaleVector(perpVector, borderLabelConfig.rules.labelDistanceToBorder + centerPointDistance * 0.75);
      }
      // the next step is to create the actual anchor point, which is the point at the center of the label's baseline
      const anchorPoint: Point2d = {
        x: controlPointCenter.x + perpVector.a,
        y: controlPointCenter.y + perpVector.b,
      };
      // next, we will construct a vector parallel to the control line that will help us form our baseline
      const baselineHalfLengthVector: Vector2d = loop.isInnerLoop
        ? {
          a: perpVector.b,
          b: -perpVector.a,
        }
        : {
          a: -perpVector.b,
          b: perpVector.a,
        };
      // we also clone the perpendicular vector to use for our label's height
      const labelHeightVector: Vector2d = {
        a: perpVector.a,
        b: perpVector.b,
      };

      // we will now create two or three different candidates at the same anchor point:
      // - one candidate using the single line version of the faction label
      // - one candidate using the multiline version of the faction label (if one exists)
      // - one candidate using the faction key / abbreviation
      [
        BorderLabelVariant.SingleLine,
        BorderLabelVariant.MultiLine,
        BorderLabelVariant.Abbreviation
      ].forEach((labelVariant) => {
        if (factionNameTokens[labelVariant]) {
          scaleVector(baselineHalfLengthVector, factionNameTokens[labelVariant].width * 0.5);
          scaleVector(labelHeightVector, factionNameTokens[labelVariant].height);

          // generate the candidate's label rectangle, making sure the corner points are in clockwise order
          const rect = {
            bl: { x: anchorPoint.x - baselineHalfLengthVector.a + labelHeightVector.a, y: anchorPoint.y - baselineHalfLengthVector.b + labelHeightVector.b },
            tl: { x: anchorPoint.x - baselineHalfLengthVector.a, y: anchorPoint.y - baselineHalfLengthVector.b },
            tr: { x: anchorPoint.x + baselineHalfLengthVector.a, y: anchorPoint.y + baselineHalfLengthVector.b },
            br: { x: anchorPoint.x + baselineHalfLengthVector.a + labelHeightVector.a, y: anchorPoint.y + baselineHalfLengthVector.b + labelHeightVector.b },
          }
          if (loop.isInnerLoop) {
            let tmp = rect.bl;
            rect.bl = rect.br;
            rect.br = tmp;
            tmp = rect.tl;
            rect.tl = rect.tr;
            rect.tr = tmp;
          }

          // figure out the baseline bounds for up to two tokens (a bottom and possibly a middle baseline as well as a top line)
          const labelBaselines: BorderLabelBaselines = {
            bottom: { p1: rect.bl, p2: rect.br },
            top: { p1: rect.tl, p2: rect.tr },
          };
          if (labelBaselines.bottom.p2.x < labelBaselines.bottom.p1.x) {
            let tmp = labelBaselines.bottom.p1;
            labelBaselines.bottom.p1 = labelBaselines.bottom.p2;
            labelBaselines.bottom.p2 = tmp;
            tmp = labelBaselines.top.p1;
            labelBaselines.top.p1 = labelBaselines.top.p2;
            labelBaselines.top.p2 = tmp;
          }
          if (labelBaselines.top.p1.y < labelBaselines.bottom.p1.y) {
            const tmpEdge = labelBaselines.top;
            labelBaselines.top = labelBaselines.bottom;
            labelBaselines.bottom = tmpEdge;
          }
          if (labelVariant === BorderLabelVariant.MultiLine) {
            labelBaselines.middle = {
              p1: {
                x: 0.5 * (labelBaselines.bottom.p1.x + labelBaselines.top.p1.x),
                y: 0.5 * (labelBaselines.bottom.p1.y + labelBaselines.top.p1.y),
              },
              p2: {
                x: 0.5 * (labelBaselines.bottom.p2.x + labelBaselines.top.p2.x),
                y: 0.5 * (labelBaselines.bottom.p2.y + labelBaselines.top.p2.y),
              },
            };
          }

          candidates.push({
            id: 'candidate-' + faction.id + '-L' + loopIndex + '-' + candidates.length,
            score: 1,
            disqualified: false,
            positionOnEdgeLoop: candidatePosition,
            centeredness: 0.5, // TODO modify when adding truncated loops
            anchorPoint,
            borderSectionStraightness: centerPointDistance,
            labelVariant,
            labelAngle,
            labelArea: (factionNameTokens[labelVariant]?.width || 0) * (factionNameTokens[labelVariant]?.height || 0),
            rect,
            tokens: factionNameTokens[labelVariant]?.tokens || [],
            labelBaselines,
            // debugging properties
            controlPoints: [controlPointLeft, controlPointRight],
            perpEdge: [perpEdge.p1, perpEdge.p2],
            pointIsInside: !centerPointIsOutside,
          });
        }
      });
    } else {
      console.debug(`ignoring undefined candidate anchor point for faction loop ${faction.id} ${loopIndex} at position ${candidatePosition}`);
      console.debug(`(loop length is ${loopLength}`);
    }
  }

  return candidates;
}
