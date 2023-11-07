import { Dimensions2d, Point2d } from '../../math-2d';

export interface PoissonSettings {
  /**
   * Algorithm origin
   */
  origin: Point2d;

  /**
   * Area height and width
   */
  dimensions: Dimensions2d;

  /**
   * "Elbow space" for each point: Generated points are placed at a distance
   * of r to 2*r from each other
   */
  radius: number;

  /**
   * Maximum amount of candidates for an active sample
   */
  maxSamples: number;

  /**
   * PRNG seed
   */
  seed: string;
}
