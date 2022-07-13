import Vector2d from './types/vector-2d';
import vectorLength from './vector-length';

/**
 * Scales 2D vector to desired length, in-place (vector will be modified).
 *
 * @param vector The vector to scale
 * @param size The size to scale to
 */
export default function scaleVector(vector: Vector2d, size: number): void {
  const magnitude = vectorLength(vector);
  if (magnitude === 0) {
    return;
  }
  // eslint-disable-next-line no-param-reassign
  vector.a = (vector.a * size) / magnitude;
  // eslint-disable-next-line no-param-reassign
  vector.b = (vector.b * size) / magnitude;
}
