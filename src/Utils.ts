import {Point2D} from './Entities';

export class Utils {

    public static circumcenter(p1: Point2D, p2: Point2D, p3: Point2D): Point2D|null {
        // Line p1 -> p2 is represented as ax + by = c
        const abc = Utils.lineFromPoints(p1, p2);

        // Line p2 -> p3 is represented as ex + fy = g
        const efg = Utils.lineFromPoints(p2, p3);

        // Convert the two lines to perpendicular bisectors.
        // After this operation,
        const abcPB = Utils.perpendicularBisectorFromLine(p1, p2, abc);
        const efgPB = Utils.perpendicularBisectorFromLine(p2, p3, efg);

        // The point of intersection between the two perpendicular bisectors
        // gives the circumcenter.
        let circumcenter = Utils.lineLineIntersection(abcPB, efgPB);

        if(circumcenter.x === Infinity && circumcenter.y === Infinity) {
            return null;
        }
        return circumcenter;
    }

    /**
     * @param p1 a 2D point
     * @param p2 a 2D point
     * @returns a line, represented as arr[0]x + arr[1]y = arr[2]
     */
    public static lineFromPoints(p1: Point2D, p2: Point2D): number[] {
        const ret: number[] = [];
        ret.push(p2.y - p1.y);
        ret.push(p1.x - p2.x);
        ret.push(ret[0]*p1.x + ret[1]*p1.y);
        return ret;
    }

    public static perpendicularBisector(p1: Point2D, p2: Point2D): number[] {
        const ret: number[] = [];
        const line = Utils.lineFromPoints(p1, p2);
        const midPoint = { x: (p1.x + p2.x) * .5, y: (p1.y + p2.y) * .5 };

        // -bx + ay = c is perpendicular to ax + by = c
        ret[0] = -line[1];
        ret[1] = line[0];
        ret[2] = -line[1] * midPoint.x + line[0] * midPoint.y;
        return ret;
    }

    /**
     * Converts the input line to its perpendicular bisector.
     *
     * @param p1 The first point on the line
     * @param p2 The second point on the line
     * @param line a line, represented as arr[0]x + arr[1]y = arr[2]
     * @returns The resulting perpendicular bisector, in line format (arr[0]x + arr[1]y = arr[2])
     */
    public static perpendicularBisectorFromLine(p1: Point2D, p2: Point2D, line: number[]): number[]  {
        const ret: number[] = [];
        const midPoint = { x: (p1.x + p2.x) * .5, y: (p1.y + p2.y) * .5 };

        // -bx + ay = c is perpendicular to ax + by = c
        ret[0] = -line[1];
        ret[1] = line[0];
        ret[2] = -line[1] * midPoint.x + line[0] * midPoint.y;

        return ret;
    }
}
