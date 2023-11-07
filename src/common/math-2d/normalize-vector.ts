import { scaleVector } from './scale-vector';
import { Vector2d } from './types';

/**
 * Scales 2D vector to length 1, in-place (vector will be modified).
 *
 * @param vector The vector to normalize
 */
export function normalizeVector(vector: Vector2d): void {
  scaleVector(vector, 1);
}
