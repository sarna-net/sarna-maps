import { Point2d } from '../math-2d';
import { BorderLabelVariant } from './border-label-variant';

/**
 * A manual configuration for a single faction's border label. This configuration is used if, after placing
 * all the regular single- and multiline labels for a given faction border loop, no good candidate has been
 * identified.
 * The algorithm then checks if there are any manual configs that can be used instead. If not, a candidate
 * is chosen from the abbreviated faction name labels (i.e. "DC" for "Draconis Combine")
 */
export interface BorderLabelManualConfig {
  /**
   * The mid point of the manually placed label's baseline
   */
  anchor: Point2d;
  /**
   * The label's angle in degrees. Default is 0.
   */
  angle?: number;
  /**
   * The indices of the eras in which to apply the manual configuration.
   * Leave empty to apply the manual config in all eras.
   */
  eras?: Array<number>;
  /**
   * The label variant to use. Default is SingleLine.
   */
  labelVariant?: BorderLabelVariant;
}

/**
 * The configuration object for border labels
 */
export interface BorderLabelConfig {
  /**
   * The different parameters used by the border label algorithm
   */
  rules: {
    /**
     * Candidates will be generated along the entire border, in this interval (in map units).
     * A lower number here means slower calculation, but possibly higher quality / better label placement.
     */
    distanceBetweenCandidates: number;
    /**
     * The border labels' anchor point is placed at this distance to the border (in map units)
     */
    labelDistanceToBorder: number;
    /**
     * The maximum size of the area (in square map units) that a label candidate can overlap
     * existing (system) labels before it gets disqualified immediately.
     */
    maxLabelOverlapArea: number;
    /**
     * The number of map units that a label may cross beyond the border without score penalty
     */
    borderIntersectionTolerance: number;
    /**
     * The maximum length (in map units) that a border label candidate can cross and go beyond the
     * border before it gets disqualified immediately.
     */
    maxBorderIntersectionDistance: number;
    /**
     * The minimum distance (in map units) between two neighboring labels within the same faction
     * border loop.
     */
    minDistanceBetweenLabels: number;
    /**
     * The minimum distance along a border loop between two neighboring labels within the same
     * faction border loop.
     */
    minLoopDistanceBetweenLabels: number;
    /**
     * The minimum score that a label candidate can have and still be considered for placement.
     * Note that labels will be sorted by score in descending order and placed as long as a) there
     * is enough space and b) their scores are above or equal to this value.
     * Candidate score is a value between 0 and 1.
     */
    minViableScore: number;
  };
  /**
   * The numeric weights that determine how important each quality parameter of a label candidate is.
   * These can be any positive real numbers, a parameter with a large number is more important than
   * a parameter with a smaller number.
   */
  scoreWeights: {
    /**
     * How important is overlapping existing (system) labels as little as possible?
     */
    labelOverlap: number;
    /**
     * How important is the angle of the label? Horizontal angles will be rated the best,
     * vertical angles will be rated slightly lower, and angles in between will be rated lower.
     */
    angle: number;
    /**
     * How important is overlapping borders as little as possible?
     */
    borderIntersection: number;
    /**
     * How important is it for the label to be in the center of the stretch of border?
     * (only applies if the border loop is not in the viewport entirely)
     */
    centeredness: number;
    /**
     * How important is it for the label to be separated into two lines vs. in a single line?
     * Multi line labels will be preferred over single line labels.
     */
    multiline: number;
    /**
     * How important is it for the label to lie above a relatively straight section of the border?
     */
    straightness: number;
  };
  /**
   * A map where the key is the faction id, and the value is a list of
   * manual border label configs for this faction's borders
   */
  manualConfigs: Record<string, Array<BorderLabelManualConfig>>;
}
