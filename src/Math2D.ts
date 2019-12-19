/**
 * A point in 2D space
 */
export interface Point2D {
    x: number;
    y: number;
}

/**
 * A vector in 2D space
 */
export interface Vector2D {
    a: number,
    b: number
}

/**
 * A line in 2D space, represented as ax + by = c
 */
export interface Line2D {
    a: number;
    b: number;
    c: number;
}

/**
 * Checks for point equality.
 *
 * @param p1 The first point
 * @param p2 The second point
 * @returns true if the points are equal (euclidean distance is 0)
  */
export function pointsAreEqual(p1: Point2D, p2: Point2D): boolean {
    return p1.x === p2.x && p1.y === p2.y;
}

/**
 * Checks if a given point lies to the left of a line.
 *
 * @param p The point to check
 * @param lineStart First point of the line
 * @param lineEnd Second point of the line
 * @returns true if the point lies to the line's left, false if it lies to the right
 * @see http://alienryderflex.com/point_left_of_ray/
 */
export function pointIsLeftOfLine(p: Point2D, lineStart: Point2D, lineEnd: Point2D) {
    return (p.y - lineStart.y) * (lineEnd.x - lineStart.x) > (p.x - lineStart.x) * (lineEnd.y - lineStart.y);
}

/**
 * Modifies the given point by translating it by the given vector.
 *
 * @param p The point
 * @param v The translation vector
 */
export function movePoint(p: Point2D, v: Vector2D) {
    p.x += v.a;
    p.y += v.b;
}

/**
 * Calculates the euclidean distance between to points in 2D space.
 *
 * @param p1 The first point
 * @param p2 The second point
 * @returns The distance
 */
export function distance(p1: Point2D, p2: Point2D): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p2.y, 2));
}

/**
 * Creates a line in 2D space from two points.
 *
 * @param p1 A 2D point
 * @param p2 A 2D point
 * @returns The line, represented as ax + by = c
 */
export function lineFromPoints(p1: Point2D, p2: Point2D): Line2D {
    const line = {
        a: p2.y - p1.y,
        b: p1.x - p2.x,
        c: 0
    };
    line.c = line.a * p1.x + line.b * p1.y;
    return line;
}

/**
 * Calculates the perpendicular bisector of the line between two 2D points.
 *
 * @param p1 The first point
 * @param p2 The second point
 * @returns The perpendicular bisector, a line expressed as ax + by = c
 */
export function perpendicularBisector(p1: Point2D, p2: Point2D): Line2D {
    const line = lineFromPoints(p1, p2);
    const midPoint = { x: (p1.x + p2.x) * .5, y: (p1.y + p2.y) * .5 };

    // -bx + ay = c is perpendicular to ax + by = c
    return {
        a: -line.b,
        b: line.a,
        c: -line.b * midPoint.x + line.a * midPoint.y
    };
}

/**
 * Calculates the intersection point of two lines in 2D space.
 *
 * @param line1 The first line, expressed as ax + by = c
 * @param line2 The second line, expressed as ax + by = c
 * @returns The intersection point, or null if the lines are parallel
 */
export function lineLineIntersection(line1: Line2D, line2: Line2D): Point2D|null {
    const determinant = line1.a * line2.b - line2.a * line1.b;
    if (determinant == 0) {
        // lines are parallel
        return null;
    }
    return {
        x: (line2.b * line1.c - line1.b * line2.c) / determinant,
        y: (line1.a * line2.c - line2.a * line1.c) / determinant
    }
}

/**
 * Calculates a triangle's circumcenter.
 *
 * @param p1 The triangle's first vertex
 * @param p2 The triangle's second vertex
 * @param p3 The triangle's third vertex
 * @returns The circumcenter point, or null if no circumcenter can be calculated
 */
export function circumcenter(p1: Point2D, p2: Point2D, p3: Point2D): Point2D|null {
    // Convert the two lines to perpendicular bisectors.
    const abc = perpendicularBisector(p1, p2);
    const efg = perpendicularBisector(p2, p3);

    // The point of intersection between the two perpendicular bisectors
    // gives the circumcenter.
    return lineLineIntersection(abc, efg);
}

/**
 * Cross product between two 2D vectors.
 *
 * @param v1 The first vector
 * @param v2 The second vector
 * @returns Cross product of v1 and v2
 */
export function crossProduct2D(v1: Vector2D, v2: Vector2D): number {
    return v1.a * v2.b - v1.b * v2.a;
}
