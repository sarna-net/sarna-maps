import { Vector2d } from './types';

/**
 * Modifies the second vector by setting it to the first vector's coordinates.
 *
 * @param vector1 The first vector (copy source)
 * @param vector2 The second vector (copy target)
 */
export function copyVector(vector1: Vector2d, vector2: Vector2d) {
  vector2.a = vector1.a;
  vector2.b = vector1.b;
}
