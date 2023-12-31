import { Vector2d } from './types';

/**
 * Calculates 2D vector length.
 *
 * @param vector The vector
 * @returns The vector's length
 */
export function vectorLength(vector: Vector2d): number {
  return Math.sqrt(vector.a ** 2 + vector.b ** 2);
}
