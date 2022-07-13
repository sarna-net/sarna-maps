import Vector2d from './types/vector-2d';

/**
 * Calculates 2D vector length.
 *
 * @param vector The vector
 * @returns The vector's length
 */
export default function vectorLength(vector: Vector2d): number {
  return Math.sqrt(vector.a ** 2 + vector.b ** 2);
}
