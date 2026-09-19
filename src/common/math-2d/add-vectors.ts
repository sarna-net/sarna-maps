import { Vector2d } from './types';

/**
 * Adds two vectors together. The first vector will be modified.
 *
 * @param vector The vector to add to (will be modified)
 * @param vectorToAdd The vector that will be added to v
 */
export function addVectors(vector: Vector2d, vectorToAdd: Vector2d): void {
  vector.a += vectorToAdd.a;
  vector.b += vectorToAdd.b;
}
