import { Vector2d } from './types';

/**
 * Calculates the dot product of two vectors.
 *
 * @param v1 The first vector
 * @param v2 The second vector
 * @see https://www.mathsisfun.com/algebra/vectors-dot-product.html
 */
export function dotProduct(v1: Vector2d, v2: Vector2d) {
  return v1.a * v2.a + v1.b * v2.b;
}
