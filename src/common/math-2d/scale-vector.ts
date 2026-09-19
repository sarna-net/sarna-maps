import { Vector2d } from './types';
import { vectorLength } from './vector-length';

/**
 * Scales 2D vector to desired length, in-place (vector will be modified).
 *
 * @param vector The vector to scale
 * @param size The size to scale to
 */
export function scaleVector(vector: Vector2d, size: number): Vector2d {
  const magnitude = vectorLength(vector);
  if (magnitude === 0) {
    return vector;
  }
  vector.a = (vector.a * size) / magnitude;
  vector.b = (vector.b * size) / magnitude;
  return vector;
}
