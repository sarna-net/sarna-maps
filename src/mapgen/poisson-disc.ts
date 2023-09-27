/* eslint-disable no-tabs */
import seedrandom from 'seedrandom';
import { Logger } from '../utils';
import { EMPTY_FACTION } from './constants';
import { PoissonPoint } from './types';

/**
 * An instance of this class generates blue noise using Bridson's Poisson Disc algorithm.
 */
export class PoissonDisc {
  private x: number;
  private y: number;
  private w: number;
  private h: number;
  private maxSamples: number;
  public radius: number;
  private radiusSquared: number;
  private radiusSquaredx3: number;
  private cellSize: number;
  private gridWidth: number;
  private gridHeight: number;
  private queueSize: number;
  private sampleSize: number;
  private grid: PoissonPoint[];
  private queue: PoissonPoint[];
  private rng: seedrandom.PRNG;

  private reservedPoints: PoissonPoint[];
  public generatedPoints: PoissonPoint[];
  public aggregatedPoints: PoissonPoint[];

  /**
   * @param x Algorithm area left limit
   * @param y Algorithm area bottom limit
   * @param w Algorithm area width
   * @param h Algorithm area height
   * @param radius "Elbow space" for each point: Generated points are placed at a distance
   *               of r to 2*r from each other
   * @param maxSamples Maximum amount of candidates for an active sample (optional, default is 30)
   * @param seed PRNG seed, default is 'sarna'
   * @param reservedPoints The reserved points array
   */
  constructor(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    maxSamples = 30,
    seed = 'sarna',
    reservedPoints: PoissonPoint[] = [],
  ) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.maxSamples = maxSamples || 30;
    this.radius = radius;
    this.radiusSquared = radius * radius;
    this.radiusSquaredx3 = 3 * this.radiusSquared;
    this.cellSize = radius * Math.SQRT1_2;
    this.gridWidth = Math.ceil(w / this.cellSize);
    this.gridHeight = Math.ceil(h / this.cellSize);
    this.grid = new Array(this.gridWidth * this.gridHeight);
    this.queue = [];
    this.queueSize = 0;
    this.sampleSize = 0;
    this.rng = seedrandom(seed);

    this.generatedPoints = [];
    this.aggregatedPoints = [];
    this.reservedPoints = reservedPoints;
  }

  /**
     * Runs the poisson disc algorithm and populates the generatedPoints property.
     *
     * @returns this object
     */
  public run(): PoissonDisc {
    this.generatedPoints = [];
    // start with a sample at a fixed x,y (origin)
    this.generatedPoints.push(this.placeSample({
      x: this.x,
      y: this.y,
      color: EMPTY_FACTION,
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
    Logger.info(`blue noise generation done, ${this.sampleSize} points generated`);
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
      for (let j = 0; j < this.maxSamples; ++j) {
        const a = 2 * Math.PI * this.rng();
        const r = Math.sqrt(this.rng() * this.radiusSquaredx3 + this.radiusSquared);
        const x = sample.x + r * Math.cos(a);
        const y = sample.y + r * Math.sin(a);

        // Reject candidates that are outside the allowed extent,
        // or closer than 2 * radius to any existing sample.
        if (
          x >= this.x
          && x <= this.x + this.w
          && y >= this.y
          && y <= this.y + this.h
          && this.positionValid(x, y)
        ) {
          return this.placeSample({ x, y, color: EMPTY_FACTION });
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
  private placeSample(sample: PoissonPoint, grid = this.grid, doNotEnqueue = false): PoissonPoint {
    if (!doNotEnqueue) {
      this.queue.push(sample);
      this.queueSize++;
    }
    // eslint-disable-next-line no-param-reassign
    grid[
      this.gridWidth * (
        (sample.y - this.y) / this.cellSize | 0
      ) + (
        (sample.x - this.x) / this.cellSize | 0
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
    i = (x - this.x) / this.cellSize | 0;
    j = (y - this.y) / this.cellSize | 0;
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
  public replaceReservedPoints(reservedPoints: PoissonPoint[]) {
    const aggregatedGrid: PoissonPoint[] = new Array(this.gridWidth * this.gridHeight);
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
