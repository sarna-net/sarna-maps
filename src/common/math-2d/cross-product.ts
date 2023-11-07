import { Vector2d } from './types';

/**
 * Cross product between two 2D vectors.
 *
 * @param v1 The first vector
 * @param v2 The second vector
 * @returns Cross product of v1 and v2
 */
export function crossProduct(v1: Vector2d, v2: Vector2d): number {
  return v1.a * v2.b - v1.b * v2.a;
}
