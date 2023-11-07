/**
 * Gets the point on the unit circle (center at 0,0 and radius 1) that corresponds
 * to the percentage value given.
 * @see https://hackernoon.com/a-simple-pie-chart-in-svg-dbdd653b6936
 *
 * @param percentage The percentage value, given as a decimal number between 0 and 1
 */
export function pointOnUnitCircleByPercentValue(percentage: number) {
  return {
    x: Math.cos(2 * Math.PI * percentage),
    y: Math.sin(2 * Math.PI * percentage)
  };
}
