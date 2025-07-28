import { BorderLabelVariant, Point2d } from '../../../common';
import { BorderLabelBaselines } from './border-label-baselines';

export interface BorderLabelCandidate {
  /**
   * The candidate's ID
   */
  id: string;
  /**
   * The candidate's score (a real number between 0 and 1)
   */
  score: number;
  /**
   * True if this candidate has been disqualified from consideration for any reason
   */
  disqualified: boolean;
  /**
   * The center of the candidate's text baseline
   */
  anchorPoint: Point2d;
  /**
   * The candidate's numeric position on the edge loop, i.e. the travelled distance
   * from the start of the loop to the candidate's anchor point.
   * Used to disqualify candidates that are too close to others.
   */
  positionOnEdgeLoop: number;
  /**
   * The candidate's centeredness value - a number between 0 and 1, where 0 means the label
   * is at the very edge of a truncated loop (a sequence of edges that is not a closed loop),
   * and 1 means the label is in the center of the truncated loop.
   */
  centeredness: number;
  /**
   * Measure of how straight a label candidate's section of the border is.
   * 0 is completely straight, larger values are worse.
   */
  borderSectionStraightness: number;
  /**
   * The label variant influences the label's score
   */
  labelVariant: BorderLabelVariant;
  /**
   * The label's angle influences the label's score
   */
  labelAngle: number;
  /**
   * The area taken up by the label (in square units)
   */
  labelArea: number;
  /**
   * The candidate's label rectangle, defined by its four corners ("bl" = "bottom left" etc.).
   */
  rect: {
    bl: Point2d;
    br: Point2d;
    tl: Point2d;
    tr: Point2d;
  };
  /**
   * The candidate's label token parts (= label lines)
   */
  tokens: Array<{ str: string; width: number }>;
  /**
   * All baselines for this label
   */
  labelBaselines: BorderLabelBaselines;
  /**
   * The amount of overlap with other existing objects or labels
   */
  labelOverlapArea?: number;
  /**
   * The approximate amount of overlap between the label and any loop edges
   */
  loopOverlapDistance?: number;
  /**
   * [for visual debugging] The two points delimiting the control line
   */
  controlPoints?: [Point2d, Point2d];
  /**
   * [for visual debugging] The two points delimiting the edge that is perpendicular to the control line
   */
  perpEdge?: [Point2d, Point2d];
  /**
   * [for visual debugging] Is the central control point to the "right" side of the control line? All
   * edges go in clockwise direction, so the "right" side points into the faction area
   */
  pointIsInside?: boolean;
  /**
   * [for visual debugging] The polygonal areas of the label that overlap already existing objects / labels
   */
  overlapPolygons?: Array<Array<Point2d>>;
}
