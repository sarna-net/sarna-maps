/**
 * Clamps a number to the provided range.
 *
 * @param num The number
 * @param min The minimum value
 * @param max The maximum value
 */
export function clampNumber(num: number, min = -Infinity, max = Infinity) {
    return Math.max(min, Math.min(max, num));
}
