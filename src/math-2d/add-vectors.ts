import Vector2d from './types/vector-2d';

/**
 * Adds two vectors together. The first vector will be modified.
 *
 * @param vector The vector to add to (will be modified)
 * @param vectorToAdd The vector that will be added to v
 */
export default function addVectors(vector: Vector2d, vectorToAdd: Vector2d): void {
  // eslint-disable-next-line no-param-reassign
  vector.a += vectorToAdd.a;
  // eslint-disable-next-line no-param-reassign
  vector.b += vectorToAdd.b;
}
