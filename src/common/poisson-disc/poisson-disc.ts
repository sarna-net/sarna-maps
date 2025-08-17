import seedrandom from 'seedrandom';
import { Point2d } from '../math-2d';
import { PoissonSettings } from './types';

const DEFAULT_POISSON_SETTINGS: PoissonSettings = {
  origin: { x: -50, y: -50 },
  dimensions: { width: 100, height: 100 },
  radius: 10,
  maxSamples: 20,
  seed: 'poisson-disc',
};

/**
 * An instance of this class generates blue noise using Bridson's Poisson Disc algorithm.
 */
export class PoissonDisc<T extends Point2d> {
  settings: PoissonSettings;
  radiusSquared: number;
  radiusSquaredx3: number;
  cellSize: number;
  gridWidth: number;
  gridHeight: number;
  queueSize: number;
  sampleSize: number;
  grid: Array<T>;
  queue: Array<T>;
  rng: seedrandom.PRNG;

  reservedPoints: Array<T>;
  generatedPoints: Array<T>;
  aggregatedPoints: Array<T>;

  pointTemplate: T;

  /**
   * @param settings Algorithm settings
   * @param pointTemplate The template to be used for new points (x and y coordinates will be replaced for each generated point)
   * @param reservedPoints The reserved points array
   */
  constructor(
    settings: Partial<PoissonSettings>,
    pointTemplate: T,
    reservedPoints: Array<T> = [],
  ) {
    this.settings = {
      ...DEFAULT_POISSON_SETTINGS,
      ...settings,
    };
    this.pointTemplate = pointTemplate;
    this.radiusSquared = this.settings.radius * this.settings.radius;
    this.radiusSquaredx3 = 3 * this.radiusSquared;
    this.cellSize = this.settings.radius * Math.SQRT1_2;
    this.gridWidth = Math.ceil(this.settings.dimensions.width / this.cellSize);
    this.gridHeight = Math.ceil(this.settings.dimensions.height / this.cellSize);
    this.grid = new Array(this.gridWidth * this.gridHeight);
    this.queue = [];
    this.queueSize = 0;
    this.sampleSize = 0;
    this.rng = seedrandom(this.settings.seed);

    this.generatedPoints = [];
    this.aggregatedPoints = [];
    this.reservedPoints = reservedPoints;
  }

  /**
   * Runs the poisson disc algorithm and populates the generatedPoints property.
   *
   * @returns this object
   */
  public run(): PoissonDisc<T> {
    this.generatedPoints = [];
    // start with a sample at a fixed x,y (origin)
    this.generatedPoints.push(this.placeSample({
      ...this.pointTemplate,
      x: this.settings.origin.x,
      y: this.settings.origin.y,
    }));
    // generate samples as long as a free spot can be found
    const limit = 1000000;
    for (let i = 0; i < limit; i++) {
      const sample = this.generateSample();
      if (!sample) {
        // no further samples can be generated
        break;
      }
      this.generatedPoints.push(sample);
    }
    console.info(`blue noise generation done, ${this.sampleSize} points generated`);
    this.replaceReservedPoints(this.reservedPoints);
    return this;
  }

  /**
   * Generates a new sample by looking at a random active sample in the queue and
   * spawning new candidates from that position. If a valid candidate is found, this candidate
   * becomes our new sample. If no valid candidate is found, the active sample is marked
   * inactive (removed from the queue), and the next random active sample is looked at for
   * candidates.
   * If no valid candidate can be found for any of the active samples, the function returns null
   * and the algorithm terminates.
   *
   * @returns The generated sample, or null.
   */
  private generateSample() {
    // Pick a random existing sample and remove it from the queue.
    while (this.queueSize) {
      const queueIndex = this.rng() * this.queueSize | 0;
      const sample = this.queue[queueIndex];

      // Make a new candidate between [radius, 2 * radius] from the existing sample.
      for (let j = 0; j < this.settings.maxSamples; ++j) {
        const a = 2 * Math.PI * this.rng();
        const r = Math.sqrt(this.rng() * this.radiusSquaredx3 + this.radiusSquared);
        const x = sample.x + r * Math.cos(a);
        const y = sample.y + r * Math.sin(a);

        // Reject candidates that are outside the allowed extent,
        // or closer than 2 * radius to any existing sample.
        if (
          x >= this.settings.origin.x
          && x <= this.settings.origin.x + this.settings.dimensions.width
          && y >= this.settings.origin.y
          && y <= this.settings.origin.y + this.settings.dimensions.height
          && this.positionValid(x, y)
        ) {
          return this.placeSample({
            ...this.pointTemplate,
            x,
            y,
          });
        }
      }

      this.queue[queueIndex] = this.queue[--this.queueSize];
      this.queue.length = this.queueSize;
    }
    return null;
  }

  /**
   * Places a sample.
   *
   * @param sample The sample
   * @param grid The used cell occupation grid (optional, default is this.grid)
   * @param doNotEnqueue Set to true to place an inactive sample (optional)
   * @returns The sample
   */
  private placeSample(sample: T, grid = this.grid, doNotEnqueue = false): T {
    if (!doNotEnqueue) {
      this.queue.push(sample);
      this.queueSize++;
    }
    // eslint-disable-next-line no-param-reassign
    grid[
    this.gridWidth * (
      (sample.y - this.settings.origin.y) / this.cellSize | 0
    ) + (
      (sample.x - this.settings.origin.x) / this.cellSize | 0
    )
      ] = sample;
    this.sampleSize++;
    return sample;
  }

  /**
   * Determines whether point (x,y) is a valid position for a new sample.
   *
   * @param x Point's x coordinate
   * @param y Point's y coordinate
   * @param grid The grid to check for cell occupation (default is this.grid)
   * @returns true if (x,y) is a valid / unoccupied position
   */
  private positionValid(x: number, y: number, grid = this.grid): boolean {
    let i;
    let j;
    let s;
    let o;
    let dx;
    let dy;
    i = (x - this.settings.origin.x) / this.cellSize | 0;
    j = (y - this.settings.origin.y) / this.cellSize | 0;
    const i0 = Math.max(i - 2, 0);
    const j0 = Math.max(j - 2, 0);
    const i1 = Math.min(i + 3, this.gridWidth);
    const j1 = Math.min(j + 3, this.gridHeight);

    for (j = j0; j < j1; ++j) {
      o = j * this.gridWidth;
      for (i = i0; i < i1; ++i) {
        s = grid[o + i];
        if (s) {
          dx = s.x - x;
          dy = s.y - y;
          if (dx * dx + dy * dy < this.radiusSquared) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Introduces a new list of reserved points and aggregates them with the list of generated
   * ("blue noise") points. The aggregated points list contains all reserved points, plus generated
   * points in those places where there are no reserved points (according to the normal poisson disc
   * valid location determination).
   * The function's output is saved in this.aggregatedPoints.
   *
   * @param reservedPoints List of existing fixed points
   */
  public replaceReservedPoints(reservedPoints: Array<T>) {
    const aggregatedGrid: Array<T> = new Array<T>(this.gridWidth * this.gridHeight);
    this.reservedPoints = reservedPoints;
    this.aggregatedPoints = [];

    // add reserved points to aggregated grid
    reservedPoints.forEach((rPoint) => {
      this.aggregatedPoints.push(
        this.placeSample(rPoint, aggregatedGrid, true),
      );
    });

    // fill up aggregated grid with generated poisson points
    this.generatedPoints.forEach((pPoint) => {
      if (this.positionValid(pPoint.x, pPoint.y, aggregatedGrid)) {
        this.aggregatedPoints.push(
          this.placeSample(pPoint, aggregatedGrid, true),
        );
      }
    });
  }
}
