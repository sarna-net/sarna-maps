import seedrandom from 'seedrandom';
import {Point2D} from './Utils';
import {Logger} from './Logger';

/**
 * An instance of this class generates blue noise using Bridson's Poisson Disc algorithm.
 */
export class PoissonDisc {

    private x: number;
    private y: number;
    private w: number;
    private h: number;
    private maxSamples: number;
    private radiusSquared: number;
    private radiusSquaredx3: number;
    private cellSize: number;
    private gridWidth: number;
    private gridHeight: number;
    private queueSize: number;
    private sampleSize: number;
    private grid: Point2D[];
    private queue: Point2D[];
    private rng: seedrandom.prng;

    private reservedPoints: Point2D[];
    private generatedPoints: Point2D[];
    public aggregatedPoints: Point2D[];

    /**
     * @param x Algorithm area left limit
	 * @param y Algorithm area bottom limit
	 * @param w Algorithm area width
	 * @param h Algorithm area height
	 * @param radius "Elbow space" for each point: Generated points are placed at a distance of r to 2*r from each other
	 * @param maxSamples Maximum amount of candidates for an active sample (optional, default is 30)
     * @param seed PRNG seed, default is 'sarna'
     * @param reservedPoints The reserved points array
     */
    constructor(x: number, y: number, w: number, h: number, radius: number,
                maxSamples: number = 30, seed: string = 'sarna',
                reservedPoints: Point2D[] = []) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.maxSamples = maxSamples || 30;
        this.radiusSquared = radius * radius;
        this.radiusSquaredx3 = 3 * this.radiusSquared;
        this.cellSize = radius * Math.SQRT1_2,
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
        let sample;
        this.generatedPoints = [];
        // start with a sample at a fixed x,y (origin)
        this.generatedPoints.push(this.placeSample({x: this.x, y: this.y}));
		// generate samples as long as a free spot can be found
        while(sample = this.generateSample()) {
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
          let i = this.rng() * this.queueSize | 0,
              sample = this.queue[i];

          // Make a new candidate between [radius, 2 * radius] from the existing sample.
          for (let j = 0; j < this.maxSamples; ++j) {
            let a = 2 * Math.PI * this.rng(),
                r = Math.sqrt(this.rng() * this.radiusSquaredx3 + this.radiusSquared),
                x = sample.x + r * Math.cos(a),
                y = sample.y + r * Math.sin(a);

            // Reject candidates that are outside the allowed extent,
            // or closer than 2 * radius to any existing sample.
            if(x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h && this.positionValid(x,y)) {
                return this.placeSample({x:x, y:y});
            }
          }

          this.queue[i] = this.queue[--this.queueSize];
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
    private placeSample(sample: Point2D, grid = this.grid, doNotEnqueue = false): Point2D {
        if(!doNotEnqueue) {
            this.queue.push(sample);
            this.queueSize++;
        }
        grid[this.gridWidth * ((sample.y - this.y) / this.cellSize | 0) + ((sample.x - this.x) / this.cellSize | 0)] = sample;
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
        let i, j, i0, j0, i1, j1, s, o, dx, dy;
        i = (x - this.x) / this.cellSize | 0,
        j = (y - this.y) / this.cellSize | 0,
        i0 = Math.max(i - 2, 0),
        j0 = Math.max(j - 2, 0),
        i1 = Math.min(i + 3, this.gridWidth),
        j1 = Math.min(j + 3, this.gridHeight);

        for (j = j0; j < j1; ++j) {
            o = j * this.gridWidth;
            for (i = i0; i < i1; ++i) {
                if (s = grid[o + i]) {
                    dx = s.x - x,
                    dy = s.y - y;
                    if (dx * dx + dy * dy < this.radiusSquared) return false;
                }
            }
        }
        return true;
    };

	/**
	 * Introduces a new list of reserved points and aggregates them with the list of generated
	 * ("blue noise") points. The aggregated points list contains all reserved points, plus generated
	 * points in those places where there are no reserved points (according to the normal poisson disc
	 * valid location determination).
	 * The function's output is saved in this.aggregatedPoints.
	 *
	 * @param reservedPoints List of existing fixed points
	 */
    public replaceReservedPoints(reservedPoints: Point2D[]) {
        const aggregatedGrid: Point2D[] = new Array(this.gridWidth * this.gridHeight);
        this.reservedPoints = reservedPoints;
        this.aggregatedPoints = [];

        // add reserved points to aggregated grid
        for(let rPoint of reservedPoints) {
            this.aggregatedPoints.push(
                this.placeSample(rPoint, aggregatedGrid, true)
            );
        }

        // fill up aggregated grid with generated poisson points
        for(let pPoint of this.generatedPoints) {
            if(this.positionValid(pPoint.x, pPoint.y, aggregatedGrid)) {
                this.aggregatedPoints.push(
                    this.placeSample(pPoint, aggregatedGrid, true)
                );
            }
        }
    }
}
